import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Briefcase } from "lucide-react";
import { LeaveType, LeavePolicySettings, EmploymentType } from "@/types/leave-types";
import { cn } from "@/lib/utils";

// ── Validation schema ─────────────────────────────────────────────────────────
const schema = z.object({
  name:                     z.string().min(1, "Policy name is required"),
  description:              z.string().optional(),
  color:                    z.string(),
  annual_allowance:         z.number({ invalid_type_error: "Enter a number" }).positive("Must be > 0"),
  gender_eligibility:       z.array(z.string()).min(1, "Select at least one gender"),
  is_active:                z.boolean(),
  // applicability
  employment_types:         z.array(z.string()),
  min_tenure_months:        z.number().min(0),
  // policy settings
  policy_proration:         z.boolean(),
  policy_probation_days:    z.number().min(0),
  policy_can_apply_probation: z.boolean(),
  policy_max_consecutive:   z.number().min(1),
  policy_carry_forward_limit: z.number().min(0),
  policy_encashment:        z.boolean(),
  policy_accrual_freq:      z.enum(["annual_upfront", "monthly"]),
});

type FormValues = z.infer<typeof schema>;

interface AddLeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: LeaveType;
  isEditing?: boolean;
}

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#78716c",
];

const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "permanent",  label: "Permanent" },
  { value: "contract",   label: "Contract" },
  { value: "probation",  label: "Probation" },
  { value: "intern",     label: "Intern" },
  { value: "part_time",  label: "Part-time" },
];

const TABS = [
  { key: "general",       label: "General",       fields: ["name", "description", "color", "is_active"] },
  { key: "eligibility",   label: "Eligibility",   fields: ["gender_eligibility", "employment_types", "min_tenure_months", "policy_probation_days", "policy_can_apply_probation"] },
  { key: "rules",         label: "Accrual & Rules", fields: ["annual_allowance", "policy_accrual_freq", "policy_proration", "policy_carry_forward_limit", "policy_max_consecutive", "policy_encashment"] },
] as const;

type TabKey = typeof TABS[number]["key"];

export function AddLeaveTypeDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
}: AddLeaveTypeDialogProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const defaultValues: FormValues = {
    name:                       initialData?.name ?? "",
    description:                initialData?.description ?? "",
    color:                      initialData?.color ?? "#6366f1",
    annual_allowance:           initialData?.annual_allowance ?? 12,
    gender_eligibility:         initialData?.gender_eligibility ?? ["Male", "Female", "Other"],
    is_active:                  initialData?.is_active ?? true,
    employment_types:           initialData?.applicability?.employment_types ?? [],
    min_tenure_months:          initialData?.applicability?.min_tenure_months ?? 0,
    policy_proration:           initialData?.policy_settings?.proration ?? true,
    policy_probation_days:      initialData?.policy_settings?.probation_period_days ?? 0,
    policy_can_apply_probation: initialData?.policy_settings?.can_apply_during_probation ?? true,
    policy_max_consecutive:     initialData?.policy_settings?.max_consecutive_days ?? 15,
    policy_carry_forward_limit: initialData?.policy_settings?.carry_forward_limit ?? 0,
    policy_encashment:          initialData?.policy_settings?.encashment_allowed ?? false,
    policy_accrual_freq:        initialData?.policy_settings?.accrual_frequency ?? "annual_upfront",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setActiveTab("general");
    }
  }, [open, initialData]);

  // Track which tabs have errors for indicator dots
  const errors = form.formState.errors;
  const tabHasError = (tab: typeof TABS[number]) =>
    tab.fields.some((f) => f in errors);

  const watchedName    = form.watch("name");
  const watchedColor   = form.watch("color");
  const watchedAllowance = form.watch("annual_allowance");
  const watchedActive  = form.watch("is_active");

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      name:                values.name,
      description:         values.description,
      icon:                "calendar",
      color:               values.color,
      annual_allowance:    values.annual_allowance,
      gender_eligibility:  values.gender_eligibility,
      is_active:           values.is_active,
      allow_carryforward:  values.policy_carry_forward_limit > 0,
      monthly_allowance:   values.policy_accrual_freq === "monthly"
                             ? values.annual_allowance / 12 : 0,
      applicability: {
        employment_types:  values.employment_types,
        department_ids:    [],
        designation_ids:   [],
        min_tenure_months: values.min_tenure_months,
      },
      policy_settings: {
        proration:                  values.policy_proration,
        probation_period_days:      values.policy_probation_days,
        can_apply_during_probation: values.policy_can_apply_probation,
        max_consecutive_days:       values.policy_max_consecutive,
        requires_approval:          true,
        carry_forward_limit:        values.policy_carry_forward_limit,
        encashment_allowed:         values.policy_encashment,
        accrual_frequency:          values.policy_accrual_freq,
      } satisfies LeavePolicySettings,
    });
  };

  const genders = ["Male", "Female", "Other"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-lg">
            {isEditing ? "Edit Leave Policy" : "Create Leave Policy"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: tabs + preview */}
          <div className="w-52 shrink-0 border-r flex flex-col">
            {/* Tab navigation */}
            <nav className="p-3 space-y-1">
              {TABS.map((tab) => {
                const hasErr = tabHasError(tab);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                      activeTab === tab.key
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {tab.label}
                    {hasErr && (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>

            <Separator />

            {/* Live preview card */}
            <div className="p-3 flex-1 flex flex-col justify-end">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preview
              </p>
              <div className="rounded-xl border bg-background p-3 space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: watchedColor }}
                  >
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {watchedName || "Policy name"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {watchedAllowance || 0} days/yr
                    </p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "text-[11px]",
                    watchedActive
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {watchedActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: form content */}
          <ScrollArea className="flex-1 min-w-0">
            <Form {...form}>
              <form
                id="leave-type-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="p-6 space-y-5"
              >
                {/* ── GENERAL ─────────────────────────────────────── */}
                {activeTab === "general" && (
                  <>
                    <FormField
                      control={form.control} name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Name <span className="text-rose-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Annual Leave, Sick Leave" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control} name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Briefly describe this leave policy…"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Color */}
                    <FormField
                      control={form.control} name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Colour Label</FormLabel>
                          <div className="space-y-3">
                            {/* Presets */}
                            <div className="flex flex-wrap gap-2">
                              {COLOR_PRESETS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => field.onChange(c)}
                                  className={cn(
                                    "w-7 h-7 rounded-lg transition-all",
                                    field.value === c
                                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                                      : "hover:scale-110"
                                  )}
                                  style={{ background: c }}
                                />
                              ))}
                            </div>
                            {/* Custom hex */}
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-10 h-9 rounded-md border cursor-pointer p-0.5"
                              />
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-28 font-mono text-sm"
                                placeholder="#6366f1"
                              />
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control} name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border p-4">
                          <div>
                            <FormLabel className="text-base font-medium">Active</FormLabel>
                            <FormDescription>
                              Inactive policies are hidden from employees
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* ── ELIGIBILITY ──────────────────────────────────── */}
                {activeTab === "eligibility" && (
                  <>
                    {/* Gender */}
                    <FormField
                      control={form.control} name="gender_eligibility"
                      render={() => (
                        <FormItem>
                          <FormLabel>
                            Gender Eligibility <span className="text-rose-500">*</span>
                          </FormLabel>
                          <FormDescription>
                            Who can apply for this leave type
                          </FormDescription>
                          <div className="flex gap-4 pt-1">
                            {genders.map((g) => (
                              <FormField
                                key={g}
                                control={form.control}
                                name="gender_eligibility"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(g)}
                                        onCheckedChange={(checked) =>
                                          checked
                                            ? field.onChange([...field.value, g])
                                            : field.onChange(field.value.filter((v) => v !== g))
                                        }
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {g}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Employment types */}
                    <FormField
                      control={form.control} name="employment_types"
                      render={() => (
                        <FormItem>
                          <FormLabel>Employment Type Eligibility</FormLabel>
                          <FormDescription>
                            Leave blank to apply to all employment types
                          </FormDescription>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {EMPLOYMENT_TYPE_OPTIONS.map((et) => (
                              <FormField
                                key={et.value}
                                control={form.control}
                                name="employment_types"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 rounded-lg border px-3 py-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(et.value)}
                                        onCheckedChange={(checked) =>
                                          checked
                                            ? field.onChange([...field.value, et.value])
                                            : field.onChange(field.value.filter((v) => v !== et.value))
                                        }
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {et.label}
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Tenure + Probation */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control} name="min_tenure_months"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Tenure (months)</FormLabel>
                            <FormControl>
                              <Input
                                type="number" min={0}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>0 = no minimum</FormDescription>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control} name="policy_probation_days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Probation Lock (days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number" min={0}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Days after joining before available</FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control} name="policy_can_apply_probation"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border p-4">
                          <div>
                            <FormLabel>Allow during probation period</FormLabel>
                            <FormDescription>
                              If off, employees can't apply until probation ends
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* ── RULES ────────────────────────────────────────── */}
                {activeTab === "rules" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control} name="annual_allowance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Annual Allowance (days) <span className="text-rose-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number" step={0.5} min={0.5}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control} name="policy_accrual_freq"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accrual Frequency</FormLabel>
                            {/* Controlled Select — uses value not defaultValue */}
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="annual_upfront">
                                  Annual — given upfront on Jan 1
                                </SelectItem>
                                <SelectItem value="monthly">
                                  Monthly — 1/12th credited each month
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control} name="policy_proration"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border p-4">
                          <div>
                            <FormLabel>Enable Proration</FormLabel>
                            <FormDescription>
                              New joiners receive days proportional to their start date
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control} name="policy_carry_forward_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Carry Forward (days)</FormLabel>
                            <FormControl>
                              <Input
                                type="number" min={0}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>0 = no carry forward</FormDescription>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control} name="policy_max_consecutive"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Consecutive Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number" min={1}
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control} name="policy_encashment"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border p-4">
                          <div>
                            <FormLabel>Allow Encashment</FormLabel>
                            <FormDescription>
                              Unused leave can be converted to cash payout
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </form>
            </Form>
          </ScrollArea>
        </div>

        <Separator />
        <DialogFooter className="px-6 py-4 shrink-0">
          {/* Tab navigation buttons */}
          <div className="flex items-center gap-2 mr-auto">
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  activeTab === tab.key
                    ? "bg-indigo-600 scale-125"
                    : tabHasError(tab)
                    ? "bg-rose-400"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                )}
                aria-label={tab.label}
              />
            ))}
          </div>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="leave-type-form"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isEditing ? "Update Policy" : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}