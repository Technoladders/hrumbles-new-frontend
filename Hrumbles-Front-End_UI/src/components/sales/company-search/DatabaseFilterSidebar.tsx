// src/components/sales/company-search/DatabaseFilterSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search, X, Building2, MapPin, Users, TrendingUp,
  Tag, Calendar, Sparkles, ListFilter, FilterX, Loader2, Factory, ChevronRight, Globe,
} from "lucide-react";
import { ScrollArea }   from "@/components/ui/scroll-area";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import { CompanyIndustryFilterSelect }  from "./filters/CompanyIndustryFilterSelect";
import { CompanyLocationFilterSelect }  from "./filters/CompanyLocationFilterSelect";
import { CompanyStageFilterSelect }     from "./filters/CompanyStageFilterSelect";
import { CompanyFilterSelect }          from "@/components/sales/contacts-table/filters/CompanyFilterSelect";
import { useCompanyFilterStatistics }   from "@/hooks/sales/useCompanyFilterStatistics";
import type { CompanyDBFilters }        from "@/hooks/sales/useCompanyFilterParams";
import { EMPTY_DB_FILTERS }             from "@/hooks/sales/useCompanyFilterParams";

// ─── Dark theme shared styles ─────────────────────────────────────────────────

const DARK_INPUT = [
  'w-full h-8 text-xs rounded-lg',
  'border border-white/12',
  'placeholder:text-white/35 placeholder:italic placeholder:text-[10px]',
  'focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50',
  'transition-all',
].join(' ');

const DARK_INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)',
  WebkitTextFillColor: 'rgba(255,255,255,0.75)',
  caretColor: 'rgba(255,255,255,0.75)',
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMPLOYEE_RANGES = [
  { label: "1 – 10",      value: "1,10"       },
  { label: "11 – 50",     value: "11,50"      },
  { label: "51 – 200",    value: "51,200"     },
  { label: "201 – 500",   value: "201,500"    },
  { label: "501 – 1,000", value: "501,1000"   },
  { label: "1K – 5K",     value: "1001,5000"  },
  { label: "5K – 10K",    value: "5001,10000" },
  { label: "10K+",        value: "10000,"     },
];

