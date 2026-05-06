// src/lib/UploadSessionManager.ts
// Singleton that manages large bulk upload sessions with:
//   • DB persistence (survives page refresh / system restart)
//   • IndexedDB for fast local state
//   • File deduplication via SHA-256 hash
//   • Concurrency-controlled uploads (3 at a time)
//   • Resume from interruption
//   • EventEmitter for reactive UI updates

import { supabase } from '@/integrations/supabase/client';
import mammoth from 'mammoth';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UploadFileState {
  id         : string;       // UUID assigned at start
  fileName   : string;
  fileSize   : number;
  status     : 'pending' | 'parsing' | 'uploading' | 'done' | 'failed' | 'skipped' | 'duplicate';
  error?     : string;
  resumePath?: string;
}

export interface UploadSession {
  sessionId       : string;
  organizationId  : string;
  userId          : string;
  totalFiles      : number;
  files           : UploadFileState[];
  status          : 'uploading' | 'submitting' | 'submitted' | 'failed' | 'cancelled';
  startedAt       : string;
}

export type UploadEvent =
  | { type: 'progress'; session: UploadSession }
  | { type: 'file_done'; fileId: string; status: UploadFileState['status'] }
  | { type: 'submitted'; batchJobId: string }
  | { type: 'error'; message: string }
  | { type: 'resumed'; session: UploadSession };

type Listener = (e: UploadEvent) => void;

const BUCKET           = 'talent-pool-resumes';
const CONCURRENCY      = 3;    // parallel file uploads
const IDB_DB_NAME      = 'hrumbles_uploads';
const IDB_STORE        = 'sessions';

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
async function sha256hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Sanitize filename ────────────────────────────────────────────────────────
const sanitize = (n: string) => n.replace(/[\[\]\+\s]+/g, '_');

