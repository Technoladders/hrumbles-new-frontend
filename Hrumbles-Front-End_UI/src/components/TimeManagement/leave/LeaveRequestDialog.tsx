import { useState } from "react";
import { useForm } from "react-hook-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaveType } from "@/types/leave-types";
import { Holiday } from "@/types/time-tracker-types";

// Utility function to normalize date to midnight local time (IST)
const normalizeToMidnight = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0); // Set to midnight local time
  return normalized;
};

export type LeaveRequestFormValues = {
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string;
};

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LeaveRequestFormValues) => void;
  leaveTypes: LeaveType[];
  holidays: Holiday[];
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  leaveTypes,
  holidays,
}: LeaveRequestDialogProps) {
  const form = useForm<LeaveRequestFormValues>({
    defaultValues: {
      leave_type_id: "",
      start_date: normalizeToMidnight(new Date()), // Default to midnight local time
      end_date: normalizeToMidnight(new Date()), // Default to midnight local time
      reason: "",
    },
  });

  const activeLeaveTypes = leaveTypes.filter(type => type.is_active);

  // Get all holiday dates, normalized to midnight
  const holidayDates = holidays.map(holiday => normalizeToMidnight(new Date(holiday.date)));

  // Custom validation to check if there's at least one working day
  const validateDateRange = () => {
    const start = form.getValues("start_date");
    const end = form.getValues("end_date");
    
    console.log('Validating date range:', { 
      start: format(start, "yyyy-MM-dd"), 
      end: format(end, "yyyy-MM-dd") 
    });
    
    if (!start || !end) return true;
    
    // Check if start date is before or equal to end date
    if (start > end) {
      form.setError("end_date", {
        type: "manual",
        message: "End date must be after or equal to start date",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = (values: LeaveRequestFormValues) => {
    console.log('Form submitted with values:', {
      leave_type_id: values.leave_type_id,
      start_date: format(values.start_date, "yyyy-MM-dd"),
      end_date: format(values.end_date, "yyyy-MM-dd"),
      reason: values.reason,
    });
    if (validateDateRange()) {
      onSubmit(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="leave_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeLeaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            ></div>
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              const normalizedDate = normalizeToMidnight(date);
                              console.log('Start date selected:', format(normalizedDate, "yyyy-MM-dd"));
                              field.onChange(normalizedDate);
                            }
                          }}
                          disabled={(date) => 
                            date < normalizeToMidnight(new Date())
                          }
                          modifiers={{
                            holiday: holidayDates,
                          }}
                          modifiersClassNames={{
                            holiday: "bg-red-100",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              const normalizedDate = normalizeToMidnight(date);
                              console.log('End date selected:', format(normalizedDate, "yyyy-MM-dd"));
                              field.onChange(normalizedDate);
                            }
                          }}
                          disabled={(date) => 
                            date < normalizeToMidnight(form.getValues("start_date"))
                          }
                          modifiers={{
                            holiday: holidayDates,
                          }}
                          modifiersClassNames={{
                            holiday: "bg-red-100",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a reason for your leave request"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}