const REVENUE_RANGES = [
  { label: "< 1M",        value: "0,1000000"           },
  { label: "1M – 10M",    value: "1000000,10000000"     },
  { label: "10M – 50M",   value: "10000000,50000000"    },
  { label: "50M – 100M",  value: "50000000,100000000"   },
  { label: "100M – 500M", value: "100000000,500000000"  },
  { label: "500M – 1B",   value: "500000000,1000000000" },
  { label: "1B+",         value: "1000000000,"          },
];

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ id, label, count, checked, onChange, compact = false }: {
  id: string; label: string; count?: number; checked: boolean;
  onChange: (checked: boolean) => void; compact?: boolean;
}) {
  return (
    <label htmlFor={id} className={cn(
      'flex items-center justify-between rounded-md cursor-pointer transition-colors select-none border group',
      compact ? 'px-1.5 py-1' : 'px-2 py-1',
      checked ? 'bg-indigo-500/20 border-indigo-400/35' : 'border-transparent hover:bg-white/5',
    )}>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded flex-shrink-0" style={{ accentColor: '#818cf8' }} />
        <span className={cn('text-xs transition-colors truncate', checked ? 'text-indigo-200 font-medium' : 'text-white/55')}>
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className={cn(
          'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 transition-colors',
          count > 0 ? 'text-white/50 bg-white/10' : 'text-white/25',
        )}>
          {count.toLocaleString()}
        </span>
      )}
    </label>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ value, icon, label, count, children }: {
  value: string; icon: React.ReactNode; label: string; count?: number; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b border-white/5 last:border-0">
      <AccordionTrigger className="px-2 py-2 rounded-lg transition-all group hover:bg-white/5 data-[state=open]:bg-white/5 [&>svg]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="opacity-70 group-hover:opacity-100 transition">{icon}</div>
            <span className="text-xs font-medium text-white group-hover:text-white/90 transition">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!!count && count > 0 && (
              <span className="h-4 px-1.5 text-[9px] bg-indigo-500/25 text-indigo-300 rounded-full font-semibold flex items-center">{count}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-white transition-transform group-data-[state=open]:rotate-90" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DatabaseFilterSidebarProps {
  filters:          CompanyDBFilters;
  onFiltersChange:  (filters: CompanyDBFilters) => void;
  isLoading?:       boolean;
  totalResults?:    number;
  onClose?:         () => void;
  fileId?:          string | null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DatabaseFilterSidebar: React.FC<DatabaseFilterSidebarProps> = ({
  filters,
  onFiltersChange,
  isLoading   = false,
  totalResults = 0,
  onClose,
  fileId = null,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [openSection, setOpenSection] = useState<string[]>(["company"]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: stats, isLoading: statsLoading } = useCompanyFilterStatistics({ fileId });

  useEffect(() => { setLocalSearch(filters.search); }, [filters.search]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (localSearch !== filters.search) onFiltersChange({ ...filters, search: localSearch });
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search)                  n++;
    n += (filters.companyIds     || []).length;
    n += (filters.industries     || []).length;
    n += (filters.locations      || []).length;
    n += (filters.stages         || []).length;
    n += (filters.employeeRanges || []).length;
    n += (filters.revenueRanges  || []).length;
    if (filters.isEnriched !== null) n++;
    if (filters.hasPhone   !== null) n++;
    if (filters.foundedYearMin !== null) n++;
    if (filters.foundedYearMax !== null) n++;
    return n;
  }, [filters]);

  const handleReset = useCallback(() => {
    setLocalSearch("");
    onFiltersChange(EMPTY_DB_FILTERS);
  }, [onFiltersChange]);

  const updateFilter = useCallback(
    <K extends keyof CompanyDBFilters>(key: K, value: CompanyDBFilters[K]) => {
      onFiltersChange({ ...filters, [key]: value });
    },
    [filters, onFiltersChange],
  );

  const toggleArrayItem = useCallback((field: keyof CompanyDBFilters, value: string) => {
    const current = (filters[field] as string[]) || [];
    const updated = current.includes(value) ? current.filter(i => i !== value) : [...current, value];
    onFiltersChange({ ...filters, [field]: updated });
  }, [filters, onFiltersChange]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden text-white">

      {/* ── ANIMATED BACKGROUND ── */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.25),transparent_40%),linear-gradient(135deg,#0b0b1f,#1a1040,#2b18e0)]" />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full top-[-100px] left-[-100px] animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px] animate-pulse" />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* HEADER */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2.5 border-b"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListFilter size={14} className="text-indigo-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">CRM Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center bg-indigo-500">{activeFilterCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFilterCount > 0 && (
                <button onClick={handleReset} className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                  <FilterX size={10} /> Clear
                </button>
              )}
              {onClose && (
                <button onClick={onClose} className="flex items-center text-white/40 hover:text-white/70 transition-colors p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search input */}
          <div className="relative mb-2.5">
            <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={12} />
            <input placeholder="Search companies…" className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
              value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
            {localSearch && (
              <button onClick={() => { setLocalSearch(""); updateFilter("search", ""); }}
                className="absolute right-2 top-2 text-white/40 hover:text-white/70 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {statsLoading ? (
              <div className="col-span-2 flex items-center justify-center py-2 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                <span className="text-xs text-indigo-300">Loading…</span>
              </div>
            ) : (
              <>
                {[
                  { val: (stats?.total || totalResults).toLocaleString(), label: 'Total' },
                  { val: (stats?.enrichedCount || 0).toLocaleString(), label: 'Enriched' },
                ].map(({ val, label }) => (
                  <div key={label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <div className="text-base font-bold text-white leading-tight">{val}</div>
                    <div className="text-[9px] text-indigo-300 uppercase font-semibold mt-0.5">{label}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <ScrollArea className="flex-1 min-h-0">
          <Accordion type="multiple" value={openSection} onValueChange={setOpenSection} className="w-full px-2 py-1">

            {/* Quick Filters */}
            <Section value="quick" icon={<Sparkles size={12} className="text-amber-400" />} label="Quick Filters"
              count={(filters.isEnriched !== null ? 1 : 0) + (filters.hasPhone !== null ? 1 : 0)}>
              <div className="pt-1 space-y-0.5">
                <FilterChip id="is-enriched" label="Is Enriched" count={stats?.enrichedCount}
                  checked={filters.isEnriched === true}
                  onChange={checked => updateFilter("isEnriched", checked ? true : null)} />
                <FilterChip id="has-phone" label="Has Phone Data" count={stats?.hasPhoneCount}
                  checked={filters.hasPhone === true}
                  onChange={checked => updateFilter("hasPhone", checked ? true : null)} />
              </div>
            </Section>

            {/* Company */}
            <Section value="company" icon={<Building2 size={12} className="text-violet-300" />} label="Company"
              count={(filters.companyIds || []).length}>
              <div className="pt-1">
                <CompanyFilterSelect
                  selectedCompanyIds={filters.companyIds || []}
                  onSelectionChange={ids => updateFilter("companyIds", ids)}
                />
              </div>
            </Section>

            {/* Industry */}
            <Section value="industry" icon={<Factory size={12} className="text-emerald-400" />} label="Industry"
              count={(filters.industries || []).length}>
              <div className="pt-1">
                <CompanyIndustryFilterSelect
                  selectedIndustries={filters.industries || []}
                  onSelectionChange={industries => updateFilter("industries", industries)}
                  fileId={fileId}
                />
              </div>
            </Section>

            {/* Location */}
            <Section value="location" icon={<MapPin size={12} className="text-pink-400" />} label="Location"
              count={(filters.locations || []).length}>
              <div className="pt-1">
                <CompanyLocationFilterSelect
                  selectedLocations={filters.locations || []}
                  onSelectionChange={locations => updateFilter("locations", locations)}
                  type="location"
                  fileId={fileId}
                />
              </div>
            </Section>

            {/* Company Stage */}
            <Section value="stage" icon={<Tag size={12} className="text-indigo-300" />} label="Company Stage"
              count={(filters.stages || []).length}>
              <div className="pt-1">
                <CompanyStageFilterSelect
                  selectedStages={filters.stages || []}
                  onSelectionChange={stages => updateFilter("stages", stages)}
                  fileId={fileId}
                />
              </div>
            </Section>

            {/* Revenue */}
            <Section value="revenue" icon={<TrendingUp size={12} className="text-green-400" />} label="Revenue"
              count={(filters.revenueRanges || []).length}>
              <div className="pt-1 space-y-0.5">
                {REVENUE_RANGES.map(range => (
                  <FilterChip key={range.value} id={`rev-${range.value}`} label={range.label}
                    count={stats?.revenueRanges?.[range.value]}
                    checked={(filters.revenueRanges || []).includes(range.value)}
                    onChange={() => toggleArrayItem("revenueRanges", range.value)}
                    compact />
                ))}
              </div>
            </Section>

            {/* Founded Year */}
            <Section value="founded" icon={<Calendar size={12} className="text-blue-300" />} label="Founded Year"
              count={(filters.foundedYearMin !== null || filters.foundedYearMax !== null) ? 1 : 0}>
              <div className="pt-1 flex items-center gap-2">
                <input type="number" placeholder="From" className={cn(DARK_INPUT, 'px-2')} style={DARK_INPUT_STYLE}
                  value={filters.foundedYearMin ?? ""}
                  onChange={e => updateFilter("foundedYearMin", e.target.value ? parseInt(e.target.value) : null)}
                  min={1900} max={new Date().getFullYear()} />
                <span className="text-white/30 text-xs flex-shrink-0">–</span>
                <input type="number" placeholder="To" className={cn(DARK_INPUT, 'px-2')} style={DARK_INPUT_STYLE}
                  value={filters.foundedYearMax ?? ""}
                  onChange={e => updateFilter("foundedYearMax", e.target.value ? parseInt(e.target.value) : null)}
                  min={1900} max={new Date().getFullYear()} />
              </div>
            </Section>

          </Accordion>
        </ScrollArea>

        {/* FOOTER — loading indicator */}
        {isLoading && (
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-indigo-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">Filtering…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseFilterSidebar;