// src/pages/candidates/ZiveXSearchPage.tsx

import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import BookmarkedProfiles from '@/components/candidates/zive-x/BookmarkedProfiles';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters, SearchTag, SearchHistory } from '@/types/candidateSearch';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ZiveXSearchPage: FC = () => {
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [selectedHistory, setSelectedHistory] = useState<SearchHistory | null>(null);
  const [showRecentSearchesModal, setShowRecentSearchesModal] = useState(false);

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
    setShowRecentSearchesModal(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
    <div className="bg-white border-b border-gray-200">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </Button>
              <h1 className="text-4xl font-bold text-gray-600">Find Top Talent</h1>
            </div>
            
            {/* Recent Searches Button */}
            <Button
              variant="outline"
              onClick={() => setShowRecentSearchesModal(true)}
              className="flex items-center gap-2 text-gray-700 hover:text-[#7731E8] hover:border-[#7731E8]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Searches
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-9xl mx-auto">
          {/* Single column layout - card always full width */}
          <CandidateSearchFilters 
            onSearch={handleSearch} 
            isSearching={false} 
            organizationId={organizationId}
            searchHistory={selectedHistory}
          />
        </div>
      </div>

      {/* Recent Searches Modal */}
      <Dialog open={showRecentSearchesModal} onOpenChange={setShowRecentSearchesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Recent Searches</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <RecentSearches onSelectSearch={handleRecentSearchSelect} isModal={true} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZiveXSearchPage;