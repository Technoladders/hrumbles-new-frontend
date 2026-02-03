// src/components/sales/contacts-table/ContactFiltersSidebar.tsx
// ENTERPRISE-GRADE FILTER SIDEBAR - Complete implementation with enrichment data

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table } from '@tanstack/react-table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Sparkles, 
  Building2, 
  User, 
  MapPin, 
  Clock, 
  ListFilter, 
  FilterX, 
  X,
  Star,
  Save,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useContactStages } from '@/hooks/sales/useContactStages';
import {
  useSeniorityOptions,
  useDepartmentOptions,
  useFunctionOptions,
  useEmployeeCountRanges,
  useRevenueRanges,
  useIndustryOptions,
  useMediumOptions,
  useFilterStatistics,
} from '@/hooks/sales/useEnrichedFilterOptions';
import { DateRangeFilter } from './ui/DateRangeFilter';
import { MultiSelectFilter } from './ui/MultiSelectFilter';
import { SavedFiltersManager } from './ui/SavedFiltersManager';
import { FilterChips } from './ui/FilterChips';

interface ContactFiltersSidebarProps {
  table: Table<any>;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ContactFiltersSidebar({ 
  table, 
  isOpen = true, 
  onClose 
}: ContactFiltersSidebarProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // Fetch all filter options
  const { data: stages = [] } = useContactStages();
  const { data: seniorityOptions = [] } = useSeniorityOptions();
  const { data: departmentOptions = [] } = useDepartmentOptions();
  const { data: functionOptions = [] } = useFunctionOptions();
  const { data: employeeCountRanges = [] } = useEmployeeCountRanges();
  const { data: revenueRanges = [] } = useRevenueRanges();
  const { data: industryOptions = [] } = useIndustryOptions();
  const { data: mediumOptions = [] } = useMediumOptions();
  const { data: stats } = useFilterStatistics();

  const getActiveFiltersCount = () => {
    return table.getState().columnFilters.length;
  };

  const getActiveFiltersForSection = (columnIds: string[]) => {
    return columnIds.reduce((count, id) => {
      const column = table.getColumn(id);
      if (!column) return count;
      const filterValue = column.getFilterValue();
      if (Array.isArray(filterValue)) return count + filterValue.length;
      if (filterValue) return count + 1;
      return count;
    }, 0);
  };

  const applyQuickFilter = (type: 'enriched' | 'email' | 'phone') => {
    table.resetColumnFilters();
    
    switch (type) {
      case 'enriched':
        table.getColumn('apollo_person_id')?.setFilterValue('not_null');
        break;
      case 'email':
        table.getColumn('email')?.setFilterValue('not_null');
        break;
      case 'phone':
        table.getColumn('mobile')?.setFilterValue('not_null');
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 border-r border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
        >
          {/* HEADER */}
          <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Advanced Filters
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => table.resetColumnFilters()}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <FilterX className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                {onClose && (
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* STATISTICS CARD */}
            {stats && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Dataset</span>
                  <Badge className="bg-blue-600 text-white text-[9px] h-4 px-1.5">
                    {getActiveFiltersCount()} active
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="text-blue-900 font-bold text-lg">{stats.totalContacts.toLocaleString()}</div>
                    <div className="text-blue-600">Total People</div>
                  </div>
                  <div>
                    <div className="text-blue-900 font-bold text-lg">{stats.enrichmentRate}%</div>
                    <div className="text-blue-600">Enriched</div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-2">
              <Button
                onClick={() => setIsSaveDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-[10px] font-semibold border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Save className="h-3 w-3 mr-1" />
                Save Filter
              </Button>
            </div>
          </div>

          {/* ACTIVE FILTER CHIPS */}
          <FilterChips table={table} />

          {/* SCROLLABLE FILTERS */}
          <ScrollArea className="flex-1">
            <Accordion 
              type="multiple" 
              defaultValue={['quick', 'contact', 'enrichment', 'company']} 
              className="w-full px-2 py-2"
            >
              
              {/* ========== QUICK FILTERS ========== */}
              <AccordionItem value="quick" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-bold uppercase text-slate-600">
                      Quick Filters
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => applyQuickFilter('enriched')}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2 text-purple-600" />
                    Enriched Only
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => applyQuickFilter('email')}
                  >
                    Has Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => applyQuickFilter('phone')}
                  >
                    Has Phone
                  </Button>
                </AccordionContent>
              </AccordionItem>

              {/* ========== DATE RANGES ========== */}
              <AccordionItem value="temporal" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Date Ranges
                      </span>
                    </div>
                    {getActiveFiltersForSection(['created_at', 'updated_at']) > 0 && (
                      <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['created_at', 'updated_at'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <DateRangeFilter 
                    label="Created Date"
                    columnId="created_at"
                    table={table}
                  />
                  <DateRangeFilter 
                    label="Updated Date"
                    columnId="updated_at"
                    table={table}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* ========== CONTACT ENRICHMENT ========== */}
              <AccordionItem value="enrichment" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Contact Enrichment
                      </span>
                    </div>
                    {getActiveFiltersForSection(['seniority', 'departments', 'functions']) > 0 && (
                      <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-purple-500 text-white">
                        {getActiveFiltersForSection(['seniority', 'departments', 'functions'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <MultiSelectFilter
                    label="Seniority"
                    columnId="seniority"
                    options={seniorityOptions}
                    table={table}
                  />
                  <MultiSelectFilter
                    label="Departments"
                    columnId="departments"
                    options={departmentOptions}
                    table={table}
                  />
                  <MultiSelectFilter
                    label="Functions"
                    columnId="functions"
                    options={functionOptions}
                    table={table}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* ========== COMPANY ENRICHMENT ========== */}
              <AccordionItem value="company" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Company Filters
                      </span>
                    </div>
                    {getActiveFiltersForSection(['industry', 'employee_count', 'revenue']) > 0 && (
                      <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['industry', 'employee_count', 'revenue'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <MultiSelectFilter
                    label="Industry"
                    columnId="industry"
                    options={industryOptions}
                    table={table}
                  />
                  <MultiSelectFilter
                    label="Employee Count"
                    columnId="employee_count"
                    options={employeeCountRanges}
                    table={table}
                  />
                  <MultiSelectFilter
                    label="Revenue Range"
                    columnId="revenue"
                    options={revenueRanges}
                    table={table}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* ========== CONTACT INFO ========== */}
              <AccordionItem value="contact" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Contact Info
                      </span>
                    </div>
                    {getActiveFiltersForSection(['contact_stage', 'medium']) > 0 && (
                      <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['contact_stage', 'medium'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <MultiSelectFilter
                    label="Pipeline Stage"
                    columnId="contact_stage"
                    options={stages.map(s => ({ 
                      label: s.name, 
                      value: s.name,
                      count: 0 
                    }))}
                    table={table}
                  />
                  <MultiSelectFilter
                    label="Source Medium"
                    columnId="medium"
                    options={mediumOptions}
                    table={table}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* ========== LOCATION ========== */}
              <AccordionItem value="location" className="border-b-0">
                <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        Location
                      </span>
                    </div>
                    {getActiveFiltersForSection(['country', 'city']) > 0 && (
                      <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-blue-500 text-white">
                        {getActiveFiltersForSection(['country', 'city'])}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Country
                    </label>
                    <Input
                      placeholder="Search country..."
                      className="h-8 text-xs"
                      onChange={(e) => table.getColumn('country')?.setFilterValue(e.target.value || undefined)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block">
                      City
                    </label>
                    <Input
                      placeholder="Search city..."
                      className="h-8 text-xs"
                      onChange={(e) => table.getColumn('city')?.setFilterValue(e.target.value || undefined)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </ScrollArea>

          {/* SAVED FILTERS DIALOG */}
          <SavedFiltersManager
            open={isSaveDialogOpen}
            onOpenChange={setIsSaveDialogOpen}
            table={table}
          />

        </motion.aside>
      )}
    </AnimatePresence>
  );
}
// 