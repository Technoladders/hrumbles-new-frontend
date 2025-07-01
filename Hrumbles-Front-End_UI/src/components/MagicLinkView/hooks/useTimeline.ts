// hooks/useTimeline.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { TimelineEvent } from "@/components/MagicLinkView/types"; // Assuming TimelineEvent is in lib/types.ts

interface UseTimelineReturn {
  timeline: TimelineEvent[];
  timelineLoading: boolean;
  timelineError: string | null;
}

export const useTimeline = (
  candidateId: string | undefined,
  shareMode: boolean
): UseTimelineReturn => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!candidateId || shareMode) return;

      setTimelineLoading(true);
      setTimelineError(null);

      try {
        const { data, error } = await supabase
          .from("hr_candidate_timeline")
          .select(
            `
            *,
            hr_employees!fk_created_by (
              first_name,
              last_name
            )
          `
          )
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Failed to fetch timeline data: " + error.message);
        }

        if (data) {
          const formattedTimeline: TimelineEvent[] = data.map((event: any) => ({
            ...event,
            created_by_name: event.hr_employees
              ? `${event.hr_employees.first_name} ${event.hr_employees.last_name}`
              : "Unknown",
          }));
          setTimeline(formattedTimeline);
        } else {
          setTimeline([]);
        }
      } catch (err: any) {
        console.error("Error fetching timeline:", err);
        setTimelineError(err.message || "Failed to load timeline data.");
        toast({
          title: "Error",
          description: err.message || "Failed to load timeline data.",
          variant: "destructive",
        });
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchTimeline();
  }, [candidateId, shareMode, toast]);

  return { timeline, timelineLoading, timelineError };
};