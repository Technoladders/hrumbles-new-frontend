// src/pages/candidates/ZiveXResultsPage.tsx

import { FC, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import Loader from '@/components/ui/Loader';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';

const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);

const filters: SearchFilters = useMemo(() => {
    const getTags = (key: string): SearchTag[] => {
      const mandatory = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const optional = searchParams.get(`optional_${key}`)?.split(',') || [];
      return [
        ...mandatory.filter(Boolean).map(v => ({ value: v, mandatory: true })),
        ...optional.filter(Boolean).map(v => ({ value: v, mandatory: false }))
      ];
    };
    return {
      keywords: getTags('keywords'),
      skills: getTags('skills'),
      companies: getTags('companies'),
      educations: getTags('educations'),
      locations: getTags('locations'),
      current_company: getTags('current_company'),
      current_designation: getTags('current_designation'),
      min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
      max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
      date_posted: searchParams.get('date_posted') || 'all_time',
    };
  }, [searchParams]);

  // FINAL, CORRECT useQuery to call the backend
  const { data: searchResults = [], isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['candidateSearchResults', organizationId, filters],
    queryFn: async () => {
      const processTagsForRPC = (tags: SearchTag[] = []) => ({
        mandatory: tags.filter(t => t.mandatory).map(t => t.value),
        optional: tags.filter(t => !t.mandatory).map(t => t.value),
      });

      const keywords = processTagsForRPC(filters.keywords);
      const skills = processTagsForRPC(filters.skills);
      const companies = processTagsForRPC(filters.companies);
      const educations = processTagsForRPC(filters.educations);
      const locations = processTagsForRPC(filters.locations);
      const currentCompany = processTagsForRPC(filters.current_company);
      const currentDesignation = processTagsForRPC(filters.current_designation);

      // Correctly combine mandatory/optional for single-string RPC params
      const p_current_company_text = [...currentCompany.mandatory, ...currentCompany.optional].join(' ') || null;
      const p_current_designation_text = [...currentDesignation.mandatory, ...currentDesignation.optional].join(' ') || null;

      const { data, error } = await supabase.rpc('search_unified_candidates_v6', {
        p_mandatory_keywords: keywords.mandatory, p_optional_keywords: keywords.optional,
        p_mandatory_skills: skills.mandatory, p_optional_skills: skills.optional,
        p_mandatory_companies: companies.mandatory, p_optional_companies: companies.optional,
        p_mandatory_educations: educations.mandatory, p_optional_educations: educations.optional,
        p_mandatory_locations: locations.mandatory, p_optional_locations: locations.optional,
        p_current_company: p_current_company_text,
        p_current_designation: p_current_designation_text,
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
    const processTags = (key: string, tags: SearchTag[] = []) => {
      const mandatory = tags.filter(t => t.mandatory).map(t => t.value);
      const optional = tags.filter(t => !t.mandatory).map(t => t.value);
      if (mandatory.length) params.append(`mandatory_${key}`, mandatory.join(','));
      if (optional.length) params.append(`optional_${key}`, optional.join(','));
    };
    
    processTags('keywords', newFilters.keywords);
    processTags('skills', newFilters.skills);
    processTags('companies', newFilters.companies);
    processTags('educations', newFilters.educations);
    processTags('locations', newFilters.locations);
    processTags('current_company', newFilters.current_company);
    processTags('current_designation', newFilters.current_designation);

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
          <aside className="w-full lg:w-96">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <CandidateSearchFilters 
                onSearch={handleSearch} 
                isSearching={isLoading}
                initialFilters={filters} 
                organizationId={organizationId}
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