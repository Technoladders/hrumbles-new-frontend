import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Employee, GoalInstance, GoalWithDetails } from "@/types/goal";
import { BarChart3, Clock, AlertTriangle, CheckCircle2, Calendar, Target } from "lucide-react";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";

interface EmployeeGoalCardProps {
  goal: GoalWithDetails;
  goalInstance: GoalInstance;
  employee: Employee;
  onInstanceUpdate?: (instanceId: string, updates: Partial<GoalInstance>) => void;
}

const EmployeeGoalCard: React.FC<EmployeeGoalCardProps> = ({ goal, goalInstance, employee, onInstanceUpdate }) => {
  const navigate = useNavigate();
  const [currentValue, setCurrentValue] = useState<number>(goalInstance.currentValue ?? 0);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState(goalInstance.status ?? 'pending');
  const [progress, setProgress] = useState(goalInstance.progress ?? 0);

  const isSpecialGoal = goal.name === "Submission" || goal.name === "Onboarding";

  console.log("EmployeeGoalCard: Initial Props", {
    goal: {
      id: goal.id,
      name: goal.name,
      sector: goal.sector,
      description: goal.description,
      metricUnit: goal.metricUnit,
      targetValue: goal.targetValue
    },
    goalInstance: {
      id: goalInstance.id,
      periodStart: goalInstance.periodStart,
      periodEnd: goalInstance.periodEnd,
      targetValue: goalInstance.targetValue,
      currentValue: goalInstance.currentValue,
      status: goalInstance.status,
      progress: goalInstance.progress
    },
    employee: {
      id: employee.id,
      name: employee.name
    }
  });

  useEffect(() => {
    const calculateStatus = (current: number, target: number, endDateStr: string): string => {
      const now = new Date();
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);

      if (current >= target) return 'completed';
      if (now > endDate && current < target) return 'overdue';
      if (current > 0) return 'in-progress';
      return 'pending';
    };

    const updateInstanceStatus = async (newStatus: string, newProgress: number, newCurrentValue: number) => {
      try {
        const { error } = await supabase
          .from("hr_goal_instances")
          .update({
            status: newStatus,
            progress: newProgress,
            current_value: newCurrentValue,
            updated_at: new Date().toISOString()
          })
          .eq("id", goalInstance.id);

        if (error) {
          console.error("Error updating goal instance status:", error);
        } else {
          // Notify parent component of the update
          onInstanceUpdate?.(goalInstance.id, {
            status: newStatus,
            progress: newProgress,
            currentValue: newCurrentValue
          });
        }
      } catch (err) {
        console.error("Unexpected error updating goal instance:", err);
      }
    };

    if (!isSpecialGoal) {
      const targetValue = goalInstance.targetValue ?? 0;
      const newProgress = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
      const newStatus = calculateStatus(currentValue, targetValue, goalInstance.periodEnd);

      setCurrentValue(goalInstance.currentValue ?? 0);
      setStatus(newStatus);
      setProgress(newProgress);
      setLoading(false);

      // Update database with calculated status and progress
      updateInstanceStatus(newStatus, newProgress, currentValue);

      console.log("EmployeeGoalCard: Regular Goal Data", {
        currentValue: goalInstance.currentValue ?? 0,
        status: newStatus,
        progress: newProgress
      });
      return;
    }

    const fetchCurrentValue = async () => {
      setLoading(true);
      let subStatusId: string | null = null;
      if (goal.name === "Submission") {
        subStatusId = "71706ff4-1bab-4065-9692-2a1237629dda";
      } else if (goal.name === "Onboarding") {
        subStatusId = "c9716374-3477-4606-877a-dfa5704e7680";
      }

      console.log("fetchCurrentValue: Starting Fetch", {
        goalName: goal.name,
        subStatusId,
        goalInstance
      });

      if (!subStatusId) {
        const fallbackStatus = calculateStatus(goalInstance.currentValue ?? 0, goalInstance.targetValue ?? 0, goalInstance.periodEnd);
        console.log("fetchCurrentValue: Fallback Data", {
          currentValue: goalInstance.currentValue ?? 0,
          status: fallbackStatus,
          progress: goalInstance.progress ?? 0
        });
        setCurrentValue(goalInstance.currentValue ?? 0);
        setStatus(fallbackStatus);
        setProgress(goalInstance.progress ?? 0);
        setLoading(false);
        updateInstanceStatus(fallbackStatus, goalInstance.progress ?? 0, goalInstance.currentValue ?? 0);
        return;
      }

      try {
        const periodEndPlusOne = new Date(goalInstance.periodEnd);
        periodEndPlusOne.setDate(periodEndPlusOne.getDate() + 1);

        console.log("fetchCurrentValue: Supabase Query Parameters", {
          sub_status_id: subStatusId,
          candidate_owner: employee.id,
          period_start: goalInstance.periodStart,
          period_end: periodEndPlusOne.toISOString().split("T")[0]
        });

        const { data, error } = await supabase
          .from("hr_status_change_counts")
          .select("count")
          .eq("sub_status_id", subStatusId)
          .eq("candidate_owner", employee.id)
          .gte("created_at", goalInstance.periodStart)
          .lt("created_at", periodEndPlusOne.toISOString().split("T")[0]);

        if (error) {
          console.error("fetchCurrentValue: Supabase Error", {
            error,
            fallbackData: {
              currentValue: goalInstance.currentValue ?? 0,
              status: goalInstance.status ?? 'pending',
              progress: goalInstance.progress ?? 0
            }
          });
          const fallbackStatus = calculateStatus(goalInstance.currentValue ?? 0, goalInstance.targetValue ?? 0, goalInstance.periodEnd);
          setCurrentValue(goalInstance.currentValue ?? 0);
          setStatus(fallbackStatus);
          setProgress(goalInstance.progress ?? 0);
          setLoading(false);
          updateInstanceStatus(fallbackStatus, goalInstance.progress ?? 0, goalInstance.currentValue ?? 0);
          return;
        }

        console.log("fetchCurrentValue: Supabase Response", {
          data,
          recordCount: data.length
        });

        const totalCount = data.reduce((sum: number, record: { count: number }) => sum + record.count, 0);
        const targetValue = goalInstance.targetValue ?? 0;
        const newProgress = targetValue > 0 ? Math.min(Math.round((totalCount / targetValue) * 100), 100) : 0;
        const newStatus = calculateStatus(totalCount, targetValue, goalInstance.periodEnd);

        console.log("fetchCurrentValue: Calculated Results", {
          totalCount,
          progress: newProgress,
          status: newStatus,
          targetValue,
          period: {
            start: goalInstance.periodStart,
            end: goalInstance.periodEnd,
            now: new Date().toISOString()
          }
        });

        setCurrentValue(totalCount);
        setProgress(newProgress);
        setStatus(newStatus);
        setLoading(false);
        updateInstanceStatus(newStatus, newProgress, totalCount);
      } catch (err) {
        console.error("fetchCurrentValue: Unexpected Error", {
          error: err,
          fallbackData: {
            currentValue: goalInstance.currentValue ?? 0,
            status: goalInstance.status ?? 'pending',
            progress: goalInstance.progress ?? 0
          }
        });
        const fallbackStatus = calculateStatus(goalInstance.currentValue ?? 0, goalInstance.targetValue ?? 0, goalInstance.periodEnd);
        setCurrentValue(goalInstance.currentValue ?? 0);
        setStatus(fallbackStatus);
        setProgress(goalInstance.progress ?? 0);
        setLoading(false);
        updateInstanceStatus(fallbackStatus, goalInstance.progress ?? 0, goalInstance.currentValue ?? 0);
      }
    };

    fetchCurrentValue();
  }, [goal.id, goalInstance.id, employee.id, goalInstance.periodStart, goalInstance.periodEnd, goalInstance.currentValue, onInstanceUpdate]);

  const getPeriodText = () => {
    const goalType = goal.assignmentDetails?.find(ad => ad.id === goalInstance.assignedGoalId)?.goalType || "Standard";
    const startDate = format(new Date(goalInstance.periodStart), 'MMM d, yyyy');
    const endDate = format(new Date(goalInstance.periodEnd), 'MMM d, yyyy');
    return `${goalType} Period: ${startDate} - ${endDate}`;
  };

  const getIntervalTypeText = () => {
    const goalType = goal.assignmentDetails?.find(ad => ad.id === goalInstance.assignedGoalId)?.goalType || "Goal";
    return `${goalType} Goal`;
  };

  const statusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <BarChart3 className="h-5 w-5 text-blue-500" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-amber-500" />;
    }
  };

  const getBadgeClasses = () => {
    switch (status) {
      case 'completed':
        return "bg-green-100 text-green-800 border-green-200";
      case 'in-progress':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'overdue':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const handleViewDetails = () => {
    navigate(`/goals/${goal.id}/${goalInstance.id}`, { state: { employee, goalInstance } });
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="mb-2">
            {goal.sector}
          </Badge>
          <Badge variant="outline" className={getBadgeClasses()}>
            <span className="flex items-center">
              {statusIcon()}
              <span className="ml-1 capitalize">{status}</span>
            </span>
          </Badge>
        </div>
        <CardTitle className="text-lg">{goal.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="text-sm text-gray-500 mb-3">
          {goal.description}
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {getPeriodText()}
          </div>
          
          <div className="flex items-center text-sm text-gray-500">
            <Target className="h-4 w-4 mr-1" />
            {getIntervalTypeText()}
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            {loading ? (
              <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-gray-300 animate-pulse"></div>
              </div>
            ) : (
              <Progress value={progress} className="h-2" />
            )}
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Target</span>
            <span>
              {loading ? (
                <span className="inline-block w-16 h-4 bg-gray-200 rounded animate-pulse"></span>
              ) : (
                <span>
                  {currentValue} / {goalInstance.targetValue ?? goal.targetValue}
                  <span className="ml-1 text-xs text-gray-500">{goal.metricUnit}</span>
                </span>
              )}
            </span>
          </div>
          
          {isSpecialGoal && (
            <div className="text-xs text-blue-600 italic">
              *Values auto-calculated from {goal.name} records
            </div>
          )}
        </div>
      </CardContent>
      
      <Separator />
      
      {/* <CardFooter className="p-4">
        <Button 
          variant="default" 
          className="w-full" 
          onClick={handleViewDetails}
        >
          View {isSpecialGoal ? "Details" : "& Update Progress"}
        </Button>
      </CardFooter> */}
    </Card>
  );
};

export default EmployeeGoalCard;