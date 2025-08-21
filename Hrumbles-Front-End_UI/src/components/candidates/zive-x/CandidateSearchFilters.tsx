// src/components/candidates/zive-x/CandidateSearchFilters.tsx

import { useState, FC } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchFilters } from '@/types/candidateSearch';

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
}

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ onSearch, isSearching, initialFilters }) => {
  const [keywords, setKeywords] = useState(initialFilters?.keywords?.join(', ') || '');
  const [locations, setLocations] = useState(initialFilters?.locations?.join(', ') || '');
  const [minExp, setMinExp] = useState(initialFilters?.min_exp?.toString() || '');
  const [maxExp, setMaxExp] = useState(initialFilters?.max_exp?.toString() || '');
  const [minSalary, setMinSalary] = useState(initialFilters?.min_salary?.toString() || '');
  const [maxSalary, setMaxSalary] = useState(initialFilters?.max_salary?.toString() || '');
  const [gender, setGender] = useState(initialFilters?.gender || 'All candidates');
  const [noticePeriod, setNoticePeriod] = useState(initialFilters?.notice_period || 'Any');
  const [companies, setCompanies] = useState(initialFilters?.companies?.join(', ') || '');
  const [educations, setEducations] = useState(initialFilters?.educations?.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      locations: locations.split(',').map(l => l.trim()).filter(Boolean),
      min_exp: minExp ? parseInt(minExp) : null,
      max_exp: maxExp ? parseInt(maxExp) : null,
      min_salary: minSalary ? parseFloat(minSalary) : null,
      max_salary: maxSalary ? parseFloat(maxSalary) : null,
      gender: gender,
      notice_period: noticePeriod,
      companies: companies.split(',').map(c => c.trim()).filter(Boolean),
      educations: educations.split(',').map(e => e.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-white space-y-4">
        <div>
          <label className="text-sm font-medium">Keywords</label>
          <Input placeholder="Skills, designation, company..." value={keywords} onChange={e => setKeywords(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minExp" className="text-sm font-medium">Min Experience</label>
            <Input id="minExp" type="number" placeholder="Years" value={minExp} onChange={e => setMinExp(e.target.value)} />
          </div>
          <div>
            <label htmlFor="maxExp" className="text-sm font-medium">Max Experience</label>
            <Input id="maxExp" type="number" placeholder="Years" value={maxExp} onChange={e => setMaxExp(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="locations" className="text-sm font-medium">Current location of candidate</label>
          <Input id="locations" placeholder="Add locations, comma separated" value={locations} onChange={e => setLocations(e.target.value)} />
        </div>
        {/* RESPONSIVE CHANGE HERE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minSalary" className="text-sm font-medium">Min Salary (Lacs)</label>
            <Input id="minSalary" type="number" placeholder="e.g., 5" value={minSalary} onChange={e => setMinSalary(e.target.value)} />
          </div>
          <div>
            <label htmlFor="maxSalary" className="text-sm font-medium">Max Salary (Lacs)</label>
            <Input id="maxSalary" type="number" placeholder="e.g., 15" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} />
          </div>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-2" defaultValue={['employment', 'education', 'diversity']}>
        <AccordionItem value="employment" className="border rounded-lg bg-white px-4">
          <AccordionTrigger>Employment Details</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Department / Role / Industry / Company</label>
              <Input placeholder="e.g., IT Support, Software Product" value={companies} onChange={e => setCompanies(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Notice Period</label>
              <ToggleGroup type="single" value={noticePeriod} onValueChange={val => { if (val) setNoticePeriod(val); }} defaultValue="Any">
                <ToggleGroupItem value="Any">Any</ToggleGroupItem>
                <ToggleGroupItem value="15 Days">0-15 days</ToggleGroupItem>
                <ToggleGroupItem value="1 month">1 month +</ToggleGroupItem>
                <ToggleGroupItem value="2 months">2 months +</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education" className="border rounded-lg bg-white px-4">
          <AccordionTrigger>Education Details</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">UG / PG / Doctorate Keywords</label>
              <Input placeholder="e.g., B.Tech, Computers, JNTU, Amity" value={educations} onChange={e => setEducations(e.target.value)} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="diversity" className="border rounded-lg bg-white px-4">
          <AccordionTrigger>Diversity & Additional Details</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
             <div>
                <label className="text-sm font-medium block mb-2">Gender</label>
                <ToggleGroup type="single" value={gender} onValueChange={val => { if (val) setGender(val); }} defaultValue="All candidates">
                    <ToggleGroupItem value="All candidates">All</ToggleGroupItem>
                    <ToggleGroupItem value="Male">Male</ToggleGroupItem>
                    <ToggleGroupItem value="Female">Female</ToggleGroupItem>
                </ToggleGroup>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSearching} size="lg" className="w-full md:w-auto">
          {isSearching ? 'Searching...' : 'Search Candidates'}
        </Button>
      </div>
    </form>
  );
};

export default CandidateSearchFilters;