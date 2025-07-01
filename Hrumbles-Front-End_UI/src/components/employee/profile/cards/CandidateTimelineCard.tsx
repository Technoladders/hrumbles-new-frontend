import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity } from "lucide-react";

interface CandidateTimelineCardProps {
  employeeId: string;
}

interface TimelineEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  previous_state: { mainStatusName: string; subStatusName?: string } | null;
  new_state: { mainStatusName: string; subStatusName?: string } | null;
  created_at: string;
  candidate_name: string;
  job_title: string | null;
}

export const CandidateTimelineCard: React.FC<CandidateTimelineCardProps> = ({ employeeId }) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidateTimeline = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch candidates where created_by matches employeeId, including job title
        const { data: candidates, error: candidatesError } = await supabase
          .from("hr_job_candidates")
          .select("id, name, job_id, hr_jobs:hr_jobs!hr_job_candidates_job_id_fkey(title)")
          .eq("created_by", employeeId);

        if (candidatesError) throw candidatesError;

        if (!candidates || candidates.length === 0) {
          setTimelineEvents([]);
          return;
        }

        // Extract candidate IDs
        const candidateIds = candidates.map((candidate) => candidate.id);

        // Step 2: Fetch timeline events for these candidates
        const { data: timelineData, error: timelineError } = await supabase
          .from("hr_candidate_timeline")
          .select("id, candidate_id, event_type, previous_state, new_state, created_at")
          .in("candidate_id", candidateIds)
          .order("created_at", { ascending: false });

        if (timelineError) throw timelineError;

        // Map timeline events with candidate names and job titles
        const eventsWithNames = timelineData.map((event) => {
          const candidate = candidates.find((c) => c.id === event.candidate_id);
          return {
            ...event,
            candidate_name: candidate?.name || "Unknown Candidate",
            job_title: candidate?.hr_jobs?.title || null,
          };
        });

        setTimelineEvents(eventsWithNames);
      } catch (error: any) {
        console.error("Error fetching candidate timeline:", error);
        toast.error(`Error loading candidate timeline: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchCandidateTimeline();
    }
  }, [employeeId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card className="shadow-md rounded-xl h-[300px] md:h-[325px] lg:h-[600px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Candidate Timeline</h3>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400 italic">Loading timeline...</div>
          ) : timelineEvents.length > 0 ? (
            <div className="space-y-6">
              {timelineEvents.map((event, index) => (
                <div key={event.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 dark:bg-purple-400 rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(event.created_at)}</span>
                      <div className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <Activity className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">
                      {event.candidate_name}: {" "}
                      {event.previous_state && event.new_state
                        ? `Status changed from ${
                            event.previous_state.subStatusName ? ` ${event.previous_state.subStatusName}` : ""
                          } to ${
                            event.new_state.subStatusName ? ` ${event.new_state.subStatusName}` : ""
                          }${event.job_title ? ` for ${event.job_title}` : ""}`
                        : event.job_title
                        ? `for ${event.job_title}`
                        : ""}
                    </p>
                    {index < timelineEvents.length - 1 && (
                      <div className="ml-1 mt-2 w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">No candidate timeline events available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};