// ─── base64 → Blob ────────────────────────────────────────────────────────────
function base64ToBlob(b64: string, mime: string): Blob {
  const CHUNK = 8192; const chunks: Uint8Array[] = [];
  const raw = atob(b64);
  for (let i = 0; i < raw.length; i += CHUNK) {
    const s = raw.slice(i, i + CHUNK);
    const b = new Uint8Array(s.length);
    for (let j = 0; j < s.length; j++) b[j] = s.charCodeAt(j);
    chunks.push(b);
  }
  return new Blob(chunks, { type: mime });
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function idbGet(key: string): Promise<any> {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const r  = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}
async function idbSet(key: string, value: any): Promise<void> {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD SESSION MANAGER — singleton
// ════════════════════════════════════════════════════════════════════════════
class UploadSessionManager {
  private session  : UploadSession | null = null;
  private listeners: Listener[]           = [];
  private aborted                         = false;

  // ── Subscribe / unsubscribe ────────────────────────────────────────────────
  on(fn: Listener)  { this.listeners.push(fn); }
  off(fn: Listener) { this.listeners = this.listeners.filter(l => l !== fn); }
  private emit(e: UploadEvent) { this.listeners.forEach(l => { try { l(e); } catch {} }); }

  get currentSession() { return this.session; }
  get isActive()       { return this.session !== null && this.session.status === 'uploading'; }

  // ── On app mount: check for incomplete sessions ────────────────────────────
  async checkForIncompleteSession(userId: string): Promise<UploadSession | null> {
    try {
      const { data } = await supabase
        .from('hr_talent_pool_upload_sessions')
        .select('*')
        .eq('created_by', userId)
        .in('status', ['uploading', 'submitting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      // Try to load file states from IndexedDB (local cache)
      const localState: UploadSession | null = await idbGet(`session_${data.id}`);
      if (localState) {
        this.session = localState;
        this.emit({ type: 'resumed', session: localState });
        return localState;
      }

      // Fallback: reconstruct from DB session files
      const { data: files } = await supabase
        .from('hr_talent_pool_upload_session_files')
        .select('id, file_name, file_size, resume_path, upload_status, error_message')
        .eq('session_id', data.id);

      const fileStates: UploadFileState[] = (files ?? []).map(f => ({
        id        : f.id,
        fileName  : f.file_name,
        fileSize  : f.file_size ?? 0,
        status    : f.upload_status === 'uploaded' ? 'done' :
                    f.upload_status === 'failed'   ? 'failed' :
                    f.upload_status === 'skipped'  ? 'skipped' : 'pending',
        resumePath: f.resume_path,
        error     : f.error_message ?? undefined,
      }));

      const session: UploadSession = {
        sessionId      : data.id,
        organizationId : data.organization_id,
        userId         : data.created_by,
        totalFiles     : data.total_files,
        files          : fileStates,
        status         : data.status,
        startedAt      : data.created_at,
      };

      this.session = session;
      this.emit({ type: 'resumed', session });
      return session;
    } catch {
      return null;
    }
  }

  // ── Start a new upload session ────────────────────────────────────────────
  async startSession(
    files          : File[],
    organizationId : string,
    userId         : string,
  ): Promise<string> {
    this.aborted = false;

    // 1. Create session in DB
    const { data: sessionRow, error } = await supabase
      .from('hr_talent_pool_upload_sessions')
      .insert({ organization_id: organizationId, created_by: userId, total_files: files.length, status: 'uploading' })
      .select('id').single();

    if (error || !sessionRow) throw new Error(`Failed to create session: ${error?.message}`);
    const sessionId = sessionRow.id;

    // 2. Create initial file states
    const fileStates: UploadFileState[] = files.map((f, i) => ({
      id       : `${sessionId}_${i}`,
      fileName : f.name,
      fileSize : f.size,
      status   : 'pending',
    }));

    this.session = { sessionId, organizationId, userId, totalFiles: files.length, files: fileStates, status: 'uploading', startedAt: new Date().toISOString() };

    // 3. Persist to IndexedDB
    await idbSet(`session_${sessionId}`, this.session);
    this.emit({ type: 'progress', session: this.session });

    // 4. Process files with concurrency
    await this.processFiles(files, sessionId, organizationId);

    return sessionId;
  }

  // ── Resume an incomplete session ──────────────────────────────────────────
  async resumeSession(existingSession: UploadSession, newFiles: File[]): Promise<void> {
    this.aborted   = false;
    this.session   = existingSession;

    // Match new File objects to pending session files by name+size
    const pendingStates = existingSession.files.filter(f => f.status === 'pending' || f.status === 'failed');
    const matchedFiles  = pendingStates.flatMap(state => {
      const match = newFiles.find(f => f.name === state.fileName && f.size === state.fileSize);
      return match ? [match] : [];
    });

    if (!matchedFiles.length) {
      // Nothing to match — just re-submit what's already uploaded
      await this.submitSession(existingSession.sessionId);
      return;
    }

    await this.processFiles(matchedFiles, existingSession.sessionId, existingSession.organizationId);
  }

  // ── Cancel active session ──────────────────────────────────────────────────
  async cancelSession(): Promise<void> {
    if (!this.session) return;
    this.aborted = true;
    await supabase.from('hr_talent_pool_upload_sessions')
      .update({ status: 'cancelled' }).eq('id', this.session.sessionId);
    await idbDel(`session_${this.session.sessionId}`);
    this.session = null;
  }

  // ── Core: process files with controlled concurrency ───────────────────────
  private async processFiles(files: File[], sessionId: string, organizationId: string): Promise<void> {
    const queue  = [...files];
    const workers: Promise<void>[] = [];

    const worker = async () => {
      while (queue.length > 0 && !this.aborted) {
        const file = queue.shift();
        if (!file) break;
        await this.processOneFile(file, sessionId, organizationId);
      }
    };

    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    if (this.aborted) return;

    // All files processed — submit to OpenAI batch
    const doneCount = this.session?.files.filter(f => f.status === 'done').length ?? 0;
    if (doneCount === 0) {
      this.emit({ type: 'error', message: 'No files could be parsed or uploaded.' });
      return;
    }

    await this.submitSession(sessionId);
  }

  // ── Process a single file: hash → dedup check → parse → upload → DB insert ─
  private async processOneFile(file: File, sessionId: string, organizationId: string): Promise<void> {
    const fileIdx = this.session!.files.findIndex(f => f.fileName === file.name && f.fileSize === file.size);
    if (fileIdx < 0) return;

    const updateFile = (patch: Partial<UploadFileState>) => {
      if (!this.session) return;
      this.session.files[fileIdx] = { ...this.session.files[fileIdx], ...patch };
      idbSet(`session_${sessionId}`, this.session).catch(() => {});
      this.emit({ type: 'progress', session: this.session });
    };

    updateFile({ status: 'parsing' });

    try {
      // ── Hash the file for dedup ──────────────────────────────────────────
      const rawBuffer = await file.arrayBuffer();
      const fileHash  = await sha256hex(rawBuffer);

      // ── Check dedup against DB ────────────────────────────────────────────
      const { data: existing } = await supabase.rpc('check_file_already_uploaded', {
        p_file_hash       : fileHash,
        p_organization_id : organizationId,
      });

      if (existing?.length > 0) {
        // File already uploaded — reuse existing resume_path and mark as duplicate
        const prev = existing[0];
        updateFile({ status: 'duplicate', resumePath: prev.resume_path, error: `Duplicate of ${prev.file_name}` });
        await supabase.from('hr_talent_pool_upload_session_files').insert({
          session_id      : sessionId,
          organization_id : organizationId,
          file_name       : file.name,
          file_size       : file.size,
          file_hash       : fileHash,
          resume_path     : prev.resume_path,
          resume_text     : null,  // will re-use existing
          upload_status   : 'skipped',
          error_message   : `Duplicate of ${prev.file_name}`,
        });
        await supabase.from('hr_talent_pool_upload_sessions')
          .update({ skipped_count: (this.session?.files.filter(f => f.status === 'duplicate' || f.status === 'skipped').length ?? 0) })
          .eq('id', sessionId);
        return;
      }

      // ── Parse file text + compress ────────────────────────────────────────
      let text = '';
      let compressedBlob: Blob;

      if (file.type === 'application/pdf') {
        const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
        if (error || !data?.text) throw new Error(`Parse error: ${error?.message ?? 'no text'}`);
        text           = data.text;
        compressedBlob = base64ToBlob(data.compressedBase64, 'application/pdf');
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result   = await mammoth.extractRawText({ arrayBuffer: rawBuffer });
        text           = result.value;
        compressedBlob = new Blob([rawBuffer], { type: file.type });
      } else {
        throw new Error('Unsupported file type. Use PDF or DOCX.');
      }

      // ── Upload to storage ─────────────────────────────────────────────────
      updateFile({ status: 'uploading' });
      const storageKey = `${crypto.randomUUID()}-${sanitize(file.name)}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET).upload(storageKey, compressedBlob, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);
      const resumePath = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path).data.publicUrl;

      // ── Insert session file record with resume_text ───────────────────────
      const { data: sfRow } = await supabase
        .from('hr_talent_pool_upload_session_files')
        .insert({
          session_id      : sessionId,
          organization_id : organizationId,
          file_name       : file.name,
          file_size       : file.size,
          file_hash       : fileHash,
          resume_path     : resumePath,
          resume_text     : text,
          upload_status   : 'uploaded',
        })
        .select('id').single();

      // ── Update session counters in DB ─────────────────────────────────────
      const doneNow = (this.session?.files.filter(f => f.status === 'done').length ?? 0) + 1;
      await supabase.from('hr_talent_pool_upload_sessions')
        .update({ uploaded_count: doneNow }).eq('id', sessionId);

      updateFile({ status: 'done', resumePath, id: sfRow?.id ?? this.session!.files[fileIdx].id });

    } catch (err: any) {
      const msg = (err.message || 'Unknown error').slice(0, 200);
      updateFile({ status: 'failed', error: msg });

      // Record failure in DB
      await supabase.from('hr_talent_pool_upload_session_files').insert({
        session_id      : sessionId,
        organization_id : organizationId,
        file_name       : file.name,
        file_size       : file.size,
        upload_status   : 'failed',
        error_message   : msg,
      }).catch(() => {});

      const failedNow = this.session?.files.filter(f => f.status === 'failed').length ?? 0;
      await supabase.from('hr_talent_pool_upload_sessions')
        .update({ failed_count: failedNow }).eq('id', sessionId).catch(() => {});
    }
  }

  // ── Submit session to OpenAI Batch API ────────────────────────────────────
  async submitSession(sessionId: string): Promise<void> {
    if (!this.session) return;
    this.session.status = 'submitting';
    await idbSet(`session_${sessionId}`, this.session);
    this.emit({ type: 'progress', session: this.session });

    try {
      const { data, error } = await supabase.functions.invoke('talent-batch-submit', {
        body: { sessionId, organizationId: this.session.organizationId, userId: this.session.userId },
      });

      if (error) throw new Error(error.message);

      this.session.status = 'submitted';
      await idbSet(`session_${sessionId}`, this.session);
      await idbDel(`session_${sessionId}`);  // clean up local cache after success

      this.emit({ type: 'submitted', batchJobId: data.batchJobId });
      this.session = null;
    } catch (err: any) {
      this.emit({ type: 'error', message: `Batch submit failed: ${err.message}` });
    }
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────
export const uploadManager = new UploadSessionManager();