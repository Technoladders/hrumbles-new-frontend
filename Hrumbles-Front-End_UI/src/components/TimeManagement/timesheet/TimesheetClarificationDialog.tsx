
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeLog } from "@/types/time-tracker-types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/utils/timeFormatters";

interface TimesheetClarificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitClarification?: () => void;
}

export const TimesheetClarificationDialog: React.FC<TimesheetClarificationDialogProps> = ({
  open,
  onOpenChange,
  timesheet,
  onSubmitClarification
}) => {
  const [clarification, setClarification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
const handleSubmit = async () => {
  if (!clarification.trim()) {
    toast({
      title: "Error",
      description: "Please provide a clarification response",
      variant: "destructive"
    });
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const { error: timeLogError } = await supabase
      .from('time_logs')
      .update({ 
        clarification_response: clarification,
        clarification_status: 'submitted',
        clarification_submitted_at: new Date().toISOString()
      })
      .eq('id', timesheet.id);
    
    if (timeLogError) throw timeLogError;
    
    const { error: approvalError } = await supabase
      .from('timesheet_approvals')
      .update({
        clarification_response: clarification,
        clarification_status: 'submitted',
        clarification_submitted_at: new Date().toISOString()
      })
      .eq('time_log_id', timesheet.id);
    
    if (approvalError) throw approvalError;
    
    toast({
      title: "Success",
      description: "Clarification submitted successfully",
    });
    
    if (onSubmitClarification) {
      onSubmitClarification();
    }
    
    onOpenChange(false);
  } catch (error) {
    console.error("Error submitting clarification:", error);
    toast({
      title: "Error",
      description: "Failed to submit clarification",
      variant: "destructive"
    });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Clarification</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/30 p-4 rounded-md">
            <h3 className="font-medium mb-2">Timesheet Information</h3>
            <p><span className="font-semibold text-sm text-muted-foreground">Date:</span> {formatDate(timesheet?.date)}</p>
            <p><span className="font-semibold text-sm text-muted-foreground">Original Notes:</span> {timesheet?.notes}</p>
            <p className="mt-4 text-amber-600">Clarification was requested for this timesheet. Please provide additional information.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clarification">Your Response</Label>
            <Textarea
              id="clarification"
              value={clarification}
              onChange={(e) => setClarification(e.target.value)}
              placeholder="Provide the requested clarification..."
              className="min-h-[150px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Clarification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
