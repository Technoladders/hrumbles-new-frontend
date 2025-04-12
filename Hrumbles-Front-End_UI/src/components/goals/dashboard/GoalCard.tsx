
import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Users, BarChart3, Clock, Target, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProgressTracker from "@/components/goals/goals/ProgressTracker";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { GoalWithDetails } from "@/types/goal";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Adding this AvatarGroup component since it's not included in shadcn by default
const AvatarGroup = ({ children, limit = 3, className = "" }: { 
  children: React.ReactNode; 
  limit?: number; 
  className?: string;
}) => {
  const childrenArray = React.Children.toArray(children);
  const limitedChildren = childrenArray.slice(0, limit);
  const excess = childrenArray.length - limit;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {limitedChildren}
      {excess > 0 && (
        <Avatar className="ring-2 ring-background">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            +{excess}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

interface GoalCardProps {
  goal: GoalWithDetails;
  delay?: number;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, delay = 0 }) => {
  const navigate = useNavigate();
  
console.log("Goaaalssss:", goal)

  // Calculate the total target value across all assigned employees
  const calculateTotalTarget = () => {
    if (!goal.assignedTo || goal.assignedTo.length === 0) {
      return goal.targetValue || 0;
    }
    
    // If there's just one assignment or no detailed assignments
    if (!Array.isArray(goal.assignedTo) || goal.assignedTo.length <= 1) {
      return goal.assignmentDetails?.targetValue || goal.targetValue || 0;
    }
    
    // Try to get detailed assignments data if available through an API
    // This would require the backend to expose all assignments for this goal
    // For now, we'll just return the assignment target value or goal target value
    return goal.assignmentDetails?.targetValue || goal.targetValue || 0;
  };
  
  // Calculate the current progress value
  const calculateCurrentValue = () => {
    return goal.assignmentDetails?.currentValue || 0;
  };
  
  // Get the total target value
  const totalTargetValue = calculateTotalTarget();
  const currentValue = calculateCurrentValue();
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (totalTargetValue === 0) return 0;
    const progress = (currentValue / totalTargetValue) * 100;
    return Math.min(Math.round(progress), 100);
  };
  
  const progress = calculateProgress();
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
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

  const getGoalTypeIcon = (goalType: string) => {
    switch (goalType?.toLowerCase()) {
      case "daily":
        return <Clock className="h-4 w-4 mr-1" />;
      case "weekly":
        return <Calendar className="h-4 w-4 mr-1" />;
      case "monthly":
        return <Target className="h-4 w-4 mr-1" />;
      case "yearly":
        return <BarChart3 className="h-4 w-4 mr-1" />;
      default:
        return <Target className="h-4 w-4 mr-1" />;
    }
  };

  const getGoalTypeLabel = () => {
    if (!goal.assignmentDetails?.goalType) return null;
    
    const goalType = goal.assignmentDetails.goalType;
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-100 flex items-center">
        {getGoalTypeIcon(goalType)}
        <span>{goalType}</span>
      </Badge>
    );
  };

  const getTimeRemaining = () => {
    if (!goal.endDate) return null;
    
    try {
      const endDate = parseISO(goal.endDate);
      if (endDate < new Date()) {
        return <span className="text-red-500">Expired</span>;
      }
      return formatDistanceToNow(endDate, { addSuffix: true });
    } catch (e) {
      return null;
    }
  };

  const handleCardClick = () => {
    navigate(`/goals/${goal.id}`);
  };

  return (
    <AnimatedCard
      animation="fade"
      delay={delay}
      className="bg-white border border-gray-100 transition-all cursor-pointer hover:shadow-md"
      onClick={handleCardClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="outline" className={getSectorColor(goal.sector)}>
            {goal.sector}
          </Badge>
          <div className="flex gap-2">
            {getGoalTypeLabel()}
            {goal.assignmentDetails && (
              <Badge
                variant="outline"
                className={getStatusColor(goal.assignmentDetails.status)}
              >
                {goal.assignmentDetails.status
                  .replace("-", " ")
                  .replace(/^\w/, (c) => c.toUpperCase())}
              </Badge>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2 line-clamp-1">{goal.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {goal.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="line-clamp-1">
              {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
            </span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-xs font-medium text-blue-600">
                {getTimeRemaining()}
              </TooltipTrigger>
              <TooltipContent>
                <p>Goal deadline: {formatDate(goal.endDate)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-auto">
          {goal.assignmentDetails && (
            <div className="mb-3">
              <ProgressTracker
                progress={progress}
                size="md"
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  Current: {currentValue}
                  {goal.metricUnit}
                </span>
                <span>
                  Target: {totalTargetValue}
                  {goal.metricUnit}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-sm text-gray-600">
                {goal.assignmentDetails?.goalType || "Not assigned"}
              </span>
            </div>

            {goal.assignedTo && goal.assignedTo.length > 0 && (
              <div className="flex items-center">
                <div className="mr-2 text-xs text-gray-500 whitespace-nowrap">
                  {goal.assignedTo.length} {goal.assignedTo.length === 1 ? 'employee' : 'employees'}
                </div>
                <AvatarGroup className="justify-end" limit={3}>
                  {goal.assignedTo.map((employee) => (
                    <Avatar
                      key={employee.id}
                      className="h-8 w-8 border-2 border-white"
                    >
                      <AvatarImage src={employee.avatar} alt={employee.name} />
                      <AvatarFallback>
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
};

export default GoalCard;
