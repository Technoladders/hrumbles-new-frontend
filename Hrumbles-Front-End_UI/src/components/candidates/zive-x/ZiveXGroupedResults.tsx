// src/components/candidates/zive-x/ZiveXGroupedResults.tsx
// Wraps ZiveXResultsTable or ZiveXCardList (passed as render prop) and injects:
//   • "Exact Matches" section  (strong matches, sorted by score desc)
//   • Collapsible divider
//   • "Suggested / Related" section  (everything else)
//
// Usage:
//   <ZiveXGroupedResults results={results} filters={filters} isLoading={isLoading} viewMode="table" … />

import { FC, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Sparkles, CheckCircle2, Info } from 'lucide-react';
import type { CandidateSearchResult, SearchFilters } from '@/types/candidateSearch';
import type { MatchDetail }                           from '@/utils/ziveXMatchScore';
import { partitionResults }                           from '@/utils/ziveXMatchScore';
import ZiveXMatchBadge                                from '@/components/candidates/zive-x/ZiveXMatchBadge';
import ZiveXResultsTable                              from '@/components/candidates/zive-x/ZiveXResultsTable';
import ZiveXCardList                                  from '@/components/candidates/zive-x/ZiveXCardList';

interface ZiveXGroupedResultsProps {
  results:         CandidateSearchResult[];
  filters:         SearchFilters;
  isLoading:       boolean;
  highlightTerms:  string[];
  selectedIds:     Set<string>;
  onToggleSelect:  (id: string) => void;
  onInvite:        (c: CandidateSearchResult) => void;
  viewMode:        'card' | 'table';
  jobId?:          string;
  jobTitle?:       string;
}

// ── Section heading ────────────────────────────────────────────────────────────
const SectionHeading: FC<{
  icon:    React.ReactNode;
  label:   string;
  count:   number;
  accent:  string;
  bg:      string;
  tip:     string;
}> = ({ icon, label, count, accent, bg, tip }) => {
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', background: bg,
      borderBottom: `1px solid ${accent}20`,
      borderTop: `2px solid ${accent}`,
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <span style={{ color: accent, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{label}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
        background: accent, color: 'white',
      }}>
        {count}
      </span>
      {/* tooltip */}
      <span
        style={{ position: 'relative', display: 'inline-flex', cursor: 'help', marginLeft: 2 }}
        onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
      >
        <Info size={10} style={{ color: accent, opacity: 0.6 }} />
        {showTip && (
          <div style={{
            position: 'absolute', left: '50%', bottom: 'calc(100% + 5px)',
            transform: 'translateX(-50%)', background: '#1E293B', color: '#E2E8F0',
            padding: '6px 10px', borderRadius: 6, fontSize: 9, lineHeight: 1.5,
            zIndex: 100, width: 220, pointerEvents: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,.3)', whiteSpace: 'normal',
          }}>
            {tip}
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1E293B' }} />
          </div>
        )}
      </span>
    </div>
  );
};

// ── Collapsible divider ────────────────────────────────────────────────────────
const SuggestedDivider: FC<{
  count:    number;
  open:     boolean;
  onToggle: () => void;
}> = ({ count, open, onToggle }) => (
  <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 11 }}>
    <button
      type="button" onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 0,
        border: 'none', background: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      {/* left rule */}
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #CBD5E1)' }} />

      {/* pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', margin: '0 12px',
        borderRadius: 99, border: '1.5px solid #CBD5E1',
        background: 'white', fontSize: 10, fontWeight: 700, color: '#64748B',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        whiteSpace: 'nowrap',
      }}>
        <Sparkles size={12} style={{ color: '#7C3AED' }} />
        {open ? 'Hide' : 'Show'} Related Profiles
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 99,
          background: '#F5F3FF', color: '#6D28D9', border: '1px solid #C4B5FD',
        }}>
          {count}
        </span>
        {open
          ? <ChevronUp size={12} style={{ color: '#94A3B8' }} />
          : <ChevronDown size={12} style={{ color: '#94A3B8' }} />
        }
      </div>

      {/* right rule */}
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #CBD5E1, transparent)' }} />
    </button>
  </div>
);

