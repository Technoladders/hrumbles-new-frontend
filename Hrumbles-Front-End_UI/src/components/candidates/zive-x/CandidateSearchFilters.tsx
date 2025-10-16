// src/components/candidates/zive-x/CandidateSearchFilters.tsx

import { useState, FC, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MandatoryTagSelector, Tag as SearchTag } from '@/components/candidates/zive-x/MandatoryTagSelector';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchFilters } from '@/types/candidateSearch';
import { Clock } from 'lucide-react';
import { City } from 'country-state-city';

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string;
}

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ onSearch, isSearching, initialFilters, organizationId }) => {
  const [keywords, setKeywords] = useState<SearchTag[]>(initialFilters?.keywords || []);
  const [locations, setLocations] = useState<SearchTag[]>(initialFilters?.locations || []);
  const [skills, setSkills] = useState<SearchTag[]>(initialFilters?.skills || []);
  const [companies, setCompanies] = useState<SearchTag[]>(initialFilters?.companies || []);
  const [educations, setEducations] = useState<SearchTag[]>(initialFilters?.educations || []);
  const [currentCompany, setCurrentCompany] = useState<SearchTag[]>(initialFilters?.current_company || []);
  const [currentDesignation, setCurrentDesignation] = useState<SearchTag[]>(initialFilters?.current_designation || []);
  const [minExp, setMinExp] = useState(initialFilters?.min_exp?.toString() || '');
  const [maxExp, setMaxExp] = useState(initialFilters?.max_exp?.toString() || '');
  const [datePosted, setDatePosted] = useState(initialFilters?.date_posted || 'all_time');

  useEffect(() => {
    setKeywords(initialFilters?.keywords || []);
    setLocations(initialFilters?.locations || []);
    setSkills(initialFilters?.skills || []);
    setCompanies(initialFilters?.companies || []);
    setEducations(initialFilters?.educations || []);
    setCurrentCompany(initialFilters?.current_company || []);
    setCurrentDesignation(initialFilters?.current_designation || []);
    setMinExp(initialFilters?.min_exp?.toString() || '');
    setMaxExp(initialFilters?.max_exp?.toString() || '');
    setDatePosted(initialFilters?.date_posted || 'all_time');
  }, [initialFilters]);

  const experienceOptions = Array.from({ length: 31 }, (_, i) => i);

  const fetchGenericSuggestions = useCallback((rpcName: string) => async (query: string) => {
    if (query.length < 2) return [];
    const { data, error } = await supabase.rpc(rpcName, { p_organization_id: organizationId, p_search_term: query });
    if (error) { console.error(error); return []; }
    return data.map((item: any) => item.suggestion || item.location || item.skill);
  }, [organizationId]);
  
  const fetchKeywordSuggestions = fetchGenericSuggestions('get_keyword_suggestions');
  const fetchSkillSuggestions = fetchGenericSuggestions('get_org_skills_by_search');
  const fetchCompanySuggestions = fetchGenericSuggestions('get_company_suggestions');
  const fetchEducationSuggestions = fetchGenericSuggestions('get_education_suggestions');
  const fetchCurrentCompanySuggestions = fetchGenericSuggestions('get_current_company_suggestions');
  const fetchCurrentDesignationSuggestions = fetchGenericSuggestions('get_current_designation_suggestions');

  const allIndianCities = useMemo(() => City.getCitiesOfCountry('IN').map(city => city.name), []);

  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    return allIndianCities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [allIndianCities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keywords, skills, companies, educations, locations, 
      current_company: currentCompany, 
      current_designation: currentDesignation,
      min_exp: minExp ? parseInt(minExp) : null,
      max_exp: maxExp ? parseInt(maxExp) : null,
      date_posted: datePosted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
          <MandatoryTagSelector value={keywords} onChange={setKeywords} placeholder="Type skills, designation, etc." fetchSuggestions={fetchKeywordSuggestions} queryKey="keywordSuggestions" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
          <MandatoryTagSelector value={skills} onChange={setSkills} placeholder="Filter by specific skills..." fetchSuggestions={fetchSkillSuggestions} queryKey="skillSuggestions" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <MandatoryTagSelector value={currentCompany} onChange={setCurrentCompany} placeholder="Type name..." fetchSuggestions={fetchCurrentCompanySuggestions} queryKey="currentCompanySuggestions" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <MandatoryTagSelector value={currentDesignation} onChange={setCurrentDesignation} placeholder="e.g., Data Analyst" fetchSuggestions={fetchCurrentDesignationSuggestions} queryKey="currentDesignationSuggestions" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience</label>
            <Select value={minExp} onValueChange={setMinExp}><SelectTrigger><SelectValue placeholder="Years" /></SelectTrigger><SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} Years</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Experience</label>
            <Select value={maxExp} onValueChange={setMaxExp}><SelectTrigger><SelectValue placeholder="Years" /></SelectTrigger><SelectContent>{experienceOptions.map(y => <SelectItem key={y} value={y.toString()}>{y} Years</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <MandatoryTagSelector value={locations} onChange={setLocations} placeholder="Search for cities in India..." fetchSuggestions={fetchLocationSuggestions} queryKey="locationSuggestions" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Posted</label>
          <div className="flex flex-wrap gap-2">
            <ToggleGroup type="single" value={datePosted} onValueChange={val => { if (val) setDatePosted(val); }} defaultValue="all_time" className="flex flex-wrap gap-2">
              <ToggleGroupItem value="all_time" className='hover:bg-gray-200'>All Time</ToggleGroupItem>
              <ToggleGroupItem value="last_24_hours" className='hover:bg-gray-200'>24h</ToggleGroupItem>
              <ToggleGroupItem value="last_7_days" className='hover:bg-gray-200'>7d</ToggleGroupItem>
              <ToggleGroupItem value="last_14_days" className='hover:bg-gray-200'>14d</ToggleGroupItem>
              <ToggleGroupItem value="last_30_days" className='hover:bg-gray-200'>30d</ToggleGroupItem>
            </ToggleGroup>
          </div>
          </div>
      </div>
      {/* <Accordion type="multiple" className="space-y-0">
        <AccordionItem value="skills" className="border border-gray-200 rounded-xl mx-0 mb-2"><AccordionTrigger className="px-6 py-4">Skills</AccordionTrigger><AccordionContent className="px-6 pb-6"><MandatoryTagSelector value={skills} onChange={setSkills} placeholder="Filter by specific skills..." fetchSuggestions={fetchSkillSuggestions} queryKey="skillSuggestions" /></AccordionContent></AccordionItem>
        <AccordionItem value="employment" className="border border-gray-200 rounded-xl mx-0 mb-2"><AccordionTrigger className="px-6 py-4">Employment History</AccordionTrigger><AccordionContent className="px-6 pb-6"><MandatoryTagSelector value={companies} onChange={setCompanies} placeholder="Filter by past companies..." fetchSuggestions={fetchCompanySuggestions} queryKey="companySuggestions" /></AccordionContent></AccordionItem>
        <AccordionItem value="education" className="border border-gray-200 rounded-xl mx-0 mb-2"><AccordionTrigger className="px-6 py-4">Education</AccordionTrigger><AccordionContent className="px-6 pb-6"><MandatoryTagSelector value={educations} onChange={setEducations} placeholder="Filter by degree or institution..." fetchSuggestions={fetchEducationSuggestions} queryKey="educationSuggestions" /></AccordionContent></AccordionItem>
        <AccordionItem value="date" className="border border-gray-200 rounded-xl mx-0 mb-2">
          <AccordionTrigger className="px-6 py-4"><div className="flex items-center"><Clock className="h-4 w-4 mr-2" /><span>Date Posted</span></div></AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ToggleGroup type="single" value={datePosted} onValueChange={val => { if (val) setDatePosted(val); }} defaultValue="all_time" className="flex flex-wrap gap-2">
              <ToggleGroupItem value="all_time">All Time</ToggleGroupItem>
              <ToggleGroupItem value="last_24_hours">24h</ToggleGroupItem>
              <ToggleGroupItem value="last_7_days">7d</ToggleGroupItem>
              <ToggleGroupItem value="last_14_days">14d</ToggleGroupItem>
              <ToggleGroupItem value="last_30_days">30d</ToggleGroupItem>
            </ToggleGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion> */}
      <div className="pt-4">
        <Button type="submit" size="lg" className="w-full">{isSearching ? 'Searching...' : '🔍 Find Candidates'}</Button>
      </div>
    </form>
  );
};
export default CandidateSearchFilters;