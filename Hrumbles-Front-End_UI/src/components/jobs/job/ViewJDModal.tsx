
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/jobs/ui/dialog";
import { JobData } from "@/lib/types";
import { Card } from "@/components/jobs/ui/card";
import { Badge } from "@/components/jobs/ui/badge";
import { Briefcase, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/jobs/ui/button";

interface ViewJDModalProps {
  job: JobData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewJDModal = ({ job, open, onOpenChange }: ViewJDModalProps) => {
  // If there's no job, don't render anything
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Job Description</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Job Header */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{job.title}</h2>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Briefcase size={16} />
                <span>{job.type}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{job.location.join(", ")}</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays size={16} />
                <span>Posted: {job.postedDate}</span>
              </div>
              <Badge variant="outline" className={
                job.status === "Active" ? "bg-green-100 text-green-800" :
                job.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-gray-100 text-gray-800"
              }>
                {job.status}
              </Badge>
            </div>
          </div>
          
          {/* Job Description */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Description</h3>
            {job.description && (
              <div className="prose prose-sm max-w-none mb-4">
                <p>{job.description}</p>
              </div>
            )}
            
            {job.descriptionBullets && job.descriptionBullets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-md font-medium">Responsibilities:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {job.descriptionBullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          
          {/* Skills & Experience */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Requirements</h3>
            
            {job.experience && (
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Experience:</h4>
                <p>
                  {job.experience.min && `${job.experience.min.years} years ${job.experience.min.months} months`}
                  {job.experience.min && job.experience.max && ' to '}
                  {job.experience.max && `${job.experience.max.years} years ${job.experience.max.months} months`}
                </p>
              </div>
            )}
            
            {job.skills && job.skills.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-2">Skills:</h4>
                <div className="flex flex-wrap gap-1">
                  {job.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
          
          {/* Client Details */}
          {job.clientDetails && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {job.clientDetails.clientName && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Client:</h4>
                    <p>{job.clientDetails.clientName}</p>
                  </div>
                )}
                {job.clientDetails.clientBudget && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Budget:</h4>
                    <p>{job.clientDetails.clientBudget}</p>
                  </div>
                )}
                {job.clientDetails.endClient && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">End Client:</h4>
                    <p>{job.clientDetails.endClient}</p>
                  </div>
                )}
                {job.clientDetails.pointOfContact && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Contact:</h4>
                    <p>{job.clientDetails.pointOfContact}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewJDModal;
