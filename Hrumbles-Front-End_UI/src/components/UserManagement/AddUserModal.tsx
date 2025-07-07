import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  phone?: string;
  role_id?: string;
  department_id?: string;
  shift_id?: string;
  employment_start_date?: string;
}

const AddUserModal = ({ isOpen, onClose, onSuccess }: AddUserModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    phone: '',
    role_id: '',
    department_id: '',
    shift_id: '',
    employment_start_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [shifts, setShifts] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchRolesDepartmentsAndShifts();
    }
  }, [isOpen]);

  const fetchRolesDepartmentsAndShifts = async () => {
    try {
      const [rolesResponse, departmentsResponse, shiftsResponse] = await Promise.all([
        supabase.from('hr_roles').select('id, name'),
        supabase.from('hr_departments').select('id, name'),
        supabase.from('hr_shifts').select('id, name'),
      ]);

      if (rolesResponse.data) setRoles(rolesResponse.data);
      if (departmentsResponse.data) setDepartments(departmentsResponse.data);
      if (shiftsResponse.data) setShifts(shiftsResponse.data);
    } catch (error) {
      console.error('Error fetching roles, departments, and shifts:', error);
      toast({
        title: "Error",
        description: "Failed to load roles, departments, or shifts",
        variant: "destructive",
      });
    }
  };

  const validateForeignKeys = async (organization_id: string) => {
    const checks = [
      formData.role_id && supabase.from('hr_roles').select('id').eq('id', formData.role_id).single(),
      formData.department_id && supabase.from('hr_departments').select('id').eq('id', formData.department_id).single(),
      formData.shift_id && supabase.from('hr_shifts').select('id').eq('id', formData.shift_id).single(),
      supabase.from('hr_organizations').select('id').eq('id', organization_id).single(),
    ].filter(Boolean);

    const results = await Promise.all(checks);
    const errors = results.filter((result) => result.error || !result.data);
    if (errors.length > 0) {
      throw new Error('Invalid foreign key(s): role, department, shift, or organization.');
    }
  };

  const generateTemporaryPassword = () => {
    return uuidv4().replace(/-/g, '').slice(0, 16); // 16-character random password
  };

// AddUserModal.tsx - inside the component

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic client-side validation remains
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Invalid email format');
      }

      // Get current user's organization_id and ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('hr_employees')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userProfile) throw new Error('Admin profile not found');
      
      const tempPassword = uuidv4(); // Still need a temp password for creation

      // Prepare the data for the Edge Function
      const functionPayload = {
        user_data: {
          email: formData.email,
          // password: tempPassword, // REMOVE THIS LINE
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          employee_id: formData.employee_id,
        },
        profile_data: {
          organization_id: userProfile.organization_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          employee_id: formData.employee_id,
          phone: formData.phone || null,
          role_id: formData.role_id || null,
          department_id: formData.department_id || null,
          shift_id: formData.shift_id || null,
          employment_start_date: formData.employment_start_date || null,
        },
        creating_user_id: user.id
      };
      
     // Invoke the Edge Function (this call doesn't change)
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: functionPayload
      });
      if (functionError) throw functionError;
      if (data.error) throw new Error(data.error); // Handle errors returned from the function body

      toast({
        title: "Success",
        description: `User created successfully. A verification email has been sent to ${formData.email}.`,
      });

      onSuccess();
      resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error Creating User",
        description: error.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      employee_id: '',
      phone: '',
      role_id: '',
      department_id: '',
      shift_id: '',
      employment_start_date: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign roles, departments, and shifts. A verification email will be sent to the user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="employee_id">User unique ID / Employee ID *</Label>
            <Input
              id="employee_id"
              value={formData.employee_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, employee_id: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, role_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, department_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="shift">Shift</Label>
            <Select
              value={formData.shift_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, shift_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_date">Employment Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.employment_start_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, employment_start_date: e.target.value }))
              }
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;