// src/components/goals/employee/EmployeeGoalCard.tsx

import React, { useState, useMemo, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Employee, GoalWithDetails, GoalInstance, AssignmentDetails } from "@/types/goal";
import { Target, Calendar } from "lucide-react";

interface EmployeeGoalCardProps {
  goal: GoalWithDetails;
  employee: Employee;
  onUpdate: () => void;
}

const EmployeeGoalCard: React.FC<EmployeeGoalCardProps> = ({ goal, employee, onUpdate }) => {
  const { toast } = useToast();

  // Find all unique, active goal types for this goal
  const activeGoalTypes = useMemo(() => {
    const types = new Set(goal.assignmentDetails?.map(ad => ad.goalType));
    return ["Daily", "Weekly", "Monthly", "Yearly"].filter(type => types.has(type));
  }, [goal.assignmentDetails]);
  
  const [selectedGoalType, setSelectedGoalType] = useState<string>(activeGoalTypes[0] || "");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newProgressValue, setNewProgressValue] = useState<number | string>("");

  // Find the active instance for today based on the selected goal type
  const activeInstance: GoalInstance | undefined = useMemo(() => {
    const today = new Date();
    const assignmentForType = goal.assignmentDetails?.find(ad => ad.goalType === selectedGoalType);
    if (!assignmentForType) return undefined;

    return (goal.instances || []).find(inst =>
      inst.assignedGoalId === assignmentForType.id &&
      isWithinInterval(today, {
        start: startOfDay(new Date(inst.periodStart)),
        end: endOfDay(new Date(inst.periodEnd))
      })
    );
  }, [goal.instances, goal.assignmentDetails, selectedGoalType]);
  
  // Set the initial value for the dialog input when it opens
  useEffect(() => {
    if (activeInstance) {
      setNewProgressValue(activeInstance.currentValue || 0);
    }
  }, [activeInstance]);


  const handleUpdateProgress = async () => {
    if (!activeInstance) {
        toast({ title: "Error", description: "No active goal period found.", variant: "destructive" });
        return;
    }
    
    const numericValue = typeof newProgressValue === 'string' ? parseFloat(newProgressValue) : newProgressValue;
    if (isNaN(numericValue) || numericValue < 0) {
        toast({ title: "Invalid Input", description: "Please enter a valid positive number.", variant: "destructive" });
        return;
    }

    const { error } = await supabase
      .from("hr_goal_instances")
      .update({
        current_value: numericValue,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeInstance.id);

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Progress Updated", description: `Your progress for "${goal.name}" has been saved.` });
      setIsUpdateDialogOpen(false);
      onUpdate(); // This calls the 'refetch' function from the parent dashboard
    }
  };

  const progress = activeInstance?.targetValue ? Math.min(Math.round(((activeInstance.currentValue || 0) / activeInstance.targetValue) * 100), 100) : 0;
  const formatDate = (dateStr?: string) => dateStr ? format(new Date(dateStr), "MMM d") : "N/A";
  
  const isAutomatedGoal = goal.name === "Submission" || goal.name === "Onboarding" || goal.is_automated;

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <div className="flex justify-between items-start">
             <Link to={`/my-goals/${goal.id}`} state={{ employee }}>
            <CardTitle className="text-lg font-bold">{goal.name}</CardTitle>
            </Link>
            <Badge variant="secondary">{goal.sector || 'General'}</Badge>
          </div>
          <p className="text-sm text-gray-500 pt-1 h-10 overflow-hidden">{goal.description}</p>
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
                        {goal.assignmentDetails?.filter(ad => ad.goalType === type).length || 0}
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedGoalType} className="mt-4 space-y-4">
              {activeInstance ? (
                <>
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                      <span>Current Period Progress</span>
                      <span className="font-semibold text-gray-700">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="text-sm flex justify-between items-center bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center text-gray-600">
                      <Target className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">{activeInstance.currentValue || 0} / {activeInstance.targetValue}</span>
                      <span className="ml-1 text-gray-500">{goal.metricUnit || 'units'}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(activeInstance.periodStart)} - {formatDate(activeInstance.periodEnd)}
                    </div>
                  </div>
                  {isAutomatedGoal && (
                    <p className="text-xs text-blue-600 italic mt-2 text-center">
                        *This goal's progress is updated automatically.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                    <p className="text-sm text-gray-500">No goal period active for today.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter>
            <Button className="w-full" onClick={() => setIsUpdateDialogOpen(true)} disabled={true}>
              Update Progress
            </Button>
        </CardFooter>
      </Card>
      
      {/* Update Progress Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress for {goal.name}</DialogTitle>
            <DialogDescription>
              Enter your current progress for the period of {formatDate(activeInstance?.periodStart)} to {formatDate(activeInstance?.periodEnd)}. Your target is {activeInstance?.targetValue} {goal.metricUnit}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="progressValue">Current Value</Label>
            <Input
                id="progressValue"
                type="number"
                value={newProgressValue}
                onChange={(e) => setNewProgressValue(e.target.value)}
                placeholder={`e.g., ${activeInstance?.targetValue || 100}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProgress}>Save Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeGoalCard;