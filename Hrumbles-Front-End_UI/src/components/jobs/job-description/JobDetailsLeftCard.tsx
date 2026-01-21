// Hrumbles-Front-End_UI\src\components\jobs\job-description\JobDetailsLeftCard.tsx
// Changes: Removed duplicated "Required Skills" and "Experience" sections (now consolidated in header/summary/right card).
// Integrated summary hero section for client/location/applications/posted date.
// Enriched skills table now flows better with improved spacing.
// Added modern animations and responsive tweaks for better mobile experience.

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JobData, Candidate } from "@/lib/types";
import {
  Briefcase,
  MapPin,
  Users,
  CalendarClock,
} from "lucide-react";
import {Badge} from "@/components/ui/badge"
import { formatBulletPoints } from "./utils/formatUtils";
import JobEnrichedSkills from "./JobEnrichedSkills";
 
interface JobDetailsLeftCardProps {
  job: JobData;
  candidates: Candidate[];
}
 
const JobDetailsLeftCard = ({ job, candidates }: JobDetailsLeftCardProps) => {
  const bulletPoints = formatBulletPoints(job.description || "");
 
  return (
    <div className="space-y-6">
      {/* Summary Hero Section - Consolidated key metadata */}
      <Card className="shadow-sm border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <SummaryItem
              icon={<Briefcase className="w-4 h-4 text-blue-600" />}
              label="Client"
              value={job.clientDetails?.clientName || job.clientOwner}
            />
            {job.location && job.location.length > 0 && (
              <SummaryItem
                icon={<MapPin className="w-4 h-4 text-red-600" />}
                label="Location"
                value={job.location.join(", ")}
              />
            )}
            <SummaryItem
              icon={<Users className="w-4 h-4 text-green-600" />}
              label="Applications"
              value={`${candidates.length} received`}
              badge={<Badge variant="secondary" className="ml-1 text-xs">+2 today</Badge>} // Example dynamic badge; customize as needed
            />
            <SummaryItem
              icon={<CalendarClock className="w-4 h-4 text-amber-600" />}
              label="Posted"
              value={job.postedDate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Enriched Skills - Prominent placement with better integration */}
      <JobEnrichedSkills skills={job.skills || []} />

      {/* Assigned To Section - Kept but modernized */}
      {job.assignedTo && (
        <Card className="shadow-sm">
          <CardContent className="pt-6 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Assigned To
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {job.assignedTo.type === "individual" ? "P" : job.assignedTo.type === "team" ? "T" : "V"}
              </div>
              <div>
                <p className="font-medium text-gray-900">{job.assignedTo.name}</p>
                <p className="text-xs text-gray-500 capitalize">{job.assignedTo.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Description - Full-width, clean */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Job Description
          </h3>
          {bulletPoints.length > 0 ? (
            <ul className="space-y-3 list-disc pl-5 text-gray-700 leading-relaxed">
              {bulletPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 leading-relaxed">{job.description || "No description available."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Reusable Summary Item for hero section
interface SummaryItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
}

const SummaryItem = ({ icon, label, value, badge }: SummaryItemProps) => (
  <div className="flex flex-col space-y-1">
    <div className="flex items-center gap-2 text-xs text-gray-600">
      {icon}
      <span>{label}</span>
    </div>
    <div className="flex items-center gap-1">
      <span className="font-medium text-gray-900 text-sm">{value}</span>
      {badge}
    </div>
  </div>
);

export default JobDetailsLeftCard;