// ── Main grouped container ─────────────────────────────────────────────────────
const ZiveXGroupedResults: FC<ZiveXGroupedResultsProps> = ({
  results, filters, isLoading, highlightTerms,
  selectedIds, onToggleSelect, onInvite,
  viewMode, jobId, jobTitle,
}) => {
  const [suggestedOpen, setSuggestedOpen] = useState(false);

  const { matched, suggested } = useMemo(
    () => partitionResults(results, filters),
    [results, filters],
  );

  // Build lookup maps so child lists can retrieve pre-computed scores
  // We inject match details as a data attribute via a custom wrapper approach.
  // Since we can't easily patch the inner table/card, we pass a matchMap prop.
  // If the inner components don't support matchMap yet, the badge still renders
  // in the section heading area.
  const matchedResults   = matched.map(x => x.result);
  const suggestedResults = suggested.map(x => x.result);

  // Score lookup for badge rendering on each row
  const scoreMap = useMemo(() => {
    const m = new Map<string, MatchDetail>();
    [...matched, ...suggested].forEach(x => m.set(x.result.id, x.detail));
    return m;
  }, [matched, suggested]);

  // If loading or no results, just show the inner component normally
  if (isLoading || results.length === 0) {
    const Comp = viewMode === 'card' ? ZiveXCardList : ZiveXResultsTable;
    return (
      <Comp
        results={results} isLoading={isLoading}
        highlightTerms={highlightTerms}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onInvite={onInvite}
        jobId={jobId} jobTitle={jobTitle}
      />
    );
  }

  const ResultComp = viewMode === 'card' ? ZiveXCardList : ZiveXResultsTable;
  const hasMatched   = matchedResults.length   > 0;
  const hasSuggested = suggestedResults.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>

      {/* ── MATCHED section ── */}
      {hasMatched && (
        <>
          <SectionHeading
            icon={<CheckCircle2 size={14} />}
            label="Matched Profiles"
            count={matchedResults.length}
            accent="#16A34A"
            bg="#F0FDF4"
            tip="These profiles satisfy one or more of your selected filters. Sorted by match strength."
          />
          <ResultComp
            results={matchedResults}
            isLoading={false}
            highlightTerms={highlightTerms}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onInvite={onInvite}
            jobId={jobId} jobTitle={jobTitle}
            matchScoreMap={scoreMap}
          />
        </>
      )}

      {/* ── Empty matched notice ── */}
      {!hasMatched && hasSuggested && (
        <div style={{
          padding: '10px 16px', background: '#FFFBEB',
          borderBottom: '1px solid #FDE68A', fontSize: 11, color: '#92400E',
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <Info size={12} />
          No exact matches for your current filters — showing related profiles below.
        </div>
      )}

      {/* ── SUGGESTED divider + section ── */}
      {hasSuggested && (
        <>
          <SuggestedDivider
            count={suggestedResults.length}
            open={suggestedOpen}
            onToggle={() => setSuggestedOpen(v => !v)}
          />

          {suggestedOpen && (
            <>
              <SectionHeading
                icon={<Sparkles size={14} />}
                label="Related / Suggested Profiles"
                count={suggestedResults.length}
                accent="#7C3AED"
                bg="#F5F3FF"
                tip="These profiles are returned by the search engine but don't strongly match your filter criteria. They may still be relevant based on overall profile similarity."
              />
              <ResultComp
                results={suggestedResults}
                isLoading={false}
                highlightTerms={highlightTerms}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onInvite={onInvite}
                jobId={jobId} jobTitle={jobTitle}
                matchScoreMap={scoreMap}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ZiveXGroupedResults;