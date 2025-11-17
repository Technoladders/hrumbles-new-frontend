import React, { useState, useMemo } from 'react';
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assignGoalToEmployees, createGoal } from "@/lib/supabaseData";
import { Employee, EmployeeGoalTarget, Goal, GoalType } from "@/types/goal";
import { format } from "date-fns";
import { DialogFooter } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { GoalDefinition } from './CreateAndAssignGoalWizard';

interface Step3Props {
  goalDefinition: GoalDefinition;
  department: string;
  period: { type: GoalType, start: Date, end: Date };
  onBack: () => void;
  onSuccess: () => void;
  onCancel: () => void;
}

const Step3_AssignEmployees: React.FC<Step3Props> = ({ goalDefinition, department, period, onBack, onSuccess, onCancel }) => {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeTargets, setEmployeeTargets] = useState<Map<string, number | undefined>>(new Map());
  const queryClient = useQueryClient();

  const { data: allEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await supabase.from('hr_employees').select(`id, first_name, last_name, hr_departments(name)`)).data?.map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, department: e.hr_departments?.name })) || []
  });

  const filteredEmployees = useMemo(() => allEmployees.filter(e => e.department === department), [allEmployees, department]);
  
  const handleEmployeeSelection = (employeeId: string) => {
    const employee = filteredEmployees.find(e => e.id === employeeId);
    if (employee && !selectedEmployees.some(e => e.id === employeeId)) {
      setSelectedEmployees(prev => [...prev, employee]);
      setEmployeeTargets(prev => new Map(prev.set(employee.id, goalDefinition.targetValue || 0)));
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== employeeId));
    setEmployeeTargets(prev => { const newMap = new Map(prev); newMap.delete(employeeId); return newMap; });
  };

  const handleTargetChange = (employeeId: string, value: string) => {
    setEmployeeTargets(prev => new Map(prev.set(employeeId, parseFloat(value) || 0)));
  };

 const assignGoalsMutation = useMutation({
    mutationFn: async () => {
      if (selectedEmployees.length === 0) throw new Error("Please select at least one employee.");

      let finalGoalId: string;

      // --- THE CORE LOGIC CHANGE ---
      if (goalDefinition.type === 'new' && goalDefinition.payload) {
        // Step 3A: Create the new goal first
        const newGoal = await createGoal(goalDefinition.payload);
        if (!newGoal) throw new Error("Failed to create the new goal template.");
        finalGoalId = newGoal.id;
      } else if (goalDefinition.type === 'existing' && goalDefinition.id) {
        // Use the existing goal ID
        finalGoalId = goalDefinition.id;
      } else {
        throw new Error("Goal definition is invalid.");
      }
      
      // Step 3B: Now, assign the employees to the (either new or existing) goal
      const employeeGoalTargets: EmployeeGoalTarget[] = selectedEmployees.map(employee => ({ employee, targetValue: employeeTargets.get(employee.id) ?? 0 }));
      return await assignGoalToEmployees(finalGoalId, selectedEmployees.map(e => e.id), period.type, employeeGoalTargets, format(period.start, 'yyyy-MM-dd'), format(period.end, 'yyyy-MM-dd'));
    },
    onSuccess: () => {
      toast.success("Goal created and assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onSuccess();
    },
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  });

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-md bg-gray-50/50 space-y-2">
        <h3 className="font-semibold text-lg">{goalDefinition.name}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <p>Department: <Badge variant="secondary">{department}</Badge></p>
          <p>Period: <Badge variant="outline">{period.type}</Badge></p>
          <p>Duration: <Badge variant="outline">{format(period.start, 'MMM d, yyyy')} - {format(period.end, 'MMM d, yyyy')}</Badge></p>
        </div>
      </div>
      
      <div>
        <Label>Assign to Employees</Label>
        <Select onValueChange={handleEmployeeSelection} disabled={isLoadingEmployees}>
          <SelectTrigger><SelectValue placeholder="Select an employee to add..." /></SelectTrigger>
          <SelectContent>{filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedEmployees.map(employee => ( <Badge key={employee.id} variant="secondary" className="p-1 px-2">{employee.name}<button onClick={() => handleRemoveEmployee(employee.id)} className="ml-1 focus:outline-none"><X className="h-3 w-3" /></button></Badge>))}
        </div>
      </div>

      {selectedEmployees.length > 0 && (
        <div>
          <Label>Individual Target Values ({goalDefinition.metricUnit})</Label>
          <div className="space-y-2 border rounded-md p-4 mt-1.5 max-h-48 overflow-y-auto">
            {selectedEmployees.map(employee => (
              <div key={employee.id} className="grid grid-cols-2 gap-4 items-center">
                <p>{employee.name}</p>
                <Input type="number" value={employeeTargets.get(employee.id) ?? ""} placeholder={`Default: ${goalDefinition.targetValue || 0}`} onChange={e => handleTargetChange(employee.id, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="pt-8">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button onClick={() => assignGoalsMutation.mutate()} disabled={assignGoalsMutation.isPending || selectedEmployees.length === 0}>
          {assignGoalsMutation.isPending ? "Saving..." : "Finish & Assign Goal"}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default Step3_AssignEmployees;