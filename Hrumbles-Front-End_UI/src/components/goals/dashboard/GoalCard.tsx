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
import { GoalWithDetails, AssignedGoal, Employee } from "@/types/goal";

interface GoalCardProps {
  goal: GoalWithDetails;
  onUpdate?: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate }) => {
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
      if (groups[assignment.goal_type]) {
        groups[assignment.goal_type].push({
          ...assignment,
          employeeId: assignment.employee_id,
          goalType: assignment.goal_type,
          targetValue: assignment.target_value,
          currentValue: assignment.current_value || 0,
          period_start: assignment.period_start,
          period_end: assignment.period_end,
        });
      }
    });

    return groups;
  }, [goal.assignments]);

  // Create a map of employees by ID
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    goal.assignedTo?.forEach(employee => {
      map.set(employee.id, {
        ...employee,
        first_name: employee.first_name || employee.email.split("@")[0],
        last_name: employee.last_name || "",
        position: employee.position || "",
      });
    });
    return map;
  }, [goal.assignedTo]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return "No date available";
    }
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Invalid date";
    }
  };

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
      [type]: !prev[type],
    }));
  };

  const handleDeleteClick = async () => {
    const result = await handleDeleteGoal(goal.id);
    if (result) {
      setIsDeleteDialogOpen(false);
      toast({
        title: "Goal Deleted",
        description: `${goal.name} has been successfully deleted.`,
      });
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete goal.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmployeeFromGoal = async (assignedGoalId: string) => {
    const success = await removeEmployeeFromGoal(assignedGoalId);
    if (success) {
      toast({
        title: "Employee Removed",
        description: "Employee has been removed from the goal.",
      });
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to remove employee from goal.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTarget = async () => {
    if (!selectedAssignedGoal) return;

    const result = await updateEmployeeGoalTarget(
      selectedAssignedGoal.id,
      newTargetValue,
      selectedDate ? selectedDate.toISOString() : undefined
    );

    if (result) {
      toast({
        title: "Target Updated",
        description: `Target value updated to ${newTargetValue} for ${selectedAssignedGoal.employee.first_name} ${selectedAssignedGoal.employee.last_name}.`,
      });
      setIsUpdateDialogOpen(false);
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to update target value.",
        variant: "destructive",
      });
    }
  };

  const handleExtendTarget = async () => {
    if (!selectedAssignedGoal) return;

    const result = await extendEmployeeGoalTarget(
      selectedAssignedGoal.id,
      additionalTargetValue
    );

    if (result) {
      toast({
        title: "Target Extended",
        description: `Target extended by ${additionalTargetValue} for ${selectedAssignedGoal.employee.first_name} ${selectedAssignedGoal.employee.last_name}.`,
      });
      setIsExtendDialogOpen(false);
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to extend target.",
        variant: "destructive",
      });
    }
  };

  // Calculate progress for each goal type
  const goalTypeProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    Object.entries(assignmentsByType).forEach(([type, assignments]) => {
      const totalTarget = assignments.reduce((sum, a) => sum + (a.target_value || 0), 0);
      const totalCurrent = assignments.reduce((sum, a) => sum + (a.current_value || 0), 0);
      progress[type] = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;
    });
    return progress;
  }, [assignmentsByType]);

  return (
    <>
      {Object.entries(assignmentsByType).map(([type, assignments]) => {
        if (assignments.length === 0) return null;

        const currentPeriodAssignments = assignments.filter(assignment => {
          const now = new Date();
          const periodEnd = new Date(assignment.period_end || goal.endDate);
          return isAfter(periodEnd, now) || periodEnd.getTime() === now.getTime();
        });

        if (currentPeriodAssignments.length === 0) return null;

        return (
          <Card key={type} className="overflow-hidden mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold mb-1">
                    {goal.name} - {type}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-800 border-purple-200"
                    >
                      {goal.sector}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 border-blue-200"
                    >
                      {currentPeriodAssignments.length} {currentPeriodAssignments.length === 1 ? 'Employee' : 'Employees'}
                    </Badge>
                  </div>
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
                    <span>Progress ({type})</span>
                    <span>{goalTypeProgress[type]}%</span>
                  </div>
                  <Progress value={goalTypeProgress[type]} className="h-2" />
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center text-gray-500">
                    <Target className="h-4 w-4 mr-1 text-gray-400" />
                    <span>
                      {currentPeriodAssignments.reduce((sum, a) => sum + (a.current_value || 0), 0)} / 
                      {currentPeriodAssignments.reduce((sum, a) => sum + (a.target_value || 0), 0)} {goal.metric_unit}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {formatDate(goal.start_date)} - {formatDate(goal.end_date)}
                    </span>
                  </div>
                </div>

                {/* Employee List for this Goal Type */}
                <div className="border rounded-md">
                  <button
                    onClick={() => toggleGoalType(type)}
                    className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <span className="font-medium">Assigned Employees</span>
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
                        const employee = employeeMap.get(assignment.employee_id);
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
                                  {assignment.current_value} / {assignment.target_value} {goal.metric_unit}
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
                                    setNewTargetValue(assignment.target_value);
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
                                        Math.round(assignment.target_value * 0.1)
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
                                  onClick={() => handleRemoveEmployeeFromGoal(assignment.id)}
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

                {/* Historical Goals Accordion */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="history">
                    <AccordionTrigger className="text-sm py-2">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Historical Goals ({type})</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="max-h-64">
                        {goal.assignments
                          ?.filter(a => a.goal_type === type && (a.status === "completed" || a.status === "overdue"))
                          .flatMap(a => a.instances || [])
                          .map(instance => {
                            const assignment = goal.assignments?.find(a => a.id === instance.assigned_goal_id);
                            const employee = assignment ? employeeMap.get(assignment.employee_id) : null;

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
                                      {instance.current_value} / {instance.target_value} {goal.metric_unit}
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
        );
      })}

      {/* Dialogs */}
      {/* Update Target Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Target Value</DialogTitle>
            <DialogDescription>
              Update the target value for{" "}
              {selectedAssignedGoal?.employee.first_name} {selectedAssignedGoal?.employee.last_name}'s goal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-value" className="text-right">
                New Target
              </Label>
              <Input
                id="target-value"
                type="number"
                value={newTargetValue}
                onChange={(e) => setNewTargetValue(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="target-date" className="text-right">
                Specific Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTarget}>Update Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Target Dialog */}
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Target Value</DialogTitle>
            <DialogDescription>
              Extend the target value for{" "}
              {selectedAssignedGoal?.employee.first_name} {selectedAssignedGoal?.employee.last_name}'s goal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="additional-target" className="text-right">
                Additional Target
              </Label>
              <Input
                id="additional-target"
                type="number"
                value={additionalTargetValue}
                onChange={(e) => setAdditionalTargetValue(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendTarget}>Extend Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Management Dialog */}
      <Dialog open={isEmployeeManagementOpen} onOpenChange={setIsEmployeeManagementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Employees for {goal.name}</DialogTitle>
            <DialogDescription>
              Add or remove employees assigned to this goal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              This feature is under development. Use the "Remove Employee" action for now.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeManagementOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the goal "{goal.name}" and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClick}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GoalCard;