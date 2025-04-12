
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  FileText, 
  User, 
  Calendar, 
  Phone 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionButtonsProps {
  candidateId: number;
  onViewResume: (candidateId: number) => void;
  onScheduleInterview: (candidateId: number) => void;
  onViewProfile: (candidateId: number) => void;
  onCall: (candidateId: number) => void;
}

const ActionButtons = ({
  candidateId,
  onViewResume,
  onScheduleInterview,
  onViewProfile,
  onCall,
}: ActionButtonsProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Button 
        size="sm" 
        variant="outline"
        className="h-8 px-2 text-xs"
        onClick={() => onViewResume(candidateId)}
      >
        <FileText className="mr-1 h-3 w-3" />
        Resume
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onViewProfile(candidateId)}>
            <User className="mr-2 h-4 w-4" />
            <span>View Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onScheduleInterview(candidateId)}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Schedule</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCall(candidateId)}>
            <Phone className="mr-2 h-4 w-4" />
            <span>Call</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ActionButtons;
