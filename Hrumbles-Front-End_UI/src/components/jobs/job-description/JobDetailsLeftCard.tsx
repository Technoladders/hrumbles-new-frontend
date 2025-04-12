import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JobData, Candidate } from "@/lib/types";
import {
  Briefcase,
  MapPin,
  Users,
  CalendarClock,
} from "lucide-react";
import { formatBulletPoints } from "./utils/formatUtils";
 
interface JobDetailsLeftCardProps {
  job: JobData;
  candidates: Candidate[];
}
 
const JobDetailsLeftCard = ({ job, candidates }: JobDetailsLeftCardProps) => {
  const bulletPoints = formatBulletPoints(job.description || "");
 
  return (
    <Card className="h-full shadow-md">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Title and key tags */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs px-2 bg-blue-50 border-blue-200">
                  ID: {job.jobId}
                </Badge>
                <Badge variant="outline" className="text-xs px-2 bg-purple-50 border-purple-200">
                  {job.type}
                </Badge>
                <Badge variant="outline" className="text-xs px-2 bg-amber-50 border-amber-200">
                  {job.hiringMode}
                </Badge>
              </div>
            </div>
           
            {/* Client and Location */}
            <div className="flex flex-col  gap-2 text-gray-600 mt-2 text:sm font-normal">
            <div className="flex flex-row justify-between items-center gap-4 whitespace-nowrap overflow-x-auto">
              <div className="flex items-center gap-1 flex-shrink-0">
                <Briefcase size={16} />
                <span>{job.clientDetails?.clientName || job.clientOwner}</span>
              </div>
              {/* {job.location && job.location.length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <MapPin size={16} />
                  <span>{job.location.join(", ")}</span>
                </div>
              )} */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Users size={16} />
                <span>{candidates.length} Applications</span>
              </div>
              </div>
              <div className="flex flex-row justify-between items-center gap-4 whitespace-nowrap overflow-x-auto">
              {/* <div className="flex items-center gap-1 flex-shrink-0">
                <Users size={16} />
                <span>{candidates.length} Applications</span>
              </div> */}
              {job.location && job.location.length > 0 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <MapPin size={16} />
                  <span>{job.location.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                <CalendarClock size={16} />
                <span>Posted on {job.postedDate}</span>
              </div>
            </div>
            </div>
          </div>
         
          <Separator />
         
          {/* Assigned To Section */}
          {job.assignedTo && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Assigned To</h2>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
                  {job.assignedTo.type === "individual" ? "P" : job.assignedTo.type === "team" ? "T" : "V"}
                </div>
                <div>
                  <p className="font-medium">{job.assignedTo.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {job.assignedTo.type}
                  </p>
                </div>
              </div>
            </div>
          )}
         
          {/* Skills Section */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills && job.skills.length > 0 ? (
                job.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="bg-gray-100">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">No skills specified</p>
              )}
            </div>
          </div>
         
          {/* Experience Section */}
          {job.experience && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Experience Required</h2>
              <p>
                {job.experience.min
                  ? `${job.experience.min.years} years ${job.experience.min.months} months`
                  : "Not specified"}
                {job.experience.max && ` to ${job.experience.max.years} years ${job.experience.max.months} months`}
              </p>
            </div>
          )}
         
          <Separator />
         
          {/* Job Description Section */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-3">Job Description</h2>
            {bulletPoints.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="text-gray-700">{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">{job.description || "No description available."}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
 
export default JobDetailsLeftCard;