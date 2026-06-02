// src/components/candidates/zive-x/ZiveXResultsTable.tsx
// TI-style dense table — sticky name column, expandable rows, bookmark, invite

import { FC, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark, BookmarkCheck, Send, ExternalLink, ChevronDown, ChevronUp,
  MapPin, Briefcase, Clock, IndianRupee, GraduationCap, Users, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { CandidateSearchResult } from '@/types/candidateSearch';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 25;

const STICKY_CSS = `
  .zx-table tbody tr td.zx-col-name { background:#fff; }
  .zx-table tbody tr:nth-child(even) td.zx-col-name { background:#f9f9fb; }
  .zx-table tbody tr:hover td.zx-col-name { background:#f5f3ff !important; }
  .zx-table tbody tr.zx-expanded td.zx-col-name { background:#f5f3ff !important; }
  .zx-table tbody tr.zx-expanded-content td { background:#faf9ff; border-bottom:2px solid #e9d5ff; }
`;

function fmtSalary(ctc: number | null): string | null {
  if (!ctc) return null;
  return `₹${(ctc / 100000).toFixed(1)}L`;
}

// ── Highlight matching terms ──────────────────────────────────────────────────
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!text || !terms.length) return <>{text}</>;
  const sorted  = [...terms].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts   = text.split(regex);
  return <>
    {parts.map((p, i) =>
      regex.test(p)
        ? <mark key={i} style={{ background:'#FEF3C7', color:'#92400E', borderRadius:2, padding:'0 1px', fontWeight:'inherit' }}>{p}</mark>
        : <span key={i}>{p}</span>
    )}
  </>;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(135deg,#6D28D9,#A855F7)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:Math.round(size * 0.34), fontWeight:700, color:'white',
    }}>
      {initials || '?'}
    </div>
  );
}

// ── Skill tags ────────────────────────────────────────────────────────────────
function SkillTags({ skills, highlight }: { skills: string[]; highlight: string[] }) {
  const top  = skills.slice(0, 3);
  const rest = skills.length - 3;
  if (!skills.length) return <span style={{ fontSize:9, color:'#CBD5E1' }}>—</span>;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:3, alignItems:'center' }}>
      {top.map(sk => {
        const isMatch = highlight.some(h => sk.toLowerCase().includes(h.toLowerCase()));
        return (
          <span key={sk} style={{
            padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:500,
            border:'1px solid', whiteSpace:'nowrap',
            ...(isMatch
              ? { background:'#EDE9FE', color:'#6D28D9', borderColor:'#C4B5FD' }
              : { background:'#F1F5F9', color:'#64748B', borderColor:'#E2E8F0' }),
          }}>
            <Highlight text={sk} terms={highlight} />
          </span>
        );
      })}
      {rest > 0 && <span style={{ fontSize:9, color:'#7C3AED', fontWeight:700 }}>+{rest}</span>}
    </div>
  );
}

