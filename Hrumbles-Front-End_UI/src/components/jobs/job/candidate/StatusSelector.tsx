
import React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CandidateStatus } from "@/lib/types";

interface StatusSelectorProps {
  status: CandidateStatus;
  candidateId: number;
  onStatusChange: (candidateId: number, newStatus: CandidateStatus) => void;
}

const StatusSelector = ({ status, candidateId, onStatusChange }: StatusSelectorProps) => {
  // Map status to colors and styles like Zoho Recruiter
  const getStatusColor = (status: CandidateStatus) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "InReview":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Engaged":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Available":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Offered":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "Hired":
        return "bg-green-100 text-green-800 border-green-300";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "Screening":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Interviewing":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "Selected":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleChange = (value: string) => {
    const newStatus = value as CandidateStatus;
    if (newStatus !== status) {
      onStatusChange(candidateId, newStatus);
    }
  };

  return (
    <Select defaultValue={status} onValueChange={handleChange}>
      <SelectTrigger 
        className={`h-8 w-32 px-2 border ${getStatusColor(status)} focus:ring-0 focus:ring-offset-0`}
      >
        <SelectValue placeholder={status} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="New" className="flex items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span>New</span>
          </div>
        </SelectItem>
        <SelectItem value="InReview">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span>In Review</span>
          </div>
        </SelectItem>
        <SelectItem value="Engaged">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <span>Engaged</span>
          </div>
        </SelectItem>
        <SelectItem value="Available">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span>Available</span>
          </div>
        </SelectItem>
        <SelectItem value="Offered">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
            <span>Offered</span>
          </div>
        </SelectItem>
        <SelectItem value="Hired">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Hired</span>
          </div>
        </SelectItem>
        <SelectItem value="Rejected">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span>Rejected</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default StatusSelector;
