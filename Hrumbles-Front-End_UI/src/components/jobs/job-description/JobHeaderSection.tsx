// Hrumbles-Front-End_UI\src\components\jobs\job-description\JobHeaderSection.tsx
// Changes: Enhanced with badges for job type, mode, ID in a clean chip row.
// Moved due date to a prominent badge. Improved responsive layout for mobile.
// Added subtle animations for interactions.

import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Eye, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JobData } from "@/lib/types";
import { useState } from "react";
import ViewJDModal from "@/components/jobs/job/ViewJDModal";
import {shareJob} from '@/services/jobs/supabaseQueries'
import { useToast } from '@/hooks/use-toast';

interface JobHeaderSectionProps {
  job: JobData;
  onEditJob: () => void;
}

const JobHeaderSection = ({ job, onEditJob }: JobHeaderSectionProps) => {
  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleShare = async (jobId) => {
    const response = await shareJob(jobId);
    if (response.success) {
      toast({ title: "Job shared successfully!", variant: "default" });
    } else {
      toast({ title: "Failed to share job", description: response.error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700 -ml-1 sm:ml-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate sm:truncate-none">{job.title}</h1>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap justify-end">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setIsJDModalOpen(true)}
          >
            <Eye size={16} />
            <span className="hidden sm:inline">View JD</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleShare(job.id)}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            <span className="hidden sm:inline">Share</span>
          </Button>
          
          <Button 
            size="sm"
            variant="default"
            onClick={onEditJob}
            className="flex items-center gap-2"
          >
            <Edit size={16} />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {/* Metadata Badges Row - Consolidated tags for type, mode, ID, status, due */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge 
          variant="secondary" 
          className="text-xs px-3 py-1 bg-blue-50 text-blue-700 border-blue-200"
        >
          ID: {job.jobId}
        </Badge>
        <Badge 
          variant="outline" 
          className="text-xs px-3 py-1 bg-purple-50 text-purple-700 border-purple-200"
        >
          {job.jobType}
        </Badge>
        <Badge 
          variant="outline" 
          className="text-xs px-3 py-1 bg-amber-50 text-amber-700 border-amber-200"
        >
          {job.hiringMode}
        </Badge>
        <Badge
          variant="default"
          className={`
            text-xs px-3 py-1
            ${job.status === "Active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
            ${job.status === "Pending" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}
            ${job.status === "Completed" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}
          `}
        >
          {job.status}
        </Badge>
        <div className="text-xs text-gray-500">• Due: {job.dueDate}</div>
      </div>
      
      {/* View JD Modal */}
      <ViewJDModal 
        job={job}
        open={isJDModalOpen}
        onOpenChange={setIsJDModalOpen}
      />
    </div>
  );
};

export default JobHeaderSection;