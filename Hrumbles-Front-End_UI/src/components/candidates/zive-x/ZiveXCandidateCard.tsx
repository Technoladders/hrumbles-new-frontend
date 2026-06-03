// src/components/candidates/zive-x/ZiveXCandidateCard.tsx
// Recruiter-friendly compact card view
// Visible: name, title, company, top skills, exp, location, notice, CTC, match score
// Expandable: previous role, education, all skills, email, phone

import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Briefcase, Clock, IndianRupee, GraduationCap,
  ChevronDown, ChevronUp, ExternalLink, Send,
  Bookmark, BookmarkCheck, Phone, Mail, Zap,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { CandidateSearchResult } from '@/types/candidateSearch';

// ── Highlight ─────────────────────────────────────────────────────────────────
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!text || !terms.length) return <>{text}</>;
  const sorted  = [...terms].sort((a,b) => b.length - a.length);
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts   = text.split(regex);
  return <>
    {parts.map((p,i) =>
      regex.test(p)
        ? <mark key={i} style={{ background:'#FEF3C7', color:'#92400E', borderRadius:2, padding:'0 1px', fontWeight:'inherit', fontStyle:'normal' }}>{p}</mark>
        : <span key={i}>{p}</span>
    )}
  </>;
}

function fmtSalary(v: number|null): string|null {
  if (!v) return null;
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  return `₹${v.toLocaleString()}`;
}

function Avatar({ name, size=36 }: { name:string; size?:number }) {
  const ini = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
  const colors = [
    ['#EDE9FE','#6D28D9'], ['#DBEAFE','#1D4ED8'], ['#D1FAE5','#065F46'],
    ['#FEF3C7','#92400E'], ['#FCE7F3','#9D174D'], ['#E0F2FE','#0369A1'],
  ];
  const [bg, fg] = colors[ini.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:bg, display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:Math.round(size*0.36), fontWeight:700, color:fg,
    }}>
      {ini}
    </div>
  );
}

interface ZiveXCandidateCardProps {
  candidate:      CandidateSearchResult;
  isSelected:     boolean;
  onToggleSelect: (id: string) => void;
  onInvite:       (c: CandidateSearchResult) => void;
  highlightTerms: string[];
}

