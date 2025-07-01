import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Target,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  List,
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
import { format, isAfter, isSameDay } from "date-fns";
import {
  updateEmployeeGoalTarget,
  extendEmployeeGoalTarget,
  removeEmployeeFromGoal,
} from "@/lib/goalService";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GoalWithDetails, AssignedGoal, Employee } from "@/types/goal";
import GoalInstancesDialog from "@/components/goals/common/GoalInstancesDialog";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface GoalCardProps {
  goal: GoalWithDetails;
  onUpdate?: () => void;
  className?: string;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate, className }) => {
  const { toast } = useToast();
  const { isLoading, handleDeleteGoal } = useGoalManagement();
  const navigate = useNavigate();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmployeeManagementOpen, setIsEmployeeManagementOpen] = useState(false);
  const [selectedAssignedGoal, setSelectedAssignedGoal] = useState<AssignedGoal | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [isInstancesDialogOpen, setIsInstancesDialogOpen] = useState(false);
  const [newTargetValue, setNewTargetValue] = useState(0);
  const [additionalTargetValue, setAdditionalTargetValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Define goal types with correct capitalization
  const goalTypes = ["Daily", "Weekly", "Monthly", "Yearly"];

  // Determine default tab (first goal type with assignments)
  const defaultTab = useMemo(() => {
    return goalTypes.find(type => 
      goal.assignments?.some(a => a.goal_type === type)
    ) || "Daily";
  }, [goal.assignments]);

  const [selectedGoalType, setSelectedGoalType] = useState<string>(defaultTab);

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
          employee_id: assignment.employee_id,
          goal_type: assignment.goal_type,
          target_value: assignment.target_value,
          current_value: assignment.current_value,
        });
      }
    });

    return groups;
  }, [goal.assignments]);

  // Check if there are any assignments; if not, don't render the card
  const hasAssignments = Object.values(assignmentsByType).some(arr => arr.length > 0);
  if (!hasAssignments) {
    console.log(`No assignments for goal ${goal.name}`);
    return null;
  }

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

  // Calculate progress for each goal type
  const goalTypeProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    Object.entries(assignmentsByType).forEach(([type, assignments]) => {
      const totalTarget = assignments.reduce((sum, a) => sum + a.target_value, 0);
      const totalCurrent = assignments.reduce((sum, a) => sum + a.current_value, 0);
      progress[type] = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;
    });
    return progress;
  }, [assignmentsByType]);

  // Filter current period assignments for the selected goal type
  const currentPeriodAssignments = useMemo(() => {
    const assignments = assignmentsByType[selectedGoalType] || [];
    return assignments.filter(assignment => {
      const now = new Date();
      const periodEnd = new Date(assignment.period_end || now);
      if (selectedGoalType === 'Daily') {
        return isSameDay(periodEnd, now) || isAfter(periodEnd, now);
      }
      return isAfter(periodEnd, now) || isSameDay(periodEnd, now);
    });
  }, [assignmentsByType, selectedGoalType]);

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

  // Handle tab change and update URL
  const handleTabChange = (newGoalType: string) => {
    setSelectedGoalType(newGoalType);
    
    // navigate(`/goals/${goal.id}/${newGoalType}`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">

            <div>
    <Link to={`/goals/${goal.id}/${selectedGoalType}`} className={cn("block", className)}>

              <CardTitle className="text-lg font-bold mb-1">
                {goal.name}
              </CardTitle>
              </Link>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 border-purple-200"
                >
                  {goal.sector || 'General'}
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
                {/* <DropdownMenuLabel>Goal Actions</DropdownMenuLabel>
                <DropdownMenuSeparator /> */}
                {/* <DropdownMenuItem
                  onClick={() => setIsEmployeeManagementOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Employees
                </DropdownMenuItem> */}
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
          <Tabs
            value={selectedGoalType}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 gap-2 mb-4">
              {goalTypes.map(type => (
                <TabsTrigger
                  key={type}
                  value={type}
                  disabled={assignmentsByType[type].length === 0}
                  className="text-sm py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  aria-label={`View ${type} assignments`}
                >
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>

            {goalTypes.map(type => (
              <TabsContent key={type} value={type}>
                {assignmentsByType[type].length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    No assignments for {type} goals.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-500">{goal.description || 'No description'}</div>

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
                          {currentPeriodAssignments.reduce((sum, a) => sum + a.current_value, 0)} / 
                          {currentPeriodAssignments.reduce((sum, a) => sum + a.target_value, 0)} {goal.metric_unit || 'units'}
                        </span>
                      </div>

                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>
                          {formatDate(currentPeriodAssignments[0]?.period_start)} - {formatDate(currentPeriodAssignments[0]?.period_end)}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsInstancesDialogOpen(true);
                      }}
                    >
                      <List className="h-4 w-4" />
                      View All {type} Instances
                    </Button>

                    <div className="border rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="font-medium">Assigned Employees</span>
                          <Badge variant="outline" className="ml-2">
                            {currentPeriodAssignments.length}
                          </Badge>
                        </div>
                      </div>

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
                                  {assignment.current_value} / {assignment.target_value} {goal.metric_unit || 'units'}
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
                                {/* <DropdownMenuItem
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
                                </DropdownMenuItem> */}

                               
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
                                    Extend Target
                                  </DropdownMenuItem>
                               

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

                    {/* <Accordion type="single" collapsible>
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
                              .filter(instance => instance.status === "completed" || instance.status === "overdue")
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
                                          {instance.current_value} / {instance.target_value} {goal.metric_unit || 'units'}
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
                    </Accordion> */}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <GoalInstancesDialog
        open={isInstancesDialogOpen}
        onOpenChange={setIsInstancesDialogOpen}
        goalId={goal.id}
        goalName={goal.name}
        goalType={selectedGoalType}
        metricUnit={goal.metric_unit || 'units'}
        onUpdate={onUpdate}
      />

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

      <Dialog open={isEmployeeManagementOpen} onOpenChange={setIsEmployeeManagementOpen}>
      <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Employees</DialogTitle>
            <DialogDescription>
              Add or remove employees from this goal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h4 className="text-sm font-medium mb-2">Assigned Employees</h4>
            <ScrollArea className="h-64 border rounded-md p-2">
              {goal.assignments && goal.assignments.length > 0 ? (
                <div className="space-y-2">
                  {goal.assignments.map(assignment => {
                    const employee = assignment.employee;
                    if (!employee) return null;
                    
                    return (
                      <div key={assignment.id} className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-50">
                        <div>
                          <div className="font-medium text-sm">{employee.first_name} {employee.last_name}</div>
                          <div className="text-xs text-gray-500">{employee.position || 'No position'}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveEmployeeFromGoal(assignment.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No employees assigned to this goal
                </div>
              )}
            </ScrollArea>
            
            <div className="mt-4 text-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEmployeeManagementOpen(false);
                  // Here you would navigate to employee assignment page or open a modal
                  toast({
                    title: "Employee Assignment",
                    description: "Use the 'Assign Goals' button on the main page to add employees to this goal."
                  });
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign New Employees
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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