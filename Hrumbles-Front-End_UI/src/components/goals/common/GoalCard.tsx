// src/components/goals/common/GoalCard.tsx

import React, { useState, useMemo } from "react";
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MoreHorizontal, Target, Trash2, List, UserMinus, Edit } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import EditGoalForm from "@/components/goals/goals/EditGoalForm";
import GoalInstancesDialog from '@/components/goals/common/GoalInstancesDialog';
import { useGoalManagement } from '@/hooks/useGoalManagement';
import { useToast } from '@/hooks/use-toast';
import { extendEmployeeGoalTarget, removeEmployeeFromGoal } from '@/lib/goalService';
import { GoalWithDetails, AssignedGoal, Employee } from '@/types/goal';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: GoalWithDetails;
  onUpdate?: () => void;
  className?: string;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate, className }) => {
  const { toast } = useToast();
  const { handleDeleteGoal } = useGoalManagement();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInstancesDialogOpen, setIsInstancesDialogOpen] = useState(false);
  const [selectedAssignedGoal, setSelectedAssignedGoal] = useState<AssignedGoal | null>(null);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [additionalTargetValue, setAdditionalTargetValue] = useState(0);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const goalTypes = ["Daily", "Weekly", "Monthly", "Yearly"];
  const defaultTab = useMemo(() => goalTypes.find(type => goal.assignments?.some(a => a.goal_type === type)) || "Daily", [goal.assignments]);
  const [selectedGoalType, setSelectedGoalType] = useState<string>(defaultTab);

  const assignmentsByType = useMemo(() => {
    const groups: Record<string, AssignedGoal[]> = { Daily: [], Weekly: [], Monthly: [], Yearly: [] };
    goal.assignments?.forEach(assignment => {
      if (groups[assignment.goal_type]) {
        groups[assignment.goal_type].push(assignment);
      }
    });
    return groups;
  }, [goal.assignments]);

  const activeGoalTypes = useMemo(() => {
    return goalTypes.filter(type => assignmentsByType[type].length > 0);
  }, [assignmentsByType]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    goal.assignedTo?.forEach(employee => {
      map.set(employee.id, {
        ...employee,
        first_name: employee.first_name || employee.email?.split("@")[0] || 'Unknown',
        last_name: employee.last_name || '',
      });
    });
    return map;
  }, [goal.assignedTo]);

  const currentPeriodAssignments = useMemo(() => {
    const assignments = assignmentsByType[selectedGoalType] || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return assignments.filter(assignment => {
      if (!assignment.period_end) return false;
      const parts = assignment.period_end.split('-').map(p => parseInt(p, 10));
      const periodEndDate = new Date(parts[0], parts[1] - 1, parts[2]);
      return periodEndDate >= today;
    });
  }, [assignmentsByType, selectedGoalType]);
  
  const overallProgress = useMemo(() => {
    if (currentPeriodAssignments.length === 0) return 0;
    const totalTarget = currentPeriodAssignments.reduce((sum, a) => sum + (a.target_value || 0), 0);
    const totalCurrent = currentPeriodAssignments.reduce((sum, a) => sum + (a.current_value || 0), 0);
    if (totalTarget === 0) return 0;
    return Math.min(Math.round((totalCurrent / totalTarget) * 100), 100);
  }, [currentPeriodAssignments]);


  
  const handleRemoveEmployeeFromGoal = async (assignedGoalId: string) => {
    const success = await removeEmployeeFromGoal(assignedGoalId);
    if (success) {
      toast({ title: "Employee Removed" });
      onUpdate?.();
    } else {
      toast({ title: "Error", description: "Failed to remove employee.", variant: "destructive" });
    }
  };

  const handleExtendTarget = async () => {
    if (!selectedAssignedGoal) return;
    const result = await extendEmployeeGoalTarget(selectedAssignedGoal.id, additionalTargetValue);
    if (result) {
      toast({ title: "Target Extended" });
      setIsExtendDialogOpen(false);
      onUpdate?.();
    } else {
      toast({ title: "Error", description: "Failed to extend target.", variant: "destructive" });
    }
  };

  const formatDate = (dateStr?: string) => dateStr ? format(new Date(dateStr), "MMM d, yyyy") : "N/A";
  
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

 



 

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <div className="flex justify-between items-start">
            <Link to={`/goals/${goal.id}/${selectedGoalType}`} className={cn("block pr-4", className)}>
              <CardTitle className="text-lg font-bold hover:text-primary transition-colors">{goal.name}</CardTitle>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />Edit Goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsInstancesDialogOpen(true)}>
                  <List className="h-4 w-4 mr-2" />View All Instances
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="secondary">{goal.sector || 'General'}</Badge>
            {/* <Badge variant="outline">{currentPeriodAssignments.length} Assigned</Badge> */}
          </div>
           {/* <div className="text-sm text-gray-500">{goal.description || 'No description'}</div> */}
        </CardHeader>

        <CardContent className="flex-grow">
          <Tabs value={selectedGoalType} onValueChange={setSelectedGoalType} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${activeGoalTypes.length || 1}, 1fr)`}}>
              {activeGoalTypes.map(type => (
                <TabsTrigger key={type} value={type} className="text-xs">{type}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedGoalType} className="mt-4 space-y-4">
              {currentPeriodAssignments.length > 0 ? (
                <>
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                      <span>Overall Progress ({selectedGoalType})</span>
                      <span className="font-semibold text-gray-700">{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                  <div className="text-sm flex justify-between items-center bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center text-gray-600">
                      <Target className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">
                        {currentPeriodAssignments.reduce((sum, a) => sum + a.current_value, 0)} / {currentPeriodAssignments.reduce((sum, a) => sum + a.target_value, 0)}
                      </span>
                      <span className="ml-1 text-gray-500">{goal.metric_unit || 'units'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(currentPeriodAssignments[0]?.period_end)}</div>
                  </div>
                  
                  {/* <Button variant="outline" className="w-full" onClick={() => setIsInstancesDialogOpen(true)}>
                    <List className="h-4 w-4 mr-2" /> View All Instances
                  </Button> */}

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="employees">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center">Assigned Employees<Badge variant="outline" className="ml-2">{currentPeriodAssignments.length}</Badge></div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="max-h-48 pr-3">
                          <div className="space-y-4">
                            {currentPeriodAssignments.map((assignment) => {
                              const employee = employeeMap.get(assignment.employee_id);
                              if (!employee) return null;
                              const employeeProgress = (assignment.target_value || 0) > 0 ? Math.min(Math.round(((assignment.current_value || 0) / (assignment.target_value || 1)) * 100), 100) : 0;
                              return (
                                <div key={assignment.id} className="flex items-center gap-2">
                                  <div className="flex-grow">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                      <span className="font-medium text-gray-800 truncate pr-2">{employee.first_name} {employee.last_name}</span>
                                      <Badge variant="outline" className={`${getStatusColor(assignment.status)} text-xs`}>{assignment.status}</Badge>
                                    </div>
                                    <Progress value={employeeProgress} className="h-1.5 mb-1" />
                                    <div className="text-xs text-gray-500 text-right">
                                      {assignment.current_value || 0} / {assignment.target_value || 0}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedAssignedGoal({ ...assignment, employee });
                                        setAdditionalTargetValue(Math.round((assignment.target_value || 0) * 0.1));
                                        setIsExtendDialogOpen(true);
                                      }}>
                                        <Target className="h-4 w-4 mr-2" />Extend Target
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleRemoveEmployeeFromGoal(assignment.id)} className="text-red-600">
                                        <UserMinus className="h-4 w-4 mr-2" />Remove Employee
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No active assignments for this period.</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <GoalInstancesDialog open={isInstancesDialogOpen} onOpenChange={setIsInstancesDialogOpen} goalId={goal.id} goalName={goal.name} goalType={selectedGoalType} metricUnit={goal.metric_unit || 'units'} onUpdate={onUpdate} />
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
      
      <Dialog open={isExtendDialogOpen} onOpenChange={setIsExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Target Value</DialogTitle>
            <DialogDescription>Extend the target for {selectedAssignedGoal?.employee.first_name}'s goal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="additional-target" className="text-right">Additional</Label>
              <Input id="additional-target" type="number" value={additionalTargetValue} onChange={(e) => setAdditionalTargetValue(Number(e.target.value))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExtendTarget}>Extend Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- NEW DIALOG FOR EDITING --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <EditGoalForm goal={goal} onClose={() => {
          setIsEditDialogOpen(false);
          onUpdate?.(); // Refresh the main page data when the form closes
        }} />
      </Dialog>
    </>
  );
};

export default GoalCard;