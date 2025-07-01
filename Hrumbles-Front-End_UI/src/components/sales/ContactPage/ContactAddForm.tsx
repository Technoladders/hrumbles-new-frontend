import React from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ContactInsert } from '@/types/contact';
import SingleCompanySelector from './SingleCompanySelector';
import { useSelector } from 'react-redux';

interface ContactAddFormProps {
  onClose: () => void;
}

interface CompanyOption {
  id: number;
  name: string;
}

const CONTACT_STAGES_OPTIONS = [
    'Cold', 'Approaching', 'Replied', 'Interested', 'Not Interested',
    'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job', 'Prospect'
];

const addContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Please enter a valid URL (e.g., https://...)" }).optional().or(z.literal('')).nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
  company_id: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val) === "null" ? null : Number(val)),
    z.number().int().positive("Company ID must be a positive number").optional().nullable()
  ),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

const ContactAddForm: React.FC<ContactAddFormProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { data: companies, isLoading: isLoadingCompanies, error: fetchCompaniesError } = useQuery<CompanyOption[], Error>({
    queryKey: ['companiesListForDropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  console.log("companies", companies);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      job_title: '',
      linkedin_url: '',
      contact_owner: '',
      contact_stage: 'Prospect',
      company_id: undefined,
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (formData: AddContactFormValues) => {
      const insertData: ContactInsert = {
        name: formData.name,
        email: formData.email ? formData.email.toLowerCase() : null,
        mobile: formData.mobile || null,
        job_title: formData.job_title || null,
        linkedin_url: formData.linkedin_url || null,
        contact_owner: formData.contact_owner || null,
        contact_stage: formData.contact_stage || 'Prospect',
        company_id: formData.company_id ? Number(formData.company_id) : null,
        organization_id: organization_id,
      };
      const { error, data: newContact } = await supabase.from('contacts').insert(insertData).select().single();
      if (error) {
        if (error.code === '23505' && error.message.includes('contacts_email_key')) {
             throw new Error(`A contact with email ${formData.email} already exists.`);
        }
        if (error.code === '23503' && error.message.includes('fk_contact_company')) {
            throw new Error(`Invalid Company ID. The specified company does not exist.`);
        }
        throw error;
      }
      return newContact;
    },
    onSuccess: (newContact) => {
      toast({ title: "Contact Added", description: `${newContact?.name || 'New contact'} created successfully.` });
      queryClient.invalidateQueries({ queryKey: ['combinedContactsList'] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Add Failed", description: error.message, variant: "destructive" });
    }
  });

  const onValidSubmit = (data: AddContactFormValues) => {
    addContactMutation.mutate(data);
  };

  const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="form-item">
        <label htmlFor="name-add" className="block text-sm font-medium text-gray-700">Name*</label>
        <Input id="name-add" placeholder="Contact's full name" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="form-item">
        <label htmlFor="email-add" className="block text-sm font-medium text-gray-700">Email</label>
        <Input id="email-add" type="email" placeholder="contact@example.com" {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-item">
          <label htmlFor="mobile-add" className="block text-sm font-medium text-gray-700">Mobile</label>
          <Input id="mobile-add" placeholder="+1 123 456 7890" {...register("mobile")} />
          {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile.message}</p>}
        </div>

        <div className="form-item">
          <label htmlFor="job_title-add" className="block text-sm font-medium text-gray-700">Job Title</label>
          <Input id="job_title-add" placeholder="e.g., Sales Manager" {...register("job_title")} />
          {errors.job_title && <p className="mt-1 text-xs text-red-600">{errors.job_title.message}</p>}
        </div>
      </div>

      <div className="form-item">
        <label htmlFor="linkedin_url-add" className="block text-sm font-medium text-gray-700">LinkedIn Profile URL</label>
        <Input id="linkedin_url-add" placeholder="https://linkedin.com/in/..." {...register("linkedin_url")} />
        {errors.linkedin_url && <p className="mt-1 text-xs text-red-600">{errors.linkedin_url.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="form-item">
          <label htmlFor="contact_owner-add" className="block text-sm font-medium text-gray-700">Contact Owner</label>
          <Input id="contact_owner-add" placeholder="Your name or team" {...register("contact_owner")} />
          {errors.contact_owner && <p className="mt-1 text-xs text-red-600">{errors.contact_owner.message}</p>}
        </div>

        <div className="form-item">
          <label htmlFor="contact_stage-add" className="block text-sm font-medium text-gray-700">Contact Stage</label>
          <select
            id="contact_stage-add"
            {...register("contact_stage")}
            className={selectClassName}
            defaultValue="Prospect"
          >
            {CONTACT_STAGES_OPTIONS.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
          {errors.contact_stage && <p className="mt-1 text-xs text-red-600">{errors.contact_stage.message}</p>}
        </div>
      </div>

      <div className="form-item">
        <label htmlFor="company_id-add" className="block text-sm font-medium text-gray-700">Company (Optional)</label>
        <SingleCompanySelector
          companies={companies || []}
          selectedCompanyId={watch("company_id") ?? undefined}
          onChange={(value) => setValue("company_id", value)}
          disabled={isLoadingCompanies || addContactMutation.isPending}
        />
        {isLoadingCompanies && <p className="mt-1 text-xs text-gray-500">Loading companies...</p>}
        {fetchCompaniesError && !isLoadingCompanies && <p className="mt-1 text-xs text-red-600">Could not load companies: {fetchCompaniesError.message}</p>}
        {errors.company_id && <p className="mt-1 text-xs text-red-600">{errors.company_id.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={addContactMutation.isPending}>Cancel</Button>
        <Button type="submit" disabled={addContactMutation.isPending || isLoadingCompanies}>
          {addContactMutation.isPending ? 'Adding...' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactAddForm;