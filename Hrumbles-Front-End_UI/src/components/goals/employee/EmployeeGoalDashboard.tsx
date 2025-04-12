import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployeeGoals } from "@/lib/supabaseData";
import { Employee, GoalWithDetails } from "@/types/goal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmployeeGoalCard from "@/components/goals/employee/EmployeeGoalCard";
import { BarChart3, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface EmployeeGoalDashboardProps {
  employee?: Employee; // Make employee optional
}

const EmployeeGoalDashboard: React.FC<EmployeeGoalDashboardProps> = ({ employee }) => {
  const user = useSelector((state: any) => state.auth.user);
  const [activeTab, setActiveTab] = useState("all");

  const employeeId = employee?.id || user.id; // Use employee.id if provided, otherwise use user.id

  const {
    data: goals,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employeeGoals", employeeId],
    queryFn: () => getEmployeeGoals(employeeId),
  });

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-500 mb-2">Error Loading Goals</h3>
            <p className="text-gray-500">
              There was a problem loading this employee's goals. Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sectors = goals
    ? [...new Set(goals.map((goal) => goal.sector))]
    : [];

  const getGoalsByStatus = (status: string) => {
    if (!goals) return [];
    if (status === "all") return goals;
    return goals.filter(
      (goal) => goal.assignmentDetails?.status.toLowerCase() === status.toLowerCase()
    );
  };

  const getGoalsBySector = (sector: string) => {
    if (!goals) return [];
    return goals.filter((goal) => goal.sector === sector);
  };

  const getStatusCounts = () => {
    if (!goals) return { pending: 0, "in-progress": 0, completed: 0, overdue: 0 };
    
    return goals.reduce(
      (counts, goal) => {
        const status = goal.assignmentDetails?.status || "pending";
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
  };
  
  const statusCounts = getStatusCounts();

  const renderStatusCards = () => {
    const statusInfo = [
      {
        status: "pending",
        label: "Pending",
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        color: "text-amber-500",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      },
      {
        status: "in-progress",
        label: "In Progress",
        icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      },
      {
        status: "completed",
        label: "Completed",
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        color: "text-green-500",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      },
      {
        status: "overdue",
        label: "Overdue",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        color: "text-red-500",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusInfo.map((info) => (
          <Card 
            key={info.status}
            className={`border ${info.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => setActiveTab(info.status)}
          >
            <CardContent className={`p-4 ${info.bgColor}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm font-medium ${info.color}`}>
                    {info.label}
                  </p>
                  <h4 className="text-2xl font-bold mt-1">
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      statusCounts[info.status] || 0
                    )}
                  </h4>
                </div>
                {info.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderStatusCards()}
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList className="mb-0">
            <TabsTrigger value="all">All Goals</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
            {sectors.map((sector) => (
              <Badge 
                key={sector} 
                variant="outline" 
                className="cursor-pointer"
                onClick={() => setActiveTab(sector)}
              >
                {sector}
              </Badge>
            ))}
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <GoalsList goals={goals} isLoading={isLoading} employee={employee || user} />
        </TabsContent>
        
        <TabsContent value="pending" className="mt-0">
          <GoalsList goals={getGoalsByStatus("pending")} isLoading={isLoading} employee={employee || user} />
        </TabsContent>
        
        <TabsContent value="in-progress" className="mt-0">
          <GoalsList goals={getGoalsByStatus("in-progress")} isLoading={isLoading} employee={employee || user} />
        </TabsContent>
        
        <TabsContent value="completed" className="mt-0">
          <GoalsList goals={getGoalsByStatus("completed")} isLoading={isLoading} employee={employee || user} />
        </TabsContent>
        
        <TabsContent value="overdue" className="mt-0">
          <GoalsList goals={getGoalsByStatus("overdue")} isLoading={isLoading} employee={employee || user} />
        </TabsContent>
        
        {sectors.map((sector) => (
          <TabsContent key={sector} value={sector} className="mt-0">
            <GoalsList
              goals={getGoalsBySector(sector)}
              isLoading={isLoading}
              employee={employee || user}
              title={`${sector} Goals`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface GoalsListProps {
  goals?: GoalWithDetails[];
  isLoading: boolean;
  employee: Employee;
  title?: string;
}

const GoalsList: React.FC<GoalsListProps> = ({ 
  goals = [], 
  isLoading, 
  employee, 
  title 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No goals found in this category</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => (
          <EmployeeGoalCard
            key={goal.id}
            goal={goal}
            employee={employee}
          />
        ))}
      </div>
    </div>
  );
};

export default EmployeeGoalDashboard;