// src/components/goals/employee/GoalInstanceTable.tsx

import React from 'react';
import { GoalInstance } from '@/types/goal';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, BarChart, AlertCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

interface GoalInstanceTableProps {
  instances: GoalInstance[];
  metricUnit: string;
}

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

const GoalInstanceTable: React.FC<GoalInstanceTableProps> = ({ instances, metricUnit }) => {
  if (!instances || instances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Data</CardTitle>
          <CardDescription>A detailed breakdown of your performance in each period.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No data available for the selected filter.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Data</CardTitle>
        <CardDescription>A detailed breakdown of your performance in each period.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {instances.map((instance) => {
            const periodStr = `${format(new Date(instance.periodStart), 'MMM d, yyyy')} - ${format(new Date(instance.periodEnd), 'MMM d, yyyy')}`;
            const status = instance.status || 'pending';

            return (
              <div key={instance.id} className="p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="mb-2">
                      <div className="font-medium">{periodStr}</div>
                      <div className="text-sm text-gray-500">Goal Period</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className={getStatusColor(status)}>
                      <span className="flex items-center">
                        {getStatusIcon(status)}
                        <span className="capitalize">{status}</span>
                      </span>
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-500">Target Value</div>
                    <div className="font-semibold">
                      {instance.targetValue} {metricUnit}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Current Value</div>
                    <div className="font-semibold">
                      {instance.currentValue} {metricUnit}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Progress</div>
                    <div className="space-y-1 mt-1">
                      <Progress value={instance.progress || 0} className="h-2" />
                      <div className="text-xs font-semibold text-right">{Math.round(instance.progress || 0)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalInstanceTable;