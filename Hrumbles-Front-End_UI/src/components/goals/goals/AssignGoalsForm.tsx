import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getGoals, getEmployees, assignGoalToEmployees } from "@/lib/supabaseData";
import { Employee, EmployeeGoalTarget, Goal, GoalType } from "@/types/goal";
import { format } from "date-fns";

interface AssignGoalsFormProps {
  onClose: () => void;
  preselectedGoal?: Goal;
}

interface Department {
  id: string;
  name: string;
}

const AssignGoalsForm: React.FC<AssignGoalsFormProps> = ({ onClose, preselectedGoal }) => {

    const isContextualMode = !!preselectedGoal;

  // --- NEW: Initialize state from props if in contextual mode ---
  const [selectedDepartment, setSelectedDepartment] = useState<string>(preselectedGoal?.sector || "");
  const [selectedGoalId, setSelectedGoalId] = useState<string>(preselectedGoal?.id || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [goalType, setGoalType] = useState<GoalType>("Monthly");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [employeeTargets, setEmployeeTargets] = useState<Map<string, number | undefined>>(new Map());
  
  const queryClient = useQueryClient();

  // Fetch departments (exact match to reference)
  const { data: departments, isLoading: isLoadingDepartments, error: departmentsError } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
  });

  // Fetch goals and employees
  const { data: goals, isLoading: isLoadingGoals } = useQuery({
    queryKey: ["goals"],
    queryFn: getGoals,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Filter goals and employees by selected department (using sector/department name)
  const filteredGoals = selectedDepartment
    ? goals?.filter((goal) => goal.sector?.toLowerCase() === selectedDepartment.toLowerCase()) || []
    : goals || [];

  const filteredEmployees = selectedDepartment
    ? employees?.filter((employee) => employee.department?.toLowerCase() === selectedDepartment.toLowerCase()) || []
    : employees || [];

  // Selected goal from the list
 const selectedGoal = goals?.find((goal) => goal.id === selectedGoalId);

  // --- THIS IS THE FIX ---
  // The reset logic should only run when NOT in contextual mode.
  useEffect(() => {
    if (!isContextualMode) {
      setSelectedGoalId("");
      setSelectedEmployees([]);
      setSelectedEmployeeId("");
      setEmployeeTargets(new Map());
    }
  }, [selectedDepartment, isContextualMode]); // Add isContextualMode to the dependency array

  // Update employee targets when the selected goal changes
  useEffect(() => {
    if (selectedGoal) {
      const newMap = new Map<string, number | undefined>();
      selectedEmployees.forEach((employee) => {
        newMap.set(employee.id, selectedGoal.targetValue);
      });
      setEmployeeTargets(newMap);
    }
  }, [selectedGoal, selectedEmployees]);

  const handleEmployeeSelection = (employeeId: string) => {
    const employee = filteredEmployees.find((e) => e.id === employeeId);
    if (employee && !selectedEmployees.some((e) => e.id === employee.id)) {
      setSelectedEmployees((prev) => [...prev, employee]);
      if (selectedGoal) {
        setEmployeeTargets((prev) => new Map(prev.set(employee.id, selectedGoal.targetValue)));
      }
    }
    setSelectedEmployeeId(""); // Reset dropdown
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setEmployeeTargets((prev) => {
      const newMap = new Map(prev);
      newMap.delete(employeeId);
      return newMap;
    });
  };

  const handleTargetChange = (employeeId: string, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    setEmployeeTargets((prev) => new Map(prev.set(employeeId, numValue)));
  };

  // Assign goals mutation
  const assignGoalsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGoalId || selectedEmployees.length === 0) {
        throw new Error("Please select a goal and at least one employee");
      }
       if (endDate < startDate) {
                throw new Error("End date cannot be before the start date.");
            }

      const employeeGoalTargets: EmployeeGoalTarget[] = selectedEmployees.map(
        (employee) => ({
          employee,
          targetValue: employeeTargets.get(employee.id) ?? (selectedGoal?.targetValue || 0),
        })
      );
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      return await assignGoalToEmployees(selectedGoalId, selectedEmployees.map((e) => e.id), goalType, employeeGoalTargets, formattedStartDate, formattedEndDate);
    },
    onSuccess: () => {
      toast.success("Goals assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Error assigning goals: ${error.message}`);
    },
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle> {isContextualMode ? `Assign More Employees to "${preselectedGoal.name}"` : "Assign Goals to Employees"}</DialogTitle>
      </DialogHeader>

      {departmentsError ? (
        <div className="py-8 text-center text-red-500">Failed to load departments</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); assignGoalsMutation.mutate(); }} className="space-y-6">
          {/* Department Selection (exact match to reference) */}

           {/* --- NEW: Date pickers for assignment period --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                        {/* Replace with your actual DatePicker component */}
                        <Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(new Date(e.target.value))} />
                    </div>
                    <div>
                        <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                        {/* Replace with your actual DatePicker component */}
                        <Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(new Date(e.target.value))} />
                    </div>
                </div>
          {isContextualMode ? (
            <div className="space-y-4 rounded-md border p-4 bg-gray-50/50">
              <div>
                <Label className="text-gray-500">Department</Label>
                <p className="font-semibold">{preselectedGoal.sector}</p>
              </div>
              <div>
                <Label className="text-gray-500">Goal</Label>
                <p className="font-semibold">{preselectedGoal.name}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Department and Goal Selection for general mode */}
              <div>
                <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isLoadingDepartments || assignGoalsMutation.isPending}>
                  <SelectTrigger id="department" className="mt-1.5"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments?.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="goal" className="text-sm font-medium">Select a Goal</Label>
                <Select value={selectedGoalId} onValueChange={setSelectedGoalId} disabled={isLoadingGoals || !selectedDepartment || assignGoalsMutation.isPending}>
                  <SelectTrigger id="goal" className="mt-1.5"><SelectValue placeholder="Select a goal to assign" /></SelectTrigger>
                  <SelectContent>{filteredGoals.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Goal Type Selection */}
          <div>
            <Label htmlFor="goalType" className="text-sm font-medium">Goal Period</Label>
            <Select value={goalType} onValueChange={(value) => setGoalType(value as GoalType)} disabled={assignGoalsMutation.isPending}>
              <SelectTrigger id="goalType" className="mt-1.5"><SelectValue placeholder="Select goal period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="Yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />


          {/* Employee Selection */}
          <div>
            <Label htmlFor="employee" className="text-sm font-medium">Assign to Employees</Label>
            <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelection} disabled={isLoadingEmployees || !selectedDepartment || assignGoalsMutation.isPending}>
              <SelectTrigger id="employee" className="mt-1.5"><SelectValue placeholder="Select an employee to add" /></SelectTrigger>
              <SelectContent>{filteredEmployees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.position})</SelectItem>)}</SelectContent>
            </Select>
            {selectedEmployees.length > 0 && selectedGoal && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedEmployees.map((employee) => (
                  <Badge key={employee.id} variant="secondary" className="p-1 px-2">
                    {employee.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => handleRemoveEmployee(employee.id)}
                      disabled={assignGoalsMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Target Values for each employee */}
          {selectedEmployees.length > 0 && selectedGoal && (
            <div>
              <Label className="text-sm font-medium">
                Individual Target Values
              </Label>
              <div className="space-y-2 border rounded-md p-4 mt-1.5">
                <div className="grid grid-cols-2 gap-4 font-medium text-sm py-2 px-1 border-b">
                  <div>Employee</div>
                  <div>Target Value ({selectedGoal.metricUnit})</div>
                </div>
                {selectedEmployees.map((employee) => (
                  <div key={employee.id} className="grid grid-cols-2 gap-4 items-center">
                    <div>{employee.name}</div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={employeeTargets.get(employee.id) ?? ""}
                      placeholder={selectedGoal.targetValue.toString()}
                      onChange={(e) => handleTargetChange(employee.id, e.target.value)}
                      disabled={assignGoalsMutation.isPending}
                      className="text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={assignGoalsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !selectedGoalId ||
                selectedEmployees.length === 0 ||
                !startDate || !endDate ||
                assignGoalsMutation.isPending
              }
            >
              {assignGoalsMutation.isPending ? "Assigning..." : "Assign Goals"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
};

export default AssignGoalsForm;