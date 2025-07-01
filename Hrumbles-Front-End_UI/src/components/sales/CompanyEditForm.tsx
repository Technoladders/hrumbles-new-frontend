// src/components/CompanyEditForm.tsx
import React, { useState, useEffect } from 'react';
import { CompanyDetail, KeyPerson } from '@/types/company'; // Ensure KeyPerson is imported if used
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface CompanyEditFormProps {
  company: CompanyDetail;
  onClose: () => void; // Changed from onSave/onCancel to a single onClose prop
}

const CompanyEditForm: React.FC<CompanyEditFormProps> = ({ company, onClose }) => {
  // Initialize formData more explicitly to avoid issues with extra fields from CompanyDetail
  const getInitialFormData = (comp: CompanyDetail): Partial<CompanyDetail> => ({
    name: comp.name,
    website: comp.website,
    linkedin: comp.linkedin,
    logo_url: comp.logo_url,
    status: comp.status,
    domain: comp.domain,
    about: comp.about,
    start_date: comp.start_date,
    employee_count: comp.employee_count,
    address: comp.address,
    industry: comp.industry,
    stage: comp.stage, // CRM stage
    location: comp.location,
    account_owner: comp.account_owner,
    revenue: comp.revenue, // Assuming revenue might be string from AI, DB might be numeric or text
    cashflow: comp.cashflow,
    founded_as: comp.founded_as,
    employee_count_date: comp.employee_count_date,
    competitors: comp.competitors ? [...comp.competitors] : null, // Defensive copy
    products: comp.products ? [...comp.products] : null,       // Defensive copy
    services: comp.services ? [...comp.services] : null,       // Defensive copy
    key_people: comp.key_people ? comp.key_people.map(kp => ({...kp})) : null, // Deep copy for objects
  });

  const [formData, setFormData] = useState<Partial<CompanyDetail>>(getInitialFormData(company));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFormData(getInitialFormData(company));
    setError(null); // Clear errors when company changes
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      // Set to null if empty, otherwise use the value
      [name]: value.trim() === '' ? null : value,
    }));
    setError(null); // Clear error on change
  };

  const handleNumericChange = (fieldName: keyof CompanyDetail, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value === '' ? null : Number(value),
    }));
    setError(null);
  };

  const handleArrayChange = (fieldName: keyof CompanyDetail, value: string) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      [fieldName]: arrayValue.length > 0 ? arrayValue : null,
    }));
    setError(null);
  };

  const handleKeyPeopleChange = (value: string) => {
    setError(null);
    if (value.trim() === '') {
      setFormData(prev => ({ ...prev, key_people: null }));
      return;
    }
    try {
      const parsed = JSON.parse(value) as KeyPerson[]; // Assume KeyPerson[] type
      if (Array.isArray(parsed) && parsed.every(p => typeof p === 'object' && p !== null && 'name' in p && 'title' in p)) {
        setFormData(prev => ({ ...prev, key_people: parsed }));
      } else {
        throw new Error("Key People array must contain objects with 'name' and 'title' properties.");
      }
    } catch (e: any) {
      console.error("Invalid JSON for key_people:", e);
      setError(`Invalid format for Key People. Example: [{"name": "Name", "title": "Title"}]. Error: ${e.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || formData.name.trim() === "") {
      const msg = "Company name is required.";
      setError(msg);
      toast({ title: "Validation Error", description: msg, variant: "destructive" });
      return;
    }

    setIsSaving(true);

    // Prepare data for Supabase: only include fields that are actually in formData
    // and ensure numeric fields are numbers.
    const updateData: { [key: string]: any } = {};
    Object.keys(formData).forEach(key => {
      const formKey = key as keyof Partial<CompanyDetail>;
      if (formData[formKey] !== undefined) { // Only include if defined in formData
        if (formKey === 'employee_count' || formKey === 'cashflow') {
          updateData[formKey] = formData[formKey] === null || formData[formKey] === '' ? null : Number(formData[formKey]);
        } else {
          updateData[formKey] = formData[formKey];
        }
      }
    });
    
    // Remove id from updateData if it was included, as it's used in .eq()
    if (updateData.id) {
        delete updateData.id;
    }
    // Remove created_at and updated_at if they are part of formData, as they shouldn't be manually set
    if (updateData.created_at) delete updateData.created_at;
    if (updateData.updated_at) delete updateData.updated_at;


    try {
      const { error: supabaseError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id);

      if (supabaseError) throw supabaseError;

      toast({ title: "Success!", description: `${formData.name || 'Company'} updated successfully.` });
      if (typeof onClose === 'function') {
        onClose(); // Call onClose to trigger parent's closing logic (and data refetch)
      }
    } catch (err: any) {
      console.error("Error updating company:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setError(`Failed to update company: ${errorMessage}`);
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (typeof onClose === 'function') {
      onClose(); // Call parent's onClose handler
    }
  };

  // Using more descriptive class names that might align with a UI framework like Tailwind/ShadCN
  const inputClassName = "mt-1 block w-full border-input border rounded-md p-2 shadow-sm focus:ring-ring focus:border-ring bg-background text-foreground";
  const labelClassName = "block text-sm font-medium text-foreground";
  const buttonPrimaryClassName = "px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50";
  const buttonSecondaryClassName = "px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50";


  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-background shadow rounded-lg max-h-[80vh] overflow-y-auto pr-3">
      {error && <div className="mb-3 p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/30 rounded-md">{error}</div>}
      
      <div>
        <label htmlFor="name" className={labelClassName}>Name *</label>
        <input id="name" type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClassName} required />
      </div>
      <div>
        <label htmlFor="website" className={labelClassName}>Website</label>
        <input id="website" type="url" name="website" value={formData.website || ''} onChange={handleChange} className={inputClassName} placeholder="https://example.com"/>
      </div>
      <div>
        <label htmlFor="linkedin" className={labelClassName}>LinkedIn</label>
        <input id="linkedin" type="url" name="linkedin" value={formData.linkedin || ''} onChange={handleChange} className={inputClassName} placeholder="https://linkedin.com/company/..."/>
      </div>
      <div>
        <label htmlFor="logo_url" className={labelClassName}>Logo URL</label>
        <input id="logo_url" type="url" name="logo_url" value={formData.logo_url || ''} onChange={handleChange} className={inputClassName} placeholder="https://example.com/logo.png"/>
      </div>
      <div>
        <label htmlFor="status" className={labelClassName}>Company Status</label>
        <input id="status" type="text" name="status" value={formData.status || ''} onChange={handleChange} placeholder="e.g., Public, Private" className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="domain" className={labelClassName}>Domain</label>
        <input id="domain" type="text" name="domain" value={formData.domain || ''} onChange={handleChange} placeholder="example.com" className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="about" className={labelClassName}>About</label>
        <textarea id="about" name="about" value={formData.about || ''} onChange={handleChange} rows={3} className={inputClassName}/>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className={labelClassName}>Start Date</label>
          <input id="start_date" type="text" name="start_date" value={formData.start_date || ''} onChange={handleChange} placeholder="YYYY-MM-DD or YYYY" className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="founded_as" className={labelClassName}>Founded As</label>
          <input id="founded_as" type="text" name="founded_as" value={formData.founded_as || ''} onChange={handleChange} className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="employee_count" className={labelClassName}>Employee Count</label>
          <input id="employee_count" type="number" name="employee_count" value={formData.employee_count ?? ''} onChange={(e) => handleNumericChange('employee_count', e.target.value)} className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="employee_count_date" className={labelClassName}>Employee Count Date</label>
          <input id="employee_count_date" type="text" name="employee_count_date" value={formData.employee_count_date || ''} onChange={handleChange} placeholder="YYYY-MM-DD" className={inputClassName}/>
        </div>
        <div>
            <label htmlFor="revenue" className={labelClassName}>Revenue</label>
            <input id="revenue" type="text" name="revenue" value={formData.revenue || ''} onChange={handleChange} placeholder="e.g., 1.5M or 1500000" className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="cashflow" className={labelClassName}>Cashflow</label>
          <input id="cashflow" type="number" name="cashflow" value={formData.cashflow ?? ''} onChange={(e) => handleNumericChange('cashflow', e.target.value)} className={inputClassName}/>
        </div>
      </div>
      
      <div>
        <label htmlFor="address" className={labelClassName}>Address</label>
        <input id="address" type="text" name="address" value={formData.address || ''} onChange={handleChange} className={inputClassName}/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="industry" className={labelClassName}>Industry</label>
          <input id="industry" type="text" name="industry" value={formData.industry || ''} onChange={handleChange} className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="stage" className={labelClassName}>CRM Stage</label>
          <input id="stage" type="text" name="stage" value={formData.stage || ''} onChange={handleChange} placeholder="e.g., Prospect, Customer" className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="location" className={labelClassName}>Location</label>
          <input id="location" type="text" name="location" value={formData.location || ''} onChange={handleChange} placeholder="City, Country" className={inputClassName}/>
        </div>
        <div>
          <label htmlFor="account_owner" className={labelClassName}>Account Owner</label>
          <input id="account_owner" type="text" name="account_owner" value={formData.account_owner || ''} onChange={handleChange} className={inputClassName}/>
        </div>
      </div>

      <div>
        <label htmlFor="competitors" className={labelClassName}>Competitors (comma-separated)</label>
        <input id="competitors" type="text" name="competitors" value={Array.isArray(formData.competitors) ? formData.competitors.join(', ') : ''} onChange={(e) => handleArrayChange('competitors', e.target.value)} className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="products" className={labelClassName}>Products (comma-separated)</label>
        <input id="products" type="text" name="products" value={Array.isArray(formData.products) ? formData.products.join(', ') : ''} onChange={(e) => handleArrayChange('products', e.target.value)} className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="services" className={labelClassName}>Services (comma-separated)</label>
        <input id="services" type="text" name="services" value={Array.isArray(formData.services) ? formData.services.join(', ') : ''} onChange={(e) => handleArrayChange('services', e.target.value)} className={inputClassName}/>
      </div>
      <div>
        <label htmlFor="key_people" className={labelClassName}>Key People (JSON format)</label>
        <textarea id="key_people" name="key_people" value={formData.key_people ? JSON.stringify(formData.key_people, null, 2) : ''} onChange={(e) => handleKeyPeopleChange(e.target.value)} rows={4} className={inputClassName} placeholder='[{"name": "John Doe", "title": "CEO"}, {"name": "Jane Smith", "title": "CTO"}]'/>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6">
        <button type="button" onClick={handleCancel} disabled={isSaving} className={buttonSecondaryClassName}>
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className={buttonPrimaryClassName}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default CompanyEditForm;