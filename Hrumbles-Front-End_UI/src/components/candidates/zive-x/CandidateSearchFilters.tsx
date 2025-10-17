// src/components/candidates/zive-x/CandidateSearchFilters.tsx

import { useState, FC, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MandatoryTagSelector, Tag as SearchTag } from '@/components/candidates/zive-x/MandatoryTagSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchFilters } from '@/types/candidateSearch';
import { City } from 'country-state-city';

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string;
}

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ onSearch, isSearching, initialFilters, organizationId }) => {
  const [name, setName] = useState<SearchTag[]>([]);
  const [email, setEmail] = useState<SearchTag[]>([]);
  const [keywords, setKeywords] = useState<SearchTag[]>([]);
  const [skills, setSkills] = useState<SearchTag[]>([]);
  const [pastCompanies, setPastCompanies] = useState<SearchTag[]>([]);
  const [educations, setEducations] = useState<SearchTag[]>([]);
  const [locations, setLocations] = useState<SearchTag[]>([]);
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentDesignation, setCurrentDesignation] = useState('');
  const [minExp, setMinExp] = useState('');
  const [maxExp, setMaxExp] = useState('');
  const [minCurrentSalary, setMinCurrentSalary] = useState('');
  const [maxCurrentSalary, setMaxCurrentSalary] = useState('');
  const [minExpectedSalary, setMinExpectedSalary] = useState('');
  const [maxExpectedSalary, setMaxExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState<string[]>([]);
  const [datePosted, setDatePosted] = useState('all_time');

  useEffect(() => {
    setName(initialFilters?.name || []);
    setEmail(initialFilters?.email || []);
    setKeywords(initialFilters?.keywords || []);
    setSkills(initialFilters?.skills || []);
    setPastCompanies(initialFilters?.companies || []);
    setEducations(initialFilters?.educations || []);
    setLocations(initialFilters?.locations || []);
    setCurrentCompany(initialFilters?.current_company || '');
    setCurrentDesignation(initialFilters?.current_designation || '');
    setMinExp(initialFilters?.min_exp?.toString() || '');
    setMaxExp(initialFilters?.max_exp?.toString() || '');
    setMinCurrentSalary(initialFilters?.min_current_salary?.toString() || '');
    setMaxCurrentSalary(initialFilters?.max_current_salary?.toString() || '');
    setMinExpectedSalary(initialFilters?.min_expected_salary?.toString() || '');
    setMaxExpectedSalary(initialFilters?.max_expected_salary?.toString() || '');
    setNoticePeriod(initialFilters?.notice_periods || []);
    setDatePosted(initialFilters?.date_posted || 'all_time');
  }, [initialFilters]);

  const experienceOptions = Array.from({ length: 31 }, (_, i) => i);

  const fetchGenericSuggestions = useCallback((rpcName: string) => async (query: string) => {
    if (query.length < 2) return [];
    const { data, error } = await supabase.rpc(rpcName, { p_organization_id: organizationId, p_search_term: query });
    if (error) { console.error(error); return []; }
    return data.map((item: any) => item.suggestion || item.location || item.skill);
  }, [organizationId]);

  const fetchNameSuggestions = fetchGenericSuggestions('get_name_suggestions');
  const fetchEmailSuggestions = fetchGenericSuggestions('get_email_suggestions');
  const fetchSkillSuggestions = fetchGenericSuggestions('get_org_skills_by_search');
  const fetchCompanySuggestions = fetchGenericSuggestions('get_company_suggestions');
  const fetchEducationSuggestions = fetchGenericSuggestions('get_education_suggestions');
  
  const allIndianCities = useMemo(() => City.getCitiesOfCountry('IN').map(c => c.name), []);
  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    return allIndianCities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [allIndianCities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      name, email, keywords, skills, educations, locations,
      companies: pastCompanies,
      current_company: currentCompany,
      current_designation: currentDesignation,
      min_exp: minExp ? parseInt(minExp) : null,
      max_exp: maxExp ? parseInt(maxExp) : null,
      min_current_salary: minCurrentSalary ? parseFloat(minCurrentSalary) : null,
      max_current_salary: maxCurrentSalary ? parseFloat(maxCurrentSalary) : null,
      min_expected_salary: minExpectedSalary ? parseFloat(minExpectedSalary) : null,
      max_expected_salary: maxExpectedSalary ? parseFloat(maxExpectedSalary) : null,
      notice_periods: noticePeriod,
      date_posted: datePosted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><MandatoryTagSelector value={name} onChange={setName} placeholder="Search by name..." fetchSuggestions={fetchNameSuggestions} queryKey="nameSuggestions" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><MandatoryTagSelector value={email} onChange={setEmail} placeholder="Search by email..." fetchSuggestions={fetchEmailSuggestions} queryKey="emailSuggestions" /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label><MandatoryTagSelector value={keywords} onChange={setKeywords} placeholder="Type any term and press Enter..." disableSuggestions={true} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Experience</label><Select value={minExp} onValueChange={setMinExp}><SelectTrigger><SelectValue placeholder="Years" /></SelectTrigger><SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} Years</SelectItem>)}</SelectContent></Select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Experience</label><Select value={maxExp} onValueChange={setMaxExp}><SelectTrigger><SelectValue placeholder="Years" /></SelectTrigger><SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} Years</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label><Input placeholder="e.g., Google" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Designation</label><Input placeholder="e.g., Software Engineer" value={currentDesignation} onChange={e => setCurrentDesignation(e.target.value)} /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Skills</label><MandatoryTagSelector value={skills} onChange={setSkills} placeholder="Filter by specific skills..." fetchSuggestions={fetchSkillSuggestions} queryKey="skillSuggestions" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Past Employment</label><MandatoryTagSelector value={pastCompanies} onChange={setPastCompanies} placeholder="Filter by past companies..." fetchSuggestions={fetchCompanySuggestions} queryKey="companySuggestions" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Education</label><MandatoryTagSelector value={educations} onChange={setEducations} placeholder="Filter by degree or institution..." fetchSuggestions={fetchEducationSuggestions} queryKey="educationSuggestions" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><MandatoryTagSelector value={locations} onChange={setLocations} placeholder="Search for cities in India..." fetchSuggestions={fetchLocationSuggestions} queryKey="locationSuggestions" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Salary (LPA)</label><div className="flex gap-2"><Input type="number" placeholder="Min" value={minCurrentSalary} onChange={e => setMinCurrentSalary(e.target.value)} /><Input type="number" placeholder="Max" value={maxCurrentSalary} onChange={e => setMaxCurrentSalary(e.target.value)} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary (LPA)</label><div className="flex gap-2"><Input type="number" placeholder="Min" value={minExpectedSalary} onChange={e => setMinExpectedSalary(e.target.value)} /><Input type="number" placeholder="Max" value={maxExpectedSalary} onChange={e => setMaxExpectedSalary(e.target.value)} /></div></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
          <ToggleGroup type="multiple" value={noticePeriod} onValueChange={setNoticePeriod} className="flex-wrap justify-start gap-2">
            <ToggleGroupItem value="Immediate">Immediate</ToggleGroupItem><ToggleGroupItem value="15 Days">15 Days</ToggleGroupItem><ToggleGroupItem value="1 Month">1 Month</ToggleGroupItem><ToggleGroupItem value="2 Months">2 Months</ToggleGroupItem><ToggleGroupItem value="3 Months+">3 Months+</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Posted</label>
          <ToggleGroup type="single" value={datePosted} onValueChange={val => { if (val) setDatePosted(val); }} defaultValue="all_time" className="flex flex-wrap gap-2">
            <ToggleGroupItem value="all_time">All Time</ToggleGroupItem><ToggleGroupItem value="last_24_hours">24h</ToggleGroupItem><ToggleGroupItem value="last_7_days">7d</ToggleGroupItem><ToggleGroupItem value="last_14_days">14d</ToggleGroupItem><ToggleGroupItem value="last_30_days">30d</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="pt-4"><Button type="submit" size="lg" className="w-full">{isSearching ? 'Searching...' : '🔍 Find Candidates'}</Button></div>
    </form>
  );
};
export default CandidateSearchFilters;