// src/hooks/useInterviewReminders.ts
// Supabase Realtime subscription for interview reminders.
// Snooze persists in DB — survives page refresh.

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client'; // ✅ matches your actual import path
import { useSelector } from 'react-redux';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InterviewNotificationMeta {
  interview_id:       string;
  candidate_name:     string;
  candidate_id:       string | null;
  job_id:             string | null;
  job_title:          string;
  interview_time:     string;
  interview_date:     string;
  interview_type:     string | null;
  round:              string | null;
  interview_location: string | null;
  joining_link:       string | null;
  reminder_minutes:   number;
}

export interface InterviewReminder {
  id:            string;
  type:          string;
  title:         string;
  body:          string;
  meta:          InterviewNotificationMeta;
  created_at:    string;
  snoozed_until: string | null;
  is_read:       boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInterviewReminders() {
  const [reminders, setReminders] = useState<InterviewReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const snoozeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ✅ Matches your actual Redux store shape from App.jsx / MainLayout.jsx
  const user           = useSelector((s: any) => s.auth?.user);
  const organizationId = useSelector((s: any) => s.auth?.organization_id);

  // ── Fetch active (unread, non-snoozed, last 2h) reminders ────────────────
  const fetchReminders = useCallback(async () => {
    if (!user?.id) return;

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('hr_notifications')
      .select('*')
      .eq('recipient_user_id', user.id)
      .eq('is_read', false)
      .eq('type', 'interview_reminder')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('useInterviewReminders fetch:', error);
      setIsLoading(false);
      return;
    }

    const now = new Date();

    // Active = not snoozed OR snooze has expired
    const active = (data || []).filter((n: InterviewReminder) => {
      if (!n.snoozed_until) return true;
      return new Date(n.snoozed_until) <= now;
    });

    setReminders(active);
    setUnreadCount((data || []).length);
    setIsLoading(false);

    // Client-side timers to re-surface snoozed reminders
    (data || []).forEach((n: InterviewReminder) => {
      if (n.snoozed_until) {
        const msLeft = new Date(n.snoozed_until).getTime() - now.getTime();
        if (msLeft > 0 && msLeft < 30 * 60 * 1000 && !snoozeTimers.current.has(n.id)) {
          const timer = setTimeout(() => {
            setReminders(prev => {
              if (prev.find(r => r.id === n.id)) return prev;
              return [{ ...n, snoozed_until: null }, ...prev];
            });
            snoozeTimers.current.delete(n.id);
          }, msLeft);
          snoozeTimers.current.set(n.id, timer);
        }
      }
    });
  }, [user?.id]);

  // ── Supabase Realtime subscription ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    fetchReminders();

    const channel = supabase
      .channel(`interview_reminders_${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'hr_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as InterviewReminder;
          if (n.type === 'interview_reminder') {
            setReminders(prev => prev.find(r => r.id === n.id) ? prev : [n, ...prev]);
            setUnreadCount(c => c + 1);
          }
        }
      )
      .subscribe();

    // Poll every 30s as safety net
    const poll = setInterval(fetchReminders, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      snoozeTimers.current.forEach(t => clearTimeout(t));
    };
  }, [user?.id, fetchReminders]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const dismiss = useCallback(async (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    setUnreadCount(c => Math.max(0, c - 1));
    await supabase.from('hr_notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const snooze = useCallback(async (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    setReminders(prev => prev.filter(r => r.id !== id));

    await supabase.from('hr_notifications').update({ snoozed_until: until }).eq('id', id);

    // Client-side timer as backup
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('hr_notifications')
        .select('*')
        .eq('id', id)
        .eq('is_read', false)
        .maybeSingle();
      if (data) {
        setReminders(prev => prev.find(r => r.id === id) ? prev : [{ ...data, snoozed_until: null }, ...prev]);
      }
      snoozeTimers.current.delete(id);
    }, minutes * 60 * 1000);

    snoozeTimers.current.set(id, timer);
  }, []);

  const dismissAll = useCallback(async () => {
    const ids = reminders.map(r => r.id);
    setReminders([]);
    setUnreadCount(0);
    if (ids.length > 0) {
      await supabase.from('hr_notifications').update({ is_read: true }).in('id', ids);
    }
  }, [reminders]);

  return { reminders, isLoading, dismiss, snooze, dismissAll, unreadCount, refetch: fetchReminders };
}