// src/pages/jobs/ai/EditCandidateDetailsModal.tsx

import { useState, useEffect, FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// --- CHANGE: Import react-phone-number-input ---
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; // Don't forget to import the styles

// UI Imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Candidate } from '@/lib/types'; // Assuming this type exists and has the required fields

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

export const EditCandidateDetailsModal: FC<Props> = ({ isOpen, onClose, candidate }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
      });
    }
  }, [candidate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- NEW: Specific handler for the PhoneInput component ---
  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hr_job_candidates')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone, // The value is already in the correct format
        })
        .eq('id', candidate.id);

      if (error) throw error;

      toast.success("Candidate details updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
      onClose();

    } catch (err: any) {
      toast.error("Failed to update details", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Candidate Details</DialogTitle>
          <DialogDescription>
            Make changes to the candidate's basic information here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" />
          </div>
          {/* --- CHANGE: Replaced standard Input with PhoneInput --- */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Phone</Label>
            <div className="col-span-3">
              <PhoneInput
                id="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handlePhoneChange}
                // The input component inside PhoneInput doesn't automatically adopt Shadcn styles.
                // You can add a global CSS rule to make it match your other inputs, for example:
                // .PhoneInputInput { /* your input styles here */ }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};