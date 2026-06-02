// src/components/candidates/zive-x/ZiveXHeroSection.tsx
// Dark AI hero section for Zive-X idle state
// Extracted from CandidateSearchFilters — DarkVeil, JD textarea,
// AI Draft/Upload/Generate Keywords buttons, keyword pills,
// Recent Searches below. Clicking a recent search populates sidebar.

import { useState, useRef, useEffect, useMemo, FC } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, X, Loader2, Send, Bot, Upload, FileText, Wand2,
  Lightbulb, Activity, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import DarkVeil from '@/components/ui/Reactbits-theme/DarkVeil';
import RecentSearches from '@/components/candidates/zive-x/RecentSearches';
import { SearchFilters, SearchTag } from '@/types/candidateSearch';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
}

interface ZiveXHeroSectionProps {
  organizationId: string;
  onSearch:       (filters: SearchFilters) => void;
  onHistorySelect:(h: any, filters: SearchFilters) => void; // also passes parsed filters
}

// Fallback suggestion generator
const EXAMPLE_SUGGESTIONS = [
  'Senior Python Developer, 5-8 years, hybrid Bangalore, Flask/Django',
  'Frontend Engineer with React, 3-5 years, remote, startup experience',
  'Full Stack Developer, Node.js and React, 4-6 years, Mumbai office',
  'DevOps Engineer with AWS and Kubernetes, 6-10 years, Pune',
  'Data Scientist, Python and ML, 3-5 years, remote, fintech domain',
];

