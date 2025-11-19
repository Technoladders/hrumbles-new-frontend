// Updated LeaveRequestDialog.tsx - Integrated LeaveDatePicker with onApply to set day_breakdown from payload (mapped types, sorted).
// Removed auto-set useEffect (now handled by picker). Added holidays to props and passed to picker.
// Kept day breakdown section for confirmation/editing, but sorted for stable display. Fixed reactivity by using sorted array with stable indices.
// Updated MultiSelect badges to use motion for animation. Added total days display in breakdown section.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LeaveType, LeaveRequestFormValues, LeaveDayBreakdown } from "@/types/leave-types";
import { LeaveDatePicker, ApplyPayload } from "@/components/ui/LeaveDatePicker";
import { EmployeeOption } from "@/hooks/TimeManagement/useEmployeeEmail";
import { Share2, Check, ChevronsUpDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LeaveRequestFormValues) => void;
  leaveTypes: LeaveType[];
  allEmployees: EmployeeOption[];
  isLoadingEmployees: boolean;
  holidays?: Date[]; // NEW: Pass holidays for picker disabling
}

interface MultiSelectProps {
  options: EmployeeOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  label: string;
}

function MultiSelect({ options, selected, onChange, placeholder, label }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((id) => id !== value)
      : [...selected, value];
    onChange(newSelected);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
          onClick={() => setOpen(true)}
        >
          {selected.length > 0
            ? `${selected.length} selected`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
          <CommandList className="max-h-[calc(40vh-4rem)]">
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label.toLowerCase()}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      <div className="flex flex-wrap gap-1 mt-2">
        <AnimatePresence>
          {selected.map((id) => {
            const label = options.find((opt) => opt.value === id)?.label;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleSelect(id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Popover>
  );
}

export function LeaveRequestDialog({ open, onOpenChange, onSubmit, leaveTypes, allEmployees, isLoadingEmployees, holidays = [] }: LeaveRequestDialogProps) {
  const form = useForm<LeaveRequestFormValues>({
    defaultValues: {
      leave_type_id: "",
      date_range: { startDate: null, endDate: null },
      day_breakdown: [],
      reason: "",
      additional_recipient: [],
      cc_recipient: [],
    },
  });

  const dateRange = form.watch("date_range");
  const dayBreakdown = useWatch({ control: form.control, name: "day_breakdown" }) as LeaveDayBreakdown[];

  // Handle date picker apply: set day_breakdown from payload (only working days, mapped types, sorted)
  const handleDateApply = useCallback((payload: ApplyPayload) => {
    if (payload.range && payload.daySelections) {
      const breakdown: LeaveDayBreakdown[] = Object.entries(payload.daySelections)
        .map(([isoStr, sel]) => {
          const date = isoStr.split('T')[0]; // yyyy-MM-dd
          let type: 'full' | 'half_am' | 'half_pm' = 'full';
          if (sel === 'first') type = 'half_am';
          if (sel === 'second') type = 'half_pm';
          return { date, type };
        })
        .sort((a, b) => a.date.localeCompare(b.date)); // Ensure stable order
      form.setValue('day_breakdown', breakdown, { shouldDirty: true });
    }
  }, [form]);

  // Sorted breakdown for stable display/editing
  const sortedDayBreakdown = useMemo(() => 
    [...(dayBreakdown || [])].sort((a, b) => a.date.localeCompare(b.date)), 
    [dayBreakdown]
  );

  // Calculate total working days from breakdown
  const totalWorkingDays = useMemo(() => {
    return sortedDayBreakdown.reduce((sum, item) => {
      return sum + (item.type === 'full' ? 1 : 0.5);
    }, 0);
  }, [sortedDayBreakdown]);

  const handleSubmit = (values: LeaveRequestFormValues) => {
    if (!values.date_range.startDate || !values.date_range.endDate) {
      form.setError("date_range", { type: "manual", message: "Please select a valid date range." });
      return;
    }
    onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              📅
            </motion.div>
            Request Leave
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
            {/* --- CORE LEAVE DETAILS --- */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <FormField
                control={form.control}
                name="leave_type_id"
                rules={{ required: "Leave type is required." }}
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
                        {leaveTypes.filter(lt => lt.is_active).map((type) => (
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
                        holidays={holidays}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* --- DYNAMIC DAY BREAKDOWN SECTION --- */}
            <AnimatePresence>
              {sortedDayBreakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3 rounded-lg border p-4 bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: 1 }}
                    >
                      ⚙️
                    </motion.div>
                    <FormLabel>Day-by-Day Configuration</FormLabel>
                    <div className="ml-auto text-sm text-muted-foreground">
                      Total: <span className="font-semibold">{totalWorkingDays}</span> days
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Adjust leave type for each working day if needed (e.g., for a half-day). Weekends and holidays are excluded.
                  </p>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ staggerChildren: 0.05 }}
                      className="space-y-2"
                    >
                      {sortedDayBreakdown.map((item, index) => (
                        <motion.div
                          key={`${item.date}-${index}`} // Stable key with index
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-2 bg-background rounded-md shadow-sm border"
                        >
                          <p className="font-medium text-sm">
                            {format(new Date(item.date), 'EEEE, MMM dd')}
                          </p>
                          <Controller
                            control={form.control}
                            name={`day_breakdown.${index}.type`}
                            render={({ field }) => (
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex items-center space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <RadioGroupItem value="full" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">Full</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <RadioGroupItem value="half_am" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">AM</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <RadioGroupItem value="half_pm" />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">PM</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            )}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FormField
                control={form.control}
                name="reason"
                rules={{ required: "Reason is mandatory." }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a reason for your leave"
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            {/* --- RECIPIENTS SECTION --- */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 rounded-lg border p-4 bg-muted/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Share2 className="h-4 w-4 mr-2 text-primary" />
                  <FormLabel>Email Notification</FormLabel>
                </div>
                <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-md">
                  Optional
                </span>
              </div>
              {isLoadingEmployees ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-8"
                >
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="ml-2 text-sm text-muted-foreground">Loading employees...</p>
                </motion.div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="additional_recipient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Additional Recipients (To)</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={allEmployees}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Add more recipients..."
                            label="recipients"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cc_recipient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">CC Recipients</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={allEmployees}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Add CC recipients..."
                            label="CC recipients"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </motion.div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}