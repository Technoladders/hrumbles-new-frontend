import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Briefcase, UserPlus, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
  id: string;
  event_type: string;
  new_state: { mainStatusName: string; subStatusName?: string, color?: string };
  created_at: string;
  candidate_name: string;
  job_title: string | null;
}

const fetchTimelineEvents = async (employeeId: string) => {
  if (!employeeId) return [];
  // Use an RPC function for efficiency if this query gets complex. For now, client-side join is ok.
  const { data: candidates, error: candidatesError } = await supabase
    .from("hr_job_candidates")
    .select("id, name, job_id, hr_jobs:hr_jobs!hr_job_candidates_job_id_fkey(title)")
    .eq("created_by", employeeId);

  if (candidatesError) throw candidatesError;
  if (!candidates || candidates.length === 0) return [];

  const candidateIds = candidates.map((c) => c.id);

  const { data: timelineData, error: timelineError } = await supabase
    .from("hr_candidate_timeline")
    .select("id, candidate_id, event_type, new_state, created_at")
    .in("candidate_id", candidateIds)
    .order("created_at", { ascending: false })
    .limit(10); // Limit to recent events for performance

  if (timelineError) throw timelineError;

  return timelineData.map((event) => {
    const candidate = candidates.find((c) => c.id === event.candidate_id);
    return { ...event, candidate_name: candidate?.name || "N/A", job_title: candidate?.hr_jobs?.title || null };
  });
};

const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Status Change': return <UserCheck className="h-4 w-4 text-white" />;
    case 'Candidate Added': return <UserPlus className="h-4 w-4 text-white" />;
    default: return <Activity className="h-4 w-4 text-white" />;
  }
};

export const CandidateTimelineCard: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['candidateTimeline', employeeId],
    queryFn: () => fetchTimelineEvents(employeeId),
    enabled: !!employeeId,
  });

  useEffect(() => {
    if (error) toast.error("Failed to load timeline.");
  }, [error]);

  return (
    <Card className="shadow-md rounded-xl h-[300px] md:h-[325px] lg:h-[350px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Activity className="h-5 w-5 text-purple-500 mr-2" />
          Candidate Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2">
        {isLoading && <p>Loading timeline...</p>}
        {!isLoading && events.length === 0 && <p className="text-gray-500">No recent candidate activity.</p>}
        
        <div className="relative pl-6">
          {/* The vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
          
          <ul className="space-y-6">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <div className="absolute -left-[29px] top-1 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <EventIcon type={event.event_type} />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {event.candidate_name}
                    {event.new_state?.subStatusName && (
                      <Badge variant="outline" className="ml-2" style={{ borderColor: event.new_state.color, color: event.new_state.color }}>
                        {event.new_state.subStatusName}
                      </Badge>
                    )}
                  </p>
                  {event.job_title && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="h-3 w-3" /> {event.job_title}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};