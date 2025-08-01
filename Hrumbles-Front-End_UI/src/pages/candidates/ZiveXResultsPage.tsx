// src/pages/candidates/ZiveXResultsPage.tsx

import { FC, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import Loader from '@/components/ui/Loader';
import { SearchFilters, CandidateSearchResult } from '@/types/candidateSearch';

const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse filters from the URL
 // In ZiveXResultsPage.tsx
const filters: SearchFilters = useMemo(() => ({
    keywords: searchParams.get('keywords')?.split(',') || [],
    locations: searchParams.get('locations')?.split(',') || [],
    min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
    max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
    min_salary: searchParams.get('min_salary') ? parseFloat(searchParams.get('min_salary')!) : null,
    max_salary: searchParams.get('max_salary') ? parseFloat(searchParams.get('max_salary')!) : null,
    gender: searchParams.get('gender') || 'All candidates',
    notice_period: searchParams.get('notice_period') || 'Any',
    // Add new params
    companies: searchParams.get('companies')?.split(',') || [],
    educations: searchParams.get('educations')?.split(',') || [],
}), [searchParams]);

const { data: searchResults = [], isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['candidateSearchResults', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_unified_candidates', {
        p_keywords: filters.keywords,
        p_locations: filters.locations,
        p_min_exp: filters.min_exp,
        p_max_exp: filters.max_exp,
        p_min_salary: filters.min_salary,
        p_max_salary: filters.max_salary,
        p_genders: filters.gender !== 'All candidates' ? [filters.gender] : [],
        p_notice_periods: filters.notice_period !== 'Any' ? [filters.notice_period] : [],
        // Add new params to the RPC call
        p_companies: filters.companies,
        p_educations: filters.educations,
      });
      if (error) throw new Error(error.message);
      return data || [];
    },
});

console.log('searchResults', searchResults);
  const handleSearch = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    if (newFilters.keywords.length > 0) params.append('keywords', newFilters.keywords.join(','));
    if (newFilters.locations.length > 0) params.append('locations', newFilters.locations.join(','));
    if (newFilters.min_exp) params.append('min_exp', newFilters.min_exp.toString());
    if (newFilters.max_exp) params.append('max_exp', newFilters.max_exp.toString());
    if (newFilters.min_salary) params.append('min_salary', newFilters.min_salary.toString());
    if (newFilters.max_salary) params.append('max_salary', newFilters.max_salary.toString());
    navigate(`/zive-x-search/results?${params.toString()}`);
  };
  

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4 md:p-8">
      {/* Left Column: Filters (1/4 width) */}
      <div className="w-full md:w-1/4">
        <CandidateSearchFilters onSearch={handleSearch} isSearching={isLoading} initialFilters={filters} />
      </div>

      {/* Right Column: Results (3/4 width) */}
      <div className="w-full md:w-3/4">
        {isLoading 
          ? <div className="flex justify-center p-12"><Loader /></div>
          : <CandidateSearchResults results={searchResults} />
        }
      </div>
    </div>
  );
};

export default ZiveXResultsPage;