// src/components/sales/company-search/DatabaseFilterSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search, X, Building2, MapPin, Users, DollarSign,
  Tag, Briefcase, Calendar, RotateCcw, Database, Sparkles,
  CheckCircle2, ListFilter, FilterX, Loader2, Factory
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Import filter components
import { CompanyIndustryFilterSelect } from "./filters/CompanyIndustryFilterSelect";
import { CompanyLocationFilterSelect } from "./filters/CompanyLocationFilterSelect";
import { CompanyStageFilterSelect } from "./filters/CompanyStageFilterSelect";
import { useCompanyFilterStatistics } from "@/hooks/sales/useCompanyFilterStatistics";

// ============================================================================
// Types
// ============================================================================

interface DatabaseFilters {
  search: string;
  industries: string[];
  locations: string[];
  stages: string[];
  employeeRanges: string[];
  revenueRanges: string[];
  hasApolloId: boolean | null;
  isPromoted: boolean | null;
  technologies: string[];
  fundingStages: string[];
  foundedYearMin: number | null;
  foundedYearMax: number | null;
}

interface DatabaseFilterSidebarProps {
  filters: DatabaseFilters;
  onFiltersChange: (filters: DatabaseFilters) => void;
  isLoading?: boolean;
  totalResults?: number;
  onClose?: () => void;
  fileId?: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const EMPLOYEE_RANGES = [
  { label: "1 - 10", value: "1,10" },
  { label: "11 - 50", value: "11,50" },
  { label: "51 - 200", value: "51,200" },
  { label: "201 - 500", value: "201,500" },
  { label: "501 - 1,000", value: "501,1000" },
  { label: "1,001 - 5,000", value: "1001,5000" },
  { label: "5,001 - 10,000", value: "5001,10000" },
  { label: "10,000+", value: "10000," },
];

const REVENUE_RANGES = [
  { label: "< $1M", value: "0,1000000" },
  { label: "$1M - $10M", value: "1000000,10000000" },
  { label: "$10M - $50M", value: "10000000,50000000" },
  { label: "$50M - $100M", value: "50000000,100000000" },
  { label: "$100M - $500M", value: "100000000,500000000" },
  { label: "$500M - $1B", value: "500000000,1000000000" },
  { label: "$1B+", value: "1000000000," },
];

// ============================================================================
// FilterCheckbox Component
// ============================================================================

interface FilterCheckboxProps {
  id: string;
  label: string;
  count?: number;
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
  <div className="flex items-center justify-between group hover:bg-slate-50 rounded px-1.5 py-1.5">
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
    {count !== undefined && (
      <span className={cn(
        "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors",
        count > 0 
          ? "text-slate-600 bg-slate-100 group-hover:bg-slate-200" 
          : "text-slate-400"
      )}>
        {count.toLocaleString()}
      </span>
    )}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const DatabaseFilterSidebar: React.FC<DatabaseFilterSidebarProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
  totalResults = 0,
  onClose,
  fileId = null,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [openSection, setOpenSection] = useState<string>('industry');

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useCompanyFilterStatistics({ fileId });

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearch]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    count += filters.industries.length;
    count += filters.locations.length;
    count += filters.stages.length;
    count += filters.employeeRanges.length;
    count += filters.revenueRanges.length;
    if (filters.hasApolloId !== null) count++;
    if (filters.isPromoted !== null) count++;
    if (filters.foundedYearMin !== null) count++;
    if (filters.foundedYearMax !== null) count++;
    return count;
  }, [filters]);

  // Reset all filters
  const handleReset = useCallback(() => {
    setLocalSearch("");
    onFiltersChange({
      search: "",
      industries: [],
      locations: [],
      stages: [],
      employeeRanges: [],
      revenueRanges: [],
      hasApolloId: null,
      isPromoted: null,
      technologies: [],
      fundingStages: [],
      foundedYearMin: null,
      foundedYearMax: null,
    });
  }, [onFiltersChange]);

  // Update filter helper
  const updateFilter = useCallback(
    <K extends keyof DatabaseFilters>(key: K, value: DatabaseFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange]
  );

  // Toggle array item helper
  const toggleArrayItem = useCallback((field: keyof DatabaseFilters, value: string) => {
    const current = filters[field] as string[];
    const updated = current.includes(value)
      ? current.filter(i => i !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [field]: updated });
  }, [filters, onFiltersChange]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* HEADER */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Database Filters
            </span>
            {activeFilterCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-purple-600 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeFilterCount > 0 && (
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
            placeholder="Search companies..." 
            className="pl-8 h-9 text-xs border-slate-200 bg-white"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                updateFilter("search", "");
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3">
          {statsLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              <span className="ml-2 text-xs text-purple-600">Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-purple-900">{(stats?.total || totalResults).toLocaleString()}</div>
                <div className="text-[9px] text-purple-600 uppercase font-semibold">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-900">{(stats?.hasApolloData || 0).toLocaleString()}</div>
                <div className="text-[9px] text-purple-600 uppercase font-semibold">Enriched</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-900">{(stats?.activeCount || 0).toLocaleString()}</div>
                <div className="text-[9px] text-purple-600 uppercase font-semibold">Active CRM</div>
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
                  id="has-apollo"
                  label="Has Apollo Data"
                  count={stats?.hasApolloData || 0}
                  checked={filters.hasApolloId === true}
                  onChange={(checked) => updateFilter("hasApolloId", checked ? true : null)}
                />
                <FilterCheckbox
                  id="no-apollo"
                  label="No Apollo Data"
                  count={(stats?.total || 0) - (stats?.hasApolloData || 0)}
                  checked={filters.hasApolloId === false}
                  onChange={(checked) => updateFilter("hasApolloId", checked ? false : null)}
                />
                <FilterCheckbox
                  id="is-active"
                  label="Active CRM"
                  count={stats?.activeCount || 0}
                  checked={filters.isPromoted === true}
                  onChange={(checked) => updateFilter("isPromoted", checked ? true : null)}
                />
                <FilterCheckbox
                  id="is-intelligence"
                  label="Intelligence Only"
                  count={(stats?.total || 0) - (stats?.activeCount || 0)}
                  checked={filters.isPromoted === false}
                  onChange={(checked) => updateFilter("isPromoted", checked ? false : null)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* INDUSTRY FILTER */}
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
              <CompanyIndustryFilterSelect
                selectedIndustries={filters.industries}
                onSelectionChange={(industries) => updateFilter("industries", industries)}
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* LOCATION FILTER */}
          <AccordionItem value="location" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  Location
                </div>
                {filters.locations.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 text-rose-700">
                    {filters.locations.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <CompanyLocationFilterSelect
                selectedLocations={filters.locations}
                onSelectionChange={(locations) => updateFilter("locations", locations)}
                type="location"
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* COMPANY STAGE */}
          <AccordionItem value="stage" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-indigo-500" />
                  Company Stage
                </div>
                {filters.stages.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-indigo-100 text-indigo-700">
                    {filters.stages.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <CompanyStageFilterSelect
                selectedStages={filters.stages}
                onSelectionChange={(stages) => updateFilter("stages", stages)}
                fileId={fileId}
              />
            </AccordionContent>
          </AccordionItem>

          {/* EMPLOYEE COUNT */}
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
              <div className="space-y-1">
                {EMPLOYEE_RANGES.map(range => (
                  <FilterCheckbox
                    key={range.value}
                    id={`emp-${range.value}`}
                    label={range.label}
                    count={stats?.employeeRanges?.[range.value] || 0}
                    checked={filters.employeeRanges.includes(range.value)}
                    onChange={() => toggleArrayItem('employeeRanges', range.value)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* REVENUE */}
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
                    key={range.value}
                    id={`rev-${range.value}`}
                    label={range.label}
                    count={stats?.revenueRanges?.[range.value] || 0}
                    checked={filters.revenueRanges.includes(range.value)}
                    onChange={() => toggleArrayItem('revenueRanges', range.value)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* FOUNDED YEAR */}
          <AccordionItem value="founded" className="border-b-0">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" />
                  Founded Year
                </div>
                {(filters.foundedYearMin !== null || filters.foundedYearMax !== null) && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700">
                    {(filters.foundedYearMin !== null ? 1 : 0) + (filters.foundedYearMax !== null ? 1 : 0)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="From"
                  value={filters.foundedYearMin || ""}
                  onChange={(e) =>
                    updateFilter(
                      "foundedYearMin",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="h-8 text-xs"
                  min={1900}
                  max={new Date().getFullYear()}
                />
                <span className="text-slate-400 text-xs">-</span>
                <Input
                  type="number"
                  placeholder="To"
                  value={filters.foundedYearMax || ""}
                  onChange={(e) =>
                    updateFilter(
                      "foundedYearMax",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="h-8 text-xs"
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      {/* FOOTER - Loading indicator */}
      {isLoading && (
        <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Filtering...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseFilterSidebar;