// src/pages/candidates/ZiveXSearchPage.tsx

import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import BookmarkedProfiles from '@/components/candidates/zive-x/BookmarkedProfiles';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters, SearchTag } from '@/types/candidateSearch'; // Update your types

const ZiveXSearchPage: FC = () => {
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);

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
    
    const searchQuery = params.toString();
    
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearches = recentSearches.filter((q: string) => q !== searchQuery);
    recentSearches.unshift(searchQuery);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
    
    navigate(`/zive-x-search/results?${searchQuery}`);
  };

  const handleRecentSearchSelect = (searchQuery: string) => {
    navigate(`/zive-x-search/results?${searchQuery}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <div className=" mb-6">
          <h1 className="text-4xl font-bold text-gray-600 mb-4">Find Top Talent from Your Talent Pool That Matches Your Needs Perfectly</h1>
          {/* <p className="text-xl text-gray-600 max-w-2xl mx-auto">Search from our unified talent pool to find candidates that match your needs perfectly.</p> */}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-8">
            <CandidateSearchFilters onSearch={handleSearch} isSearching={false} organizationId={organizationId} />
          </div>
          <div className="lg:col-span-1">
            <RecentSearches onSelectSearch={handleRecentSearchSelect} />
            <div className="mt-8">
            <BookmarkedProfiles /> 
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZiveXSearchPage;