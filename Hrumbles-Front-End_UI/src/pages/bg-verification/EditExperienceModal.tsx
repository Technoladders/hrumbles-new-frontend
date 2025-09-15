// src/pages/jobs/ai/cards/EditExperienceModal.tsx

import { FC, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CareerExperience } from '@/lib/types';

interface EditExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  experience: CareerExperience | null;
  onSave: (updatedExperience: CareerExperience) => void;
}

export const EditExperienceModal: FC<EditExperienceModalProps> = ({ isOpen, onClose, experience, onSave }) => {
  const [formData, setFormData] = useState<CareerExperience>({ company: '', designation: '', start_date: '', end_date: '' });

  useEffect(() => {
    if (experience) {
      setFormData(experience);
    }
  }, [experience]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!experience) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Experience</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={formData.company} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={formData.designation} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date (YYYY-MM)</Label>
              <Input id="start_date" value={formData.start_date} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (YYYY-MM or Present)</Label>
              <Input id="end_date" value={formData.end_date} onChange={handleChange} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};