// src/components/candidates/zive-x/ZiveXCardList.tsx
// RRResultsArea-style flat card rows — no expand/collapse
// Phase 2: View Profile uses navigate() with highlight + return URL params

import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Briefcase, Clock, IndianRupee, GraduationCap,
  ExternalLink, Send, Bookmark, BookmarkCheck,
  Copy, Check, Mail, Phone, Zap, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { CandidateSearchResult } from '@/types/candidateSearch';

const PER_PAGE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSalary(v: number | null): string | null {
  if (!v) return null;
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${v.toLocaleString()}`;
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!text || !terms.length) return <>{text}</>;
  const sorted  = [...terms].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts   = text.split(regex);
  return <>
    {parts.map((p, i) =>
      regex.test(p)
        ? <mark key={i} style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 2, padding: '0 1px', fontStyle: 'normal' }}>{p}</mark>
        : <span key={i}>{p}</span>
    )}
  </>;
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const ini  = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const cols = [['#EDE9FE', '#5B21B6'], ['#DBEAFE', '#1E40AF'], ['#D1FAE5', '#065F46'], ['#FEF3C7', '#92400E'], ['#FCE7F3', '#9D174D'], ['#E0F2FE', '#075985']];
  const [bg, fg] = cols[ini.charCodeAt(0) % cols.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.36), fontWeight: 700, color: fg }}>
      {ini}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#CBD5E1', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#7C3AED')}
      onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}>
      {done ? <Check size={9} style={{ color: '#10B981' }} /> : <Copy size={9} />}
    </button>
  );
}

// ── Single row ────────────────────────────────────────────────────────────────
const ZxRow: FC<{
  r: CandidateSearchResult; isSelected: boolean; terms: string[];
  onToggle: (id: string) => void; onInvite: (r: CandidateSearchResult) => void;
  bookmarks: Set<string>; onBookmark: (id: string, isBm: boolean) => void;
}> = ({ r, isSelected, terms, onToggle, onInvite, bookmarks, onBookmark }) => {
  const navigate = useNavigate();
  const isBm     = bookmarks.has(r.id);
  const hasScore = r._relevance_score !== undefined && r._relevance_score! > 0;
  const score    = r._relevance_score ?? 0;

  const scoreBg  = score >= 70 ? '#D1FAE5' : score >= 40 ? '#FEF3C7' : '#F1F5F9';
  const scoreFg  = score >= 70 ? '#065F46' : score >= 40 ? '#92400E' : '#64748B';
  const scoreBdr = score >= 70 ? '#6EE7B7' : score >= 40 ? '#FCD34D' : '#E2E8F0';

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams();
    if (terms.length) params.set('highlight', terms.join(','));
    params.set('from', 'zivex');
    params.set('zivex_return', encodeURIComponent(window.location.search));
    navigate(`/talent-pool/${r.id}?${params.toString()}`);
  };

  return (
    <div
      style={{
        background: 'white', borderRadius: 10, border: `1px solid ${isSelected ? '#A78BFA' : '#E2E8F0'}`,
        outline: isSelected ? '2px solid #DDD6FE' : 'none',
        marginBottom: 7, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.1s',
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#C4B5FD'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}>

      {/* Checkbox */}
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(r.id)} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#7C3AED' }} />
      </div>

      {/* Avatar */}
      <Avatar name={r.full_name || '?'} size={36} />

      {/* LEFT — candidate info */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Name + title + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            <Highlight text={r.full_name || ''} terms={terms} />
          </span>
          {(r.current_designation || r.title) && (
            <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 500 }}>
              <Highlight text={r.current_designation || r.title} terms={terms} />
            </span>
          )}
          {hasScore && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: scoreBg, color: scoreFg, border: `1px solid ${scoreBdr}` }}>
              <Zap size={7} /> {score}% match
            </span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5, fontSize: 10, color: '#475569' }}>
          {r.current_company && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500, color: '#334155' }}>
              <Briefcase size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <Highlight text={r.current_company} terms={terms} />
            </span>
          )}
          {r.total_experience_years != null && r.total_experience_years >= 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
              {r.total_experience_years}y exp
            </span>
          )}
          {r.current_location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <Highlight text={r.current_location} terms={terms} />
            </span>
          )}
          {r.notice_period && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />{r.notice_period}
            </span>
          )}
          {r.current_ctc && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <IndianRupee size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />
              {fmtSalary(r.current_ctc)}
              {r.expected_ctc && <span style={{ color: '#94A3B8' }}>&nbsp;→&nbsp;{fmtSalary(r.expected_ctc)}</span>}
            </span>
          )}
        </div>

        {/* Previous role */}
        {r.previous_company && (
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#94A3B8', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', flexShrink: 0 }}>Prev</span>
            <span>{r.previous_designation || '—'}</span>
            <span style={{ color: '#94A3B8' }}>at</span>
            <span style={{ fontWeight: 500, color: '#475569' }}><Highlight text={r.previous_company} terms={terms} /></span>
          </div>
        )}

        {/* Education */}
        {r.education_summary && (
          <div style={{ fontSize: 10, color: '#64748B', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <GraduationCap size={9} style={{ color: '#94A3B8', flexShrink: 0 }} />
            {r.education_summary}
          </div>
        )}

        {/* Skills */}
        {(r.key_skills || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {(r.key_skills || []).slice(0, 6).map(sk => {
              const isMatch = terms.some(h => sk.toLowerCase().includes(h.toLowerCase()));
              return (
                <span key={sk} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 500, border: '1px solid', whiteSpace: 'nowrap', ...(isMatch ? { background: '#EDE9FE', color: '#6D28D9', borderColor: '#C4B5FD' } : { background: '#F8FAFC', color: '#64748B', borderColor: '#E2E8F0' }) }}>
                  <Highlight text={sk} terms={terms} />
                </span>
              );
            })}
            {(r.key_skills || []).length > 6 && <span style={{ fontSize: 9, color: '#7C3AED', fontWeight: 700, padding: '2px 4px' }}>+{(r.key_skills || []).length - 6}</span>}
          </div>
        )}
      </div>

      {/* RIGHT — action card */}
      <div style={{ flexShrink: 0, width: 160 }} onClick={e => e.stopPropagation()}>
        <div style={{ borderRadius: 10, border: '1px solid #E2E8F0', background: '#FAFAFA', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Mail size={9} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#166534', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
              <CopyBtn text={r.email} />
            </div>
          )}
          {r.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 6, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Phone size={9} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#166534', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.phone}</span>
              <CopyBtn text={r.phone} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 2 }}>
            <button onClick={() => onInvite(r)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 4px', borderRadius: 6, border: '1px solid #C4B5FD', background: 'white', fontSize: 10, fontWeight: 600, color: '#6D28D9', cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EDE9FE'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; }}>
              <Send size={9} /> Invite
            </button>
            <button onClick={() => onBookmark(r.id, isBm)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 4px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', fontSize: 10, fontWeight: 600, color: isBm ? '#7C3AED' : '#64748B', cursor: 'pointer', transition: 'all 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#C4B5FD'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}>
              {isBm ? <BookmarkCheck size={9} /> : <Bookmark size={9} />} {isBm ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* View Profile — navigate with highlight params */}
          <button
            onClick={handleViewProfile}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', fontSize: 10, fontWeight: 600, color: '#64748B', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7C3AED'; (e.currentTarget as HTMLElement).style.borderColor = '#C4B5FD'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}>
            <ExternalLink size={9} /> View Profile
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E2E8F0', padding: '11px 14px', marginBottom: 7, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div style={{ width: 13, height: 13, borderRadius: 2, background: '#F1F5F9', marginTop: 2, flexShrink: 0, animation: 'zxPulse 1.5s infinite' }} />
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9', flexShrink: 0, animation: 'zxPulse 1.5s infinite' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ height: 12, background: '#F1F5F9', borderRadius: 4, width: '35%', animation: 'zxPulse 1.5s infinite' }} />
      <div style={{ height: 10, background: '#F1F5F9', borderRadius: 4, width: '55%', animation: 'zxPulse 1.5s infinite' }} />
      <div style={{ height: 10, background: '#F1F5F9', borderRadius: 4, width: '45%', animation: 'zxPulse 1.5s infinite' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {[60, 50, 70, 48].map((w, i) => <div key={i} style={{ height: 18, background: '#F1F5F9', borderRadius: 4, width: w, animation: 'zxPulse 1.5s infinite' }} />)}
      </div>
    </div>
    <div style={{ width: 160, flexShrink: 0 }}><div style={{ height: 90, background: '#F1F5F9', borderRadius: 10, animation: 'zxPulse 1.5s infinite' }} /></div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
interface ZiveXCardListProps {
  results: CandidateSearchResult[];
  isLoading: boolean;
  highlightTerms: string[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onInvite: (c: CandidateSearchResult) => void;
}

const ZiveXCardList: FC<ZiveXCardListProps> = ({
  results, isLoading, highlightTerms, selectedIds, onToggleSelect, onInvite,
}) => {
  const userId      = useSelector((s: any) => s.auth.user?.id);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(results.length / PER_PAGE);
  const paginated  = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const start = (page - 1) * PER_PAGE + 1;
  const end   = Math.min(page * PER_PAGE, results.length);

  const { data: bookmarks = new Set<string>() } = useQuery({
    queryKey: ['bookmarks', userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data } = await supabase.from('bookmarked_candidates').select('candidate_id').eq('user_id', userId);
      return new Set<string>((data || []).map((b: any) => b.candidate_id));
    },
    enabled: !!userId,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async ({ candidateId, isBm }: { candidateId: string; isBm: boolean }) => {
      if (isBm) await supabase.from('bookmarked_candidates').delete().match({ user_id: userId, candidate_id: candidateId });
      else await supabase.from('bookmarked_candidates').insert({ user_id: userId, candidate_id: candidateId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks', userId] }),
  });

  if (!isLoading && results.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}><Users size={22} /></div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1E293B' }}>No candidates found</p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Try removing some mandatory tags or broadening your search</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <style>{`@keyframes zxPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

      {/* Count bar */}
      <div style={{ flexShrink: 0, padding: '5px 14px', background: 'white', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={12} style={{ color: '#94A3B8' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{results.length.toLocaleString()} candidates</span>
          {selectedIds.size > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: '#EDE9FE', color: '#6D28D9', fontWeight: 600 }}>{selectedIds.size} selected</span>}
        </div>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{start}–{end} of {results.length.toLocaleString()}</span>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
          : paginated.map(r => (
            <ZxRow key={r.id} r={r} isSelected={selectedIds.has(r.id)} terms={highlightTerms}
              onToggle={onToggleSelect} onInvite={onInvite}
              bookmarks={bookmarks as Set<string>}
              onBookmark={(id, isBm) => toggleBookmark({ candidateId: id, isBm })}
            />
          ))
        }
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ flexShrink: 0, padding: '7px 14px', background: 'white', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}><strong style={{ color: '#1E293B' }}>{start}–{end}</strong> of <strong style={{ color: '#1E293B' }}>{results.length.toLocaleString()}</strong></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 600, ...(p === page ? { background: '#6D28D9', color: 'white', borderColor: '#6D28D9' } : { background: 'white', color: '#475569', borderColor: '#E2E8F0' }) }}>
                {p}
              </button>
            ))}
            {totalPages > 7 && <span style={{ fontSize: 11, color: '#94A3B8' }}>…{totalPages}</span>}
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', opacity: page === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZiveXCardList;