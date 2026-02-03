// src/components/sales/contacts-table/ContactFiltersSidebar.tsx
import React, { useState, useMemo } from 'react';
import { Table } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Building2, User, MapPin, Clock, ListFilter, FilterX, X,
  Briefcase, Users, DollarSign, Tag, Sparkles, Search, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ContactFiltersSidebarProps {
  table: Table<any>;
  isOpen?: boolean;
  onClose?: () => void;
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
  onClose 
}: ContactFiltersSidebarProps) {
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

  // Get all data for counting
  const allRows = table.getPreFilteredRowModel().rows;
  
  // Calculate real counts from data
  const counts = useMemo(() => {
    const seniorityCount: Record<string, number> = {};
    const employeeCountCount: Record<string, number> = {};
    const stageCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    const industryCount: Record<string, number> = {};
    const departmentCount: Record<string, number> = {};
    let hasEmailCount = 0;
    let hasPhoneCount = 0;
    let enrichedCount = 0;

    allRows.forEach(row => {
      const data = row.original;
      
      // Seniority
      if (data.seniority) {
        const s = data.seniority.toLowerCase();
        seniorityCount[s] = (seniorityCount[s] || 0) + 1;
      }

      // Employee Count - map to ranges
      if (data.employee_count) {
        const emp = parseInt(data.employee_count);
        let range = '';
        if (emp <= 10) range = '1-10';
        else if (emp <= 50) range = '11-50';
        else if (emp <= 200) range = '51-200';
        else if (emp <= 500) range = '201-500';
        else if (emp <= 1000) range = '501-1000';
        else if (emp <= 5000) range = '1001-5000';
        else if (emp <= 10000) range = '5001-10000';
        else range = '10001+';
        employeeCountCount[range] = (employeeCountCount[range] || 0) + 1;
      }

      // Stage
      if (data.contact_stage) {
        stageCount[data.contact_stage] = (stageCount[data.contact_stage] || 0) + 1;
      }

      // Source/Medium
      if (data.medium) {
        sourceCount[data.medium] = (sourceCount[data.medium] || 0) + 1;
      }

      // Industry
      if (data.industry) {
        industryCount[data.industry] = (industryCount[data.industry] || 0) + 1;
      }

      // Departments
      if (data.departments && Array.isArray(data.departments)) {
        data.departments.forEach((d: string) => {
          departmentCount[d] = (departmentCount[d] || 0) + 1;
        });
      }

      // Has Email
      if (data.email || (data.all_emails && data.all_emails.length > 0)) {
        hasEmailCount++;
      }

      // Has Phone
      if (data.mobile || (data.all_phones && data.all_phones.length > 0)) {
        hasPhoneCount++;
      }

      // Enriched
      if (data.apollo_person_id || data.intel_person) {
        enrichedCount++;
      }
    });

    return {
      seniority: seniorityCount,
      employeeCount: employeeCountCount,
      stage: stageCount,
      source: sourceCount,
      industry: industryCount,
      department: departmentCount,
      hasEmail: hasEmailCount,
      hasPhone: hasPhoneCount,
      enriched: enrichedCount,
      total: allRows.length,
    };
  }, [allRows]);

  // Get unique industries from data
  const uniqueIndustries = useMemo(() => {
    const industries = new Set<string>();
    allRows.forEach(row => {
      if (row.original.industry) {
        industries.add(row.original.industry);
      }
    });
    return Array.from(industries).sort();
  }, [allRows]);

  // Get unique departments from data
  const uniqueDepartments = useMemo(() => {
    const departments = new Set<string>();
    allRows.forEach(row => {
      if (row.original.departments && Array.isArray(row.original.departments)) {
        row.original.departments.forEach((d: string) => departments.add(d));
      }
    });
    return Array.from(departments).sort();
  }, [allRows]);

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
    // Reset all filters first
    table.resetColumnFilters();

    // Apply search filter
    if (filters.search) {
      table.getColumn('name')?.setFilterValue(filters.search);
    }

    // Apply seniority filter
    if (filters.seniorities.length > 0) {
      table.getColumn('seniority')?.setFilterValue(filters.seniorities);
    }

    // Apply stage filter
    if (filters.stages.length > 0) {
      table.getColumn('contact_stage')?.setFilterValue(filters.stages);
    }

    // Apply source filter
    if (filters.sources.length > 0) {
      table.getColumn('medium')?.setFilterValue(filters.sources);
    }

    // Apply country filter
    if (filters.country) {
      table.getColumn('country')?.setFilterValue(filters.country);
    }

    // Apply city filter
    if (filters.city) {
      table.getColumn('city')?.setFilterValue(filters.city);
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

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-indigo-900">{counts.total}</div>
              <div className="text-[9px] text-indigo-600 uppercase font-semibold">Total</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-900">{counts.enriched}</div>
              <div className="text-[9px] text-indigo-600 uppercase font-semibold">Enriched</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-900">{table.getFilteredRowModel().rows.length}</div>
              <div className="text-[9px] text-indigo-600 uppercase font-semibold">Filtered</div>
            </div>
          </div>
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
                  count={counts.hasEmail}
                  checked={filters.hasEmail}
                  onChange={(checked) => setFilters(prev => ({ ...prev, hasEmail: checked }))}
                />
                <FilterCheckbox
                  id="has-phone"
                  label="Has Phone"
                  count={counts.hasPhone}
                  checked={filters.hasPhone}
                  onChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: checked }))}
                />
                <FilterCheckbox
                  id="is-enriched"
                  label="Enriched Contacts"
                  count={counts.enriched}
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
                    count={counts.stage[option.id] || 0}
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
                      count={counts.seniority[option.id] || 0}
                      checked={filters.seniorities.includes(option.id)}
                      onChange={() => toggleArrayItem('seniorities', option.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Departments (if any exist) */}
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
                        count={counts.department[dept] || 0}
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
                      count={counts.employeeCount[option.id] || 0}
                      checked={filters.employeeCounts.includes(option.id)}
                      onChange={() => toggleArrayItem('employeeCounts', option.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Industry (dynamic from data) */}
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
                        count={counts.industry[industry] || 0}
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
                    count={counts.source[option.id] || 0}
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
      {count}
    </span>
  </div>
);