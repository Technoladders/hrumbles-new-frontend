// src/components/sales/CompanyEditForm.tsx

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CompanyDetail, KeyPerson } from '@/types/company';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Use Partial<CompanyDetail> as the prop type to allow for both creating (no id) and editing (with id)
interface CompanyEditFormProps {
  company: Partial<CompanyDetail>;
  onClose: () => void;
   currentUserId: string | null; 
   organizationId: string | null;
   fileId?: string | null;
}

const CompanyEditForm: React.FC<CompanyEditFormProps> = ({ company, onClose, currentUserId, organizationId, fileId }) => {
  const [formData, setFormData] = useState<Partial<CompanyDetail>>(company);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setFormData(company);
    setJsonError(null);
  }, [company]);

  const mutation = useMutation({
    mutationFn: async (companyData: Partial<CompanyDetail>) => {
      // Use upsert: It will INSERT if no `id` is provided, and UPDATE if an `id` is present.
      // `onConflict: 'name'` is a safety net: if a new company has a name that already exists, it will update it.
      const { error } = await supabase.from('companies').upsert(companyData, {
        onConflict: 'name', // This is great for preventing duplicate company names
      });

      if (error) throw new Error(error.message);
      return companyData;
    },
    onSuccess: (data) => {
      const action = company.id ? 'updated' : 'created';
      toast({
        title: `Company ${action}`,
        description: `"${data.name}" has been successfully ${action}.`,
      });
      // Invalidate queries to automatically refetch the list and counts
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-counts'] });
       queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] }); 
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.trim() === '' ? null : value }));
  };

  const handleNumericChange = (fieldName: keyof CompanyDetail, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value === '' ? null : Number(value) }));
  };

  const handleArrayChange = (fieldName: keyof CompanyDetail, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [fieldName]: arrayValue.length > 0 ? arrayValue : null }));
  };
  
  const handleKeyPeopleChange = (value: string) => {
    setJsonError(null);
    if (value.trim() === '') {
      setFormData(prev => ({ ...prev, key_people: null }));
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every(p => typeof p === 'object' && p !== null && 'name' in p && 'title' in p)) {
        setFormData(prev => ({ ...prev, key_people: parsed }));
      } else {
        throw new Error("Each item in the array must be an object with 'name' and 'title'.");
      }
    } catch (e: any) {
      setJsonError(`Invalid JSON format. Example: [{"name": "Jane Doe", "title": "CEO"}]`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) {
      toast({ title: "Invalid Data", description: jsonError, variant: "destructive" });
      return;
    }
    if (!formData.name?.trim()) {
      toast({ title: "Validation Error", description: "Company name is required.", variant: "destructive" });
      return;
    }

    // --- START: MODIFIED LOGIC ---
    // Create a mutable copy of the form data to add our new fields
    const dataToSave: Partial<CompanyDetail> = { ...formData };

     delete (dataToSave as any).created_by_employee;
    delete (dataToSave as any).updated_by_employee;

    if (currentUserId) {
      if (company.id) {
        // This is an UPDATE, so only set updated_by
        dataToSave.updated_by = currentUserId;
      } else {
        // This is a CREATE, so set both created_by and updated_by
        dataToSave.created_by = currentUserId;
        dataToSave.updated_by = currentUserId;
        dataToSave.organization_id = organizationId;
         dataToSave.file_id = fileId || null;
      }
    } else {
      // It's good practice to log a warning if the ID is missing for some reason
      console.warn("User ID not available. created_by/updated_by will not be set.");
    }

    // Pass the enhanced data object to the mutation
    mutation.mutate(dataToSave);
    // --- END: MODIFIED LOGIC ---

  };

  const inputClassName = "mt-1 block w-full border-input border rounded-md p-2 shadow-sm focus:ring-ring focus:border-ring bg-background text-foreground";
  const labelClassName = "block text-sm font-medium text-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1 bg-background shadow rounded-lg max-h-[80vh] overflow-y-auto pr-3">
      {jsonError && <div className="mb-3 p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/30 rounded-md">{jsonError}</div>}
      
      <div>
        <Label htmlFor="name" className={labelClassName}>Name *</Label>
        <Input id="name" type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClassName} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="website" className={labelClassName}>Website</Label>
          <Input id="website" type="url" name="website" value={formData.website || ''} onChange={handleChange} className={inputClassName} placeholder="https://example.com"/>
        </div>
        <div>
          <Label htmlFor="linkedin" className={labelClassName}>LinkedIn</Label>
          <Input id="linkedin" type="url" name="linkedin" value={formData.linkedin || ''} onChange={handleChange} className={inputClassName} placeholder="https://linkedin.com/company/..."/>
        </div>
      </div>
      <div>
        <Label htmlFor="about" className={labelClassName}>About</Label>
        <Textarea id="about" name="about" value={formData.about || ''} onChange={handleChange} rows={3} className={inputClassName}/>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="industry" className={labelClassName}>Industry</Label>
          <Input id="industry" type="text" name="industry" value={formData.industry || ''} onChange={handleChange} className={inputClassName}/>
        </div>
        <div>
          <Label htmlFor="location" className={labelClassName}>Location</Label>
          <Input id="location" type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="City, Country" className={inputClassName}/>
        </div>
         <div>
          <Label htmlFor="employee_count" className={labelClassName}>Employee Count</Label>
          <Input id="employee_count" type="number" name="employee_count" value={formData.employee_count ?? ''} onChange={(e) => handleNumericChange('employee_count', e.target.value)} className={inputClassName}/>
        </div>
        <div>
          <Label htmlFor="revenue" className={labelClassName}>Revenue</Label>
          <Input id="revenue" type="text" name="revenue" value={formData.revenue || ''} onChange={(e) => handleNumericChange('revenue', e.target.value)} placeholder="e.g., 1500000" className={inputClassName}/>
        </div>
         <div>
          <Label htmlFor="stage" className={labelClassName}>CRM Stage</Label>
          <Input id="stage" type="text" name="stage" value={formData.stage || ''} onChange={handleChange} placeholder="e.g., Cold, Customer" className={inputClassName}/>
        </div>
        <div>
          <Label htmlFor="account_owner" className={labelClassName}>Account Owner</Label>
          <Input id="account_owner" type="text" name="account_owner" value={formData.account_owner || ''} onChange={handleChange} className={inputClassName}/>
        </div>
      </div>
      
      <div>
        <Label htmlFor="competitors" className={labelClassName}>Competitors (comma-separated)</Label>
        <Input id="competitors" type="text" name="competitors" value={Array.isArray(formData.competitors) ? formData.competitors.join(', ') : ''} onChange={(e) => handleArrayChange('competitors', e.target.value)} className={inputClassName}/>
      </div>
      
      <div>
        <Label htmlFor="key_people" className={labelClassName}>Key People (JSON format)</Label>
        <Textarea id="key_people" name="key_people" value={formData.key_people ? JSON.stringify(formData.key_people, null, 2) : ''} onChange={(e) => handleKeyPeopleChange(e.target.value)} rows={4} className={inputClassName} placeholder='[{"name": "John Doe", "title": "CEO"}]'/>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {company.id ? 'Save Changes' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
};

export default CompanyEditForm;