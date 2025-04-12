import React, { useState, useEffect } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Check, ChevronsUpDown, Plus, Trash } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { SectorType, Employee, Goal, GoalType } from "@/types/goal";
import { getEmployees, getGoals, assignGoalToEmployees } from "@/lib/supabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { EmployeeGoalTarget, GoalAssignmentData } from "@/types/employeeGoalTarget";
import { supabase } from "@/integrations/supabase/client";

interface AssignGoalsFormProps {
  onClose?: () => void;
}

const AssignGoalsForm: React.FC<AssignGoalsFormProps> = ({ onClose }) => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [sector, setSector] = useState<SectorType>();
  const [goalType, setGoalType] = useState<GoalType>('Monthly');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [employeeTargets, setEmployeeTargets] = useState<EmployeeGoalTarget[]>([]);
  const [employeeCommandOpen, setEmployeeCommandOpen] = useState(false);
  const [goalCommandOpen, setGoalCommandOpen] = useState(false);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
  
      try {
        // Fetch departments, employees and goals concurrently
        const [departmentsResult, employeeData, goalsData] = await Promise.all([
          supabase.from('hr_departments').select('id, name').order('name'),
          getEmployees(),
          getGoals(),
        ]);
  
        if (departmentsResult.error) {
          console.error("Error fetching departments:", departmentsResult.error);
        } else {
          setDepartments(departmentsResult.data || []);
        }
        
        console.log("Employees loaded:", employeeData);
        console.log("Goals loaded:", goalsData?.length || 0);
  
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
        setGoals(Array.isArray(goalsData) ? goalsData : []);
      } catch (err) {
        setError("Failed to load data.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, []);
  
  useEffect(() => {
    if (!sector) {
      setFilteredGoals([]);
      return;
    }

    if (!Array.isArray(goals) || goals.length === 0) {
      console.log("No goals available to filter");
      setFilteredGoals([]);
      return;
    }

    console.log("Filtering goals for sector:", sector);
    console.log("Available goals before filtering:", goals);

    const filtered = goals.filter(goal => goal.sector?.toLowerCase() === sector.toLowerCase());

    console.log("Filtered goals:", filtered);
    setFilteredGoals(filtered || []); // Ensure it's always an array
  }, [sector, goals, selectedGoal]);

  useEffect(() => {
    // Add newly selected employees to employeeTargets
    const updatedTargets = [...employeeTargets];
    
    // Add any new employees that aren't already in employeeTargets
    selectedEmployees.forEach(employee => {
      if (!updatedTargets.some(target => target.employee.id === employee.id)) {
        updatedTargets.push({
          employee,
          targetValue: selectedGoal?.targetValue || 0
        });
      }
    });
    
    // Remove any targets for employees that are no longer selected
    const filteredTargets = updatedTargets.filter(target => 
      selectedEmployees.some(emp => emp.id === target.employee.id)
    );
    
    setEmployeeTargets(filteredTargets);
  }, [selectedEmployees, selectedGoal]);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployees((current) => {
      if (current.some(e => e.id === employee.id)) {
        return current.filter(e => e.id !== employee.id);
      }
      return [...current, employee];
    });
  };

  const handleSelectGoal = (goal: Goal) => {
    console.log("Selected goal:", goal);
    setSelectedGoal(goal);
    setGoalCommandOpen(false);
    
    // Update target values for all selected employees
    if (goal) {
      setEmployeeTargets(prev => 
        prev.map(target => ({
          ...target,
          targetValue: goal.targetValue
        }))
      );
    }
  };

  const handleEmployeeTargetChange = (employeeId: string, value: number) => {
    setEmployeeTargets(prev => 
      prev.map(target => 
        target.employee.id === employeeId
          ? { ...target, targetValue: value }
          : target
      )
    );
  };

  const getMetricUnitLabel = () => {
    if (!selectedGoal) return "";

    switch (selectedGoal.metricType) {
      case "percentage":
        return "%";
      case "currency":
        return "$";
      case "count":
        return "#";
      case "hours":
        return "hrs";
      case "custom":
        return selectedGoal.metricUnit;
      default:
        return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoal || !startDate || !endDate || !sector || employeeTargets.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    
    setLoading(true);
    
    try {
      const assignmentData: GoalAssignmentData = {
        goalId: selectedGoal.id,
        goalType: goalType,
        startDate,
        endDate,
        employeeTargets: employeeTargets
      };
      
      // Attempt to assign goals to employees
      await assignGoalToEmployees(
        selectedGoal.id, 
        selectedEmployees.map(emp => emp.id), 
        goalType, 
        employeeTargets
      );
      
      toast.success("Goal assigned successfully!");
      
      // Reset form
      setSelectedGoal(null);
      setSelectedEmployees([]);
      setEmployeeTargets([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setSector(undefined);
      setGoalType('Monthly');
      
      // Close the modal after successful submission
      if (onClose) {
        onClose();
      }
      
    } catch (error: any) {
      console.error("Error assigning goal:", error);
      
      // Handle duplicate assignments (unique constraint violation)
      if (error.code === "23505" || (error.message && error.message.includes("duplicate key"))) {
        toast.error("This goal has already been assigned to one or more of the selected employees");
      } else {
        toast.error("Failed to assign goal. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>Assign Goals</DialogTitle>
        <DialogDescription>
          Assign existing goals to employees with specific targets and timelines.
        </DialogDescription>
      </DialogHeader>
      
      {isLoading ? (
        <div className="py-8 text-center">Loading data...</div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">{error}</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="sector" className="text-sm font-medium">
                Department
              </Label>
              <Select 
                onValueChange={(value) => setSector(value as SectorType)}
                value={sector}
              >
                <SelectTrigger id="sector" className="mt-1.5">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="goal" className="text-sm font-medium">
                Goal
              </Label>
              <Popover open={goalCommandOpen} onOpenChange={setGoalCommandOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={goalCommandOpen}
                    className="w-full mt-1.5 justify-between"
                    type="button"
                    disabled={!sector}
                  >
                    {selectedGoal ? selectedGoal.name : "Select a goal..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search goals..." />
                    <CommandEmpty>
                      {sector 
                        ? "No goals found for this department." 
                        : "Please select a department first."}
                    </CommandEmpty>
                    <CommandList>
                      <ScrollArea className="h-64">
                        {filteredGoals.length > 0 ? (
                          filteredGoals.map(goal => (
                            <CommandItem 
                              key={goal.id} 
                              value={goal.name} 
                              onSelect={() => handleSelectGoal(goal)}
                            >
                              <Check className={cn(
                                "mr-2 h-4 w-4", 
                                selectedGoal?.id === goal.id ? "opacity-100" : "opacity-0"
                              )} />
                              {goal.name}
                            </CommandItem>
                          ))
                        ) : (
                          <div className="py-6 text-center text-sm text-gray-500">
                            {sector ? "No goals available for this department" : "Select a department to view goals"}
                          </div>
                        )}
                      </ScrollArea>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {filteredGoals.length === 0 && sector && (
                <p className="mt-2 text-sm text-amber-600">
                  No goals found for {sector}. Please create goals for this department first.
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="goalType" className="text-sm font-medium">
                Goal Type
              </Label>
              <Select 
                onValueChange={(value) => setGoalType(value as GoalType)}
                value={goalType}
              >
                <SelectTrigger id="goalType" className="mt-1.5">
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                Determines how progress is tracked and reported
              </p>
            </div>
            
            <div>
              <Label htmlFor="employees" className="text-sm font-medium">
                Assign to Employees
              </Label>
              <Popover open={employeeCommandOpen} onOpenChange={setEmployeeCommandOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeCommandOpen}
                    className="w-full mt-1.5 justify-between"
                    type="button"
                  >
                    {selectedEmployees.length === 0 
                      ? "Select employees..." 
                      : `${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''} selected`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandList>
                      <ScrollArea className="h-64">
                        {employees.length > 0 ? (
                          employees.map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => {
                                handleSelectEmployee(employee);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEmployees.some(e => e.id === employee.id) 
                                    ? "opacity-100" 
                                    : "opacity-0"
                                )}
                              />
                              {employee.name} ({employee.department})
                            </CommandItem>
                          ))
                        ) : (
                          <div className="py-6 text-center text-sm text-gray-500">
                            No employees available
                          </div>
                        )}
                      </ScrollArea>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEmployees.map((employee) => (
                    <Badge key={employee.id} variant="secondary" className="p-1 px-2">
                      {employee.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => handleSelectEmployee(employee)}
                        type="button"
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1.5 justify-start text-left font-normal"
                      id="startDate"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP")
                      ) : (
                        <span>Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1.5 justify-start text-left font-normal"
                      id="endDate"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) =>
                        date < new Date() || (startDate ? date < startDate : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {selectedGoal && selectedEmployees.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">
                  Individual Target Values
                </Label>
                <Card>
                  <CardContent className="pt-4">
                    <ScrollArea className="h-48 pr-4">
                      <div className="space-y-3">
                        {employeeTargets.map((target) => (
                          <div key={target.employee.id} className="flex items-center justify-between space-x-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{target.employee.name}</p>
                              <p className="text-xs text-gray-500">{target.employee.position}</p>
                            </div>
                            <div className="flex items-center w-1/3">
                              <Input
                                type="number"
                                value={target.targetValue}
                                onChange={(e) => handleEmployeeTargetChange(target.employee.id, Number(e.target.value))}
                                className="text-right"
                              />
                              <span className="ml-2 text-sm w-8">{getMetricUnitLabel()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign Goal"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogContent>
  );
};

export default AssignGoalsForm;
