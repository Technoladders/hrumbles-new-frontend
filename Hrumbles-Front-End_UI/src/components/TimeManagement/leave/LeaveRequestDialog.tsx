import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LeaveType, LeaveRequestFormValues, LeaveDayBreakdown,
  EmployeeLeaveBalance,
} from "@/types/leave-types";
import { LeaveDatePicker, ApplyPayload } from "@/components/ui/LeaveDatePicker";
import { EmployeeOption } from "@/hooks/TimeManagement/useEmployeeEmail";
import { ClientDayStatus } from "@/hooks/TimeManagement/useOrgCalendarConfig";
import { Share2, Check, ChevronsUpDown, X, AlertCircle } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandEmpty,
  CommandGroup, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CalendarConfigProp {
  getDayStatus:   (date: Date) => ClientDayStatus;
  isWorkingDay:   (date: Date) => boolean;
  getHolidayName: (date: Date) => string | null;
  isLoading:      boolean;
}

interface LeaveRequestDialogProps {
  open:              boolean;
  onOpenChange:      (open: boolean) => void;
  onSubmit:          (values: LeaveRequestFormValues) => void;
  leaveTypes:        LeaveType[];
  leaveBalances:     EmployeeLeaveBalance[];
  allEmployees:      EmployeeOption[];
  isLoadingEmployees: boolean;
  calendarConfig:    CalendarConfigProp;
  defaultRecipients?: string[];
}

