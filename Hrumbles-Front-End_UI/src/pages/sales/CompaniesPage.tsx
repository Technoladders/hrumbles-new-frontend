import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { useCompanies, useCompanyCounts } from "@/hooks/use-companies";
import {
  Edit, Building2, Users, Search, Plus, ArrowUp, Globe, Linkedin, Link as LinkIcon,
  Upload, Loader2, Download, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CompanyEditForm from "@/components/sales/CompanyEditForm";
import CompanyAddForm from "@/components/sales/CompanyAddForm";
import EffectivePagination from "@/components/sales/EffectivePagination";
import Papa from 'papaparse';
import { z } from 'zod';

const companyCsvSchema = z.object({
  name: z.string().min(1, { message: "Company Name is required" }),
  website: z.string().url({ message: "Invalid website URL" }).optional().nullable(),
  industry: z.string().optional().nullable(),
  stage: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employee_count: z.preprocess(
    (val) => (val === "" || val == null || isNaN(Number(val))) ? null : parseInt(String(val), 10),
    z.number().int().positive().nullable().optional()
  ).optional(),
  linkedin: z.string().url({ message: "Invalid LinkedIn URL" }).optional().nullable(),
  account_owner: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  revenue: z.union([
    z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number" }).nullable(),
    z.number().nullable()
  ]).optional().nullable(),
  cashflow: z.union([
    z.string().transform(val => (val === "" || val == null) ? null : parseFloat(String(val).replace(/[$,€£¥₹,\s]/g, ''))).refine(val => val === null || !isNaN(val), { message: "Invalid number" }).nullable(),
    z.number().nullable()
  ]).optional().nullable(),
  domain: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  founded_as: z.string().optional().nullable(),
  employee_count_date: z.string().optional().nullable(),
  competitors_string: z.string().optional().nullable(),
  products_string: z.string().optional().nullable(),
  services_string: z.string().optional().nullable(),
  key_people_string: z.string().optional().nullable(),
}).transform(data => ({
  name: data.name.trim(),
  website: data.website?.trim() || null,
  industry: data.industry?.trim() || null,
  stage: data.stage?.trim() || 'Cold',
  location: data.location?.trim() || null,
  employee_count: data.employee_count ?? null,
  linkedin: data.linkedin?.trim() || null,
  account_owner: data.account_owner?.trim() || null,
  address: data.address?.trim() || null,
  revenue: data.revenue,
  cashflow: data.cashflow,
  domain: data.domain?.trim() || null,
  status: data.status?.trim() || 'Customer',
  about: data.about?.trim() || null,
  start_date: data.start_date?.trim() || null,
  founded_as: data.founded_as?.trim() || null,
  employee_count_date: data.employee_count_date?.trim() || null,
  competitors: data.competitors_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
  products: data.products_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
  services: data.services_string?.split(',').map(s => s.trim()).filter(Boolean) || null,
  key_people: data.key_people_string ? JSON.parse(data.key_people_string) : null,
}));
type CompanyCsvRow = z.infer<typeof companyCsvSchema>;

const STAGES = ['Current Client', 'Cold', 'Active Opportunity', 'Dead Opportunity', 'Do Not Prospect'];
const stageColors: Record<string, string> = {
  'Current Client': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  'Cold': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  'Active Opportunity': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  'Dead Opportunity': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  'Do Not Prospect': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
};

const CSV_TEMPLATE_HEADER = "Company Name,Website,Domain,Status,About,Founded Date,Founded As,Employee Count,Employee Count Date,Address,LinkedIn,Industry,Stage,Location,Account Owner,Revenue,Cashflow,Competitors (comma-separated),Products (comma-separated),Services (comma-separated),Key People (JSON string)";

const getDisplayValue = (value: string | number | null | undefined, fallback: string = "N/A"): string => {
  if (value === null || value === undefined) return fallback;
  const stringVal = String(value).trim();
  if (stringVal === '' || stringVal.toUpperCase() === 'N/A') return fallback;
  if (typeof value === 'number' && isNaN(value)) return fallback;
  return stringVal;
};

const CompaniesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: companies = [], isLoading, isError, error } = useCompanies();
  const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const itemsPerPage = 10;
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isError && error) {
      toast({ title: "Error Loading Companies", description: error.message || "Could not fetch data.", variant: "destructive" });
      console.error("Error loading companies:", error);
    }
  }, [isError, error, toast]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
      const { error: updateError } = await supabase.from('companies').update({ stage }).eq('id', companyId);
      if (updateError) throw updateError;
      return { companyId, stage };
    },
    onSuccess: (_, variables) => {
      toast({ title: "Stage Updated", description: `Company stage set to ${variables.stage}.` });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.companyId] });
    },
    onError: (updateError: any) => {
      toast({ title: "Update Failed", description: updateError.message, variant: "destructive" });
    },
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleStageChange = (companyId: number, newStage: string) => updateStageMutation.mutate({ companyId, stage: newStage });
  const handleEditClick = (company: Company) => { setEditCompany(company); setIsEditDialogOpen(true); };
  const handleCloseEditDialog = () => setIsEditDialogOpen(false);
  const handleAddClick = () => setIsAddDialogOpen(true);
  const handleCloseAddDialog = () => setIsAddDialogOpen(false);

  const filteredCompanies = companies?.filter(company =>
    (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (company.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (company.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (company.account_owner?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ) || [];
  const totalFilteredPages = Math.ceil(filteredCompanies.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setCurrentPage(page);
      document.getElementById('company-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const downloadCsvTemplate = () => {
    const sampleRow = `"Acme Corp","https://acme.com","acme.com","Customer","Leading innovator in widget manufacturing.","1990-01-15","Previously Acme Widgets","500","2023-10-01","123 Innovation Drive, Techville, CA","https://linkedin.com/company/acme","Technology","Active Opportunity","Techville, USA","Jane Doe","50M","10M","Globex Corp,Stark Industries","Widget Pro,Widget Ultra","Consulting,Support","[{\"name\":\"John Smith\",\"title\":\"CEO\"},{\"name\":\"Alice Brown\",\"title\":\"CTO\"}]"`;
    const csvContent = `${CSV_TEMPLATE_HEADER}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "companies_template.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      toast({ title: "Download Failed", description: "Browser doesn't support download.", variant: "destructive" });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { toast({ title: "No file selected" }); return; }
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: "Invalid File Type", description: "Please upload CSV.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setIsImporting(true);
    toast({ title: "Import Started", description: "Parsing CSV..." });
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ title: "CSV Parsing Issue", variant: "destructive" });
        }
        processCsvData(results.data as Record<string, any>[]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (err: any) => {
        toast({ title: "CSV Parsing Failed", variant: "destructive" });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const processCsvData = async (data: Record<string, any>[]) => {
    const validCompanies: CompanyCsvRow[] = [];
    const validationErrors: { row: number, errors: string[] }[] = [];
    data.forEach((rawRow, index) => {
      if (Object.values(rawRow).every(val => !val)) return;
      const mappedRow = {
        name: rawRow["company_name"] || rawRow["name"],
        website: rawRow["website"] || rawRow["url"],
        industry: rawRow["industry"],
        stage: rawRow["stage"],
        location: rawRow["location"] || rawRow["city_country"] || rawRow["country"],
        employee_count: rawRow["employees"] || rawRow["employee_count"] || rawRow["no_employees"] || rawRow["_employees"],
        linkedin: rawRow["linkedin"] || rawRow["linkedin_url"],
        account_owner: rawRow["account_owner"] || rawRow["owner"],
        address: rawRow["address"] || rawRow["hq_address"],
        revenue: rawRow["revenue"] || rawRow["annual_revenue"],
        cashflow: rawRow["cashflow"] || rawRow["cash_flow"],
        domain: rawRow["domain"],
        status: rawRow["status"] || rawRow["company_status"],
        about: rawRow["about"] || rawRow["description"],
        start_date: rawRow["founded_date"] || rawRow["start_date"],
        founded_as: rawRow["founded_as"] || rawRow["original_name"],
        employee_count_date: rawRow["employee_count_date"] || rawRow["employees_as_of_date"],
        competitors_string: rawRow["competitors"] || rawRow["competitors_comma_separated"],
        products_string: rawRow["products"] || rawRow["products_comma_separated"],
        services_string: rawRow["services"] || rawRow["services_comma_separated"],
        key_people_string: rawRow["key_people"] || rawRow["key_people_json"],
      };
      const validationResult = companyCsvSchema.safeParse(mappedRow);
      if (validationResult.success) {
        if (validationResult.data.name?.trim()) {
          validCompanies.push(validationResult.data);
        } else {
          validationErrors.push({ row: index + 2, errors: ["Name is required."] });
        }
      } else {
        validationErrors.push({ row: index + 2, errors: validationResult.error.errors.map(e => `${e.path.join('.') || 'Row'}: ${e.message}`) });
      }
    });

    if (validationErrors.length > 0) {
      const errorSummary = validationErrors.slice(0, 3).map(e => `R${e.row}: ${e.errors[0]}`).join('; ');
      toast({ title: `Validation Failed (${validationErrors.length})`, description: `Errors: ${errorSummary}${validationErrors.length > 3 ? '...' : ''}`, variant: "destructive", duration: 10000 });
      if (validCompanies.length === 0) {
        setIsImporting(false);
        return;
      }
    }

    if (validCompanies.length > 0) {
      toast({ title: "Importing Data...", description: `${validCompanies.length} valid rows.` });
      let insertedCount = 0;
      let skippedCount = 0;
      try {
        const companiesToUpsert = validCompanies.map(vc => {
          let keyPeople = null;
          if (typeof vc.key_people_string === 'string') {
            try {
              keyPeople = JSON.parse(vc.key_people_string);
              if (!Array.isArray(keyPeople) || !keyPeople.every(p => typeof p === 'object' && p.name && p.title)) {
                console.warn("Invalid Key People JSON structure in CSV for:", vc.name);
                keyPeople = null;
              }
            } catch (e) {
              console.warn("Could not parse key_people JSON string for:", vc.name, e);
              keyPeople = null;
            }
          }
          const { competitors_string, products_string, services_string, key_people_string, ...restOfVc } = vc;
          return {
            ...restOfVc,
            competitors: restOfVc.competitors,
            products: restOfVc.products,
            services: restOfVc.services,
            key_people: keyPeople
          };
        });

        const { error: upsertError, count } = await supabase.from('companies').upsert(companiesToUpsert as any, { onConflict: 'name', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
        insertedCount = count ?? 0;
        skippedCount = validCompanies.length - insertedCount;
        if (skippedCount < 0) skippedCount = 0;

        let description = `${insertedCount} processed.`;
        if (skippedCount > 0) {
          description += ` ${skippedCount} duplicates skipped.`;
        }
        if (validationErrors.length > 0) {
          description += ` ${validationErrors.length} rows had validation errors.`;
        }
        toast({ title: "Import Complete", description: description });
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        queryClient.invalidateQueries({ queryKey: ['company-counts'] });
      } catch (err: any) {
        toast({ title: "Import Failed", description: err.message || "DB error.", variant: "destructive" });
      } finally {
        setIsImporting(false);
      }
    } else {
      if (validationErrors.length === 0) {
        toast({ title: "Import Info", description: "No new data.", variant: "default" });
      }
      setIsImporting(false);
    }
  };

  const renderSocialIcons = (company: Company) => {
    const activeClass = "text-primary hover:text-primary/80";

    const renderSingleIcon = (rawUrl: string | null | undefined, title: string, IconComponent: React.ElementType) => {
      if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl.trim().toUpperCase() !== 'N/A') {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        return (
          <a href={fullUrl} target="_blank" rel="noreferrer" title={title} className={`inline-block p-0.5 ${activeClass}`}>
            <IconComponent className="h-3.5 w-3.5" />
          </a>
        );
      }
      return null;
    };

    const iconsToRender = [
      renderSingleIcon(company.website, "Website", LinkIcon),
      renderSingleIcon(company.linkedin, "LinkedIn", Linkedin),
    ].filter(Boolean);

    if (iconsToRender.length === 0) {
      return null;
    }

    return (<div className="flex items-center gap-1 mt-1">{iconsToRender}</div>);
  };

  // This function renderUrlIcons is no longer needed if the "Links" column is removed.
  // const renderUrlIcons = (company: Company) => (
  //   <div className="flex items-center justify-end gap-2 text-muted-foreground">
  //     <a
  //       href={`https://www.google.com/search?q=${encodeURIComponent(company.name)}`}
  //       target="_blank"
  //       rel="noreferrer"
  //       title={`Search ${company.name}`}
  //       className="hover:text-primary"
  //     >
  //       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
  //         <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.18,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.18,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.18,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
  //       </svg>
  //     </a>
  //     {company.linkedin && typeof company.linkedin === 'string' && company.linkedin.trim() !== '' && (
  //       <a
  //         href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
  //         target="_blank"
  //         rel="noreferrer"
  //         title="LinkedIn Profile"
  //         className="hover:text-primary"
  //       >
  //         <Linkedin className="h-4 w-4" />
  //       </a>
  //     )}
  //   </div>
  // );

  return (
    <div className="container mx-auto px-4 py-6 max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2 flex-wrap">
          {/* <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-9" onClick={handleAddClick}>
                <Plus className="h-4 w-4 mr-2" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>Enter details.</DialogDescription>
              </DialogHeader>
              <CompanyAddForm onAdd={handleCloseAddDialog} onCancel={handleCloseAddDialog} />
            </DialogContent>
          </Dialog> */}
          <Button variant="outline" className="h-9" onClick={downloadCsvTemplate}>
            <Download className="h-4 w-4 mr-2" />Template
          </Button>
          <Button variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : (<Upload className="h-4 w-4 mr-2" />)}
            {isImporting ? 'Importing...' : 'Import CSV'}
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, text/csv" style={{ display: 'none' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Companies</p>
              <h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.companies ?? 0}</h2>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <h2 className="text-2xl font-bold">{isCountsLoading ? '...' : counts?.employees ?? 0}</h2>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : isError ? (
        <div className="text-center py-10 text-red-600">Error: {error?.message}</div>
      ) : (
        <div id="company-list-top" className="border rounded-lg overflow-hidden shadow-sm min-w-[800px]">
          <div className="flex items-center bg-muted/50 px-4 py-2 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
            <div className="w-[30%] xl:w-[25%] pr-4 flex-shrink-0">Company</div>
            <div className="w-[12%] xl:w-[10%] text-right pr-4 flex-shrink-0"># Emp.</div>
            <div className="w-[18%] xl:w-[15%] pr-4 flex-shrink-0">Industry</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Stage</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Account Owner</div>
            <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">Location</div>
            {/* <div className="w-[5%] text-right flex-shrink-0">Links</div> */} {/* REMOVED Links Header */}
            <div className="w-[5%] pl-2 text-right flex-shrink-0">Action</div>
          </div>
          <div className="divide-y">
            {paginatedCompanies.length > 0 ? (
              paginatedCompanies.map((company) => (
                <div key={company.id} className="flex items-center px-4 py-3 hover:bg-muted/30 text-sm">
                  <div className="w-[30%] xl:w-[25%] pr-4 flex items-center gap-3 min-w-0 flex-shrink-0">
                    <Avatar className="h-8 w-8 border flex-shrink-0">
                      <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                      <AvatarFallback className="text-xs">{company.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link to={`/companies/${company.id}`} className="font-medium text-primary hover:underline truncate block" title={company.name}>
                        {getDisplayValue(company.name, 'Unnamed Company')}
                      </Link>
                      {renderSocialIcons(company)}
                    </div>
                  </div>
                  <div className="w-[12%] xl:w-[10%] text-right pr-4 text-muted-foreground flex-shrink-0">
                    {getDisplayValue(company.employee_count, '-')}
                  </div>
                  <div className="w-[18%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={getDisplayValue(company.industry, '')}>
                    {getDisplayValue(company.industry, '-')}
                  </div>
                  <div className="w-[15%] xl:w-[15%] pr-4 flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 px-2 text-xs w-full justify-between truncate border ${stageColors[getDisplayValue(company.stage, 'default')] ?? stageColors['default']}`}
                          disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}
                        >
                          <span className="truncate">{getDisplayValue(company.stage, 'Select Stage')}</span>
                          <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Set Stage</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {STAGES.map(stage => (
                          <DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)} disabled={company.stage === stage}>
                            {stage}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={getDisplayValue(company.account_owner, '')}>
                    {getDisplayValue(company.account_owner, '-')}
                  </div>
                  <div className="w-[15%] xl:w-[15%] pr-4 truncate text-muted-foreground flex-shrink-0" title={getDisplayValue(company.location, '')}>
                    {getDisplayValue(company.location, '-')}
                  </div>
                  {/* <div className="w-[5%] text-right flex-shrink-0"> */} {/* REMOVED Links Column Data */}
                    {/* {renderUrlIcons(company)} */}
                  {/* </div> */}
                  <div className="w-[5%] pl-2 text-right flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleEditClick(company)}
                      title="Edit Company"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {searchTerm ? "No matching companies." : "No companies."}
              </div>
            )}
          </div>
        </div>
      )}
      {totalFilteredPages > 1 && !isLoading && (
        <EffectivePagination
          className="mt-6"
          currentPage={currentPage}
          totalCount={filteredCompanies.length}
          pageSize={itemsPerPage}
          onPageChange={handlePageChange}
          siblingCount={1}
        />
      )}
      {showBackToTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg z-50 border-border bg-background/80 backdrop-blur-sm"
          onClick={scrollToTop}
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
          <span className="sr-only">Scroll to top</span>
        </Button>
      )}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update details for {editCompany?.name ?? 'company'}.</DialogDescription>
          </DialogHeader>
          {editCompany && (
            <CompanyEditForm
              company={editCompany}
              onClose={handleCloseEditDialog} // Ensure CompanyEditForm uses onClose
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompaniesPage;