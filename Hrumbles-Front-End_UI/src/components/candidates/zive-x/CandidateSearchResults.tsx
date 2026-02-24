// src/components/candidates/zive-x/CandidateSearchResults.tsx
// REDESIGNED: Modern, compact, professional UI

import { useState, useMemo, FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  IndianRupee, MapPin, Briefcase, Bookmark, Mail, Clipboard,
  ClipboardCheck, ChevronLeft, ChevronRight, Clock, GraduationCap,
  Zap, Users, Search, SlidersHorizontal
} from 'lucide-react';
import { CandidateSearchResult } from '@/types/candidateSearch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Highlight ───────────────────────────────────────────────────────────────

const escapeRegExp = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Highlight: FC<{ text: string; query: string[] }> = ({ text, query }) => {
  if (!query.length || !text) return <span>{text}</span>;
  const sorted = [...query].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(escapeRegExp);
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="zx-highlight">{part}</mark>
        ) : part
      )}
    </span>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateSearchResultsProps {
  results: CandidateSearchResult[];
  highlightTerms?: string[];
}

type ContactInfo = { email: string | null } | null;

const formatSalary = (ctc: number | null) => {
  if (!ctc) return null;
  return `₹${(ctc / 100000).toFixed(1)}L`;
};

// ─── Component ───────────────────────────────────────────────────────────────

const CandidateSearchResults: FC<CandidateSearchResultsProps> = ({ results, highlightTerms }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchParams] = useSearchParams();
  const [contactInfo, setContactInfo] = useState<ContactInfo>(null);
  const [isCopied, setIsCopied] = useState(false);

  const highlightQuery = useMemo(() => {
    if (highlightTerms && highlightTerms.length > 0) return highlightTerms;
    const stripQ = (v: string) => v.replace(/^"|"$/g, '').trim();
    const terms: string[] = [];
    for (const key of ['keywords', 'skills', 'companies', 'educations', 'locations']) {
      const mandatory = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const optional = searchParams.get(`optional_${key}`)?.split(',') || [];
      [...mandatory, ...optional].filter(Boolean).forEach(v => terms.push(stripQ(v)));
    }
    const cc = searchParams.get('current_company');
    if (cc) terms.push(cc);
    const cd = searchParams.get('current_designation');
    if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [highlightTerms, searchParams]);

  const profileSearchParams = useMemo(() => {
    const p = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'jd_text') p.set(key, value);
    }
    return p.toString();
  }, [searchParams]);

  // ── Bookmarks ────────────────────────────────────────────────────────────
  const userId = useSelector((state: any) => state.auth.user?.id);
  const queryClient = useQueryClient();

  const { data: bookmarkedIdsSet = new Set() } = useQuery({
    queryKey: ['bookmarkedCandidates', userId],
    queryFn: async () => {
      if (!userId) return new Set();
      const { data, error } = await supabase
        .from('bookmarked_candidates').select('candidate_id').eq('user_id', userId);
      if (error) throw error;
      return new Set(data.map(b => b.candidate_id));
    },
    enabled: !!userId,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async ({ candidateId, isBookmarked }: { candidateId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await supabase.from('bookmarked_candidates').delete().match({ user_id: userId, candidate_id: candidateId });
      } else {
        await supabase.from('bookmarked_candidates').insert({ user_id: userId, candidate_id: candidateId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarkedCandidates', userId] }),
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return results.slice(start, start + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(results.length / itemsPerPage);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (results.length === 0) {
    return (
      <div className="zx-empty-state">
        <div className="zx-empty-icon">
          <Search className="w-8 h-8" />
        </div>
        <h3>No candidates found</h3>
        <p>Try adjusting your filters or broadening your search criteria</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ─── ZiveX Results Design System ─── */
        :root {
          --zx-brand: #6C2BD9;
          --zx-brand-light: #8B5CF6;
          --zx-brand-bg: #F5F0FF;
          --zx-brand-border: #DDD6FE;
          --zx-surface: #FFFFFF;
          --zx-surface-hover: #FAFAFA;
          --zx-text-primary: #111827;
          --zx-text-secondary: #6B7280;
          --zx-text-muted: #9CA3AF;
          --zx-border: #E5E7EB;
          --zx-border-light: #F3F4F6;
          --zx-shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
          --zx-shadow-md: 0 2px 8px rgba(0,0,0,0.06);
          --zx-shadow-lg: 0 4px 16px rgba(0,0,0,0.08);
          --zx-radius: 10px;
          --zx-radius-sm: 6px;
        }

        .zx-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 0 2px;
        }
        .zx-results-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--zx-text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .zx-results-count strong {
          color: var(--zx-text-primary);
          font-size: 15px;
        }

        /* ─── Candidate Card ─── */
        .zx-card {
          background: var(--zx-surface);
          border: 1px solid var(--zx-border);
          border-radius: var(--zx-radius);
          padding: 16px 20px;
          margin-bottom: 8px;
          transition: all 0.15s ease;
          position: relative;
          cursor: default;
        }
        .zx-card:hover {
          border-color: var(--zx-brand-border);
          box-shadow: var(--zx-shadow-md);
        }

        .zx-card-inner {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        /* Avatar */
        .zx-avatar {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--zx-brand) 0%, var(--zx-brand-light) 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          flex-shrink: 0;
          letter-spacing: -0.5px;
        }

        /* Content */
        .zx-content {
          flex: 1;
          min-width: 0;
        }

        .zx-name-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 2px;
        }
        .zx-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--zx-text-primary);
          line-height: 1.3;
        }
        .zx-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--zx-brand);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }

        /* Meta chips */
        .zx-meta-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 12px;
          margin: 6px 0;
        }
        .zx-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--zx-text-secondary);
          white-space: nowrap;
        }
        .zx-meta-chip svg {
          width: 13px;
          height: 13px;
          color: var(--zx-text-muted);
          flex-shrink: 0;
        }

        /* Info grid */
        .zx-info-grid {
          display: grid;
          grid-template-columns: 70px 1fr;
          gap: 2px 10px;
          font-size: 12px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--zx-border-light);
        }
        .zx-info-label {
          color: var(--zx-text-muted);
          font-weight: 500;
          padding: 2px 0;
        }
        .zx-info-value {
          color: var(--zx-text-primary);
          padding: 2px 0;
          line-height: 1.5;
        }

        /* Skills inline */
        .zx-skills-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 2px;
        }
        .zx-skill-tag {
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          background: var(--zx-brand-bg);
          color: var(--zx-brand);
          border: 1px solid var(--zx-brand-border);
          white-space: nowrap;
        }

        /* Actions column */
        .zx-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .zx-bookmark-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.15s;
          color: var(--zx-text-muted);
        }
        .zx-bookmark-btn:hover {
          background: var(--zx-brand-bg);
          color: var(--zx-brand);
        }
        .zx-bookmark-btn.active {
          color: var(--zx-brand);
        }
        .zx-view-btn {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 8px;
          background: var(--zx-brand);
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .zx-view-btn:hover {
          background: var(--zx-brand-light);
          box-shadow: 0 2px 8px rgba(108,43,217,0.3);
        }

        /* Highlight */
        .zx-highlight {
          background: #FEF3C7;
          color: #92400E;
          padding: 0 2px;
          border-radius: 2px;
          font-weight: inherit;
        }

        /* Pagination */
        .zx-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--zx-surface);
          border: 1px solid var(--zx-border);
          border-radius: var(--zx-radius);
          margin-top: 12px;
        }
        .zx-page-info {
          font-size: 13px;
          color: var(--zx-text-secondary);
          font-weight: 500;
        }
        .zx-page-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .zx-page-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--zx-border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--zx-text-secondary);
        }
        .zx-page-btn:hover:not(:disabled) {
          border-color: var(--zx-brand-border);
          color: var(--zx-brand);
          background: var(--zx-brand-bg);
        }
        .zx-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Empty state */
        .zx-empty-state {
          text-align: center;
          padding: 60px 24px;
          background: var(--zx-surface);
          border: 1px solid var(--zx-border);
          border-radius: var(--zx-radius);
        }
        .zx-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: var(--zx-border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: var(--zx-text-muted);
        }
        .zx-empty-state h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--zx-text-primary);
          margin-bottom: 4px;
        }
        .zx-empty-state p {
          font-size: 13px;
          color: var(--zx-text-secondary);
        }
      `}</style>

      {/* Header */}
      <div className="zx-results-header">
        <div className="zx-results-count">
          <Users className="w-4 h-4" />
          <strong>{results.length}</strong> candidates found
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[64px] h-8 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="40">40</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
      <div>
        {paginatedResults.map((candidate) => {
          const isBookmarked = bookmarkedIdsSet.has(candidate.id);
          const profileUrl = `/talent-pool/${candidate.id}${profileSearchParams ? `?${profileSearchParams}` : ''}`;

          return (
            <div key={candidate.id} className="zx-card">
              <div className="zx-card-inner">
                {/* Avatar */}
                <div className="zx-avatar">
                  {candidate.full_name?.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="zx-content">
                  <div className="zx-name-row">
                    <span className="zx-name">{candidate.full_name}</span>
                    <span className="zx-title">
                      <Highlight text={candidate.title || ''} query={highlightQuery} />
                    </span>
                  </div>

                  <div className="zx-meta-row">
                    {candidate.total_experience_years != null && (
                      <span className="zx-meta-chip">
                        <Briefcase /> {candidate.total_experience_years}y exp
                      </span>
                    )}
                    {candidate.current_ctc && (
                      <span className="zx-meta-chip">
                        <IndianRupee /> {formatSalary(candidate.current_ctc)}
                      </span>
                    )}
                    {candidate.current_location && (
                      <span className="zx-meta-chip">
                        <MapPin />
                        <Highlight text={candidate.current_location} query={highlightQuery} />
                      </span>
                    )}
                    {candidate.notice_period && (
                      <span className="zx-meta-chip">
                        <Clock /> {candidate.notice_period}
                      </span>
                    )}
                  </div>

                  <div className="zx-info-grid">
                    <span className="zx-info-label">Current</span>
                    <span className="zx-info-value">
                      <Highlight
                        text={[candidate.current_designation, candidate.current_company].filter(Boolean).join(' at ')}
                        query={highlightQuery}
                      />
                    </span>

                    {(candidate.previous_company || candidate.previous_designation) && (
                      <>
                        <span className="zx-info-label">Previous</span>
                        <span className="zx-info-value">
                          <Highlight
                            text={[candidate.previous_designation, candidate.previous_company].filter(Boolean).join(' at ')}
                            query={highlightQuery}
                          />
                        </span>
                      </>
                    )}

                    {candidate.education_summary && (
                      <>
                        <span className="zx-info-label">Education</span>
                        <span className="zx-info-value">
                          <Highlight text={candidate.education_summary} query={highlightQuery} />
                        </span>
                      </>
                    )}

                    {candidate.key_skills && candidate.key_skills.length > 0 && (
                      <>
                        <span className="zx-info-label">Skills</span>
                        <span className="zx-info-value">
                          <div className="zx-skills-row">
                            {candidate.key_skills.slice(0, 8).map((skill, idx) => (
                              <span key={idx} className="zx-skill-tag">
                                <Highlight text={skill} query={highlightQuery} />
                              </span>
                            ))}
                            {candidate.key_skills.length > 8 && (
                              <span className="zx-skill-tag" style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}>
                                +{candidate.key_skills.length - 8}
                              </span>
                            )}
                          </div>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="zx-actions">
                  <button
                    className={cn("zx-bookmark-btn", isBookmarked && "active")}
                    onClick={() => toggleBookmark({ candidateId: candidate.id, isBookmarked })}
                    title={isBookmarked ? 'Saved' : 'Save'}
                  >
                    <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current")} />
                  </button>
                  <Link to={profileUrl}>
                    <button className="zx-view-btn">View</button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="zx-pagination">
          <span className="zx-page-info">
            Page {currentPage} of {totalPages}
          </span>
          <div className="zx-page-controls">
            <button
              className="zx-page-btn"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="zx-page-btn"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contact Info Dialog */}
      <Dialog open={!!contactInfo} onOpenChange={(open) => !open && setContactInfo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contact Information</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {contactInfo?.email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-800">{contactInfo.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(contactInfo.email!)}>
                  {isCopied
                    ? <ClipboardCheck className="h-4 w-4 mr-2 text-green-600" />
                    : <Clipboard className="h-4 w-4 mr-2" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CandidateSearchResults;