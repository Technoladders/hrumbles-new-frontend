// src/pages/candidates/ZiveXSearchPage.tsx
// REDESIGNED: Modern compact search page header

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
        .zxsp-root {
          min-height: 100vh;
          background: #F4F5F7;
          font-family: 'Inter', system-ui, sans-serif;
          --brand: #6C2BD9;
          --brand-light: #EDE9FE;
          --brand-mid: #DDD6FE;
          --border: #E5E7EB;
          --text-primary: #111827;
          --text-secondary: #6B7280;
          --transition: 150ms cubic-bezier(0.4,0,0.2,1);
        }

        /* ── TOP BAR ── */
        .zxsp-header {
          height: 52px;
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 20;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .zxsp-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .zxsp-back-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition);
          color: #6B7280;
          flex-shrink: 0;
        }
        .zxsp-back-btn:hover {
          border-color: #C4B5FD;
          color: var(--brand);
          background: var(--brand-light);
        }

        .zxsp-header-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }

        .zxsp-recent-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: white;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition);
        }
        .zxsp-recent-btn:hover {
          border-color: #C4B5FD;
          color: var(--brand);
          background: var(--brand-light);
        }
        .zxsp-recent-btn svg { width: 14px; height: 14px; }

        /* ── BODY ── */
        .zxsp-body {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 16px 40px;
        }

        /* Dialog tweaks */
        .zxsp-dialog-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
      `}</style>

      <div className="zxsp-root">
        {/* Header */}
        <div className="zxsp-header">
          <div className="zxsp-header-left">
            <button className="zxsp-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="zxsp-header-title">Find Candidates</span>
          </div>
          <button className="zxsp-recent-btn" onClick={() => setShowRecentSearchesModal(true)}>
            <Clock /> Recent Searches
          </button>
        </div>

        {/* Body */}
        <div className="zxsp-body">
          <CandidateSearchFilters
            onSearch={handleSearch}
            isSearching={false}
            organizationId={organizationId}
            searchHistory={selectedHistory}
          />
        </div>

        {/* Recent Searches Modal */}
        <Dialog open={showRecentSearchesModal} onOpenChange={setShowRecentSearchesModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="zxsp-dialog-title">Recent Searches</DialogTitle>
            </DialogHeader>
            <div className="mt-3">
              <RecentSearches onSelectSearch={handleRecentSearchSelect} isModal={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ZiveXSearchPage;