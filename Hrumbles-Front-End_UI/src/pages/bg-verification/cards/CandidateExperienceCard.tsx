import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Candidate } from "@/lib/types";

// Interface for Component Props
interface CandidateExperienceCardProps {
  candidate: Candidate;
}

const CandidateExperienceCard: React.FC<CandidateExperienceCardProps> = ({ candidate }) => {
  // Convert numeric month to name
  const getMonthName = (month: number) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return months[month];
  };

  // Format date range (e.g., "Aug 2023 - Present")
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = endDate === "Present" ? "Present" : new Date(endDate);
    const startMonth = getMonthName(start.getMonth());
    const startYear = start.getFullYear();
    const endMonth = end === "Present" ? "Present" : getMonthName((end as Date).getMonth());
    const endYear = end === "Present" ? "" : (end as Date).getFullYear();
    return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  };

  return (
    <Card className="bg-white w-full h-full shadow-md border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Briefcase size={20} className="text-blue-500" />
          Experience
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[300px] pr-4"> {/* Scrollable area with fixed height */}
          {candidate.career_experience && candidate.career_experience.length > 0 ? (
            candidate.career_experience.map((exp, index) => (
              <div key={index} className="flex items-start space-x-2 mb-4 last:mb-0">
                <Briefcase className="w-6 h-6 text-blue-500 mt-1" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{exp.company}</div>
                  <div className="text-sm text-gray-700">{exp.designation}</div>
                  <div className="text-sm text-gray-500">
                    {formatDateRange(exp.start_date, exp.end_date)} • {candidate.location || "N/A"} • Full-Time
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center">No experience details available.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CandidateExperienceCard;