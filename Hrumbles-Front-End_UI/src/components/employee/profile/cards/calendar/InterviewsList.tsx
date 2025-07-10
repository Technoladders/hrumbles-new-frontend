import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Interview {
  name: string;
  interview_date: string;
  interview_time: string;
  interview_location: string;
  interview_type: string;
  round: string;
  employee_name?: string;
}

interface InterviewsListProps {
  employeeId: string;
  selectedDate: Date;
  role?: string;
  organizationId: string;
}

export const InterviewsList: React.FC<InterviewsListProps> = ({ employeeId, selectedDate, role, organizationId }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        let fullName = '';
        if (role !== 'organization_superadmin') {
          const { data: employeeData, error: employeeError } = await supabase
            .from("hr_employees")
            .select("first_name, last_name")
            .eq("id", employeeId)
            .single();

          if (employeeError) throw employeeError;

          if (employeeData) {
            fullName = `${employeeData.first_name} ${employeeData.last_name}`;
          }
        }

        const query = supabase
          .from("hr_job_candidates")
          .select("id, job_id, name, interview_date, interview_time, interview_location, interview_type, round, applied_from")
          .eq("organization_id", organizationId);

        if (role !== 'organization_superadmin') {
          query.eq("applied_from", fullName);
        }

        const { data: candidatesData, error: candidatesError } = await query
          .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
          .not("interview_date", 'is', null);

        if (candidatesError) throw candidatesError;

        const currentDate = new Date();
        const upcomingInterviews = candidatesData
          .filter((candidate) => {
            if (!candidate.interview_date) return false;
            const interviewDateTime = new Date(
              `${candidate.interview_date}T${candidate.interview_time || "00:00:00"}+05:30`
            );
            return interviewDateTime >= currentDate;
          })
          .map((candidate) => ({
            name: candidate.name,
            candidate_id: candidate.id,
            job_id: candidate.job_id,
            interview_date: candidate.interview_date,
            interview_time: candidate.interview_time,
            interview_location: candidate.interview_location,
            interview_type: candidate.interview_type,
            round: candidate.round,
            employee_name: candidate.applied_from,
          }))
          // Sort by interview_date (ascending) and interview_time (ascending) for same dates
          .sort((a, b) => {
            const dateA = new Date(`${a.interview_date}T${a.interview_time || "00:00:00"}+05:30`);
            const dateB = new Date(`${b.interview_date}T${b.interview_time || "00:00:00"}+05:30`);
            return dateA.getTime() - dateB.getTime();
          });

        setInterviews(upcomingInterviews);
      } catch (error) {
        console.error("Error fetching interviews:", error);
        toast.error("Failed to load interviews");
      }
    };

    fetchInterviews();
  }, [employeeId, role]);

  console.log("intervies", interviews)

  const formatInterviewDate = (date: string) => {
    const interviewDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return interviewDate.toLocaleDateString("en-US", options);
  };

  const formatInterviewTime = (time: string) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div className="relative h-[300px]">
      <ScrollArea className="h-full pr-4 -mr-4">
        <div className="space-y-2">
          {interviews.length > 0 ? (
            interviews.map((interview, index) => {
              const interviewDate = new Date(interview.interview_date);
              const isSelected = isSameDay(interviewDate, selectedDate);

              return (
                <Link
                  to={`/employee/${interview.candidate_id}/${interview.job_id}`}>
                <div
                  key={index}
                  className={cn(
                    "w-full border-purple-500 bg-purple-50 p-1.5 rounded-lg transition-all duration-200 cursor-pointer",
                    
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {interview.name}
                      {role === 'organization_superadmin' && interview.employee_name && (
                        <span className="text-xs text-gray-500"> ({interview.employee_name})</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatInterviewDate(interview.interview_date)} at{" "}
                      {formatInterviewTime(interview.interview_time)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {interview.interview_location || "N/A"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#1A73E8]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] flex-shrink-0" />
                      <span className="truncate">
                        {interview.interview_type || "N/A"} - {interview.round || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                </Link>
              );
            })
          ) : (
            <p className="text-xs text-gray-500">No upcoming interviews.</p>
          )}
        </div>
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
};