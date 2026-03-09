// src/components/sales/contacts-v2/ContactsV2Sidebar.tsx
"use client";

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateLocalFilter,
  toggleLocalFilterArray,
  runSearch,
  resetFilters,
} from '@/Redux/contactsV2Slice';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase, Building2, MapPin, Users, Factory, Tag,
  Sparkles, Globe, Play, FilterX, Search, DollarSign, Laptop, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterSection, FilterCheckItem } from './filters/FilterSection';
import { LocationFilter } from './filters/LocationFilter';

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS = [
  { id: 'owner', label: 'Owner' }, { id: 'founder', label: 'Founder' },
  { id: 'c_suite', label: 'C-Suite' }, { id: 'partner', label: 'Partner' },
  { id: 'vp', label: 'VP' }, { id: 'head', label: 'Head' },
  { id: 'director', label: 'Director' }, { id: 'manager', label: 'Manager' },
  { id: 'senior', label: 'Senior' }, { id: 'entry', label: 'Entry' },
];

const EMPLOYEE_RANGES = [
  { id: '1-10', label: '1–10' }, { id: '11-50', label: '11–50' },
  { id: '51-200', label: '51–200' }, { id: '201-500', label: '201–500' },
  { id: '501-1000', label: '501–1k' }, { id: '1001-5000', label: '1k–5k' },
  { id: '5001-10000', label: '5k–10k' }, { id: '10001+', label: '10k+' },
];

const DISCOVERY_EMPLOYEE_RANGES = [
  { id: '1,10', label: '1–10' }, { id: '11,50', label: '11–50' },
  { id: '51,200', label: '51–200' }, { id: '201,500', label: '201–500' },
  { id: '501,1000', label: '501–1k' }, { id: '1001,5000', label: '1k–5k' },
  { id: '5001,10000', label: '5k–10k' }, { id: '10001', label: '10k+' },
];

const EMAIL_STATUS_OPTIONS = [
  { id: 'verified', label: 'Verified' },
  { id: 'likely to engage', label: 'Likely to Engage' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'unavailable', label: 'Unavailable' },
];

const CRM_STAGE_OPTIONS = [
  'New Lead', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost',
];

const CRM_SOURCE_OPTIONS = [
  'LinkedIn', 'Cold Call', 'Email Campaign', 'Referral', 'Website Form', 'Discovery', 'Other',
];

