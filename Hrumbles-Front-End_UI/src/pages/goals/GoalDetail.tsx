
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  BarChart3, 
  ChevronLeft, 
  Target, 
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProgressTracker from "@/components/goals/goals/ProgressTracker";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { GoalWithDetails, TrackingRecord } from "@/types/goal";
import { getGoalById, getTrackingRecordsForGoal } from "@/lib/supabaseData";

interface EmployeeProgressProps {
  employee: {
    id: string;
    name: string;
    avatar?: string;
  };
  goalId: string;
}

const EmployeeProgress: React.FC<EmployeeProgressProps> = ({ employee, goalId }) => {
  const [trackingRecords, setTrackingRecords] = useState<TrackingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrackingRecords = async () => {
      try {
        setIsLoading(true);
        // We would need to implement this function to get tracking records by employee
        const records = await getTrackingRecordsForGoal(goalId, employee.id);
        setTrackingRecords(records);
      } catch (error) {
        console.error("Error fetching tracking records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackingRecords();
  }, [goalId, employee.id]);

  if (isLoading) {
    return <div className="text-center py-4">Loading progress data...</div>;
  }

  if (trackingRecords.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-gray-600">No tracking records found for this employee.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={employee.avatar} alt={employee.name} />
          <AvatarFallback>
            {employee.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{employee.name}</h3>
        </div>
      </div>

      <div className="space-y-3">
        {trackingRecords.map((record) => (
          <Card key={record.id} className="border-l-4 border-l-blue-500">
            <CardContent className="py-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(record.recordDate), "MMM d, yyyy")}
                  </p>
                  <p className="font-medium mt-1">Value: {record.value}</p>
                  {record.notes && <p className="text-sm mt-1">{record.notes}</p>}
                </div>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                  {format(parseISO(record.createdAt), "h:mm a")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const GoalDetail: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  

  useEffect(() => {
    const fetchGoalData = async () => {
      if (!goalId) {
        navigate("/goals");
        return;
      }

      try {
        setIsLoading(true);
        const goalData = await getGoalById(goalId);
        
        if (!goalData) {
          navigate("/goals");
          return;
        }
        
        setGoal(goalData);
      } catch (error) {
        console.error("Error fetching goal data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoalData();
  }, [goalId, navigate]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "MMMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getSectorColor = (sector: string) => {
    switch (sector?.toLowerCase()) {
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
        return <Clock className="h-5 w-5 mr-2" />;
      case "weekly":
        return <Calendar className="h-5 w-5 mr-2" />;
      case "monthly":
        return <Target className="h-5 w-5 mr-2" />;
      case "yearly":
        return <BarChart3 className="h-5 w-5 mr-2" />;
      default:
        return <Target className="h-5 w-5 mr-2" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">Loading goal details...</div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Goal Not Found</h2>
            <p className="text-gray-600 mb-6">The goal you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/goals")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button 
          variant="ghost" 
          className="mb-6 flex items-center"
          onClick={() => navigate("/goals")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Goals
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <AnimatedCard animation="fade" className="bg-white p-6 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Badge variant="outline" className={getSectorColor(goal.sector)}>
                    {goal.sector}
                  </Badge>
                  <h1 className="text-2xl md:text-3xl font-bold mt-3">{goal.name}</h1>
                </div>
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
              
              <p className="text-gray-600 mb-6">{goal.description}</p>
              
              {goal.assignmentDetails && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    {getGoalTypeIcon(goal.assignmentDetails.goalType)}
                    <span className="font-medium">{goal.assignmentDetails.goalType} Goal</span>
                  </div>
                  
                  <ProgressTracker
                    progress={goal.assignmentDetails.progress}
                    size="lg"
                    showPercentage={true}
                  />
                  
                  <div className="mt-3 flex justify-between text-sm">
                    <div>
                      <span className="text-gray-500">Current: </span>
                      <span className="font-medium">{goal.assignmentDetails.currentValue}{goal.metricUnit}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Target: </span>
                      <span className="font-medium">{goal.assignmentDetails.targetValue}{goal.metricUnit}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Time Frame</h3>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{formatDate(goal.startDate)} - {formatDate(goal.endDate)}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Metric Type</h3>
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-gray-400" />
                    <span>{goal.metricType} ({goal.metricUnit})</span>
                  </div>
                </div>
              </div>
            </AnimatedCard>
            
            {goal.assignedTo && goal.assignedTo.length > 0 && (
              <AnimatedCard animation="fade" delay={100} className="bg-white p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Assigned Employees Progress
                </h2>
                
                <Tabs defaultValue={goal.assignedTo[0].id}>
                  <TabsList className="mb-4">
                    {goal.assignedTo.map((employee) => (
                      <TabsTrigger key={employee.id} value={employee.id}>
                        {employee.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {goal.assignedTo.map((employee) => (
                    <TabsContent key={employee.id} value={employee.id}>
                      <EmployeeProgress employee={employee} goalId={goal.id} />
                    </TabsContent>
                  ))}
                </Tabs>
              </AnimatedCard>
            )}
          </div>
          
          <div>
            <AnimatedCard animation="fade" delay={200} className="bg-white p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Assigned To</h2>
              
              {goal.assignedTo && goal.assignedTo.length > 0 ? (
                <div className="space-y-4">
                  {goal.assignedTo.map((employee) => (
                    <div key={employee.id} className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={employee.avatar} alt={employee.name} />
                        <AvatarFallback>
                          {employee.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-500">{employee.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">This goal hasn't been assigned to any employees yet.</p>
              )}
            </AnimatedCard>
            
            <AnimatedCard animation="fade" delay={300} className="bg-white p-6">
              <h2 className="text-xl font-bold mb-4">Goal Summary</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p>{formatDate(goal.createdAt)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={getStatusColor(goal.assignmentDetails?.status || 'pending')}
                    >
                      {goal.assignmentDetails?.status
                        ? goal.assignmentDetails.status.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())
                        : "Pending"}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Department</h3>
                  <div className="mt-1">
                    <Badge variant="outline" className={getSectorColor(goal.sector)}>
                      {goal.sector}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Latest Update</h3>
                  <p>{formatDate(goal.assignmentDetails?.updated_at || goal.updatedAt || goal.createdAt)}</p>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GoalDetail;
