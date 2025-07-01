
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LeaveType } from "@/types/leave-types";

type LeaveTypeFormValues = Omit<LeaveType, 'id' | 'created_at' | 'updated_at'>;

interface AddLeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeaveTypeFormValues) => void;
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
  const form = useForm<LeaveTypeFormValues>({
    defaultValues: initialData ? {
      name: initialData.name,
      annual_allowance: initialData.annual_allowance,
      monthly_allowance: initialData.monthly_allowance,
      allow_carryforward: initialData.allow_carryforward,
      icon: initialData.icon,
      color: initialData.color,
      is_active: initialData.is_active
    } : {
      name: "",
      annual_allowance: 0,
      monthly_allowance: 0,
      allow_carryforward: false,
      icon: "calendar",
      color: "#3b82f6",
      is_active: true
    }
  });

  const handleSubmit = (values: LeaveTypeFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Leave Type" : "Add New Leave Type"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Sick Leave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="annual_allowance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Allowance (days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step={1} 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="monthly_allowance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Allowance (days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      step={0.5} 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="Icon name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-12 h-10 p-1" 
                        {...field} 
                      />
                      <Input 
                        value={field.value} 
                        onChange={(e) => field.onChange(e.target.value)} 
                        className="flex-1" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allow_carryforward"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Allow Carry Forward</FormLabel>
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
            
            <DialogFooter>
              <Button type="submit">{isEditing ? "Update Leave Type" : "Add Leave Type"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
