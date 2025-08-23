// src/components/clients-new/ClientEditDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Client } from './ClientTypes';
import supabase from '@/config/supabaseClient';
import { Loader2 } from 'lucide-react';

interface ClientEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: () => void;
}

export const ClientEditDialog: React.FC<ClientEditDialogProps> = ({ isOpen, onOpenChange, client, onSave }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Client>();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (client) reset(client);
  }, [client, reset]);

  const onSubmit = async (data: Client) => {
    if (!client) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hr_clients')
        .update({ client_name: data.client_name, currency: data.currency /* Add other fields as needed */ })
        .eq('id', client.id);
      
      if (error) throw error;
      toast({ title: "Client updated successfully!" });
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error updating client", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Client Details</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="client_name">Client Name</Label>
            <Input id="client_name" {...register("client_name", { required: "Name is required" })} />
            {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="currency">Default Currency</Label>
            <Input id="currency" {...register("currency", { required: "Currency is required" })} />
            {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};