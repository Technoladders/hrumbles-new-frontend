// src/pages/TalentIntelligence/TIProfilePage.tsx
// Standalone profile page for /talent-intelligence/profile/:id
// Renders same content as TIProfileModal but as a full page within MainLayout.
// Data comes from navigation state (passed by TIResultsTable) or fetched by ID.

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Linkedin, MapPin, Building2, Briefcase, Mail, Phone,
  GraduationCap, Award, Globe, Clock, Zap, Star,
  Eye, Loader2, Check, Copy, Send, ExternalLink, Users,
  ChevronDown, Database,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { cn } from "@/lib/utils";
import { CandidateInviteGate } from "@/components/CandidateSearch/components/CandidateInviteGate";
import { TIProfile, TIRevealedEmail, TIRevealedPhone } from "@/types/talentIntelligence";

const isPersonalEmail = (e: TIRevealedEmail): boolean =>
  e.type === "personal" || e.type === "direct" || e.type === "personal_email";

function fmt(year: number, month: number): string {
  if (!year) return "";
  if (!month) return String(year);
  return new Date(year, month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
function expDuration(exp: any): string {
  const start = fmt(exp.start_date_year, exp.start_date_month);
  const end   = exp.is_current ? "Present" : (fmt(exp.end_date_year, exp.end_date_month) || "");
  return [start, end].filter(Boolean).join(" – ");
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ profile, size = 20 }: { profile: TIProfile; size?: number }) {
  const [err, setErr] = useState(false);
  const ini = (profile.full_name ?? "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  if (profile.profile_picture_url && !err) {
    return <img src={profile.profile_picture_url} alt="" className="w-full h-full rounded-2xl object-cover border-2 border-white shadow-lg" onError={() => setErr(true)} />;
  }
  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-white font-bold shadow-lg" style={{ fontSize: 28 }}>
      {ini}
    </div>
  );
}

