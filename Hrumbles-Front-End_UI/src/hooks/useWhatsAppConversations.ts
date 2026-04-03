// src/hooks/useWhatsAppConversations.ts
//
// Fetches all WhatsApp conversations for the current org from the
// whatsapp_conversation_summary view. Subscribes to realtime on
// whatsapp_messages (no column filter) to update the list live.
//
// Used by: WhatsAppInbox page

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WaConversation {
  phone_number:             string;
  organization_id:          string;
  candidate_id:             string | null;
  last_message_content:     string | null;
  last_message_direction:   'inbound' | 'outbound';
  last_message_type:        string;
  last_message_at:          string;
  last_sent_by:             string | null;
  candidate_name:           string | null;
  candidate_email:          string | null;
  candidate_phone_raw:      string | null;
  last_sent_by_first_name:  string | null;
  last_sent_by_last_name:   string | null;
  unread_count:             number;
  total_messages:           number;
  last_inbound_at:          string | null;
  session_window_open:      boolean;
}

export interface WaMessage {
  id:                string;
  direction:         'inbound' | 'outbound';
  message_type:      string;
  content:           string | null;
  template_name:     string | null;
  template_language: string | null;
  wa_message_id:     string | null;
  status:            'sent' | 'delivered' | 'read' | 'failed';
  sent_at:           string;
  sent_by:           string | null;
  recruiter_read_at: string | null;
  phone_number:      string;
  organization_id:   string;
  candidate_id:      string | null;
}

export interface UseWhatsAppConversationsReturn {
  conversations:    WaConversation[];
  isLoading:        boolean;
  error:            string | null;
  totalUnread:      number;
  refetch:          () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWhatsAppConversations(): UseWhatsAppConversationsReturn {
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchConversations = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('whatsapp_conversation_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setConversations((data as WaConversation[]) ?? []);
    }
    setIsLoading(false);
  }, [organizationId]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime — listen to all whatsapp_messages inserts/updates for this org
  // On any change, refetch the summary view (simplest approach — avoids
  // complex merge logic since the view does the heavy lifting)
  useEffect(() => {
    if (!organizationId) return;

channelRef.current = supabase
  .channel(`wa_inbox_${organizationId}_${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        payload => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as any;
          // Only care about our org
          if (row?.organization_id !== organizationId) return;

          if (payload.eventType === 'INSERT') {
            const msg = payload.new as WaMessage;

            // Optimistically update conversation list so it feels instant
            setConversations(prev => {
              const idx = prev.findIndex(c => c.phone_number === msg.phone_number);

              if (idx === -1) {
                // New conversation — prepend a minimal entry, full refetch follows
                const newConv: WaConversation = {
                  phone_number:            msg.phone_number,
                  organization_id:         msg.organization_id,
                  candidate_id:            msg.candidate_id,
                  last_message_content:    msg.content,
                  last_message_direction:  msg.direction,
                  last_message_type:       msg.message_type,
                  last_message_at:         msg.sent_at,
                  last_sent_by:            msg.sent_by,
                  candidate_name:          null,
                  candidate_email:         null,
                  candidate_phone_raw:     null,
                  last_sent_by_first_name: null,
                  last_sent_by_last_name:  null,
                  unread_count:            msg.direction === 'inbound' ? 1 : 0,
                  total_messages:          1,
                  last_inbound_at:         msg.direction === 'inbound' ? msg.sent_at : null,
                  session_window_open:     msg.direction === 'inbound',
                };
                return [newConv, ...prev];
              }

              // Existing conversation — update in place
              const updated = [...prev];
              const conv = { ...updated[idx] };
              conv.last_message_content   = msg.content;
              conv.last_message_direction = msg.direction;
              conv.last_message_type      = msg.message_type;
              conv.last_message_at        = msg.sent_at;
              conv.last_sent_by           = msg.sent_by;
              conv.total_messages         = (conv.total_messages ?? 0) + 1;
              if (msg.direction === 'inbound') {
                conv.unread_count     = (conv.unread_count ?? 0) + 1;
                conv.last_inbound_at  = msg.sent_at;
                conv.session_window_open = true;
              }
              updated.splice(idx, 1);
              return [conv, ...updated];
            });
          } else if (payload.eventType === 'UPDATE') {
            // Status update (sent→delivered→read) — refetch to keep view accurate
            fetchConversations();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, fetchConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  return {
    conversations,
    isLoading,
    error,
    totalUnread,
    refetch: fetchConversations,
  };
}

// ── Fetch messages for a single conversation ──────────────────────────────────

export async function fetchConversationMessages(
  organizationId: string,
  phoneNumber:    string,
): Promise<WaMessage[]> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('phone_number', phoneNumber)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return (data as WaMessage[]) ?? [];
}

// ── Mark conversation as read ─────────────────────────────────────────────────

export async function markConversationRead(
  organizationId: string,
  phoneNumber:    string,
): Promise<void> {
  await supabase.rpc('mark_whatsapp_conversation_read', {
    p_phone_number:    phoneNumber,
    p_organization_id: organizationId,
  });
}