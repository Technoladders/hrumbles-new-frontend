import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addTrackingRecord, getTrackingRecords, updateGoalProgressFromRecords } from "@/lib/supabaseData";
import { GoalWithDetails, TrackingRecord } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TrackingRecordFormProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

const TrackingRecordForm: React.FC<TrackingRecordFormProps> = ({ goal, onClose }) => {
  const [value, setValue] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [error, setError] = useState<string>("");
  
  const queryClient = useQueryClient();
  
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["trackingRecords", goal.assignmentDetails?.id],
    queryFn: () => getTrackingRecords(goal.assignmentDetails?.id || ""),
    enabled: !!goal.assignmentDetails?.id,
  });
  
  const addRecordMutation = useMutation({
    mutationFn: async ({ 
      assignedGoalId, 
      value, 
      recordDate, 
      notes 
    }: { 
      assignedGoalId: string;
      value: number;
      recordDate: string;
      notes?: string;
    }) => {
      const result = await addTrackingRecord(assignedGoalId, value, recordDate, notes);
      if (result) {
        await updateGoalProgressFromRecords(assignedGoalId);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["trackingRecords", goal.assignmentDetails?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["employeeGoals", goal.assignedTo?.[0]?.id] 
      });
      
      setValue("0");
      setNotes("");
      setRecordDate(new Date());
      
      toast.success("Progress record added successfully");
    },
    onError: (error) => {
      console.error("Error adding tracking record:", error);
      toast.error("Failed to add progress record");
      setError("Failed to add progress record. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goal.assignmentDetails?.id) {
      setError("Cannot add tracking record: Missing assignment details");
      return;
    }
    
    const numericValue = parseFloat(value);
    
    if (isNaN(numericValue)) {
      setError("Please enter a valid number");
      return;
    }
    
    setError("");
    
    addRecordMutation.mutate({
      assignedGoalId: goal.assignmentDetails.id,
      value: numericValue,
      recordDate: recordDate.toISOString(),
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-1">{goal.name}</h3>
        <p className="text-sm text-gray-500 mb-2">
          {goal.assignmentDetails?.goalType} goal • Target: {goal.assignmentDetails?.targetValue} {goal.metricUnit}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="value">
              Value ({goal.metricUnit})
            </Label>
            <Input
              id="value"
              type="number"
              step="any"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter value in ${goal.metricUnit}`}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recordDate">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  id="recordDate"
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {recordDate ? format(recordDate, "PPP") : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={recordDate}
                  onSelect={(date) => setRecordDate(date || new Date())}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this progress update"
            rows={2}
          />
        </div>
        
        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={addRecordMutation.isPending}
            className="flex items-center gap-2"
          >
            {addRecordMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Add Record
              </>
            )}
          </Button>
        </div>
      </form>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Progress History</h4>
        {recordsLoading ? (
          <p className="text-sm text-gray-500">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-500">No progress records yet</p>
        ) : (
          <ScrollArea className="h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(new Date(record.recordDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{record.value} {goal.metricUnit}</TableCell>
                    <TableCell>{record.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
      
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default TrackingRecordForm;
