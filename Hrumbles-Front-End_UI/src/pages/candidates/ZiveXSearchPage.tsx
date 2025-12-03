// src/pages/candidates/ZiveXSearchPage.tsx

import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import BookmarkedProfiles from '@/components/candidates/zive-x/BookmarkedProfiles';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters, SearchTag, SearchHistory } from '@/types/candidateSearch';

const ZiveXSearchPage: FC = () => {
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [selectedHistory, setSelectedHistory] = useState<SearchHistory | null>(null);

const handleSearch = (newFilters: SearchFilters) => {
  const params = new URLSearchParams();
  const processTags = (key: string, tags: SearchTag[] = []) => {
    const mandatory = tags.filter(t => t.mandatory).map(t => t.value);
    const optional = tags.filter(t => !t.mandatory).map(t => t.value);
    if (mandatory.length) params.append(`mandatory_${key}`, mandatory.join(','));
    if (optional.length) params.append(`optional_${key}`, optional.join(','));
  };
  
  processTags('name', newFilters.name);
  processTags('email', newFilters.email);
  processTags('keywords', newFilters.keywords);
  processTags('skills', newFilters.skills);
  processTags('companies', newFilters.companies);
  processTags('educations', newFilters.educations);
  processTags('locations', newFilters.locations);

  if (newFilters.current_company) params.append('current_company', newFilters.current_company);
  if (newFilters.current_designation) params.append('current_designation', newFilters.current_designation);
  if (newFilters.min_exp) params.append('min_exp', newFilters.min_exp.toString());
  if (newFilters.max_exp) params.append('max_exp', newFilters.max_exp.toString());
  if (newFilters.min_current_salary) params.append('min_current_salary', newFilters.min_current_salary.toString());
  if (newFilters.max_current_salary) params.append('max_current_salary', newFilters.max_current_salary.toString());
  if (newFilters.min_expected_salary) params.append('min_expected_salary', newFilters.min_expected_salary.toString());
  if (newFilters.max_expected_salary) params.append('max_expected_salary', newFilters.max_expected_salary.toString());
  if (newFilters.notice_periods?.length) params.append('notice_periods', newFilters.notice_periods.join(','));
  if (newFilters.date_posted && newFilters.date_posted !== 'all_time') {
    params.append('date_posted', newFilters.date_posted);
  }
  
  // ADD JD METADATA TO URL
  if (newFilters.jd_text) params.append('jd_text', encodeURIComponent(newFilters.jd_text));
  if (newFilters.jd_job_title) params.append('jd_job_title', newFilters.jd_job_title);
  if (newFilters.jd_selected_job_id) params.append('jd_selected_job_id', newFilters.jd_selected_job_id);
  if (newFilters.jd_generated_keywords?.length) {
    params.append('jd_generated_keywords', newFilters.jd_generated_keywords.join('|||'));
  }
  if (newFilters.jd_is_boolean_mode !== undefined) {
    params.append('jd_is_boolean_mode', newFilters.jd_is_boolean_mode.toString());
  }
  
  const searchQuery = params.toString();
  navigate(`/zive-x-search/results?${searchQuery}`);
};

  const handleRecentSearchSelect = (history: SearchHistory) => {
    setSelectedHistory(history);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-9xl mx-auto">
        <div className="mb-6"><h1 className="text-4xl font-bold text-gray-600">Find Top Talent</h1></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-8">
            <CandidateSearchFilters 
              onSearch={handleSearch} 
              isSearching={false} 
              organizationId={organizationId}
              searchHistory={selectedHistory}
            />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <RecentSearches onSelectSearch={handleRecentSearchSelect} />
            <BookmarkedProfiles />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ZiveXSearchPage;