// src/components/MagicLinkView/candidate-profile-v2/components/V2WhatsAppFloat.tsx
//
// FIXES in this version:
//   1. Realtime: removed column filter from subscription (needs REPLICA IDENTITY FULL).
//      Instead filters in the JS payload callback — works without any DB config.
//   2. Media rendering:
//        [Image|url]               → inline <img> with lightbox click
//        [Document|name|url]       → download card with filename + icon
//        [Audio|url]               → <audio> player
//        [Video|url]               → <video> player
//        [Document|name] (no url)  → grey placeholder (media download failed)

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from 'react';
import { createPortal } from 'react-dom';
import { supabase }      from '@/integrations/supabase/client';
import { useSelector }   from 'react-redux';
import { toast }         from 'sonner';

// ── Types ───────────────────────────────────────────────────────────────────────

interface WaMessage {
  id:                string;
  direction:         'inbound' | 'outbound';
  message_type:      string;
  content:           string | null;
  template_name:     string | null;
  template_language: string | null;
  wa_message_id:     string | null;
  status:            'sent' | 'delivered' | 'read' | 'failed';
  sent_at:           string;
  sent_by?:          string | null;   // hr_employees.id of sender
  // joined from view (only in inbox mode)
  sent_by_first_name?: string | null;
  sent_by_last_name?:  string | null;
}

interface WaTemplate {
  name:         string;
  language:     string;
  display_name: string;
  status:       string;
  category:     string;
  components?:  Array<{ type: string; text?: string; format?: string }>;
}

export interface V2WhatsAppFloatProps {
  candidateId:     string;
  jobId?:          string;
  candidateName:   string;
  candidatePhone?: string | null;
}

type ConvState = 'none' | 'active' | 'closed';

// ── Content parser ───────────────────────────────────────────────────────────────
// Parses the encoded content strings the webhook writes:
//   [Image|https://...]
//   [Document|filename.pdf|https://...]
//   [Audio|https://...]
//   [Video|https://...]

type ParsedContent =
  | { kind: 'text';     text: string }
  | { kind: 'image';    url: string }
  | { kind: 'document'; filename: string; url: string | null }
  | { kind: 'audio';    url: string }
  | { kind: 'video';    url: string }
  | { kind: 'placeholder'; label: string };

function parseContent(raw: string | null): ParsedContent {
  if (!raw) return { kind: 'text', text: '' };

  if (raw.startsWith('[Image|')) {
    const url = raw.slice(7, -1);
    return url ? { kind: 'image', url } : { kind: 'placeholder', label: '📷 Image' };
  }
  if (raw.startsWith('[Document|')) {
    const inner = raw.slice(10, -1);
    const parts = inner.split('|');
    if (parts.length >= 2) {
      return { kind: 'document', filename: parts[0], url: parts[1] };
    }
    return { kind: 'document', filename: parts[0] || 'Document', url: null };
  }
  if (raw.startsWith('[Audio|')) {
    const url = raw.slice(7, -1);
    return url ? { kind: 'audio', url } : { kind: 'placeholder', label: '🎵 Audio' };
  }
  if (raw.startsWith('[Video|')) {
    const url = raw.slice(7, -1);
    return url ? { kind: 'video', url } : { kind: 'placeholder', label: '🎥 Video' };
  }
  if (raw.startsWith('[')) {
    return { kind: 'placeholder', label: raw.slice(1, -1) };
  }
  return { kind: 'text', text: raw };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (d: string) => {
  const today = new Date();
  const yest  = new Date(today);
  yest.setDate(today.getDate() - 1);
  const dt = new Date(d);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === yest.toDateString())  return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10)                            return `91${d}`;
  if (d.length === 11 && d.startsWith('0'))       return `91${d.slice(1)}`;
  return d;
}

