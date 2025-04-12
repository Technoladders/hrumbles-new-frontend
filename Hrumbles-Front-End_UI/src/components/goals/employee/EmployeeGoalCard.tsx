import React, { useState } from "react";
import { formatDistance, format } from "date-fns";
import { Calendar, BarChart3, Clock } from "lucide-react";
import { GoalWithDetails, Employee } from "@/types/goal";
import { Badge } from "@/components/ui/badge";
import ProgressTracker from "@/components/goals/goals/ProgressTracker";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TrackingRecordForm from "./TrackingRecordForm";

interface EmployeeGoalCardProps {
  goal: GoalWithDetails;
  employee: Employee;
}

const EmployeeGoalCard: React.FC<EmployeeGoalCardProps> = ({ goal, employee }) => {
  const [isTrackingFormOpen, setIsTrackingFormOpen] = useState(false);
  console.log("goalcardadat:", goal)

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getTimeRemaining = (endDate: string) => {
    try {
      const end = new Date(endDate);
      const now = new Date();
      if (now > end) return "Overdue";
      return formatDistance(end, now, { addSuffix: true });
    } catch (e) {
      return "Unknown";
    }
  };

  const getSectorColor = (sector: string) => {
    switch (sector.toLowerCase()) {
      case "hr":
        return "bg-sector-hr text-white";
      case "sales":
        return "bg-sector-sales text-white";
      case "finance":
        return "bg-sector-finance text-white";
      case "operations":
        return "bg-sector-operations text-white";
      case "marketing":
        return "bg-sector-marketing text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    return status
      .replace("-", " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <AnimatedCard
      animation="fade"
      className="bg-white border border-gray-100 h-full"
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="outline" className={getSectorColor(goal.sector)}>
            {goal.sector}
          </Badge>
          {goal.assignmentDetails && (
            <Badge
              variant="outline"
              className={getStatusColor(goal.assignmentDetails.status)}
            >
              {getStatusText(goal.assignmentDetails.status)}
            </Badge>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-2 line-clamp-1">{goal.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {goal.description}
        </p>

        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Clock className="h-4 w-4 mr-2" />
          <span>{getTimeRemaining(goal.endDate)}</span>
        </div>

        <div className="mt-auto">
          {goal.assignmentDetails && (
            <div className="mb-4">
              <ProgressTracker
                progress={goal.assignmentDetails.progress}
                size="md"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  Current: {goal.assignmentDetails.currentValue}
                  {goal.metricUnit}
                </span>
                <span>
                  Target: {goal.assignmentDetails.targetValue}
                  {goal.metricUnit}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <span>Type: {goal.assignmentDetails.goalType}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm text-gray-600">
                {goal.metricType}
              </span>
            </div>

            <Popover open={isTrackingFormOpen} onOpenChange={setIsTrackingFormOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Track Progress
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <TrackingRecordForm
                  goal={goal}
                  onClose={() => setIsTrackingFormOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
};

export default EmployeeGoalCard;
