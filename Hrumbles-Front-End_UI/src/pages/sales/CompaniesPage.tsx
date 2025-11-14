import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyDetail } from "@/types/company";
import { useCompanies, useCompanyCounts } from "@/hooks/use-companies";
import {
  Edit, Building2, Users, Search, Plus, Globe, Linkedin, Link as LinkIcon,
  Upload, Loader2, Download, ChevronDown, Sparkles, PenSquare, Eye, ChevronLeft, ChevronRight, ChevronRightIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import CompanyEditForm from "@/components/sales/CompanyEditForm";
import CompanyAddForm from "@/components/sales/CompanyAddForm";
import Papa from 'papaparse';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import moment from "moment";
import { startOfMonth } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreatorPerformanceChart from "@/components/sales/chart/CreatorPerformanceChart";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import CompanyStagePieChart from "@/components/sales/chart/CompanyStagePieChart";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Spinner } from "@chakra-ui/react";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

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
  'Identified', 'Targeting', 'In Outreach', 'Warm', 'Qualified Company',
  'Proposal Sent / In Discussion', 'Negotiation', 'Closed - Won',
  'Closed - Lost', 'Re-engage Later'
];

const stageColors: Record<string, string> = {
  'Identified': 'bg-blue-100 text-blue-800', 'Targeting': 'bg-indigo-100 text-indigo-800',
  'In Outreach': 'bg-teal-100 text-teal-800', 'Warm': 'bg-yellow-100 text-yellow-800',
  'Qualified Company': 'bg-green-100 text-green-800', 'Proposal Sent / In Discussion': 'bg-purple-100 text-purple-800',
  'Negotiation': 'bg-orange-100 text-orange-800', 'Closed - Won': 'bg-emerald-100 text-emerald-800',
  'Closed - Lost': 'bg-red-100 text-red-800', 'Re-engage Later': 'bg-gray-100 text-gray-800',
  'default': 'bg-gray-100 text-gray-800'
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
    const { data: companies = [], isLoading, isError, error } = useCompanies(fileId);
    const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('all');
    const [editCompany, setEditCompany] = useState<CompanyDetail | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [companyToReview, setCompanyToReview] = useState<Partial<Company> | null>(null);
    const [isManualAddDialogOpen, setIsManualAddDialogOpen] = useState(false);
    const currentUserId = user?.id || null;

    const [chartDateRange, setChartDateRange] = useState<DateRange>({
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
    });

    const { data: breadcrumbData, isLoading: isLoadingBreadcrumb } = useQuery({
        queryKey: ['companyBreadcrumb', fileId],
        queryFn: async () => {
            if (!fileId) return null;
            const { data, error } = await supabase.from('workspace_files').select('name, workspaces(name)').eq('id', fileId).single();
            if (error) throw error;
            return data;
        },
        enabled: !!fileId,
    });

    useEffect(() => {
      if (isError && error) {
        toast({ title: "Error Loading Companies", description: error.message || "Could not fetch data.", variant: "destructive" });
      }
    }, [isError, error, toast]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCreatorId]);

    const updateStageMutation = useMutation({
        mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
            const { error: updateError } = await supabase.from('companies').update({ stage, updated_by: currentUserId }).eq('id', companyId);
            if (updateError) throw updateError;
        },
        onSuccess: () => {
          toast({ title: "Stage Updated", description: "The company stage has been successfully updated." });
          queryClient.invalidateQueries({ queryKey: ['companies', fileId || 'all'] });
        },
        onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
    });

    const handleStageChange = (companyId: number, newStage: string) => updateStageMutation.mutate({ companyId, stage: newStage });
    const handleEditClick = (company: CompanyDetail) => { setEditCompany(company); setIsEditDialogOpen(true); };
    const handleCreatorClick = (creatorId: string | null | undefined) => {
      const newCreatorId = creatorId ?? 'system';
      setSelectedCreatorId(newCreatorId);
      setCurrentPage(1);
    };

    const uniqueCreators = useMemo(() => {
        const creators = new Map<string, { id: string; name: string }>();
        creators.set('system', { id: 'system', name: 'System' });
        companies.forEach(company => {
            const creatorId = company.created_by ?? 'system';
            let name = 'System';
            if (company.created_by_employee?.first_name) {
                name = `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`.trim();
            }
            if (!creators.has(creatorId)) {
                creators.set(creatorId, { id: creatorId, name });
            }
        });
        return Array.from(creators.values());
    }, [companies]);

    const tableFilteredData = useMemo(() => {
        return companies.filter(company => {
            const searchMatch = (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const creatorMatch = selectedCreatorId === 'all' ? true :
                selectedCreatorId === 'system' ? (company.created_by === null || company.created_by === undefined) :
                company.created_by === selectedCreatorId;
            return searchMatch && creatorMatch;
        });
    }, [companies, searchTerm, selectedCreatorId]);

    const chartFilteredData = useMemo(() => {
        return companies.filter(company => {
            if (!chartDateRange?.startDate) return true;
            const createdAt = new Date(company.created_at);
            const from = chartDateRange.startDate;
            const to = chartDateRange.endDate || new Date();
            return createdAt >= from && createdAt <= to;
        });
    }, [companies, chartDateRange]);

    const creatorStatsForChart = useMemo(() => {
        const stats: { [key: string]: number } = {};
        chartFilteredData.forEach(company => {
            const creatorName = company.created_by_employee 
                ? `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`.trim() 
                : 'System';
            stats[creatorName] = (stats[creatorName] || 0) + 1;
        });
        return Object.entries(stats).map(([name, count]) => ({ name, companies_created: count })).sort((a, b) => b.companies_created - a.companies_created);
    }, [chartFilteredData]);

    const stageStatsForChart = useMemo(() => {
        const stats: { [key: string]: number } = {};
        chartFilteredData.forEach(company => {
            const stage = company.stage || 'N/A';
            stats[stage] = (stats[stage] || 0) + 1;
        });
        return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [chartFilteredData]);

    const totalPages = Math.ceil(tableFilteredData.length / itemsPerPage);
    const paginatedCompanies = tableFilteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); };

    const downloadCsvTemplate = () => {
        const sampleRow = `"Acme Corp","https://acme.com","acme.com","Customer","Leading innovator in widget manufacturing.","1990-01-15","Previously Acme Widgets","500","2023-10-01","123 Innovation Drive, Techville, CA","https://linkedin.com/company/acme","Technology","Active Opportunity","Techville, USA","Jane Doe","50M","10M","Globex Corp,Stark Industries","Widget Pro,Widget Ultra","Consulting,Support","[{""name"":""John Smith"",""title"":""CEO""},{""name"":""Alice Brown"",""title"":""CTO""}]"`;
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

    const handleCompanyDataFetched = (fetchedData: Partial<Company>) => {
        setCompanyToReview(fetchedData);
        setIsAddDialogOpen(false);
        setIsReviewDialogOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) { toast({ title: "No file selected" }); return; }
        if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
            toast({ title: "Invalid File Type", description: "Please upload a CSV file.", variant: "destructive" });
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        setIsImporting(true);
        toast({ title: "Import Started", description: "Parsing CSV file..." });
        Papa.parse<Record<string, any>>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast({ title: "CSV Parsing Issue", description: "Some rows could not be parsed.", variant: "destructive" });
                }
                processCsvData(results.data as Record<string, any>[]);
                if (fileInputRef.current) fileInputRef.current.value = "";
            },
            error: (err: any) => {
                toast({ title: "CSV Parsing Failed", description: err.message, variant: "destructive" });
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
                name: rawRow["company_name"] || rawRow["name"], website: rawRow["website"] || rawRow["url"], industry: rawRow["industry"], stage: rawRow["stage"],
                location: rawRow["location"] || rawRow["city_country"] || rawRow["country"], employee_count: rawRow["employees"] || rawRow["employee_count"] || rawRow["no_employees"] || rawRow["_employees"],
                linkedin: rawRow["linkedin"] || rawRow["linkedin_url"], account_owner: rawRow["account_owner"] || rawRow["owner"], address: rawRow["address"] || rawRow["hq_address"],
                revenue: rawRow["revenue"] || rawRow["annual_revenue"], cashflow: rawRow["cashflow"] || rawRow["cash_flow"], domain: rawRow["domain"], status: rawRow["status"] || rawRow["company_status"],
                about: rawRow["about"] || rawRow["description"], start_date: rawRow["founded_date"] || rawRow["start_date"], founded_as: rawRow["founded_as"] || rawRow["original_name"],
                employee_count_date: rawRow["employee_count_date"] || rawRow["employees_as_of_date"], competitors_string: rawRow["competitors"] || rawRow["competitors_comma_separated"],
                products_string: rawRow["products"] || rawRow["products_comma_separated"], services_string: rawRow["services"] || rawRow["services_comma_separated"], key_people_string: rawRow["key_people"] || rawRow["key_people_json"],
            };
            const validationResult = companyCsvSchema.safeParse(mappedRow);
            if (validationResult.success) {
                if (validationResult.data.name?.trim()) { validCompanies.push(validationResult.data); }
                else { validationErrors.push({ row: index + 2, errors: ["Company Name is required."] }); }
            } else {
                validationErrors.push({ row: index + 2, errors: validationResult.error.errors.map(e => `${e.path.join('.') || 'Row'}: ${e.message}`) });
            }
        });

        if (validationErrors.length > 0) {
            const errorSummary = validationErrors.slice(0, 3).map(e => `R${e.row}: ${e.errors[0]}`).join('; ');
            toast({ title: `Validation Failed for ${validationErrors.length} rows`, description: `Errors: ${errorSummary}${validationErrors.length > 3 ? '...' : ''}`, variant: "destructive", duration: 10000 });
            if (validCompanies.length === 0) { setIsImporting(false); return; }
        }

        if (validCompanies.length > 0) {
            toast({ title: "Importing Data", description: `Processing ${validCompanies.length} valid rows...` });
            try {
                const companiesToUpsert = validCompanies.map(vc => ({ ...vc, organization_id: organizationId, created_by: currentUserId, updated_by: currentUserId, file_id: fileId || null }));
                const { error: upsertError, count } = await supabase.from('companies').upsert(companiesToUpsert as any, { onConflict: 'name', ignoreDuplicates: true });
                if (upsertError) throw upsertError;
                const insertedCount = count ?? 0;
                const skippedCount = validCompanies.length - insertedCount;
                toast({ title: "Import Complete", description: `${insertedCount} companies processed. ${skippedCount > 0 ? `${skippedCount} duplicates skipped.` : ''}` });
                queryClient.invalidateQueries({ queryKey: ['companies'] });
                queryClient.invalidateQueries({ queryKey: ['company-counts'] });
            } catch (err: any) {
                toast({ title: "Import Failed", description: err.message || "A database error occurred.", variant: "destructive" });
            } finally {
                setIsImporting(false);
            }
        } else {
            if (validationErrors.length === 0) toast({ title: "Import Info", description: "No new data to import." });
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in p-4 md:p-6">
            {fileId && (
                <Breadcrumb spacing="8px" separator={<ChevronRightIcon className="h-4 w-4" />} className="mb-2">
                    <BreadcrumbItem><BreadcrumbLink as={RouterLink} to="/lists">Lists</BreadcrumbLink></BreadcrumbItem>
                    {isLoadingBreadcrumb ? <Spinner size="xs" /> : breadcrumbData && (
                        <>
                            <BreadcrumbItem><BreadcrumbLink as={RouterLink} to="/lists">{breadcrumbData.workspaces?.name || 'Folder'}</BreadcrumbLink></BreadcrumbItem>
                            <BreadcrumbItem isCurrentPage><BreadcrumbLink href="#">{breadcrumbData.name}</BreadcrumbLink></BreadcrumbItem>
                        </>
                    )}
                </Breadcrumb>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{fileId ? (breadcrumbData?.name || 'Loading List...') : 'Company Dashboard'}</h1>
                    <p className="text-gray-500">Manage and track all company records</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Company</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsAddDialogOpen(true)}><Sparkles className="mr-2 h-4 w-4" />Fetch with AI</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsManualAddDialogOpen(true)}><PenSquare className="mr-2 h-4 w-4" />Enter Manually</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" onClick={downloadCsvTemplate}><Download className="h-4 w-4 mr-2" />Template</Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                        {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, text/csv" style={{ display: 'none' }} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-4 flex justify-between items-start"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">Total Companies</p><h3 className="text-3xl font-bold">{isCountsLoading ? '...' : counts?.companies ?? 0}</h3></div><div className="p-2 bg-blue-100 rounded-lg"><Building2 className="text-blue-600" size={22} /></div></Card>
                <Card className="p-4 flex justify-between items-start"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">Total Employees</p><h3 className="text-3xl font-bold">{isCountsLoading ? '...' : counts?.employees?.toLocaleString() ?? 0}</h3></div><div className="p-2 bg-purple-100 rounded-lg"><Users className="text-purple-600" size={22} /></div></Card>
            </div>
            
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Performance Dashboard</h2>
                    <EnhancedDateRangeSelector value={chartDateRange} onChange={setChartDateRange} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CreatorPerformanceChart data={creatorStatsForChart} />
                    <CompanyStagePieChart data={stageStatsForChart} />
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Search */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input 
      placeholder="Search companies by name..." 
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm" 
      value={searchTerm} 
      onChange={(e) => setSearchTerm(e.target.value)} 
    />
  </div>

  {/* Creator Filter */}
  <div className="flex-shrink-0 order-2 w-full md:w-[220px]">
    <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <SelectValue placeholder="Filter by Creator" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Creators</SelectItem>
        {uniqueCreators.map(creator => (
          <SelectItem key={creator.id} value={creator.id}>
            {creator.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
<thead className="bg-purple-600">
    <tr>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Company</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Industry</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Headquarters</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Size</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Stage</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Created By</th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider opacity-90">Last Updated</th>
        <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider opacity-90">Actions</th>
    </tr>
</thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={8} className="text-center p-12 text-gray-500">Loading companies...</td></tr>
                            ) : paginatedCompanies.length === 0 ? (
                                <tr><td colSpan={8} className="text-center p-12 text-gray-500">No companies found.</td></tr>
                            ) : (
                                paginatedCompanies.map((company) => (
                                    <tr key={company.id} className="transition-all duration-200 ease-in-out hover:shadow-md hover:-translate-y-px hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Avatar className="h-9 w-9 flex-shrink-0"><AvatarImage src={company.logo_url || undefined} /><AvatarFallback>{company.name?.charAt(0)}</AvatarFallback></Avatar>
                                                <div className="ml-4">
                                                    <RouterLink to={`/companies/${company.id}`} className="text-sm font-medium text-gray-900 hover:text-primary hover:underline">{company.name}</RouterLink>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                                                        {company.website && <a href={!company.website.startsWith('http') ? `https://${company.website}` : company.website} target="_blank" rel="noreferrer" title="Website"><Globe className="h-3.5 w-3.5 text-gray-400 hover:text-primary" /></a>}
                                                        {company.linkedin && <a href={!company.linkedin.startsWith('http') ? `https://${company.linkedin}` : company.linkedin} target="_blank" rel="noreferrer" title="LinkedIn"><Linkedin className="h-3.5 w-3.5 text-gray-400 hover:text-primary" /></a>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDisplayValue(company.industry)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDisplayValue(company.location)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{getDisplayValue(company.employee_count?.toLocaleString())}</div>
                                            {company.employee_count_date && (<div className="text-xs text-gray-400">as of {moment(company.employee_count_date).format("MMM yyyy")}</div>)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                     <Button variant="outline" size="sm" className={`h-7 px-2 text-xs w-full max-w-[150px] justify-between truncate border-0 font-semibold ${stageColors[getDisplayValue(company.stage, 'default')] ?? stageColors['default']}`} disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}>
                                                        <span className="truncate">{getDisplayValue(company.stage, 'Select Stage')}</span><ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">{STAGES.map((stage) => (<DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)} className="text-sm">{stage}</DropdownMenuItem>))}</DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div onClick={() => handleCreatorClick(company.created_by)} className="cursor-pointer">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">
                                                                        {company.created_by_employee
                                                                            ? `${company.created_by_employee.first_name?.[0] || ''}${company.created_by_employee.last_name?.[0] || ''}`
                                                                            : 'S'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{company.created_by_employee ? `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}` : 'System'}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <div className="ml-3">
                                                    <div className="font-medium text-gray-800">
                                                        {company.created_by_employee ? company.created_by_employee.first_name : 'System'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{moment(company.created_at).format("DD MMM YYYY")}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {company.updated_by_employee ? (
                                                <div className="flex items-center">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div onClick={() => handleCreatorClick(company.updated_by)} className="cursor-pointer">
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-teal-500 text-white font-semibold">
                                                                            {`${company.updated_by_employee.first_name?.[0] || ''}${company.updated_by_employee.last_name?.[0] || ''}`}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{`${company.updated_by_employee.first_name} ${company.updated_by_employee.last_name}`}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <div className="ml-3">
                                                        <div className="font-medium text-gray-800">
                                                            {company.updated_by_employee.first_name}
                                                        </div>
                                                        <div className="text-xs text-gray-400">{moment(company.updated_at).fromNow()}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-gray-200 text-gray-600">N/A</AvatarFallback></Avatar>
                                                    <div className="ml-3">
                                                        <div className="font-medium text-gray-800">N/A</div>
                                                        <div className="text-xs text-gray-400">{moment(company.updated_at).fromNow()}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center">
                                                <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200">
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><RouterLink to={`/companies/${company.id}`}><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors"><Eye className="h-4 w-4" /></Button></RouterLink></TooltipTrigger><TooltipContent><p>View Company</p></TooltipContent></Tooltip></TooltipProvider>
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEditClick(company as CompanyDetail)} className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors"><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Company</p></TooltipContent></Tooltip></TooltipProvider>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {tableFilteredData.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Rows per page</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                            <SelectTrigger className="w-[75px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, tableFilteredData.length)} of {tableFilteredData.length} companies
                    </span>
                </div>
            )}

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Fetch Company Data</DialogTitle><DialogDescription>Enter a company name to fetch details using AI.</DialogDescription></DialogHeader><CompanyAddForm onAdd={handleCompanyDataFetched} onCancel={() => setIsAddDialogOpen(false)} /></DialogContent>
            </Dialog>
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Review and Create Company</DialogTitle><DialogDescription>Review the AI-fetched data then save.</DialogDescription></DialogHeader>{companyToReview && <CompanyEditForm company={companyToReview} onClose={() => setIsReviewDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} />}</DialogContent>
            </Dialog>
            <Dialog open={isManualAddDialogOpen} onOpenChange={setIsManualAddDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Company Manually</DialogTitle><DialogDescription>Fill out the form and click "Create Company" to save.</DialogDescription></DialogHeader><CompanyEditForm company={{}} onClose={() => setIsManualAddDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} /></DialogContent>
            </Dialog>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Company</DialogTitle><DialogDescription>Update details for {editCompany?.name}.</DialogDescription></DialogHeader>{editCompany && <CompanyEditForm company={editCompany} onClose={() => setIsEditDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} fileId={fileId} />}</DialogContent>
            </Dialog>
        </div>
    );
};

export default CompaniesPage;