function get24hWindow(msgs: WaMessage[]) {
  const lastIn    = [...msgs].reverse().find(m => m.direction === 'inbound');
  if (!lastIn)    return { open: false, hoursLeft: 0, minutesLeft: 0 };
  const diffMs    = Date.now() - new Date(lastIn.sent_at).getTime();
  const totalLeft = Math.max(0, 24 * 3_600_000 - diffMs);
  return {
    open:        totalLeft > 0,
    hoursLeft:   Math.floor(totalLeft / 3_600_000),
    minutesLeft: Math.floor((totalLeft % 3_600_000) / 60_000),
  };
}

function initials(name: string) {
  const p = name.trim().split(' ').filter(Boolean);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : (p[0]?.[0] ?? '?').toUpperCase();
}

function getTemplateBody(tpl: WaTemplate): string {
  return tpl.components?.find(c => c.type === 'BODY')?.text ?? '';
}

if (typeof document !== 'undefined' && !document.getElementById('waf-kf')) {
  const s = document.createElement('style');
  s.id = 'waf-kf';
  s.textContent = [
    '@keyframes waf-spin{to{transform:rotate(360deg)}}',
    '@keyframes waf-pop{0%{transform:scale(0.82);opacity:0}100%{transform:scale(1);opacity:1}}',
    '@keyframes waf-slide-up{0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}',
    '@keyframes waf-badge{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}60%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Icons ─────────────────────────────────────────────────────────────────────────

const WA_D = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

const IcoWA    = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d={WA_D}/></svg>;
const IcoWAGrn = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366"><path d={WA_D}/></svg>;
const IcoClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoMax   = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
);
const IcoMin   = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
  </svg>
);
const IcoSend  = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoTpl   = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IcoChevDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoChevUp = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const IcoDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// ── Sub-components ───────────────────────────────────────────────────────────────

