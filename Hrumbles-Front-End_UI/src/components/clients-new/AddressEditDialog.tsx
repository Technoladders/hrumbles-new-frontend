// src/components/clients-new/AddressEditDialog.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Address } from './ClientTypes';
import supabase from '@/config/supabaseClient';
import { Loader2 } from 'lucide-react';

export interface EditingAddress {
  data: Address;
  type: 'billing_address' | 'shipping_address';
}

interface AddressEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingAddress: EditingAddress | null;
  clientId: string;
  onSave: () => void;
}

export const AddressEditDialog: React.FC<AddressEditDialogProps> = ({ isOpen, onOpenChange, editingAddress, clientId, onSave }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Address>();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingAddress?.data) {
      reset(editingAddress.data);
    }
  }, [editingAddress, reset]);

  const onSubmit = async (data: Address) => {
    if (!editingAddress) return;
    setIsSaving(true);
    try {
      // Dynamically use the address type ('billing_address' or 'shipping_address') as the column name
      const { error } = await supabase
        .from('hr_clients')
        .update({ [editingAddress.type]: data })
        .eq('id', clientId);
      
      if (error) throw error;
      toast({ title: "Address updated successfully!" });
      onSave();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error updating address", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Edit {editingAddress?.type === 'billing_address' ? 'Billing' : 'Shipping'} Address
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Textarea id="street" {...register("street")} className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="city">City</Label><Input id="city" {...register("city")} /></div>
            <div><Label htmlFor="state">State</Label><Input id="state" {...register("state")} /></div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="zipCode">Postal / Zip Code</Label><Input id="zipCode" {...register("zipCode")} /></div>
            <div><Label htmlFor="country">Country</Label><Input id="country" {...register("country")} /></div>
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