// src/components/goals/goals/EditGoalForm.tsx

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, UserPlus, UserMinus } from "lucide-react";

import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog"; // Nested Dialog for assigning more employees

import { GoalWithDetails, SectorType, MetricType } from "@/types/goal";
import { updateGoal, removeEmployeeFromGoal } from "@/lib/goalService"; // We will create updateGoal next
import AssignGoalsForm from "./AssignGoalsForm"; // Reuse the existing form
import { supabase } from "@/integrations/supabase/client";

interface EditGoalFormProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

const EditGoalForm: React.FC<EditGoalFormProps> = ({ goal, onClose }) => {
  // Form State
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description);
  const [sector, setSector] = useState<SectorType | undefined>(goal.sector as SectorType);
  const [metricType, setMetricType] = useState<MetricType | undefined>(goal.metricType as MetricType);
  const [metricUnit, setMetricUnit] = useState(goal.metric_unit || "");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Automation State
  const [isAutomated, setIsAutomated] = useState(goal.is_automated || false);
  const [sourceTable, setSourceTable] = useState(goal.source_table || "");
  const [sourceValueColumn, setSourceValueColumn] = useState(goal.source_value_column || "");
  const [sourceEmployeeColumn, setSourceEmployeeColumn] = useState(goal.source_employee_column || "");
  const [sourceDateColumn, setSourceDateColumn] = useState(goal.source_date_column || "");
  const [filters, setFilters] = useState<{ key: string; value: string }[]>([]);

  // Control State
  const [loading, setLoading] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  useEffect(() => {
    // Populate filters from goal data
    const initialFilters = goal.source_filter_conditions ? Object.entries(goal.source_filter_conditions).map(([key, value]) => ({ key, value: String(value) })) : [];
    if (initialFilters.length === 0) initialFilters.push({ key: "", value: "" });
    setFilters(initialFilters);

    // Fetch departments
    const fetchDepartments = async () => {
      const { data } = await supabase.from('hr_departments').select('id, name');
      setDepartments(data || []);
    };
    fetchDepartments();
  }, [goal]);

  const handleRemoveEmployee = async (assignedGoalId: string) => {
    const success = await removeEmployeeFromGoal(assignedGoalId);
    if (success) {
      toast.success("Employee removed successfully.");
      onClose(); // This will trigger a refresh on the main page
    } else {
      toast.error("Failed to remove employee.");
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const source_filter_conditions = filters.reduce((acc, filter) => {
      if (filter.key && filter.value) acc[filter.key] = filter.value;
      return acc;
    }, {} as Record<string, string>);

    const updatedGoalData = {
      name,
      description,
      sector,
      metric_type: metricType,
      metric_unit: metricUnit,
      is_automated: isAutomated,
      source_table: isAutomated ? sourceTable : null,
      source_value_column: isAutomated ? sourceValueColumn : null,
      source_employee_column: isAutomated ? sourceEmployeeColumn : null,
      source_date_column: isAutomated ? sourceDateColumn : null,
      source_filter_conditions: isAutomated ? source_filter_conditions : {},
    };

    const result = await updateGoal(goal.id, updatedGoalData);
    if (result) {
      toast.success("Goal updated successfully!");
      onClose();
    } else {
      toast.error("Failed to update goal.");
    }
    setLoading(false);
  };
  
  // ... (Add filter helper functions: handleAddFilter, handleRemoveFilter, handleFilterChange) ...

  return (
    <DialogContent className="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Edit Goal: {goal.name}</DialogTitle>
        <DialogDescription>Modify the details of this goal template and manage its assignments.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
        {/* ... (All the form fields from CreateGoalForm, populated with state) ... */}
        {/* e.g., <Input value={name} onChange={(e) => setName(e.target.value)} /> */}
        
        <Separator />
        
        <div>
          <h4 className="text-md font-semibold mb-2">Assigned Employees</h4>
          <ScrollArea className="h-48 border rounded-md p-2">
            {goal.assignments && goal.assignments.length > 0 ? (
              <div className="space-y-2">
                {goal.assignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{assignment.employee.first_name} {assignment.employee.last_name}</p>
                      <Badge variant="outline">{assignment.goal_type}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveEmployee(assignment.id)}>
                      <UserMinus className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No employees assigned to this goal.</p>
            )}
          </ScrollArea>
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" className="mt-2 w-full"><UserPlus className="h-4 w-4 mr-2" />Assign More Employees</Button>
            </DialogTrigger>
            {/* Pass only goalId and onClose to a simplified Assign form if needed, or reuse the full one */}
             <AssignGoalsForm
            preselectedGoal={goal}
            onClose={() => {
              setIsAssignDialogOpen(false);
              onClose(); // This refreshes the dashboard data
            }}
          />
          </Dialog>
        </div>
        
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default EditGoalForm;