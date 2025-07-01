import { useState } from 'react';
import { TimeLog } from '@/types/time-tracker-types';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useTimesheetEditing = (timesheet: TimeLog, onSubmitTimesheet?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedTimesheet, setEditedTimesheet] = useState(timesheet);
  const [isEditing, setIsEditing] = useState(!timesheet.is_submitted);

  const handleSave = async () => {
    try {
      const calculatedWorkingHours = editedTimesheet.duration_minutes 
        ? editedTimesheet.duration_minutes / 60
        : 0;
      
      const { error } = await supabase
        .from('time_logs')
        .update({
          notes: editedTimesheet.notes,
          total_working_hours: calculatedWorkingHours,
          project_time_data: editedTimesheet.project_time_data
        })
        .eq('id', timesheet.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Timesheet updated successfully",
      });
    } catch (error) {
      console.error("Error updating timesheet:", error);
      toast({
        title: "Error",
        description: "Failed to update timesheet",
        variant: "destructive"
      });
    }
  };

  const handleSubmitTimesheet = async () => {
    if (timesheet.is_submitted) {
      toast({
        title: "Already submitted",
        description: "This timesheet has already been submitted",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const calculatedWorkingHours = editedTimesheet.duration_minutes 
        ? editedTimesheet.duration_minutes / 60
        : 0;
      
      const { error } = await supabase
        .from('time_logs')
        .update({ 
          is_submitted: true,
          project_time_data: editedTimesheet.project_time_data,
          notes: editedTimesheet.notes,
          total_working_hours: calculatedWorkingHours
        })
        .eq('id', timesheet.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
      
      if (onSubmitTimesheet) {
        onSubmitTimesheet();
      }
      
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    editedTimesheet,
    setEditedTimesheet,
    isEditing,
    handleSave,
    handleSubmitTimesheet
  };
};