const ZiveXHeroSection: FC<ZiveXHeroSectionProps> = ({ organizationId, onSearch, onHistorySelect }) => {
  const [jdText,            setJdText]            = useState('');
  const [isChatMode,        setIsChatMode]        = useState(false);
  const [chatMessages,      setChatMessages]      = useState<ChatMessage[]>([]);
  const [chatInput,         setChatInput]         = useState('');
  const [isProcessingIntent,setIsProcessingIntent]= useState(false);
  const [isGeneratingFullJD,setIsGeneratingFullJD]= useState(false);
  const [jdContext,         setJdContext]         = useState<any>(null);
  const [dynamicSuggestions,setDynamicSuggestions]= useState<string[]>(EXAMPLE_SUGGESTIONS);
  const [isGeneratingSugg,  setIsGeneratingSugg]  = useState(false);
  const [isGeneratingKw,    setIsGeneratingKw]    = useState(false);
  const [aiKeywords,        setAiKeywords]        = useState<string[]>([]);
  const [visibleKwCount,    setVisibleKwCount]    = useState(0);
  const [isAnimating,       setIsAnimating]       = useState(false);
  const [showKwPanel,       setShowKwPanel]       = useState(false);
  const [openJobCombobox,   setOpenJobCombobox]   = useState(false);
  const [userName,          setUserName]          = useState('');
  const [suggCache]                               = useState<Map<string,string[]>>(new Map());
  const [isTestMode,        setIsTestMode]        = useState(false);
  const [testDebug,         setTestDebug]         = useState<any>(null);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const chatScrollRef= useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout>|null>(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['zx-hero-jobs', organizationId],
    queryFn: async () => {
      const { data } = await supabase.from('hr_jobs').select('id,title,description').eq('organization_id',organizationId).eq('status','Active').order('created_at',{ascending:false}).limit(100);
      return data || [];
    },
    enabled: !!organizationId,
  });

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if (!user) return;
      const m = user.user_metadata||{};
      const name = m.full_name||m.name||(m.first_name?`${m.first_name} ${m.last_name||''}`.trim():null)||(user.email?.split('@')[0]||'');
      setUserName(name.charAt(0).toUpperCase()+name.slice(1));
    });
  },[]);

  useEffect(()=>{
    if (!isChatMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (chatInput.length >= 2) {
      debounceRef.current = setTimeout(()=>fetchSuggestions(chatInput), 600);
    } else {
      setDynamicSuggestions(EXAMPLE_SUGGESTIONS.slice(0,4));
    }
    return ()=>{ if(debounceRef.current) clearTimeout(debounceRef.current); };
  },[chatInput, isChatMode]);

  useEffect(()=>{
    if (isChatMode && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({top:chatScrollRef.current.scrollHeight,behavior:'smooth'});
    }
  },[chatMessages, isChatMode]);

  const fetchSuggestions = async (input:string) => {
    const key = input.toLowerCase().trim();
    if (suggCache.has(key)) { setDynamicSuggestions(suggCache.get(key)!); return; }
    setIsGeneratingSugg(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-jd-suggestions-deepseek-test',{body:{userInput:input,conversationContext:jdContext,organizationId}});
      if (error) throw error;
      if (data?.suggestions) { setDynamicSuggestions(data.suggestions); suggCache.set(key,data.suggestions); setIsTestMode(data.isTestMode||false); if(data.debug)setTestDebug(data.debug); }
    } catch { setDynamicSuggestions(EXAMPLE_SUGGESTIONS.slice(0,4)); }
    finally { setIsGeneratingSugg(false); }
  };

  const showKeywordsSequentially = async (kws:string[]) => {
    setVisibleKwCount(0);
    for (let i=0; i<kws.length; i++) {
      setVisibleKwCount(i+1);
      await new Promise(r=>setTimeout(r,180));
    }
  };

  const handleGenerateKeywords = async () => {
    if (!jdText.trim()) return;
    setIsGeneratingKw(true); setAiKeywords([]); setShowKwPanel(true); setVisibleKwCount(0);
    try {
      const { data, error } = await supabase.functions.invoke('generate-boolean-search-4o',{body:{jobDescription:jdText}});
      if (error) throw error;
      const kws = data.keywords||[];
      setAiKeywords(kws);
      setIsAnimating(true);
      await showKeywordsSequentially(kws);
      setIsAnimating(false);
      // Save to history
      if (kws.length) {
        await supabase.rpc('save_candidate_search_history',{
          p_organization_id:organizationId, p_job_title:'',p_jd_text:jdText,
          p_selected_job_id:null,p_generated_keywords:kws,p_is_boolean_mode:false,p_search_filters:null,
        }).catch(()=>{});
      }
    } catch { setShowKwPanel(false); }
    finally { setIsGeneratingKw(false); }
  };

  const handleAddKeyword = (kw:string) => {
    // Triggers a search with this keyword as optional tag
    onSearch({ keywords:[{value:kw,mandatory:false}] });
  };

  const handleAddAllKeywords = () => {
    const kws = aiKeywords.slice(0,visibleKwCount);
    onSearch({ keywords: kws.map(k=>({value:k,mandatory:false})) });
  };

  const handleFileUpload = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text().catch(()=>'');
    if (text) setJdText(text);
  };

  const handleJobSelect = (jobId:string) => {
    const job = jobs.find((j:any)=>j.id===jobId);
    if (job?.description) setJdText(job.description);
    setOpenJobCombobox(false);
  };

  const parseUserIntent = async (input:string, ctx:any=null) => {
    try {
      const {data,error}=await supabase.functions.invoke('parse-jd-intent-deepseek',{body:{userInput:input,conversationContext:ctx}});
      if(error)throw error; return data;
    } catch { return null; }
  };

  const generateJDFromContext = async (ctx:any) => {
    try {
      const payload={jobTitle:ctx.jobTitle,department:ctx.department,location:ctx.location,employmentType:ctx.workMode,experienceRange:ctx.experienceMin&&ctx.experienceMax?`${ctx.experienceMin}-${ctx.experienceMax} years`:null,seniority:ctx.seniority,primarySkills:ctx.primarySkills?.join(', '),secondarySkills:ctx.secondarySkills?.join(', '),responsibilities:ctx.responsibilities?.join('; '),education:ctx.education?.join(', '),certifications:ctx.certifications?.join(', '),industry:ctx.industry,salary:ctx.salaryMin&&ctx.salaryMax?`₹${ctx.salaryMin}-${ctx.salaryMax} LPA`:null,positionCount:ctx.positionCount,timeline:ctx.timeline};
      const {data,error}=await supabase.functions.invoke('generate-jd-from-prompts',{body:{answers:payload}});
      if(error)throw error; return data.fullJD;
    } catch { return null; }
  };

  const handleSuggestionClick = async (suggestion:string) => {
    setChatInput(suggestion);
    setChatMessages(p=>[...p,{id:`u-${Date.now()}`,role:'user',content:suggestion}]);
    setIsProcessingIntent(true);
    const parsed = await parseUserIntent(suggestion, jdContext);
    if (!parsed) { setChatMessages(p=>[...p,{id:`e-${Date.now()}`,role:'assistant',content:"Sorry, could you rephrase that?"}]); setIsProcessingIntent(false); return; }
    const ctx={...(jdContext||{}),...parsed.extracted}; setJdContext(ctx);
    if (parsed.canGenerateDraft) {
      setChatMessages(p=>[...p,{id:`s-${Date.now()}`,role:'system',content:"✨ Generating your job description…"}]);
      setIsGeneratingFullJD(true);
      const jd = await generateJDFromContext(ctx);
      setIsGeneratingFullJD(false);
      if (jd) { setJdText(jd); setIsChatMode(false); }
    } else if (parsed.suggestedQuestion) {
      setChatMessages(p=>[...p,{id:`a-${Date.now()}`,role:'assistant',content:parsed.suggestedQuestion}]);
    }
    setIsProcessingIntent(false);
  };

  const handleChatSubmit = async () => {
    const input=chatInput.trim(); if(!input)return;
    setChatMessages(p=>[...p,{id:`u-${Date.now()}`,role:'user',content:input}]);
    setChatInput(''); setIsProcessingIntent(true);
    const parsed = await parseUserIntent(input, jdContext);
    if (!parsed) { setChatMessages(p=>[...p,{id:`e-${Date.now()}`,role:'assistant',content:"Sorry, could you rephrase?"}]); setIsProcessingIntent(false); return; }
    const ctx={...(jdContext||{}),...parsed.extracted}; setJdContext(ctx);
    if (parsed.canGenerateDraft) {
      setChatMessages(p=>[...p,{id:`s-${Date.now()}`,role:'system',content:"✨ Generating your JD…"}]);
      setIsGeneratingFullJD(true);
      const jd = await generateJDFromContext(ctx);
      setIsGeneratingFullJD(false);
      if (jd) { setJdText(jd); setIsChatMode(false); }
    } else if (parsed.suggestedQuestion) {
      setChatMessages(p=>[...p,{id:`a-${Date.now()}`,role:'assistant',content:parsed.suggestedQuestion}]);
    } else {
      setChatMessages(p=>[...p,{id:`a-${Date.now()}`,role:'assistant',content:"Got it! Tell me more about this role."}]);
    }
    setIsProcessingIntent(false);
  };

  const startChat = () => {
    setIsChatMode(true);
    setDynamicSuggestions(EXAMPLE_SUGGESTIONS.slice(0,4));
    setChatMessages([{id:'intro',role:'assistant',content:"Hi! I'll help you draft a great JD. Describe the role or pick a template below."}]);
  };

  // Recent search click → parse filters and pass to parent
  const handleRecentSelect = (h:any) => {
    const sf: SearchFilters = h.search_filters || {
      keywords: (h.generated_keywords||[]).map((k:string)=>({value:k,mandatory:false})),
    };
    onHistorySelect(h, sf);
  };

  const displayKws = aiKeywords.slice(0, visibleKwCount);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, overflowY:'auto', height:'100%' }}>
      {/* ── DARK HERO ── */}
      <div style={{ position:'relative', background:'#000', borderBottom:'1px solid rgba(255,255,255,0.07)', minHeight:440, display:'flex', flexDirection:'column' }}>
        <div style={{ position:'absolute', inset:0, zIndex:0 }}><DarkVeil /></div>
        <div style={{ position:'relative', zIndex:1, padding:32, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1 }}>

          {/* Welcome */}
          {!isChatMode && !jdText && (
            <div style={{ textAlign:'center', marginBottom:24, animation:'fadeIn 0.4s ease' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:20, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', fontSize:11, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>
                <Sparkles size={11} style={{ color:'#C4B5FD' }} /> AI Recruiting
              </div>
              {userName && <h1 style={{ fontSize:36, fontWeight:800, color:'white', margin:'0 0 8px', letterSpacing:'-1px', textShadow:'0 10px 30px rgba(0,0,0,0.5)' }}>Welcome, {userName}</h1>}
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', margin:0 }}>Paste a JD or use AI to find the right candidates</p>
            </div>
          )}

          {/* JD textarea or Chat */}
          <div style={{ width:'100%', maxWidth:580, position:'relative', marginBottom:16 }}>
            {isChatMode ? (
              <div style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, height:380, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'white', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', alignItems:'center', gap:6 }}>
                    <Bot size={13}/> AI Assistant
                    {isTestMode&&<span style={{ fontSize:9, padding:'1px 6px', borderRadius:99, background:'rgba(234,179,8,0.15)', color:'#FCD34D' }}>TEST</span>}
                  </span>
                  <button onClick={()=>{setIsChatMode(false);}} style={{ width:22, height:22, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                    <X size={11}/>
                  </button>
                </div>
                <div ref={chatScrollRef} style={{ flex:1, overflowY:'auto', padding:12 }}>
                  {chatMessages.map(msg=>(
                    <div key={msg.id} style={{ marginBottom:10, padding:'8px 12px', borderRadius:10, fontSize:12, lineHeight:1.5,
                      ...(msg.role==='assistant'?{background:'rgba(255,255,255,0.08)',color:'white',maxWidth:'85%'}:
                         msg.role==='system'?{background:'rgba(168,85,247,0.2)',color:'#DDD6FE',textAlign:'center',maxWidth:'100%'}:
                         {background:'#7C3AED',color:'white',marginLeft:'auto',maxWidth:'85%'}) }}>
                      {msg.content}
                    </div>
                  ))}
                  {isProcessingIntent&&<div style={{ display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.5)', fontSize:12 }}><Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }}/> Thinking…</div>}
                  <div ref={chatEndRef}/>
                  {/* Suggestions */}
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
                      <Lightbulb size={10}/> {chatInput.length>0?'Suggestions:':'Try these:'}
                      {isGeneratingSugg&&<Loader2 size={10} style={{ animation:'spin 0.8s linear infinite' }}/>}
                    </div>
                    {dynamicSuggestions.map((s,i)=>(
                      <button key={i} onClick={()=>handleSuggestionClick(s)}
                        style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', marginBottom:5, borderRadius:9, fontSize:12, color:'white', background:'linear-gradient(135deg,rgba(119,49,232,0.12),rgba(168,85,247,0.12))', border:'1px solid rgba(119,49,232,0.25)', cursor:'pointer', transition:'all 0.2s' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='linear-gradient(135deg,rgba(119,49,232,0.25),rgba(168,85,247,0.25))')}
                        onMouseLeave={e=>(e.currentTarget.style.background='linear-gradient(135deg,rgba(119,49,232,0.12),rgba(168,85,247,0.12))')}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!isProcessingIntent&&!isGeneratingFullJD) handleChatSubmit(); }}
                    disabled={isProcessingIntent||isGeneratingFullJD}
                    placeholder="Describe the role…"
                    style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9, padding:'7px 12px', fontSize:12, color:'white', outline:'none' }}/>
                  <button onClick={handleChatSubmit} disabled={isProcessingIntent||isGeneratingFullJD}
                    style={{ width:36, height:36, borderRadius:9, border:'none', background:'#7C3AED', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                    {isProcessingIntent?<Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/>:<Send size={13}/>}
                  </button>
                </div>
              </div>
            ) : (
              <textarea value={jdText} onChange={e=>setJdText(e.target.value)}
                placeholder="Paste your Job Description here, or use AI to draft one…"
                style={{ width:'100%', minHeight:110, padding:'16px 18px', borderRadius:16, fontSize:14, lineHeight:1.6, color:'white', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', backdropFilter:'blur(12px)', resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e=>{e.target.style.background='rgba(255,255,255,0.11)';e.target.style.borderColor='rgba(255,255,255,0.38)';}}
                onBlur={e=>{e.target.style.background='rgba(255,255,255,0.07)';e.target.style.borderColor='rgba(255,255,255,0.14)';}}/>
            )}
          </div>

          {/* Action buttons */}
          {!isChatMode && (
            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10, width:'100%', maxWidth:580 }}>
              <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx,.pdf" onChange={handleFileUpload} style={{ display:'none' }}/>
              <button type="button" onClick={()=>fileInputRef.current?.click()}
                style={{ height:38, padding:'0 18px', display:'flex', alignItems:'center', gap:6, borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'white', border:'1px solid rgba(255,255,255,0.12)', transition:'all 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.14)')}
                onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.05)')}>
                <Upload size={13}/> Upload JD
              </button>
              <button type="button" onClick={startChat}
                style={{ height:38, padding:'0 18px', display:'flex', alignItems:'center', gap:6, borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'white', border:'1px solid rgba(255,255,255,0.12)', transition:'all 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.14)')}
                onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.05)')}>
                <Wand2 size={13}/> Draft with AI
              </button>
              <Popover open={openJobCombobox} onOpenChange={setOpenJobCombobox}>
                <PopoverTrigger asChild>
                  <button type="button"
                    style={{ height:38, padding:'0 18px', display:'flex', alignItems:'center', gap:6, borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'white', border:'1px solid rgba(255,255,255,0.12)' }}>
                    <FileText size={13}/> Select Job
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 bg-gray-900 border-gray-700 text-white">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Search job…" className="text-white placeholder:text-gray-500"/>
                    <CommandList>
                      <CommandEmpty>No jobs found.</CommandEmpty>
                      <CommandGroup>
                        {jobs.map((j:any)=>(
                          <CommandItem key={j.id} value={j.title} onSelect={()=>handleJobSelect(j.id)} className="text-white aria-selected:bg-white/10">{j.title}</CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <button type="button" onClick={handleGenerateKeywords} disabled={!jdText.trim()||isGeneratingKw}
                style={{ height:38, padding:'0 18px', display:'flex', alignItems:'center', gap:6, borderRadius:99, fontSize:12, fontWeight:700, cursor:(!jdText.trim()||isGeneratingKw)?'not-allowed':'pointer', background:'white', color:'#1a1a1a', border:'none', opacity:(!jdText.trim()||isGeneratingKw)?0.65:1, transition:'all 0.2s' }}
                onMouseEnter={e=>{if(jdText.trim()&&!isGeneratingKw)(e.currentTarget.style.boxShadow='0 8px 20px rgba(255,255,255,0.2)');}}
                onMouseLeave={e=>(e.currentTarget.style.boxShadow='none')}>
                {isGeneratingKw?<><Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Generating…</>:<><Sparkles size={13}/> Generate Keywords</>}
              </button>
            </div>
          )}

          {/* Keywords panel */}
          {!isChatMode && showKwPanel && (isGeneratingKw||displayKws.length>0) && (
            <div style={{ width:'100%', maxWidth:580, marginTop:16, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(12px)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(255,255,255,0.1)', animation:'fadeIn 0.3s ease' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'rgba(196,181,253,0.9)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Generated Keywords</span>
                <div style={{ display:'flex', gap:6 }}>
                  {displayKws.length>0 && (
                    <button onClick={handleAddAllKeywords} style={{ fontSize:9, padding:'2px 8px', borderRadius:99, background:'rgba(124,58,237,0.3)', border:'1px solid rgba(124,58,237,0.5)', color:'#C4B5FD', cursor:'pointer', fontWeight:600 }}>
                      Use All
                    </button>
                  )}
                  <button onClick={()=>{setShowKwPanel(false);setAiKeywords([]);}} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center' }}>
                    <X size={12}/>
                  </button>
                </div>
              </div>
              {isGeneratingKw && displayKws.length===0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[80,60,90,70,100,75].map((w,i)=><div key={i} style={{ height:24, width:w, borderRadius:99, background:'rgba(255,255,255,0.08)', animation:'pulse 1.5s infinite' }}/>)}
                </div>
              )}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {displayKws.map((kw,i)=>(
                  <button key={i} onClick={()=>handleAddKeyword(kw)}
                    style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, background:'rgba(255,255,255,0.09)', color:'white', border:'1px solid rgba(255,255,255,0.18)', padding:'3px 10px', borderRadius:99, cursor:'pointer', transition:'all 0.15s', fontFamily:'monospace' }}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(168,85,247,0.35)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.09)')}>
                    {kw} <span style={{ opacity:0.6, fontSize:9 }}>+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT SEARCHES ── */}
      <div style={{ background:'#F8F9FC', borderTop:'1px solid #E2E8F0', padding:'16px 24px 20px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
          <Clock size={12} style={{ color:'#7C3AED' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.5px' }}>Recent Searches</span>
          <span style={{ fontSize:9, color:'#94A3B8', marginLeft:4 }}>Click to load into sidebar filters</span>
        </div>
        <RecentSearches onSelectSearch={handleRecentSelect} isModal={false} />
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:0.5} 50%{opacity:0.15} }
      `}</style>
    </div>
  );
};

export default ZiveXHeroSection;