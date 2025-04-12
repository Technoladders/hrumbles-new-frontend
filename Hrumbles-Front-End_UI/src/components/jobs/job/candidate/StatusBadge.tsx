
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "Screening" | "Interviewing" | "Selected" | "Rejected";

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case "Screening":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Interviewing":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "Selected":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium", getStatusColor(status))}
    >
      {status}
    </Badge>
  );
};

export default StatusBadge;