// ── MultiSelect (unchanged logic, just lives here) ──────────
function MultiSelect({
  options, selected, onChange, placeholder, label,
}: {
  options: EmployeeOption[]; selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string; label: string;
}) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const toggle = (v: string) => {
    onChange(selected.includes(v)
      ? selected.filter((id) => id !== v)
      : [...selected, v]);
    setSearch("");
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandEmpty>No {label} found.</CommandEmpty>
          <CommandList className="max-h-[40vh]">
            <CommandGroup>
              {filtered.map((o) => (
                <CommandItem key={o.value} value={o.label.toLowerCase()} onSelect={() => toggle(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4", selected.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      <div className="flex flex-wrap gap-1 mt-2">
        <AnimatePresence>
          {selected.map((id) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                {options.find((o) => o.value === id)?.label}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => toggle(id)}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Popover>
  );
}

// ── Main dialog ───────────────────────────────────────────────
export function LeaveRequestDialog({
  open, onOpenChange, onSubmit, leaveTypes,
  leaveBalances, allEmployees, isLoadingEmployees,
  calendarConfig, defaultRecipients = [],
}: LeaveRequestDialogProps) {

  const form = useForm<LeaveRequestFormValues>({
    defaultValues: {
      leave_type_id:         "",
      date_range:            { startDate: null, endDate: null },
      day_breakdown:         [],
      reason:                "",
      additional_recipients: [],  // ← standardised
      cc_recipients:         [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        leave_type_id:         "",
        date_range:            { startDate: null, endDate: null },
        day_breakdown:         [],
        reason:                "",
        additional_recipients: defaultRecipients,
        cc_recipients:         [],
      });
    }
  }, [open, defaultRecipients]);

  const selectedLeaveTypeId = useWatch({ control: form.control, name: "leave_type_id" });
  const dayBreakdown = useWatch({ control: form.control, name: "day_breakdown" }) as LeaveDayBreakdown[];

  // Balance for the selected leave type
  const selectedBalance = useMemo(
    () => leaveBalances.find((b) => b.leave_type_id === selectedLeaveTypeId),
    [leaveBalances, selectedLeaveTypeId]
  );

  const handleDateApply = useCallback((payload: ApplyPayload) => {
    if (payload.range && payload.daySelections) {
      const breakdown: LeaveDayBreakdown[] = Object.entries(payload.daySelections)
        .map(([isoStr, sel]) => ({
          date: isoStr.split("T")[0],
          type: sel === "first" ? "half_am" : sel === "second" ? "half_pm" : "full",
        } as LeaveDayBreakdown))
        .sort((a, b) => a.date.localeCompare(b.date));
      form.setValue("day_breakdown", breakdown, { shouldDirty: true });
    }
  }, [form]);

  const sortedBreakdown = useMemo(
    () => [...(dayBreakdown ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [dayBreakdown]
  );

  const totalWorkingDays = useMemo(
    () => sortedBreakdown.reduce((s, d) => s + (d.type === "full" ? 1 : 0.5), 0),
    [sortedBreakdown]
  );

  const handleSubmit = (values: LeaveRequestFormValues) => {
    if (!values.date_range.startDate || !values.date_range.endDate) {
      form.setError("date_range", { type: "manual", message: "Please select a date range." });
      return;
    }
    onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  const insufficientBalance =
    selectedBalance !== undefined && totalWorkingDays > selectedBalance.remaining_days;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>📅</motion.span>
            Request Leave
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-4">
            {/* ── Leave type + date range ─────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave type — controlled Select */}
              <FormField
                control={form.control}
                name="leave_type_id"
                rules={{ required: "Leave type is required." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select
                      value={field.value}               // ← controlled
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes.filter((lt) => lt.is_active).map((lt) => {
                          const bal = leaveBalances.find((b) => b.leave_type_id === lt.id);
                          return (
                            <SelectItem key={lt.id} value={lt.id}>
                              <div className="flex items-center justify-between w-full gap-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ background: lt.color }}
                                  />
                                  {lt.name}
                                </div>
                                {bal && (
                                  <span className={cn(
                                    "text-xs font-medium",
                                    bal.remaining_days <= 2
                                      ? "text-rose-500"
                                      : "text-emerald-600"
                                  )}>
                                    {bal.remaining_days}d left
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Balance indicator below select */}
                    {selectedBalance && (
                      <div className={cn(
                        "flex items-center gap-2 text-xs mt-1 px-2 py-1.5 rounded-lg border",
                        insufficientBalance
                          ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20"
                          : selectedBalance.remaining_days <= 2
                          ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20"
                      )}>
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>
                          {insufficientBalance
                            ? `Insufficient balance — ${selectedBalance.remaining_days} days remaining, ${totalWorkingDays} requested`
                            : `${selectedBalance.remaining_days} days remaining`}
                        </span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date picker — org-aware */}
              <FormField
                control={form.control}
                name="date_range"
                rules={{ required: "Date range is required." }}
                render={({ field }) => (
                  <FormItem className="flex flex-col mt-2">
                    <FormLabel>Leave Dates</FormLabel>
                    <FormControl>
                      <LeaveDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        onApply={handleDateApply}
                        calendarConfig={calendarConfig}  // ← org-aware
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Day breakdown ───────────────────────────── */}
            <AnimatePresence>
              {sortedBreakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border p-4 bg-muted/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <FormLabel>Day-by-Day Configuration</FormLabel>
                    <span className="text-sm text-muted-foreground">
                      Total: <span className="font-semibold">{totalWorkingDays}</span> working days
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full = 1 day · 1st Half (AM) = 0.5 day · 2nd Half (PM) = 0.5 day.
                    Weekends, holidays, and non-working days are excluded.
                  </p>
                  <div className="space-y-1.5">
                    {sortedBreakdown.map((item, idx) => (
                      <div
                        key={`${item.date}-${idx}`}
                        className="flex items-center justify-between p-2 bg-background rounded-lg border"
                      >
                        <p className="text-sm font-medium">
                          {format(new Date(item.date), "EEE, MMM dd")}
                        </p>
                        <Controller
                          control={form.control}
                          name={`day_breakdown.${idx}.type`}
                          render={({ field }) => (
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex items-center gap-4"
                            >
                              {[
                                { value: "full",    label: "Full" },
                                { value: "half_am", label: "AM" },
                                { value: "half_pm", label: "PM" },
                              ].map(({ value, label }) => (
                                <FormItem key={value} className="flex items-center gap-1.5 space-y-0">
                                  <FormControl>
                                    <RadioGroupItem value={value} />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm cursor-pointer">
                                    {label}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Pre-submit summary ──────────────────────── */}
            {totalWorkingDays > 0 && selectedLeaveTypeId && (
              <div className={cn(
                "rounded-xl border p-4 text-sm space-y-1",
                insufficientBalance
                  ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20"
                  : "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20"
              )}>
                <p className="font-semibold text-foreground">Summary</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{totalWorkingDays} working day{totalWorkingDays !== 1 ? "s" : ""}</span>{" "}
                  will be deducted from{" "}
                  <span className="font-medium" style={{ color: leaveTypes.find((t) => t.id === selectedLeaveTypeId)?.color }}>
                    {leaveTypes.find((t) => t.id === selectedLeaveTypeId)?.name}
                  </span>
                </p>
                {selectedBalance && (
                  <p className="text-muted-foreground">
                    Remaining after: {" "}
                    <span className={cn(
                      "font-semibold",
                      (selectedBalance.remaining_days - totalWorkingDays) < 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                    )}>
                      {Math.max(0, selectedBalance.remaining_days - totalWorkingDays)} days
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* ── Reason ─────────────────────────────────── */}
            <FormField
              control={form.control}
              name="reason"
              rules={{ required: "Reason is required." }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="text-rose-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a reason for your leave"
                      className="min-h-[90px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Recipients ─────────────────────────────── */}
            <div className="rounded-xl border p-4 bg-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <FormLabel>Email Notification</FormLabel>
                </div>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>

              {isLoadingEmployees ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Loading employees…
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="additional_recipients"   // ← standardised
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">To (additional recipients)</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={allEmployees}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Add recipients…"
                            label="recipients"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cc_recipients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">CC</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={allEmployees}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Add CC recipients…"
                            label="CC recipients"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); onOpenChange(false); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={insufficientBalance}
                className={cn(
                  insufficientBalance
                    ? "bg-rose-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}