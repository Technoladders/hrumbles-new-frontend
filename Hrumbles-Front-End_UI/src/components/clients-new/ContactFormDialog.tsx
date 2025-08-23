// src/components/clients-new/ContactFormDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ClientContact } from './ClientTypes';
import supabase from '@/config/supabaseClient';
import { Loader2 } from 'lucide-react';

interface ContactFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ClientContact | null;
  clientId: string;
  organizationId: string;
  onSave: () => void;
}

export const ContactFormDialog: React.FC<ContactFormDialogProps> = ({ isOpen, onOpenChange, contact, clientId, organizationId, onSave }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientContact>();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!contact;

  useEffect(() => {
    if (contact) reset(contact);
    else reset({ name: '', email: '', phone: '', designation: '' });
  }, [contact, reset, isOpen]);

  const onSubmit = async (data: ClientContact) => {
    setIsSaving(true);
    try {
      if (isEditMode) {
        const { error } = await supabase.from('hr_client_contacts').update(data).eq('id', contact.id);
        if (error) throw error;
        toast({ title: "Contact updated successfully!" });
      } else {
        const { error } = await supabase.from('hr_client_contacts').insert([{ ...data, client_id: clientId, organization_id: organizationId }]);
        if (error) throw error;
        toast({ title: "Contact added successfully!" });
      }
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error saving contact", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div><Label htmlFor="name">Full Name</Label><Input id="name" {...register("name", { required: true })} /></div>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register("email", { required: true })} /></div>
          <div><Label htmlFor="phone">Phone</Label><Input id="phone" {...register("phone")} /></div>
          <div><Label htmlFor="designation">Designation</Label><Input id="designation" {...register("designation")} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};