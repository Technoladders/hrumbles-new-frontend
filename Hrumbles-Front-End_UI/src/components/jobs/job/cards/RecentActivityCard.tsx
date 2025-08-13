
import { useEffect, useState } from "react";
import { Clock, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/jobs/ui/card";
import { Button } from "@/components/jobs/ui/button";
import { Candidate } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityCardProps {
  candidates: Candidate[];
  onAddCandidate: () => void;
}

interface TimelineEvent {
  id: string;
  candidate_id: string;
  created_at: string;
  created_by: string;
  event_type: string;
  previous_state: any;
  new_state: any;
  event_data: any;
  candidate?: {
    name: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
  };
}

const RecentActivityCard = ({ candidates, onAddCandidate }: RecentActivityCardProps) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  console.log("CandidateActivity", candidates)
  
  // Fetch latest timeline events
  useEffect(() => {
    const fetchTimelineEvents = async () => {
      if (candidates.length === 0) return;

      setLoading(true);
      try {
        // Get candidate IDs (ensure these are UUIDs)
        const candidateIds = candidates.map(c => c.id).filter(Boolean);
        console.log("Candidate IDs:", candidateIds);
        
        if (candidateIds.length === 0) {
          setTimelineEvents([]);
          return;
        }
        
        // Fetch timeline events for these candidates
        const { data, error } = await supabase
        .from('hr_candidate_timeline')
        .select(`
          *,
          candidate:hr_job_candidates(name),
          creator:hr_employees(first_name, last_name)
        `)
        .in('candidate_id', candidateIds)
        .order('created_at', { ascending: false })
        .limit(5);
      
        if (error) throw error;
        
        setTimelineEvents(data as TimelineEvent[]);
      } catch (error) {
        console.error('Error fetching timeline events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimelineEvents();
    
    // Set up real-time subscription for timeline events
    const candidateIds = candidates.map(c => c.id).filter(Boolean);
    if (candidateIds.length === 0) return;
    
    const channel = supabase
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'hr_candidate_timeline'
        },
        (payload) => {
          // When a new timeline event is created, update the UI
          setTimelineEvents(prev => {
            // Check if this event is already in our list
            if (prev.some(e => e.id === payload.new.id)) return prev;
            
            // Add the new event to the beginning and limit to 5
            return [payload.new as TimelineEvent, ...prev].slice(0, 5);
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidates]);
  
  // Get formatted time (e.g., "2 days ago")
  const getFormattedTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "recently";
    }
  };
  
  // Get event description
  const getEventDescription = (event: TimelineEvent) => {
    if (event.event_type === 'status_change') {
      const previousStatus = event.previous_state?.subStatusName || event.previous_state?.mainStatusName || 'None';
      const newStatus = event.new_state?.subStatusName || event.new_state?.mainStatusName || 'Unknown';
      
      return `Status changed from ${previousStatus} to ${newStatus}`;
    }
    
    return event.event_data?.action || 'Activity recorded';
  };

  return (
    <Card className="md:col-span-1">
    <CardHeader className="pb-2 pt-4">
      <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
        <Clock className="mr-2" size={18} />
        Recent Activity
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-2">
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : timelineEvents.length > 0 ? (
        // SCROLLABLE container
        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
          {timelineEvents.map((event) => (
            <div key={event.id} className="border-l-2 border-blue-400 pl-4 py-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-500">{getFormattedTime(event.created_at)}</span>
              </div>
              <h3 className="font-medium">{event.candidate?.name || 'Candidate'}</h3>
              <p className="text-sm text-gray-500">
                {getEventDescription(event)}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(event.created_at).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                By {event.creator ? `${event.creator.first_name} ${event.creator.last_name}` : 'System'}
              </p>
            </div>
          ))}
        </div>
      ) : candidates.length > 0 ? (
        <div className="text-center py-6 text-gray-500">
          No recent activity found
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40">
          <p className="text-gray-500 mb-4">No status changed yet</p>
          {/* <Button 
            size="sm" 
            id="add-candidate-btn"
            onClick={onAddCandidate}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Candidate
          </Button> */}
        </div>
      )}
    </CardContent>
  </Card>
  
  );
};

export default RecentActivityCard;
