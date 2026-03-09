// src/components/sales/contacts-table/ContactFiltersSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table } from '@tanstack/react-table';
import { useDispatch } from 'react-redux';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Country, State } from 'country-state-city';
import {
  Building2, User, MapPin, FilterX, X,
  Briefcase, Tag, Sparkles, Search, Loader2, Users, Factory, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useFilterStatistics } from '@/hooks/sales/useFilterStatistics';
import { CompanyFilterSelect }    from './filters/CompanyFilterSelect';
import { LocationFilterSelect }   from './filters/LocationFilterSelect';
import { JobTitleFilterSelect }   from './filters/JobTitleFilterSelect';
import { IndustryFilterSelect }   from './filters/IndustryFilterSelect';
import { PipelineStagesFilter }   from './filters/PipelineStagesFilter';
import { setFilters as setReduxFilters } from '@/Redux/intelligenceSearchSlice';
import {
  ContactFilters, EMPTY_FILTERS,
  buildFilterSummary, countActiveFilters, hasActiveFilters,
  useFilterParams,
} from '@/hooks/sales/useContactFilterParams';

interface ContactFiltersSidebarProps {
  table:     Table<any>;
  isOpen?:   boolean;
  onClose?:  () => void;
  fileId?:   string | null;
  onSearch?: (reduxFilters: any, summary: string) => void;
}

// ── Location type detection (mirrors LocationFilterSelect logic) ──────────────
const _COUNTRY_NAMES = new Set(Country.getAllCountries().map(c => c.name));
const _STATE_NAMES   = new Set(State.getAllStates().map(s => s.name));
function getLocType(val: string): 'country' | 'state' | 'city' {
  if (_COUNTRY_NAMES.has(val)) return 'country';
  if (_STATE_NAMES.has(val))   return 'state';
  return 'city';
}

const SENIORITY_OPTIONS = [
  { id: 'owner',    label: 'Owner' },
  { id: 'founder',  label: 'Founder' },
  { id: 'c_suite',  label: 'C-Suite' },
  { id: 'partner',  label: 'Partner' },
  { id: 'vp',       label: 'VP' },
  { id: 'director', label: 'Director' },
  { id: 'manager',  label: 'Manager' },
  { id: 'senior',   label: 'Senior' },
  { id: 'entry',    label: 'Entry' },
];

const EMPLOYEE_RANGES = [
  '1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10001+',
];

const SOURCE_OPTIONS = [
  'Website','Referral','LinkedIn','Cold Outreach','Event','Inbound','Discovery',
];

// Apollo department ID → readable label
const DEPT_LABEL: Record<string, string> = {
  c_suite:                      'C-Suite',
  master_sales:                 'Sales',
  master_marketing:             'Marketing',
  master_human_resources:       'Human Resources',
  master_operations:            'Operations',
  master_finance:               'Finance',
  master_engineering:           'Engineering',
  master_information_technology:'IT',
  master_legal:                 'Legal',
  master_product:               'Product',
  master_business_development:  'Business Dev.',
  master_customer_success:      'Customer Success',
  master_data_science:          'Data Science',
  master_design:                'Design',
  master_education:             'Education',
  master_medical_health:        'Medical / Health',
};

const DEPT_OPTIONS = Object.entries(DEPT_LABEL).map(([id, label]) => ({ id, label }));

function toReduxFilters(f: ContactFilters): Record<string, any> {
  const out: Record<string, any> = {};
  if (f.search)                    out.search            = f.search;
  if (f.jobTitles.length)          out.jobTitles          = f.jobTitles;
  if (f.excludeJobTitles?.length)  out.excludeJobTitles   = f.excludeJobTitles;
  const seniorities = [...new Set([...f.managementLevels, ...f.seniorities])];
  if (seniorities.length)          out.seniorities        = seniorities;
  if (f.departments.length)        out.departments        = f.departments;
  if (f.functions.length)          out.functions          = f.functions;
  if (f.stages.length)             out.stages             = f.stages;
  if (f.sources.length)            out.sources            = f.sources;
  if (f.countries.length)          out.countries          = f.countries;
  if (f.states?.length)            out.states             = f.states;
  if (f.cities.length)             out.cities             = f.cities;
  if (f.industries.length)         out.industries         = f.industries;
  if (f.employeeCounts.length)     out.employeeCounts     = f.employeeCounts;
  if (f.companyIds.length)         out.companyIds         = f.companyIds;
  if (f.excludeCompanyIds.length)  out.excludeCompanyIds  = f.excludeCompanyIds;
  if (f.hasEmail)                  out.hasEmail           = true;
  if (f.hasPhone)                  out.hasPhone           = true;
  if (f.isEnriched)                out.isEnriched         = true;
  return out;
}

