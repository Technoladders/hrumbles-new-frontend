"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateDiscoveryFilters, resetFilters, setFilters } from '@/Redux/intelligenceSearchSlice';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, MapPin, Briefcase, Building2, Globe, Users, 
  DollarSign, Laptop, FilterX, Play, Briefcase as JobIcon 
} from 'lucide-react';

// --- CONSTANTS ---
const SENIORITIES = [
  { id: 'owner', label: 'Owner' },
  { id: 'founder', label: 'Founder' },
  { id: 'c_suite', label: 'C-Suite' },
  { id: 'vp', label: 'VP' },
  { id: 'director', label: 'Director' },
  { id: 'manager', label: 'Manager' },
  { id: 'head', label: 'Head' },
  { id: 'senior', label: 'Senior' },
];

const EMP_RANGES = [
  { id: '1,10', label: '1 - 10' },
  { id: '11,50', label: '11 - 50' },
  { id: '51,200', label: '51 - 200' },
  { id: '201,500', label: '201 - 500' },
  { id: '501,1000', label: '501 - 1k' },
  { id: '1001,5000', label: '1k - 5k' },
  { id: '5001,10000', label: '5k - 10k' },
  { id: '10001', label: '10k+' },
];

const EMAIL_STATUSES = [
    { id: 'verified', label: 'Verified' },
    { id: 'likely to engage', label: 'Likely to Engage' },
    { id: 'unverified', label: 'Unverified' }
];

// Add props interface
interface DiscoverySidebarProps {
  initialFilters?: any;
}

