import { useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ArrowRight, Pencil } from "lucide-react";
import { LeavePolicyPeriod } from "@/types/leave-types";

interface LeavePeriodSettingsProps {
  policyPeriod:  LeavePolicyPeriod | null;
  onUpdate:      (data: Partial<LeavePolicyPeriod>) => void;
  isOpen:        boolean;
  setIsOpen:     (open: boolean) => void;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function LeavePeriodSettings({
  policyPeriod,
  onUpdate,
  isOpen,
  setIsOpen,
}: LeavePeriodSettingsProps) {
  const form = useForm({
    defaultValues: {
      start_month:      policyPeriod?.start_month  ?? 1,
      is_calendar_year: policyPeriod?.is_calendar_year ?? true,
    },
  });

  // Sync form when policyPeriod loads async (fixes stale-default issue)
  useEffect(() => {
    if (policyPeriod) {
      form.reset({
        start_month:      policyPeriod.start_month,
        is_calendar_year: policyPeriod.is_calendar_year,
      });
    }
  }, [policyPeriod]);

  const watchIsCalendar = form.watch("is_calendar_year");
  const watchStartMonth = form.watch("start_month");

  const endMonthIndex = watchStartMonth === 1 ? 11 : (watchStartMonth - 2) % 12;
  const endMonthName  = MONTHS[endMonthIndex];
  const startMonthName = MONTHS[(watchStartMonth - 1) % 12];

  const handleSubmit = (values: { start_month: number; is_calendar_year: boolean }) => {
    onUpdate(values);
    setIsOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              Leave Year Settings
            </CardTitle>
            <CardDescription>How leave years are calculated</CardDescription>
          </div>
          {/* <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button> */}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* Current period display */}
        {/* <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
          <CalendarDays className="h-5 w-5 text-indigo-600 shrink-0" />
          <div>
            {policyPeriod?.is_calendar_year ? (
              <>
                <p className="font-medium text-indigo-700 dark:text-indigo-300">Calendar Year</p>
                <p className="text-xs text-muted-foreground">January → December</p>
              </>
            ) : policyPeriod ? (
              <>
                <p className="font-medium text-indigo-700 dark:text-indigo-300">Custom Year</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {MONTHS[(policyPeriod.start_month - 1) % 12]}
                  <ArrowRight className="h-3 w-3" />
                  {MONTHS[(policyPeriod.start_month + 10) % 12]}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">Not configured</p>
            )}
          </div>
        </div> */}

        <Separator />

        <div className="space-y-2 text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-0.5">Accrual</p>
            <p>Leave is accrued monthly or given upfront based on each policy's setting.</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-0.5">Carry Forward</p>
            <p>Unused balance carries forward to the next year up to the policy limit.</p>
          </div>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Leave Year Settings</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control} name="is_calendar_year"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border p-4">
                    <div>
                      <FormLabel className="font-medium">Use Calendar Year</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        January 1 – December 31
                      </p>
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

              {!watchIsCalendar && (
                <FormField
                  control={form.control} name="start_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Year Start Month</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONTHS.map((m, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        Year period: <span className="font-medium">{startMonthName}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{endMonthName}</span>
                      </p>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}