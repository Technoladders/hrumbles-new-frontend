
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  DollarSign, 
  Eye,
  FileText, 
  MapPin, 
  Share, 
  UserPlus, 
  Users 
} from "lucide-react";
import { Button } from "@/components/jobs/ui/button";
import { Card } from "@/components/jobs/ui/card";
import { Badge } from "@/components/jobs/ui/badge";
import { JobData } from "@/lib/types";
import { Separator } from "@/components/jobs/ui/separator";
import AddCandidateModal from "./AddCandidateModal";
import ViewJDModal from "./ViewJDModal";

interface JobOverviewProps {
  job: JobData;
  candidatesCount: number;
  onCandidateAdded: () => void;
}

const JobOverview = ({ job, candidatesCount, onCandidateAdded }: JobOverviewProps) => {
  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  return (
    <div className="animate-scale-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <Button variant="ghost" className="h-8 w-8 p-0">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <Badge
            variant="outline"
            className={`
              ${job.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
              ${job.status === "Pending" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}
              ${job.status === "Completed" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}
            `}
          >
            {job.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setIsJDModalOpen(true)}
          >
            <Eye size={16} />
            <span>View Job Description</span>
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => setIsCandidateModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* Job Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Job Details */}
        <Card className="p-5">
          <h3 className="font-semibold text-lg mb-4">Job Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Job ID</p>
              <p className="font-medium">{job.jobId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Department</p>
              <p className="font-medium">{job.department}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Job Type</p>
              <div className="flex items-center gap-1">
                <Briefcase size={14} className="text-gray-500" />
                <p className="font-medium">{job.type}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Locations</p>
              <div className="flex items-center gap-1">
                <MapPin size={14} className="text-gray-500" />
                <p className="font-medium">
                  {job.location.length > 1
                    ? `${job.location[0]} +${job.location.length - 1} more`
                    : job.location[0] || "Remote"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Posted Date</p>
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-gray-500" />
                <p className="font-medium">{job.postedDate}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Due Date</p>
              <div className="flex items-center gap-1">
                <Calendar size={14} className="text-gray-500" />
                <p className="font-medium">{job.dueDate}</p>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Skills Required</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {job.skills && job.skills.length > 0 ? (
                  job.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No skills specified</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Experience Required</p>
              <p className="font-medium">
                {job.experience?.min 
                  ? `${job.experience.min.years} years ${job.experience.min.months} months` 
                  : "Not specified"}
                {job.experience?.max && ` to ${job.experience.max.years} years ${job.experience.max.months} months`}
              </p>
            </div>
          </div>
        </Card>

        {/* Client & Application Details */}
        <Card className="p-5">
          <h3 className="font-semibold text-lg mb-4">Client & Application Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Client</p>
              <p className="font-medium">{job.clientOwner || "Internal"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Submission Type</p>
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
              <p className="text-sm text-gray-500 mb-1">Hiring Mode</p>
              <p className="font-medium">{job.hiringMode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Applications</p>
              <div className="flex items-center gap-1">
                <Users size={14} className="text-gray-500" />
                <p className="font-medium">{candidatesCount} candidates</p>
              </div>
            </div>
            
            {job.clientDetails && (
              <>
                {job.clientDetails.clientName && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Client Name</p>
                    <p className="font-medium">{job.clientDetails.clientName}</p>
                  </div>
                )}
                {job.clientDetails.clientBudget && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Budget</p>
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} className="text-gray-500" />
                      <p className="font-medium">{job.clientDetails.clientBudget}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <Separator className="my-4" />
          
          {/* Short description preview */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-500">Description</p>
              <Button
                variant="ghost" 
                size="sm" 
                className="h-7 text-primary"
                onClick={() => setIsJDModalOpen(true)}
              >
                <span>View Full JD</span>
                <ChevronRight size={16} />
              </Button>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {job.description || "No description provided."}
            </p>
          </div>
        </Card>
      </div>

      {/* Add Candidate Modal */}
      <AddCandidateModal 
        jobId={job.id}
        open={isCandidateModalOpen}
        onOpenChange={setIsCandidateModalOpen}
        onCandidateAdded={onCandidateAdded}
      />

      {/* View Job Description Modal */}
      <ViewJDModal 
        job={job}
        open={isJDModalOpen}
        onOpenChange={setIsJDModalOpen}
      />
    </div>
  );
};

export default JobOverview;
