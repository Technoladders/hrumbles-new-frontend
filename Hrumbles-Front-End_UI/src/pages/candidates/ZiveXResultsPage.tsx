// src/pages/candidates/ZiveXResultsPage.tsx

import { FC, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import Loader from '@/components/ui/Loader';
import { SearchFilters, CandidateSearchResult } from '@/types/candidateSearch';

const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const filters: SearchFilters = useMemo(() => ({
    keywords: searchParams.get('keywords')?.split(',') || [],
    filter_skills: searchParams.get('filter_skills')?.split(',') || [],
    filter_companies: searchParams.get('filter_companies')?.split(',') || [],
    filter_educations: searchParams.get('filter_educations')?.split(',') || [],
    locations: searchParams.get('locations')?.split(',') || [],
    min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
    max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
    date_posted: searchParams.get('date_posted') || 'all_time',
  }), [searchParams]);

  const { data: searchResults = [], isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['candidateSearchResults', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_unified_candidates_v3', {
        p_keywords: filters.keywords,
        p_filter_skills: filters.filter_skills,
        p_filter_companies: filters.filter_companies,
        p_filter_educations: filters.filter_educations,
        p_locations: filters.locations,
        p_min_exp: filters.min_exp,
        p_max_exp: filters.max_exp,
        p_date_filter: filters.date_posted,
        p_organization_id: organizationId
      });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handleSearch = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    if (newFilters.keywords?.length) params.append('keywords', newFilters.keywords.join(','));
    if (newFilters.filter_skills?.length) params.append('filter_skills', newFilters.filter_skills.join(','));
    if (newFilters.filter_companies?.length) params.append('filter_companies', newFilters.filter_companies.join(','));
    if (newFilters.filter_educations?.length) params.append('filter_educations', newFilters.filter_educations.join(','));
    if (newFilters.locations?.length) params.append('locations', newFilters.locations.join(','));
    if (newFilters.min_exp) params.append('min_exp', newFilters.min_exp.toString());
    if (newFilters.max_exp) params.append('max_exp', newFilters.max_exp.toString());
    if (newFilters.date_posted && newFilters.date_posted !== 'all_time') {
      params.append('date_posted', newFilters.date_posted);
    }
    
    navigate(`/zive-x-search/results?${params.toString()}`, { replace: true });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
          <p className="text-gray-600 mt-2">Refine your search and discover the best matches.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-80">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <CandidateSearchFilters 
                onSearch={handleSearch} 
                isSearching={isLoading} // or false for the search page
                initialFilters={filters} 
                organizationId={organizationId} // <-- ADD THIS PROP
              />
            </div>
          </aside>
          <main className="flex-1">
            {isLoading 
              ? <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-lg"><Loader /></div>
              : <CandidateSearchResults results={searchResults} />
            }
          </main>
        </div>
      </div>
    </div>
  );
};

export default ZiveXResultsPage;