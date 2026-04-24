// src/components/UserManagement/AddUserModal.tsx
// Two creation modes:
//   Email Invite  → existing flow: sends magic link, user sets their own password
//   Instant Create → superadmin sets password directly, user can login immediately
// Accepts prefillData to auto-fill fields when granting access to an existing employee

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Mail, Zap, Eye, EyeOff, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface PrefillData {
  id?: string;           // hr_employees.id — if set, we update instead of insert
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  employee_id?: string | null;
  role_id?: string | null;
  role_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillData?: PrefillData | null;  // passed when granting access to existing employee
}

type CreationMode = 'invite' | 'instant';

const ROLE_DISPLAY: Record<string, string> = {
  organization_superadmin: 'Superadmin',
  admin: 'Admin',
  employee: 'Employee',
};

const ALLOWED_ROLES = ['organization_superadmin', 'admin', 'employee'];

// ─── Component ───────────────────────────────────────────────────────────────
const AddUserModal = ({ isOpen, onClose, onSuccess, prefillData }: AddUserModalProps) => {
  const [mode, setMode] = useState<CreationMode>('invite');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  const isExistingEmployee = !!prefillData?.id;

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    role_id: '',
    department_id: '',
    employment_start_date: '',
    password: '',
  });
  const [phone, setPhone] = useState<E164Number | undefined>();

  // ── Pre-fill from existing employee ───────────────────────────────────────
  useEffect(() => {
    if (isOpen && prefillData) {
      setFormData((prev) => ({
        ...prev,
        first_name:    prefillData.first_name    || '',
        last_name:     prefillData.last_name     || '',
        email:         prefillData.email         || '',
        employee_id:   prefillData.employee_id   || '',
        role_id:       prefillData.role_id       || '',
        department_id: prefillData.department_id || '',
        password: '',
      }));
      setPhone((prefillData.phone as E164Number) || undefined);
    }
  }, [isOpen, prefillData]);

  // ── Fetch dropdown data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const fetchDropdowns = async () => {
      const [rolesRes, deptsRes] = await Promise.all([
        supabase.from('hr_roles').select('id, name'),
        supabase.from('hr_departments').select('id, name'),
      ]);

      const filteredRoles: Role[] = (rolesRes.data || [])
        .filter((r) => ALLOWED_ROLES.includes(r.name))
        .map((r) => ({ ...r, displayName: ROLE_DISPLAY[r.name] || r.name }));

      setRoles(filteredRoles);
      setDepartments(deptsRes.data || []);

      // If prefill has a role_name but no role_id, try to resolve it
      if (prefillData?.role_name && !prefillData.role_id) {
        const match = filteredRoles.find((r) => r.name === prefillData.role_name);
        if (match) setFormData((prev) => ({ ...prev, role_id: match.id }));
      }
      // Same for department
      if (prefillData?.department_name && !prefillData.department_id) {
        const match = (deptsRes.data || []).find((d) => d.name === prefillData.department_name);
        if (match) setFormData((prev) => ({ ...prev, department_id: match.id }));
      }
    };
    fetchDropdowns();
  }, [isOpen]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!formData.first_name.trim()) return 'First name is required';
    if (!formData.last_name.trim())  return 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email address';
    if (!formData.employee_id.trim()) return 'Employee ID is required';
    if (!formData.role_id) return 'Role is required';
    if (mode === 'instant') {
      if (!formData.password) return 'Password is required for instant create';
      if (formData.password.length < 6) return 'Password must be at least 6 characters';
    }
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { toast({ title: 'Validation Error', description: validationError, variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('hr_employees').select('organization_id').eq('id', session.user.id).single();
      if (!userProfile) throw new Error('Admin profile not found');

      const subdomain = window.location.hostname.split('.')[0];

      const payload = {
        subdomain,
        mode,                         // ← NEW: 'invite' | 'instant'
        existing_employee_id: prefillData?.id || null,  // ← NEW: link to existing employee
        user_data: {
          email:       formData.email,
          first_name:  formData.first_name,
          last_name:   formData.last_name,
          phone:       phone,
          employee_id: formData.employee_id,
          ...(mode === 'instant' && { password: formData.password }),
        },
        profile_data: {
          organization_id:        userProfile.organization_id,
          first_name:             formData.first_name,
          last_name:              formData.last_name,
          email:                  formData.email,
          employee_id:            formData.employee_id,
          phone:                  phone || null,
          role_id:                formData.role_id || null,
          department_id:          formData.department_id || null,
          employment_start_date:  formData.employment_start_date || null,
        },
        creating_user_id: session.user.id,
      };

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Request failed: ${response.status}`);
      }

      toast({
        title: 'Success',
        description: mode === 'invite'
          ? 'Invitation email sent. User will set their password via the link.'
          : 'User created. They can log in immediately with the password you set.',
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ first_name: '', last_name: '', email: '', employee_id: '', role_id: '', department_id: '', employment_start_date: '', password: '' });
    setPhone(undefined);
    setMode('invite');
    setShowPassword(false);
    onClose();
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>
            {isExistingEmployee ? `Grant Login Access — ${prefillData?.first_name} ${prefillData?.last_name}` : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isExistingEmployee
              ? 'This employee already has a record. Choose how to create their login account.'
              : 'Choose how to create the user account.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Mode Toggle ──────────────────────────────────────────────────── */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden mt-1">
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              mode === 'invite' ? 'bg-[#7B43F1] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Mail size={15} />
            Email Invite
          </button>
          <button
            type="button"
            onClick={() => setMode('instant')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-l border-gray-200 ${
              mode === 'instant' ? 'bg-[#7B43F1] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Zap size={15} />
            Instant Create
          </button>
        </div>

        {/* Mode description */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500">
          <Info size={13} className="shrink-0 mt-0.5 text-[#7B43F1]" />
          {mode === 'invite'
            ? 'A magic link will be sent to the email. The user sets their own password and confirms their account.'
            : 'Account created immediately. You set the password now. The user can login right away — no email required.'}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">

            {/* Name */}
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" value={formData.first_name} onChange={set('first_name')} required
                placeholder={prefillData?.first_name ? '' : 'Enter first name'} />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={set('last_name')} required
                placeholder={prefillData?.last_name ? '' : 'Enter last name'} />
            </div>

            {/* Email */}
            <div className="col-span-2">
              <Label htmlFor="email">
                Email *
                {isExistingEmployee && <span className="ml-2 text-[10px] text-amber-600 font-medium">Locked — from employee record</span>}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={isExistingEmployee ? undefined : set('email')}
                readOnly={isExistingEmployee}
                className={isExistingEmployee ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                required
              />
            </div>

            {/* Employee ID */}
            <div className="col-span-2">
              <Label htmlFor="employee_id">
                Employee ID *
                {isExistingEmployee && <span className="ml-2 text-[10px] text-amber-600 font-medium">Locked</span>}
              </Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={isExistingEmployee ? undefined : set('employee_id')}
                readOnly={isExistingEmployee}
                className={isExistingEmployee ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <Label>Phone</Label>
              <PhoneInput
                international defaultCountry="IN"
                value={phone} onChange={setPhone}
                className="phone-input"
              />
            </div>

            {/* Role */}
            <div>
              <Label>Role *</Label>
              <Select value={formData.role_id} onValueChange={(v) => setFormData((p) => ({ ...p, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div>
              <Label>Department</Label>
              <Select value={formData.department_id} onValueChange={(v) => setFormData((p) => ({ ...p, department_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Employment start date */}
            <div>
              <Label htmlFor="employment_start_date">Employment Start Date</Label>
              <Input id="employment_start_date" type="date" value={formData.employment_start_date} onChange={set('employment_start_date')} />
            </div>

            {/* Password — only shown for Instant Create */}
            {mode === 'instant' && (
              <div className="col-span-2">
                <Label htmlFor="password">
                  Password * <span className="text-[10px] text-gray-400 font-normal ml-1">(min 6 characters — user can change after login)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={set('password')}
                    placeholder="Set a password for this user"
                    className="pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#7B43F1] hover:bg-[#6930D4]">
              {loading ? 'Creating…' : mode === 'invite' ? '✉ Send Invite' : '⚡ Create Now'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;