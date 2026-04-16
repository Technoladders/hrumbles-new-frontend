// src/pages/WhatsAppInbox.tsx  (now: Messaging Inbox / Candidate Conversations)
//
// RETHEMED: All WhatsApp branding replaced with Hrumbles brand.
//   - Page title: "WhatsApp Conversations" → "Candidate Conversations"
//   - WA logo SVG → generic chat icon
//   - #25D366 / #075E54 → brand purple (#7C3AED / #6D28D9)
//   - Chat bubbles: outbound #DCF8C6 → #EDE9FE, background #ECE5DD → #F5F3FF
//   - Conversation selected state: green → purple
//   - 24h open dot: green → purple
//   - Send button: green → purple
//   - Unread badge: green → purple
//   - Chat header: dark green → brand gradient
//   - Input border: none/grey → light purple border
//   - "WhatsApp Inbox" → "Messaging Hub" (route comment only; actual h1 below)
//   - "Powered by WhatsApp Business API" attribution in footer
//   - All functional logic identical

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
  useMemo,
} from 'react';
import { useSelector }   from 'react-redux';
import { useNavigate }   from 'react-router-dom';
import { supabase }      from '@/integrations/supabase/client';
import { toast }         from 'sonner';
import WaTemplateVarsModal, { templateHasVars } from '@/components/jobs/job/invite/WaTemplateVarsModal';
import {
  useWhatsAppConversations,
  fetchConversationMessages,
  markConversationRead,
  WaConversation,
  WaMessage,
} from '@/hooks/useWhatsAppConversations';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const B = {
  primary:      '#7C3AED',
  primaryDark:  '#6D28D9',
  primaryLight: '#EDE9FE',
  primaryBg:    '#F5F3FF',
  outBubble:    '#EDE9FE',
  inBubble:     '#fff',
  msgBg:        '#F5F3FF',
  header:       'linear-gradient(135deg,#6D28D9,#7C3AED)',
  selBorder:    '#7C3AED',
  selBg:        '#F5F3FF',
  badge:        '#7C3AED',
  openDot:      '#7C3AED',
  sendActive:   '#7C3AED',
  tray:         '#FAFAFE',
  trayBorder:   '#DDD6FE',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000)         return 'just now';
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const fmtDate = (d: string) => {
  const today = new Date();
  const yest  = new Date(today); yest.setDate(today.getDate() - 1);
  const dt    = new Date(d);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === yest.toDateString())  return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

function initials(name: string | null) {
  if (!name) return '?';
  const p = name.trim().split(' ').filter(Boolean);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : (p[0]?.[0] ?? '?').toUpperCase();
}

function get24hWindow(lastInbound: string | null) {
  if (!lastInbound) return { open: false, hoursLeft: 0, minutesLeft: 0 };
  const diff      = Date.now() - new Date(lastInbound).getTime();
  const totalLeft = Math.max(0, 24 * 3_600_000 - diff);
  return {
    open:        totalLeft > 0,
    hoursLeft:   Math.floor(totalLeft / 3_600_000),
    minutesLeft: Math.floor((totalLeft % 3_600_000) / 60_000),
  };
}

function previewContent(content: string | null): string {
  if (!content) return '';
  if (content.startsWith('[Image|'))    return '📷 Image';
  if (content.startsWith('[Document|')) return '📄 Document';
  if (content.startsWith('[Audio|'))    return '🎵 Audio';
  if (content.startsWith('[Video|'))    return '🎥 Video';
  if (content.startsWith('[Template:')) return `📋 ${content.slice(11, -1)}`;
  return content.length > 60 ? content.slice(0, 60) + '…' : content;
}

// ── Content parser ─────────────────────────────────────────────────────────────

type ParsedContent =
  | { kind: 'text';        text: string }
  | { kind: 'image';       url: string }
  | { kind: 'document';    filename: string; url: string | null }
  | { kind: 'audio';       url: string }
  | { kind: 'video';       url: string }
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
    return parts.length >= 2
      ? { kind: 'document', filename: parts[0], url: parts[1] }
      : { kind: 'document', filename: parts[0] || 'Document', url: null };
  }
  if (raw.startsWith('[Audio|')) {
    const url = raw.slice(7, -1);
    return url ? { kind: 'audio', url } : { kind: 'placeholder', label: '🎵 Audio' };
  }
  if (raw.startsWith('[Video|')) {
    const url = raw.slice(7, -1);
    return url ? { kind: 'video', url } : { kind: 'placeholder', label: '🎥 Video' };
  }
  if (raw.startsWith('[')) return { kind: 'placeholder', label: raw.slice(1, -1) };
  return { kind: 'text', text: raw };
}

// ── MediaBubble ───────────────────────────────────────────────────────────────

function MediaBubble({ content, isOut }: { content: ParsedContent; isOut: boolean }) {
  switch (content.kind) {
    case 'image':
      return (
        <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          <img src={content.url} alt="Image"
            style={{ maxWidth: 240, maxHeight: 200, borderRadius: 10, display: 'block',
              cursor: 'zoom-in', border: '1px solid rgba(0,0,0,0.08)', objectFit: 'cover' }} />
        </a>
      );
    case 'document':
      return (
        <div style={{
          background: isOut ? B.outBubble : '#fff',
          border: '1px solid rgba(109,40,217,0.12)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, maxWidth: 260,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {content.filename.endsWith('.pdf') ? '📄'
              : content.filename.endsWith('.doc') || content.filename.endsWith('.docx') ? '📝'
              : content.filename.endsWith('.xls') || content.filename.endsWith('.xlsx') ? '📊'
              : '📎'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {content.filename}
            </div>
            {content.url
              ? <a href={content.url} target="_blank" rel="noopener noreferrer" download={content.filename}
                  style={{ fontSize: 11, color: B.primary, fontWeight: 600, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                  ↓ Download
                </a>
              : <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Unavailable</div>
            }
          </div>
        </div>
      );
    case 'audio':
      return <audio controls src={content.url} style={{ maxWidth: 240, borderRadius: 8, height: 36 }} />;
    case 'video':
      return <video controls src={content.url} style={{ maxWidth: 260, maxHeight: 180, borderRadius: 10 }} />;
    case 'placeholder':
      return <div style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', padding: '4px 0' }}>{content.label}</div>;
    default: return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spin({ size = 18, color = B.primary }: { size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'wai-spin 0.7s linear infinite',
    }} />
  );
}

function Tick({ status }: { status: string }) {
  if (status === 'read')      return <span style={{ color: '#3B82F6', fontSize: 10 }}>✓✓</span>;
  if (status === 'delivered') return <span style={{ color: '#9CA3AF', fontSize: 10 }}>✓✓</span>;
  if (status === 'sent')      return <span style={{ color: '#9CA3AF', fontSize: 10 }}>✓</span>;
  if (status === 'failed')    return <span style={{ color: '#EF4444', fontSize: 10 }}>✗</span>;
  return null;
}

// Generic chat icon for page header
function IcoChatPage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}

// ── Conversation List Item ────────────────────────────────────────────────────

function ConvItem({ conv, isSelected, onClick }: {
  conv: WaConversation; isSelected: boolean; onClick: () => void;
}) {
  const win = get24hWindow(conv.last_inbound_at);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px', cursor: 'pointer',
        background: isSelected ? B.selBg : 'transparent',
        borderLeft: `3px solid ${isSelected ? B.selBorder : 'transparent'}`,
        borderBottom: '1px solid #F3F4F6',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#FAFAFE'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: isSelected ? B.primary : '#EDE9FE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700,
          color: isSelected ? '#fff' : B.primaryDark,
        }}>
          {initials(conv.candidate_name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                {conv.candidate_name || conv.phone_number}
              </span>
              {win.open && (
                <span style={{ width: 6, height: 6, borderRadius: '50%',
                  background: B.openDot, flexShrink: 0 }} />
              )}
            </div>
            <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0, marginLeft: 4 }}>
              {fmtRelative(conv.last_message_at)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 12,
              color:      conv.unread_count > 0 ? '#111827' : '#9CA3AF',
              fontWeight: conv.unread_count > 0 ? 500 : 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>
              {conv.last_message_direction === 'outbound' && (
                <span style={{ color: '#9CA3AF' }}>You: </span>
              )}
              {previewContent(conv.last_message_content)}
            </span>
            {conv.unread_count > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 99, padding: '0 4px',
                background: B.badge, color: '#fff',
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>

          <div style={{ fontSize: 10, color: '#D1D5DB', marginTop: 2 }}>
            +{conv.phone_number}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  conv:           WaConversation;
  organizationId: string;
  userId:         string;
  onRead:         (phone: string) => void;
}

function ChatPanel({ conv, organizationId, userId, onRead }: ChatPanelProps) {
  const navigate = useNavigate();
  const [messages,    setMessages]    = useState<WaMessage[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSending,   setIsSending]   = useState(false);
  const [inputText,   setInputText]   = useState('');
  const [templates,   setTemplates]   = useState<any[]>([]);
  const [trayOpen,    setTrayOpen]    = useState(false);
  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [pendingTpl,  setPendingTpl]  = useState<any>(null);

  const endRef     = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);

  const win       = get24hWindow(conv.last_inbound_at);
  const convState = messages.length === 0 ? 'none' : win.open ? 'active' : 'closed';
  const canType   = convState === 'active';

  useEffect(() => {
    supabase
      .from('hr_organizations')
      .select('whatsapp_config')
      .eq('id', organizationId)
      .single()
      .then(({ data }) => {
        if (data?.whatsapp_config) setTemplates(data.whatsapp_config.templates ?? []);
      });
  }, [organizationId]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const msgs = await fetchConversationMessages(organizationId, conv.phone_number);
      setMessages(msgs);

      const employeeIds = [...new Set(msgs.map(m => m.sent_by).filter(Boolean))] as string[];
      if (employeeIds.length > 0) {
        const { data: emps } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .in('id', employeeIds);
        if (emps) {
          const map: Record<string, string> = {};
          emps.forEach(e => { map[e.id] = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(); });
          setEmployeeMap(map);
        }
      }

      await markConversationRead(organizationId, conv.phone_number);
      onRead(conv.phone_number);
    } catch (err: any) {
      console.error('[ChatPanel] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, conv.phone_number, onRead]);

  useEffect(() => {
    loadMessages();

    channelRef.current = supabase
      .channel(`wai_chat_${organizationId}_${conv.phone_number}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, payload => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as any;
        if (row.phone_number    !== conv.phone_number) return;
        if (row.organization_id !== organizationId)    return;

        if (payload.eventType === 'INSERT') {
          const m = payload.new as WaMessage;
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          if (m.direction === 'inbound') {
            markConversationRead(organizationId, conv.phone_number);
            onRead(conv.phone_number);
          }
          if (m.sent_by && !employeeMap[m.sent_by]) {
            supabase
              .from('hr_employees')
              .select('id, first_name, last_name')
              .eq('id', m.sent_by)
              .single()
              .then(({ data: e }) => {
                if (e) setEmployeeMap(prev => ({
                  ...prev,
                  [e.id]: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
                }));
              });
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev =>
            prev.map(x => x.id === payload.new.id ? { ...x, ...payload.new } as WaMessage : x)
          );
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [organizationId, conv.phone_number, loadMessages]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
  }, [messages.length, isLoading]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 100)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (convState === 'closed') setTrayOpen(true);
    if (convState === 'active') setTrayOpen(false);
  }, [convState]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || !canType) return;
    setIsSending(true);
    setInputText('');
    try {
      const { data, error } = await supabase.functions.invoke('wa-send', {
        body: {
          organizationId, candidateId: conv.candidate_id,
          phone: conv.phone_number, messageType: 'text', content: text, sentBy: userId,
        },
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

  const handleSendTemplate = (tpl: any) => {
    if (isSending) return;
    if (templateHasVars(tpl)) { setPendingTpl(tpl); } else { doSendTemplate(tpl, []); }
  };

  const doSendTemplate = async (tpl: any, bodyVars: string[]) => {
    setIsSending(true);
    setPendingTpl(null);
    setTrayOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke('wa-send', {
        body: {
          organizationId, candidateId: conv.candidate_id,
          phone: conv.phone_number, messageType: 'template',
          templateName: tpl.name, templateLanguage: tpl.language,
          sentBy: userId,
          ...(bodyVars.length > 0 ? { bodyVars } : {}),
        },
      });
      if (error)       throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`"${tpl.display_name}" sent`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to send template');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Chat header — brand gradient (no dark green) */}
      <div style={{
        background: B.header, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
        }}>
          {initials(conv.candidate_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.candidate_name || `+${conv.phone_number}`}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>
            +{conv.phone_number}
            {conv.candidate_email && ` · ${conv.candidate_email}`}
          </div>
        </div>
        {conv.candidate_id && (
          <button
            onClick={() => navigate(`/candidates/${conv.candidate_id}`)}
            style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            View Profile →
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: win.open ? '#A78BFA' : '#FCD34D',
          }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
            {win.open ? `${win.hoursLeft}h ${win.minutesLeft}m` : 'Closed'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 20px',
        background: B.msgBg, display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 40 }}>
            <Spin />
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading conversation…</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 13 }}>
            No messages yet. Send a template to start.
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOut      = msg.direction === 'outbound';
              const newDay     = i === 0 || !isSameDay(messages[i - 1].sent_at, msg.sent_at);
              const senderName = msg.sent_by ? (employeeMap[msg.sent_by] || null) : null;
              const parsed     = parseContent(msg.content);
              const isMedia    = parsed.kind !== 'text' && parsed.kind !== 'placeholder';

              return (
                <Fragment key={msg.id}>
                  {newDay && (
                    <div style={{
                      alignSelf: 'center', fontSize: 11, color: '#6B7280',
                      background: 'rgba(255,255,255,0.9)', padding: '3px 12px',
                      borderRadius: 99, margin: '6px 0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}>
                      {fmtDate(msg.sent_at)}
                    </div>
                  )}

                  <div style={{
                    alignSelf:     isOut ? 'flex-end' : 'flex-start',
                    maxWidth:      '75%',
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    isOut ? 'flex-end' : 'flex-start',
                  }}>
                    {isOut && senderName && (
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2, paddingRight: 4 }}>
                        {senderName}
                      </div>
                    )}
                    {msg.message_type === 'template' && msg.template_name && (
                      <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2,
                        fontStyle: 'italic', paddingRight: isOut ? 4 : 0 }}>
                        Template · {msg.template_name}
                      </div>
                    )}

                    {isMedia ? (
                      <div style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <MediaBubble content={parsed} isOut={isOut} />
                      </div>
                    ) : (
                      <div style={{
                        padding:      '8px 12px',
                        borderRadius: isOut ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                        background:   isOut ? B.outBubble : B.inBubble,
                        boxShadow:    isOut
                          ? '0 1px 3px rgba(109,40,217,0.1)'
                          : '0 1px 2px rgba(0,0,0,0.07)',
                        border: isOut ? '1px solid #DDD6FE' : '1px solid #F3F4F6',
                        fontSize: 13, color: '#111827', lineHeight: 1.6,
                        wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      }}>
                        {parsed.kind === 'text' ? parsed.text
                          : parsed.kind === 'placeholder' ? parsed.label : ''}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtTime(msg.sent_at)}</span>
                      {isOut && <Tick status={msg.status} />}
                    </div>
                  </div>
                </Fragment>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      {/* Template tray */}
      {templates.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${convState === 'closed' ? '#FDE68A' : B.trayBorder}` }}>
          <button
            onClick={() => setTrayOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', border: 'none', cursor: 'pointer',
              background: convState === 'closed' ? '#FFFBEB' : B.tray,
              color: convState === 'closed' ? '#92400E' : '#6B7280',
              fontSize: 11, fontWeight: 700,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>
              {convState === 'closed' ? 'Send template to reopen conversation' : 'Message Templates'}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {trayOpen
                ? <polyline points="18 15 12 9 6 15"/>
                : <polyline points="6 9 12 15 18 9"/>}
            </svg>
          </button>
          {trayOpen && (
            <div style={{
              padding: '8px 16px 10px',
              background: convState === 'closed' ? '#FFFBEB' : B.tray,
              maxHeight: 180, overflowY: 'auto',
              borderTop: `1px solid ${convState === 'closed' ? '#FDE68A' : B.trayBorder}`,
            }}>
              {templates.map(t => (
                <button
                  key={`${t.name}_${t.language}`}
                  onClick={() => handleSendTemplate(t)}
                  disabled={isSending}
                  style={{
                    width: '100%', marginBottom: 5, padding: '9px 12px', borderRadius: 10,
                    border: '1px solid #EDE9FE', background: '#fff',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    textAlign: 'left', fontSize: 12, color: '#374151', fontWeight: 600,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8, opacity: isSending ? 0.6 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.display_name}
                  </span>
                  <span style={{ fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>
                    {t.language} · {t.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #EDE9FE',
        background: '#FAFAFE', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={!canType || isSending}
          placeholder={
            convState === 'closed' ? 'Session closed · use template ↑'
            : convState === 'none' ? 'Send a template to start ↑'
            : isSending            ? 'Sending…'
            :                        'Type a message… (Enter to send)'
          }
          rows={1}
          style={{
            flex: 1, borderRadius: 22, border: '1px solid #DDD6FE', padding: '9px 14px',
            fontSize: 13, fontFamily: 'inherit', background: '#fff',
            resize: 'none', outline: 'none', color: '#111827',
            maxHeight: 100, lineHeight: 1.5,
            opacity: canType ? 1 : 0.45, cursor: canType ? 'text' : 'not-allowed',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || !canType || isSending}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: inputText.trim() && canType ? B.sendActive : '#CBD5E1',
            border: 'none',
            cursor: inputText.trim() && canType ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: inputText.trim() && canType ? '0 2px 8px rgba(109,40,217,0.3)' : 'none',
            transition: 'background 0.15s',
          }}
        >
          {isSending
            ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'wai-spin 0.7s linear infinite' }} />
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>}
        </button>
      </div>

      {/* Attribution */}
      {/* <div style={{
        padding: '3px 16px 4px', background: '#FAFAFE',
        borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 9, color: '#C4B5FD' }}>Powered by WhatsApp Business API</span>
      </div> */}

      <WaTemplateVarsModal
        template={pendingTpl}
        onSend={(tpl, vars) => doSendTemplate(tpl, vars)}
        onClose={() => setPendingTpl(null)}
        isSending={isSending}
      />
    </div>
  );
}

// ── Main Inbox Page ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'open';

const WhatsAppInbox: React.FC = () => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const userId         = useSelector((s: any) => s.auth.user?.id ?? s.auth.userId);

  const { conversations: rawConversations, isLoading, error } = useWhatsAppConversations();

  const [readPhones, setReadPhones] = useState<Set<string>>(new Set());

  const conversations = useMemo(() =>
    rawConversations.map(c =>
      readPhones.has(c.phone_number) ? { ...c, unread_count: 0 } : c
    ),
    [rawConversations, readPhones]
  );

  const totalUnread = useMemo(() =>
    conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [conversations]
  );

  const handleConversationRead = useCallback((phone: string) => {
    setReadPhones(prev => {
      const next = new Set(prev);
      next.add(phone);
      return next;
    });
  }, []);

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [filter,        setFilter]        = useState<FilterTab>('all');
  const [search,        setSearch]        = useState('');

  useEffect(() => {
    setReadPhones(prev => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      let changed = false;
      prev.forEach(phone => {
        const conv = rawConversations.find(c => c.phone_number === phone);
        if (conv && conv.unread_count === 0) { next.delete(phone); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [rawConversations]);

  const selectedConv = conversations.find(c => c.phone_number === selectedPhone) ?? null;

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') list = list.filter(c => c.unread_count > 0);
    if (filter === 'open')   list = list.filter(c => c.session_window_open);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.candidate_name || '').toLowerCase().includes(q) ||
        c.phone_number.includes(q) ||
        (c.last_message_content || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, search]);

  return (
    <>
      <style>{`
        @keyframes wai-spin { to { transform: rotate(360deg); } }
        .wai-filter-btn { padding: 5px 14px; border-radius: 99px; border: 1px solid #E5E7EB; background: transparent; cursor: pointer; font-size: 12px; font-weight: 600; color: #6B7280; transition: all 0.15s; font-family: inherit; }
        .wai-filter-btn.active { background: ${B.primary}; color: #fff; border-color: ${B.primary}; }
        .wai-filter-btn:hover:not(.active) { background: ${B.primaryLight}; color: ${B.primary}; border-color: ${B.primary}; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9FAFB', fontFamily: 'inherit' }}>

        {/* Page header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #E5E7EB',
          background: '#fff', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: B.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcoChatPage />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              Candidate Conversations
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
              {conversations.length} conversations · {totalUnread} unread
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left panel */}
          <div style={{
            width: 340, flexShrink: 0, borderRight: '1px solid #E5E7EB',
            display: 'flex', flexDirection: 'column', background: '#fff',
          }}>
            {/* Search */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
              <input
                type="text"
                placeholder="Search conversations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  border: '1px solid #E5E7EB', fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', background: '#F9FAFB',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = B.primary)}
                onBlur={e  => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* Filter tabs */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 6 }}>
              {(['all', 'unread', 'open'] as FilterTab[]).map(f => (
                <button
                  key={f}
                  className={`wai-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'    ? `All (${conversations.length})` : ''}
                  {f === 'unread' ? `Unread (${totalUnread})` : ''}
                  {f === 'open'   ? `Open (${conversations.filter(c => c.session_window_open).length})` : ''}
                </button>
              ))}
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
              ) : error ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#EF4444' }}>{error}</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  {search ? 'No matching conversations' : 'No conversations yet'}
                </div>
              ) : (
                filtered.map(conv => (
                  <ConvItem
                    key={conv.phone_number}
                    conv={conv}
                    isSelected={selectedPhone === conv.phone_number}
                    onClick={() => setSelectedPhone(conv.phone_number)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedConv ? (
              <ChatPanel
                key={selectedConv.phone_number}
                conv={selectedConv}
                organizationId={organizationId}
                userId={userId}
                onRead={handleConversationRead}
              />
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: B.msgBg, gap: 16,
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: B.primaryLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={B.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Select a conversation
                  </div>
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                    Choose from the list to view messages
                  </div>
                  {/* <div style={{ fontSize: 10, color: '#C4B5FD', marginTop: 10 }}>
                    Powered by WhatsApp Business API
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WhatsAppInbox;