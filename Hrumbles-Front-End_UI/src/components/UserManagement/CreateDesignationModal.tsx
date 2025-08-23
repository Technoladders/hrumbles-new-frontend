// UserManagement/CreateDesignationModal.tsx

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

interface Department {
  id: string;
  name: string;
}

interface CreateDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
}

const CreateDesignationModal = ({ isOpen, onClose, onSuccess, departments }: CreateDesignationModalProps) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !departmentId) {
      toast({ title: "Validation Error", description: "Please provide a name and select a department.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hr_designations')
        .insert({ name, department_id: departmentId, organization_id: organizationId });

      if (error) throw error;

      toast({ title: "Success", description: "Designation created successfully." });
      setName('');
      setDepartmentId(undefined);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Designation</DialogTitle>
          <DialogDescription>Add a new job title and assign it to a department.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="desg-name">Designation Name</Label>
              <Input id="desg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Senior Software Engineer" />
            </div>
            <div>
              <Label htmlFor="dept-select">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="dept-select">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Designation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDesignationModal;