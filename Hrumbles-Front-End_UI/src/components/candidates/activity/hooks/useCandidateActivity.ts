import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'call' | 'email' | 'whatsapp' | 'linkedin' | 'note';

export interface CandidateActivity {
  id: string;
  candidate_id: string;
  organization_id: string;
  created_by: string | null;
  type: ActivityType;
  title: string | null;
  description: string | null;
  description_html: string | null;
  outcome: string | null;
  direction: string | null;
  duration_minutes: number | null;
  activity_date: string;
  metadata: Record<string, any>;
  created_at: string;
  creator?: {
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  } | null;
}

export interface LogActivityPayload {
  type: ActivityType;
  title: string;
  description?: string;
  description_html?: string;
  outcome?: string;
  direction?: string;
  duration_minutes?: number;
  activity_date?: string;
  metadata?: Record<string, any>;
}

export interface UpdateActivityPayload extends Partial<LogActivityPayload> {
  id: string;
}

// ─── Outcome / Direction options per type ─────────────────────────────────────

export const CALL_OUTCOMES = [
  'Reached', 'No Answer', 'Left Voicemail', 'Callback Requested',
  'Wrong Number', 'Busy', 'Call Dropped',
] as const;

export const EMAIL_OUTCOMES = [
  'Replied', 'No Reply', 'Bounced', 'Auto-Reply', 'Opened', 'Not Opened',
] as const;

export const WHATSAPP_OUTCOMES = [
  'Replied', 'Seen', 'Delivered', 'No Response', 'Blocked',
] as const;

export const LINKEDIN_ACTIVITY_TYPES = [
  'Connection Request', 'Message', 'InMail', 'Profile View',
  'Endorsed Skill', 'Comment on Post',
] as const;

export const LINKEDIN_OUTCOMES = [
  'Connected', 'Replied', 'Pending', 'Ignored', 'Not Connected', 'Accepted',
] as const;

export const NOTE_TAGS = [
  'Screening', 'Interview Feedback', 'General', 'Follow-up',
  'Offer Discussion', 'Rejection', 'On Hold',
] as const;

// ─── Activity type meta ───────────────────────────────────────────────────────

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  call:      { label: 'Call',      color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  email:     { label: 'Email',     color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    dot: 'bg-blue-500'    },
  whatsapp:  { label: 'WhatsApp',  color: 'text-green-700',   bg: 'bg-green-50',    border: 'border-green-200',   dot: 'bg-green-500'   },
  linkedin:  { label: 'LinkedIn',  color: 'text-sky-700',     bg: 'bg-sky-50',      border: 'border-sky-200',     dot: 'bg-sky-500'     },
  note:      { label: 'Note',      color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  dot: 'bg-violet-500'  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCandidateActivity = (candidateId: string) => {
  const queryClient = useQueryClient();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: activities = [], isLoading } = useQuery<CandidateActivity[]>({
    queryKey: ['candidate-activities', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_candidate_activities')
        .select(
          `*, creator:hr_employees!hr_candidate_activities_created_by_fkey (
            first_name, last_name, profile_picture_url
          )`
        )
        .eq('candidate_id', candidateId)
        .order('activity_date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CandidateActivity[];
    },
    enabled: !!candidateId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['candidate-activities', candidateId] });

  // ── Log (create) ───────────────────────────────────────────────────────────
  const logActivityMutation = useMutation({
    mutationFn: async (payload: LogActivityPayload) => {
      const { error } = await supabase.from('hr_candidate_activities').insert({
        candidate_id:    candidateId,
        organization_id: organizationId,
        created_by:      user?.id,
        type:            payload.type,
        title:           payload.title,
        description:     payload.description ?? '',
        description_html: payload.description_html ?? payload.description ?? '',
        outcome:         payload.outcome ?? null,
        direction:       payload.direction ?? null,
        duration_minutes: payload.duration_minutes ?? null,
        activity_date:   payload.activity_date ?? new Date().toISOString(),
        metadata:        payload.metadata ?? {},
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  // ── Update (edit) ──────────────────────────────────────────────────────────
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, ...payload }: UpdateActivityPayload) => {
      const updateData: Record<string, any> = {};
      if (payload.type             !== undefined) updateData.type             = payload.type;
      if (payload.title            !== undefined) updateData.title            = payload.title;
      if (payload.description      !== undefined) updateData.description      = payload.description;
      if (payload.description_html !== undefined) updateData.description_html = payload.description_html;
      if (payload.outcome          !== undefined) updateData.outcome          = payload.outcome;
      if (payload.direction        !== undefined) updateData.direction        = payload.direction;
      if (payload.duration_minutes !== undefined) updateData.duration_minutes = payload.duration_minutes;
      if (payload.activity_date    !== undefined) updateData.activity_date    = payload.activity_date;
      if (payload.metadata         !== undefined) updateData.metadata         = payload.metadata;

      const { error } = await supabase
        .from('hr_candidate_activities')
        .update(updateData)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('hr_candidate_activities')
        .delete()
        .eq('id', activityId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    activities,
    isLoading,
    logActivity:    logActivityMutation.mutateAsync,
    updateActivity: updateActivityMutation.mutateAsync,
    deleteActivity: deleteActivityMutation.mutateAsync,
    isLogging:      logActivityMutation.isPending,
    isUpdating:     updateActivityMutation.isPending,
    isDeleting:     deleteActivityMutation.isPending,
  };
};