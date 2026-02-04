// src/components/sales/contacts-table/ContactFiltersSidebar.tsx
import React, { useState, useMemo } from 'react';
import { Table } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Building2, User, MapPin, ListFilter, FilterX, X,
  Briefcase, Tag, Sparkles, Search, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFilterStatistics } from '@/hooks/sales/useFilterStatistics';

interface ContactFiltersSidebarProps {
  table: Table<any>;
  isOpen?: boolean;
  onClose?: () => void;
  fileId?: string | null; // Pass fileId for file-specific statistics
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

const CONTACT_STAGE_OPTIONS = [
  { id: 'Lead', label: 'Lead' },
  { id: 'Prospect', label: 'Prospect' },
  { id: 'Qualified', label: 'Qualified' },
  { id: 'Customer', label: 'Customer' },
  { id: 'Churned', label: 'Churned' },
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
  // Fetch statistics from database (ALL contacts, not just current page)
  const { data: stats, isLoading: statsLoading } = useFilterStatistics({ fileId });

  // Local filter state
  const [filters, setFilters] = useState({
    search: '',
    seniorities: [] as string[],
    employeeCounts: [] as string[],
    stages: [] as string[],
    sources: [] as string[],
    industries: [] as string[],
    departments: [] as string[],
    country: '',
    city: '',
    hasEmail: false,
    hasPhone: false,
    isEnriched: false,
  });

  // Get unique industries from stats (sorted by count)
  const uniqueIndustries = useMemo(() => {
    if (!stats?.industries) return [];
    return Object.entries(stats.industries)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [stats?.industries]);

  // Get unique departments from stats (sorted by count)
  const uniqueDepartments = useMemo(() => {
    if (!stats?.departments) return [];
    return Object.entries(stats.departments)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [stats?.departments]);

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

  // Apply filters to table
  const applyFilters = () => {
    table.resetColumnFilters();

    if (filters.search) {
      table.getColumn('name')?.setFilterValue(filters.search);
    }

    if (filters.seniorities.length > 0) {
      table.getColumn('seniority')?.setFilterValue(filters.seniorities);
    }

    if (filters.stages.length > 0) {
      table.getColumn('contact_stage')?.setFilterValue(filters.stages);
    }

    if (filters.sources.length > 0) {
      table.getColumn('medium')?.setFilterValue(filters.sources);
    }

    if (filters.country) {
      table.getColumn('country')?.setFilterValue(filters.country);
    }

    if (filters.city) {
      table.getColumn('city')?.setFilterValue(filters.city);
    }

    if (filters.industries.length > 0) {
      table.getColumn('industry')?.setFilterValue(filters.industries);
    }

    if (filters.employeeCounts.length > 0) {
      table.getColumn('employee_count')?.setFilterValue(filters.employeeCounts);
    }
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({
      search: '',
      seniorities: [],
      employeeCounts: [],
      stages: [],
      sources: [],
      industries: [],
      departments: [],
      country: '',
      city: '',
      hasEmail: false,
      hasPhone: false,
      isEnriched: false,
    });
    table.resetColumnFilters();
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.seniorities.length;
    count += filters.employeeCounts.length;
    count += filters.stages.length;
    count += filters.sources.length;
    count += filters.industries.length;
    count += filters.departments.length;
    if (filters.country) count++;
    if (filters.city) count++;
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

        {/* Stats Card - Now from database */}
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
          type="multiple" 
          defaultValue={['quick', 'stage', 'person', 'company', 'location']} 
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
              <div className="space-y-2">
                {CONTACT_STAGE_OPTIONS.map(option => (
                  <FilterCheckbox
                    key={option.id}
                    id={`stage-${option.id}`}
                    label={option.label}
                    count={stats?.stages?.[option.id] || 0}
                    checked={filters.stages.includes(option.id)}
                    onChange={() => toggleArrayItem('stages', option.id)}
                  />
                ))}
              </div>
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
              {/* Seniority */}
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

              {/* Departments (dynamic from stats) */}
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

          {/* COMPANY DETAILS */}
          <AccordionItem value="company" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-emerald-500" />
                  Company Details
                </div>
                {(filters.employeeCounts.length + filters.industries.length) > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700">
                    {filters.employeeCounts.length + filters.industries.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-4">
              {/* Employee Count */}
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                  Employee Count
                </Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
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
              </div>

              {/* Industry (dynamic from stats) */}
              {uniqueIndustries.length > 0 && (
                <div>
                  <Label className="text-[10px] uppercase text-slate-500 font-semibold mb-2 block">
                    Industry
                  </Label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {uniqueIndustries.slice(0, 10).map(industry => (
                      <FilterCheckbox
                        key={industry}
                        id={`industry-${industry}`}
                        label={industry}
                        count={stats?.industries?.[industry] || 0}
                        checked={filters.industries.includes(industry)}
                        onChange={() => toggleArrayItem('industries', industry)}
                      />
                    ))}
                    {uniqueIndustries.length > 10 && (
                      <p className="text-[9px] text-slate-400 pt-1">
                        +{uniqueIndustries.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                {(filters.country || filters.city) && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 text-rose-700">
                    {(filters.country ? 1 : 0) + (filters.city ? 1 : 0)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">
                  Country
                </Label>
                <Input
                  placeholder="Enter country..."
                  className="h-8 text-xs"
                  value={filters.country}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, country: e.target.value }));
                    table.getColumn('country')?.setFilterValue(e.target.value || undefined);
                  }}
                />
                {/* Show top countries from stats */}
                {stats?.countries && Object.keys(stats.countries).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(stats.countries)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([country, count]) => (
                        <button
                          key={country}
                          onClick={() => {
                            setFilters(prev => ({ ...prev, country }));
                            table.getColumn('country')?.setFilterValue(country);
                          }}
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full border transition-colors",
                            filters.country === country
                              ? "bg-rose-100 border-rose-300 text-rose-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {country} ({count})
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">
                  City
                </Label>
                <Input
                  placeholder="Enter city..."
                  className="h-8 text-xs"
                  value={filters.city}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, city: e.target.value }));
                    table.getColumn('city')?.setFilterValue(e.target.value || undefined);
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>

      {/* APPLY BUTTON (Fixed at bottom) */}
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