// src/components/EmployeeAssociationEditForm.tsx
import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Import Select if you want to use it for Job ID or Stage
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CandidateDetail } from '@/types/company'; // Use the combined type
import { Database } from '@/types/database.types'; // Import generated types

interface EmployeeAssociationEditFormProps {
  employee: CandidateDetail; // Pass the full combined detail object containing association_id etc.
  onClose: () => void; // Callback to close the modal
}

// Type alias for Supabase update payload for this specific table
type EmployeeAssociationUpdate = Database['public']['Tables']['employee_associations']['Update'];

// Helper: Check if initial value allows editing (null, empty, or 'N/A')
const isEditableValue = (value: string | null | undefined): boolean => !value || value.trim() === '' || value.trim().toUpperCase() === 'N/A';

// Zod schema for fields editable in this form (targeting employee_associations)
// job_id is always editable here
const editAssociationSchema = z.object({
  job_id: z.string().optional().nullable(), // Allow empty string -> null
  designation: z.string().optional().nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
  // Optional: Add start_date, end_date, is_current if you want them editable
});

type EditAssociationFormValues = z.infer<typeof editAssociationSchema>;

const EmployeeAssociationEditForm: React.FC<EmployeeAssociationEditFormProps> = ({ employee, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine initial editability based on the passed employee data
  const canEditDesignation = isEditableValue(employee.designation);
  const canEditOwner = isEditableValue(employee.contact_owner);
  const canEditStage = isEditableValue(employee.contact_stage);

  const form = useForm<EditAssociationFormValues>({
    resolver: zodResolver(editAssociationSchema),
    defaultValues: {
      job_id: employee.job_id || "", // Always editable
      designation: canEditDesignation ? "" : employee.designation || "",
      contact_owner: canEditOwner ? "" : employee.contact_owner || "",
      contact_stage: canEditStage ? "" : employee.contact_stage || "",
    },
  });

   // Reset form if the employee prop changes
   useEffect(() => {
        form.reset({
            job_id: employee.job_id || "",
            designation: isEditableValue(employee.designation) ? "" : employee.designation || "",
            contact_owner: isEditableValue(employee.contact_owner) ? "" : employee.contact_owner || "",
            contact_stage: isEditableValue(employee.contact_stage) ? "" : employee.contact_stage || "",
        });
    }, [employee, form]); // Depend on employee prop

  // Mutation to update the employee_associations table
  const editMutation = useMutation({
    mutationFn: async (data: EditAssociationFormValues) => {
      // Use the specific association ID (PK of employee_associations)
      if (!employee.association_id) {
        throw new Error("Missing association ID for update.");
      }

      const updatePayload: EmployeeAssociationUpdate = {};
      let changesMade = false;

       // Job ID (always potentially updatable)
       const newJobId = data.job_id?.trim() ? data.job_id.trim() : null; // Ensure null if empty
       if (newJobId !== (employee.job_id || null)) {
            updatePayload.job_id = newJobId;
            changesMade = true;
       }

      // Conditionally updatable fields
      if (canEditDesignation && data.designation && data.designation.trim() !== '') { updatePayload.designation = data.designation.trim(); changesMade = true; }
      if (canEditOwner && data.contact_owner && data.contact_owner.trim() !== '') { updatePayload.contact_owner = data.contact_owner.trim(); changesMade = true; }
      if (canEditStage && data.contact_stage && data.contact_stage.trim() !== '') { updatePayload.contact_stage = data.contact_stage.trim(); changesMade = true; }
      // Add checks/updates for start_date, end_date, is_current if they are in the form schema

      if (!changesMade) {
           toast({ title: "No Changes", description: "No editable fields were modified." });
           return { noChanges: true }; // Indicate nothing to update
      }

      console.log("Updating employee_associations row ID:", employee.association_id, "with payload:", updatePayload);

      // Update using the association ID
      const { error } = await supabase
        .from('employee_associations')
        .update(updatePayload)
        .eq('id', employee.association_id); // Target row by its own PK

      if (error) {
          console.error("Supabase update error (employee_associations):", error);
          throw error;
      }
      return { noChanges: false };
    },
    onSuccess: (result) => {
        if (!result?.noChanges) {
             toast({ title: "Association Updated", description: "Details updated successfully." });
             queryClient.invalidateQueries({ queryKey: ['company-employees', employee.company_id] }); // Refresh list for this company
        }
        onClose(); // Close modal
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: EditAssociationFormValues) => {
    editMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
         {/* Context Info */}
         <div className="mb-4 space-y-1 text-sm bg-muted/50 p-3 rounded-md border">
             <p><span className="font-medium text-muted-foreground">Name:</span> {employee.name || 'N/A'}</p>
             <p><span className="font-medium text-muted-foreground">Email:</span> {employee.email || 'N/A'}</p>
             <p><span className="font-medium text-muted-foreground">Source:</span> {employee.source_table}</p> {/* Display source for clarity */}
         </div>

        {/* Job ID Field (Always Editable) */}
        <FormField
            control={form.control}
            name="job_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Job ID (Optional Reference)</FormLabel>
                    <FormControl>
                        <Input placeholder="Assign/Update Job ID reference" {...field} value={field.value ?? ''} />
                        {/* Consider Select dropdown populated from hr_jobs */}
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Conditionally Enabled/Disabled Fields */}
        <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Job Title (Designation)</FormLabel><FormControl><Input placeholder={canEditDesignation ? "Enter Job Title..." : "(Existing value)"} {...field} value={field.value ?? ''} disabled={!canEditDesignation} className={!canEditDesignation ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""} /></FormControl>{!canEditDesignation && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited.</p>}<FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contact_owner" render={({ field }) => (<FormItem><FormLabel>Contact Owner</FormLabel><FormControl><Input placeholder={canEditOwner ? "Enter Owner Name..." : "(Existing value)"} {...field} value={field.value ?? ''} disabled={!canEditOwner} className={!canEditOwner ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""} /></FormControl>{!canEditOwner && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited.</p>}<FormMessage /></FormItem>)} />
        <FormField control={form.control} name="contact_stage" render={({ field }) => (<FormItem><FormLabel>Contact Stage</FormLabel><FormControl><Input placeholder={canEditStage ? "Enter Stage..." : "(Existing value)"} {...field} value={field.value ?? ''} disabled={!canEditStage} className={!canEditStage ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""} /></FormControl>{!canEditStage && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited.</p>}<FormMessage /></FormItem>)} />
        {/* Add fields for start_date, end_date, is_current if needed */}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={editMutation.isPending}>{editMutation.isPending ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Form>
  );
};

export default EmployeeAssociationEditForm; // Use correct export name