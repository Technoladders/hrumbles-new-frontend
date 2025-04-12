
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateGoalProgress } from "@/lib/supabaseData";
import { GoalWithDetails } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GoalProgressFormProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

const GoalProgressForm: React.FC<GoalProgressFormProps> = ({ goal, onClose }) => {
  const [currentValue, setCurrentValue] = useState(
    goal.assignmentDetails?.currentValue.toString() || "0"
  );
  const [notes, setNotes] = useState(goal.assignmentDetails?.notes || "");
  const [error, setError] = useState("");
  
  const queryClient = useQueryClient();
  
  const updateMutation = useMutation({
    mutationFn: ({ assignedGoalId, currentValue, notes }: { 
      assignedGoalId: string;
      currentValue: number;
      notes?: string;
    }) => {
      return updateGoalProgress(assignedGoalId, currentValue, notes);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: ["employeeGoals", goal.assignedTo?.[0]?.id] 
      });
      toast.success("Progress updated successfully");
      onClose();
    },
    onError: (error) => {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress. Please try again.");
      setError("Failed to update progress. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goal.assignmentDetails?.id) {
      setError("Cannot update progress: Missing assignment details");
      return;
    }
    
    const numericValue = parseFloat(currentValue);
    
    if (isNaN(numericValue)) {
      setError("Please enter a valid number");
      return;
    }
    
    setError("");
    
    updateMutation.mutate({
      assignedGoalId: goal.assignmentDetails.id,
      currentValue: numericValue,
      notes: notes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-1">{goal.name}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Target: {goal.targetValue} {goal.metricUnit}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="currentValue">
          Current Value ({goal.metricUnit})
        </Label>
        <Input
          id="currentValue"
          type="number"
          step="any"
          min="0"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          placeholder={`Enter current value in ${goal.metricUnit}`}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this progress update"
          rows={3}
        />
      </div>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={updateMutation.isPending}
          className="flex items-center gap-2"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Update Progress
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default GoalProgressForm;
