// src/components/sales/contacts-table/ManageStagesDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useContactStages, ContactStage } from '@/hooks/sales/useContactStages';
import { useManageStages } from '@/hooks/sales/useManageStages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash, GripVertical, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';

interface ManageStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageStagesDialog: React.FC<ManageStagesDialogProps> = ({ open, onOpenChange }) => {
    const { data: stages = [], isLoading } = useContactStages();
    const { addStage, updateStage, deleteStage } = useManageStages();
    const organization_id = useSelector((state: any) => state.auth.organization_id);
    const { toast } = useToast();

    const [localStages, setLocalStages] = useState<ContactStage[]>([]);
    const [newStageName, setNewStageName] = useState('');

    useEffect(() => { setLocalStages(stages); }, [stages]);

    const handleUpdate = (id: number, field: 'name' | 'color', value: string) => {
        const updatedStages = localStages.map(s => s.id === id ? { ...s, [field]: value } : s);
        setLocalStages(updatedStages);
    };

    const saveChanges = () => {
        localStages.forEach(stage => {
            const originalStage = stages.find(s => s.id === stage.id);
            if (originalStage?.name !== stage.name || originalStage?.color !== stage.color) {
                updateStage.mutate(stage, {
                    onSuccess: () => toast({ title: "Stage Updated!" }),
                    onError: (e) => toast({ title: "Update Failed", description: e.message, variant: 'destructive' })
                });
            }
        });
    };

    const handleAddStage = () => {
        if (!newStageName.trim() || !organization_id) return;
        addStage.mutate({ name: newStageName, color: '#cccccc', organization_id }, {
            onSuccess: () => { setNewStageName(''); toast({ title: "Stage Added!" }); },
            onError: (e) => toast({ title: "Add Failed", description: e.message, variant: 'destructive' })
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Manage Contact Stages</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    {localStages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-2">
                            <GripVertical className="cursor-grab text-muted-foreground" size={16} />
                            <Input type="color" value={stage.color} onChange={e => handleUpdate(stage.id, 'color', e.target.value)} className="w-12 h-9 p-1" />
                            <Input value={stage.name} onChange={e => handleUpdate(stage.id, 'name', e.target.value)} className="h-9" />
                            <Button variant="ghost" size="icon" onClick={() => deleteStage.mutate(stage.id)}>
                                <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 pt-4 border-t">
                        <Input placeholder="New stage name..." value={newStageName} onChange={e => setNewStageName(e.target.value)} className="h-9"/>
                        <Button onClick={handleAddStage} size="icon"><Plus /></Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={saveChanges}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};