export function ContactFiltersSidebar({
  table, isOpen = true, onClose, fileId = null, onSearch,
}: ContactFiltersSidebarProps) {
  const dispatch = useDispatch();
  const { currentFilters, writeFilters, clearFilters } = useFilterParams();
  const { data: stats, isLoading: statsLoading } = useFilterStatistics({ fileId });

  const [filters,      setFilters]      = useState<ContactFilters>(currentFilters);
  const [openSections, setOpenSections] = useState<string[]>(['quick']);

  useEffect(() => {
    if (hasActiveFilters(currentFilters)) {
      dispatch(setReduxFilters(toReduxFilters(currentFilters)));
      onSearch?.(toReduxFilters(currentFilters), buildFilterSummary(currentFilters));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (filters.search !== currentFilters.search) applyFilters(filters);
    }, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const toggleArr = (field: keyof ContactFilters, value: string) => {
    setFilters(prev => {
      const cur = prev[field] as string[];
      return { ...prev, [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
    });
  };

  const applyFilters = useCallback((f: ContactFilters = filters) => {
    const redux = toReduxFilters(f);
    dispatch(setReduxFilters(redux));
    writeFilters(f, 1);
    onSearch?.(redux, buildFilterSummary(f));
  }, [filters, dispatch, writeFilters, onSearch]);

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    table.resetColumnFilters();
    dispatch(setReduxFilters({}));
    clearFilters();
  };

  const removeTag = (field: keyof ContactFilters, value?: string) => {
    setFilters(prev => {
      let updated: ContactFilters;
      if (typeof prev[field] === 'boolean') {
        updated = { ...prev, [field]: false };
      } else if (value !== undefined) {
        updated = { ...prev, [field]: (prev[field] as string[]).filter(v => v !== value) };
      } else {
        updated = { ...prev, [field]: '' };
      }
      const redux = toReduxFilters(updated);
      dispatch(setReduxFilters(redux));
      writeFilters(updated, 1);
      onSearch?.(redux, buildFilterSummary(updated));
      return updated;
    });
  };

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const activeTags = useMemo(() => {
    const tags: { field: keyof ContactFilters; value?: string; label: string; color: string }[] = [];
    const add = (f: keyof ContactFilters, v: string, l: string, c: string) => tags.push({ field:f, value:v, label:l, color:c });
    if (filters.search) tags.push({ field:'search', label:`"${filters.search}"`, color:'bg-slate-100 text-slate-700 border-slate-200' });
    filters.stages.forEach(v =>         add('stages',        v, v, 'bg-purple-50 text-purple-700 border-purple-200'));
    filters.jobTitles.forEach(v =>      add('jobTitles',     v, v, 'bg-blue-50 text-blue-700 border-blue-200'));
    filters.excludeJobTitles?.forEach(v => add('excludeJobTitles', v, `⊘ ${v}`, 'bg-red-50 text-red-700 border-red-200'));
    filters.seniorities.forEach(v =>    add('seniorities',   v, v, 'bg-sky-50 text-sky-700 border-sky-200'));
    filters.sources.forEach(v =>        add('sources',       v, v, 'bg-orange-50 text-orange-700 border-orange-200'));
    filters.countries.forEach(v =>      add('countries',     v, v, 'bg-rose-50 text-rose-700 border-rose-200'));
    filters.states?.forEach(v =>        add('states',        v, v, 'bg-violet-50 text-violet-700 border-violet-200'));
    filters.cities.forEach(v =>         add('cities',        v, v, 'bg-pink-50 text-pink-700 border-pink-200'));
    filters.industries.forEach(v =>     add('industries',    v, v, 'bg-emerald-50 text-emerald-700 border-emerald-200'));
    filters.employeeCounts.forEach(v => add('employeeCounts',v, v, 'bg-cyan-50 text-cyan-700 border-cyan-200'));
    if (filters.hasEmail)   tags.push({ field:'hasEmail',   label:'Has Email',  color:'bg-indigo-50 text-indigo-700 border-indigo-200' });
    if (filters.hasPhone)   tags.push({ field:'hasPhone',   label:'Has Phone',  color:'bg-indigo-50 text-indigo-700 border-indigo-200' });
    if (filters.isEnriched) tags.push({ field:'isEnriched', label:'Enriched',   color:'bg-indigo-50 text-indigo-700 border-indigo-200' });
    return tags;
  }, [filters]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* HEADER */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filters</span>
          <div className="flex items-center gap-0.5">
            {activeCount > 0 && (
              <button onClick={handleReset}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                <FilterX className="h-3 w-3" /> Clear
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
          <Input
            placeholder="Name, email, title…"
            className="pl-7 pr-6 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
          {filters.search && (
            <button onClick={() => setFilters(p => ({ ...p, search: '' }))}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-2 grid grid-cols-3 gap-1">
          {statsLoading ? (
            <div className="col-span-3 flex justify-center py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            </div>
          ) : (
            [
              { label: 'Total', value: stats?.total    || 0, c: 'text-slate-700' },
              { label: 'Email', value: stats?.hasEmail || 0, c: 'text-indigo-600' },
              { label: 'Phone', value: stats?.hasPhone || 0, c: 'text-violet-600' },
            ].map(({ label, value, c }) => (
              <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-center">
                <div className={cn('text-sm font-bold tabular-nums', c)}>{value.toLocaleString()}</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
              </div>
            ))
          )}
        </div>
        {!statsLoading && (
          <div className="mt-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 flex items-center justify-between">
            <span className="text-[9px] uppercase font-semibold text-emerald-600">Enriched</span>
            <span className="text-xs font-bold text-emerald-700">{(stats?.enriched || 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* ACTIVE TAGS */}
      {activeTags.length > 0 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
          <div className="flex flex-wrap gap-1">
            {activeTags.map((tag, i) => (
              <span key={i} className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                tag.color,
              )}>
                <span className="max-w-[90px] truncate">{tag.label}</span>
                <button onClick={() => removeTag(tag.field, tag.value)} className="hover:opacity-60">
                  <X size={8} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ACCORDION SECTIONS */}
      <ScrollArea className="flex-1 min-h-0">
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="w-full px-2 py-1">

          <Section value="quick" icon={<Sparkles size={12} className="text-amber-500" />} label="Quick Filters">
            <div className="space-y-0.5 pt-1">
              <FilterChip id="has-email" label="Has Email"  count={stats?.hasEmail || 0} checked={filters.hasEmail}   onChange={v => setFilters(p => ({ ...p, hasEmail: !!v }))} />
              <FilterChip id="has-phone" label="Has Phone"  count={stats?.hasPhone || 0} checked={filters.hasPhone}   onChange={v => setFilters(p => ({ ...p, hasPhone: !!v }))} />
              <FilterChip id="enriched"  label="Enriched"   count={stats?.enriched || 0} checked={filters.isEnriched} onChange={v => setFilters(p => ({ ...p, isEnriched: !!v }))} />
            </div>
          </Section>

          <Section value="stage" icon={<Tag size={12} className="text-purple-500" />} label="Pipeline Stage" count={filters.stages.length}>
            <PipelineStagesFilter
              selectedStages={filters.stages}
              onSelectionChange={stages => setFilters(p => ({ ...p, stages }))}
              fileId={fileId}
              stageCounts={stats?.stages}
            />
          </Section>

          <Section value="job" icon={<Briefcase size={12} className="text-blue-500" />} label="Job Titles"
            count={(filters.jobTitles.length || 0) + (filters.excludeJobTitles?.length || 0)}>
            <JobTitleFilterSelect
              selectedTitles={filters.jobTitles}
              onSelectionChange={jobTitles => setFilters(p => ({ ...p, jobTitles }))}
              excludeTitles={filters.excludeJobTitles || []}
              onExcludeChange={excludeJobTitles => setFilters(p => ({ ...p, excludeJobTitles }))}
              fileId={fileId}
            />
          </Section>

          <Section value="seniority" icon={<User size={12} className="text-sky-500" />} label="Seniority"
            count={filters.seniorities.length + filters.departments.length}>
            {/* Seniority */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1">
              {SENIORITY_OPTIONS.map(opt => (
                <FilterChip
                  key={opt.id} id={`sen-${opt.id}`} label={opt.label}
                  count={stats?.seniorities?.[opt.id] || 0}
                  checked={filters.seniorities.includes(opt.id)}
                  onChange={() => toggleArr('seniorities', opt.id)}
                />
              ))}
            </div>
            {/* Department — Apollo enrichment_person_metadata.departments */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1.5">Department</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-40 overflow-y-auto pr-1">
                {DEPT_OPTIONS.map(opt => (
                  <FilterChip key={opt.id} id={`dept-${opt.id}`} label={opt.label}
                    count={0}
                    checked={filters.departments.includes(opt.id)}
                    onChange={() => toggleArr('departments', opt.id)}
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section value="company" icon={<Building2 size={12} className="text-violet-500" />} label="Company"
            count={filters.companyIds.length + filters.excludeCompanyIds.length}>
            <CompanyFilterSelect
              selectedCompanyIds={filters.companyIds}
              onSelectionChange={companyIds => setFilters(p => ({ ...p, companyIds }))}
              excludeCompanyIds={filters.excludeCompanyIds}
              onExcludeChange={excludeCompanyIds => setFilters(p => ({ ...p, excludeCompanyIds }))}
            />
          </Section>

          <Section value="industry" icon={<Factory size={12} className="text-emerald-500" />} label="Industry" count={filters.industries.length}>
            <IndustryFilterSelect
              selectedIndustries={filters.industries}
              onSelectionChange={industries => setFilters(p => ({ ...p, industries }))}
              fileId={fileId}
            />
          </Section>

          <Section value="emp" icon={<Users size={12} className="text-cyan-500" />} label="Company Size" count={filters.employeeCounts.length}>
            <div className="space-y-0.5 pt-1">
              {EMPLOYEE_RANGES.map(range => (
                <FilterChip key={range} id={`emp-${range}`} label={range}
                  count={stats?.employeeRanges?.[range] || 0}
                  checked={filters.employeeCounts.includes(range)}
                  onChange={() => toggleArr('employeeCounts', range)}
                />
              ))}
            </div>
          </Section>

          <Section value="source" icon={<Briefcase size={12} className="text-orange-400" />} label="Lead Source" count={filters.sources.length}>
            <div className="space-y-0.5 pt-1">
              {SOURCE_OPTIONS.map(src => (
                <FilterChip key={src} id={`src-${src}`} label={src}
                  count={stats?.sources?.[src] || 0}
                  checked={filters.sources.includes(src)}
                  onChange={() => toggleArr('sources', src)}
                />
              ))}
            </div>
          </Section>

          <Section value="location" icon={<MapPin size={12} className="text-rose-500" />} label="Location"
            count={(filters.countries.length || 0) + (filters.states?.length || 0) + (filters.cities.length || 0)}>
            <div className="pt-1">
              <LocationFilterSelect
                type="all"
                selectedLocations={[
                  ...(filters.countries || []),
                  ...(filters.states    || []),
                  ...(filters.cities    || []),
                ]}
                onSelectionChange={locs => {
                  // Split into countries / states / cities by type
                  const countries: string[] = [];
                  const states:    string[] = [];
                  const cities:    string[] = [];
                  locs.forEach(val => {
                    const t = getLocType(val);
                    if      (t === 'country') countries.push(val);
                    else if (t === 'state')   states.push(val);
                    else                      cities.push(val);
                  });
                  setFilters(p => ({ ...p, countries, states, cities }));
                }}
                fileId={fileId}
              />
            </div>
          </Section>

        </Accordion>
      </ScrollArea>

      {/* SEARCH BUTTON */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-white">
        <button
          onClick={() => applyFilters()}
          className={cn(
            'w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all',
            activeCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
          )}
        >
          <Search className="h-3.5 w-3.5" />
          {activeCount > 0 ? `Search · ${activeCount} filter${activeCount !== 1 ? 's' : ''}` : 'Search'}
        </button>
      </div>
    </div>
  );
}

function Section({ value, icon, label, count, children }: {
  value: string; icon: React.ReactNode; label: string; count?: number; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b border-slate-50 last:border-0">
      <AccordionTrigger className="px-2 py-2 hover:no-underline hover:bg-slate-50/80 rounded-lg group [&>svg]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-slate-700">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!!count && count > 0 && (
              <span className="h-4 px-1.5 text-[9px] bg-indigo-100 text-indigo-700 rounded-full font-semibold flex items-center">
                {count}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-90" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

function FilterChip({ id, label, count, checked, onChange }: {
  id: string; label: string; count: number; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={cn(
      'flex items-center justify-between rounded-md px-2 py-1 cursor-pointer transition-colors',
      checked ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50',
    )}>
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={onChange}
          className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
        />
        <span className={cn('text-xs transition-colors', checked ? 'text-indigo-800 font-medium' : 'text-slate-600')}>
          {label}
        </span>
      </div>
      {count > 0 && (
        <span className="text-[10px] text-slate-400 tabular-nums">{count.toLocaleString()}</span>
      )}
    </label>
  );
}