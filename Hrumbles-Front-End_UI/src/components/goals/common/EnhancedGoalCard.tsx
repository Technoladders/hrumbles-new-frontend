import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  User,
  Users,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoalManagement } from "@/hooks/useGoalManagement";
import { format, isAfter, isBefore } from "date-fns";
import {
  updateEmployeeGoalTarget,
  extendEmployeeGoalTarget,
  removeEmployeeFromGoal,
} from "@/lib/goalService";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EmployeeGoalCardProps {
  goal: GoalWithDetails;
  onUpdate?: () => void;
}

const EnhancedGoalCard: React.FC<EmployeeGoalCardProps> = ({
  goal,
  onUpdate,
}) => {
  const { toast } = useToast();
  const { isLoading, handleDeleteGoal } = useGoalManagement();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmployeeManagementOpen, setIsEmployeeManagementOpen] = useState(false);
  const [selectedAssignedGoal, setSelectedAssignedGoal] = useState<AssignedGoal | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [newTargetValue, setNewTargetValue] = useState(0);
  const [additionalTargetValue, setAdditionalTargetValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [expandedGoalTypes, setExpandedGoalTypes] = useState<Record<string, boolean>>({
    Daily: true,
    Weekly: true,
    Monthly: true,
    Yearly: true,
  });

  // Group assignments by goal type
  const assignmentsByType = useMemo(() => {
    const groups: Record<string, AssignedGoal[]> = {
      Daily: [],
      Weekly: [],
      Monthly: [],
      Yearly: [],
    };

    goal.assignments?.forEach(assignment => {
      if (groups[assignment.goalType]) {
        groups[assignment.goalType].push(assignment);
      }
    });

    return groups;
  }, [goal.assignments]);

  // Create a map of employees by ID
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    goal.assignedTo?.forEach(employee => {
      const parts = employee.name.trim().split(" ");
      map.set(employee.id, {
        ...employee,
        first_name: parts[0] || employee.name,
        last_name: parts.slice(1).join(" ") || "",
        position: employee.position,
      });
    });
    return map;
  }, [goal.assignedTo]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return "No date available"; // Provide a fallback message
    }
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Invalid date";
    }
  };
  console.log("goal", goal);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "stopped":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const toggleGoalType = (type: string) => {
    setExpandedGoalTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleDeleteClick = async () => {
    const result = await handleDeleteGoal(goal.id);
    if (result) {
      setIsDeleteDialogOpen(false);
      if (onUpdate) onUpdate();
    }
  };

  // ... (keep all your existing dialog handlers)

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold mb-1">
                {goal.name}
              </CardTitle>
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-800 border-purple-200 mb-2"
              >
                {goal.sector}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Goal Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsEmployeeManagementOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Employees
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-500">{goal.description}</div>

            <div>
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>Overall Progress</span>
                <span>{goal.overallProgress ?? 0}%</span>
              </div>
              <Progress value={goal.overallProgress ?? 0} className="h-2" />
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center text-gray-500">
                <Target className="h-4 w-4 mr-1 text-gray-400" />
                <span>
                  {goal.totalCurrentValue ?? 0} / {goal.totalTargetValue ?? 0}{" "}
                  {goal.metricUnit}
                </span>
              </div>

              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                <span>
                  {formatDate(goal.startDate)} - {formatDate(goal.endDate)}
                </span>
              </div>
            </div>

            {/* Grouped by goal type */}
            {Object.entries(assignmentsByType).map(([type, assignments]) => {
              if (assignments.length === 0) return null;

              const currentPeriodAssignments = assignments.filter(assignment => {
                // Filter for current period assignments based on goal type
                const now = new Date();
                const periodEnd = new Date(assignment.period_end || goal.endDate);
                return isAfter(periodEnd, now) || isBefore(periodEnd, now);
              });

              if (currentPeriodAssignments.length === 0) return null;

              return (
                <div key={type} className="border rounded-md">
                  <button
                    onClick={() => toggleGoalType(type)}
                    className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <span className="font-medium">{type} Goals</span>
                      <Badge variant="outline" className="ml-2">
                        {currentPeriodAssignments.length}
                      </Badge>
                    </div>
                    {expandedGoalTypes[type] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedGoalTypes[type] && (
                    <div className="p-2 pt-0">
                      {currentPeriodAssignments.map((assignment) => {
                        const employee = employeeMap.get(assignment.employeeId);
                        if (!employee) return null;

                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-50"
                          >
                            <div className="flex flex-col w-full">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">
                                  {employee.first_name} {employee.last_name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`${getStatusColor(assignment.status)} text-xs px-2 py-0`}
                                >
                                  {assignment.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Target className="h-3 w-3 mr-1" />
                                <span>
                                  {assignment.currentValue} / {assignment.targetValue} {goal.metricUnit}
                                </span>
                              </div>

                              <div className="w-full mt-1">
                                <Progress 
                                  value={assignment.progress} 
                                  className="h-2" 
                                  indicatorClassName={getStatusColor(assignment.status).replace('bg-', 'bg-opacity-20 ')}
                                />
                              </div>

                              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                                <span>
                                  Period: {formatDate(assignment.period_start)} - {formatDate(assignment.period_end)}
                                </span>
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 ml-2"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedAssignedGoal({
                                      ...assignment,
                                      employee,
                                    });
                                    setNewTargetValue(assignment.targetValue);
                                    setSelectedDate(undefined);
                                    setIsUpdateDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Target
                                </DropdownMenuItem>

                                {assignment.status === "completed" && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAssignedGoal({
                                        ...assignment,
                                        employee,
                                      });
                                      setAdditionalTargetValue(
                                        Math.round(assignment.targetValue * 0.1)
                                      );
                                      setSelectedDate(undefined);
                                      setIsExtendDialogOpen(true);
                                    }}
                                  >
                                    <Target className="h-4 w-4 mr-2" />
                                    Extend Goal
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRemoveEmployeeFromGoal(assignment.id)
                                  }
                                  className="text-red-600"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Remove Employee
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Historical Goals Accordion */}
            <Accordion type="single" collapsible>
              <AccordionItem value="history">
                <AccordionTrigger className="text-sm py-2">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Historical Goals</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="max-h-64">
                    {goal.instances?.filter(instance => {
                      // Filter for historical instances (completed or overdue)
                      return instance.status === "completed" || instance.status === "overdue";
                    }).map(instance => {
                      const assignment = goal.assignments?.find(a => a.id === instance.assigned_goal_id);
                      const employee = assignment ? employeeMap.get(assignment.employeeId) : null;

                      return (
                        <div key={instance.id} className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-50">
                          <div className="flex flex-col">
                            {employee && (
                              <span className="text-sm font-medium">
                                {employee.first_name} {employee.last_name}
                              </span>
                            )}
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <Target className="h-3 w-3 mr-1" />
                              <span>
                                {instance.current_value} / {instance.target_value} {goal.metricUnit}
                              </span>
                              <Badge
                                variant="outline"
                                className={`${getStatusColor(instance.status)} ml-2 text-xs px-1 py-0`}
                              >
                                {instance.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Period: {formatDate(instance.period_start)} - {formatDate(instance.period_end)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* Keep all your existing dialogs */}
      {/* Update Target Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        {/* ... existing dialog content ... */}
      </Dialog>

      {/* Extend Target Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        {/* ... existing dialog content ... */}
      </Dialog>

      {/* Employee Management Dialog */}
      <Dialog open={isEmployeeManagementOpen} onOpenChange={setIsEmployeeManagementOpen}>
        {/* ... existing dialog content ... */}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        {/* ... existing dialog content ... */}
      </AlertDialog>
    </>
  );
};

export default EnhancedGoalCard;