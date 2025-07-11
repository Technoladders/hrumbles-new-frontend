// src/components/sales/ContactPage/AddColumnDialog.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddColumn: (name: string, type: 'text' | 'number' | 'date' | 'link') => void;
}

export const AddColumnDialog: React.FC<AddColumnDialogProps> = ({ open, onOpenChange, onAddColumn }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'date' | 'link'>('text');

  const handleAdd = () => {
    if (name.trim()) {
      onAddColumn(name.trim(), type);
      setName('');
      setType('text');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Column</DialogTitle>
          <DialogDescription>
            Define a new column for your contacts table. This will be visible to everyone in your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-name" className="text-right">Name</Label>
            <Input id="column-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., Follow-up Priority" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="column-type" className="text-right">Data Type</Label>
            <Select value={type} onValueChange={(v: 'text' | 'number' | 'date' | 'link') => setType(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="link">Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleAdd}>Add Column</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};