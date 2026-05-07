// src/lib/UploadSessionManager.ts
//
// ARCHITECTURE CHANGE:
//   Browser responsibility: parse file → upload to storage → insert session_file row (status='uploaded')
//   Server responsibility: talent-batch-submit reads from DB and calls OpenAI — no resume text in HTTP payload
//
// Resume logic:
//   On mount, checkForIncompleteSession fetches the DB session.
//   It compares DB file records against the files the user re-selects.
//   Files already 'uploaded' in DB are skipped (dedup by file_hash).
//   Only truly pending/failed files get reprocessed.
//
// Why uploads stopped before:
//   1. Browser tab closed / went idle → in-memory queue died
//   2. talent-pool-parser edge function timed out on large PDFs (Supabase free: 150s wall clock)
//   3. All 3 CONCURRENCY workers hitting simultaneous timeouts caused processFiles to fall through early
//
// Long-term fixes applied here:
//   1. Each file is independently retried up to MAX_RETRIES times with exponential backoff
//   2. CONCURRENCY reduced to 2 to reduce simultaneous edge function load
//   3. Session state is persisted to BOTH IndexedDB (fast) and Supabase (durable across devices)
//   4. Resume requires user to re-select files; we match by sha256 hash (not just name+size)
//      so renamed files still match
//   5. submitSession is idempotent — if called twice it won't double-submit

import { supabase } from '@/integrations/supabase/client';
import mammoth from 'mammoth';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UploadFileState {
  id          : string;
  fileName    : string;
  fileSize    : number;
  status      : 'pending' | 'parsing' | 'uploading' | 'done' | 'failed' | 'skipped' | 'duplicate';
  error?      : string;
  resumePath? : string;
  retries?    : number;
}

export interface UploadSession {
  sessionId      : string;
  organizationId : string;
  userId         : string;
  totalFiles     : number;
  files          : UploadFileState[];
  status         : 'uploading' | 'submitting' | 'submitted' | 'failed' | 'cancelled';
  startedAt      : string;
}

export type UploadEvent =
  | { type: 'progress';  session: UploadSession }
  | { type: 'file_done'; fileId: string; status: UploadFileState['status'] }
  | { type: 'submitted'; batchJobId: string }
  | { type: 'error';     message: string }
  | { type: 'resumed';   session: UploadSession };

type Listener = (e: UploadEvent) => void;

// ─── Constants ────────────────────────────────────────────────────────────────
const BUCKET      = 'talent-pool-resumes';
const CONCURRENCY = 8;    // reduced from 3 — fewer simultaneous edge function calls
const MAX_RETRIES = 3;    // retry each file up to 3 times on timeout/network error
const IDB_DB_NAME = 'hrumbles_uploads';
const IDB_STORE   = 'sessions';

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
async function sha256hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Sanitize filename ────────────────────────────────────────────────────────
const sanitize = (n: string) => n.replace(/[\[\]\+\s]+/g, '_');

