// src/components/UserManagement/AddUserModal.tsx

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

// MODIFICATION: Import the phone input component and its styles
import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Define a type for our filtered roles
interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddUserModal = ({ isOpen, onClose, onSuccess }: AddUserModalProps) => {
  // Use a more structured state for form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    role_id: '',
    department_id: '',
    employment_start_date: '',
  });
  // Separate state for the phone number
  const [phone, setPhone] = useState<E164Number | undefined>();

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const [rolesResponse, departmentsResponse] = await Promise.all([
            supabase.from('hr_roles').select('id, name'),
            supabase.from('hr_departments').select('id, name'),
          ]);

          if (rolesResponse.error) throw rolesResponse.error;
          if (departmentsResponse.error) throw departmentsResponse.error;
          
          // MODIFICATION: Filter and map roles
          const allowedRoles = ['organization_superadmin', 'admin', 'employee'];
          const roleDisplayNameMap: { [key: string]: string } = {
            organization_superadmin: 'Superadmin',
            admin: 'Admin',
            employee: 'Employee',
          };

          const filteredRoles = rolesResponse.data
            .filter(role => allowedRoles.includes(role.name))
            .map(role => ({
              ...role,
              displayName: roleDisplayNameMap[role.name] || role.name
            }));

          setRoles(filteredRoles);
          setDepartments(departmentsResponse.data || []);
        } catch (error) {
          console.error('Error fetching dropdown data:', error);
          toast({ title: "Error", description: "Failed to load roles or departments", variant: "destructive" });
        }
      };
      fetchDropdownData();
    }
  }, [isOpen, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    // ... (Your existing handleSubmit logic using fetch remains the same)
    // Just ensure the payload is built from the new state
    e.preventDefault();
    setLoading(true);
    // ... (rest of your existing, working handleSubmit logic)
     try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            throw new Error('Invalid email format');
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const user = session.user;

        const { data: userProfile } = await supabase.from('hr_employees').select('organization_id').eq('id', user.id).single();
        if (!userProfile) throw new Error('Admin profile not found');
        
        const subdomain = window.location.hostname.split('.')[0];
        const functionPayload = {
            subdomain,
            user_data: {
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: phone, // Use the state from PhoneInput
                employee_id: formData.employee_id,
            },
            profile_data: {
                organization_id: userProfile.organization_id,
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                employee_id: formData.employee_id,
                phone: phone || null,
                role_id: formData.role_id || null,
                department_id: formData.department_id || null,
                employment_start_date: formData.employment_start_date || null,
            },
            creating_user_id: user.id
        };

       const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`, // Add Supabase auth token
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, // Add Supabase anonymous key
      },
      body: JSON.stringify(functionPayload),
    });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        toast({ title: "Success", description: `User invitation sent successfully.` });
        onSuccess();
        handleClose();
     } catch (error: any) {
        console.error('Error creating user:', error);
        toast({ title: "Error Creating User", description: error.message, variant: "destructive" });
     } finally {
        setLoading(false);
     }
  };

  const handleClose = () => {
    // Reset form on close
    setFormData({ first_name: '', last_name: '', email: '', employee_id: '', role_id: '', department_id: '', employment_start_date: '' });
    setPhone(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>A verification email will be sent to the user to set their password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* MODIFICATION: Two-column layout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={formData.first_name} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={handleInputChange} required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="employee_id">User / Employee ID *</Label>
              <Input id="employee_id" value={formData.employee_id} onChange={handleInputChange} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                id="phone"
                international
                defaultCountry="IN"
                value={phone}
                onChange={setPhone}
                className="phone-input" // Add a class for custom styling
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role_id} onValueChange={(value) => setFormData(p => ({ ...p, role_id: value }))} required>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department_id} onValueChange={(value) => setFormData(p => ({ ...p, department_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employment_start_date">Employment Start Date</Label>
              <Input id="employment_start_date" type="date" value={formData.employment_start_date} onChange={handleInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;