// src/pages/candidates/ZiveXPage.tsx  — v3
// Architecture:
//   LEFT  : ZiveXSearchSidebar (TISearchSidebar-style, always visible)
//   RIGHT : idle  → ZiveXHeroSection (dark AI + recent searches)
//           active → ZiveXCardList / ZiveXResultsTable (results)
//
// Flow:
//   Sidebar Search button clicked → handleSearch → URL params → Typesense query
//   Recent search clicked → fills sidebar fields via initialFilters + filterKey
//   Header actions: view toggle, select all, bulk invite, filters toggle

import { FC, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';
import { useTypesenseSearch } from '@/hooks/zive-x/useTypesenseSearch';
import ZiveXSearchSidebar from '@/components/candidates/zive-x/ZiveXSearchSidebar';
import ZiveXHeroSection   from '@/components/candidates/zive-x/ZiveXHeroSection';
import ZiveXResultsTable  from '@/components/candidates/zive-x/ZiveXResultsTable';
import ZiveXCardList      from '@/components/candidates/zive-x/ZiveXCardList';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import {
  ArrowLeft, SlidersHorizontal, Send, Briefcase, Search, X, Zap,
  ChevronLeft, ChevronRight, RefreshCw, LayoutList, Table2, Database, AlertCircle,
} from 'lucide-react';

const stripQ = (v: string) => v.replace(/^"|"$/g, '').trim();
const SIDEBAR_W = 280;

interface JobOption {
  id:string; title:string; jobId:string; location?:any; experience?:any;
  skills?:string[]; description?:string; hiringMode?:string; jobType?:string;
  clientDetails?:any; noticePeriod?:string; department?:string;
}

// ── JOB PICKER MODAL ─────────────────────────────────────────────────────────
const JobPickerModal: FC<{
  isOpen:boolean; onClose:()=>void; onSelect:(j:JobOption)=>void;
  jobs:JobOption[]; mode:'single'|'bulk'; candidateCount?:number;
}> = ({ isOpen, onClose, onSelect, jobs, mode, candidateCount=1 }) => {
  const [q, setQ] = useState('');
  const filtered = jobs.filter(j=>j.title.toLowerCase().includes(q.toLowerCase()));
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1050 }}/>
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1051,width:'calc(100vw - 32px)',maxWidth:440,background:'#fff',borderRadius:14,boxShadow:'0 20px 56px rgba(0,0,0,0.2)',overflow:'hidden' }}>
        <div style={{ padding:'14px 16px',background:'linear-gradient(135deg,#5B21B6,#7C3AED)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <p style={{ margin:0,fontSize:13,fontWeight:700,color:'white' }}>{mode==='bulk'?`Select Job — Invite ${candidateCount} Candidate${candidateCount!==1?'s':''}`:' Select Job to Invite'}</p>
            <p style={{ margin:'2px 0 0',fontSize:10,color:'rgba(255,255,255,0.65)' }}>Choose which job this invite is for</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)',border:'none',borderRadius:6,padding:5,cursor:'pointer' }}><X size={13} color="white"/></button>
        </div>
        <div style={{ padding:'10px 12px',borderBottom:'1px solid #F3F4F6',position:'relative' }}>
          <Search size={12} style={{ position:'absolute',left:22,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF' }}/>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search jobs…" style={{ width:'100%',padding:'7px 10px 7px 28px',borderRadius:7,border:'1px solid #E5E7EB',fontSize:12,outline:'none',boxSizing:'border-box' }}/>
        </div>
        <div style={{ maxHeight:300,overflowY:'auto' }}>
          {filtered.length===0
            ? <div style={{ padding:24,textAlign:'center',color:'#9CA3AF',fontSize:12 }}>No active jobs found</div>
            : filtered.map((j,i)=>(
              <button key={j.id} onClick={()=>{onSelect(j);setQ('');}} style={{ width:'100%',padding:'10px 14px',border:'none',background:'none',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:10,borderBottom:i<filtered.length-1?'1px solid #F9FAFB':'none' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#F5F3FF')} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                <div style={{ width:30,height:30,borderRadius:8,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Briefcase size={14} color="#7C3AED"/></div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:0,fontSize:12,fontWeight:600,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{j.title}</p>
                  <div style={{ display:'flex',gap:6,marginTop:2 }}>
                    <span style={{ fontSize:10,color:'#9CA3AF',fontFamily:'monospace' }}>{j.jobId}</span>
                    {j.hiringMode&&<span style={{ fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:99,background:'#EDE9FE',color:'#7C3AED' }}>{j.hiringMode}</span>}
                  </div>
                </div>
                <span style={{ fontSize:16,color:'#C4B5FD' }}>›</span>
              </button>
            ))
          }
        </div>
        <div style={{ padding:'10px 14px',borderTop:'1px solid #F3F4F6',display:'flex',justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'6px 14px',borderRadius:7,border:'1px solid #E5E7EB',background:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',color:'#6B7280' }}>Cancel</button>
        </div>
      </div>
    </>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const ZiveXPage: FC = () => {
  const navigate        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const organizationId  = useSelector((s:any) => s.auth.organization_id);
  const userId          = useSelector((s:any) => s.auth.user?.id);

  const [sidebarOpen,    setSidebarOpen]   = useState(true);
  const [hasSearched,    setHasSearched]   = useState(false);
  const [viewMode,       setViewMode]      = useState<'card'|'table'>('card');
  const [selectedIds,    setSelectedIds]   = useState<Set<string>>(new Set());
  const [jobPickerMode,  setJobPickerMode] = useState<'single'|'bulk'|null>(null);
  const [pendingSingle,  setPendingSingle] = useState<CandidateSearchResult|null>(null);
  const [pendingBulkList,setPendingBulkList]= useState<BulkInviteCandidate[]>([]);
  const [selectedJob,    setSelectedJob]   = useState<JobOption|null>(null);
  const [singleOpen,     setSingleOpen]    = useState(false);
  const [bulkOpen,       setBulkOpen]      = useState(false);
  // sidebarKey + sidebarFilters: force ZiveXSearchSidebar to remount with new initialFilters
  // when a recent search is clicked in the hero section
  const [sidebarKey,     setSidebarKey]    = useState(0);
  const [sidebarFilters, setSidebarFilters]= useState<Partial<SearchFilters>>({});

  // Auto-init from URL (e.g. direct link)
  useEffect(()=>{
    if (Array.from(searchParams.keys()).length > 0) setHasSearched(true);
  },[]);

  const { data: waCfg } = useQuery({
    queryKey:['wa-cfg',organizationId],
    queryFn: async()=>{ const{data}=await supabase.from('hr_organizations').select('whatsapp_config').eq('id',organizationId).single(); return data?.whatsapp_config||null; },
    enabled:!!organizationId,
  });
  const { data: jobs=[] } = useQuery<JobOption[]>({
    queryKey:['zx-jobs',organizationId],
    queryFn: async()=>{
      const{data,error}=await supabase.from('hr_jobs').select('*').eq('organization_id',organizationId).eq('status','Active').order('created_at',{ascending:false}).limit(200);
      if(error)throw error;
      return (data||[]).map((j:any)=>({id:j.id,title:j.title,jobId:j.job_id,location:j.location,experience:j.experience,skills:j.skills,description:j.description,hiringMode:j.hiring_mode,jobType:j.job_type,clientDetails:j.client_details,noticePeriod:j.notice_period,department:j.department}));
    },
    enabled:!!organizationId,
  });

  // Parse URL → SearchFilters (for Typesense query)
  const filters: SearchFilters = useMemo(()=>{
    const getTags=(key:string):SearchTag[]=>{
      const m=searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const o=searchParams.get(`optional_${key}`)?.split(',')  || [];
      return [...m.filter(Boolean).map(v=>({value:stripQ(v),mandatory:true})), ...o.filter(Boolean).map(v=>({value:stripQ(v),mandatory:false}))];
    };
    return {
      keywords:getTags('keywords'), skills:getTags('skills'), educations:getTags('educations'),
      locations:getTags('locations'), industries:getTags('industries'), companies:getTags('companies'),
      name:getTags('name'), email:getTags('email'),
      current_company:searchParams.get('current_company')||'',
      current_designation:searchParams.get('current_designation')||'',
      min_exp:searchParams.get('min_exp')?parseInt(searchParams.get('min_exp')!):null,
      max_exp:searchParams.get('max_exp')?parseInt(searchParams.get('max_exp')!):null,
      min_current_salary:searchParams.get('min_current_salary')?parseFloat(searchParams.get('min_current_salary')!):null,
      max_current_salary:searchParams.get('max_current_salary')?parseFloat(searchParams.get('max_current_salary')!):null,
      min_expected_salary:searchParams.get('min_expected_salary')?parseFloat(searchParams.get('min_expected_salary')!):null,
      max_expected_salary:searchParams.get('max_expected_salary')?parseFloat(searchParams.get('max_expected_salary')!):null,
      notice_periods:searchParams.get('notice_periods')?.split(',').filter(Boolean)||[],
      date_posted:searchParams.get('date_posted')||'all_time',
      jd_text:searchParams.get('jd_text')?decodeURIComponent(searchParams.get('jd_text')!):undefined,
      jd_generated_keywords:searchParams.get('jd_generated_keywords')?.split('|||').filter(Boolean)||undefined,
      jd_is_boolean_mode:searchParams.get('jd_is_boolean_mode')==='true',
    };
  },[searchParams]);

  const highlightTerms = useMemo(()=>{
    const terms:string[]=[];
    ['keywords','skills','companies','educations','locations'].forEach(k=>{
      const m=searchParams.get(`mandatory_${k}`)?.split(',').filter(Boolean)||[];
      const o=searchParams.get(`optional_${k}`)?.split(',').filter(Boolean)||[];
      [...m,...o].forEach(v=>terms.push(stripQ(v)));
    });
    const cc=searchParams.get('current_company'); if(cc)terms.push(cc);
    const cd=searchParams.get('current_designation'); if(cd)terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  },[searchParams]);

  const activeFilterCount = useMemo(()=>{
    let n=0;
    if(filters.keywords?.length)n++; if(filters.skills?.length)n++;
    if(filters.locations?.length)n++; if(filters.companies?.length)n++;
    if(filters.educations?.length)n++; if(filters.current_company)n++;
    if(filters.current_designation)n++; if(filters.min_exp||filters.max_exp)n++;
    if(filters.notice_periods?.length)n++;
    return n;
  },[filters]);

  const { data:searchResults=[], isLoading, isError, error } = useTypesenseSearch({filters,organizationId,enabled:hasSearched});

  // Encode SearchFilters → URL params
  const encodeFilters = useCallback((nf:SearchFilters)=>{
    const p=new URLSearchParams();
    const enc=(key:string,tags:SearchTag[]=[])=>{
      const m=tags.filter(t=>t.mandatory).map(t=>stripQ(t.value));
      const o=tags.filter(t=>!t.mandatory).map(t=>stripQ(t.value));
      if(m.length)p.append(`mandatory_${key}`,m.join(','));
      if(o.length)p.append(`optional_${key}`,o.join(','));
    };
    enc('keywords',nf.keywords||[]); enc('skills',nf.skills||[]); enc('locations',nf.locations||[]);
    enc('companies',nf.companies||[]); enc('educations',nf.educations||[]); enc('industries',nf.industries||[]);
    enc('name',nf.name||[]); enc('email',nf.email||[]);
    if(nf.current_company)    p.append('current_company',nf.current_company);
    if(nf.current_designation)p.append('current_designation',nf.current_designation);
    if(nf.min_exp)p.append('min_exp',nf.min_exp.toString());
    if(nf.max_exp)p.append('max_exp',nf.max_exp.toString());
    if(nf.min_current_salary) p.append('min_current_salary',nf.min_current_salary.toString());
    if(nf.max_current_salary) p.append('max_current_salary',nf.max_current_salary.toString());
    if(nf.min_expected_salary)p.append('min_expected_salary',nf.min_expected_salary.toString());
    if(nf.max_expected_salary)p.append('max_expected_salary',nf.max_expected_salary.toString());
    if(nf.notice_periods?.length)p.append('notice_periods',nf.notice_periods.join(','));
    if(nf.date_posted&&nf.date_posted!=='all_time')p.append('date_posted',nf.date_posted);
    if(nf.jd_text)p.append('jd_text',encodeURIComponent(nf.jd_text));
    if(nf.jd_generated_keywords?.length)p.append('jd_generated_keywords',nf.jd_generated_keywords.join('|||'));
    if(nf.jd_is_boolean_mode!==undefined)p.append('jd_is_boolean_mode',nf.jd_is_boolean_mode.toString());
    return p;
  },[]);

  // Called by ZiveXSearchSidebar Submit and ZiveXHeroSection keyword clicks
  const handleSearch = useCallback((nf:SearchFilters)=>{
    const p=encodeFilters(nf);
    setSearchParams(p,{replace:true});
    setHasSearched(true);
    setSelectedIds(new Set());
  },[encodeFilters,setSearchParams]);

  // Called when a recent search is clicked in ZiveXHeroSection
  // → fills sidebar with those filters AND triggers search
  const handleHistorySelect = useCallback((h:any, sf:SearchFilters)=>{
    setSidebarFilters(sf);           // pass to ZiveXSearchSidebar as initialFilters
    setSidebarKey(k=>k+1);          // remount sidebar so useEffect re-populates fields
    handleSearch(sf);               // trigger Typesense search immediately
  },[handleSearch]);

  // Invite handlers
  const handleSingleInvite  = useCallback((c:CandidateSearchResult)=>{setPendingSingle(c);setJobPickerMode('single');},[]);
  const handleToggleSelect  = useCallback((id:string)=>{setSelectedIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});},[]);
  const handleSelectAll     = useCallback(()=>{setSelectedIds(searchResults.length>0&&selectedIds.size===searchResults.length?new Set():new Set(searchResults.map(r=>r.id)));},[selectedIds.size,searchResults]);
  const handleBulkInvite    = ()=>{
    const pool=selectedIds.size>0?searchResults.filter(r=>selectedIds.has(r.id)):searchResults;
    const withEmail=pool.filter(r=>r.email); if(!withEmail.length)return;
    setPendingBulkList(withEmail.map(r=>({id:r.id,name:r.full_name||'',email:r.email!,phone:r.phone,candidateOwnerId:userId||''})));
    setJobPickerMode('bulk');
  };
  const handleJobPicked=(job:JobOption)=>{setSelectedJob(job);setJobPickerMode(null);pendingBulkList.length>0?setBulkOpen(true):setSingleOpen(true);};
  const handlePickerClose=()=>{setJobPickerMode(null);setPendingSingle(null);setPendingBulkList([]);};

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 70px - 8px)',fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ flexShrink:0,height:44,background:'linear-gradient(90deg,#4C1D95,#6D28D9,#7C3AED)',borderBottom:'1px solid rgba(109,28,217,0.4)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px',boxShadow:'0 2px 8px rgba(76,29,149,0.25)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
          <button onClick={()=>navigate(-1)} style={{ width:28,height:28,borderRadius:7,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white' }}>
            <ArrowLeft size={13}/>
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:7 }}>
            <div style={{ width:24,height:24,borderRadius:7,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Database size={13} color="white"/>
            </div>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:'white',lineHeight:1.2 }}>Zive-X</div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,0.6)',lineHeight:1,display:'flex',alignItems:'center',gap:4 }}>
                {hasSearched&&isLoading
                  ? <><RefreshCw size={8} style={{ animation:'spin 0.8s linear infinite' }}/>&nbsp;Searching…</>
                  : hasSearched
                  ? <><span style={{ width:5,height:5,borderRadius:'50%',background:'#34D399',display:'inline-block' }}/>&nbsp;{searchResults.length.toLocaleString()} results</>
                  : 'xrilic powered talent search'
                }
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          {/* <div style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:99,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',fontSize:9,fontWeight:700,color:'white' }}>
            <Zap size={9}/> Typesense
          </div> */}
          {hasSearched&&searchResults.length>0&&(<>
            <div style={{ display:'flex',alignItems:'center',background:'rgba(255,255,255,0.1)',borderRadius:7,border:'1px solid rgba(255,255,255,0.15)',overflow:'hidden' }}>
              {(['card','table'] as const).map(m=>(
                <button key={m} onClick={()=>setViewMode(m)} style={{ width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',border:'none',cursor:'pointer',transition:'all 0.15s',background:viewMode===m?'rgba(255,255,255,0.25)':'transparent',color:'white' }}>
                  {m==='card'?<LayoutList size={12}/>:<Table2 size={12}/>}
                </button>
              ))}
            </div>
            <button onClick={handleSelectAll} style={{ padding:'4px 10px',borderRadius:99,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.1)',fontSize:11,fontWeight:600,color:'white',cursor:'pointer' }}>
              {selectedIds.size===searchResults.length&&searchResults.length>0?'Deselect All':`Select All (${searchResults.length})`}
            </button>
            <button onClick={handleBulkInvite} style={{ display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:99,border:'none',background:'rgba(255,255,255,0.92)',fontSize:11,fontWeight:700,color:'#6D28D9',cursor:'pointer' }}>
              <Send size={10}/> Bulk Invite{selectedIds.size>0?` (${selectedIds.size})`:''}
            </button>
          </>)}
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px solid rgba(255,255,255,0.2)',background:sidebarOpen?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.08)',cursor:'pointer',fontSize:11,fontWeight:600,color:'white' }}>
            <SlidersHorizontal size={11}/> Filters{activeFilterCount>0&&<span style={{ fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:99,background:'rgba(255,255,255,0.9)',color:'#6D28D9' }}>{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:'flex',flex:1,minHeight:0,overflow:'hidden',position:'relative' }}>

        {/* SIDEBAR — ZiveXSearchSidebar */}
        <div style={{ flexShrink:0,borderRight:'1px solid #E2E8F0',background:'white',overflow:'hidden',transition:'width 0.25s ease, opacity 0.25s ease',width:sidebarOpen?SIDEBAR_W:0,opacity:sidebarOpen?1:0 }}>
          <div style={{ width:SIDEBAR_W,height:'100%',overflow:'hidden' }}>
            <ZiveXSearchSidebar
              key={sidebarKey}
              onSearch={handleSearch}
              isSearching={isLoading}
              initialFilters={sidebarFilters}
              organizationId={organizationId}
            />
          </div>
        </div>

        {/* Floating sidebar toggle */}
        <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ position:'absolute',top:'50%',transform:'translateY(-50%)',left:sidebarOpen?SIDEBAR_W-1:-1,zIndex:20,width:14,height:40,background:'white',border:'1px solid #E2E8F0',borderLeft:'none',borderRadius:'0 6px 6px 0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF',boxShadow:'2px 0 6px rgba(0,0,0,0.05)',transition:'left 0.25s ease' }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#7C3AED';}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#9CA3AF';}}>
          {sidebarOpen?<ChevronLeft size={10}/>:<ChevronRight size={10}/>}
        </button>

        {/* MAIN CONTENT */}
        <div style={{ flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          {isError&&(
            <div style={{ margin:'8px 12px 0',padding:'10px 14px',borderRadius:8,background:'#FEF2F2',border:'1px solid #FECACA',fontSize:12,color:'#B91C1C',display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
              <AlertCircle size={13}/> Search error: {(error as Error)?.message||'Unknown'}. Check Typesense.
            </div>
          )}

          {/* IDLE — dark AI hero + recent searches */}
          {!hasSearched&&(
            <div style={{ flex:1,overflow:'hidden' }}>
              <ZiveXHeroSection
                organizationId={organizationId}
                onSearch={handleSearch}
                onHistorySelect={handleHistorySelect}
              />
            </div>
          )}

          {/* RESULTS */}
          {hasSearched&&(
            <div style={{ flex:1,minHeight:0,overflow:'hidden',display:'flex',flexDirection:'column',background:'#F1F3F7' }}>
              {viewMode==='card'
                ? <ZiveXCardList    results={searchResults} isLoading={isLoading} highlightTerms={highlightTerms} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onInvite={handleSingleInvite}/>
                : <ZiveXResultsTable results={searchResults} isLoading={isLoading} highlightTerms={highlightTerms} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onInvite={handleSingleInvite}/>
              }
            </div>
          )}
        </div>
      </div>

      <JobPickerModal isOpen={jobPickerMode!==null} onClose={handlePickerClose} onSelect={handleJobPicked} jobs={jobs} mode={jobPickerMode||'single'} candidateCount={jobPickerMode==='bulk'?pendingBulkList.length:1}/>
      {singleOpen&&selectedJob&&pendingSingle&&(
        <InviteCandidateModal isOpen={singleOpen} onClose={()=>{setSingleOpen(false);setPendingSingle(null);setSelectedJob(null);}} jobId={selectedJob.id} job={selectedJob} prefillName={pendingSingle.full_name||''} prefillEmail={pendingSingle.email||''} prefillPhone={pendingSingle.phone||''} inviteSource="zivex"/>
      )}
      {bulkOpen&&selectedJob&&pendingBulkList.length>0&&(
        <BulkInviteReviewModal isOpen={bulkOpen} onClose={()=>{setBulkOpen(false);setPendingBulkList([]);setSelectedJob(null);setSelectedIds(new Set());}} candidates={pendingBulkList} jobId={selectedJob.id} jobTitle={selectedJob.title} inviteSource="zivex" job={selectedJob} waTemplateName={waCfg?.default_template_name} waTemplateLanguage={waCfg?.default_template_language||'en_US'} waOrgName={waCfg?.company_name||''}/>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
};

export default ZiveXPage;