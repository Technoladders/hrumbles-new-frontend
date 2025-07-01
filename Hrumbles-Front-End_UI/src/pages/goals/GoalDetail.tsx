
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Target, 
  BarChart, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Edit,
  PlusCircle,
  Trash2,
  Info
} from "lucide-react";
import { 
  format, 
  parseISO 
} from "date-fns";
import { GoalWithDetails, Employee, AssignedGoal } from "@/types/goal";
import { getGoalById, updateGoalProgress, addTrackingRecord, getSubmissionOrOnboardingCounts } from "@/lib/supabaseData";
import GoalInstanceList from "@/components/goals/employee/GoalInstanceList";
import GoalProgressForm from "@/components/goals/employee/GoalProgressForm";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>();
  const [currentTab, setCurrentTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState<number | string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const initialEmployee = location.state?.employee;
  
  // Check if this is a special goal type (Submission or Onboarding)
  const isSpecialGoal = goal?.name === "Submission" || goal?.name === "Onboarding";

  useEffect(() => {
    if (id) {
      fetchGoalDetails();
    }
  }, [id]);

  const fetchGoalDetails = async () => {
    setLoading(true);
    try {
      const goalData = await getGoalById(id as string);
      if (goalData) {
        setGoal(goalData);
        if (goalData.activeInstance) {
          setSelectedInstanceId(goalData.activeInstance.id);
        }
      } else {
        console.error("Goal not found");
      }
    } catch (error) {
      console.error("Error fetching goal details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceSelect = (instance: any) => {
    setSelectedInstanceId(instance.id);
  };

  const handleGoBack = () => {
    if (initialEmployee) {
      navigate("/goals/employee");
    } else {
      navigate("/goals");
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
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "in-progress":
        return <BarChart className="h-4 w-4 mr-1" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  // Handler for updating target value
  const handleUpdateTarget = async () => {
    if (!goal || !selectedAssignmentId) return;
    
    const targetValue = Number(editTarget);
    if (isNaN(targetValue) || targetValue <= 0) {
      toast.error("Please enter a valid target value");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('hr_assigned_goals')
        .update({ 
          target_value: targetValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAssignmentId);
      
      if (error) {
        toast.error("Failed to update target value");
        console.error("Error updating target value:", error);
        return;
      }
      
      toast.success("Target value updated successfully");
      setEditMode(false);
      setIsDialogOpen(false);
      
      // Refresh goal details
      fetchGoalDetails();
    } catch (error) {
      toast.error("An error occurred while updating target value");
      console.error("Error in handleUpdateTarget:", error);
    }
  };

  // Add a new employee assignment
  const handleAddEmployeeAssignment = async () => {
    // Implementation pending - This would open a dialog to select an employee and assign a new target
    toast.info("This feature is coming soon");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <Skeleton className="h-64 w-full mb-6" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Goal Not Found</h2>
          <p className="text-gray-500 mb-6">The goal you're looking for doesn't exist or has been removed.</p>
          <Button onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Find the active instance or the first assignment if no instances
  const activeInstance = goal.activeInstance || (goal.instances && goal.instances.length > 0 ? goal.instances[0] : undefined);
  
  // Calculate aggregated values from all assignments
  const totalTargetValue = goal.assignments?.reduce((sum, a) => sum + a.targetValue, 0) || 0;
  const totalCurrentValue = goal.assignments?.reduce((sum, a) => sum + a.currentValue, 0) || 0;
  const overallProgress = totalTargetValue > 0 
    ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="mb-4 pl-0 hover:bg-transparent hover:underline -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{goal.name}</h1>
          <p className="text-gray-500 mt-1">{goal.description}</p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          <Badge variant="outline" className={getStatusColor(goal.overallProgress === 100 ? "completed" : "in-progress")}>
            {goal.overallProgress === 100 ? "Completed" : "In Progress"}
          </Badge>
          <Badge variant="secondary">{goal.sector}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Goal Overview</span>
                <div>
                  {!isSpecialGoal && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mr-2"
                      onClick={handleAddEmployeeAssignment}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Employee
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Goal
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {isSpecialGoal && (
                <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-100">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700">
                        <strong>Auto-calculated Goal</strong>
                      </p>
                      <p className="text-sm text-blue-600">
                        This {goal.name} goal is automatically calculated based on the number of records in the system. 
                        Manual progress updates are disabled.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Target
                  </h3>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Overall Target:</span>
                    <span className="font-medium">{totalTargetValue} {goal.metricUnit}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Current Progress:</span>
                    <span className="font-medium">{totalCurrentValue} {goal.metricUnit}</span>
                  </div>
                  <div className="mt-3">
                    <Progress value={overallProgress} />
                    <div className="flex justify-end mt-1">
                      <span className="text-xs font-medium">{overallProgress}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Assigned To
                  </h3>
                  {goal.assignedTo && goal.assignedTo.length > 0 ? (
                    <div className="space-y-2">
                      {goal.assignedTo.map((employee) => (
                        <div 
                          key={employee.id}
                          className="flex justify-between items-center p-2 rounded-md border hover:bg-gray-50"
                        >
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium mr-2">
                              {employee.avatar ? (
                                <img 
                                  src={employee.avatar} 
                                  alt={employee.name} 
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                employee.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-xs text-gray-500">{employee.position}</div>
                            </div>
                          </div>
                          <div>
                            {goal.assignments?.find(a => a.employeeId === employee.id)?.targetValue ?? 0} {goal.metricUnit}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No employees assigned</p>
                  )}
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <h3 className="font-semibold mb-4 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Individual Assignments
              </h3>
              
              <div className="space-y-4">
                {goal.assignments?.map((assignment) => {
                  const employee = goal.assignedTo?.find(e => e.id === assignment.employeeId);
                  
                  return (
                    <div key={assignment.id} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium mr-2">
                              {employee?.avatar ? (
                                <img 
                                  src={employee.avatar} 
                                  alt={employee.name} 
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                employee?.name.slice(0, 2).toUpperCase() || "NA"
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{employee?.name || "Unknown"}</div>
                              <div className="text-sm text-gray-500">
                                {assignment.goalType} Goal
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className={getStatusColor(assignment.status)}>
                            <span className="flex items-center">
                              {getStatusIcon(assignment.status)}
                              <span className="capitalize">{assignment.status}</span>
                            </span>
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <div className="text-sm text-gray-500">Target Value</div>
                          <div className="font-semibold flex items-center">
                            {assignment.targetValue} {goal.metricUnit}
                            {!isSpecialGoal && (
                              <Dialog open={isDialogOpen && selectedAssignmentId === assignment.id} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) setSelectedAssignmentId(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="ml-2 h-6 w-6 p-0"
                                    onClick={() => {
                                      setSelectedAssignmentId(assignment.id);
                                      setEditTarget(assignment.targetValue);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Update Target Value</DialogTitle>
                                    <DialogDescription>
                                      Change the target value for {employee?.name || "this employee"}.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="target">Target Value ({goal.metricUnit})</Label>
                                      <Input
                                        id="target"
                                        type="number"
                                        min="1"
                                        value={editTarget}
                                        onChange={(e) => setEditTarget(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleUpdateTarget}>Save Changes</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Current Value</div>
                          <div className="font-semibold">
                            {assignment.currentValue} {goal.metricUnit}
                            {isSpecialGoal && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 inline-block ml-1 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Auto-calculated from {goal.name} records
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Progress</div>
                          <div className="space-y-1 mt-1">
                            <Progress value={assignment.progress} className="h-2" />
                            <div className="text-xs font-semibold text-right">{Math.round(assignment.progress)}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {initialEmployee && !isSpecialGoal && (
            <Card>
              <CardHeader>
                <CardTitle>Update Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalProgressForm 
                  goal={goal}
                  onProgressUpdate={fetchGoalDetails}
                />
              </CardContent>
            </Card>
          )}
          
          {initialEmployee && isSpecialGoal && (
            <Card>
              <CardHeader>
                <CardTitle>Automatic Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium mb-2">This {goal.name} goal is automatically tracked</p>
                      <p className="text-gray-600 text-sm">
                        Progress for this goal is automatically calculated based on the number of {goal.name.toLowerCase()} 
                        records in the system. As you process {goal.name.toLowerCase()}s, your progress will update automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {goal.instances && goal.instances.length > 0 && initialEmployee && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Time Periods</CardTitle>
              </CardHeader>
              <CardContent>
                <GoalInstanceList
                  instances={goal.instances}
                  onSelectInstance={handleInstanceSelect}
                  activeInstanceId={selectedInstanceId}
                  metricUnit={goal.metricUnit}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalDetail;
