
import React from "react";
import { Employee, GoalStatistics } from "@/types/goal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, BarChart3 } from "lucide-react";

interface GoalProgressTableProps {
  employee?: Employee;
  goalStats: GoalStatistics;
}

const GoalProgressTable: React.FC<GoalProgressTableProps> = ({ employee, goalStats }) => {
  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className="text-3xl font-bold">
            {goalStats.completionRate}%
          </div>
          <div className="text-sm text-gray-500">Overall Goal Completion</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              <span>Completed</span>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              {goalStats.completedGoals}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <span>In Progress</span>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              {goalStats.inProgressGoals}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span>Overdue</span>
            </div>
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              {goalStats.overdueGoals}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-md">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-amber-500 mr-2" />
              <span>Pending</span>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              {goalStats.pendingGoals}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressTable;
