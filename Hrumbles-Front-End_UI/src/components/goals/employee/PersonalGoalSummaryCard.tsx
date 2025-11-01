import React, { useState, useMemo } from "react";
import { Link } from 'react-router-dom';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Target, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GoalWithDetails, AssignedGoal, Employee, GoalInstance } from '@/types/goal';
import { cn } from '@/lib/utils';

interface PersonalGoalSummaryCardProps {
  goal: GoalWithDetails;
  employee: Employee;
}

const PersonalGoalSummaryCard: React.FC<PersonalGoalSummaryCardProps> = ({ goal, employee }) => {
  const assignmentsForEmployee = useMemo(() => 
    (goal.assignments || []).filter(a => a.employee_id === employee.id), 
    [goal.assignments, employee.id]
  );

  const assignmentsByType = useMemo(() => {
    const groups: Record<string, AssignedGoal[]> = { Daily: [], Weekly: [], Monthly: [], Yearly: [] };
    assignmentsForEmployee.forEach(assignment => {
      if (groups[assignment.goal_type]) {
        groups[assignment.goal_type].push(assignment);
      }
    });
    return groups;
  }, [assignmentsForEmployee]);

  const activeGoalTypes = useMemo(() => Object.keys(assignmentsByType).filter(type => assignmentsByType[type].length > 0), [assignmentsByType]);
  const [selectedGoalType, setSelectedGoalType] = useState<string>(activeGoalTypes[0] || 'Daily');
  
  const activePeriodData = useMemo(() => {
    const today = new Date();
    return (assignmentsByType[selectedGoalType] || []).map(assignment => {
      const activeInstance = (assignment.instances || []).find(inst => 
        isWithinInterval(today, { start: startOfDay(new Date(inst.period_start)), end: endOfDay(new Date(inst.period_end)) })
      );
      return { assignment, activeInstance };
    }).filter(item => item.activeInstance);
  }, [assignmentsByType, selectedGoalType]);
  
  const overallProgress = useMemo(() => {
    if (activePeriodData.length === 0) return 0;
    const totalTarget = activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.target_value || 0), 0);
    const totalCurrent = activePeriodData.reduce((sum, data) => sum + (data.activeInstance?.current_value || 0), 0);
    if (totalTarget === 0) return 0;
    return Math.min(Math.round((totalCurrent / totalTarget) * 100), 100);
  }, [activePeriodData]);

  const formatDate = (dateStr?: string) => dateStr ? format(new Date(dateStr), "MMM d, yyyy") : "N/A";
  const getStatusColor = (status: string) => { /* Paste your getStatusColor function here */ };

  if (assignmentsForEmployee.length === 0) return null;

  return (
    <Card className="flex flex-col h-full transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold">{goal.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary">{goal.sector || 'General'}</Badge>
          {activePeriodData.length > 0 && <Badge variant="outline">Active Today</Badge>}
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <Tabs value={selectedGoalType} onValueChange={setSelectedGoalType} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${activeGoalTypes.length || 1}, 1fr)`}}>
            {activeGoalTypes.map(type => (<TabsTrigger key={type} value={type} className="text-xs">{type}</TabsTrigger>))}
          </TabsList>
          <TabsContent value={selectedGoalType} className="mt-4 space-y-4">
            {activePeriodData.length > 0 ? (
              activePeriodData.map(({ assignment, activeInstance }) => (
                <div key={assignment.id}>
                  <div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                      <span>Overall Progress ({selectedGoalType})</span>
                      <span className="font-semibold text-gray-700">{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                  <div className="mt-4 text-sm flex justify-between items-center bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center text-gray-600">
                      <Target className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">
                        {activeInstance?.current_value || 0} / {activeInstance?.target_value || 0}
                      </span>
                      <span className="ml-1 text-gray-500">{goal.metric_unit || 'units'}</span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(activeInstance?.period_end)}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No active assignments for today's period.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PersonalGoalSummaryCard;