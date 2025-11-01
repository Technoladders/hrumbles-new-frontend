import React, { useState, useEffect, useMemo } from 'react';
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEmployees, assignGoalToEmployees } from "@/lib/supabaseData";
import { Employee, EmployeeGoalTarget, Goal, GoalType } from "@/types/goal";
import { format } from "date-fns";
import { DialogFooter } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';

interface Step2Props {
  goal: Goal;
  department: string;
  onBack: () => void;
  onClose: () => void;
}

const Step2_AssignGoal: React.FC<Step2Props> = ({ goal, department, onBack, onClose }) => {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [goalType, setGoalType] = useState<GoalType>("Monthly");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [employeeTargets, setEmployeeTargets] = useState<Map<string, number | undefined>>(new Map());
  
  const queryClient = useQueryClient();

  const { data: allEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const filteredEmployees = useMemo(() => 
    allEmployees.filter(e => e.department === department),
    [allEmployees, department]
  );
  
  const handleEmployeeSelection = (employeeId: string) => {
    const employee = filteredEmployees.find(e => e.id === employeeId);
    if (employee && !selectedEmployees.some(e => e.id === employeeId)) {
      setSelectedEmployees(prev => [...prev, employee]);
      setEmployeeTargets(prev => new Map(prev.set(employee.id, goal.targetValue || 0)));
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== employeeId));
    setEmployeeTargets(prev => {
      const newMap = new Map(prev);
      newMap.delete(employeeId);
      return newMap;
    });
  };

  const handleTargetChange = (employeeId: string, value: string) => {
    setEmployeeTargets(prev => new Map(prev.set(employeeId, parseFloat(value) || 0)));
  };

  const assignGoalsMutation = useMutation({
    mutationFn: async () => {
      if (selectedEmployees.length === 0 || !startDate || !endDate) {
        throw new Error("Please select at least one employee and set a start/end date.");
      }
      if (endDate < startDate) {
        throw new Error("End date cannot be before the start date.");
      }
      const employeeGoalTargets: EmployeeGoalTarget[] = selectedEmployees.map(employee => ({
        employee,
        targetValue: employeeTargets.get(employee.id) ?? (goal.targetValue || 0),
      }));
      return await assignGoalToEmployees(goal.id, selectedEmployees.map(e => e.id), goalType, employeeGoalTargets, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
    },
    onSuccess: () => {
      toast.success("Goals assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["goals"] }); // This will refresh the main goal list
      onClose();
    },
    onError: (error: Error) => toast.error(`Error: ${error.message}`),
  });

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-md bg-gray-50/50 space-y-2">
        <h3 className="font-semibold text-lg">{goal.name}</h3>
        <p className="text-sm text-gray-600">Department: <Badge variant="secondary">{department}</Badge></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input type="date" onChange={e => setStartDate(e.target.valueAsDate || undefined)} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" onChange={e => setEndDate(e.target.valueAsDate || undefined)} />
        </div>
        <div className="lg:col-span-2">
          <Label>Goal Period (for generating instances)</Label>
          <Select value={goalType} onValueChange={v => setGoalType(v as GoalType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Daily">Daily</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Assign to Employees</Label>
        <Select onValueChange={handleEmployeeSelection} disabled={isLoadingEmployees}>
          <SelectTrigger><SelectValue placeholder="Select an employee to add..." /></SelectTrigger>
          <SelectContent>
            {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedEmployees.map(employee => (
            <Badge key={employee.id} variant="secondary" className="p-1 px-2">
              {employee.name}
              <button onClick={() => handleRemoveEmployee(employee.id)} className="ml-1 focus:outline-none"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      {selectedEmployees.length > 0 && (
        <div>
          <Label>Individual Target Values</Label>
          <div className="space-y-2 border rounded-md p-4 mt-1.5 max-h-60 overflow-y-auto">
            {selectedEmployees.map(employee => (
              <div key={employee.id} className="grid grid-cols-2 gap-4 items-center">
                <div>{employee.name}</div>
                <Input type="number" value={employeeTargets.get(employee.id) ?? ""} placeholder={`Default: ${goal.targetValue || 0}`} onChange={e => handleTargetChange(employee.id, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button onClick={() => assignGoalsMutation.mutate()} disabled={assignGoalsMutation.isPending}>
          {assignGoalsMutation.isPending ? "Assigning..." : "Assign Goal"}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default Step2_AssignGoal;