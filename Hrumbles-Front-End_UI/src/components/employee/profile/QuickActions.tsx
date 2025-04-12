
import React from "react";
import { Download, Calendar, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const QuickActionButton = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        className="w-10 h-10 rounded-full hover:bg-brand-primary hover:text-white transition-colors"
        onClick={onClick}
      >
        <Icon className="w-5 h-5" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

export const QuickActions = () => {
  const handleDownloadDocuments = () => {
    toast.info("Preparing documents for download...");
  };

  const handleScheduleMeeting = () => {
    toast.info("Opening meeting scheduler...");
  };

  const handleViewAttendance = () => {
    toast.info("Loading attendance history...");
  };

  const handleGenerateReport = () => {
    toast.info("Generating employee report...");
  };

  return (
    <div className="flex items-center gap-3">
      <QuickActionButton
        icon={Download}
        label="Download Documents"
        onClick={handleDownloadDocuments}
      />
      <QuickActionButton
        icon={Calendar}
        label="Schedule Meeting"
        onClick={handleScheduleMeeting}
      />
      <QuickActionButton
        icon={Clock}
        label="View Attendance"
        onClick={handleViewAttendance}
      />
      <QuickActionButton
        icon={Activity}
        label="Generate Report"
        onClick={handleGenerateReport}
      />
    </div>
  );
};