// ── Expanded row detail ───────────────────────────────────────────────────────
function ExpandedDetail({ r, terms }: { r: CandidateSearchResult; terms: string[] }) {
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20,
      padding:'12px 4px', animation:'fadeIn 0.15s ease',
    }}>
      {/* Skills */}
      <div>
        <p style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8', marginBottom:6 }}>All Skills ({r.key_skills?.length || 0})</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {(r.key_skills || []).map(sk => (
            <span key={sk} style={{ padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:500, background:'#F5F3FF', color:'#6D28D9', border:'1px solid #EDE9FE' }}>
              <Highlight text={sk} terms={terms} />
            </span>
          ))}
        </div>
      </div>
      {/* Experience */}
      <div>
        <p style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8', marginBottom:6 }}>Experience</p>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {r.current_company && (
            <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#7C3AED', marginTop:3, flexShrink:0 }} />
              <div>
                <p style={{ margin:0, fontSize:10, fontWeight:600, color:'#1E293B' }}>{r.current_designation || '—'}</p>
                <p style={{ margin:'1px 0 0', fontSize:9, color:'#7C3AED' }}>{r.current_company}</p>
                <span style={{ fontSize:8, padding:'1px 5px', borderRadius:99, background:'#DCFCE7', color:'#166534', fontWeight:700 }}>Current</span>
              </div>
            </div>
          )}
          {r.previous_company && (
            <div style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#CBD5E1', marginTop:3, flexShrink:0 }} />
              <div>
                <p style={{ margin:0, fontSize:10, fontWeight:600, color:'#1E293B' }}>{r.previous_designation || '—'}</p>
                <p style={{ margin:'1px 0 0', fontSize:9, color:'#6B7280' }}>{r.previous_company}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Info */}
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <p style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8', marginBottom:2 }}>Details</p>
        {r.education_summary && (
          <div style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <GraduationCap size={10} style={{ color:'#94A3B8', marginTop:1, flexShrink:0 }} />
            <span style={{ fontSize:10, color:'#475569' }}>{r.education_summary}</span>
          </div>
        )}
        {r.current_ctc && (
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <IndianRupee size={10} style={{ color:'#94A3B8', flexShrink:0 }} />
            <span style={{ fontSize:10, color:'#475569' }}>Current: {fmtSalary(r.current_ctc)}</span>
          </div>
        )}
        {r.expected_ctc && (
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <IndianRupee size={10} style={{ color:'#94A3B8', flexShrink:0 }} />
            <span style={{ fontSize:10, color:'#475569' }}>Expected: {fmtSalary(r.expected_ctc)}</span>
          </div>
        )}
        {r.email && (
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <span style={{ fontSize:9, color:'#64748B', fontFamily:'monospace' }}>{r.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr style={{ borderBottom:'1px solid #F1F5F9' }}>
      {[150, 120, 110, 170, 120, 110, 90].map((w, i) => (
        <td key={i} style={{ padding:'10px 12px' }}>
          <div style={{ height:10, background:'#F1F5F9', borderRadius:4, width:`${Math.min(w, 100)}%`, animation:'zx-pulse 1.5s infinite' }} />
        </td>
      ))}
    </tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40 }}>
      <div style={{ width:52, height:52, borderRadius:13, background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, color:'#94A3B8' }}>
        <Search size={22} />
      </div>
      <h3 style={{ fontSize:15, fontWeight:700, color:'#1E293B', margin:'0 0 4px' }}>No candidates found</h3>
      <p style={{ fontSize:13, color:'#64748B', textAlign:'center', maxWidth:260 }}>Try adjusting your filters or broadening your search criteria</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface ZiveXResultsTableProps {
  results:        CandidateSearchResult[];
  isLoading:      boolean;
  highlightTerms: string[];
  selectedIds:    Set<string>;
  onToggleSelect: (id: string) => void;
  onInvite:       (c: CandidateSearchResult) => void;
  jobId?:         string;
  jobTitle?:      string;
}

const ZiveXResultsTable: FC<ZiveXResultsTableProps> = ({
  results, isLoading, highlightTerms, selectedIds, onToggleSelect, onInvite,
}) => {
  const userId      = useSelector((s: any) => s.auth.user?.id);
  const queryClient = useQueryClient();
  const [page,      setPage]      = useState(1);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const totalPages    = Math.ceil(results.length / ITEMS_PER_PAGE);
  const paginated     = useMemo(() => results.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [results, page]);
  const start         = (page - 1) * ITEMS_PER_PAGE + 1;
  const end           = Math.min(page * ITEMS_PER_PAGE, results.length);

  const { data: bookmarkedIds = new Set() } = useQuery({
    queryKey: ['bookmarks', userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data } = await supabase.from('bookmarked_candidates').select('candidate_id').eq('user_id', userId);
      return new Set<string>((data || []).map(b => b.candidate_id));
    },
    enabled: !!userId,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async ({ candidateId, isBookmarked }: { candidateId: string; isBookmarked: boolean }) => {
      if (isBookmarked) await supabase.from('bookmarked_candidates').delete().match({ user_id: userId, candidate_id: candidateId });
      else await supabase.from('bookmarked_candidates').insert({ user_id: userId, candidate_id: candidateId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks', userId] }),
  });

  const COLS = [
    { label:'', w:28 },
    { label:'Candidate', w:158 },
    { label:'Title / Company', w:148 },
    { label:'Skills', w:172 },
    { label:'Exp', w:52 },
    { label:'Location', w:102 },
    { label:'Notice', w:82 },
    { label:'Contact', w:148 },
    { label:'', w:78 },
  ];

  if (!isLoading && results.length === 0) return <EmptyState />;

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
      <style>{`${STICKY_CSS}
        @keyframes zx-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Count bar */}
      <div style={{
        flexShrink:0, padding:'6px 14px', background:'white', borderBottom:'1px solid #F1F5F9',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Users size={13} style={{ color:'#94A3B8' }} />
          <span style={{ fontSize:12, fontWeight:600, color:'#1E293B' }}>
            {results.length.toLocaleString()} candidates
          </span>
          {selectedIds.size > 0 && (
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'#EDE9FE', color:'#6D28D9', fontWeight:600 }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
        {results.length > 0 && (
          <span style={{ fontSize:11, color:'#94A3B8' }}>
            Showing {start}–{end} of {results.length.toLocaleString()}
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto' }}>
        <table className="zx-table" style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th key={i} style={{
                  position:'sticky', top:0, background:'#F8FAFC',
                  zIndex: i === 1 ? 31 : 30,
                  ...(i === 1 ? { left:28 } : {}),
                  ...(i === 0 ? { left:0, zIndex:32 } : {}),
                  padding:'8px 12px', textAlign:'left',
                  fontSize:9, fontWeight:700, color:'#64748B',
                  textTransform:'uppercase', letterSpacing:'0.5px',
                  borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap',
                  width:c.w, minWidth:c.w,
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
              : paginated.map((r, idx) => {
                const isBookmarked = bookmarkedIds.has(r.id);
                const isExpanded   = expanded === r.id;
                const isSelected   = selectedIds.has(r.id);
                const rowBg        = isExpanded || isSelected ? '#F5F3FF' : idx % 2 === 0 ? '#fff' : '#F9F9FB';

                return (
                  <>
                    <tr key={r.id}
                      className={isExpanded ? 'zx-expanded' : ''}
                      onClick={() => setExpanded(isExpanded ? null : r.id)}
                      style={{ background:rowBg, borderBottom:'1px solid #F1F5F9', cursor:'pointer', transition:'background 0.1s' }}
                      onMouseEnter={e => !isSelected && !isExpanded && ((e.currentTarget as HTMLElement).style.background = '#F5F3FF')}
                      onMouseLeave={e => !isSelected && !isExpanded && ((e.currentTarget as HTMLElement).style.background = rowBg)}
                    >
                      {/* Checkbox */}
                      <td style={{ padding:'8px 6px 8px 10px', position:'sticky', left:0, zIndex:2, background:rowBg }}
                        onClick={e => { e.stopPropagation(); onToggleSelect(r.id); }}>
                        <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(r.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width:13, height:13, cursor:'pointer', accentColor:'#7C3AED' }} />
                      </td>

                      {/* Candidate */}
                      <td className="zx-col-name" style={{ padding:'8px 12px', position:'sticky', left:28, zIndex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                          <Avatar name={r.full_name || '?'} size={28} />
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:'#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:120 }}>
                                <Highlight text={r.full_name || ''} terms={highlightTerms} />
                              </span>
                              {isExpanded ? <ChevronUp size={10} color="#9CA3AF" style={{ flexShrink:0 }} /> : <ChevronDown size={10} color="#9CA3AF" style={{ flexShrink:0 }} />}
                            </div>
                            {r.email && (
                              <span style={{ fontSize:9, color:'#94A3B8', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block', maxWidth:150 }}>
                                {r.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Title / Company */}
                      <td style={{ padding:'8px 12px' }}>
                        <p style={{ margin:0, fontSize:10, fontWeight:600, color:'#1E293B', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150 }}>
                          <Highlight text={r.current_designation || r.title || '—'} terms={highlightTerms} />
                        </p>
                        {r.current_company && (
                          <p style={{ margin:'2px 0 0', fontSize:9, color:'#7C3AED', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150 }}>
                            <Highlight text={r.current_company} terms={highlightTerms} />
                          </p>
                        )}
                      </td>

                      {/* Skills */}
                      <td style={{ padding:'8px 12px' }}>
                        <SkillTags skills={r.key_skills || []} highlight={highlightTerms} />
                      </td>

                      {/* Exp */}
                      <td style={{ padding:'8px 12px' }}>
                        {r.total_experience_years != null && r.total_experience_years >= 0 ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                            <Briefcase size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                            <span style={{ fontSize:10, color:'#475569', fontWeight:500, whiteSpace:'nowrap' }}>
                              {r.total_experience_years}y
                            </span>
                          </div>
                        ) : <span style={{ fontSize:9, color:'#CBD5E1' }}>—</span>}
                      </td>

                      {/* Location */}
                      <td style={{ padding:'8px 12px' }}>
                        {r.current_location ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                            <MapPin size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                            <span style={{ fontSize:10, color:'#475569', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>
                              <Highlight text={r.current_location} terms={highlightTerms} />
                            </span>
                          </div>
                        ) : <span style={{ fontSize:9, color:'#CBD5E1' }}>—</span>}
                      </td>

                      {/* Notice */}
                      <td style={{ padding:'8px 12px' }}>
                        {r.notice_period ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                            <Clock size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                            <span style={{ fontSize:9, color:'#475569', whiteSpace:'nowrap' }}>{r.notice_period}</span>
                          </div>
                        ) : <span style={{ fontSize:9, color:'#CBD5E1' }}>—</span>}
                      </td>

                      {/* Contact */}
                      <td style={{ padding:'8px 12px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {r.email ? (
                            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 6px', borderRadius:5, background:'#F0FDF4', border:'1px solid #BBF7D0' }}>
                              <span style={{ fontSize:9, color:'#166534', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:115 }}>{r.email}</span>
                              <button onClick={()=>{navigator.clipboard.writeText(r.email);}} title="Copy email" style={{ flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:1, color:'#6EE7B7', display:'flex', alignItems:'center' }}
                                onMouseEnter={e=>(e.currentTarget.style.color='#059669')} onMouseLeave={e=>(e.currentTarget.style.color='#6EE7B7')}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              </button>
                            </div>
                          ) : <span style={{ fontSize:9, color:'#CBD5E1' }}>No email</span>}
                          {r.phone ? (
                            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 6px', borderRadius:5, background:'#F0FDF4', border:'1px solid #BBF7D0' }}>
                              <span style={{ fontSize:9, color:'#166534', fontFamily:'monospace', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:115 }}>{r.phone}</span>
                              <button onClick={()=>{navigator.clipboard.writeText(r.phone!);}} title="Copy phone" style={{ flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:1, color:'#6EE7B7', display:'flex', alignItems:'center' }}
                                onMouseEnter={e=>(e.currentTarget.style.color='#059669')} onMouseLeave={e=>(e.currentTarget.style.color='#6EE7B7')}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding:'8px 8px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                          <Link to={`/talent-pool/${r.id}`}>
                            <button title="View profile" style={{ width:26, height:26, borderRadius:6, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#6D28D9')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                              <ExternalLink size={12} />
                            </button>
                          </Link>
                          <button onClick={() => onInvite(r)} title="Invite" style={{ width:26, height:26, borderRadius:6, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                            <Send size={11} />
                          </button>
                          <button onClick={() => toggleBookmark({ candidateId: r.id, isBookmarked: isBookmarked })} title={isBookmarked ? 'Saved' : 'Save'}
                            style={{ width:26, height:26, borderRadius:6, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: isBookmarked ? '#7C3AED' : '#94A3B8' }}>
                            {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded */}
                    {isExpanded && (
                      <tr key={`${r.id}-exp`} className="zx-expanded-content">
                        <td colSpan={9} style={{ padding:'0 16px 4px' }}>
                          <ExpandedDetail r={r} terms={highlightTerms} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          flexShrink:0, padding:'8px 14px', background:'white', borderTop:'1px solid #F1F5F9',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{ fontSize:12, color:'#64748B' }}>
            <strong style={{ color:'#1E293B' }}>{start}–{end}</strong> of <strong style={{ color:'#1E293B' }}>{results.length.toLocaleString()}</strong>
          </span>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
              style={{ width:28, height:28, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width:28, height:28, borderRadius:6, border:'1px solid', cursor:'pointer', fontSize:11, fontWeight:600,
                    ...(p === page ? { background:'#6D28D9', color:'white', borderColor:'#6D28D9' } : { background:'white', color:'#475569', borderColor:'#E2E8F0' }) }}>
                  {p}
                </button>
              );
            })}
            {totalPages > 7 && <span style={{ fontSize:11, color:'#94A3B8' }}>…{totalPages}</span>}
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
              style={{ width:28, height:28, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', opacity: page === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZiveXResultsTable;