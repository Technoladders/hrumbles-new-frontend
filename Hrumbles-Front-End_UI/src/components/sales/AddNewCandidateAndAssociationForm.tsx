

// src/components/AddNewCandidateAndAssociationForm.tsx
import React from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
// Assuming database types are generated and available
import { Database } from '@/types/database.types'; // Adjust path if needed

// Define props
interface AddNewCandidateAndAssociationFormProps {
  companyId: number; // The ID of the company we are associating with
  onClose: () => void; // Function to close the modal
}

// Alias types for Supabase table operations
type HrCandidateInsert = Database['public']['Tables']['hr_candidates']['Insert'];
// Use the NEW association table type
type EmployeeAssociationInsert = Database['public']['Tables']['employee_associations']['Insert'];

// Zod schema for the combined form data - REMOVED job_id
const addCandidateAndAssociationSchema = z.object({
  // Fields for hr_candidates
  name: z.string().min(1, { message: "Candidate name is required." }),
  email: z.string().email({ message: "A valid email address is required." }),
  phone_number: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Please enter a valid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(), // Allow empty string or URL

  // Fields for employee_associations association (initial values)
  designation: z.string().optional().nullable(), // Keep this
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
});

type AddCandidateFormValues = z.infer<typeof addCandidateAndAssociationSchema>;

