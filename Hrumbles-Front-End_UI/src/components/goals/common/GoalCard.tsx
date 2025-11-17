// src/components/goals/common/GoalCard.tsx

import React, { useState, useMemo } from "react";
import { Link } from 'react-router-dom';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
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
import GoalInstancesDialog from '@/components/goals/common/GoalInstancesDialog';
import { useGoalManagement } from '@/hooks/useGoalManagement';
import { useToast } from '@/hooks/use-toast';
import { removeEmployeeFromGoal } from '@/lib/goalService';
import { GoalWithDetails, AssignedGoal, Employee, GoalInstance } from '@/types/goal';
import { cn } from '@/lib/utils';
// ADD: Import your new wizard for editing
import CreateAndAssignGoalWizard from '@/components/goals/wizard/CreateAndAssignGoalWizard';
import EditGoalFlow from "@/components/goals/goals/EditGoalFlow";


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

  // --- MAJOR LOGIC REFACTOR ---
  // Find the single active instance for today for each assignment of the selected type.
  const activePeriodData = useMemo(() => {
    const today = new Date();
    const assignmentsForType = assignmentsByType[selectedGoalType] || [];

    return assignmentsForType.map(assignment => {
      const activeInstance = (assignment.instances || []).find(inst => 
        isWithinInterval(today, {
          start: startOfDay(new Date(inst.period_start)),
          end: endOfDay(new Date(inst.period_end))
        })
      );
      return { assignment, activeInstance };
    }).filter(item => item.activeInstance); // Filter out assignments with no active instance for today
  }, [assignmentsByType, selectedGoalType]);

  const overallProgress = useMemo(() => {
    if (activePeriodData.length === 0) return 0;
    const totalTarget = activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.target_value || 0), 0);
    const totalCurrent = activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.current_value || 0), 0);
    if (totalTarget === 0) return 0;
    return Math.min(Math.round((totalCurrent / totalTarget) * 100), 100);
  }, [activePeriodData]);

  const handleRemoveEmployeeFromGoal = async (assignedGoalId: string) => {
    const success = await removeEmployeeFromGoal(assignedGoalId);
    if (success) {
      toast({ title: "Employee Removed" });
      onUpdate?.();
    } else {
      toast({ title: "Error", description: "Failed to remove employee.", variant: "destructive" });
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
                  <Edit className="h-4 w-4 mr-2" />Edit / Assign
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
            <Badge variant="outline">{activePeriodData.length} Active Today</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-grow">
          <Tabs value={selectedGoalType} onValueChange={setSelectedGoalType} className="w-full">
            <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 shadow-inner space-x-0.5">
              {activeGoalTypes.map((type) => {
                const isActive = selectedGoalType === type;

                return (
                  <TabsTrigger
                    key={type}
                    value={type}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 
                      data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
                      }`}
                  >
                    {/* Tab Content (Text and Count) */}
                    <span className="relative flex items-center">
                      {type}
                      <span
                        className={`ml-1 text-[10px] rounded-full h-4 w-4 flex items-center justify-center ${
                          isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {assignmentsByType[type].length}
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedGoalType} className="mt-4 space-y-4">
              {activePeriodData.length > 0 ? (
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
                        {activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.current_value || 0), 0)} / {activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.target_value || 0), 0)}
                      </span>
                      <span className="ml-1 text-gray-500">{goal.metric_unit || 'units'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(activePeriodData[0]?.activeInstance?.period_end)}</div>
                  </div>
                  
                  <Accordion type="single" collapsible defaultValue="employees" className="w-full">
                    <AccordionItem value="employees">
                      <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center">Assigned Employees<Badge variant="outline" className="ml-2">{activePeriodData.length}</Badge></div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="max-h-48 pr-3">
                          <div className="space-y-4">
                            {activePeriodData.map(({ assignment, activeInstance }) => {
                              if (!activeInstance) return null;
                              const employee = employeeMap.get(assignment.employee_id);
                              if (!employee) return null;
                              
                              return (
                                <div key={assignment.id} className="flex items-center gap-2">
                                  <div className="flex-grow">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                      <span className="font-medium text-gray-800 truncate pr-2">{employee.first_name} {employee.last_name}</span>
                                      <Badge variant="outline" className={`${getStatusColor(activeInstance.status)} text-xs`}>{activeInstance.status}</Badge>
                                    </div>
                                    <Progress value={activeInstance.progress || 0} className="h-1.5 mb-1" />
                                    <div className="text-xs text-gray-500 text-right">
                                      {activeInstance.current_value || 0} / {activeInstance.target_value || 0}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    {/* Simplified Dropdown - We can add more actions later if needed */}
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
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
                <p className="text-sm text-gray-500 text-center py-4">No assignments are active for today's period.</p>
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
      
      {/* --- REPLACED EDIT FORM WITH THE WIZARD --- */}
      {/* NOTE: We're reusing the wizard for a unified "Edit / Assign" experience */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
       <EditGoalFlow goal={goal} onClose={() => {
          setIsEditDialogOpen(false);
          onUpdate?.(); // This onUpdate prop is now critical to refresh the card
        }} />
      </Dialog>
    </>
  );
};

export default GoalCard;