// ── RevealBlock ───────────────────────────────────────────────
function RevealBlock({ profile, onRevealDone }: { profile: TIProfile; onRevealDone: (e: TIRevealedEmail[], p: TIRevealedPhone[]) => void }) {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;
  const userId         = auth?.userId ?? null;

  const [emails,       setEmails]       = useState<TIRevealedEmail[]>(profile.revealed_emails ?? []);
  const [phones,       setPhones]       = useState<TIRevealedPhone[]>(profile.revealed_phones ?? []);
  const [emailLoad,    setEmailLoad]    = useState(false);
  const [phoneLoad,    setPhoneLoad]    = useState(false);
  const [emailErr,     setEmailErr]     = useState<string|null>(null);
  const [phoneErr,     setPhoneErr]     = useState<string|null>(null);
  const [copied,       setCopied]       = useState<string|null>(null);
  const [phonePending, setPhonePending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => { setEmails(profile.revealed_emails ?? []); }, [profile.id]);
  useEffect(() => {
    const np = profile.revealed_phones ?? [];
    if (np.length > 0 && phonePending) { setPhonePending(false); if(pollRef.current){clearInterval(pollRef.current);pollRef.current=null;} setPhones(np); onRevealDone(emails, np); }
    else if (np.length > phones.length) setPhones(np);
  }, [profile.revealed_phones?.length ?? 0]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); setCopied(t); setTimeout(()=>setCopied(null),2000); };

  const startPhonePolling = (url: string) => {
    let c = 0;
    pollRef.current = setInterval(async () => {
      if(++c>20){ clearInterval(pollRef.current!);pollRef.current=null;setPhonePending(false);setPhoneErr("Phone verification taking longer — check back shortly."); return; }
      try {
        const {data} = await supabase.from("master_contactout_profiles").select("revealed_phones").eq("linkedin_url", url).maybeSingle();
        const np: TIRevealedPhone[] = data?.revealed_phones??[];
        if(np.length>0){ clearInterval(pollRef.current!);pollRef.current=null;setPhonePending(false);setPhones(np);onRevealDone(emails,np); }
      } catch {}
    }, 3000);
  };

  const reveal = async (revealType: "email"|"phone") => {
    if (!organizationId) return;
    const setLoad = revealType==="email"?setEmailLoad:setPhoneLoad;
    const setErr  = revealType==="email"?setEmailErr:setPhoneErr;
    setLoad(true); setErr(null);
    try {
      const {data,error:fnErr} = await supabase.functions.invoke("ti-reveal-contact", {
        body:{linkedinUrl:profile.linkedin_url,revealType,organizationId,userId},
      });
      if(fnErr||(data?.error&&!data?.phonePending)){ const msg=data?.message??data?.error??fnErr?.message??"Reveal failed"; setErr(msg); return; }
      if(data?.phonePending){ setPhonePending(true); startPhonePolling(profile.linkedin_url); return; }
      const ne: TIRevealedEmail[]=data.allEmails??[], np: TIRevealedPhone[]=data.allPhones??[];
      const mergedE=revealType==="email"?ne:emails, mergedP=revealType==="phone"?np:phones;
      setEmails(mergedE); setPhones(mergedP); onRevealDone(mergedE,mergedP);
    } catch(e:any){ setErr(e?.message??"Reveal failed."); }
    finally{ setLoad(false); }
  };

  const ca = profile.contact_availability;
  const canPersonalEmail = !!ca?.personal_email, canPhone = !!ca?.phone;
  const personalEmails = emails.filter(isPersonalEmail);
  const emailWasRevealed = emails.length > 0, hasPersonal = personalEmails.length > 0;

  return (
    <div className="space-y-3">
      {canPersonalEmail && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><Mail size={13} className="text-violet-500"/><span className="text-xs font-semibold text-slate-700">Email</span><span className="text-[9px] text-slate-400">(personal)</span></div>
            {!emailWasRevealed&&!emailLoad&&<button onClick={()=>reveal("email")} className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white text-[11px] rounded-lg font-medium hover:bg-violet-700 transition-colors"><Eye size={10}/> Reveal</button>}
            {emailLoad&&<span className="flex items-center gap-1 text-[11px] text-violet-600"><Loader2 size={10} className="animate-spin"/> Revealing…</span>}
          </div>
          {emailErr&&<p className="text-xs text-red-500 mb-1">{emailErr}</p>}
          {hasPersonal ? (
            <div className="space-y-2">
              {personalEmails.map((e,i)=>(
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`mailto:${e.email}`} className="text-sm text-violet-700 font-medium hover:underline truncate block">{e.email}</a>
                    <span className="text-[10px] text-slate-400">personal{e.is_primary?" · primary":""}</span>
                  </div>
                  <button onClick={()=>copy(e.email)} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                    {copied===e.email?<Check size={13} className="text-green-500"/>:<Copy size={13}/>}
                  </button>
                </div>
              ))}
            </div>
          ) : emailWasRevealed ? (
            <p className="text-[11px] text-amber-600">No personal email found for this profile</p>
          ) : !emailLoad && <p className="text-[11px] text-slate-400">Click Reveal to unlock personal email</p>}
        </div>
      )}
      {canPhone && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5"><Phone size={13} className="text-violet-500"/><span className="text-xs font-semibold text-slate-700">Phone</span></div>
            {phones.length===0&&!phonePending&&<button onClick={()=>reveal("phone")} disabled={phoneLoad} className="flex items-center gap-1 px-3 py-1 border border-violet-300 text-violet-700 text-[11px] rounded-lg font-medium hover:bg-violet-50 disabled:opacity-60 transition-colors">{phoneLoad?<Loader2 size={10} className="animate-spin"/>:<Eye size={10}/>}{phoneLoad?"Revealing…":"Reveal"}</button>}
          </div>
          {phoneErr&&<p className="text-xs text-red-500 mb-1">{phoneErr}</p>}
          {phones.length>0 ? (
            <div className="space-y-2">
              {phones.map((p,i)=>(
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`tel:${p.number}`} className="text-sm text-violet-700 font-medium hover:underline">{p.number}</a>
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.recommended&&<span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">recommended</span>}
                      {p.type&&<span className="text-[10px] text-slate-400 capitalize">{p.type}</span>}
                    </div>
                  </div>
                  <button onClick={()=>copy(p.number)} className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 transition-colors">
                    {copied===p.number?<Check size={13} className="text-green-500"/>:<Copy size={13}/>}
                  </button>
                </div>
              ))}
            </div>
          ) : phonePending ? (
            <div className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <Loader2 size={14} className="animate-spin text-amber-500 flex-shrink-0 mt-0.5"/>
              <div><p className="text-[11px] font-semibold text-amber-700">Verifying phone number…</p><p className="text-[10px] text-amber-600 mt-0.5">Will appear here automatically within 1–2 minutes.</p></div>
            </div>
          ) : !phoneLoad && <p className="text-[11px] text-slate-400">Click Reveal to unlock phone</p>}
        </div>
      )}
      {!canPersonalEmail&&!canPhone&&<p className="text-xs text-slate-400 py-2">No contact info available for this profile</p>}
    </div>
  );
}

