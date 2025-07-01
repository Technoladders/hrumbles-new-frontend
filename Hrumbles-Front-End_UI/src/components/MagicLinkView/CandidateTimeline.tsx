// components/CandidateTimeline.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineEvent } from "@/components/MagicLinkView/types";

interface CandidateTimelineProps {
  timeline: TimelineEvent[];
  timelineLoading: boolean;
  timelineError: string | null;
}

const formatTimelineDate = (date: string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

const formatINR = (amount: number | string) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num)
    ? "N/A"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(num);
};

export const CandidateTimeline: React.FC<CandidateTimelineProps> = ({
  timeline,
  timelineLoading,
  timelineError,
}) => {
  if (timelineLoading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
        <p className="text-sm text-gray-600 mt-2">Loading timeline...</p>
      </div>
    );
  }

  if (timelineError) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600">{timelineError}</p>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">No timeline events available.</p>
      </div>
    );
  }

  return (
    <Card className="bg-white sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Candidate Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timeline.map((event, index) => (
            <div key={event.id} className="relative pl-8 pb-6">
              <div className="absolute left-0 top-0 h-full">
                <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                {index < timeline.length - 1 && (
                  <div className="absolute top-4 left-[7px] w-[2px] h-full bg-indigo-200"></div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {formatTimelineDate(event.created_at)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-bold">Main Status:</span>{" "}
                  {event.new_state.mainStatusName}
                </p>
                <p className="text-xs font-medium text-gray-900 mt-1">
                  {event.event_data.action}:{" "}
                  {event.previous_state?.subStatusName} →{" "}
                  {event.new_state?.subStatusName}
                </p>
                <p className="text-xs text-gray-600">
                  Created by: {event.created_by_name}
                </p>
                {event.event_data.round && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Round: {event.event_data.round}</p>
                    {event.event_data.interview_date && (
                      <p>
                        Interview Date: {event.event_data.interview_date} at{" "}
                        {event.event_data.interview_time}
                      </p>
                    )}
                    {event.event_data.interview_type && (
                      <p>Type: {event.event_data.interview_type}</p>
                    )}
                    {event.event_data.interviewer_name && (
                      <p>Interviewer: {event.event_data.interviewer_name}</p>
                    )}
                    {event.event_data.interview_location && (
                      <p>Location: {event.event_data.interview_location}</p>
                    )}
                    {event.event_data.interview_result && (
                      <p>
                        Result:{" "}
                        <span
                          className={cn(
                            event.event_data.interview_result === "selected"
                              ? "text-green-600"
                              : "text-red-600"
                          )}
                        >
                          {event.event_data.interview_result}
                        </span>
                      </p>
                    )}
                    {event.event_data.interview_feedback && (
                      <p>Feedback: {event.event_data.interview_feedback}</p>
                    )}
                  </div>
                )}
                {event.event_data.ctc && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>CTC: {formatINR(event.event_data.ctc)}</p>
                  </div>
                )}
                {event.event_data.joining_date && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Joining Date: {event.event_data.joining_date}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};