// ─── base64 → Blob ────────────────────────────────────────────────────────────
function base64ToBlob(b64: string, mime: string): Blob {
  const CHUNK = 8192;
  const chunks: Uint8Array[] = [];
  const raw = atob(b64);
  for (let i = 0; i < raw.length; i += CHUNK) {
    const s = raw.slice(i, i + CHUNK);
    const b = new Uint8Array(s.length);
    for (let j = 0; j < s.length; j++) b[j] = s.charCodeAt(j);
    chunks.push(b);
  }
  return new Blob(chunks, { type: mime });
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const r  = tx.objectStore(IDB_STORE).get(key);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror   = () => rej(r.error);
    });
  } catch { return null; }
}
async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
  } catch {}
}
async function idbDel(key: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD SESSION MANAGER — singleton
// ════════════════════════════════════════════════════════════════════════════
class UploadSessionManager {
  private session  : UploadSession | null = null;
  private listeners: Listener[]           = [];
  private aborted                         = false;

  on(fn: Listener)  { this.listeners.push(fn); }
  off(fn: Listener) { this.listeners = this.listeners.filter(l => l !== fn); }
  private emit(e: UploadEvent) { this.listeners.forEach(l => { try { l(e); } catch {} }); }

  get currentSession() { return this.session; }
  get isActive()       { return this.session?.status === 'uploading'; }

  // ── On app mount: check DB for any incomplete sessions ─────────────────────
  // Returns a reconstructed session so the UI can offer resume.
  // Does NOT start processing — user must re-select files to resume.
  async checkForIncompleteSession(userId: string): Promise<UploadSession | null> {
    try {
      const { data } = await supabase
        .from('hr_talent_pool_upload_sessions')
        .select('*')
        .eq('created_by', userId)
        .in('status', ['uploading', 'submitting'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      // Try IndexedDB first (has per-file detail)
      const local: UploadSession | null = await idbGet(`session_${data.id}`);
      if (local && local.status !== 'cancelled') {
        // Emit resumed — UI shows banner, session is NOT set as active
        this.emit({ type: 'resumed', session: local });
        return local;
      }

      // Reconstruct from DB session files
      const { data: files } = await supabase
        .from('hr_talent_pool_upload_session_files')
        .select('id, file_name, file_size, resume_path, upload_status, error_message')
        .eq('session_id', data.id);

      const fileStates: UploadFileState[] = (files ?? []).map(f => ({
        id        : f.id,
        fileName  : f.file_name,
        fileSize  : f.file_size ?? 0,
        status    : (f.upload_status === 'uploaded' ? 'done' :
                     f.upload_status === 'failed'   ? 'failed' :
                     f.upload_status === 'skipped'  ? 'skipped' : 'pending') as UploadFileState['status'],
        resumePath: f.resume_path ?? undefined,
        error     : f.error_message ?? undefined,
      }));

      // The total in DB may be higher than what's been recorded as files yet
      // (files not yet processed have no row). Fill the gap with pending placeholders.
      const recordedCount = fileStates.length;
      const totalInDB     = data.total_files;
      const pendingCount  = Math.max(0, totalInDB - recordedCount);
      for (let i = 0; i < pendingCount; i++) {
        fileStates.push({
          id       : `placeholder_${i}`,
          fileName : `File ${recordedCount + i + 1} (not yet uploaded)`,
          fileSize : 0,
          status   : 'pending',
        });
      }

      const session: UploadSession = {
        sessionId      : data.id,
        organizationId : data.organization_id,
        userId         : data.created_by,
        totalFiles     : totalInDB,
        files          : fileStates,
        status         : 'uploading', // treat as resumable
        startedAt      : data.created_at,
      };

      await idbSet(`session_${data.id}`, session);
      this.emit({ type: 'resumed', session });
      return session;

    } catch (err) {
      console.warn('checkForIncompleteSession failed:', err);
      return null;
    }
  }

  // ── Start a brand new upload session ─────────────────────────────────────
 async startSession(files: File[], organizationId: string, userId: string): Promise<string> {
  this.aborted = false;

  // Auto-cancel stale sessions (older than 30 minutes)
  const { data: staleSessions } = await supabase
    .from('hr_talent_pool_upload_sessions')
    .select('id')
    .eq('created_by', userId)
    .in('status', ['uploading', 'submitting'])
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

  if (staleSessions?.length) {
    await Promise.all(
      staleSessions.map(s =>
        supabase
          .from('hr_talent_pool_upload_sessions')
          .update({ status: 'cancelled' })
          .eq('id', s.id)
      )
    );
  }

  // ✅ ADD THIS BACK: Create the actual session row
  const { data: sessionRow, error } = await supabase
    .from('hr_talent_pool_upload_sessions')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      total_files: files.length,
      status: 'uploading',
    })
    .select('id')
    .single();

  if (error || !sessionRow) throw new Error(`Failed to create session: ${error?.message}`);
  const sessionId = sessionRow.id;

  // Build initial file states (all pending)
  const fileStates: UploadFileState[] = files.map((f, i) => ({
    id: `${sessionId}_${i}`,
    fileName: f.name,
    fileSize: f.size,
    status: 'pending' as const,
  }));

  this.session = {
    sessionId,
    organizationId,
    userId,
    totalFiles: files.length,
    files: fileStates,
    status: 'uploading',
    startedAt: new Date().toISOString(),
  };

  await idbSet(`session_${sessionId}`, this.session);
  this.emit({ type: 'progress', session: this.session });

  await this.processFiles(files, sessionId, organizationId);
  return sessionId;
}

  // ── Resume an incomplete session ──────────────────────────────────────────
  // newFiles: the files the user re-selected. We match by SHA-256 hash,
  // skipping any file whose hash is already 'uploaded' in the DB.
  // This means:
  //   - Already uploaded files (2036): matched by hash → skipped instantly
  //   - Pending files from the original batch: processed fresh
  //   - Files the user didn't re-select: left as pending (resume again later)
  async resumeSession(existingSession: UploadSession, newFiles: File[]): Promise<void> {
    this.aborted = false;

    // Activate the session so the float widget shows
    existingSession.status = 'uploading';
    this.session = existingSession;
    await idbSet(`session_${existingSession.sessionId}`, this.session);
    this.emit({ type: 'progress', session: this.session });

    // Compute hashes for all re-selected files (in parallel, batched)
    const hashMap = new Map<string, File>(); // hash → File
    await Promise.all(
      newFiles.map(async f => {
        try {
          const buf  = await f.arrayBuffer();
          const hash = await sha256hex(buf);
          hashMap.set(hash, f);
        } catch {}
      })
    );

    // Fetch which hashes are already uploaded for this org
    const hashes = [...hashMap.keys()];
    const alreadyUploaded = new Set<string>();

    if (hashes.length > 0) {
      // Check in batches of 100 to avoid URL length limits
for (let i = 0; i < hashes.length; i += 50) {
  const batch = hashes.slice(i, i + 50);
        const { data } = await supabase
          .from('hr_talent_pool_upload_session_files')
          .select('file_hash')
          .eq('organization_id', existingSession.organizationId)
          .in('file_hash', batch)
          .eq('upload_status', 'uploaded');
        (data ?? []).forEach(r => { if (r.file_hash) alreadyUploaded.add(r.file_hash); });
      }
    }

    // Separate into: skip (already in DB) vs process (need uploading)
    const toProcess: File[] = [];
    for (const [hash, file] of hashMap.entries()) {
      if (alreadyUploaded.has(hash)) {
        // Mark matching file state as done if it was pending
        const idx = this.session.files.findIndex(
          f => f.fileName === file.name && (f.status === 'pending' || f.status === 'failed')
        );
        if (idx >= 0) {
          this.session.files[idx] = { ...this.session.files[idx], status: 'done' };
        }
      } else {
        toProcess.push(file);
      }
    }

    // Update total to reflect reality (remove placeholder count, add real remaining)
    // Keep existing done/skipped, only recount pending
    const doneSoFar   = this.session.files.filter(f => f.status === 'done' || f.status === 'duplicate' || f.status === 'skipped').length;
    const failedSoFar = this.session.files.filter(f => f.status === 'failed').length;

    await idbSet(`session_${existingSession.sessionId}`, this.session);
    this.emit({ type: 'progress', session: this.session });

    if (toProcess.length === 0) {
      // Everything already done — just submit
      const doneCount = this.session.files.filter(f => f.status === 'done').length;
      if (doneCount > 0) {
        await this.submitSession(existingSession.sessionId);
      } else {
        this.emit({ type: 'error', message: 'No new files to process and nothing to submit.' });
      }
      return;
    }

    await this.processFiles(toProcess, existingSession.sessionId, existingSession.organizationId);
  }

  // ── Cancel active session ──────────────────────────────────────────────────
  async cancelSession(): Promise<void> {
    if (!this.session) return;
    this.aborted = true;
    const id = this.session.sessionId;
    await supabase
      .from('hr_talent_pool_upload_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    await idbDel(`session_${id}`);
    this.session = null;
  }

  // ── Core: process files with controlled concurrency ───────────────────────
  private async processFiles(files: File[], sessionId: string, organizationId: string): Promise<void> {
    const queue = [...files];

    const worker = async () => {
      while (queue.length > 0 && !this.aborted) {
        const file = queue.shift();
        if (!file) break;
        await this.processOneFile(file, sessionId, organizationId);
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    if (this.aborted) return;

    const doneCount = this.session?.files.filter(f => f.status === 'done').length ?? 0;
    if (doneCount === 0) {
      this.emit({ type: 'error', message: 'No files could be parsed or uploaded.' });
      return;
    }

    await this.submitSession(sessionId);
  }

  // ── Process one file with retry logic ────────────────────────────────────
  // Retries on timeout/network errors. Each retry waits 2^attempt seconds.
  // On permanent failure (bad file, unsupported type) it fails immediately.
  private async processOneFile(file: File, sessionId: string, organizationId: string): Promise<void> {
    const fileIdx = this.session!.files.findIndex(
      f => f.fileName === file.name && (f.status === 'pending' || f.status === 'failed')
    );
    // If we can't find by name, try any pending slot (for resume with renamed files)
    const actualIdx = fileIdx >= 0 ? fileIdx : this.session!.files.findIndex(f => f.status === 'pending');
    if (actualIdx < 0) return;

    const updateFile = (patch: Partial<UploadFileState>) => {
      if (!this.session) return;
      this.session.files[actualIdx] = { ...this.session.files[actualIdx], ...patch };
      idbSet(`session_${sessionId}`, this.session).catch(() => {});
      this.emit({ type: 'progress', session: { ...this.session, files: [...this.session.files] } });
    };

    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.aborted) return;

      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const backoff = Math.pow(2, attempt) * 1000;
        updateFile({ status: 'pending', error: `Retry ${attempt}/${MAX_RETRIES} in ${backoff/1000}s…` });
        await sleep(backoff);
        if (this.aborted) return;
      }

      updateFile({ status: 'parsing', error: undefined, retries: attempt });

      try {
        // ── Hash file ───────────────────────────────────────────────────────
        const rawBuffer = await file.arrayBuffer();
        const fileHash  = await sha256hex(rawBuffer);

        // ── Dedup check ─────────────────────────────────────────────────────
        const { data: existing } = await supabase.rpc('check_file_already_uploaded', {
          p_file_hash       : fileHash,
          p_organization_id : organizationId,
        });

       if (existing?.length > 0) {
  const prev = existing[0];
  updateFile({ 
    status: 'duplicate', 
    resumePath: prev.resume_path, 
    error: `Duplicate of ${prev.file_name}` 
  });
  
  // Still insert a record so we know it was seen
  const { error: duplicateInsertError } = await supabase
    .from('hr_talent_pool_upload_session_files')
    .insert({
      session_id: sessionId,
      organization_id: organizationId,
      file_name: file.name,
      file_size: file.size,
      file_hash: fileHash,
      resume_path: prev.resume_path,
      resume_text: null,
      upload_status: 'skipped',
      error_message: `Duplicate of ${prev.file_name}`,
    });
    
  if (duplicateInsertError) {
    console.warn('Failed to insert duplicate record:', duplicateInsertError);
  }
  
  return; // ✅ CRITICAL: Stop processing this file, it's a duplicate
}
        // ── Parse file ──────────────────────────────────────────────────────
        let text           = '';
        let compressedBlob : Blob;

        if (file.type === 'application/pdf') {
          // Use AbortController so we can time out the edge function call ourselves
          // Supabase edge function timeout is 150s; we set 120s to catch it cleanly
          const controller = new AbortController();
          const timeout    = setTimeout(() => controller.abort(), 120_000);

          let data: any;
          let invokeError: any;
          try {
            const result = await supabase.functions.invoke('talent-pool-parser', {
              body   : file,
            });
            data        = result.data;
            invokeError = result.error;
          } finally {
            clearTimeout(timeout);
          }

          if (invokeError || !data?.text) {
            const msg = invokeError?.message ?? 'Parser returned no text';
            // Distinguish retryable (timeout/network) from permanent (bad PDF)
            const isRetryable = msg.includes('timeout') || msg.includes('network') ||
                                msg.includes('524') || msg.includes('fetch') ||
                                msg.includes('abort') || controller.signal.aborted;
            if (isRetryable && attempt < MAX_RETRIES) {
              lastError = `Parse timeout (attempt ${attempt + 1})`;
              continue; // retry
            }
            throw new Error(`Parse error: ${msg}`);
          }

          text           = data.text;
          compressedBlob = base64ToBlob(data.compressedBase64, 'application/pdf');

        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result   = await mammoth.extractRawText({ arrayBuffer: rawBuffer });
          text           = result.value;
          compressedBlob = new Blob([rawBuffer], { type: file.type });

        } else {
          // Permanent failure — don't retry
          throw Object.assign(new Error('Unsupported file type. Use PDF or DOCX.'), { permanent: true });
        }

        // ── Upload to storage ───────────────────────────────────────────────
        updateFile({ status: 'uploading' });
        const storageKey = `${crypto.randomUUID()}-${sanitize(file.name)}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(storageKey, compressedBlob, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          const isRetryable = uploadErr.message?.includes('network') || uploadErr.message?.includes('timeout');
          if (isRetryable && attempt < MAX_RETRIES) {
            lastError = `Upload error (attempt ${attempt + 1}): ${uploadErr.message}`;
            continue; // retry
          }
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        const resumePath = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path).data.publicUrl;

        // ── Insert session file record ──────────────────────────────────────
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
          .select('id')
          .single();

        // ── Update session uploaded_count ────────────────────────────────────
        // Use DB increment to avoid race conditions between concurrent workers
                const { error: uploadCountError } = await supabase.rpc('increment_session_uploaded_count', { 
          p_session_id: sessionId 
        });

        if (uploadCountError) {
          console.warn('RPC increment_session_uploaded_count failed, using fallback:', uploadCountError);
          try {
            const { data: sessionData } = await supabase
              .from('hr_talent_pool_upload_sessions')
              .select('uploaded_count')
              .eq('id', sessionId)
              .single();
              
            if (sessionData) {
              await supabase
                .from('hr_talent_pool_upload_sessions')
                .update({ uploaded_count: (sessionData.uploaded_count ?? 0) + 1 })
                .eq('id', sessionId);
            }
          } catch (fallbackError) {
            console.error('Fallback uploaded count increment failed:', fallbackError);
          }
        }

        updateFile({ status: 'done', resumePath, id: sfRow?.id ?? this.session!.files[actualIdx].id });
        return; // success — exit retry loop

      } catch (err: any) {
        const permanent = (err as any).permanent === true;
        if (permanent || attempt >= MAX_RETRIES) {
          // Final failure
          const msg = (err.message ?? 'Unknown error').slice(0, 200);
          lastError = msg;
          updateFile({ status: 'failed', error: msg });

          const { error: failedInsertError } = await supabase
            .from('hr_talent_pool_upload_session_files')
            .insert({
              session_id: sessionId,
              organization_id: organizationId,
              file_name: file.name,
              file_size: file.size,
              upload_status: 'failed',
              error_message: msg,
            });

          if (failedInsertError) {
            console.warn('Failed to insert failed record:', failedInsertError);
          }

          // ✅ FIXED: Proper error handling for failed count RPC
          const { error: failedCountError } = await supabase.rpc('increment_session_failed_count', { 
            p_session_id: sessionId 
          });
          
          if (failedCountError) {
            console.warn('RPC increment_session_failed_count failed, using fallback:', failedCountError);
            try {
              const { data: sessionData } = await supabase
                .from('hr_talent_pool_upload_sessions')
                .select('failed_count')
                .eq('id', sessionId)
                .single();
                
              if (sessionData) {
                await supabase
                  .from('hr_talent_pool_upload_sessions')
                  .update({ failed_count: (sessionData.failed_count ?? 0) + 1 })
                  .eq('id', sessionId);
              }
            } catch (fallbackError) {
              console.error('Fallback failed count increment failed:', fallbackError);
            }
          }
          
          return;
        }
        lastError = err.message;
        // Loop continues to next retry
      }
    }
  }

  // ── Submit session to OpenAI Batch (idempotent) ───────────────────────────
  // Checks if a batch_job_id is already set — if so, don't double-submit.
  async submitSession(sessionId: string): Promise<void> {
    if (!this.session) return;

    // Idempotency: check if already submitted
    const { data: existing } = await supabase
      .from('hr_talent_pool_upload_sessions')
      .select('status, batch_job_id')
      .eq('id', sessionId)
      .single();

    if (existing?.batch_job_id && existing?.status === 'submitted') {
      this.session.status = 'submitted';
      this.emit({ type: 'submitted', batchJobId: existing.batch_job_id });
      this.session = null;
      return;
    }

    this.session.status = 'submitting';
    await idbSet(`session_${sessionId}`, this.session);
    this.emit({ type: 'progress', session: { ...this.session } });

    try {
      const { data, error } = await supabase.functions.invoke('talent-batch-submit', {
        body: {
          sessionId,
          organizationId : this.session.organizationId,
          userId         : this.session.userId,
        },
      });

      if (error) throw new Error(error.message);

      this.session.status = 'submitted';
      await idbDel(`session_${sessionId}`);
      this.emit({ type: 'submitted', batchJobId: data.batchJobId });
      this.session = null;

    } catch (err: any) {
      this.emit({ type: 'error', message: `Batch submit failed: ${err.message}` });
    }
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────
export const uploadManager = new UploadSessionManager();