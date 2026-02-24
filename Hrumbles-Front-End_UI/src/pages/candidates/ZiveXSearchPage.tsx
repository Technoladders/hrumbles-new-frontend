// src/pages/candidates/ZiveXSearchPage.tsx
// REDESIGNED: Clean, refined search page header

import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import { SearchFilters, SearchTag, SearchHistory } from '@/types/candidateSearch';
import { ArrowLeft, Clock, X } from 'lucide-react';
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

  return (
    <>
      <style>{`
        .zx-search-page {
          min-height: 100vh;
          background: #F8F9FB;
        }
        .zx-search-header {
          background: white;
          border-bottom: 1px solid #E5E7EB;
          padding: 0 24px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .zx-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .zx-header-back {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          color: #6B7280;
        }
        .zx-header-back:hover {
          border-color: #DDD6FE;
          color: #6C2BD9;
          background: #F5F0FF;
        }
        .zx-header-title {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.3px;
        }
        .zx-recent-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          transition: all 0.15s;
        }
        .zx-recent-btn:hover {
          border-color: #DDD6FE;
          color: #6C2BD9;
        }
        .zx-recent-btn svg {
          width: 15px;
          height: 15px;
        }
        .zx-search-body {
          padding: 24px;
        }
        .zx-search-body > div {
          max-width: 1600px;
          margin: 0 auto;
        }
      `}</style>

      <div className="zx-search-page">
        {/* Header */}
        <div className="zx-search-header">
          <div className="zx-header-left">
            <button className="zx-header-back" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="zx-header-title">Find Candidates</span>
          </div>
          <button className="zx-recent-btn" onClick={() => setShowRecentSearchesModal(true)}>
            <Clock /> Recent Searches
          </button>
        </div>

        {/* Body */}
        <div className="zx-search-body">
          <div>
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
              <DialogTitle className="text-lg font-bold text-gray-800">Recent Searches</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <RecentSearches onSelectSearch={handleRecentSearchSelect} isModal={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ZiveXSearchPage;