const AddNewCandidateAndAssociationForm: React.FC<AddNewCandidateAndAssociationFormProps> = ({ companyId, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<AddCandidateFormValues>({
    resolver: zodResolver(addCandidateAndAssociationSchema),
    // Default values for a new candidate form - REMOVED job_id
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      linkedin_url: '',
      designation: '',
      contact_owner: '',
      contact_stage: 'Prospect', // Example default stage
    },
  });

  // Combined Mutation: Check Email -> Create Candidate (if needed) -> Create Association
  const addCandidateAndAssociateMutation = useMutation({
    mutationFn: async (formData: AddCandidateFormValues) => {
           // --- Get Current User ID ---
          //  const { data: { user }, error: userError } = await supabase.auth.getUser();
          //  if (userError || !user) {
          //    console.error("Error getting user:", userError);
          //    throw new Error("Could not identify current user. Please ensure you are logged in.");
          //  }
          //  const currentUserId = user.id;
          //  console.log("Current User ID for created_by:", currentUserId);
           // --------------------------
      let candidateIdToUse: string | null = null;
      let candidateExisted = false;

      // 1. Check if candidate email already exists
      console.log(`Checking for existing candidate with email: ${formData.email}`);
      const { data: existingCandidate, error: checkError } = await supabase
        .from('hr_candidates')
        .select('id') // Select only the ID
        .eq('email', formData.email)
        .maybeSingle(); // Returns one row or null, doesn't error if not found

      if (checkError) {
        console.error("Error checking email:", checkError);
        throw new Error(`Database error checking email: ${checkError.message}`);
      }

      if (existingCandidate?.id) {
        // Candidate Found - Use existing ID
        candidateIdToUse = existingCandidate.id;
        candidateExisted = true;
        console.log(`Candidate found with ID: ${candidateIdToUse}`);
        // Optional: Update existing candidate's phone/linkedin if desired
        // const { error: updateExistingError } = await supabase
        //    .from('hr_candidates')
        //    .update({
        //        phone_number: formData.phone_number || existingCandidate.phone_number || null, // Example: update if provided
        //        linkedin_url: formData.linkedin_url || existingCandidate.linkedin_url || null,
        //        // Update name? Be cautious about overwriting existing data.
        //        // name: formData.name // Only if you intend to update name too
        //    })
        //    .eq('id', candidateIdToUse);
        // if (updateExistingError) { console.warn("Could not update existing candidate details:", updateExistingError); }

      } else {
        // Candidate Not Found - Create new candidate
        console.log("Candidate not found by email, creating new one...");
        const newCandidateData: HrCandidateInsert = {
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone_number || null,
          linkedin_url: formData.linkedin_url || null,
          // 'id' and 'created_at' are handled by the database
        };

        const { data: newlyCreatedCandidate, error: insertCandidateError } = await supabase
          .from('hr_candidates')
          .insert(newCandidateData)
          .select('id') // Get the ID back
          .single(); // Expect one row

        if (insertCandidateError || !newlyCreatedCandidate?.id) {
          console.error("Error inserting new candidate:", insertCandidateError);
          // Handle specific errors like unique email constraint if needed (though check should prevent it)
          throw new Error(insertCandidateError?.message || "Failed to create new candidate record.");
        }
        candidateIdToUse = newlyCreatedCandidate.id; // The auto-generated UUID
        console.log(`New candidate created with ID: ${candidateIdToUse}`);
      }

      // At this point, we MUST have a candidateIdToUse (either existing or new)
      if (!candidateIdToUse) {
           throw new Error("Internal Error: Could not determine candidate ID.");
      }

      // 2. Prepare data for employee_associations insertion (using the NEW table)
      const associationData: EmployeeAssociationInsert = {
        candidate_id: candidateIdToUse, // Use the obtained UUID
        company_id: companyId,
        job_id: null, // <<<--- Set job_id to NULL initially as requested
        designation: formData.designation || null, // Get from form
        contact_owner: formData.contact_owner || null,
        contact_stage: formData.contact_stage || null,
        // created_by: currentUserId, // <<<--- Set created_by from logged-in user
        // is_current: true, // Set default if needed
        // start_date: null, // Set if needed
      };

      // 3. Insert into employee_associations (the NEW association table)
      console.log("Inserting into employee_associations:", associationData);
      const { error: associationError } = await supabase
        .from('employee_associations') // <<<--- Use the NEW table name
        .insert(associationData);

      if (associationError) {
        console.error("Error inserting into employee_associations:", associationError);
        // Check for unique constraint violation (candidate_id, company_id, job_id with job_id as NULL)
        if (associationError.code === '23505' && associationError.message.includes('unique_candidate_company_job')) {
          throw new Error(`This candidate is already associated with this company (without a specific job assigned). Edit existing association instead.`);
        }
        // If candidate creation succeeded but association failed, the new candidate still exists.
        throw new Error(associationError.message || "Failed to associate candidate with company.");
      }

      // If both operations succeed
      return { candidateName: formData.name, existed: candidateExisted };
    },
    onSuccess: (result) => {
      const message = result?.existed
        ? `${result?.candidateName} already existed and was associated with the company.`
        : `${result?.candidateName} was created and associated successfully.`;
      toast({ title: "Operation Successful", description: message });
      queryClient.invalidateQueries({ queryKey: ['company-employees', companyId] }); // Refresh the employee list for this company
      onClose(); // Close the modal
    },
    onError: (error: any) => {
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
      // Keep modal open for corrections
    }
  });

  // Handle form submission
  const onSubmit = (data: AddCandidateFormValues) => {
    addCandidateAndAssociateMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <h4 className="font-medium text-md border-b pb-1">Candidate Details</h4>
        {/* Candidate input fields */}
        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name*</FormLabel><FormControl><Input placeholder="Candidate's full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email*</FormLabel><FormControl><Input type="email" placeholder="candidate@example.com (checks for duplicates)" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="phone_number" render={({ field }) => (<FormItem><FormLabel>Mobile</FormLabel><FormControl><Input placeholder="+1 123 456 7890" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="linkedin_url" render={({ field }) => (<FormItem><FormLabel>LinkedIn Profile URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <h4 className="font-medium text-md border-b pb-1 pt-4">Initial Association Details</h4>
         {/* Association input fields - NO Job ID field here */}
         <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Job Title (Designation)</FormLabel><FormControl><Input placeholder="Initial or general title (e.g., Contact)" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <FormField control={form.control} name="contact_owner" render={({ field }) => (<FormItem><FormLabel>Contact Owner</FormLabel><FormControl><Input placeholder="Your name or team" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="contact_stage" render={({ field }) => (<FormItem><FormLabel>Contact Stage</FormLabel><FormControl><Input placeholder="e.g., Prospect, Contacted" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
             {/* Consider replacing Stage input with a Select dropdown */}
         </div>

        {/* Footer with Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addCandidateAndAssociateMutation.isPending}>
              {addCandidateAndAssociateMutation.isPending ? 'Saving...' : 'Add & Associate'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddNewCandidateAndAssociationForm;