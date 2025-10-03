// src/components/candidates/zive-x/CandidateSearchFilters.tsx

import { useState, FC } from 'react';
import { SkillSelector } from '@/components/candidates/zive-x/SkillSelector'; // Import the new component
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchFilters } from '@/types/candidateSearch';
import { Search, MapPin, Briefcase, GraduationCap, Clock, TrendingUp } from 'lucide-react';

interface CandidateSearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string; 
}

const CandidateSearchFilters: FC<CandidateSearchFiltersProps> = ({ onSearch, isSearching, initialFilters, organizationId }) => {
  const [keywords, setKeywords] = useState(initialFilters?.keywords?.join(', ') || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initialFilters?.filter_skills || []);
  const [companyKeywords, setCompanyKeywords] = useState(initialFilters?.filter_companies?.join(', ') || '');
  const [educationKeywords, setEducationKeywords] = useState(initialFilters?.filter_educations?.join(', ') || '');
  const [locations, setLocations] = useState(initialFilters?.locations?.join(', ') || '');
  const [minExp, setMinExp] = useState(initialFilters?.min_exp?.toString() || '');
  const [maxExp, setMaxExp] = useState(initialFilters?.max_exp?.toString() || '');
  const [datePosted, setDatePosted] = useState(initialFilters?.date_posted || 'all_time');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      filter_skills: selectedSkills,
      filter_companies: companyKeywords.split(',').map(c => c.trim()).filter(Boolean),
      filter_educations: educationKeywords.split(',').map(e => e.trim()).filter(Boolean),
      locations: locations.split(',').map(l => l.trim()).filter(Boolean),
      min_exp: minExp ? parseInt(minExp) : null,
      max_exp: maxExp ? parseInt(maxExp) : null,
      date_posted: datePosted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Search Section */}
      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 p-6 rounded-xl border border-purple-100">
        <div className="flex items-center mb-4">
          <Search className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
            <Input 
              placeholder="e.g., Software Engineer, DevOps, Salesforce" 
              value={keywords} 
              onChange={e => setKeywords(e.target.value)}
              className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <Input 
              id="locations" 
              placeholder="e.g., Bangalore, Hyderabad, Remote" 
              value={locations} 
              onChange={e => setLocations(e.target.value)}
              className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Advanced Filters Accordion */}
      <Accordion type="multiple" className="space-y-0" defaultValue={['skills', 'employment', 'education', 'experience', 'date']}>
        <AccordionItem value="skills" className="border border-gray-200 rounded-xl mx-0 mb-2 hover:shadow-md transition-shadow">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">Top Skills</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SkillSelector selectedSkills={selectedSkills} onSelectionChange={setSelectedSkills} organizationId={organizationId}/>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="employment" className="border border-gray-200 rounded-xl mx-0 mb-2 hover:shadow-md transition-shadow">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            <div className="flex items-center">
              <Briefcase className="h-4 w-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">Employment History</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Company / Role Keywords</label>
            <Input 
              placeholder="e.g., Google, AWS, Product Manager" 
              value={companyKeywords} 
              onChange={e => setCompanyKeywords(e.target.value)}
              className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="education" className="border border-gray-200 rounded-xl mx-0 mb-2 hover:shadow-md transition-shadow">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            <div className="flex items-center">
              <GraduationCap className="h-4 w-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">Education</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Degree / Institution Keywords</label>
            <Input 
              placeholder="e.g., IIT, MBA, Computer Science" 
              value={educationKeywords} 
              onChange={e => setEducationKeywords(e.target.value)}
              className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
            />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="experience" className="border border-gray-200 rounded-xl mx-0 mb-2 hover:shadow-md transition-shadow">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">Experience Level</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minExp" className="block text-sm font-medium text-gray-700 mb-2">Min Years</label>
                <Input 
                  id="minExp" 
                  type="number" 
                  placeholder="0" 
                  value={minExp} 
                  onChange={e => setMinExp(e.target.value)}
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div>
                <label htmlFor="maxExp" className="block text-sm font-medium text-gray-700 mb-2">Max Years</label>
                <Input 
                  id="maxExp" 
                  type="number" 
                  placeholder="15+" 
                  value={maxExp} 
                  onChange={e => setMaxExp(e.target.value)}
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="date" className="border border-gray-200 rounded-xl mx-0 mb-2 hover:shadow-md transition-shadow">
          <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-purple-600" />
              <span className="font-medium text-gray-900">Date Posted</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ToggleGroup 
              type="single" 
              value={datePosted} 
              onValueChange={val => { if (val) setDatePosted(val); }} 
              defaultValue="all_time" 
              className="flex flex-wrap gap-2"
            >
              <ToggleGroupItem value="all_time" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">All Time</ToggleGroupItem>
              <ToggleGroupItem value="last_24_hours" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">24h</ToggleGroupItem>
              <ToggleGroupItem value="last_7_days" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">7d</ToggleGroupItem>  
              <ToggleGroupItem value="last_14_days" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">14d</ToggleGroupItem>  
              <ToggleGroupItem value="last_30_days" className="data-[state=on]:bg-purple-500 data-[state=on]:text-white">30d</ToggleGroupItem>
            </ToggleGroup>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-4">
        <Button 
          type="submit" 
          disabled={isSearching} 
          size="lg" 
          className="w-full  font-semibold py-3 rounded-xl shadow-lg"
        >
          {isSearching ? 'Searching...' : '🔍 Find Top Candidates'}
        </Button>
      </div>
    </form>
  );
};

export default CandidateSearchFilters;