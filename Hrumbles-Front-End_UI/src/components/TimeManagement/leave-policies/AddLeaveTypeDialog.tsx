import { useState, useEffect } from "react";
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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LeaveType, LeavePolicySettings } from "@/types/leave-types";
import { Separator } from "@/components/ui/separator";

// Helper to define form structure matching our new Type
interface LeaveTypeFormValues {
  name: string;
  description: string;
  icon: string;
  color: string;
  annual_allowance: number;
  gender_eligibility: string[];
  is_active: boolean;
  // Flattened Policy Settings for form handling
  policy_proration: boolean;
  policy_probation_days: number;
  policy_can_apply_probation: boolean;
  policy_max_consecutive: number;
  policy_carry_forward_limit: number;
  policy_encashment: boolean;
  policy_accrual_freq: 'annual_upfront' | 'monthly';
}

interface AddLeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: LeaveType;
  isEditing?: boolean;
}

export function AddLeaveTypeDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  initialData,
  isEditing = false
}: AddLeaveTypeDialogProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'eligibility' | 'rules'>('general');

  // Default Policy Settings
  const defaultPolicy: LeavePolicySettings = {
    proration: true,
    probation_period_days: 0,
    can_apply_during_probation: true,
    max_consecutive_days: 15,
    requires_approval: true,
    carry_forward_limit: 0,
    encashment_allowed: false,
    accrual_frequency: 'annual_upfront'
  };

  const form = useForm<LeaveTypeFormValues>({
    defaultValues: {
      name: "",
      description: "",
      icon: "calendar",
      color: "#3b82f6",
      annual_allowance: 12,
      gender_eligibility: ["Male", "Female", "Other"],
      is_active: true,
      
      // Policy defaults
      policy_proration: defaultPolicy.proration,
      policy_probation_days: defaultPolicy.probation_period_days,
      policy_can_apply_probation: defaultPolicy.can_apply_during_probation,
      policy_max_consecutive: defaultPolicy.max_consecutive_days,
      policy_carry_forward_limit: defaultPolicy.carry_forward_limit,
      policy_encashment: defaultPolicy.encashment_allowed,
      policy_accrual_freq: defaultPolicy.accrual_frequency
    }
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      const policy = initialData.policy_settings || defaultPolicy;
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        icon: initialData.icon,
        color: initialData.color,
        annual_allowance: initialData.annual_allowance,
        gender_eligibility: initialData.gender_eligibility || ["Male", "Female", "Other"],
        is_active: initialData.is_active,
        
        policy_proration: policy.proration,
        policy_probation_days: policy.probation_period_days,
        policy_can_apply_probation: policy.can_apply_during_probation,
        policy_max_consecutive: policy.max_consecutive_days,
        policy_carry_forward_limit: policy.carry_forward_limit,
        policy_encashment: policy.encashment_allowed,
        policy_accrual_freq: policy.accrual_frequency
      });
    }
  }, [initialData, open]);

  const handleSubmit = (values: LeaveTypeFormValues) => {
    // Reconstruct the nested object structure for the API
    const submissionData = {
      name: values.name,
      description: values.description,
      icon: values.icon,
      color: values.color,
      annual_allowance: values.annual_allowance,
      gender_eligibility: values.gender_eligibility,
      is_active: values.is_active,
      allow_carryforward: values.policy_carry_forward_limit > 0, // Legacy support
      monthly_allowance: values.policy_accrual_freq === 'monthly' ? values.annual_allowance / 12 : 0, // Legacy support
      
      policy_settings: {
        proration: values.policy_proration,
        probation_period_days: values.policy_probation_days,
        can_apply_during_probation: values.policy_can_apply_probation,
        max_consecutive_days: values.policy_max_consecutive,
        requires_approval: true,
        carry_forward_limit: values.policy_carry_forward_limit,
        encashment_allowed: values.policy_encashment,
        accrual_frequency: values.policy_accrual_freq
      }
    };

    onSubmit(submissionData);
  };

  const genders = [
    { id: "Male", label: "Male" },
    { id: "Female", label: "Female" },
    { id: "Other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Leave Policy" : "Create New Leave Policy"}</DialogTitle>
        </DialogHeader>

        {/* Custom Tab Navigation */}
        <div className="flex space-x-2 border-b mb-4">
          <Button
            variant={activeTab === 'general' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('general')}
            className="rounded-b-none"
          >
            General Info
          </Button>
          <Button
            variant={activeTab === 'eligibility' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('eligibility')}
            className="rounded-b-none"
          >
            Eligibility
          </Button>
          <Button
            variant={activeTab === 'rules' ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab('rules')}
            className="rounded-b-none"
          >
            Accrual & Rules
          </Button>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            {/* --- TAB 1: GENERAL INFO --- */}
            <div className={activeTab === 'general' ? 'block space-y-4' : 'hidden'}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Annual Leave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Label</FormLabel>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1" {...field} />
                        <Input {...field} />
                      </div>
                    </FormItem>
                  )}
                />
                {/* <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Name</FormLabel>
                      <FormControl>
                         <Input placeholder="calendar" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                /> */}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this leave policy..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>Enable or disable this policy globally</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* --- TAB 2: ELIGIBILITY --- */}
            <div className={activeTab === 'eligibility' ? 'block space-y-4' : 'hidden'}>
              <FormField
                control={form.control}
                name="gender_eligibility"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Gender Eligibility</FormLabel>
                      <FormDescription>Select which employees can apply for this leave.</FormDescription>
                    </div>
                    <div className="flex gap-4">
                      {genders.map((gender) => (
                        <FormField
                          key={gender.id}
                          control={form.control}
                          name="gender_eligibility"
                          render={({ field }) => {
                            return (
                              <FormItem key={gender.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(gender.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, gender.id])
                                        : field.onChange(field.value?.filter((value) => value !== gender.id))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{gender.label}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
              
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="policy_probation_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probation Lock (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormDescription>Days after joining before leave is available.</FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="policy_can_apply_probation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-6">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Allow during Probation?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* --- TAB 3: ACCRUAL & RULES --- */}
            <div className={activeTab === 'rules' ? 'block space-y-4' : 'hidden'}>
               <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="annual_allowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Allowance (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="policy_accrual_freq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrual Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="annual_upfront">Annual (Upfront)</SelectItem>
                          <SelectItem value="monthly">Monthly (Accrued)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="policy_proration"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Proration</FormLabel>
                      <FormDescription>Calculates allowance based on joining date for new hires.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="policy_carry_forward_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Carry Forward (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormDescription>0 to disable carry forward.</FormDescription>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="policy_max_consecutive"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Consecutive Days</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="submit">{isEditing ? "Update Policy" : "Create Policy"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}