// ─── TagInput ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-300 border border-slate-600">
              {t}
              <button type="button" onClick={() => onChange(tags.filter(i => i !== t))} className="hover:opacity-60 transition-opacity">
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        placeholder={placeholder}
        className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          if (e.key === 'Backspace' && !draft && tags.length > 0) onChange(tags.slice(0, -1));
        }}
        onBlur={commit}
      />
      <p className="text-[9px] text-slate-600">Enter or comma to add</p>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function ContactsV2Sidebar() {
  const dispatch = useDispatch();
  const { localFilters, mode } = useSelector((state: any) => state.contactsV2);
  const f = localFilters;
  const isDiscovery = mode === 'discovery';

  const set = (patch: any) => dispatch(updateLocalFilter(patch));
  const toggle = (field: string, value: string) => dispatch(toggleLocalFilterArray({ field, value }));

  const activeCount = [
    f.search, f.q_keywords, f.personTitles,
    ...(f.jobTitles || []), ...(f.seniorities || []),
    ...(f.countries || []), ...(f.personLocations || []),
    ...(f.industries || []), ...(f.stages || []),
    ...(f.employeeCounts || []), ...(f.organizationEmployeeRanges || []),
    ...(f.companyNameTags || []), ...(f.contactEmailStatus || []),
    f.hasEmail && 'e', f.hasPhone && 'p', f.isEnriched && 'en',
    f.technologies, f.q_organization_job_titles,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-violet-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Filters
            </span>
            {activeCount > 0 && (
              <span className="bg-violet-500 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button
              onClick={() => dispatch(resetFilters())}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors font-semibold"
            >
              <FilterX size={11} />
              Clear
            </button>
          )}
        </div>

        {/* Keyword search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 text-slate-500 pointer-events-none" size={12} />
          <input
            placeholder={isDiscovery ? "Name, keyword…" : "Search contacts…"}
            className="w-full pl-7 pr-3 h-8 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            value={isDiscovery ? f.q_keywords : f.search}
            onChange={e => isDiscovery ? set({ q_keywords: e.target.value }) : set({ search: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && dispatch(runSearch())}
          />
        </div>
      </div>

      {/* ── Scrollable Filters ──────────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="py-1">

          {/* QUICK FILTERS (CRM only) */}
          {!isDiscovery && (
            <FilterSection title="Quick Filters" icon={<Sparkles size={12} />} accentColor="text-amber-400" defaultOpen activeCount={[f.hasEmail, f.hasPhone, f.isEnriched].filter(Boolean).length}>
              <FilterCheckItem id="qf-email" label="Has Email" checked={f.hasEmail} onChange={v => set({ hasEmail: v })} />
              <FilterCheckItem id="qf-phone" label="Has Phone" checked={f.hasPhone} onChange={v => set({ hasPhone: v })} />
              <FilterCheckItem id="qf-enriched" label="Enriched" checked={f.isEnriched} onChange={v => set({ isEnriched: v })} />
            </FilterSection>
          )}

          {/* JOB TITLE */}
          <FilterSection
            title={isDiscovery ? "Professional Info" : "Job Title"}
            icon={<Briefcase size={12} />}
            accentColor="text-sky-400"
            defaultOpen
            activeCount={
              isDiscovery
                ? [f.personTitles, ...(f.seniorities || [])].filter(Boolean).length
                : (f.jobTitles || []).length
            }
          >
            {isDiscovery ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block">Job Titles</label>
                  <input
                    placeholder="e.g. CEO, VP Marketing"
                    className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    value={f.personTitles || ''}
                    onChange={e => set({ personTitles: e.target.value })}
                  />
                  <p className="text-[9px] text-slate-600">Comma-separated</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="similar-titles"
                    type="checkbox"
                    checked={f.include_similar_titles ?? true}
                    onChange={e => set({ include_similar_titles: e.target.checked })}
                    className="h-3 w-3 rounded accent-violet-500"
                  />
                  <label htmlFor="similar-titles" className="text-[10px] text-slate-400">Include similar titles</label>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block">Seniority</label>
                  <div className="grid grid-cols-2 gap-1">
                    {SENIORITY_OPTIONS.map(o => (
                      <FilterCheckItem key={o.id} id={`d-sen-${o.id}`} label={o.label} checked={(f.seniorities || []).includes(o.id)} onChange={() => toggle('seniorities', o.id)} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <input
                    placeholder="Filter by job title"
                    className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    value={(f.jobTitles || []).join(', ')}
                    onChange={e => set({ jobTitles: e.target.value ? e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [] })}
                    onBlur={e => {
                      const v = e.target.value.trim();
                      if (v) set({ jobTitles: v.split(',').map((s: string) => s.trim()).filter(Boolean) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block">Seniority</label>
                  <div className="grid grid-cols-2 gap-1">
                    {SENIORITY_OPTIONS.slice(0, 8).map(o => (
                      <FilterCheckItem key={o.id} id={`c-sen-${o.id}`} label={o.label} checked={(f.seniorities || []).includes(o.id)} onChange={() => toggle('seniorities', o.id)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </FilterSection>

          {/* LOCATION */}
          <FilterSection
            title="Location"
            icon={<MapPin size={12} />}
            accentColor="text-rose-400"
            defaultOpen
            activeCount={isDiscovery ? (f.personLocations || []).length + (f.organizationLocations || []).length : (f.countries || []).length + (f.cities || []).length}
          >
            {isDiscovery ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block">Person Location</label>
                  <LocationFilter
                    selected={f.personLocations || []}
                    onChange={v => set({ personLocations: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500 block">Company HQ</label>
                  <LocationFilter
                    selected={f.organizationLocations || []}
                    onChange={v => set({ organizationLocations: v })}
                  />
                </div>
              </div>
            ) : (
              <LocationFilter
                selected={[...(f.countries || []), ...(f.cities || [])]}
                onChange={v => {
                  // Sort into countries vs cities for CRM
                  set({ countries: v, cities: [] });
                }}
              />
            )}
          </FilterSection>

          {/* COMPANY */}
          <FilterSection
            title="Company"
            icon={<Building2 size={12} />}
            accentColor="text-violet-400"
            activeCount={isDiscovery ? (f.companyNameTags || []).length : (f.companyIds || []).length}
          >
            {isDiscovery ? (
              <TagInput
                tags={f.companyNameTags || []}
                onChange={v => set({ companyNameTags: v })}
                placeholder="Type company name + Enter"
              />
            ) : (
              <input
                placeholder="Filter by company name"
                className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                value={(f.companyIds || []).join(', ')}
                onChange={e => set({ companySearch: e.target.value })}
              />
            )}
          </FilterSection>

          {/* EMPLOYEE COUNT */}
          <FilterSection
            title="Employee Count"
            icon={<Users size={12} />}
            accentColor="text-cyan-400"
            activeCount={isDiscovery ? (f.organizationEmployeeRanges || []).length : (f.employeeCounts || []).length}
          >
            <div className="grid grid-cols-2 gap-1">
              {(isDiscovery ? DISCOVERY_EMPLOYEE_RANGES : EMPLOYEE_RANGES).map(o => {
                const field = isDiscovery ? 'organizationEmployeeRanges' : 'employeeCounts';
                const arr = f[field] || [];
                return (
                  <FilterCheckItem
                    key={o.id}
                    id={`emp-${o.id}`}
                    label={o.label}
                    checked={arr.includes(o.id)}
                    onChange={() => toggle(field, o.id)}
                  />
                );
              })}
            </div>
          </FilterSection>

          {/* INDUSTRY */}
          <FilterSection
            title="Industry"
            icon={<Factory size={12} />}
            accentColor="text-emerald-400"
            activeCount={(f.industries || []).length}
          >
            <input
              placeholder="Search industry…"
              className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors mb-2"
              onChange={e => set({ industrySearch: e.target.value })}
            />
            {(f.industries || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {(f.industries || []).map((ind: string) => (
                  <span key={ind} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {ind}
                    <button type="button" onClick={() => toggle('industries', ind)} className="hover:opacity-60"><X size={8} /></button>
                  </span>
                ))}
              </div>
            )}
          </FilterSection>

          {/* CRM-only: Pipeline Stage + Source */}
          {!isDiscovery && (
            <>
              <FilterSection title="Pipeline Stage" icon={<Tag size={12} />} accentColor="text-purple-400" activeCount={(f.stages || []).length}>
                {CRM_STAGE_OPTIONS.map(s => (
                  <FilterCheckItem key={s} id={`stage-${s}`} label={s} checked={(f.stages || []).includes(s)} onChange={() => toggle('stages', s)} />
                ))}
              </FilterSection>

              <FilterSection title="Lead Source" icon={<Briefcase size={12} />} accentColor="text-amber-400" activeCount={(f.sources || []).length}>
                {CRM_SOURCE_OPTIONS.map(s => (
                  <FilterCheckItem key={s} id={`src-${s}`} label={s} checked={(f.sources || []).includes(s)} onChange={() => toggle('sources', s)} />
                ))}
              </FilterSection>
            </>
          )}

          {/* Discovery-only: Tech + Hiring Intent + Email Status */}
          {isDiscovery && (
            <>
              <FilterSection title="Technologies" icon={<Laptop size={12} />} accentColor="text-teal-400" activeCount={f.technologies ? 1 : 0}>
                <input
                  placeholder="e.g. salesforce, hubspot"
                  className="w-full h-8 px-3 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  value={f.technologies || ''}
                  onChange={e => set({ technologies: e.target.value })}
                />
                <p className="text-[9px] text-slate-600 mt-1">Comma-separated</p>
              </FilterSection>

              <FilterSection title="Revenue (USD)" icon={<DollarSign size={12} />} accentColor="text-yellow-400" activeCount={(f.revenue_min || f.revenue_max) ? 1 : 0}>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Min"
                    type="number"
                    className="flex-1 h-7 px-2 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    value={f.revenue_min || ''}
                    onChange={e => set({ revenue_min: e.target.value })}
                  />
                  <span className="text-slate-600 text-xs">–</span>
                  <input
                    placeholder="Max"
                    type="number"
                    className="flex-1 h-7 px-2 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    value={f.revenue_max || ''}
                    onChange={e => set({ revenue_max: e.target.value })}
                  />
                </div>
              </FilterSection>

              <FilterSection title="Email Status" icon={<Sparkles size={12} />} accentColor="text-pink-400" activeCount={(f.contactEmailStatus || []).length}>
                {EMAIL_STATUS_OPTIONS.map(o => (
                  <FilterCheckItem key={o.id} id={`es-${o.id}`} label={o.label} checked={(f.contactEmailStatus || []).includes(o.id)} onChange={() => toggle('contactEmailStatus', o.id)} />
                ))}
              </FilterSection>
            </>
          )}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </ScrollArea>

      {/* ── Run Search Button ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-3 border-t border-slate-800">
        <button
          onClick={() => dispatch(runSearch())}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors shadow-lg shadow-violet-900/40"
        >
          <Play size={11} className="fill-current" />
          Run Search
        </button>
      </div>
    </div>
  );
}