// src/pages/candidates/ZiveXSearchPage.tsx

import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters } from '@/types/candidateSearch';

const ZiveXSearchPage: FC = () => {
  const navigate = useNavigate();
    const organizationId = useSelector((state: any) => state.auth.organization_id);

  // CRASH FIX: Use the new, correct handleSearch function
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
    
    navigate(`/zive-x-search/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Discover Top Talent</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Search from our unified talent pool to find candidates that match your needs perfectly.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <CandidateSearchFilters onSearch={handleSearch} isSearching={false}  organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
};

export default ZiveXSearchPage;