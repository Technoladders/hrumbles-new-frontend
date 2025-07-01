
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { 
  updateGoalTarget, 
  extendGoalTarget, 
  deleteGoal, 
  stopGoal 
} from '@/lib/supabaseData';
import { 
  updateEmployeeGoalTarget,
  extendEmployeeGoalTarget,
  removeEmployeeFromGoal
} from '@/lib/goalService';
import { useQueryClient } from '@tanstack/react-query';
import { GoalInstance, GoalWithDetails, AssignedGoal } from '@/types/goal';

export const useGoalManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateTarget = async (
    goalInstanceId: string, 
    newTargetValue: number
  ): Promise<GoalInstance | null> => {
    setIsLoading(true);

    try {
      const result = await updateGoalTarget(goalInstanceId, newTargetValue);
      
      if (result) {
        toast({
          title: "Target updated",
          description: `Goal target updated to ${newTargetValue}`,
        });
        
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return result;
      } else {
        toast({
          title: "Update failed",
          description: "Could not update the target value. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error updating target:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendGoal = async (
    goalInstanceId: string,
    additionalTarget: number
  ): Promise<GoalInstance | null> => {
    setIsLoading(true);

    try {
      const result = await extendGoalTarget(goalInstanceId, additionalTarget);
      
      if (result) {
        toast({
          title: "Goal extended",
          description: `Goal target increased by ${additionalTarget}`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return result;
      } else {
        toast({
          title: "Extension failed",
          description: "Could not extend the goal target. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error extending goal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (
    goalId: string
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const result = await deleteGoal(goalId);
      
      if (result) {
        toast({
          title: "Goal deleted",
          description: "The goal has been permanently removed.",
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return true;
      } else {
        toast({
          title: "Deletion failed",
          description: "Could not delete the goal. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopGoal = async (
    goalInstanceId: string
  ): Promise<GoalInstance | null> => {
    setIsLoading(true);

    try {
      const result = await stopGoal(goalInstanceId);
      
      if (result) {
        toast({
          title: "Goal stopped",
          description: "The goal has been stopped and will no longer be tracked.",
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return result;
      } else {
        toast({
          title: "Stop failed",
          description: "Could not stop the goal. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error stopping goal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // New functions using goalService.ts for employee-specific operations
  const handleUpdateEmployeeGoalTarget = async (
    assignedGoalId: string,
    newTargetValue: number
  ): Promise<AssignedGoal | null> => {
    setIsLoading(true);

    try {
      const result = await updateEmployeeGoalTarget(assignedGoalId, newTargetValue);
      
      if (result) {
        toast({
          title: "Target updated",
          description: `Employee's goal target updated to ${newTargetValue}`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return result;
      } else {
        toast({
          title: "Update failed",
          description: "Could not update the employee's target value. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error updating employee goal target:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtendEmployeeGoal = async (
    assignedGoalId: string,
    additionalTarget: number
  ): Promise<AssignedGoal | null> => {
    setIsLoading(true);

    try {
      const result = await extendEmployeeGoalTarget(assignedGoalId, additionalTarget);
      
      if (result) {
        toast({
          title: "Goal extended",
          description: `Employee's goal target increased by ${additionalTarget}`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return result;
      } else {
        toast({
          title: "Extension failed",
          description: "Could not extend the employee's goal target. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error extending employee goal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEmployeeFromGoal = async (
    assignedGoalId: string
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const result = await removeEmployeeFromGoal(assignedGoalId);
      
      if (result) {
        toast({
          title: "Employee removed",
          description: "The employee has been removed from this goal.",
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["employeeGoals"] });
        queryClient.invalidateQueries({ queryKey: ["goalDetails"] });
        
        return true;
      } else {
        toast({
          title: "Removal failed",
          description: "Could not remove the employee from the goal. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error removing employee from goal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleUpdateTarget,
    handleExtendGoal,
    handleDeleteGoal,
    handleStopGoal,
    // New employee-specific functions
    handleUpdateEmployeeGoalTarget,
    handleExtendEmployeeGoal,
    handleRemoveEmployeeFromGoal
  };
};

export default useGoalManagement;
