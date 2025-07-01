
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoalInstance } from "@/types/goal";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  TrendingUp 
} from "lucide-react";
import { format } from 'date-fns';

interface GoalInstanceListProps {
  instances: GoalInstance[];
  onSelectInstance: (instance: GoalInstance) => void;
  activeInstanceId?: string;
  metricUnit: string;
}

const GoalInstanceList: React.FC<GoalInstanceListProps> = ({
  instances,
  onSelectInstance,
  activeInstanceId,
  metricUnit
}) => {
  // Sort instances by date (latest first)
  const sortedInstances = [...instances].sort(
    (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
  );

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-6">
            <p className="text-gray-500">No goal time periods found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in-progress':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 flex items-center mb-2">
        <Calendar className="h-4 w-4 mr-1" /> Goal Periods
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {sortedInstances.map((instance) => {
          const isActive = instance.id === activeInstanceId;
          const formattedStartDate = format(new Date(instance.periodStart), 'MMM d, yyyy');
          const formattedEndDate = format(new Date(instance.periodEnd), 'MMM d, yyyy');
          
          return (
            <Card 
              key={instance.id} 
              className={`border transition-shadow cursor-pointer ${
                isActive ? 'ring-2 ring-primary border-primary/50 shadow-md' : ''
              }`}
              onClick={() => onSelectInstance(instance)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getStatusColor(instance.status)}>
                        <span className="flex items-center">
                          {getStatusIcon(instance.status)}
                          <span className="ml-1 capitalize">{instance.status}</span>
                        </span>
                      </Badge>
                      
                      {isActive && (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          Current Period
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm flex items-center text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formattedStartDate === formattedEndDate ? 
                        formattedStartDate : 
                        `${formattedStartDate} - ${formattedEndDate}`
                      }
                    </div>
                    
                    <div className="flex items-center mt-2 space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {instance.currentValue} / {instance.targetValue} {metricUnit}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <Progress value={instance.progress} />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs font-semibold">
                      {Math.round(instance.progress)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default GoalInstanceList;
