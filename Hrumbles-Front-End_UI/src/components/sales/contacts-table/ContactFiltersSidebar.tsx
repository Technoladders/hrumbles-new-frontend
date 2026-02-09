// src/components/sales/contacts-table/ContactFiltersSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table } from '@tanstack/react-table';
import { useDispatch, useSelector } from 'react-redux';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Building2, User, MapPin, ListFilter, FilterX, X,
  Briefcase, Tag, Sparkles, Search, Loader2, Users, Factory
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFilterStatistics } from '@/hooks/sales/useFilterStatistics';
import { CompanyFilterSelect } from './filters/CompanyFilterSelect';
import { LocationFilterSelect } from './filters/LocationFilterSelect';
import { JobTitleFilterSelect } from './filters/JobTitleFilterSelect';
import { IndustryFilterSelect } from './filters/IndustryFilterSelect';
import { PipelineStagesFilter } from './filters/PipelineStagesFilter';
import { setFilters as setReduxFilters } from '@/Redux/intelligenceSearchSlice';

interface ContactFiltersSidebarProps {
  table: Table<any>;
  isOpen?: boolean;
  onClose?: () => void;
  fileId?: string | null;
}

// Predefined filter options
const SENIORITY_OPTIONS = [
  { id: 'owner', label: 'Owner' },
  { id: 'founder', label: 'Founder' },
  { id: 'c_suite', label: 'C-Suite' },
  { id: 'partner', label: 'Partner' },
  { id: 'vp', label: 'VP' },
  { id: 'director', label: 'Director' },
  { id: 'manager', label: 'Manager' },
  { id: 'senior', label: 'Senior' },
  { id: 'entry', label: 'Entry' },
];

const EMPLOYEE_COUNT_OPTIONS = [
  { id: '1-10', label: '1 - 10' },
  { id: '11-50', label: '11 - 50' },
  { id: '51-200', label: '51 - 200' },
  { id: '201-500', label: '201 - 500' },
  { id: '501-1000', label: '501 - 1,000' },
  { id: '1001-5000', label: '1,001 - 5,000' },
  { id: '5001-10000', label: '5,001 - 10,000' },
  { id: '10001+', label: '10,000+' },
];

const SOURCE_OPTIONS = [
  { id: 'Website', label: 'Website' },
  { id: 'Referral', label: 'Referral' },
  { id: 'LinkedIn', label: 'LinkedIn' },
  { id: 'Cold Outreach', label: 'Cold Outreach' },
  { id: 'Event', label: 'Event' },
  { id: 'Inbound', label: 'Inbound' },
  { id: 'Discovery', label: 'Discovery' },
];

