
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LeavePolicyPeriod } from "@/types/leave-types";

interface LeavePeriodSettingsProps {
  policyPeriod: LeavePolicyPeriod | null;
  onUpdate: (data: Partial<LeavePolicyPeriod>) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function LeavePeriodSettings({
  policyPeriod,
  onUpdate,
  isOpen,
  setIsOpen
}: LeavePeriodSettingsProps) {
  const form = useForm({
    defaultValues: {
      start_month: policyPeriod?.start_month || 1,
      is_calendar_year: policyPeriod?.is_calendar_year ?? true,
    },
  });

  // Calculate end month based on start month
  const getEndMonth = (startMonth: number) => {
    if (startMonth === 1) return "December";
    return months[(startMonth - 2) % 12].label;
  };

  const handleSubmit = (values: { start_month: number; is_calendar_year: boolean }) => {
    onUpdate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Year Settings</CardTitle>
        <CardDescription>
          Configure how leave years are calculated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-medium">Leave Year Period</h3>
              <p className="text-sm text-muted-foreground">
                {policyPeriod?.is_calendar_year
                  ? "Calendar year (January - December)"
                  : `Custom period (${
                      months.find(m => m.value === policyPeriod?.start_month)?.label
                    } - ${getEndMonth(policyPeriod?.start_month || 1)})`}
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsOpen(true)}>
              Edit
            </Button>
          </div>
          
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Leave Accrual</h3>
            <p className="text-sm text-muted-foreground">
              Leave is accrued monthly based on the configured monthly allowance
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Carry Forward</h3>
            <p className="text-sm text-muted-foreground">
              Unused leave can be carried forward to the next period if allowed by the leave type
            </p>
          </div>
        </div>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Year Settings</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="is_calendar_year"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use Calendar Year</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!form.watch("is_calendar_year") && (
                <FormField
                  control={form.control}
                  name="start_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Month</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select start month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