function Spin({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}40`, borderTopColor: color,
      borderRadius: '50%', animation: 'waf-spin 0.7s linear infinite',
    }} />
  );
}

function Tick({ status }: { status: WaMessage['status'] }) {
  if (status === 'read')      return <span style={{ color: '#34B7F1', fontSize: 11 }}>✓✓</span>;
  if (status === 'delivered') return <span style={{ color: '#9CA3AF', fontSize: 11 }}>✓✓</span>;
  if (status === 'sent')      return <span style={{ color: '#9CA3AF', fontSize: 11 }}>✓</span>;
  if (status === 'failed')    return <span style={{ color: '#EF4444', fontSize: 11 }}>✗</span>;
  return null;
}

// ── MediaBubble — renders image / document / audio / video ───────────────────────

function MediaBubble({ content, isOut }: { content: ParsedContent; isOut: boolean }) {
  const bubbleBg = isOut ? '#DCF8C6' : '#fff';

  switch (content.kind) {
    case 'image':
      return (
        <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <img
            src={content.url}
            alt="Image"
            style={{
              maxWidth: 220, maxHeight: 200, borderRadius: 10,
              display: 'block', cursor: 'zoom-in',
              border: '1px solid rgba(0,0,0,0.08)',
              objectFit: 'cover',
            }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).insertAdjacentHTML('afterend', '<span style="font-size:12px;color:#9CA3AF">Image unavailable</span>');
            }}
          />
        </a>
      );

    case 'document':
      return (
        <div style={{
          background: bubbleBg,
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          minWidth: 180, maxWidth: 240,
        }}>
          {/* File icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: '#EDE9FE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {content.filename.endsWith('.pdf') ? '📄'
             : content.filename.endsWith('.doc') || content.filename.endsWith('.docx') ? '📝'
             : content.filename.endsWith('.xls') || content.filename.endsWith('.xlsx') ? '📊'
             : '📎'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {content.filename}
            </div>
            {content.url ? (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                download={content.filename}
                style={{
                  fontSize: 11, color: '#7C3AED', fontWeight: 600,
                  textDecoration: 'none', display: 'inline-flex',
                  alignItems: 'center', gap: 3, marginTop: 3,
                }}
              >
                <IcoDownload /> Download
              </a>
            ) : (
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Unavailable</div>
            )}
          </div>
        </div>
      );

    case 'audio':
      return (
        <audio
          controls
          src={content.url}
          style={{ maxWidth: 220, borderRadius: 8, height: 36 }}
        />
      );

    case 'video':
      return (
        <video
          controls
          src={content.url}
          style={{ maxWidth: 220, maxHeight: 180, borderRadius: 10 }}
        />
      );

    case 'placeholder':
      return (
        <div style={{
          fontSize: 13, color: '#6B7280', fontStyle: 'italic',
          padding: '4px 0',
        }}>
          {content.label}
        </div>
      );

    default:
      return null;
  }
}

// ── MessageBubble — text or media ────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: WaMessage }) {
  const isOut    = msg.direction === 'outbound';
  const parsed   = parseContent(msg.content);
  const isMedia  = parsed.kind !== 'text' && parsed.kind !== 'placeholder';
  const isTpl    = msg.message_type === 'template';

  return (
    <div style={{
      alignSelf: isOut ? 'flex-end' : 'flex-start',
      maxWidth: '82%', display: 'flex',
      flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start',
    }}>
      {isTpl && msg.template_name && (
        <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2, fontStyle: 'italic', paddingRight: isOut ? 4 : 0 }}>
          Template · {msg.template_name}
        </div>
      )}

      {isMedia ? (
        /* Media content — no background wrapper, the MediaBubble handles its own styling */
        <div style={{ borderRadius: 12, overflow: 'hidden' }}>
          <MediaBubble content={parsed} isOut={isOut} />
        </div>
      ) : (
        /* Text content */
        <div style={{
          padding: '8px 12px',
          borderRadius: isOut ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          background: isOut ? '#DCF8C6' : '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          fontSize: 13, color: '#111827', lineHeight: 1.6,
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {parsed.kind === 'text' ? parsed.text : parsed.kind === 'placeholder' ? parsed.label : ''}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtTime(msg.sent_at)}</span>
        {isOut && <Tick status={msg.status} />}
      </div>
    </div>
  );
}

// ── TemplateCard ─────────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onSend, isSending }: { tpl: WaTemplate; onSend: (t: WaTemplate) => void; isSending: boolean }) {
  const [hovered, setHov] = useState(false);
  const body = getTemplateBody(tpl);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => !isSending && onSend(tpl)}
      style={{
        border: `1px solid ${hovered ? '#25D366' : '#E5E7EB'}`,
        borderRadius: 12, background: hovered ? '#F0FDF4' : '#fff',
        padding: '14px 16px', cursor: isSending ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s', animation: 'waf-slide-up 0.25s ease both',
        opacity: isSending ? 0.6 : 1,
        boxShadow: hovered ? '0 2px 10px rgba(37,211,102,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: body ? 10 : 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: '#DCF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#128C7E' }}>
          <IcoTpl />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.display_name}</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#D1FAE5', color: '#065F46', textTransform: 'uppercase' as const }}>{tpl.category}</span>
            <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#EDE9FE', color: '#7C3AED' }}>{tpl.language}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={hovered ? '#25D366' : '#D1D5DB'} strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
      {body && (
        <div style={{
          fontSize: 11, color: '#6B7280', lineHeight: 1.65,
          background: '#F9FAFB', borderRadius: 8, padding: '8px 10px',
          borderLeft: '3px solid #25D36640', whiteSpace: 'pre-wrap',
          maxHeight: 80, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const,
        }}>
          {body}
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────────

const V2WhatsAppFloat: React.FC<V2WhatsAppFloatProps> = ({
  candidateId,
  jobId,
  candidateName,
  candidatePhone,
}) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const userId         = useSelector((s: any) => s.auth.user?.id ?? s.auth.userId);

  const [isOpen,       setIsOpen]       = useState(false);
  const [isMaximized,  setIsMaximized]  = useState(false);
  const [messages,     setMessages]     = useState<WaMessage[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSending,    setIsSending]    = useState(false);
  const [inputText,    setInputText]    = useState('');
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [waConfig,     setWaConfig]     = useState<any>(null);
  const [templates,    setTemplates]    = useState<WaTemplate[]>([]);
  const [trayOpen,     setTrayOpen]     = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const endRef     = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);

  const hasPhone        = !!candidatePhone && candidatePhone !== 'N/A';
  const normalizedPhone = hasPhone ? normalizePhone(candidatePhone!) : null;
  const win             = get24hWindow(messages);

  const convState: ConvState =
    messages.length === 0 ? 'none'
    : win.open            ? 'active'
    :                       'closed';

  const canType = convState === 'active';

  // ── Load config ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('hr_organizations')
      .select('whatsapp_config')
      .eq('id', organizationId)
      .single()
      .then(({ data }) => {
        if (data?.whatsapp_config) {
          setWaConfig(data.whatsapp_config);
          setTemplates(data.whatsapp_config.templates ?? []);
        }
        setConfigLoaded(true);
      });
  }, [organizationId]);

  // ── Fetch messages by phone ──────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!normalizedPhone || !organizationId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone_number', normalizedPhone)
      .order('sent_at', { ascending: true });
    if (!error && data) setMessages(data as WaMessage[]);
    setIsLoading(false);
  }, [normalizedPhone, organizationId]);

  // ── Realtime subscription ────────────────────────────────────────────────
  // KEY FIX: No column filter on the subscription.
  // Supabase postgres_changes column filters require REPLICA IDENTITY FULL.
  // Instead we filter in the JS callback — always reliable.
  useEffect(() => {
    if (!isOpen || !normalizedPhone || !organizationId) return;
    fetchMessages();

    const channelName = `waf_${organizationId}_${normalizedPhone}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'whatsapp_messages',
          // No filter here — filter in callback below
        },
        payload => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as WaMessage & { phone_number?: string; organization_id?: string };

          // Filter by phone + org in JS
          if (row.phone_number !== normalizedPhone)   return;
          if (row.organization_id !== organizationId) return;

          if (payload.eventType === 'INSERT') {
            const m = payload.new as WaMessage;
            setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
            if (m.direction === 'inbound') {
              setUnreadCount(c => c + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev =>
              prev.map(x => x.id === payload.new.id ? { ...x, ...payload.new } as WaMessage : x)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`[waf] Realtime ${channelName} status:`, status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isOpen, normalizedPhone, organizationId, fetchMessages]);

  // Auto-manage tray
  useEffect(() => {
    if (convState === 'closed') setTrayOpen(true);
    if (convState === 'active') setTrayOpen(false);
  }, [convState]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages.length, isOpen]);

  // Clear unread on open
  useEffect(() => { if (isOpen) setUnreadCount(0); }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 100)}px`;
    }
  }, [inputText]);

  // ── Senders ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || !canType) return;
    setIsSending(true);
    setInputText('');
    try {
      const { data, error } = await supabase.functions.invoke('wa-send', {
        body: { organizationId, candidateId, jobId: jobId ?? null, phone: candidatePhone, messageType: 'text', content: text, sentBy: userId },
      });
      if (error)       throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send');
      setInputText(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendTemplate = async (tpl: WaTemplate) => {
    if (isSending || !hasPhone) return;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('wa-send', {
        body: { organizationId, candidateId, jobId: jobId ?? null, phone: candidatePhone, messageType: 'template', templateName: tpl.name, templateLanguage: tpl.language, sentBy: userId },
      });
      if (error)       throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(convState === 'none'
        ? `"${tpl.display_name}" sent — waiting for reply`
        : `"${tpl.display_name}" sent`
      );
      if (convState !== 'none') setTrayOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send template');
    } finally {
      setIsSending(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!configLoaded || !waConfig?.is_active || !hasPhone) return null;

  const PANEL_W = isMaximized ? 660 : 390;
  const PANEL_H = isMaximized ? 720 : 580;

  // ─────────────────────────────────────────────────────────────────────────

  const portal = (
    <>
      <style>{`@keyframes waf-spin{to{transform:rotate(360deg)}}@keyframes waf-pop{0%{transform:scale(0.82);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes waf-slide-up{0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}@keyframes waf-badge{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}60%{box-shadow:0 0 0 5px rgba(239,68,68,0)}}`}</style>

      {isOpen && isMaximized && (
        <div onClick={() => setIsMaximized(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 9998 }} />
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: isMaximized ? '50%' : 92, right: isMaximized ? '50%' : 24,
          transform: isMaximized ? 'translate(50%,50%)' : 'none',
          width: PANEL_W, height: PANEL_H, zIndex: 9999, borderRadius: 18, background: '#fff',
          boxShadow: '0 16px 56px rgba(0,0,0,0.22),0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'all 0.28s cubic-bezier(.4,0,.2,1)',
          animation: 'waf-pop 0.22s cubic-bezier(.4,0,.2,1)',
        }}>

          {/* Header */}
          <div style={{ background: '#075E54', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {initials(candidateName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidateName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{candidatePhone}</div>
            </div>
            <button onClick={() => setIsMaximized(v => !v)} style={HDR_BTN} title={isMaximized ? 'Minimise' : 'Maximise'}>
              {isMaximized ? <IcoMin /> : <IcoMax />}
            </button>
            <button onClick={() => { setIsOpen(false); setIsMaximized(false); }} style={HDR_BTN} title="Close">
              <IcoClose />
            </button>
          </div>

          {/* Session bar */}
          {convState !== 'none' && (
            <div style={{
              padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              background: convState === 'active' ? '#E8F5E9' : '#FFF3E0',
              borderBottom: `1px solid ${convState === 'active' ? '#C8E6C9' : '#FFE0B2'}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: convState === 'active' ? '#25D366' : '#FF9800' }} />
              <span style={{ fontSize: 11, fontWeight: 500, flex: 1, color: convState === 'active' ? '#2E7D32' : '#E65100' }}>
                {convState === 'active'
                  ? `Session open · ${win.hoursLeft}h ${win.minutesLeft}m left · free chat enabled`
                  : '24h session closed · send a template to reopen'}
              </span>
            </div>
          )}

          {/* ══ none: Start Conversation ════════════════════════════════════ */}
          {convState === 'none' && (
            <div style={{ flex: 1, overflowY: 'auto', background: '#ECE5DD', display: 'flex', flexDirection: 'column' }}>
              <div style={{ margin: '16px 14px 0', background: '#fff', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#DCF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <IcoWAGrn />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 5 }}>Start conversation with {candidateName.split(' ')[0]}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.65, maxWidth: 280 }}>
                  WhatsApp requires an <strong style={{ color: '#374151' }}>approved template</strong> to initiate contact. Once they reply, free-form chat unlocks automatically.
                </div>
              </div>
              <div style={{ padding: '14px 14px 6px', fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Choose a template to send
              </div>
              <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spin size={22} color="#25D366" /></div>
                ) : templates.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
                    No approved templates. Go to <strong style={{ color: '#374151' }}>Settings → WhatsApp</strong> and sync.
                  </div>
                ) : (
                  templates.map(t => (
                    <TemplateCard key={`${t.name}_${t.language}`} tpl={t} onSend={handleSendTemplate} isSending={isSending} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ══ active | closed: Conversation ═══════════════════════════════ */}
          {convState !== 'none' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#ECE5DD', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 40 }}>
                    <Spin size={22} color="#25D366" />
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Loading conversation…</div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const newDay = i === 0 || !isSameDay(messages[i - 1].sent_at, msg.sent_at);
                      return (
                        <Fragment key={msg.id}>
                          {newDay && (
                            <div style={{ alignSelf: 'center', fontSize: 11, color: '#6B7280', background: 'rgba(255,255,255,0.88)', padding: '3px 12px', borderRadius: 99, margin: '6px 0', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                              {fmtDate(msg.sent_at)}
                            </div>
                          )}
                          <MessageBubble msg={msg} />
                        </Fragment>
                      );
                    })}
                    <div ref={endRef} />
                  </>
                )}
              </div>

              {/* Collapsible template tray */}
              {templates.length > 0 && (
                <div style={{ flexShrink: 0, borderTop: `1px solid ${convState === 'closed' ? '#FFE0B2' : '#E5E7EB'}` }}>
                  <button
                    onClick={() => setTrayOpen(v => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                      background: convState === 'closed' ? '#FFFBF0' : '#F9FAFB',
                      color: convState === 'closed' ? '#E65100' : '#6B7280',
                      fontSize: 11, fontWeight: 700, transition: 'background 0.15s',
                    }}
                  >
                    <IcoTpl />
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      {convState === 'closed' ? 'Send template to reopen conversation' : 'Templates'}
                    </span>
                    {trayOpen ? <IcoChevUp /> : <IcoChevDown />}
                  </button>
                  {trayOpen && (
                    <div style={{
                      padding: '8px 14px 10px',
                      background: convState === 'closed' ? '#FFFBF0' : '#F9FAFB',
                      maxHeight: 180, overflowY: 'auto',
                      borderTop: `1px solid ${convState === 'closed' ? '#FFE0B2' : '#F0F0F0'}`,
                    }}>
                      {templates.map(t => (
                        <button
                          key={`${t.name}_${t.language}`}
                          onClick={() => handleSendTemplate(t)}
                          disabled={isSending}
                          style={{
                            width: '100%', marginBottom: 5, padding: '9px 12px', borderRadius: 10,
                            border: '1px solid #E5E7EB', background: '#fff',
                            cursor: isSending ? 'not-allowed' : 'pointer',
                            textAlign: 'left', fontSize: 12, color: '#374151', fontWeight: 600,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            gap: 8, opacity: isSending ? 0.6 : 1, transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.display_name}</span>
                          <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 400, flexShrink: 0 }}>{t.language} · {t.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#F0F0F0', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={!canType || isSending}
                  placeholder={convState === 'closed' ? 'Session closed · use template ↑' : isSending ? 'Sending…' : 'Type a message… (Enter to send)'}
                  rows={1}
                  style={{
                    flex: 1, borderRadius: 22, border: 'none', padding: '9px 14px',
                    fontSize: 13, fontFamily: 'inherit', background: '#fff',
                    resize: 'none', outline: 'none', color: '#111827',
                    maxHeight: 100, overflowY: 'auto', lineHeight: 1.5,
                    opacity: canType ? 1 : 0.45, cursor: canType ? 'text' : 'not-allowed',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || !canType || isSending}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: inputText.trim() && canType ? '#25D366' : '#CBD5E1',
                    border: 'none', cursor: inputText.trim() && canType ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                  }}
                >
                  {isSending ? <Spin size={14} /> : <IcoSend />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title={isOpen ? 'Close chat' : `WhatsApp · ${candidateName}`}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: '50%', background: isOpen ? '#128C7E' : '#25D366',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,211,102,0.5)', zIndex: 9997,
          transition: 'background 0.2s,transform 0.18s,box-shadow 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 26px rgba(37,211,102,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)'; }}
      >
        {isOpen ? <IcoClose /> : <IcoWA />}
        {unreadCount > 0 && !isOpen && (
          <div style={{
            position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20,
            borderRadius: 99, background: '#EF4444', border: '2.5px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff', padding: '0 4px',
            animation: 'waf-badge 1.6s ease-in-out infinite',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>
    </>
  );

  return createPortal(portal, document.body);
};

export default V2WhatsAppFloat;

const HDR_BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
  cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: '5px 6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s', flexShrink: 0,
};