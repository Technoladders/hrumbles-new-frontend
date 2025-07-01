import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Contact, ContactUpdate } from '@/types/contact';
import SingleCompanySelector from './SingleCompanySelector';

interface ContactEditFormProps {
  contact: Contact | null;
  onClose: () => void;
}

interface Company {
  id: number;
  name: string;
}

const editContactSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "A valid email address is required." }),
  mobile: z.string().optional().nullable(),
  job_title: z.string().optional().nullable(),
  linkedin_url: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')).nullable(),
  contact_owner: z.string().optional().nullable(),
  contact_stage: z.string().optional().nullable(),
  company_id: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : String(val) === "null" ? null : Number(val)),
    z.number().int().positive("Company ID must be a positive number").optional().nullable()
  ),
});

type EditContactFormValues = z.infer<typeof editContactSchema>;

const ContactEditForm: React.FC<ContactEditFormProps> = ({ contact, onClose }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: companies, isLoading: isLoadingCompanies, error: fetchCompaniesError } = useQuery<Company[], Error>({
    queryKey: ['companiesList'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EditContactFormValues>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      mobile: contact?.mobile || '',
      job_title: contact?.job_title || '',
      linkedin_url: contact?.linkedin_url || '',
      contact_owner: contact?.contact_owner || '',
      contact_stage: contact?.contact_stage || 'Prospect',
      company_id: contact?.company_id === null ? undefined : contact?.company_id,
    },
  });

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name || '',
        email: contact.email || '',
        mobile: contact.mobile || '',
        job_title: contact.job_title || '',
        linkedin_url: contact.linkedin_url || '',
        contact_owner: contact.contact_owner || '',
        contact_stage: contact.contact_stage || 'Prospect',
        company_id: contact.company_id === null ? undefined : contact.company_id,
      });
    }
  }, [contact, reset]);

  const editContactMutation = useMutation({
    mutationFn: async (formData: EditContactFormValues) => {
      if (!contact?.id) throw new Error("Contact ID is missing for update.");
      
      const updateData: ContactUpdate = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        mobile: formData.mobile || null,
        job_title: formData.job_title || null,
        linkedin_url: formData.linkedin_url || null,
        contact_owner: formData.contact_owner || null,
        contact_stage: formData.contact_stage || null,
        company_id: formData.company_id ? Number(formData.company_id) : null,
      };
      const { error } = await supabase.from('contacts').update(updateData).eq('id', contact.id);
      if (error) {
        if (error.code === '23505') throw new Error(`A contact with email ${formData.email} already exists.`);
        if (error.code === '23503') throw new Error(`Invalid Company ID. The specified company does not exist.`);
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Contact Updated", description: "Contact details saved." });
      queryClient.invalidateQueries({ queryKey: ['combinedContactsList'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contact?.id] });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const onValidSubmit = (data: EditContactFormValues) => {
    editContactMutation.mutate(data);
  };

  if (!contact) return <div className="p-4 text-center">Loading contact...</div>;

  const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="form-item">
        <label htmlFor="name-edit">Name*</label>
        <Input id="name-edit" {...register("name")} />
        {errors.name && <p className="form-message error">{errors.name.message}</p>}
      </div>

      <div className="form-item">
        <label htmlFor="email-edit">Email*</label>
        <Input id="email-edit" type="email" {...register("email")} />
        {errors.email && <p className="form-message error">{errors.email.message}</p>}
      </div>
      
      <div className="form-item">
        <label htmlFor="mobile-edit">Mobile</label>
        <Input id="mobile-edit" {...register("mobile")} />
        {errors.mobile && <p className="form-message error">{errors.mobile.message}</p>}
      </div>
      
      <div className="form-item">
        <label htmlFor="job_title-edit">Job Title</label>
        <Input id="job_title-edit" {...register("job_title")} />
        {errors.job_title && <p className="form-message error">{errors.job_title.message}</p>}
      </div>
      
      <div className="form-item">
        <label htmlFor="linkedin_url-edit">LinkedIn URL</label>
        <Input id="linkedin_url-edit" {...register("linkedin_url")} />
        {errors.linkedin_url && <p className="form-message error">{errors.linkedin_url.message}</p>}
      </div>

      <div className="form-item">
        <label htmlFor="contact_owner-edit">Contact Owner</label>
        <Input id="contact_owner-edit" {...register("contact_owner")} />
        {errors.contact_owner && <p className="form-message error">{errors.contact_owner.message}</p>}
      </div>

      <div className="form-item">
        <label htmlFor="contact_stage-edit">Contact Stage</label>
        <Input id="contact_stage-edit" {...register("contact_stage")} />
        {errors.contact_stage && <p className="form-message error">{errors.contact_stage.message}</p>}
      </div>
      
      <div className="form-item">
        <label htmlFor="company_id-edit">Company (Optional)</label>
        <SingleCompanySelector
          companies={companies || []}
          selectedCompanyId={watch("company_id") ?? undefined}
          onChange={(value) => setValue("company_id", value)}
          disabled={isLoadingCompanies || editContactMutation.isPending}
        />
        {isLoadingCompanies && <p className="text-sm text-muted-foreground mt-1">Loading companies...</p>}
        {fetchCompaniesError && !isLoadingCompanies && <p className="form-message error mt-1">Could not load companies: {fetchCompaniesError.message}</p>}
        {errors.company_id && <p className="form-message error">{errors.company_id.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={editContactMutation.isPending}>Cancel</Button>
        <Button type="submit" disabled={editContactMutation.isPending || isLoadingCompanies}>
          {editContactMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default ContactEditForm;