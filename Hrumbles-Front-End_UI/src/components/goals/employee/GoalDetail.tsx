
import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  getGoalById, 
  addTrackingRecord, 
  getTrackingRecords,
  getGoalInstances,
  getActiveGoalInstance,
  getSubmissionOrOnboardingCounts
} from "@/lib/supabaseData";
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  BarChart3, 
  Target, 
  TrendingUp,
  Users,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Employee, GoalInstance, GoalWithDetails, TrackingRecord } from "@/types/goal";
import GoalInstanceList from "./GoalInstanceList";

const GoalDetail = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  
  // State from location or from user
  const employee: Employee = location.state?.employee || {
    id: user.id,
    name: `${user.first_name} ${user.last_name}`,
    position: user.position || "Employee",
    department: user.department,
    email: user.email,
    avatar: user.profile_picture_url,
  };

  // State for form values
  const [value, setValue] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  
  // State for selected instance
  const [selectedInstance, setSelectedInstance] = useState<GoalInstance | null>(null);
  
  // State for current value (for special goal types)
  const [currentValue, setCurrentValue] = useState<number>(0);

  // Fetch goal data
  const {
    data: goal,
    isLoading: isLoadingGoal,
    error: goalError,
  } = useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => getGoalById(goalId || ""),
    enabled: !!goalId,
  });
  
  // Fetch goal instances
  const {
    data: instances,
    isLoading: isLoadingInstances,
  } = useQuery({
    queryKey: ["goalInstances", goal?.assignmentDetails?.id],
    queryFn: () => getGoalInstances(goal?.assignmentDetails?.id || ""),
    enabled: !!goal?.assignmentDetails?.id,
  });

  // Fetch tracking records
  const {
    data: records,
    isLoading: isLoadingRecords,
  } = useQuery({
    queryKey: ["trackingRecords", goal?.assignmentDetails?.id],
    queryFn: () => getTrackingRecords(goal?.assignmentDetails?.id || ""),
    enabled: !!goal?.assignmentDetails?.id,
  });
  
  // Check if this is a special goal type (Submission or Onboarding)
  const isSpecialGoal = goal?.name === "Submission" || goal?.name === "Onboarding";
  
  // When instances are loaded, set the selected instance to the active one
  useEffect(() => {
    if (instances && instances.length > 0 && !selectedInstance) {
      // Find the current active instance
      const today = new Date().toISOString().split('T')[0];
      const activeInstance = instances.find(
        instance => 
          new Date(instance.periodStart) <= new Date(today) && 
          new Date(instance.periodEnd) >= new Date(today)
      );
      
      setSelectedInstance(activeInstance || instances[instances.length - 1]);
    }
  }, [instances, selectedInstance]);
  
  // Fetch current value for special goal types
  useEffect(() => {
    if (!isSpecialGoal || !goal || !selectedInstance) return;
    
    const fetchCurrentValue = async () => {
      try {
        const count = await getSubmissionOrOnboardingCounts(
          employee.id,
          goal.name,
          selectedInstance.periodStart,
          selectedInstance.periodEnd
        );
        
        console.log(`Fetched ${goal.name} count:`, count);
        setCurrentValue(count);
      } catch (error) {
        console.error("Error fetching current value:", error);
        setCurrentValue(0);
      }
    };
    
    fetchCurrentValue();
  }, [isSpecialGoal, goal?.name, selectedInstance, employee.id]);

  const addProgressMutation = useMutation({
    mutationFn: async () => {
      if (!goal?.assignmentDetails?.id) throw new Error("No assigned goal ID");
      
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error("Please enter a valid positive number");
      }

      return await addTrackingRecord(
        goal.assignmentDetails.id,
        numValue,
        `${selectedDate}T00:00:00Z`,
        notes || undefined
      );
    },
    onSuccess: () => {
      toast.success("Progress updated successfully");
      setValue("0");
      setNotes("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["trackingRecords", goal?.assignmentDetails?.id] });
      queryClient.invalidateQueries({ queryKey: ["goalInstances", goal?.assignmentDetails?.id] });
      queryClient.invalidateQueries({ queryKey: ["goal", goalId] });
      queryClient.invalidateQueries({ queryKey: ["employeeGoals", employee.id] });
    },
    onError: (error: Error) => {
      toast.error(`Error updating progress: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProgressMutation.mutate();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  if (isLoadingGoal) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p>Loading goal details...</p>
        </div>
      </div>
    );
  }

  if (goalError || !goal) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-500 mb-2">Error Loading Goal</h3>
          <p className="text-gray-500">
            There was a problem loading the goal details. Please try again later.
          </p>
          <Button onClick={handleGoBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in-progress":
        return <BarChart3 className="h-5 w-5 text-blue-500" />;
      case "overdue":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-amber-500" />;
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

  // Current instance to display (either selected or active)
  const displayInstance = selectedInstance || goal.activeInstance;

  // Get goal period text based on goal type
  const getGoalPeriodText = () => {
    const goalType = goal.assignmentDetails?.goalType || "Standard";
    
    if (displayInstance) {
      return `${goalType} Period: ${formatDate(displayInstance.periodStart)} - ${formatDate(displayInstance.periodEnd)}`;
    }
    
    return `${goalType} Goal`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          className="mr-4"
          onClick={handleGoBack}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{goal.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Left Side) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goal Overview Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <Badge className="mb-2">{goal.sector}</Badge>
                  <CardTitle className="text-xl">{goal.name}</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(displayInstance?.status || goal.assignmentDetails?.status || "pending")}
                >
                  <span className="flex items-center">
                    {getStatusIcon(displayInstance?.status || goal.assignmentDetails?.status || "pending")}
                    <span className="ml-1 capitalize">
                      {displayInstance?.status || goal.assignmentDetails?.status || "pending"}
                    </span>
                  </span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-gray-500 mb-4">{goal.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {getGoalPeriodText()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {goal.assignmentDetails?.goalType || "Standard"} Goal
                  </span>
                </div>
              </div>

              {isSpecialGoal && (
                <div className="bg-blue-50 p-4 mb-6 rounded-md border border-blue-100">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700">
                        <strong>Auto-calculated Goal</strong>
                      </p>
                      <p className="text-sm text-blue-600">
                        This {goal.name} goal tracks your performance automatically based on system records. 
                        As you process {goal.name.toLowerCase()}s, your progress will update automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-medium">
                    {Math.round(displayInstance?.progress || goal.assignmentDetails?.progress || 0)}%
                  </span>
                </div>
                <Progress
                  value={displayInstance?.progress || goal.assignmentDetails?.progress || 0}
                  className="h-3"
                />

                <div className="bg-muted/30 rounded-md p-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Current Value</p>
                      <p className="text-2xl font-semibold">
                        {isSpecialGoal ? currentValue : displayInstance?.currentValue || goal.assignmentDetails?.currentValue || 0}{" "}
                        <span className="text-sm text-gray-500">{goal.metricUnit}</span>
                      </p>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Target Value</p>
                      <p className="text-2xl font-semibold">
                        {displayInstance?.targetValue || goal.assignmentDetails?.targetValue || goal.targetValue}{" "}
                        <span className="text-sm text-gray-500">{goal.metricUnit}</span>
                      </p>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Remaining</p>
                      <p className="text-2xl font-semibold">
                        {Math.max(
                          0,
                          (displayInstance?.targetValue || goal.assignmentDetails?.targetValue || goal.targetValue) -
                            (isSpecialGoal ? currentValue : (displayInstance?.currentValue || goal.assignmentDetails?.currentValue || 0))
                        )}{" "}
                        <span className="text-sm text-gray-500">{goal.metricUnit}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Progress Form - Only show for non-special goals */}
          {!isSpecialGoal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Update Progress for Current {goal.assignmentDetails?.goalType || ""} Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium block mb-1" htmlFor="value">
                        Value ({goal.metricUnit})
                      </label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1" htmlFor="date">
                        Date
                      </label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">
                        &nbsp;
                      </label>
                      <Button
                        type="submit"
                        disabled={addProgressMutation.isPending}
                        className="w-full"
                      >
                        {addProgressMutation.isPending ? "Updating..." : "Add Progress"}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1" htmlFor="notes">
                      Notes (optional)
                    </label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this progress update"
                      className="w-full"
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {/* Info Card for Special Goals */}
          {isSpecialGoal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Automatic Progress Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium mb-2">How this works</p>
                  <p className="text-gray-600 text-sm mb-4">
                    This {goal.name} goal is automatically tracked based on your activity:
                  </p>
                  
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                    <li>
                      Your progress is calculated based on the number of {goal.name.toLowerCase()}s 
                      you've processed during the current period.
                    </li>
                    <li>
                      The system automatically counts your {goal.name.toLowerCase()}s and updates your 
                      progress toward the target.
                    </li>
                    <li>
                      As you process more {goal.name.toLowerCase()}s, your progress will update automatically 
                      without requiring manual input.
                    </li>
                    <li>
                      Automatic updates may take a few minutes to reflect in your dashboard.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Progress Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                {isSpecialGoal 
                  ? `Recent ${goal.name} Records` 
                  : "Recent Progress Records"
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRecords ? (
                <div className="text-center py-4">
                  <p>Loading records...</p>
                </div>
              ) : records && records.length > 0 ? (
                <div className="space-y-4">
                  {records.map((record: TrackingRecord) => (
                    <div
                      key={record.id}
                      className="border rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium">
                          {record.value} {goal.metricUnit}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(record.recordDate)}
                        </div>
                      </div>
                      {record.notes && <p className="text-sm text-gray-600">{record.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No progress records yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Goal Instances and Details (Right Side) */}
        <div className="space-y-6">
          {/* Goal Instances List */}
          {instances && instances.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {goal.assignmentDetails?.goalType || "Goal"} Periods
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <GoalInstanceList 
                  instances={instances}
                  onSelectInstance={setSelectedInstance}
                  activeInstanceId={selectedInstance?.id}
                  metricUnit={goal.metricUnit}
                />
              </CardContent>
            </Card>
          )}

          {/* Assigned To */}
          {goal.assignedTo && goal.assignedTo.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {goal.assignedTo.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalDetail;
