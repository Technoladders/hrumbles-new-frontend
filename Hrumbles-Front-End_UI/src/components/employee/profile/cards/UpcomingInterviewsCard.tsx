import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Interview {
  name: string;
  interview_date: string;
  interview_time: string;
  interview_location: string;
  interview_type: string;
  round: string;
}

interface UpcomingInterviewsCardProps {
  employeeId: string;
}

export const UpcomingInterviewsCard: React.FC<UpcomingInterviewsCardProps> = ({ employeeId }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [employeeName, setEmployeeName] = useState<string>("");

  useEffect(() => {
    const fetchEmployeeAndInterviews = async () => {
      try {
        // Fetch employee data to get first_name and last_name
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("first_name, last_name")
          .eq("id", employeeId)
          .single();

        if (employeeError) throw employeeError;

        if (employeeData) {
          const fullName = `${employeeData.first_name} ${employeeData.last_name}`;
          setEmployeeName(fullName);
          console.log("employeesname", fullName)

          // Fetch candidates with main_status_id for interviews
          const { data: candidatesData, error: candidatesError } = await supabase
            .from("hr_job_candidates")
            .select(
              "name, interview_date, interview_time, interview_location, interview_type, round, applied_from"
            )
            .eq("main_status_id", "f72e13f8-7825-4793-85e0-e31d669f8097")
            .eq("applied_from", fullName);

          if (candidatesError) throw candidatesError;

          console.log("candidatesData", candidatesData)

          // Filter for upcoming interviews (on or after May 20, 2025)
          const currentDate = new Date();
          const upcomingInterviews = candidatesData
            .filter((candidate) => {
              if (!candidate.interview_date) return false;
              const interviewDate = new Date(candidate.interview_date);
              return interviewDate >= currentDate;
            })
            .map((candidate) => ({
              name: candidate.name,
              interview_date: candidate.interview_date,
              interview_time: candidate.interview_time,
              interview_location: candidate.interview_location,
              interview_type: candidate.interview_type,
              round: candidate.round,
            }));

          setInterviews(upcomingInterviews);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load interviews data");
      }
    };

    fetchEmployeeAndInterviews();
  }, [employeeId]);

  // Format interview date as "MMM D"
  const formatInterviewDate = (date: string) => {
    const interviewDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return interviewDate.toLocaleDateString("en-US", options);
  };

  // Format interview time as "h:mm A"
  const formatInterviewTime = (time: string) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-gray-100 to-gray-100 border-none rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Upcoming Interviews</h2>
      <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
        {interviews.length > 0 ? (
          interviews.map((interview, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">{interview.name}</span>
                <span className="text-xs text-gray-500">
                  {formatInterviewDate(interview.interview_date)} at{" "}
                  {formatInterviewTime(interview.interview_time)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{interview.interview_location || "N/A"}</span>
                <span className="text-xs text-gray-500">
                  {interview.interview_type || "N/A"} - {interview.round || "N/A"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-600">No upcoming interviews.</p>
        )}
      </div>
    </Card>
  );
};