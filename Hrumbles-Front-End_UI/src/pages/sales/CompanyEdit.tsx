import React, { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CompanyDetail as CompanyDetailType, Company, KeyPerson } from "@/types/company";
import { Database } from "@/types/database.types";

interface CompanyEditProps {
  company: Company | CompanyDetailType | null;
  onSave: () => void;
  onCancel: () => void;
}

type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

const STATUSES = ["Customer", "Prospect", "Partner", "Vendor", "Former Customer", "Other"];
const CLEAR_SELECTION_VALUE = "__clear__";

// Zod Schema for all fields
const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  website: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')).nullable(),
  domain: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  founded_as: z.string().optional().nullable(),
  employee_count: z.union([
    z.string().transform(val => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10)).refine(val => val === null || (!isNaN(val) && Number.isInteger(val) && val >= 0), { message: "Must be a non-negative whole number" }),
    z.number().int().nonnegative().nullable()
  ]).optional().nullable(),
  employee_count_date: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  linkedin: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')).nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  account_owner: z.string().optional().nullable(),
  revenue: z.union([
    z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number format" }).nullable(),
    z.number().nullable()
  ]).optional().nullable(),
  cashflow: z.union([
    z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number format" }).nullable(),
    z.number().nullable()
  ]).optional().nullable(),
  competitors_string: z.string().optional().nullable(),
  products_string: z.string().optional().nullable(),
  services_string: z.string().optional().nullable(),
  key_people_string: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const CompanyEdit = ({ company, onSave, onCancel }: CompanyEditProps) => {
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      website: "",
      domain: "",
      status: null,
      about: "",
      start_date: "",
      founded_as: "",
      employee_count: null,
      employee_count_date: "",
      address: "",
      linkedin: "",
      industry: "",
      location: "",
      account_owner: "",
      revenue: null,
      cashflow: null,
      competitors_string: "",
      products_string: "",
      services_string: "",
      key_people_string: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name || "",
        website: company.website || "",
        domain: company.domain || "",
        status: company.status || null,
        about: company.about || "",
        start_date: company.start_date || "",
        founded_as: company.founded_as || "",
        employee_count: company.employee_count ?? null,
        employee_count_date: company.employee_count_date || "",
        address: company.address || "",
        linkedin: company.linkedin || "",
        industry: company.industry || "",
        location: company.location || "",
        account_owner: company.account_owner || "",
        revenue: company.revenue != null ? String(company.revenue) : null,
        cashflow: company.cashflow != null ? String(company.cashflow) : null,
        competitors_string: company.competitors?.join(', ') || "",
        products_string: company.products?.join(', ') || "",
        services_string: company.services?.join(', ') || "",
        key_people_string: company.key_people ? JSON.stringify(company.key_people, null, 2) : "",
      });
    }
  }, [company, form]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      if (!companyId) throw new Error("Company ID missing.");
      let keyPeopleParsed: KeyPerson[] | null = null;
      if (formData.key_people_string) {
        try {
          keyPeopleParsed = JSON.parse(formData.key_people_string);
          if (!Array.isArray(keyPeopleParsed) || !keyPeopleParsed.every(p => typeof p === 'object' && typeof p.name === 'string' && typeof p.title === 'string')) {
            throw new Error("Incorrect format.");
          }
        } catch (e) {
          throw new Error("Invalid JSON for Key People. Expected array of {name, title}.");
        }
      }

      const updateData: CompanyUpdate = {
        name: formData.name,
        website: formData.website || null,
        domain: formData.domain || null,
        status: formData.status || null,
        about: formData.about || null,
        start_date: formData.start_date || null,
        founded_as: formData.founded_as || null,
        employee_count: formData.employee_count ?? null,
        employee_count_date: formData.employee_count_date || null,
        address: formData.address || null,
        linkedin: formData.linkedin || null,
        industry: formData.industry || null,
        location: formData.location || null,
        account_owner: formData.account_owner || null,
        revenue: formData.revenue != null ? parseFloat(formData.revenue) : null,
        cashflow: formData.cashflow != null ? parseFloat(formData.cashflow) : null,
        competitors: formData.competitors_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
        products: formData.products_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
        services: formData.services_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
        key_people: keyPeopleParsed,
      };

      Object.keys(updateData).forEach(key => updateData[key as keyof CompanyUpdate] === undefined && delete updateData[key as keyof CompanyUpdate]);
      const { error } = await supabase.from('companies').update(updateData).eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Company Updated", description: "Saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onSave();
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: FormValues) => updateCompanyMutation.mutate(data);

  // Check if company is null
  if (!company) {
    return (
      <div className="p-4">
        Loading...
      </div>
    );
  }

  // Main form rendering
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">
        Edit Company: {company.name}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
          {/* Group 1: Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="example.com" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 2: Online Presence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://linkedin.com/company/..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 3: Founding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Founded Date</FormLabel>
                  <FormControl>
                    <Input placeholder="YYYY or YYYY-MM-DD" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="founded_as"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Name (if any)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., as Andersen Consulting" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 4: Size & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="employee_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employees</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Approximate count"
                      {...field}
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employee_count_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employees "As Of" Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Software, Finance" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 5: Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (City, Country)</FormLabel>
                  <FormControl>
                    <Input placeholder="City, Country" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full HQ Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Company address" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 6: Internal/Sales Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="account_owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Owner</FormLabel>
                  <FormControl>
                    <Input placeholder="Internal owner name" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Status</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === CLEAR_SELECTION_VALUE ? null : value)}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={CLEAR_SELECTION_VALUE}>(Clear Status)</SelectItem>
                      {STATUSES.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 7: Financials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Revenue</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g., 50M or 50000000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cashflow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Cash Flow</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g., 10M or 10000000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Group 8: Arrays as Strings */}
          <FormField
            control={form.control}
            name="competitors_string"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competitors (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="CompA, CompB, CompC" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="products_string"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Products (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="Product X, Platform Y" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="services_string"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="Service 1, Service 2" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Group 9: Key People as JSON String */}
          <FormField
            control={form.control}
            name="key_people_string"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Key People (JSON Array)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Enter JSON array, e.g., [{"name": "Jane Doe", "title": "CEO"}]'
                    className="min-h-[100px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Enter as a JSON array of objects: [&#123;"name": "string", "title": "string"&#125;]
                </p>
              </FormItem>
            )}
          />

          {/* Group 10: About */}
          <FormField
            control={form.control}
            name="about"
            render={({ field }) => (
              <FormItem>
                <FormLabel>About</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description..."
                    className="min-h-[80px]"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCompanyMutation.isPending}>
              {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CompanyEdit;