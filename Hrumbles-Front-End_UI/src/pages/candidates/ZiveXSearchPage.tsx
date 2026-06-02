// src/pages/candidates/ZiveXSearchPage.tsx
// REDESIGNED: Matches TI page architecture — dark hero + collapsible sidebar + results table

import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { SearchFilters, SearchTag, SearchHistory } from '@/types/candidateSearch';
import { ArrowLeft, Clock, Search, Zap } from 'lucide-react';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const ZiveXSearchPage: FC = () => {
  const navigate       = useNavigate();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const [selectedHistory, setSelectedHistory] = useState<SearchHistory | null>(null);
  const [showRecent,       setShowRecent]      = useState(false);

  const handleSearch = (f: SearchFilters) => {
    const p = new URLSearchParams();
    const enc = (key: string, tags: SearchTag[] = []) => {
      const m = tags.filter(t => t.mandatory).map(t => t.value);
      const o = tags.filter(t => !t.mandatory).map(t => t.value);
      if (m.length) p.append(`mandatory_${key}`, m.join(','));
      if (o.length) p.append(`optional_${key}`,  o.join(','));
    };
    enc('name',      f.name);      enc('email',     f.email);
    enc('keywords',  f.keywords);  enc('skills',    f.skills);
    enc('companies', f.companies); enc('educations',f.educations);
    enc('locations', f.locations); enc('industries',f.industries);
    if (f.current_company)     p.append('current_company',     f.current_company);
    if (f.current_designation) p.append('current_designation', f.current_designation);
    if (f.min_exp)  p.append('min_exp',  f.min_exp.toString());
    if (f.max_exp)  p.append('max_exp',  f.max_exp.toString());
    if (f.min_current_salary)  p.append('min_current_salary',  f.min_current_salary.toString());
    if (f.max_current_salary)  p.append('max_current_salary',  f.max_current_salary.toString());
    if (f.min_expected_salary) p.append('min_expected_salary', f.min_expected_salary.toString());
    if (f.max_expected_salary) p.append('max_expected_salary', f.max_expected_salary.toString());
    if (f.notice_periods?.length)        p.append('notice_periods',       f.notice_periods.join(','));
    if (f.date_posted && f.date_posted !== 'all_time') p.append('date_posted', f.date_posted);
    if (f.jd_text)                        p.append('jd_text',              encodeURIComponent(f.jd_text));
    if (f.jd_job_title)                   p.append('jd_job_title',         f.jd_job_title);
    if (f.jd_selected_job_id)             p.append('jd_selected_job_id',   f.jd_selected_job_id);
    if (f.jd_generated_keywords?.length)  p.append('jd_generated_keywords',f.jd_generated_keywords.join('|||'));
    if (f.jd_is_boolean_mode !== undefined) p.append('jd_is_boolean_mode', f.jd_is_boolean_mode.toString());
    navigate(`/zive-x-search/results?${p.toString()}`);
  };

  return (
    <div style={{ minHeight:'calc(100vh - 70px - 8px)', background:'#f8f9fc', fontFamily:'Inter,system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{
        height:44, background:'linear-gradient(90deg,#5B21B6,#7C3AED)',
        borderBottom:'1px solid rgba(109,28,217,0.3)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate(-1)} style={{
            width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,0.2)',
            background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center',
            justifyContent:'center', cursor:'pointer', color:'white',
          }}>
            <ArrowLeft size={13} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{
              width:22, height:22, borderRadius:6, background:'rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Zap size={12} color="white" />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white', lineHeight:1.2 }}>Zive-X Search</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', lineHeight:1 }}>AI-powered candidate discovery</div>
            </div>
          </div>
        </div>
        <button onClick={() => setShowRecent(true)} style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'5px 10px', borderRadius:7,
          border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)',
          cursor:'pointer', fontSize:11, fontWeight:600, color:'white',
        }}>
          <Clock size={11} /> Recent Searches
        </button>
      </div>

      {/* Filters */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'0 16px 40px' }}>
        <CandidateSearchFilters
          onSearch={handleSearch}
          isSearching={false}
          organizationId={organizationId}
          searchHistory={selectedHistory}
        />
      </div>

      {/* Recent modal */}
      <Dialog open={showRecent} onOpenChange={setShowRecent}>
        <DialogContent style={{ maxWidth:720, maxHeight:'80vh', overflowY:'auto' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize:15, fontWeight:700 }}>Recent Searches</DialogTitle>
          </DialogHeader>
          <div style={{ marginTop:12 }}>
            <RecentSearches onSelectSearch={h => { setSelectedHistory(h); setShowRecent(false); }} isModal={true} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZiveXSearchPage;