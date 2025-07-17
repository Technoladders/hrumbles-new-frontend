import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useMemo } from 'react'; // ADD THIS
import { Calendar as CalendarIcon, Filter, X } from "lucide-react"; // ADD/UPDATE THIS
import { DateRange } from "react-day-picker"; // ADD THIS
import { format } from "date-fns"; // ADD THIS
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // ADD THIS
import { Calendar } from "@/components/ui/calendar"; // ADD THIS
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // ADD THIS
import { cn } from "@/lib/utils"; // ADD THIS (if not already present)
import CompanyCreatorChart from "@/components/sales/CompanyCreatorChart"; // ADD THIS
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { data: companies = [], isLoading, isError, error } = useCompanies();
  const { data: counts, isLoading: isCountsLoading } = useCompanyCounts();

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleStageChange = (companyId: number, newStage: string) => updateStageMutation.mutate({ companyId, stage: newStage });
  const handleEditClick = (company: CompanyDetail) => { setEditCompany(company); setIsEditDialogOpen(true); };

  const handleCloseEditDialog = () => setIsEditDialogOpen(false);
  const handleAddClick = () => setIsAddDialogOpen(true);
  const handleCloseAddDialog = () => setIsAddDialogOpen(false);

    const handleCreatorClick = (creatorId: string | null) => {
    if (creatorId) {
      setSelectedCreatorId(creatorId);
      setCurrentPage(1); // Reset to the first page to show results
    }
  };

  const uniqueCreators = useMemo(() => {
    const creators = new Map<string, { id: string; name: string }>();
    companies.forEach(company => {
      if ( company.created_by_employee) {
        const name = `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`;
        creators.set(company.created_by, { id: company.created_by, name });
      }
    });
    return Array.from(creators.values());
  }, [companies]);

  console.log("Unique creators", companies);

  // Memoize the stats for the chart
  const creatorStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    companies.forEach(company => {
      if (company.created_by_employee) {
        const name = `${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`;
        stats[name] = (stats[name] || 0) + 1;
      } else {
        stats['System'] = (stats['System'] || 0) + 1;
      }
    });
    return Object.entries(stats).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  }, [companies]);

const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // Search Term Filter
      const searchMatch = (
        (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (company.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
      
      // Creator Filter
      const creatorMatch = selectedCreatorId === 'all' || company.created_by === selectedCreatorId;

      // Date Range Filter
      const dateMatch = !dateRange?.from || (
        new Date(company.created_at) >= dateRange.from &&
        (!dateRange.to || new Date(company.created_at) <= dateRange.to)
      );

      return searchMatch && creatorMatch && dateMatch;
    });
  }, [companies, searchTerm, selectedCreatorId, dateRange]);

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalFilteredPages) {
      setCurrentPage(page);
      document.getElementById('company-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


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
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-2 flex-wrap">
          {/* --- ✅ BUTTON AND DIALOG UNCOMMENTED --- */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button className="h-9"><Plus className="h-4 w-4 mr-2" />Add Company<ChevronDown className="h-4 w-4 ml-2" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsAddDialogOpen(true)}><Sparkles className="mr-2 h-4 w-4" /><span>Fetch with AI</span></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsManualAddDialogOpen(true)}><PenSquare className="mr-2 h-4 w-4" /><span>Enter Manually</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* --- ✅ END OF CHANGE --- */}

          
   
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
          <Input placeholder="Search companies, industries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {/* --- ADD THIS NEW FILTER BAR --- */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/50">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Filters:</h3>

        <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators</SelectItem>
            {uniqueCreators.map(creator => (
              <SelectItem key={creator.id} value={creator.id}>{creator.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        {(selectedCreatorId !== 'all' || dateRange) && (
          <Button variant="ghost" size="icon" onClick={() => { setSelectedCreatorId('all'); setDateRange(undefined); }}>
            <X className="h-4 w-4" />
            <span className="sr-only">Clear filters</span>
          </Button>
        )} */}
      </div>

      {/* --- ADD THE NEW CHART CARD --- */}
      {/* <div className="mb-6">
        <CompanyCreatorChart data={creatorStats} />
      </div> */}

 {/* NEW TABLE STRUCTURE */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>}
            {isError && <tr><td colSpan={5} className="text-center p-4 text-red-500">Error loading data.</td></tr>}
            {!isLoading && paginatedCompanies.length === 0 && (
              <tr><td colSpan={5} className="text-center p-4 text-gray-500">No companies found.</td></tr>
            )}
            {paginatedCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <Avatar><AvatarImage src={company.logo_url || undefined} /><AvatarFallback>{company.name?.charAt(0)}</AvatarFallback></Avatar>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 hover:text-primary"><Link to={`/companies/${company.id}`}>{company.name}</Link></div>
                      <div className="text-xs text-gray-500">{getDisplayValue(company.industry, 'No Industry')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`h-7 px-2 text-xs w-full max-w-[150px] justify-between truncate border ${stageColors[getDisplayValue(company.stage, 'default')] ?? stageColors['default']}`} disabled={updateStageMutation.isPending && updateStageMutation.variables?.companyId === company.id}>
                        <span className="truncate">{getDisplayValue(company.stage, 'Select Stage')}</span><ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {STAGES.map(stage => <DropdownMenuItem key={stage} onSelect={() => handleStageChange(company.id, stage)}>{stage}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {company.created_by_employee ? (
                    <button
                      onClick={() => handleCreatorClick(company.created_by)}
                      className="text-left hover:text-primary hover:underline focus:outline-none"
                      title={`Filter by ${company.created_by_employee.first_name}`}
                    >
                      {`${company.created_by_employee.first_name} ${company.created_by_employee.last_name}`}
                    </button>
                  ) : (
                    <span>System</span>
                  )}
                  <div className="text-xs">{moment(company.created_at).format("DD MMM YYYY")}</div>
                </td>

                {/* === MODIFIED "Last Updated" CELL === */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                  <div className="text-xs">{moment(company.updated_at).fromNow()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(company as CompanyDetail)}><Edit className="h-4 w-4" /></Button>
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
          Showing {filteredCompanies.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} 
          to {Math.min(currentPage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} companies
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
          {companyToReview && <CompanyEditForm company={companyToReview} onClose={() => setIsReviewDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} />}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isManualAddDialogOpen} onOpenChange={setIsManualAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Company Manually</DialogTitle><DialogDescription>Fill out the form and click "Create Company" to save.</DialogDescription></DialogHeader>
          <CompanyEditForm company={{}} onClose={() => setIsManualAddDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Company</DialogTitle><DialogDescription>Update details for {editCompany?.name}.</DialogDescription></DialogHeader>
          {editCompany && <CompanyEditForm company={editCompany} onClose={() => setIsEditDialogOpen(false)} currentUserId={currentUserId} organizationId={organizationId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompaniesPage;
// 