export function DiscoverySidebar({ initialFilters = {} }: DiscoverySidebarProps) {
  const dispatch = useDispatch();
  const reduxFilters = useSelector((state: any) => state.intelligenceSearch.filters || {});
  
  const [local, setLocal] = useState<any>({
    q_keywords: '',
    person_titles: '', 
    person_locations: '',
    person_seniorities: [],
    organization_names: '',
    organization_locations: '',
    organization_num_employees_ranges: [],
    revenue_min: '',
    revenue_max: '',
    technologies: '',
    contact_email_status: [],
    include_similar_titles: true,
    q_organization_job_titles: '', 
    job_posting_locations: '',
  });

  // Helper to safely join arrays for display (e.g. ["CEO", "CTO"] -> "CEO, CTO")
  const joinArr = (arr: any) => Array.isArray(arr) ? arr.join(', ') : '';

  // Initialize from Props (URL) or Redux
  useEffect(() => {
    // Prefer initialFilters (from URL) on first load, otherwise fallback to Redux or defaults
    const source = Object.keys(initialFilters).length > 0 ? initialFilters : reduxFilters;

    setLocal(prev => ({
        ...prev,
        q_keywords: source.q_keywords || '',
        person_titles: joinArr(source.person_titles),
        person_locations: joinArr(source.person_locations),
        person_seniorities: source.person_seniorities || [],
        organization_names: joinArr(source.organization_names),
        organization_locations: joinArr(source.organization_locations),
        organization_num_employees_ranges: source.organization_num_employees_ranges || [],
        revenue_min: source.revenue_range?.min || '',
        revenue_max: source.revenue_range?.max || '',
        technologies: joinArr(source.currently_using_any_of_technology_uids),
        contact_email_status: source.contact_email_status || [],
        include_similar_titles: source.include_similar_titles ?? true,
        q_organization_job_titles: joinArr(source.q_organization_job_titles),
        job_posting_locations: joinArr(source.organization_job_locations),
    }));
  }, [initialFilters]); // Dependency on initialFilters ensures URL changes update inputs

  // --- HANDLERS ---

  const handleRunSearch = () => {
    const toArray = (str: string) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const payload = {
        q_keywords: local.q_keywords,
        person_titles: toArray(local.person_titles),
        person_locations: toArray(local.person_locations),
        person_seniorities: local.person_seniorities,
        organization_names: toArray(local.organization_names), // Sent to Redux, Edge function handles logic
        organization_locations: toArray(local.organization_locations),
        organization_num_employees_ranges: local.organization_num_employees_ranges,
        q_organization_domains_list: [], 
        contact_email_status: local.contact_email_status,
        include_similar_titles: local.include_similar_titles,
        
        revenue_range: {
            min: local.revenue_min ? parseInt(local.revenue_min) : null,
            max: local.revenue_max ? parseInt(local.revenue_max) : null
        },
        
        currently_using_any_of_technology_uids: toArray(local.technologies),
        q_organization_job_titles: toArray(local.q_organization_job_titles),
        organization_job_locations: toArray(local.job_posting_locations),
    };

    dispatch(setFilters(payload));
  };

  const toggleArrayItem = (field: string, value: string) => {
    setLocal((prev: any) => {
      const current = prev[field] || [];
      const updated = current.includes(value) 
        ? current.filter((i: string) => i !== value) 
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setLocal({
        q_keywords: '', person_titles: '', person_locations: '', person_seniorities: [],
        organization_names: '', organization_locations: '', organization_num_employees_ranges: [],
        revenue_min: '', revenue_max: '', technologies: '', contact_email_status: [],
        q_organization_job_titles: '', job_posting_locations: ''
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-xl z-30 w-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-100 to-white flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-900">
               Search People
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 text-[10px] text-red-500 font-bold hover:bg-red-50">
            <FilterX className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        {/* MAIN KEYWORD SEARCH */}
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-purple-400" size={14} />
            <Input 
                placeholder="Search Name or Keywords..." 
                className="pl-8 h-9 text-xs border-purple-200 bg-white focus-visible:ring-purple-500"
                value={local.q_keywords}
                onChange={(e) => setLocal({...local, q_keywords: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && handleRunSearch()}
            />
        </div>
        
        <Button onClick={handleRunSearch} size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-xs font-bold shadow-sm">
            <Play size={10} className="mr-2 fill-current"/> Run Search
        </Button>
      </div>

      {/* ACCORDION FILTERS */}
      <ScrollArea className="flex-1">
        <Accordion type="multiple" defaultValue={['person', 'company']} className="w-full px-2 py-2">
            
            {/* 1. PERSON DETAILS */}
            <AccordionItem value="person" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><Briefcase size={14} className="text-slate-400"/> Professional Info</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Job Titles</Label>
                        <Input 
                            placeholder="e.g. CEO, Marketing Manager" 
                            className="h-8 text-xs"
                            value={local.person_titles}
                            onChange={(e) => setLocal({...local, person_titles: e.target.value})}
                        />
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox 
                                id="similar_titles" 
                                checked={local.include_similar_titles}
                                onCheckedChange={(c) => setLocal({...local, include_similar_titles: !!c})}
                            />
                            <label htmlFor="similar_titles" className="text-[10px] text-slate-500">Include similar titles</label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Seniority</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {SENIORITIES.map(s => (
                                <div key={s.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={s.id} 
                                        checked={local.person_seniorities.includes(s.id)} 
                                        onCheckedChange={() => toggleArrayItem('person_seniorities', s.id)}
                                    />
                                    <label htmlFor={s.id} className="text-[10px] text-slate-600">{s.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* 2. LOCATION */}
            <AccordionItem value="location" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> Locations</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Person Location</Label>
                        <Input 
                            placeholder="City, State, Country..." 
                            className="h-8 text-xs"
                            value={local.person_locations}
                            onChange={(e) => setLocal({...local, person_locations: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Company HQ Location</Label>
                        <Input 
                            placeholder="City, State, Country..." 
                            className="h-8 text-xs"
                            value={local.organization_locations}
                            onChange={(e) => setLocal({...local, organization_locations: e.target.value})}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* 3. COMPANY DETAILS */}
            <AccordionItem value="company" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><Building2 size={14} className="text-slate-400"/> Company Info</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Company Names</Label>
                        <Input 
                            placeholder="e.g. Microsoft, Stripe" 
                            className="h-8 text-xs"
                            value={local.organization_names}
                            onChange={(e) => setLocal({...local, organization_names: e.target.value})}
                        />
                        <p className="text-[9px] text-slate-400 mt-1">
                            Matches keywords in company names.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Employee Count</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {EMP_RANGES.map(r => (
                                <div key={r.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={r.id}
                                        checked={local.organization_num_employees_ranges.includes(r.id)}
                                        onCheckedChange={() => toggleArrayItem('organization_num_employees_ranges', r.id)}
                                    />
                                    <label htmlFor={r.id} className="text-[10px] text-slate-600">{r.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><DollarSign size={10}/> Revenue (USD)</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="Min" 
                                type="number" 
                                className="h-7 text-xs"
                                value={local.revenue_min}
                                onChange={(e) => setLocal({...local, revenue_min: e.target.value})}
                            />
                            <span className="text-slate-400">-</span>
                            <Input 
                                placeholder="Max" 
                                type="number" 
                                className="h-7 text-xs"
                                value={local.revenue_max}
                                onChange={(e) => setLocal({...local, revenue_max: e.target.value})}
                            />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* 4. TECHNOLOGIES */}
            <AccordionItem value="tech" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><Laptop size={14} className="text-slate-400"/> Technologies</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Using Tech (Any)</Label>
                        <Input 
                            placeholder="e.g. Salesforce, HubSpot, AWS" 
                            className="h-8 text-xs"
                            value={local.technologies}
                            onChange={(e) => setLocal({...local, technologies: e.target.value})}
                        />
                        <p className="text-[9px] text-slate-400">Use underscores for spaces (e.g. google_analytics)</p>
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* 5. JOB POSTINGS */}
            <AccordionItem value="jobs" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><JobIcon size={14} className="text-slate-400"/> Hiring Intent</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Active Job Titles</Label>
                        <Input 
                            placeholder="e.g. Account Executive" 
                            className="h-8 text-xs"
                            value={local.q_organization_job_titles}
                            onChange={(e) => setLocal({...local, q_organization_job_titles: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-slate-500 font-bold">Job Location</Label>
                        <Input 
                            placeholder="City, State..." 
                            className="h-8 text-xs"
                            value={local.job_posting_locations}
                            onChange={(e) => setLocal({...local, job_posting_locations: e.target.value})}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* 6. EMAIL STATUS */}
            <AccordionItem value="email" className="border-b border-slate-100">
                <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2"><Users size={14} className="text-slate-400"/> Contact Info</div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-2 pt-2">
                    {EMAIL_STATUSES.map(status => (
                        <div key={status.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={status.id}
                                checked={local.contact_email_status.includes(status.id)}
                                onCheckedChange={() => toggleArrayItem('contact_email_status', status.id)}
                            />
                            <label htmlFor={status.id} className="text-[10px] text-slate-600">{status.label}</label>
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>

        </Accordion>
      </ScrollArea>
    </div>
  );
}