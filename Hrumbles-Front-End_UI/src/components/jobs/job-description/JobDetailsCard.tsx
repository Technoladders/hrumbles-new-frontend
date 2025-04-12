
import { Briefcase, Calendar, ChevronRight } from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { JobData } from "@/lib/types";

interface JobDetailsCardProps {
  job: JobData;
  onViewJD: () => void;
}

const JobDetailsCard = ({ job, onViewJD }: JobDetailsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
        <CardDescription>Overview of the job requirements and specifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Job ID</h4>
            <p>{job.jobId}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
            <p>{job.department}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Job Type</h4>
            <div className="flex items-center gap-1">
              <Briefcase size={14} className="text-gray-500" />
              <p>{job.type}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Hiring Mode</h4>
            <p>{job.hiringMode}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Locations</h4>
            <div className="flex flex-wrap gap-1">
              {job.location.map((loc, i) => (
                <Badge key={i} variant="outline">
                  {loc}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Submission Type</h4>
            <Badge
              variant="outline"
              className={job.submissionType === "Internal" 
                ? "bg-purple-100 text-purple-800" 
                : "bg-indigo-100 text-indigo-800"
              }
            >
              {job.submissionType}
            </Badge>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Posted Date</h4>
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-gray-500" />
              <p>{job.postedDate}</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Due Date</h4>
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-gray-500" />
              <p>{job.dueDate}</p>
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-500">Description</h4>
              <Button
                variant="ghost" 
                size="sm" 
                className="h-7 text-primary"
                onClick={onViewJD}
              >
                <span>View Full JD</span>
                <ChevronRight size={16} />
              </Button>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {job.description || "No description provided."}
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Skills Required</h4>
            <div className="flex flex-wrap gap-1">
              {job.skills && job.skills.length > 0 ? (
                job.skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="bg-blue-50">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">No skills specified</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Experience Required</h4>
            <p>
              {job.experience?.min 
                ? `${job.experience.min.years} years ${job.experience.min.months} months` 
                : "Not specified"}
              {job.experience?.max && ` to ${job.experience.max.years} years ${job.experience.max.months} months`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobDetailsCard;
