// src/components/sales/contacts-table/AddContactForm.tsx
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAddSimpleContactRow } from '@/hooks/sales/useAddSimpleContactRow';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useSelector } from 'react-redux';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyCombobox } from './CompanyCombobox';
import { SimpleContactInsert } from '@/types/simple-contact.types';

interface AddContactFormProps {
  onClose: () => void;
  onSuccess: (newContact: any) => void;
  fileId: string;
}

const addContactSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  mobile: z.string().optional(),
  job_title: z.string().optional(),
  linkedin_url: z.string().url('Invalid URL.').optional().or(z.literal('')),
  contact_owner: z.string().optional(),
  contact_stage: z.string().optional(),
  company_id: z.number().optional().nullable(),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

export const AddContactForm: React.FC<AddContactFormProps> = ({ onClose, onSuccess, fileId }) => {
    const { toast } = useToast();
    const organization_id = useSelector((state: any) => state.auth.organization_id);
    const currentUser = useSelector((state: any) => state.auth.user);
    const { data: stages = [] } = useContactStages();
    const addContactMutation = useAddSimpleContactRow();

    const form = useForm<AddContactFormValues>({
        resolver: zodResolver(addContactSchema),
        defaultValues: {
            name: '', email: '', mobile: '', job_title: '', linkedin_url: '',
            contact_owner: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
            contact_stage: 'Prospect',
            company_id: null,
        },
    });

    const onSubmit = (formData: AddContactFormValues) => {
        if (!currentUser?.id || !organization_id || !fileId) return;
        
        const newContactData: SimpleContactInsert = {
            ...formData,

            email: formData.email || null,
            organization_id: organization_id,
            created_by: currentUser.id,
            updated_by: currentUser.id,
            file_id: fileId,
        };

        addContactMutation.mutate(newContactData, {
            onSuccess: (newContact) => {
                toast({ title: "Contact Created!", description: `${newContact.name} has been added.` });
                onSuccess(newContact);
                onClose();
            },
            onError: (err: any) => toast({ title: "Failed to create contact", description: err.message, variant: "destructive" })
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name <span className="text-red-500">*</span></FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="john.doe@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem><FormLabel>Mobile</FormLabel><FormControl><PhoneInput international defaultCountry="IN" placeholder="Enter phone number" value={field.value} onChange={field.onChange} className="input" /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="company_id" render={({ field }) => (
                    <FormItem><FormLabel>Company</FormLabel><FormControl><CompanyCombobox value={field.value} onSelect={field.onChange} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="job_title" render={({ field }) => (
                    <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="Sales Manager" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="linkedin_url" render={({ field }) => (
                    <FormItem><FormLabel>LinkedIn URL</FormLabel><FormControl><Input placeholder="https://linkedin.com/in/..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="contact_stage" render={({ field }) => (
                    <FormItem><FormLabel>Stage</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>{stages.map(stage => <SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )}/>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={addContactMutation.isPending}>{addContactMutation.isPending ? 'Saving...' : 'Create Contact'}</Button>
                </div>
            </form>
        </Form>
    );
};