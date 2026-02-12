// src/components/sales/company-search/CompanySearchFilterSidebar.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Building2, MapPin, Users, Factory, DollarSign, Search,
  Loader2, X, FilterX, Sparkles, TrendingUp,
  Code, Calendar, ListFilter, Check, ChevronsUpDown, Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { type ApolloCompanySearchFilters } from '@/services/sales/apolloCompanySearch';

interface CompanySearchFilterSidebarProps {
  onSearch: (filters: ApolloCompanySearchFilters) => void;
  isSearching?: boolean;
  totalResults?: number;
  onClose?: () => void;
}

// Predefined Options
const EMPLOYEE_COUNT_RANGES = [
  { id: '1,10', label: '1 - 10', min: 1, max: 10 },
  { id: '11,50', label: '11 - 50', min: 11, max: 50 },
  { id: '51,200', label: '51 - 200', min: 51, max: 200 },
  { id: '201,500', label: '201 - 500', min: 201, max: 500 },
  { id: '501,1000', label: '501 - 1,000', min: 501, max: 1000 },
  { id: '1001,5000', label: '1,001 - 5,000', min: 1001, max: 5000 },
  { id: '5001,10000', label: '5,001 - 10,000', min: 5001, max: 10000 },
  { id: '10001,', label: '10,000+', min: 10001, max: undefined },
];

const REVENUE_RANGES = [
  { id: '0,1000000', label: '< $1M' },
  { id: '1000000,10000000', label: '$1M - $10M' },
  { id: '10000000,50000000', label: '$10M - $50M' },
  { id: '50000000,100000000', label: '$50M - $100M' },
  { id: '100000000,500000000', label: '$100M - $500M' },
  { id: '500000000,1000000000', label: '$500M - $1B' },
  { id: '1000000000,', label: '$1B+' },
];

const INDUSTRIES = [
  'Information Technology & Services',
  'Computer Software',
  'Financial Services',
  'Hospital & Health Care',
  'Marketing & Advertising',
  'Management Consulting',
  'Staffing & Recruiting',
  'Human Resources',
  'Real Estate',
  'Retail',
  'Education Management',
  'Accounting',
  'Insurance',
  'Banking',
  'Telecommunications',
  'Construction',
  'Manufacturing',
  'Automotive',
  'Food & Beverages',
  'Hospitality',
  'Legal Services',
  'Non-Profit',
  'Government',
  'Entertainment',
  'Media Production',
];

const LOCATIONS_INDIA = [
  'Bangalore, Karnataka, India',
  'Mumbai, Maharashtra, India',
  'Delhi, NCR, India',
  'Hyderabad, Telangana, India',
  'Chennai, Tamil Nadu, India',
  'Pune, Maharashtra, India',
  'Kolkata, West Bengal, India',
  'Coimbatore, Tamil Nadu, India',
  'Ahmedabad, Gujarat, India',
  'Noida, Uttar Pradesh, India',
  'Gurgaon, Haryana, India',
  'Kochi, Kerala, India',
  'Jaipur, Rajasthan, India',
  'Chandigarh, India',
  'Indore, Madhya Pradesh, India',
];

const LOCATIONS_GLOBAL = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'United Arab Emirates',
  'Netherlands',
  'Japan',
  'South Korea',
  'Brazil',
  'Mexico',
  'Israel',
  'Switzerland',
];

const TECHNOLOGY_KEYWORDS = [
  'Salesforce', 'HubSpot', 'AWS', 'Google Cloud', 'Microsoft Azure',
  'Shopify', 'WordPress', 'React', 'Python', 'Java',
  'Kubernetes', 'Docker', 'Slack', 'Zoom', 'SAP',
  'Oracle', 'Zendesk', 'Intercom', 'Stripe', 'Twilio',
];

const FUNDING_STAGES = [
  'Seed', 'Series A', 'Series B', 'Series C', 'Series D',
  'Series E+', 'IPO', 'Private Equity', 'Debt Financing', 'Grant',
];

// ============================================================================
// FilterCheckbox Component
// ============================================================================

interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ id, label, checked, onChange }) => (
  <div className="flex items-center space-x-2 py-1 px-1.5 hover:bg-slate-50 rounded transition-colors">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="h-3.5 w-3.5"
    />
    <label
      htmlFor={id}
      className={cn(
        "text-xs cursor-pointer transition-colors flex-1",
        checked ? "text-slate-900 font-medium" : "text-slate-600"
      )}
    >
      {label}
    </label>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const CompanySearchFilterSidebar: React.FC<CompanySearchFilterSidebarProps> = ({
  onSearch,
  isSearching = false,
  totalResults = 0,
  onClose,
}) => {
  // Filter State
  const [filters, setFilters] = useState({
    companyName: '',
    keywords: [] as string[],
    industries: [] as string[],
    locations: [] as string[],
    excludedLocations: [] as string[],
    employeeRanges: [] as string[],
    revenueRanges: [] as string[],
    technologies: [] as string[],
    fundingStages: [] as string[],
    foundedYearMin: '',
    foundedYearMax: '',
  });

  // UI State
  const [openSection, setOpenSection] = useState<string>('company');
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [industrySearchOpen, setIndustrySearchOpen] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');
  const [techSearchOpen, setTechSearchOpen] = useState(false);
  const [techSearch, setTechSearch] = useState('');

  // All locations combined
  const allLocations = useMemo(() => [...LOCATIONS_INDIA, ...LOCATIONS_GLOBAL], []);

  // Toggle array item helper
  const toggleArrayItem = useCallback((field: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  }, []);

  // Build Apollo filters and trigger search
  const handleSearch = useCallback(() => {
    const apolloFilters: ApolloCompanySearchFilters = {};

    if (filters.companyName.trim()) {
      apolloFilters.q_organization_name = filters.companyName.trim();
    }

    if (filters.keywords.length > 0) {
      apolloFilters.q_organization_keyword_tags = filters.keywords;
    }

    if (filters.industries.length > 0) {
      apolloFilters.organization_industries = filters.industries;
    }

    if (filters.locations.length > 0) {
      apolloFilters.organization_locations = filters.locations;
    }

    if (filters.excludedLocations.length > 0) {
      (apolloFilters as any).organization_not_locations = filters.excludedLocations;
    }

    if (filters.employeeRanges.length > 0) {
      apolloFilters.organization_num_employees_ranges = filters.employeeRanges.map(r => {
        const [min, max] = r.split(',');
        return { min: parseInt(min) || 1, max: max ? parseInt(max) : undefined };
      });
    }

    if (filters.revenueRanges.length > 0) {
      apolloFilters.revenue_range = { min: null, max: null };
      filters.revenueRanges.forEach(r => {
        const [min, max] = r.split(',').map(v => v ? parseInt(v) : null);
        if (apolloFilters.revenue_range) {
          if (min !== null && (apolloFilters.revenue_range.min === null || min < apolloFilters.revenue_range.min)) {
            apolloFilters.revenue_range.min = min;
          }
          if (max !== null && (apolloFilters.revenue_range.max === null || max > apolloFilters.revenue_range.max)) {
            apolloFilters.revenue_range.max = max;
          }
        }
      });
    }

    if (filters.technologies.length > 0) {
      apolloFilters.currently_using_any_of_technology_uids = filters.technologies.map(t => t.toLowerCase().replace(/\s+/g, '_'));
    }

    if (filters.fundingStages.length > 0) {
      (apolloFilters as any).organization_latest_funding_stage_cd = filters.fundingStages;
    }

    if (filters.foundedYearMin || filters.foundedYearMax) {
      (apolloFilters as any).organization_founded_year_range = {
        min: filters.foundedYearMin ? parseInt(filters.foundedYearMin) : null,
        max: filters.foundedYearMax ? parseInt(filters.foundedYearMax) : null,
      };
    }

    onSearch(apolloFilters);
  }, [filters, onSearch]);

  // Reset all filters
  const handleReset = useCallback(() => {
    setFilters({
      companyName: '',
      keywords: [],
      industries: [],
      locations: [],
      excludedLocations: [],
      employeeRanges: [],
      revenueRanges: [],
      technologies: [],
      fundingStages: [],
      foundedYearMin: '',
      foundedYearMax: '',
    });
  }, []);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.companyName) count++;
    count += filters.keywords.length;
    count += filters.industries.length;
    count += filters.locations.length;
    count += filters.excludedLocations.length;
    count += filters.employeeRanges.length;
    count += filters.revenueRanges.length;
    count += filters.technologies.length;
    count += filters.fundingStages.length;
    if (filters.foundedYearMin || filters.foundedYearMax) count++;
    return count;
  }, [filters]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* HEADER - Matching DatabaseFilterSidebar style */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Apollo Search
            </span>
            {activeFiltersCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-purple-600 text-white">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeFiltersCount > 0 && (
              <Button
                onClick={handleReset}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <FilterX className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-purple-900">
                {totalResults.toLocaleString()}
              </div>
              <div className="text-[9px] text-purple-600 uppercase font-semibold">
                Results
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-900">
                {activeFiltersCount}
              </div>
              <div className="text-[9px] text-purple-600 uppercase font-semibold">
                Filters Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Filters */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <Accordion
          type="single"
          value={openSection}
          onValueChange={setOpenSection}
          collapsible
          className="w-full px-3 py-2"
        >
          {/* Company Name / Keyword Search */}
          <AccordionItem value="company" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-purple-500" />
                Company
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">
                  Company Name
                </Label>
                <Input
                  placeholder="Search by name..."
                  className="mt-1 h-8 text-xs"
                  value={filters.companyName}
                  onChange={(e) => setFilters(prev => ({ ...prev, companyName: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">
                  Keywords (comma separated)
                </Label>
                <Input
                  placeholder="e.g., AI, SaaS, Fintech"
                  className="mt-1 h-8 text-xs"
                  value={filters.keywords.join(', ')}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  }))}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Location */}
          <AccordionItem value="location" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  Account Location
                </div>
                {filters.locations.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 text-rose-700">
                    {filters.locations.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-2">
              <Popover open={locationSearchOpen} onOpenChange={setLocationSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-xs font-normal"
                  >
                    {filters.locations.length > 0
                      ? `${filters.locations.length} selected`
                      : "Select locations..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search locations..."
                      className="h-8 text-xs"
                      value={locationSearch}
                      onValueChange={setLocationSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-xs text-purple-600"
                          onClick={() => {
                            if (locationSearch.trim()) {
                              toggleArrayItem('locations', locationSearch.trim());
                              setLocationSearch('');
                            }
                          }}
                        >
                          Add "{locationSearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup heading="India">
                        {LOCATIONS_INDIA.filter(loc =>
                          loc.toLowerCase().includes(locationSearch.toLowerCase())
                        ).slice(0, 8).map((loc) => (
                          <CommandItem
                            key={loc}
                            value={loc}
                            onSelect={() => toggleArrayItem('locations', loc)}
                            className="text-xs"
                          >
                            <Check className={cn(
                              "mr-2 h-3 w-3",
                              filters.locations.includes(loc) ? "opacity-100" : "opacity-0"
                            )} />
                            {loc}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Global">
                        {LOCATIONS_GLOBAL.filter(loc =>
                          loc.toLowerCase().includes(locationSearch.toLowerCase())
                        ).slice(0, 8).map((loc) => (
                          <CommandItem
                            key={loc}
                            value={loc}
                            onSelect={() => toggleArrayItem('locations', loc)}
                            className="text-xs"
                          >
                            <Check className={cn(
                              "mr-2 h-3 w-3",
                              filters.locations.includes(loc) ? "opacity-100" : "opacity-0"
                            )} />
                            {loc}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {filters.locations.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.locations.slice(0, 3).map(loc => (
                    <Badge
                      key={loc}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 cursor-pointer hover:bg-rose-100"
                      onClick={() => toggleArrayItem('locations', loc)}
                    >
                      {loc.split(',')[0]}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                  {filters.locations.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      +{filters.locations.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Employee Count */}
          <AccordionItem value="employees" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-cyan-500" />
                  # Employees
                </div>
                {filters.employeeRanges.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-cyan-100 text-cyan-700">
                    {filters.employeeRanges.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {EMPLOYEE_COUNT_RANGES.map(range => (
                  <FilterCheckbox
                    key={range.id}
                    id={`emp-${range.id}`}
                    label={range.label}
                    checked={filters.employeeRanges.includes(range.id)}
                    onChange={() => toggleArrayItem('employeeRanges', range.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Industry */}
          <AccordionItem value="industry" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Factory size={14} className="text-emerald-500" />
                  Industry
                </div>
                {filters.industries.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700">
                    {filters.industries.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <Popover open={industrySearchOpen} onOpenChange={setIndustrySearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-xs font-normal"
                  >
                    {filters.industries.length > 0
                      ? `${filters.industries.length} selected`
                      : "Select industries..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search industries..."
                      className="h-8 text-xs"
                      value={industrySearch}
                      onValueChange={setIndustrySearch}
                    />
                    <CommandList>
                      <CommandEmpty>No industry found.</CommandEmpty>
                      <CommandGroup>
                        {INDUSTRIES.filter(ind =>
                          ind.toLowerCase().includes(industrySearch.toLowerCase())
                        ).map((ind) => (
                          <CommandItem
                            key={ind}
                            value={ind}
                            onSelect={() => toggleArrayItem('industries', ind)}
                            className="text-xs"
                          >
                            <Check className={cn(
                              "mr-2 h-3 w-3",
                              filters.industries.includes(ind) ? "opacity-100" : "opacity-0"
                            )} />
                            {ind}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {filters.industries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.industries.slice(0, 3).map(ind => (
                    <Badge
                      key={ind}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100"
                      onClick={() => toggleArrayItem('industries', ind)}
                    >
                      {ind.length > 15 ? ind.substring(0, 15) + '...' : ind}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                  {filters.industries.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      +{filters.industries.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Technologies */}
          <AccordionItem value="technologies" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-violet-500" />
                  Technologies
                </div>
                {filters.technologies.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-violet-100 text-violet-700">
                    {filters.technologies.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <Popover open={techSearchOpen} onOpenChange={setTechSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-8 text-xs font-normal"
                  >
                    {filters.technologies.length > 0
                      ? `${filters.technologies.length} selected`
                      : "Select technologies..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search technologies..."
                      className="h-8 text-xs"
                      value={techSearch}
                      onValueChange={setTechSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-xs text-purple-600"
                          onClick={() => {
                            if (techSearch.trim()) {
                              toggleArrayItem('technologies', techSearch.trim());
                              setTechSearch('');
                            }
                          }}
                        >
                          Add "{techSearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {TECHNOLOGY_KEYWORDS.filter(tech =>
                          tech.toLowerCase().includes(techSearch.toLowerCase())
                        ).map((tech) => (
                          <CommandItem
                            key={tech}
                            value={tech}
                            onSelect={() => toggleArrayItem('technologies', tech)}
                            className="text-xs"
                          >
                            <Check className={cn(
                              "mr-2 h-3 w-3",
                              filters.technologies.includes(tech) ? "opacity-100" : "opacity-0"
                            )} />
                            {tech}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {filters.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.technologies.slice(0, 3).map(tech => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 cursor-pointer hover:bg-violet-100"
                      onClick={() => toggleArrayItem('technologies', tech)}
                    >
                      {tech}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                  {filters.technologies.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      +{filters.technologies.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Revenue */}
          <AccordionItem value="revenue" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-green-500" />
                  Revenue
                </div>
                {filters.revenueRanges.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700">
                    {filters.revenueRanges.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-1">
                {REVENUE_RANGES.map(range => (
                  <FilterCheckbox
                    key={range.id}
                    id={`rev-${range.id}`}
                    label={range.label}
                    checked={filters.revenueRanges.includes(range.id)}
                    onChange={() => toggleArrayItem('revenueRanges', range.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Funding */}
          <AccordionItem value="funding" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-amber-500" />
                  Funding
                </div>
                {filters.fundingStages.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-amber-100 text-amber-700">
                    {filters.fundingStages.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {FUNDING_STAGES.map(stage => (
                  <FilterCheckbox
                    key={stage}
                    id={`fund-${stage}`}
                    label={stage}
                    checked={filters.fundingStages.includes(stage)}
                    onChange={() => toggleArrayItem('fundingStages', stage)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Founded Year */}
          <AccordionItem value="founded" className="border-b-0">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" />
                  Founded Year
                </div>
                {(filters.foundedYearMin || filters.foundedYearMax) && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700">
                    1
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="From"
                  className="h-8 text-xs"
                  value={filters.foundedYearMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, foundedYearMin: e.target.value }))}
                  min={1900}
                  max={new Date().getFullYear()}
                />
                <span className="text-slate-400 text-xs">-</span>
                <Input
                  type="number"
                  placeholder="To"
                  className="h-8 text-xs"
                  value={filters.foundedYearMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, foundedYearMax: e.target.value }))}
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      {/* Search Button */}
      <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search Cloud
            </>
          )}
        </Button>
        <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          No credits consumed for search
        </p>
      </div>
    </div>
  );
};

export default CompanySearchFilterSidebar;