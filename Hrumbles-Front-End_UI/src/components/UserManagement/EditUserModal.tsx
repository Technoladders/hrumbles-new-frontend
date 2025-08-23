// src/components/UserManagement/EditUserModal.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role_name?: string;
  department_name?: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: Employee;
}

const EditUserModal = ({ isOpen, onClose, onSuccess, user }: EditUserModalProps) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    role_id: '',
    department_id: '',
  });
  const [phone, setPhone] = useState<E164Number | undefined>();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  // Pre-fill form when the user prop is available
  useEffect(() => {
    const initializeForm = async () => {
        if (!user) return;

        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            role_id: '', // Will be set after fetching
            department_id: '', // Will be set after fetching
        });
        setPhone(user.phone as E164Number);

        // Fetch dropdowns and find the correct IDs for the user's current role/dept
        const [rolesRes, deptsRes] = await Promise.all([
            supabase.from('hr_roles').select('id, name'),
            supabase.from('hr_departments').select('id, name'),
        ]);

        const allowedRoles = ['organization_superadmin', 'admin', 'employee'];
        const roleDisplayNameMap: { [key: string]: string } = {
            organization_superadmin: 'Superadmin',
            admin: 'Admin',
            employee: 'Employee',
        };

        const filteredRoles = (rolesRes.data || [])
            .filter(r => allowedRoles.includes(r.name))
            .map(r => ({ ...r, displayName: roleDisplayNameMap[r.name] || r.name }));
        
        setRoles(filteredRoles);
        setDepartments(deptsRes.data || []);
        
        // Set the initial selected values
        const currentRole = filteredRoles.find(r => r.name === user.role_name);
        if (currentRole) setFormData(prev => ({ ...prev, role_id: currentRole.id }));

        const currentDept = deptsRes.data?.find(d => d.name === user.department_name);
        if (currentDept) setFormData(prev => ({ ...prev, department_id: currentDept.id }));
    };
    
    initializeForm();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase
            .from('hr_employees')
            .update({
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: phone,
                role_id: formData.role_id,
                department_id: formData.department_id,
            })
            .eq('id', user.id);

        if (error) throw error;
        
        toast({ title: "Success", description: "User details updated successfully." });
        onSuccess();
    } catch (error: any) {
        toast({ title: "Error", description: `Failed to update user: ${error.message}`, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>Update the details for this user.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input id="edit_first_name" value={formData.first_name} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input id="edit_last_name" value={formData.last_name} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))} required />
            </div>
            <div className="col-span-2">
                <Label>Email (Read-only)</Label>
                <Input value={user.email} disabled />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone Number</Label>
              <PhoneInput id="edit_phone" international defaultCountry="US" value={phone} onChange={setPhone} className="phone-input" />
            </div>
            <div>
              <Label htmlFor="edit_role">Role *</Label>
              <Select value={formData.role_id} onValueChange={(value) => setFormData(p => ({ ...p, role_id: value }))} required>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit_department">Department</Label>
              <Select value={formData.department_id} onValueChange={(value) => setFormData(p => ({ ...p, department_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;