// ── Experience item ───────────────────────────────────────────
function ExpItem({ exp, isLast }: { exp: any; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-1 flex-shrink-0 ${exp.is_current?"border-violet-600 bg-violet-600":"border-slate-300 bg-white"}`}/>
        {!isLast&&<div className="w-px flex-1 bg-slate-200 mt-1"/>}
      </div>
      <div className={`${isLast?"pb-0":"pb-5"} flex-1 min-w-0`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{exp.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {exp.logo_url&&<img src={exp.logo_url} alt="" className="w-4 h-4 rounded object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
              <p className="text-xs text-violet-700 font-medium">{exp.company_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-400 whitespace-nowrap">{expDuration(exp)}</p>
            {exp.is_current&&<span className="inline-block mt-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full font-medium">Current</span>}
          </div>
        </div>
        {exp.locality&&<p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9}/>{exp.locality}</p>}
        {exp.summary&&<p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{exp.summary}</p>}
      </div>
    </div>
  );
}

// ── Invite contact picker ─────────────────────────────────────
function EmailPickerDropdown({ personalEmails, phones, onSelect, onClose }: { personalEmails:TIRevealedEmail[]; phones:TIRevealedPhone[]; onSelect:(e:string|null,p:string|null)=>void; onClose:()=>void; }) {
  const [sel,setSel] = useState<{kind:"email"|"phone";value:string}|null>(personalEmails[0]?{kind:"email",value:personalEmails[0].email}:phones[0]?{kind:"phone",value:phones[0].number}:null);
  return (
    <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Choose invite contact</p>
      {personalEmails.length>0&&<div className="space-y-0.5"><p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Personal Email</p>{personalEmails.map((e,i)=><label key={i} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1"><input type="radio" name="pi-invite" checked={sel?.kind==="email"&&sel.value===e.email} onChange={()=>setSel({kind:"email",value:e.email})} className="accent-violet-600 flex-shrink-0"/><span className="text-[10px] font-mono text-slate-700 truncate">{e.email}</span></label>)}</div>}
      {phones.length>0&&<div className="space-y-0.5"><p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Phone</p>{phones.slice(0,2).map((p,i)=><label key={i} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1"><input type="radio" name="pi-invite" checked={sel?.kind==="phone"&&sel.value===p.number} onChange={()=>setSel({kind:"phone",value:p.number})} className="accent-violet-600 flex-shrink-0"/><span className="text-[10px] font-mono text-slate-700">{p.number}</span>{p.recommended&&<span className="text-[8px] px-1 bg-green-100 text-green-700 rounded ml-auto">✓</span>}</label>)}</div>}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50">Cancel</button>
        <button disabled={!sel} onClick={()=>sel&&onSelect(sel.kind==="email"?sel.value:null,sel.kind==="phone"?sel.value:null)} className="flex-1 py-1.5 bg-violet-600 text-white rounded-lg text-[11px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1"><Send size={10}/> Invite</button>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────
export function TIProfilePage() {
  const { id }       = useParams<{ id: string }>();
  const location     = useLocation();
  const navigate     = useNavigate();
  const auth         = getAuthDataFromLocalStorage();
  const orgId        = auth?.organization_id ?? null;
  const userId       = auth?.userId ?? null;

  // Profile from navigation state (fast) or fetched from DB
  const [profile,      setProfile]      = useState<TIProfile | null>(location.state?.profile ?? null);
  const [loading,      setLoading]      = useState(!location.state?.profile);
  const [notFound,     setNotFound]     = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ email: string|null; phone: string|null }|null>(null);
  const [showPicker,   setShowPicker]   = useState(false);

  // Fetch from DB if no state was passed
  useEffect(() => {
    if (!id || profile) return;
    setLoading(true);
    supabase.from("master_contactout_profiles").select("*").eq("id", id).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setProfile(data as TIProfile); }
        setLoading(false);
      });
  }, [id]);

  const handleRevealDone = (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => {
    setProfile(prev => prev ? { ...prev, revealed_emails: emails, revealed_phones: phones } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 70px - 8px)" }}>
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin text-violet-500"/>
          <span className="text-sm">Loading profile…</span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ height: "calc(100vh - 70px - 8px)" }}>
        <Database size={32} className="text-slate-300"/>
        <p className="text-slate-500">Profile not found</p>
        <button onClick={() => navigate("/talent-intelligence")} className="text-sm text-violet-600 hover:underline">← Back to Talent Intelligence</button>
      </div>
    );
  }

  const isOpenToWork       = profile.work_status === "open_to_work";
  const currentExp         = (profile.experience ?? []).find(e => e.is_current);
  const allExp             = profile.experience ?? [];
  const allEdu             = profile.education  ?? [];
  const allCerts           = profile.certifications ?? [];
  const allLangs           = profile.languages ?? [];
  const skills             = profile.skills ?? [];
  const revealedPersonals  = (profile.revealed_emails ?? []).filter(isPersonalEmail);
  const revealedPhones     = profile.revealed_phones ?? [];
  const hasContactForInvite = revealedPersonals.length > 0 || revealedPhones.length > 0;

  const handleSendInvite = () => {
    if (revealedPersonals.length > 1 || (revealedPersonals.length >= 1 && revealedPhones.length > 0)) {
      setShowPicker(true);
    } else {
      setInviteTarget({
        email: revealedPersonals[0]?.email ?? null,
        phone: revealedPhones[0]?.number  ?? null,
      });
    }
  };

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "calc(100vh - 70px - 8px)" }}>

      {/* ── Page header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-700 transition-colors font-medium">
            <ArrowLeft size={14}/> Back
          </button>
          <div className="w-px h-4 bg-slate-200"/>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <button onClick={() => navigate("/talent-intelligence")} className="hover:text-violet-600 transition-colors">Talent Intelligence</button>
            <span>/</span>
            <span className="text-slate-700 font-medium truncate max-w-[180px]">{profile.full_name ?? "Profile"}</span>
          </nav>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Send Invite */}
          <div className="relative">
            <button onClick={handleSendInvite}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg font-semibold transition-colors">
              <Send size={12}/> Send Invite
              {(revealedPersonals.length > 1 || (revealedPersonals.length >= 1 && revealedPhones.length > 0)) && <ChevronDown size={10} className="ml-0.5"/>}
            </button>
            {showPicker && (
              <EmailPickerDropdown
                personalEmails={revealedPersonals}
                phones={revealedPhones}
                onSelect={(email,phone) => { setShowPicker(false); setInviteTarget({email,phone}); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
          {profile.linkedin_url && (
            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              <Linkedin size={12}/> LinkedIn <ExternalLink size={9}/>
            </a>
          )}
        </div>
      </div>

      {/* ── Body: two-column ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left sidebar — 300px, scrollable */}
        <div className="w-[300px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Avatar + identity */}
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                <Avatar profile={profile}/>
                {isOpenToWork && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Zap size={11} className="text-white"/>
                  </div>
                )}
              </div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{profile.full_name ?? "Unknown"}</h1>
              {profile.title && <p className="text-sm text-slate-500 mt-0.5">{profile.title}</p>}
              {(currentExp?.company_name ?? profile.company_name) && (
                <p className="text-sm text-violet-700 font-medium mt-0.5">@ {currentExp?.company_name ?? profile.company_name}</p>
              )}
              {profile.location && <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1.5"><MapPin size={11}/>{profile.location}</p>}
              {isOpenToWork && <span className="inline-block mt-2.5 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Open to Work</span>}
            </div>

            {/* Meta */}
            <div className="space-y-1.5 bg-slate-50 rounded-xl p-3">
              {profile.seniority && <div className="flex items-center gap-2 text-xs text-slate-600"><Star size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.seniority}</span></div>}
              {profile.job_function && <div className="flex items-center gap-2 text-xs text-slate-600"><Briefcase size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.job_function}</span></div>}
              {profile.company_industry && <div className="flex items-center gap-2 text-xs text-slate-600"><Building2 size={12} className="text-violet-400 flex-shrink-0"/><span className="truncate">{profile.company_industry}</span></div>}
              {profile.followers && <div className="flex items-center gap-2 text-xs text-slate-600"><Users size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.followers.toLocaleString()} followers</span></div>}
              {profile.first_discovered_at && (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Clock size={12} className="flex-shrink-0"/>
                  <span>Discovered {new Date(profile.first_discovered_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                </div>
              )}
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Contact Information</h3>
              <RevealBlock profile={profile} onRevealDone={handleRevealDone}/>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(sk => <span key={sk} className="px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] rounded-full font-medium">{sk}</span>)}
                </div>
              </div>
            )}

            {/* Languages */}
            {allLangs.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Languages</h3>
                <div className="flex flex-wrap gap-1.5">
                  {allLangs.map((l: any) => <span key={l.name??l} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full">{l.name??l}</span>)}
                </div>
              </div>
            )}

            {/* Education */}
            {allEdu.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Education</h3>
                <div className="space-y-3">
                  {allEdu.map((e: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><GraduationCap size={14} className="text-blue-500"/></div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{e.school_name}</p>
                        {e.degree && <p className="text-[11px] text-slate-500">{e.degree}</p>}
                        {e.field_of_study && <p className="text-[11px] text-slate-400">{e.field_of_study}</p>}
                        {(e.start_date_year||e.end_date_year) && <p className="text-[10px] text-slate-400">{e.start_date_year}{e.end_date_year?` – ${e.end_date_year}`:""}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {allCerts.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Certifications</h3>
                <div className="space-y-2">
                  {allCerts.map((c: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Award size={14} className="text-amber-500"/></div>
                      <div><p className="text-[11px] font-semibold text-slate-800 leading-tight">{c.name}</p>{c.authority&&<p className="text-[10px] text-slate-500">{c.authority}</p>}{c.start_date_year&&<p className="text-[10px] text-slate-400">{c.start_date_year}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — main content, scrollable */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-5">
          {profile.summary && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">About</h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{profile.summary}</p>
            </div>
          )}
          {allExp.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">Experience ({allExp.length})</h3>
              {allExp.map((exp: any, i: number) => <ExpItem key={i} exp={exp} isLast={i===allExp.length-1}/>)}
            </div>
          )}
          {allExp.length === 0 && !profile.summary && (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">No additional profile data available</div>
          )}
        </div>
      </div>

      {/* CandidateInviteGate */}
      {inviteTarget && (
        <CandidateInviteGate
          candidateName={profile.full_name ?? "Candidate"}
          candidateEmail={inviteTarget.email ?? undefined}
          candidatePhone={inviteTarget.phone ?? undefined}
          apolloPersonId={`ti_${profile.id}`}
          organizationId={orgId ?? undefined}
          userId={userId ?? undefined}
          onClose={() => setInviteTarget(null)}
          onInviteSent={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}