// src/pages/jobs/ai/cards/AiRecentActivityCard.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AiRecentActivityCard = ({ candidateIds }: { candidateIds: string[] }) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['bgvTimelineEvents', candidateIds],
    queryFn: async () => {
      // --- KEY CHANGE: Query the new table ---
      const { data, error } = await supabase
        .from('bgv_candidate_timeline')
        .select(`
          event_description, 
          created_at, 
          candidate:hr_job_candidates(name),
          user:hr_employees!changed_by(first_name, last_name)
        `)
        .in('candidate_id', candidateIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: candidateIds.length > 0,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock size={18} /> Recent Activity</CardTitle></CardHeader>
      <CardContent>
        {isLoading && <p>Loading activities...</p>}
        {(!events || events.length === 0) && !isLoading && <p className="text-center text-gray-500 py-4">No recent activity.</p>}
        <div className="space-y-4">
          {events?.map((event, i) => (
            <div key={i} className="text-sm border-l-2 pl-3">
              <p className="font-medium">{event.candidate?.name || 'A candidate'}</p>
              <p className="text-gray-600">{event.event_description}</p>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                {event.user ? ` by ${event.user.first_name}` : ''}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};