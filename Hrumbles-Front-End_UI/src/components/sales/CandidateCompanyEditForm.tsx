// src/components/CandidateCompanyEditForm.tsx
import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CandidateDetail } from '@/types/company'; // Use the combined type

interface CandidateCompanyEditFormProps {
  employee: CandidateDetail; // Pass the full combined detail object from the parent
  onClose: () => void; // Function to close the modal
}

// Helper to check if a value is considered 'empty' or 'N/A' for editing purposes
const isEditableValue = (value: string | null | undefined): boolean => {
    return !value || value.trim() === '' || value.trim().toUpperCase() === 'N/A';
};

// Zod schema for the fields that *can* be edited in the candidate_companies table
const editSchema = z.object({
  designation: z.string().optional().nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

const CandidateCompanyEditForm: React.FC<CandidateCompanyEditFormProps> = ({ employee, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine initial editability based on the passed employee data
  const canEditDesignation = isEditableValue(employee.designation);
  const canEditOwner = isEditableValue(employee.contact_owner);
  const canEditStage = isEditableValue(employee.contact_stage);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    // Initialize form: Use empty string for editable "N/A" fields, otherwise show existing value
    defaultValues: {
      designation: canEditDesignation ? "" : employee.designation || "",
      contact_owner: canEditOwner ? "" : employee.contact_owner || "",
      contact_stage: canEditStage ? "" : employee.contact_stage || "",
    },
  });

   // Effect to reset the form if the employee being edited changes
   useEffect(() => {
        const editableDesignation = isEditableValue(employee.designation);
        const editableOwner = isEditableValue(employee.contact_owner);
        const editableStage = isEditableValue(employee.contact_stage);
        form.reset({
            designation: editableDesignation ? "" : employee.designation || "",
            contact_owner: editableOwner ? "" : employee.contact_owner || "",
            contact_stage: editableStage ? "" : employee.contact_stage || "",
        });
    }, [employee, form]); // Depend on employee prop and form instance


  const editMutation = useMutation({
    mutationFn: async (data: EditFormValues) => {
      // Validate that we have the necessary keys to identify the row in candidate_companies
      if (!employee.id || !employee.job_id || !employee.company_id) {
        console.error("Missing keys for update:", {id: employee.id, job_id: employee.job_id, company_id: employee.company_id});
        throw new Error("Internal Error: Missing key information for update.");
      }

      // --- Build update payload ONLY with fields that were editable AND have a new value ---
      const updatePayload: Partial<EditFormValues> = {};
      if (canEditDesignation && data.designation && data.designation.trim() !== '') {
          updatePayload.designation = data.designation.trim();
      }
      if (canEditOwner && data.contact_owner && data.contact_owner.trim() !== '') {
          updatePayload.contact_owner = data.contact_owner.trim();
      }
      if (canEditStage && data.contact_stage && data.contact_stage.trim() !== '') {
          updatePayload.contact_stage = data.contact_stage.trim();
      }
      // --- End Build update payload ---

      // Only proceed if there's something to update
      if (Object.keys(updatePayload).length === 0) {
           console.log("No editable fields were changed or filled.");
           toast({ title: "No Changes Made", description: "No editable 'N/A' fields were modified." });
           return { noChanges: true }; // Indicate no DB update was needed
      }

      console.log("Updating candidate_companies row:", {
          keys: { candidate_id: employee.id, job_id: employee.job_id, company_id: employee.company_id },
          payload: updatePayload
      });

      // Perform the update on the candidate_companies table
      const { error } = await supabase
        .from('candidate_companies')
        .update(updatePayload)
        .eq('candidate_id', employee.id) // Use the candidate's ID
        .eq('job_id', employee.job_id)     // Use the job ID (part of composite key)
        .eq('company_id', employee.company_id); // Use the company ID (part of composite key)

      if (error) {
          console.error("Supabase update error:", error);
          throw error; // Let onError handle it
      }
      return { noChanges: false }; // Indicate successful update
    },
    onSuccess: (result) => {
        // Only show success toast if an actual DB update happened
        if (!result?.noChanges) {
             toast({ title: "Contact Updated", description: "Employee association details updated." });
             // Invalidate the employee list for this specific company to refetch data
             queryClient.invalidateQueries({ queryKey: ['company-employees', employee.company_id] });
        }
        onClose(); // Close the modal regardless
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Could not update details.", variant: "destructive" });
      // Keep the modal open for the user to correct
    }
  });

  // Handle form submission
  const onSubmit = (data: EditFormValues) => {
    editMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
         {/* Display non-editable info for context */}
         <div className="mb-4 space-y-1 text-sm bg-muted/50 p-3 rounded-md border">
            <p><span className="font-medium text-muted-foreground">Name:</span> {employee.name || 'N/A'}</p>
            <p><span className="font-medium text-muted-foreground">Email:</span> {employee.email || 'N/A'}</p>
            <p><span className="font-medium text-muted-foreground">Mobile:</span> {employee.phone_number || 'N/A'}</p>
         </div>

        {/* Conditionally Enabled/Disabled Fields */}
        <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Job Title (Designation)</FormLabel>
                    <FormControl>
                        <Input
                            placeholder={canEditDesignation ? "Enter Job Title..." : "(Existing value)"}
                            {...field}
                            value={field.value ?? ''} // Ensure value is controlled
                            disabled={!canEditDesignation} // Disable if initial value was not 'N/A' or empty
                            className={!canEditDesignation ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""}
                        />
                    </FormControl>
                    {!canEditDesignation && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited here.</p>}
                    <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="contact_owner"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Contact Owner</FormLabel>
                    <FormControl>
                         <Input
                            placeholder={canEditOwner ? "Enter Owner Name..." : "(Existing value)"}
                            {...field}
                            value={field.value ?? ''}
                            disabled={!canEditOwner}
                            className={!canEditOwner ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""}
                        />
                    </FormControl>
                     {!canEditOwner && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited here.</p>}
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="contact_stage"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Contact Stage</FormLabel>
                    <FormControl>
                         <Input
                            placeholder={canEditStage ? "Enter Stage..." : "(Existing value)"}
                            {...field}
                            value={field.value ?? ''}
                            disabled={!canEditStage}
                            className={!canEditStage ? "disabled:cursor-not-allowed disabled:opacity-60 bg-muted/30" : ""}
                        />
                         {/* Consider replacing with a Select dropdown for predefined stages */}
                    </FormControl>
                     {!canEditStage && <p className='text-xs text-muted-foreground pt-1'>Existing value cannot be edited here.</p>}
                    <FormMessage />
                </FormItem>
            )}
        />

        {/* Footer with Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CandidateCompanyEditForm;