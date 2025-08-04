import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { useCompanies, useCompanyCounts } from "@/hooks/use-companies";
import {
  Edit, Building2, Users, Search, Plus, ArrowUp, Globe, Linkedin, Link as LinkIcon,
  Upload, Loader2, Download, ChevronDown, Sparkles, PenSquare
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
import { useSelector } from 'react-redux';
import moment from "moment";
import { useMemo } from 'react';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreatorPerformanceChart from "@/components/sales/chart/CreatorPerformanceChart";
import { DateRangePickerField } from "@/components/sales/chart/dateRangePickerField"; 
import CompanyStagePieChart from "@/components/sales/chart/CompanyStagePieChart";
import { startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronRightIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Spinner } from "@chakra-ui/react";


// ... (keep all your existing schemas and constants)
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
  stage: data.stage?.trim() || 'New',
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

const STAGES = [
  'Identified',
  'Targeting',
  'In Outreach',
  'Warm',
  'Qualified Company',
  'Proposal Sent / In Discussion',
  'Negotiation',
  'Closed - Won',
  'Closed - Lost',
  'Re-engage Later'
];

const stageColors: Record<string, string> = {
  'Identified': 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
  'Targeting': 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
  'In Outreach': 'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
  'Warm': 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
  'Qualified Company': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  'Proposal Sent / In Discussion': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
  'Negotiation': 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200',
  'Closed - Won': 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
  'Closed - Lost': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  'Re-engage Later': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
  'default': 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
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
    const { fileId } = useParams<{ fileId?: string }>();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const user = useSelector((state: any) => state.auth.user);
    const organizationId = useSelector((state: any) => state.auth.organization_id);
    const { data: companies = [], isLoading, isError, error } = useCompanies(fileId); // Pass fileId to hook
    const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

    // ... (keep the rest of your state declarations)
      const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
 const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
const [editCompany, setEditCompany] = useState<CompanyDetail | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
    // --- ADD THESE LINES ---
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [companyToReview, setCompanyToReview] = useState<Partial<Company> | null>(null);
   const [isManualAddDialogOpen, setIsManualAddDialogOpen] = useState(false);
   const currentUserId = user?.id || null;

const [chartDateRange, setChartDateRange] = useState<DateRange | undefined>({
  from: startOfMonth(new Date()),
  to: new Date(),
  key: 'selection', // Add key to match DateRangePickerField
});
    // -- RENAME your old dateRange state to avoid confusion --
  const [tableDateRange, setTableDateRange] = useState<DateRange | undefined>(undefined);

    // ... (keep the rest of your functions and logic)
    // No major changes are needed in the functions themselves, as the filtering
    // is now handled by the `useCompanies` hook.

     const { data: breadcrumbData, isLoading: isLoadingBreadcrumb } = useQuery({
        queryKey: ['companyBreadcrumb', fileId],
        queryFn: async () => {
            if (!fileId) return null;
            const { data, error } = await supabase
                .from('workspace_files')
                .select('name, workspaces(name)')
                .eq('id', fileId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!fileId,
    });

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
      const { error: updateError } = await supabase.from('companies').update({ stage, updated_by: currentUserId }).eq('id', companyId);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies', fileId || 'all'] }),
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleStageChange = (companyId: number, newStage: string) => updateStageMutation.mutate({ companyId, stage: newStage });
  const handleEditClick = (company: CompanyDetail) => { setEditCompany(company); setIsEditDialogOpen(true); };

  const handleCloseEditDialog = () => setIsEditDialogOpen(false);
  const handleAddClick = () => setIsAddDialogOpen(true);
  const handleCloseAddDialog = () => setIsAddDialogOpen(false);

    // Inside CompaniesPage component

// Debug handleCreatorClick
const handleCreatorClick = (creatorId: string | null | undefined) => {
  console.log('handleCreatorClick: creatorId clicked:', creatorId);
  const newCreatorId = creatorId ?? 'system'; // Map null/undefined to 'system'
  setSelectedCreatorId(newCreatorId);
  setCurrentPage(1); // Reset to the first page
  console.log('handleCreatorClick: selectedCreatorId set to:', newCreatorId);
};

// Debug uniqueCreators
const uniqueCreators = useMemo(() => {
  const creators = new Map<string, { id: string; name: string }>();
  creators.set('system', { id: 'system', name: 'System' });

  console.log('uniqueCreators: companies being processed:', companies.length);
  companies.forEach(company => {
    console.log('uniqueCreators: company.created_by:', company.created_by, 'employee:', company.created_by_employee);
    const creatorId = company.created_by ?? 'system'; // Map undefined to 'system'
    let name = 'System';
    if (company.created_by_employee?.first_name) {
      name = `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`.trim();
    }
    if (!creators.has(creatorId)) {
      creators.set(creatorId, { id: creatorId, name });
      console.log('uniqueCreators: added creator:', { id: creatorId, name });
    }
  });

  const creatorArray = Array.from(creators.values());
  console.log('uniqueCreators: final creators array:', creatorArray);
  return creatorArray;
}, [companies]);

// Debug tableFilteredData
const tableFilteredData = useMemo(() => {
  console.log('tableFilteredData: selectedCreatorId:', selectedCreatorId);
  console.log('tableFilteredData: searchTerm:', searchTerm);
  console.log('tableFilteredData: total companies before filter:', companies.length);

  const filtered = companies.filter(company => {
    const searchMatch = (
      (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    let creatorMatch = false;
    console.log('tableFilteredData: company.created_by:', company.created_by, 'comparing with selectedCreatorId:', selectedCreatorId);
    if (selectedCreatorId === 'all') {
      creatorMatch = true;
      console.log('tableFilteredData: creatorMatch true (all selected)');
    } else if (selectedCreatorId === 'system') {
      creatorMatch = company.created_by === null || company.created_by === undefined;
      console.log('tableFilteredData: system check, creatorMatch:', creatorMatch, 'company.created_by:', company.created_by);
    } else {
      creatorMatch = company.created_by === selectedCreatorId;
      console.log('tableFilteredData: specific creator check, creatorMatch:', creatorMatch, 'company.created_by:', company.created_by);
    }

    const result = searchMatch && creatorMatch;
    console.log('tableFilteredData: company:', company.name, 'searchMatch:', searchMatch, 'creatorMatch:', creatorMatch, 'included:', result);
    return result;
  });

  console.log('tableFilteredData: filtered companies count:', filtered.length);
  return filtered;
}, [companies, searchTerm, selectedCreatorId]);


  


   // --- 1. DATA FOR THE CHART (only uses date filter) ---
const chartFilteredData = useMemo(() => {
  console.log('chartFilteredData: computing with chartDateRange:', chartDateRange);
  const filtered = companies.filter(company => {
    if (!chartDateRange?.from) {
      console.log('chartFilteredData: no from date, including all companies');
      return true; // Show all if no date is set
    }
    const createdAt = new Date(company.created_at);
    const from = chartDateRange.from;
    const to = chartDateRange.to || new Date(); // Use today if 'to' is not set
    const inRange = createdAt >= from && createdAt <= to;
    console.log(
      'chartFilteredData: company:',
      company.name,
      'created_at:',
      company.created_at,
      'inRange:',
      inRange
    );
    return inRange;
  });
  console.log('chartFilteredData: filtered companies count:', filtered.length);
  return filtered;
}, [companies, chartDateRange]);

  const creatorStatsForChart = useMemo(() => {
    const stats: { [key: string]: number } = {};
    chartFilteredData.forEach(company => {
      if (company.created_by_employee) {
        const name = `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`;
        stats[name] = (stats[name] || 0) + 1;
      }
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, companies_created: count }))
      .sort((a, b) => b.companies_created - a.companies_created);
  }, [chartFilteredData]);

    // --- 2. Add `stageStatsForChart` logic ---
  const stageStatsForChart = useMemo(() => {
    const stats: { [key: string]: number } = {};
    chartFilteredData.forEach(company => {
      const stage = company.stage || 'N/A';
      stats[stage] = (stats[stage] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [chartFilteredData]);

 


  // --- 2. DATA FOR THE TABLE (uses search and creator filter) ---


  // --- UPDATE PAGINATION TO USE THE NEW TABLE-SPECIFIC DATA ---
   const totalPages = Math.ceil(tableFilteredData.length / itemsPerPage);
  const paginatedCompanies = tableFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



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

  // --- ADD THIS ENTIRE FUNCTION ---
  const handleCompanyDataFetched = (fetchedData: Partial<Company>) => {
    setCompanyToReview(fetchedData); // Store the fetched data
    setIsAddDialogOpen(false);      // Close the initial "fetch" dialog
    setIsReviewDialogOpen(true);    // Open the new "review and save" dialog
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

        const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when items per page changes
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
            key_people: keyPeople,
            organization_id: organizationId,
            created_by: currentUserId,
            updated_by: currentUserId, 
            file_id: fileId || null, // Assign fileId if present
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


    return (
        <div className="container mx-auto px-4 py-6 max-w-full">
            {/* ✅ BREADCRUMB RENDER */}
            {fileId && (
                <Breadcrumb spacing="8px" separator={<ChevronRightIcon className="h-4 w-4" />} className="mb-4">
                    <BreadcrumbItem>
                        <BreadcrumbLink as={RouterLink} to="/lists">Lists</BreadcrumbLink>
                    </BreadcrumbItem>
                    {isLoadingBreadcrumb ? <Spinner size="xs" /> : breadcrumbData && (
                        <>
                            <BreadcrumbItem>
                                <BreadcrumbLink as={RouterLink} to="/lists">{breadcrumbData.workspaces?.name || 'Folder'}</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbItem isCurrentPage>
                                <BreadcrumbLink href="#">{breadcrumbData.name}</BreadcrumbLink>
                            </BreadcrumbItem>
                        </>
                    )}
                </Breadcrumb>
            )}

         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                {/* ✅ DYNAMIC PAGE TITLE */}
                <h1 className="text-2xl font-bold">
                    {fileId ? (breadcrumbData?.name || 'Loading List...') : 'All Companies'}
                </h1>
                <div className="flex gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button className="h-9"><Plus className="h-4 w-4 mr-2" />Add Company<ChevronDown className="h-4 w-4 ml-2" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setIsAddDialogOpen(true)}><Sparkles className="mr-2 h-4 w-4" /><span>Fetch with AI</span></DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setIsManualAddDialogOpen(true)}><PenSquare className="mr-2 h-4 w-4" /><span>Enter Manually</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" className="h-9" onClick={downloadCsvTemplate}>
                    <Download className="h-4 w-4 mr-2" />Template
                  </Button>
                  <Button variant="outline" className="h-9" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                    {isImporting ? (<Loader2 className="h-4 w-4 mr-2 animate-spin" />) : (<Upload className="h-4 w-4 mr-2" />)}
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={() => {}} accept=".csv, text/csv" style={{ display: 'none' }} />
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

    {/* --- DASHBOARD & DATE PICKER SECTION --- */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Performance Dashboard</h2>
         <DateRangePickerField dateRange={chartDateRange} onDateRangeChange={setChartDateRange} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreatorPerformanceChart data={creatorStatsForChart} />
          <CompanyStagePieChart data={stageStatsForChart} />
        </div>
      </div>

      {/* --- TABLE FILTER & SEARCH SECTION --- */}
      <div className="p-4 border rounded-lg bg-muted/5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
            </div>
           <Select
  value={selectedCreatorId ?? 'all'} // Fallback to 'all' if undefined
  onValueChange={(value) => {
    console.log('Select onValueChange: new value:', value);
    setSelectedCreatorId(value);
  }}
>
  <SelectTrigger className="w-full sm:w-[220px]">
    <SelectValue placeholder="Filter by Creator" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Creators</SelectItem>
    {uniqueCreators.map(creator => (
      <SelectItem key={creator.id} value={creator.id}>{creator.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
        </div>
      </div>

 {/* NEW TABLE STRUCTURE */}
<div className="border rounded-lg overflow-x-auto shadow-sm">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Company</th>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Industry</th>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Headquarters</th>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Company Size</th>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Stage</th>
        <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Created By</th>
        <th scope="col" className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
        <th className="px-4 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {isLoading && (
        <tr>
          <td colSpan={7} className="text-center p-3 text-[11px] text-gray-500">
            Loading...
          </td>
        </tr>
      )}
      {!isLoading &&
        paginatedCompanies.map((company) => (
          <tr key={company.id} className="hover:bg-gray-50">
            <td className="px-4 py-2 whitespace-nowrap">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={company.logo_url || undefined} />
                  <AvatarFallback className="text-[10px]">{company.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="text-[11px] font-medium text-gray-900 hover:text-primary">
                    <RouterLink to={`/companies/${company.id}`}>{company.name}</RouterLink>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Website"
                      >
                        <LinkIcon className="h-3 w-3 text-gray-400 hover:text-primary" />
                      </a>
                    )}
                    {company.linkedin && (
                      <a
                        href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        title="LinkedIn"
                      >
                        <Linkedin className="h-3 w-3 text-gray-400 hover:text-primary" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">{getDisplayValue(company.industry)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">{getDisplayValue(company.location)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">
              <div>{getDisplayValue(company.employee_count?.toLocaleString())}</div>
              {company.employee_count_date && (
                <div className="text-[10px] text-gray-400">as of {format(new Date(company.employee_count_date), "MMM yyyy")}</div>
              )}
            </td>
            <td className="px-4 py-2 whitespace-nowrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-6 px-2 text-[10px] w-full max-w-[140px] justify-between truncate border ${
                      stageColors[getDisplayValue(company.stage, 'default')] ?? stageColors['default']
                    }`}
                    disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}
                  >
                    <span className="truncate">{getDisplayValue(company.stage, 'Select Stage')}</span>
                    <ChevronDown className="h-2.5 w-2.5 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onSelect={() => handleStageChange(company.id, stage)}
                      className="text-[11px]"
                    >
                      {stage}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
            <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">
              <button
                onClick={() => handleCreatorClick(company.created_by)}
                className="text-left hover:text-primary hover:underline focus:outline-none"
              >
                {company.created_by_employee
                  ? `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`
                  : 'System'}
              </button>
              <div className="text-[10px]">{moment(company.created_at).format("DD MMM YYYY")}</div>
            </td>
            <td className="px-4 py-2 whitespace-nowrap text-[11px] text-gray-500">
              {company.updated_by_employee ? (
                <button
                  onClick={() => handleCreatorClick(company.updated_by)}
                  className="text-left hover:text-primary hover:underline focus:outline-none"
                  title={`Filter by ${company.updated_by_employee.first_name}`}
                >
                  {`${company.updated_by_employee.first_name} ${company.updated_by_employee.last_name}`}
                </button>
              ) : (
                <span>N/A</span>
              )}
              <div className="text-[10px]">{moment(company.updated_at).fromNow()}</div>
            </td>
            <td className="px-4 py-2 whitespace-nowrap text-right text-[11px] font-medium">
              <Button variant="ghost" size="icon" onClick={() => handleEditClick(company as CompanyDetail)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>

   <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 p-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
  
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
  
       <span className="text-sm text-muted-foreground">
          Showing {tableFilteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} 
          to {Math.min(currentPage * itemsPerPage, tableFilteredData.length)} of {tableFilteredData.length} companies
        </span>
      </div>
      {/* DIALOGS */}
      {/* ✅ FIX: ADDED THE DIALOG FOR THE INITIAL FETCH STEP */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Fetch Company Data</DialogTitle><DialogDescription>Enter a company name to fetch details using AI.</DialogDescription></DialogHeader>
          <CompanyAddForm onAdd={handleCompanyDataFetched} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review and Create Company</DialogTitle><DialogDescription>Review the AI-fetched data then save.</DialogDescription></DialogHeader>
          {companyToReview && <CompanyEditForm company={companyToReview} onClose={() => setIsReviewDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} />}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isManualAddDialogOpen} onOpenChange={setIsManualAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Company Manually</DialogTitle><DialogDescription>Fill out the form and click "Create Company" to save.</DialogDescription></DialogHeader>
          <CompanyEditForm company={{}} onClose={() => setIsManualAddDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Company</DialogTitle><DialogDescription>Update details for {editCompany?.name}.</DialogDescription></DialogHeader>
          {editCompany && <CompanyEditForm company={editCompany} onClose={() => setIsEditDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} />}
        </DialogContent>
      </Dialog>
        </div>
    );
};

export default CompaniesPage;