const ZiveXCandidateCard: FC<ZiveXCandidateCardProps> = ({
  candidate: r, isSelected, onToggleSelect, onInvite, highlightTerms,
}) => {
  const [expanded, setExpanded] = useState(false);
  const userId      = useSelector((s: any) => s.auth.user?.id);
  const queryClient = useQueryClient();

  const { data: bookmarks = new Set<string>() } = useQuery({
    queryKey: ['bookmarks', userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();
      const { data } = await supabase.from('bookmarked_candidates').select('candidate_id').eq('user_id', userId);
      return new Set<string>((data||[]).map((b: any) => b.candidate_id));
    },
    enabled: !!userId,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async ({ candidateId, isBm }: { candidateId:string; isBm:boolean }) => {
      if (isBm) await supabase.from('bookmarked_candidates').delete().match({ user_id:userId, candidate_id:candidateId });
      else      await supabase.from('bookmarked_candidates').insert({ user_id:userId, candidate_id:candidateId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey:['bookmarks', userId] }),
  });

  const isBm     = bookmarks.has(r.id);
  const hasScore = r._relevance_score !== undefined && r._relevance_score > 0;
  const topSkills = (r.key_skills||[]).slice(0,5);
  const moreSkills = (r.key_skills||[]).length - 5;

  return (
    <div style={{
      background:'white', borderRadius:10, border:'1px solid',
      borderColor: isSelected ? '#A78BFA' : '#E2E8F0',
      outline: isSelected ? '2px solid #DDD6FE' : 'none',
      transition:'all 0.1s',
      boxShadow: isSelected ? '0 0 0 3px rgba(139,92,246,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.borderColor='#C4B5FD';}}
      onMouseLeave={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.borderColor='#E2E8F0';}}
    >
      {/* ── MAIN ROW ── */}
      <div style={{ padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:10 }}>

        {/* Checkbox */}
        <div style={{ paddingTop:2, flexShrink:0 }}>
          <input type="checkbox" checked={isSelected} onChange={()=>onToggleSelect(r.id)}
            style={{ width:13, height:13, cursor:'pointer', accentColor:'#7C3AED' }} />
        </div>

        {/* Avatar */}
        <Avatar name={r.full_name||'?'} size={36} />

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
            {/* Name */}
            <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>
              <Highlight text={r.full_name||''} terms={highlightTerms} />
            </span>
            {/* Title */}
            <span style={{ fontSize:11, color:'#7C3AED', fontWeight:500 }}>
              <Highlight text={r.current_designation||r.title||''} terms={highlightTerms} />
            </span>
            {/* Match score badge */}
            {hasScore && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:3,
                padding:'1px 6px', borderRadius:99, fontSize:9, fontWeight:700,
                background: r._relevance_score! >= 70 ? '#D1FAE5' : r._relevance_score! >= 40 ? '#FEF3C7' : '#F1F5F9',
                color:      r._relevance_score! >= 70 ? '#065F46' : r._relevance_score! >= 40 ? '#92400E' : '#64748B',
                border:'1px solid',
                borderColor: r._relevance_score! >= 70 ? '#6EE7B7' : r._relevance_score! >= 40 ? '#FCD34D' : '#E2E8F0',
              }}>
                <Zap size={8} /> {r._relevance_score}% match
              </span>
            )}
          </div>

          {/* Company + meta chips */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:5 }}>
            {r.current_company && (
              <span style={{ fontSize:11, color:'#334155', fontWeight:500, display:'flex', alignItems:'center', gap:3 }}>
                <Briefcase size={10} style={{ color:'#94A3B8', flexShrink:0 }} />
                <Highlight text={r.current_company} terms={highlightTerms} />
              </span>
            )}
            {r.total_experience_years != null && r.total_experience_years >= 0 && (
              <span style={{ fontSize:10, color:'#475569', display:'flex', alignItems:'center', gap:3 }}>
                <span style={{ width:3, height:3, borderRadius:'50%', background:'#CBD5E1', flexShrink:0 }} />
                {r.total_experience_years}y exp
              </span>
            )}
            {r.current_location && (
              <span style={{ fontSize:10, color:'#475569', display:'flex', alignItems:'center', gap:3 }}>
                <MapPin size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                <Highlight text={r.current_location} terms={highlightTerms} />
              </span>
            )}
            {r.notice_period && (
              <span style={{ fontSize:10, color:'#475569', display:'flex', alignItems:'center', gap:3 }}>
                <Clock size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                {r.notice_period}
              </span>
            )}
            {r.current_ctc && (
              <span style={{ fontSize:10, color:'#475569', display:'flex', alignItems:'center', gap:3 }}>
                <IndianRupee size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                {fmtSalary(r.current_ctc)}
                {r.expected_ctc && <span style={{ color:'#94A3B8' }}>&nbsp;→&nbsp;{fmtSalary(r.expected_ctc)}</span>}
              </span>
            )}
          </div>

          {/* Skills */}
          {topSkills.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, alignItems:'center' }}>
              {topSkills.map(sk => {
                const isMatch = highlightTerms.some(h => sk.toLowerCase().includes(h.toLowerCase()));
                return (
                  <span key={sk} style={{
                    padding:'2px 7px', borderRadius:4, fontSize:9, fontWeight:500, border:'1px solid', whiteSpace:'nowrap',
                    ...(isMatch
                      ? { background:'#EDE9FE', color:'#6D28D9', borderColor:'#C4B5FD' }
                      : { background:'#F8FAFC', color:'#64748B', borderColor:'#E2E8F0' }),
                  }}>
                    <Highlight text={sk} terms={highlightTerms} />
                  </span>
                );
              })}
              {moreSkills > 0 && (
                <button onClick={()=>setExpanded(true)} style={{ fontSize:9, color:'#7C3AED', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:'2px 4px' }}>
                  +{moreSkills} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right action column */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
          <Link to={`/talent-pool/${r.id}`} onClick={e=>e.stopPropagation()}>
            <button title="View profile" style={{ width:26, height:26, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}
              onMouseEnter={e=>(e.currentTarget.style.color='#6D28D9')}
              onMouseLeave={e=>(e.currentTarget.style.color='#94A3B8')}>
              <ExternalLink size={11}/>
            </button>
          </Link>
          <button onClick={e=>{e.stopPropagation();onInvite(r);}} title="Invite" style={{ width:26, height:26, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#059669')}
            onMouseLeave={e=>(e.currentTarget.style.color='#94A3B8')}>
            <Send size={11}/>
          </button>
          <button onClick={e=>{e.stopPropagation();toggleBookmark({candidateId:r.id,isBm});}} title={isBm?'Saved':'Save'}
            style={{ width:26, height:26, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:isBm?'#7C3AED':'#94A3B8' }}>
            {isBm ? <BookmarkCheck size={11}/> : <Bookmark size={11}/>}
          </button>
          <button onClick={()=>setExpanded(!expanded)} title={expanded?'Collapse':'Expand'}
            style={{ width:26, height:26, borderRadius:6, border:'1px solid #E2E8F0', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}>
            {expanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
          </button>
        </div>
      </div>

      {/* ── EXPANDED DETAIL ── */}
      {expanded && (
        <div style={{
          borderTop:'1px solid #F1F5F9', padding:'10px 12px 12px 62px',
          display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16,
          background:'#FAFBFF', borderRadius:'0 0 10px 10px',
        }}>
          {/* Column 1: Experience */}
          <div>
            <p style={{ margin:'0 0 6px', fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8' }}>Experience</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {r.current_company && (
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#7C3AED', marginTop:3, flexShrink:0 }} />
                  <div>
                    <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#1E293B' }}>{r.current_designation||'—'}</p>
                    <p style={{ margin:'1px 0 0', fontSize:10, color:'#7C3AED' }}>{r.current_company}</p>
                    <span style={{ fontSize:8, padding:'1px 5px', borderRadius:99, background:'#DCFCE7', color:'#166534', fontWeight:700 }}>Current</span>
                  </div>
                </div>
              )}
              {r.previous_company && (
                <div style={{ display:'flex', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#CBD5E1', marginTop:3, flexShrink:0 }} />
                  <div>
                    <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#1E293B' }}>{r.previous_designation||'—'}</p>
                    <p style={{ margin:'1px 0 0', fontSize:10, color:'#64748B' }}>{r.previous_company}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Education + CTC */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {r.education_summary && (
              <div>
                <p style={{ margin:'0 0 4px', fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8' }}>Education</p>
                <div style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
                  <GraduationCap size={10} style={{ color:'#94A3B8', marginTop:1, flexShrink:0 }} />
                  <span style={{ fontSize:10, color:'#475569' }}>{r.education_summary}</span>
                </div>
              </div>
            )}
            <div>
              <p style={{ margin:'0 0 4px', fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8' }}>Compensation</p>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {r.current_ctc && (
                  <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <IndianRupee size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                    <span style={{ fontSize:10, color:'#475569' }}>Current: <strong>{fmtSalary(r.current_ctc)}</strong></span>
                  </div>
                )}
                {r.expected_ctc && (
                  <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <IndianRupee size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                    <span style={{ fontSize:10, color:'#475569' }}>Expected: <strong>{fmtSalary(r.expected_ctc)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: All skills + contact */}
          <div>
            <p style={{ margin:'0 0 4px', fontSize:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#94A3B8' }}>All Skills ({(r.key_skills||[]).length})</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:8 }}>
              {(r.key_skills||[]).map(sk => {
                const isMatch = highlightTerms.some(h => sk.toLowerCase().includes(h.toLowerCase()));
                return (
                  <span key={sk} style={{ padding:'2px 6px', borderRadius:4, fontSize:9, fontWeight:500, border:'1px solid', ...(isMatch ? { background:'#EDE9FE', color:'#6D28D9', borderColor:'#C4B5FD' } : { background:'#F8FAFC', color:'#64748B', borderColor:'#E2E8F0' }) }}>
                    {sk}
                  </span>
                );
              })}
            </div>
            {/* Contact info if available */}
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {r.email && (
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <Mail size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                  <span style={{ fontSize:9, color:'#475569', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.email}</span>
                </div>
              )}
              {r.phone && (
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <Phone size={9} style={{ color:'#94A3B8', flexShrink:0 }} />
                  <span style={{ fontSize:9, color:'#475569', fontFamily:'monospace' }}>{r.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZiveXCandidateCard;