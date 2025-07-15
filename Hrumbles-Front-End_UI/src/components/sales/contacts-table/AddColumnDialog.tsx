// src/components/sales/contacts-table/AddColumnDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useManageCustomFields } from '@/hooks/sales/useManageCustomFields';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddColumnDialog: React.FC<AddColumnDialogProps> = ({ open, onOpenChange }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'text' | 'date' | 'number'>('text');
    const { addField } = useManageCustomFields();
    const organization_id = useSelector((state: any) => state.auth.organization_id);
    const { toast } = useToast();

    const handleAdd = () => {
        if (!name.trim() || !organization_id) return;

        // Generate a machine-readable key from the name
        const key = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        addField.mutate({ organization_id, column_key: key, column_name: name.trim(), data_type: type }, {
            onSuccess: () => {
                toast({ title: "Column Added!", description: `The "${name}" column is now available.` });
                onOpenChange(false);
                setName('');
                setType('text');
            },
            onError: (e: any) => {
                toast({ title: "Failed to Add Column", description: e.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Custom Column</DialogTitle><DialogDescription>Define a new column for your contacts.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="column-name" className="text-right">Name</Label>
                        <Input id="column-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g., Follow-up Date" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="column-type" className="text-right">Type</Label>
                        <Select value={type} onValueChange={(v: 'text' | 'date' | 'number') => setType(v)}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleAdd} disabled={addField.isPending}>Add Column</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};