export function ContactFiltersSidebar({ 
  table, 
  isOpen = true, 
  onClose,
  fileId = null
}: ContactFiltersSidebarProps) {
  const dispatch = useDispatch();
  
  // Fetch statistics from database
  const { data: stats, isLoading: statsLoading } = useFilterStatistics({ fileId });

  // Single accordion value state - only one section open at a time
  const [openSection, setOpenSection] = useState<string>('job-titles');

  // Local filter state
  const [filters, setFilters] = useState({
    search: '',
    jobTitles: [] as string[],
    managementLevels: [] as string[],
    departments: [] as string[],
    functions: [] as string[],
    seniorities: [] as string[],
    employeeCounts: [] as string[],
    stages: [] as string[],
    sources: [] as string[],
    industries: [] as string[],
    companyIds: [] as number[],
    countries: [] as string[],
    cities: [] as string[],
    hasEmail: false,
    hasPhone: false,
    isEnriched: false,
  });

  // Get unique industries from stats
  const uniqueIndustries = useMemo(() => {
    if (!stats?.industries) return [];
    return Object.entries(stats.industries)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [stats?.industries]);

  // Get unique departments from stats
  const uniqueDepartments = useMemo(() => {
    if (!stats?.departments) return [];
    return Object.entries(stats.departments)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [stats?.departments]);

  // Auto-apply filters when certain fields change
  useEffect(() => {
    if (
      filters.countries.length > 0 || 
      filters.cities.length > 0 || 
      filters.jobTitles.length > 0 ||
      filters.managementLevels.length > 0 ||
      filters.departments.length > 0 ||
      filters.functions.length > 0
    ) {
      applyFilters();
    }
  }, [
    filters.countries, 
    filters.cities, 
    filters.jobTitles,
    filters.managementLevels,
    filters.departments,
    filters.functions
  ]);

  // Toggle array item helper
  const toggleArrayItem = (field: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[field] as string[];
      const updated = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  // Apply filters - update both table and Redux
  const applyFilters = useCallback(() => {
    // Reset table filters first
    table.resetColumnFilters();

    // Build filter object for Redux
    const reduxFilters: any = {};

    if (filters.search) {
      table.getColumn('name')?.setFilterValue(filters.search);
      reduxFilters.search = filters.search;
    }

    if (filters.jobTitles.length > 0) {
      table.getColumn('job_title')?.setFilterValue(filters.jobTitles);
      reduxFilters.jobTitles = filters.jobTitles;
    }

    if (filters.managementLevels.length > 0) {
      table.getColumn('seniority')?.setFilterValue(filters.managementLevels);
      reduxFilters.seniorities = filters.managementLevels;
    }

    if (filters.departments.length > 0) {
      table.getColumn('departments')?.setFilterValue(filters.departments);
      reduxFilters.departments = filters.departments;
    }

    if (filters.functions.length > 0) {
      table.getColumn('functions')?.setFilterValue(filters.functions);
      reduxFilters.functions = filters.functions;
    }

    if (filters.seniorities.length > 0) {
      table.getColumn('seniority')?.setFilterValue(filters.seniorities);
      reduxFilters.seniorities = filters.seniorities;
    }

    if (filters.stages.length > 0) {
      table.getColumn('contact_stage')?.setFilterValue(filters.stages);
      reduxFilters.stages = filters.stages;
    }

    if (filters.sources.length > 0) {
      table.getColumn('medium')?.setFilterValue(filters.sources);
      reduxFilters.sources = filters.sources;
    }

    if (filters.countries.length > 0) {
      table.getColumn('country')?.setFilterValue(filters.countries);
      reduxFilters.countries = filters.countries;
    }

    if (filters.cities.length > 0) {
      table.getColumn('city')?.setFilterValue(filters.cities);
      reduxFilters.cities = filters.cities;
    }

    if (filters.industries.length > 0) {
      table.getColumn('industry')?.setFilterValue(filters.industries);
      reduxFilters.industries = filters.industries;
    }

    if (filters.employeeCounts.length > 0) {
      table.getColumn('employee_count')?.setFilterValue(filters.employeeCounts);
      reduxFilters.employeeCounts = filters.employeeCounts;
    }

    // Company filter
    if (filters.companyIds.length > 0) {
      table.getColumn('company_id')?.setFilterValue(filters.companyIds);
      reduxFilters.companyIds = filters.companyIds;
    }

    // Quick filters
    if (filters.hasEmail) reduxFilters.hasEmail = true;
    if (filters.hasPhone) reduxFilters.hasPhone = true;
    if (filters.isEnriched) reduxFilters.isEnriched = true;

    // Dispatch to Redux for server-side filtering
    dispatch(setReduxFilters(reduxFilters));
  }, [filters, table, dispatch]);

  // Reset all filters
  const handleReset = () => {
    setFilters({
      search: '',
      jobTitles: [],
      managementLevels: [],
      departments: [],
      functions: [],
      seniorities: [],
      employeeCounts: [],
      stages: [],
      sources: [],
      industries: [],
      companyIds: [],
      countries: [],
      cities: [],
      hasEmail: false,
      hasPhone: false,
      isEnriched: false,
    });
    table.resetColumnFilters();
    dispatch(setReduxFilters({}));
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.jobTitles.length;
    count += filters.managementLevels.length;
    count += filters.departments.length;
    count += filters.functions.length;
    count += filters.seniorities.length;
    count += filters.employeeCounts.length;
    count += filters.stages.length;
    count += filters.sources.length;
    count += filters.industries.length;
    count += filters.companyIds.length;
    count += filters.countries.length;
    count += filters.cities.length;
    if (filters.hasEmail) count++;
    if (filters.hasPhone) count++;
    if (filters.isEnriched) count++;
    return count;
  }, [filters]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Filters
            </span>
            {activeFiltersCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-indigo-600 text-white">
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

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
          <Input 
            placeholder="Search contacts..." 
            className="pl-8 h-9 text-xs border-slate-200 bg-white"
            value={filters.search}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }));
              table.getColumn('name')?.setFilterValue(e.target.value || undefined);
            }}
          />
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3">
          {statsLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="ml-2 text-xs text-indigo-600">Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-indigo-900">{(stats?.total || 0).toLocaleString()}</div>
                <div className="text-[9px] text-indigo-600 uppercase font-semibold">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-900">{(stats?.enriched || 0).toLocaleString()}</div>
                <div className="text-[9px] text-indigo-600 uppercase font-semibold">Enriched</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-900">{table.getFilteredRowModel().rows.length}</div>
                <div className="text-[9px] text-indigo-600 uppercase font-semibold">On Page</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE FILTERS */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <Accordion 
          type="single" 
          value={openSection}
          onValueChange={setOpenSection}
          collapsible
          className="w-full px-3 py-2"
        >
          
          {/* QUICK FILTERS */}
          <AccordionItem value="quick" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" />
                Quick Filters
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-2">
                <FilterCheckbox
                  id="has-email"
                  label="Has Email"
                  count={stats?.hasEmail || 0}
                  checked={filters.hasEmail}
                  onChange={(checked) => setFilters(prev => ({ ...prev, hasEmail: checked }))}
                />
                <FilterCheckbox
                  id="has-phone"
                  label="Has Phone"
                  count={stats?.hasPhone || 0}
                  checked={filters.hasPhone}
                  onChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: checked }))}
                />
                <FilterCheckbox
                  id="is-enriched"
                  label="Enriched Contacts"
                  count={stats?.enriched || 0}
                  checked={filters.isEnriched}
                  onChange={(checked) => setFilters(prev => ({ ...prev, isEnriched: checked }))}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* JOB TITLES FILTER */}
          <AccordionItem value="job-titles" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-blue-500" />
                  Job Titles
                </div>
                {filters.jobTitles.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700">
                    {filters.jobTitles.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <JobTitleFilterSelect
                selectedTitles={filters.jobTitles}
                onSelectionChange={(titles) => setFilters(prev => ({ ...prev, jobTitles: titles }))}
                selectedManagementLevels={filters.managementLevels}
                onManagementLevelsChange={(levels) => setFilters(prev => ({ ...prev, managementLevels: levels }))}
                selectedDepartments={filters.departments}
                onDepartmentsChange={(departments) => setFilters(prev => ({ ...prev, departments }))}
                selectedFunctions={filters.functions}
                onFunctionsChange={(functions) => setFilters(prev => ({ ...prev, functions }))}
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* COMPANY FILTER */}
          <AccordionItem value="company" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-violet-500" />
                  Company
                </div>
                {filters.companyIds.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-violet-100 text-violet-700">
                    {filters.companyIds.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <CompanyFilterSelect
                selectedCompanyIds={filters.companyIds}
                onSelectionChange={(ids) => setFilters(prev => ({ ...prev, companyIds: ids }))}
              />
            </AccordionContent>
          </AccordionItem>

          {/* CONTACT STAGE */}
          <AccordionItem value="stage" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-indigo-500" />
                  Pipeline Stage
                </div>
                {filters.stages.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-indigo-100 text-indigo-700">
                    {filters.stages.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <PipelineStagesFilter
                selectedStages={filters.stages}
                onSelectionChange={(stages) => setFilters(prev => ({ ...prev, stages }))}
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* PERSON DETAILS */}
          <AccordionItem value="person" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-500" />
                  Person Details
                </div>
                {filters.seniorities.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700">
                    {filters.seniorities.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-4">
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                  Seniority Level
                </Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {SENIORITY_OPTIONS.map(option => (
                    <FilterCheckbox
                      key={option.id}
                      id={`seniority-${option.id}`}
                      label={option.label}
                      count={stats?.seniorities?.[option.id] || 0}
                      checked={filters.seniorities.includes(option.id)}
                      onChange={() => toggleArrayItem('seniorities', option.id)}
                    />
                  ))}
                </div>
              </div>

              {uniqueDepartments.length > 0 && (
                <div>
                  <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                    Department
                  </Label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {uniqueDepartments.slice(0, 10).map(dept => (
                      <FilterCheckbox
                        key={dept}
                        id={`dept-${dept}`}
                        label={dept}
                        count={stats?.departments?.[dept] || 0}
                        checked={filters.departments.includes(dept)}
                        onChange={() => toggleArrayItem('departments', dept)}
                      />
                    ))}
                    {uniqueDepartments.length > 10 && (
                      <p className="text-[9px] text-slate-400 pt-1">
                        +{uniqueDepartments.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* EMPLOYEE COUNT */}
          <AccordionItem value="employee-count" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-cyan-500" />
                  Employee Count
                </div>
                {filters.employeeCounts.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-cyan-100 text-cyan-700">
                    {filters.employeeCounts.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-1.5">
                {EMPLOYEE_COUNT_OPTIONS.map(option => (
                  <FilterCheckbox
                    key={option.id}
                    id={`emp-${option.id}`}
                    label={option.label}
                    count={stats?.employeeRanges?.[option.id] || 0}
                    checked={filters.employeeCounts.includes(option.id)}
                    onChange={() => toggleArrayItem('employeeCounts', option.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* INDUSTRY */}
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
              <IndustryFilterSelect
                selectedIndustries={filters.industries}
                onSelectionChange={(industries) => setFilters(prev => ({ ...prev, industries }))}
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* SOURCE / MEDIUM */}
          <AccordionItem value="source" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-purple-500" />
                  Lead Source
                </div>
                {filters.sources.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-purple-100 text-purple-700">
                    {filters.sources.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-1.5">
                {SOURCE_OPTIONS.map(option => (
                  <FilterCheckbox
                    key={option.id}
                    id={`source-${option.id}`}
                    label={option.label}
                    count={stats?.sources?.[option.id] || 0}
                    checked={filters.sources.includes(option.id)}
                    onChange={() => toggleArrayItem('sources', option.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* LOCATION */}
          <AccordionItem value="location" className="border-b-0">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  Location
                </div>
                {(filters.countries.length + filters.cities.length) > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 text-rose-700">
                    {filters.countries.length + filters.cities.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-4">
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                  Country
                </Label>
                <LocationFilterSelect
                  type="country"
                  selectedLocations={filters.countries}
                  onSelectionChange={(countries) => setFilters(prev => ({ ...prev, countries }))}
                  fileId={fileId}
                />
              </div>

              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                  City
                </Label>
                <LocationFilterSelect
                  type="city"
                  selectedLocations={filters.cities}
                  onSelectionChange={(cities) => setFilters(prev => ({ ...prev, cities }))}
                  fileId={fileId}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>

      {/* APPLY BUTTON */}
      {activeFiltersCount > 0 && (
        <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
          <Button
            onClick={applyFilters}
            className="w-full h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
          >
            Apply {activeFiltersCount} Filter{activeFiltersCount !== 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}

// Reusable Filter Checkbox Component
interface FilterCheckboxProps {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({
  id,
  label,
  count,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-3.5 w-3.5"
      />
      <label
        htmlFor={id}
        className={cn(
          "text-xs cursor-pointer transition-colors",
          checked ? "text-slate-900 font-medium" : "text-slate-600"
        )}
      >
        {label}
      </label>
    </div>
    <span className={cn(
      "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors",
      count > 0 
        ? "text-slate-600 bg-slate-100 group-hover:bg-slate-200" 
        : "text-slate-400"
    )}>
      {count.toLocaleString()}
    </span>
  </div>
);