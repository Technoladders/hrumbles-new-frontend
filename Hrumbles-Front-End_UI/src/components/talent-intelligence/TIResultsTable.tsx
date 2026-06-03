// src/components/talent-intelligence/TIResultsTable.tsx  — v8
// Changes vs v7:
//   - waterfallEnabled prop added (org config)
//   - RevealCell: waterfall state + handleAddToWaterfall + realtime subscription
//   - SquareX "No personal email" replaced with waterfall button when waterfallEnabled
//   - Post-reveal personal-check: success:true but professional-only → emailWasRevealed sets,
//     waterfall button shown instead of re-triggerable button

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, Linkedin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Check, Copy, Send, ExternalLink, Zap,
  Bookmark, BookmarkCheck, Globe, X, GraduationCap, Briefcase, Languages, SquareX, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import {
  TIProfile, TIRevealedEmail, TIRevealedPhone, TI_PAGE_SIZE,
  calcYearsExperience,
} from "@/types/talentIntelligence";

const STICKY_CSS = `
  .ti-table tbody tr td.ti-col-sticky { background: #ffffff; }
  .ti-table tbody tr:nth-child(even) td.ti-col-sticky { background: #f9f9fb; }
  .ti-table tbody tr:hover td.ti-col-sticky { background: #f5f3ff !important; }
  .ti-table tbody tr.ti-expanded td.ti-col-sticky { background: #f5f3ff !important; }
  .ti-table tbody tr.ti-expanded-content td { background: #faf9ff; border-bottom: 2px solid #e9d5ff; }
`;

const isPersonalEmail = (e: TIRevealedEmail): boolean =>
  e.type === "personal" || e.type === "direct" || e.type === "personal_email";
 


function fmtExpDate(year?: number | null, month?: number | null): string {
  if (!year) return "";
  if (!month) return String(year);
  return new Date(year, month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
function expRange(exp: any): string {
  const start = fmtExpDate(exp.start_date_year, exp.start_date_month);
  const end   = exp.is_current ? "Present" : (fmtExpDate(exp.end_date_year, exp.end_date_month) || "");
  return [start, end].filter(Boolean).join(" – ");
}

function PortalTip({ trigger, content }: { trigger: React.ReactNode; content: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [style,   setStyle]   = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const timer      = useRef<ReturnType<typeof setTimeout>>();
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r    = triggerRef.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - 248);
    const goBelow = r.top < 200 && window.innerHeight - r.bottom >= 200;
    setStyle({ position:"fixed", left:Math.max(8,left), zIndex:99999, ...(goBelow?{top:r.bottom+6}:{bottom:window.innerHeight-r.top+6}) });
  }, []);
  const show = () => { calcPos(); clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(true), 220); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(false), 140); };
  return (
    <div ref={triggerRef} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {trigger}
      {visible && ReactDOM.createPortal(
        <div style={style}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[160px] max-w-[250px] animate-in fade-in zoom-in-95 duration-100"
          onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hide}>
          {content}
        </div>, document.body
      )}
    </div>
  );
}

function Avatar({ profile, size = 26 }: { profile: TIProfile; size?: number }) {
  const [err, setErr] = useState(false);
  const sz  = `${size}px`;
  const ini = (profile.full_name ?? "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  if (profile.profile_picture_url && !err) {
    return <img src={profile.profile_picture_url} alt={profile.full_name ?? ""} style={{width:sz,height:sz}} className="rounded-full object-cover ring-1 ring-slate-100 flex-shrink-0" onError={() => setErr(true)} />;
  }
  return (
    <div style={{width:sz,height:sz,fontSize:Math.round(size*0.34)}}
      className="rounded-full bg-gradient-to-br from-violet-100 to-purple-200 ring-1 ring-slate-100 flex items-center justify-center font-bold text-violet-700 flex-shrink-0">
      {ini}
    </div>
  );
}

function CompanyLogo({ profile }: { profile: TIProfile }) {
  const [err, setErr] = useState(false);
  const domain = profile.company_domain ?? (profile.company as any)?.domain;
  const logo   = (profile.company as any)?.logo_url;
  if (logo && !err)   return <img src={logo} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" onError={() => setErr(true)} />;
  if (domain && !err) return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-4 h-4 rounded flex-shrink-0" onError={() => setErr(true)} />;
  return <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-slate-400">{(profile.company_name ?? "?")[0]}</div>;
}

// ── RevealCell ────────────────────────────────────────────────
interface RevealCellProps {
  profile:           TIProfile;
  waterfallEnabled?: boolean;
  onRevealDone:      (e: TIRevealedEmail[], p: TIRevealedPhone[]) => void;
}
export function RevealCell({ profile, onRevealDone, waterfallEnabled }: RevealCellProps) {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;
  const userId         = auth?.userId ?? null;
 
  const [emails,        setEmails]        = useState<TIRevealedEmail[]>(profile.revealed_emails ?? []);
  const [phones,        setPhones]        = useState<TIRevealedPhone[]>(profile.revealed_phones ?? []);
  const [eLoad,         setELoad]         = useState(false);
  const [pLoad,         setPLoad]         = useState(false);
  const [eErr,          setEErr]          = useState<string | null>(null);
  const [pErr,          setPErr]          = useState<string | null>(null);
  const [copied,        setCopied]        = useState<string | null>(null);
  const [phonePending,  setPhonePending]  = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  // Waterfall states
  const [waterfallInQueue,  setWaterfallInQueue]  = useState(false);
  const [waterfallDone,     setWaterfallDone]     = useState(false);
  const [waterfallChecking, setWaterfallChecking] = useState(false);
  const waterfallChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
 
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (waterfallChannelRef.current) supabase.removeChannel(waterfallChannelRef.current);
  }, []);
 
  useEffect(() => { setEmails(profile.revealed_emails ?? []); setEErr(null); }, [profile.id, profile.revealed_emails?.length ?? 0]);
  useEffect(() => {
    const np = profile.revealed_phones ?? [];
    setPhones(np);
    if (np.length > 0 && phonePending) {
      setPhonePending(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      onRevealDone(emails, np);
    }
    setPErr(null);
  }, [profile.id, profile.revealed_phones?.length ?? 0]);
 
  // Check existing waterfall status on mount
  useEffect(() => {
    if (!waterfallEnabled || !profile.linkedin_url || !organizationId) return;
 
    const checkWaterfall = async () => {
      setWaterfallChecking(true);
      try {
        const { data } = await supabase
          .from("candidate_waterfall")
          .select("id, status, found_email, found_phone")
          .eq("linkedin_url", profile.linkedin_url)
          .eq("organization_id", organizationId)
          .maybeSingle();
 
        if (data?.status === "pending") {
          setWaterfallInQueue(true);
          subscribeToWaterfall(data.id);
        } else if (data?.status === "found") {
          setWaterfallDone(true);
          if (data.found_email) {
            const newEmail: TIRevealedEmail = { email: data.found_email, type: "personal", is_primary: true };
            setEmails([newEmail]);
            onRevealDone([newEmail], data.found_phone ? [{ number: data.found_phone, type: "unknown", recommended: true }] : phones);
          }
        }
      } catch (err) {
        console.error("[RevealCell] waterfall check:", err);
      } finally {
        setWaterfallChecking(false);
      }
    };
 
    checkWaterfall();
  }, [profile.linkedin_url, waterfallEnabled, organizationId]);
 
  const subscribeToWaterfall = (waterfallId?: string) => {
    if (waterfallChannelRef.current) supabase.removeChannel(waterfallChannelRef.current);
    const safeUrl = (profile.linkedin_url ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 20);
    waterfallChannelRef.current = supabase
      .channel(`wf-reveal-cell-${profile.id}-${safeUrl}`)
      .on("postgres_changes", {
        event:  "UPDATE",
        schema: "public",
        table:  "candidate_waterfall",
        filter: `linkedin_url=eq.${profile.linkedin_url}`,
      }, (payload: any) => {
        if (payload.new?.status === "found" && payload.new.found_email) {
          const newEmail: TIRevealedEmail = { email: payload.new.found_email, type: "personal", is_primary: true };
          const newPhones = payload.new.found_phone
            ? [{ number: payload.new.found_phone, type: "mobile", recommended: true } as TIRevealedPhone]
            : phones;
          setEmails([newEmail]);
          setPhones(newPhones);
          setWaterfallDone(true);
          setWaterfallInQueue(false);
          onRevealDone([newEmail], newPhones);
          if (waterfallChannelRef.current) supabase.removeChannel(waterfallChannelRef.current);
        } else if (payload.new?.status === "pending") {
          setWaterfallInQueue(true);
        }
      })
      .subscribe();
  };
 
  const copy = (t: string) => { navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1500); };
 
  const startPhonePolling = (url: string) => {
    let c = 0;
    pollRef.current = setInterval(async () => {
      if (++c > 20) {
        clearInterval(pollRef.current!); pollRef.current = null;
        setPhonePending(false);
        setPErr("Phone not returned yet — check back later.");
        return;
      }
      try {
        const { data } = await supabase.from("master_contactout_profiles").select("revealed_phones").eq("linkedin_url", url).maybeSingle();
        const np: TIRevealedPhone[] = data?.revealed_phones ?? [];
        if (np.length > 0) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setPhonePending(false); setPhones(np); onRevealDone(emails, np);
        }
      } catch {}
    }, 3000);
  };
 
  const reveal = async (type: "email" | "phone") => {
    if (!organizationId) return;
    const setL = type === "email" ? setELoad : setPLoad;
    const setE = type === "email" ? setEErr  : setPErr;
    setL(true); setE(null);
    try {
      // Use unified ti-reveal (not ti-reveal-contact)
      const { data, error } = await supabase.functions.invoke("ti-reveal-v1", {
        body: {
          linkedinUrl:      profile.linkedin_url,
          revealType:       type,
          organizationId,
          userId,
          snapshotName:     profile.full_name,
          snapshotTitle:    profile.title,
          snapshotCompany:  profile.company_name,
        },
      });
 
      if (error || (data?.error && !data?.phonePending && !data?.addedToWaterfall)) {
        setE(data?.message ?? data?.error ?? error?.message ?? "Reveal failed");
        return;
      }
 
      // AUTO-WATERFALL: no data found, waterfall was auto-added
      if (data?.addedToWaterfall || data?.waterfallPending) {
        setWaterfallInQueue(true);
        subscribeToWaterfall();
        return;
      }
 
      if (data?.phonePending) {
        setPhonePending(true);
        startPhonePolling(profile.linkedin_url);
        return;
      }
 
      const ne: TIRevealedEmail[] = data.allEmails ?? [];
      const np: TIRevealedPhone[] = data.allPhones ?? [];
      const m = { emails: type === "email" ? ne : emails, phones: type === "phone" ? np : phones };
      setEmails(m.emails); setPhones(m.phones); onRevealDone(m.emails, m.phones);
    } catch (e: any) { setE(e?.message ?? "Failed"); }
    finally { setL(false); }
  };
 
  const personalEmails = emails.filter(isPersonalEmail);
  const hasPersonal    = personalEmails.length > 0;
  const primaryPersonal = personalEmails[0] ?? null;
  const pp              = phones[0] ?? null;
 
  // CHANGE 1: always show buttons — removed hasPersonalEmail/hasPhone gates
  const showEmailButton = true;
  const showPhoneButton = true;
 
  const emailWasRevealed = emails.length > 0;
  const noPersonalFound  = emailWasRevealed && !hasPersonal && !waterfallInQueue;
 
  const allPhonesContent = phones.length === 0 ? null : (
    <div className="space-y-1.5">
      <p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">All Phones</p>
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 flex-1">{p.number}</span>
          <button onClick={() => copy(p.number)} className="text-slate-300 hover:text-violet-500 flex-shrink-0">
            {copied === p.number ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
          </button>
        </div>
      ))}
    </div>
  );
 
  const allEmailsContent = personalEmails.length === 0 ? null : (
    <div className="space-y-1.5">
      <p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">Personal Emails</p>
      {personalEmails.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{e.email}</span>
          <button onClick={() => copy(e.email)} className="text-slate-300 hover:text-violet-500 flex-shrink-0">
            {copied === e.email ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
          </button>
        </div>
      ))}
    </div>
  );
 
  return (
    <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
 
      {/* ── Email ── */}
      {showEmailButton && (
        // Waterfall in-queue or done state — show queue indicator
        waterfallInQueue ? (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 cursor-default max-w-[130px]"
            title="Estimated time: 30–180 minutes.">
            <Loader2 size={8} className="animate-spin text-amber-500 flex-shrink-0" />
            <span className="text-[8px] text-amber-600 font-medium truncate">In Queue… (Est. 30–180 min)</span>
          </div>
        ) : waterfallDone ? (
          hasPersonal ? (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
              <Check size={8} className="text-emerald-500 flex-shrink-0" />
              <span className="text-[9px] font-mono text-slate-700 truncate">{primaryPersonal!.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 max-w-[130px]">
              <Check size={8} className="text-emerald-500" />
              <span className="text-[9px] text-emerald-700 font-medium truncate">Found</span>
            </div>
          )
        ) : hasPersonal ? (
          // Email revealed — show it
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
            <Check size={8} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[9px] font-mono text-slate-700 truncate">{primaryPersonal!.email}</span>
            {personalEmails.length > 1 && <span className="text-[8px] text-slate-400 flex-shrink-0">+{personalEmails.length - 1}</span>}
          </div>
        ) : noPersonalFound && !waterfallEnabled ? (
          // Revealed but no personal email + waterfall not enabled → "No email"
          <div className="flex items-center gap-1 border border-slate-200 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
            <span className="text-[9px] text-slate-400 italic">No email</span>
          </div>
        ) : (
          // Not yet revealed — show Reveal button (always visible)
          <button
            disabled={eLoad}
            onClick={() => reveal("email")}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-all",
              eErr
                ? "border-red-200 text-red-400"
                : "border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-400 disabled:opacity-50"
            )}>
            {eLoad ? <Loader2 size={8} className="animate-spin" /> : <Mail size={8} />}
            {eLoad ? "…" : "Email"}
          </button>
        )
      )}
 
      {/* ── Phone ── */}
      {showPhoneButton && (
        pp ? (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
            <Check size={8} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[9px] font-mono text-slate-700 truncate">{pp.number}</span>
          </div>
        ) : phonePending ? (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-[9px] text-amber-600 font-medium max-w-[130px]">
            <Loader2 size={8} className="animate-spin flex-shrink-0" /><span className="truncate">Verifying…</span>
          </div>
        ) : (
          // Always visible — show Reveal Phone button
          <button
            disabled={pLoad}
            onClick={() => reveal("phone")}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-all",
              pErr
                ? "border-red-200 text-red-400"
                : "border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-400 disabled:opacity-50"
            )}>
            {pLoad ? <Loader2 size={8} className="animate-spin" /> : <Phone size={8} />}
            {pLoad ? "…" : "Phone"}
          </button>
        )
      )}
 
    </div>
  );
}

// ── Skills cell ───────────────────────────────────────────────
function SkillsCell({ skills, activeSkillLabels }: { skills: string[]|null; activeSkillLabels?: Set<string> }) {
  const all=skills??[], top=all.slice(0,2), rest=all.slice(2);
  if(!all.length) return <span className="text-[9px] text-slate-300">—</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {top.map(sk=>{const m=activeSkillLabels?.has(sk.toLowerCase()); return <span key={sk} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium border",m?"bg-violet-100 text-violet-700 border-violet-300 ring-1 ring-violet-400":"bg-slate-100 text-slate-500 border-slate-200")}>{sk}</span>;})}
      {rest.length>0&&<PortalTip trigger={<button className="text-[9px] text-violet-500 hover:text-violet-700 font-bold px-0.5">+{rest.length}</button>}
        content={<div><p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">All Skills ({all.length})</p><div className="flex flex-wrap gap-1">{all.map(sk=>{const m=activeSkillLabels?.has(sk.toLowerCase()); return <span key={sk} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium border",m?"bg-violet-100 text-violet-700 border-violet-300":"bg-slate-100 text-slate-500 border-slate-200")}>{sk}</span>; })}</div></div>}/>}
    </div>
  );
}

// ── InvitePicker ──────────────────────────────────────────────
interface InvitePickerProps { emails:TIRevealedEmail[]; phones:TIRevealedPhone[]; onConfirm:(e:string|null,p:string|null)=>void; onClose:()=>void; }
function InvitePicker({ emails, phones, onConfirm, onClose }: InvitePickerProps) {
  const ref=useRef<HTMLDivElement>(null);
  const personalEmails=emails.filter(isPersonalEmail);
  const [sel, setSel]=useState<{kind:"email"|"phone";value:string}|null>(personalEmails[0]?{kind:"email",value:personalEmails[0].email}:phones[0]?{kind:"phone",value:phones[0].number}:null);
  useEffect(()=>{const fn=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose();};setTimeout(()=>document.addEventListener("mousedown",fn),100);return()=>document.removeEventListener("mousedown",fn);},[onClose]);
  return (
    <div ref={ref} className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between"><p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Invite via</p><button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X size={10}/></button></div>
      {personalEmails.length>0&&<div className="space-y-0.5"><p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Personal Email</p>{personalEmails.map((e,i)=><label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1"><input type="radio" name="ti-invite-sel" checked={sel?.kind==="email"&&sel.value===e.email} onChange={()=>setSel({kind:"email",value:e.email})} className="accent-violet-600 flex-shrink-0"/><span className="text-[10px] font-mono text-slate-700 truncate">{e.email}</span></label>)}</div>}
      {phones.length>0&&<div className="space-y-0.5"><p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Phone</p>{phones.slice(0,3).map((ph,i)=><label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1"><input type="radio" name="ti-invite-sel" checked={sel?.kind==="phone"&&sel.value===ph.number} onChange={()=>setSel({kind:"phone",value:ph.number})} className="accent-violet-600 flex-shrink-0"/><div className="flex items-center gap-1.5 flex-1"><span className="text-[10px] font-mono text-slate-700">{ph.number}</span>{ph.recommended&&<span className="text-[8px] px-1 bg-green-100 text-green-700 rounded">✓</span>}</div></label>)}</div>}
      {personalEmails.length===0&&phones.length===0&&<p className="text-[11px] text-slate-400 text-center py-1">No contact info available</p>}
      <button disabled={!sel} onClick={()=>sel&&onConfirm(sel.kind==="email"?sel.value:null,sel.kind==="phone"?sel.value:null)}
        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-40 flex items-center justify-center gap-1.5">
        <Send size={10}/> Continue →
      </button>
    </div>
  );
}

// ── ExpandedRow ───────────────────────────────────────────────
interface ExpandedRowProps { profile: TIProfile; navigate: ReturnType<typeof useNavigate>; }
function ExpandedRow({ profile, navigate }: ExpandedRowProps) {
  const experience = (profile.experience ?? []).slice(0, 4);
  const skills     = profile.skills ?? [];
  const education  = (profile.education ?? []).slice(0, 3);
  const languages  = profile.languages ?? [];
  const hasData    = experience.length > 0 || skills.length > 0 || education.length > 0 || !!profile.summary;

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
      {!hasData ? (
        <div className="flex items-center justify-between py-3 px-1 text-xs text-slate-400">
          <span>No additional details available for this profile.</span>
          <button onClick={e => { e.stopPropagation(); navigate(`/profile-hub/profile/${profile.id}`, { state: { profile } }); }}
            className="flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium text-xs transition-colors">
            <ExternalLink size={11}/> Open full profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 py-3 px-1">
          <div>
            {experience.length > 0 ? (
              <>
                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1"><Briefcase size={8}/> Experience</p>
                <div className="space-y-2.5">
                  {experience.map((exp, i) => (
                    <div key={i} className="flex gap-2 min-w-0">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", exp.is_current ? "bg-violet-500" : "bg-slate-300")}/>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-700 leading-snug truncate">{exp.title}</p>
                        <p className="text-[9px] text-violet-600 truncate">{exp.company_name}</p>
                        <p className="text-[8px] text-slate-400">{expRange(exp)}</p>
                        {exp.is_current && <span className="inline-block text-[7px] px-1 py-px bg-green-100 text-green-700 rounded-full font-bold mt-0.5">Current</span>}
                      </div>
                    </div>
                  ))}
                  {(profile.experience ?? []).length > 4 && <p className="text-[9px] text-slate-400">+{(profile.experience ?? []).length - 4} more positions</p>}
                </div>
              </>
            ) : <p className="text-[9px] text-slate-400 italic">No experience data</p>}
          </div>
          <div className="space-y-3">
            {skills.length > 0 && (
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2">Skills ({skills.length})</p>
                <div className="flex flex-wrap gap-1">
                  {skills.slice(0, 16).map(sk => <span key={sk} className="px-1.5 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 text-[9px] rounded-full font-medium">{sk}</span>)}
                  {skills.length > 16 && <span className="text-[9px] text-slate-400 self-center">+{skills.length - 16}</span>}
                </div>
              </div>
            )}
            {education.length > 0 && (
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1"><GraduationCap size={8}/> Education</p>
                <div className="space-y-2">
                  {education.map((e, i) => (
                    <div key={i} className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-700 truncate leading-snug">{e.school_name}</p>
                      {e.degree && <p className="text-[9px] text-slate-500 truncate">{e.degree}{e.field_of_study ? ` · ${e.field_of_study}` : ""}</p>}
                      {(e.start_date_year || e.end_date_year) && <p className="text-[8px] text-slate-400">{e.start_date_year}{e.end_date_year ? ` – ${e.end_date_year}` : ""}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {profile.summary && (
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">About</p>
                <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-5">{profile.summary}</p>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1"><Languages size={8}/> Languages</p>
                <div className="flex flex-wrap gap-1">
                  {languages.map((l: any) => <span key={l.name ?? l} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">{l.name ?? l}</span>)}
                </div>
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); navigate(`/profile-hub/profile/${profile.id}`, { state: { profile } }); }}
              className="flex items-center gap-1.5 text-[10px] text-violet-600 hover:text-violet-800 font-semibold transition-colors group/link mt-auto pt-1">
              <ExternalLink size={10} className="group-hover/link:translate-x-0.5 transition-transform"/> Open full profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page:number; total:number; onChange:(p:number)=>void }) {
  const totalPages=Math.ceil(total/TI_PAGE_SIZE);
  if(totalPages<=1) return null;
  const start=(page-1)*TI_PAGE_SIZE+1, end=Math.min(page*TI_PAGE_SIZE,total);
  const range:(number|"…")[]=[];
  if(totalPages<=7){for(let i=1;i<=totalPages;i++)range.push(i);}
  else{range.push(1);if(page>3)range.push("…");for(let i=Math.max(2,page-1);i<=Math.min(totalPages-1,page+1);i++)range.push(i);if(page<totalPages-2)range.push("…");range.push(totalPages);}
  return(
    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-white flex-shrink-0">
      <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">{start}–{end}</span> of <span className="font-medium text-slate-700">{total.toLocaleString()}</span></p>
      <div className="flex items-center gap-1">
        <button onClick={()=>onChange(page-1)} disabled={page===1} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={13}/></button>
        {range.map((r,i)=>r==="…"?<span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>:<button key={r} onClick={()=>onChange(r as number)} className={cn("w-6 h-6 rounded text-xs font-medium",r===page?"bg-violet-600 text-white":"text-slate-600 hover:bg-slate-100")}>{r}</button>)}
        <button onClick={()=>onChange(page+1)} disabled={page===Math.ceil(total/TI_PAGE_SIZE)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={13}/></button>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return <tr className="animate-pulse border-b border-slate-50">{[160,120,130,140,130,110,70].map((w,i)=><td key={i} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded" style={{width:`${Math.min(w,100)}%`}}/></td>)}</tr>;
}

const COLS = [
  {label:"Profile",  minW:160},{label:"Contact", minW:128},{label:"Title",   minW:130},
  {label:"Skills",   minW:180},{label:"Company",  minW:130},{label:"Location",minW:110},{label:"Actions",minW:80},
] as const;
const thStyle = (i: number): React.CSSProperties => ({ position:"sticky", top:0, background:"#f8fafc", zIndex:i===0?31:30, ...(i===0?{left:0}:{}) });

// ── Main export ───────────────────────────────────────────────
export interface TIResultsTableProps {
  profiles:          TIProfile[];
  total:             number;
  page:              number;
  isLoading:         boolean;
  isSearching:       boolean;
  activeFilters:     { skillChips?:{label:string;mode:string}[]; titles?:string[]; query?:string };
  onSelectProfile?:  (p: TIProfile) => void;
  onInvite:          (p: TIProfile, email: string|null, phone: string|null) => void;
  onPageChange:      (p: number) => void;
  onRevealUpdate:    (id: string, emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
  waterfallEnabled?: boolean;  // org config — show waterfall button on no-personal-email
}

export function TIResultsTable({ profiles, total, page, isLoading, isSearching, activeFilters, onInvite, onPageChange, onRevealUpdate, waterfallEnabled }: TIResultsTableProps) {
  const navigate = useNavigate();
  const [saved,            setSaved]            = useState<Set<string>>(new Set());
  const [invitePickerId,   setInvitePickerId]   = useState<string|null>(null);
  const [expandedProfileId,setExpandedProfileId] = useState<string|null>(null);
  const toggleExpand = (id: string) => setExpandedProfileId(prev => prev === id ? null : id);

  const activeSkillLabels = new Set(
    (activeFilters.skillChips??[]).filter(c=>c.mode==="must"||c.mode==="nice").map(c=>c.label.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <style>{STICKY_CSS}</style>
        <table className="w-full border-collapse ti-table" style={{minWidth:960}}>
          <thead><tr>{COLS.map((c,i)=><th key={c.label} style={{...thStyle(i),minWidth:c.minW}} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">{c.label}</th>)}</tr></thead>
          <tbody>{Array.from({length:10}).map((_,i)=><SkeletonRow key={i}/>)}</tbody>
        </table>
      </div>
    );
  }
  if (profiles.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <style>{STICKY_CSS}</style>
      {isSearching && <div className="h-0.5 bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500 animate-pulse flex-shrink-0"/>}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse ti-table" style={{minWidth:960}}>
          <thead>
            <tr>{COLS.map((c,i)=><th key={c.label} style={{...thStyle(i),minWidth:c.minW}} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {profiles.map((profile, idx) => {
              const isOTW     = profile.work_status === "open_to_work";
              const yrs       = calcYearsExperience(profile.experience);
              const domain    = profile.company_domain ?? (profile.company as any)?.domain;
              const isSaved   = saved.has(profile.id);
              const showPick  = invitePickerId === profile.id;
              const isExpanded = expandedProfileId === profile.id;
              const hasRevealedPersonalEmail = (profile.revealed_emails??[]).some(isPersonalEmail);
              const hasRevealedPhone         = (profile.revealed_phones?.length??0) > 0;
              const canInvite = hasRevealedPersonalEmail || hasRevealedPhone;

              const titleWords = [
                ...(activeFilters.titles??[]),
                ...(activeFilters.query?.split(/\s+/).filter(w=>w.length>2)??[]),
              ].map(w=>w.toLowerCase()).filter(Boolean);
              const highlightTitle = (text: string) => {
                if (!titleWords.length) return <>{text}</>;
                const parts = text.split(new RegExp(`(${titleWords.join("|")})`, "gi"));
                return <>{parts.map((p,i)=>titleWords.includes(p.toLowerCase())?<mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5 not-italic">{p}</mark>:<span key={i}>{p}</span>)}</>;
              };

              return (
                <React.Fragment key={profile.id}>
                  <tr
                    onClick={() => toggleExpand(profile.id)}
                    className={cn("border-b border-slate-50 cursor-pointer group transition-colors", isExpanded && "ti-expanded")}
                    style={{ background: isExpanded ? "#f5f3ff" : idx%2===0 ? undefined : "#f9f9fb" }}>

                    {/* 1. Profile — sticky */}
                    <td className="px-3 py-2 ti-col-sticky" style={{position:"sticky",left:0,zIndex:1}}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative flex-shrink-0">
                          <Avatar profile={profile}/>
                          {isOTW && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white flex items-center justify-center"><Zap size={5} className="text-white"/></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/profile-hub/profile/${profile.id}`, { state: { profile } }); }}
                              className="text-[11px] font-semibold text-slate-800 truncate leading-tight hover:text-violet-700 hover:underline transition-colors text-left">
                              {profile.full_name ?? "Unknown"}
                            </button>
                            {profile.linkedin_url && (
                              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                                className="flex-shrink-0 hover:text-indigo-300 text-[#0A66C2] transition-colors">
                                <Linkedin size={9}/>
                              </a>
                            )}
                          </div>
                          <div className="relative z-10 flex items-center gap-1.5 mt-1 flex-nowrap overflow-visible">
                            {yrs && <span className="inline-flex items-center px-2 py-[3px] rounded-full text-[9px] font-bold whitespace-nowrap bg-indigo-100 text-indigo-900 shadow-sm">{yrs}</span>}
                            {isOTW && <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[8px] font-bold whitespace-nowrap bg-green-200 text-green-800 animate-expGlow">Open to Work</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-slate-300 group-hover:text-violet-400 transition-colors ml-1">
                          {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </div>
                      </div>
                    </td>

                    {/* 2. Contact */}
                    <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                      <RevealCell
                        profile={profile}
                        waterfallEnabled={waterfallEnabled}
                        onRevealDone={(em,ph)=>onRevealUpdate(profile.id,em,ph)}
                      />
                    </td>

                    {/* 3. Title */}
                    <td className="px-3 py-2">
                      <p className="text-[10px] text-slate-700 leading-snug font-medium truncate max-w-[125px]" title={profile.title??""}>
                        {profile.title ? highlightTitle(profile.title) : <span className="text-slate-300">—</span>}
                      </p>
                      {profile.job_function && <p className="text-[9px] text-slate-400 truncate mt-0.5 max-w-[125px]">{profile.job_function}</p>}
                    </td>

                    {/* 4. Skills */}
                    <td className="px-3 py-2">
                      <SkillsCell skills={profile.skills} activeSkillLabels={activeSkillLabels.size>0?activeSkillLabels:undefined}/>
                    </td>

                    {/* 5. Company */}
                    <td className="px-3 py-2">
                      {profile.company_name ? (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <CompanyLogo profile={profile}/>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-slate-700 truncate leading-tight">{profile.company_name}</p>
                            {domain && <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-0.5 text-[8px] text-slate-400 hover:text-violet-500 mt-0.5"><Globe size={7}/><span className="truncate">{domain}</span></a>}
                          </div>
                        </div>
                      ) : <span className="text-[9px] text-slate-300">—</span>}
                    </td>

                    {/* 6. Location */}
                    <td className="px-3 py-2">
                      <p className="text-[10px] text-slate-500 truncate max-w-[105px]">{profile.location??"—"}</p>
                      {profile.country&&profile.location!==profile.country&&<p className="text-[9px] text-slate-400 truncate mt-0.5">{profile.country}</p>}
                    </td>

                    {/* 7. Actions */}
                    <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center gap-0.5 relative">
                        <button onClick={() => navigate(`/profile-hub/profile/${profile.id}`, { state: { profile } })}
                          title="View full profile"
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                          <ExternalLink size={11}/>
                        </button>
                        <button onClick={()=>canInvite&&setInvitePickerId(showPick?null:profile.id)}
                          title={canInvite?"Send invite":"Reveal personal email or phone first"}
                          disabled={!canInvite}
                          className={cn("w-6 h-6 flex items-center justify-center rounded transition-all",canInvite?"text-slate-400 hover:text-green-600 hover:bg-green-50":"text-slate-200 cursor-not-allowed")}>
                          <Send size={11}/>
                        </button>
                        <button onClick={()=>setSaved(p=>{const s=new Set(p);isSaved?s.delete(profile.id):s.add(profile.id);return s;})}
                          title={isSaved?"Saved":"Save"}
                          className={cn("w-6 h-6 flex items-center justify-center rounded transition-all",isSaved?"text-emerald-600 bg-emerald-50":"text-slate-400 hover:text-violet-600 hover:bg-violet-50")}>
                          {isSaved?<BookmarkCheck size={11}/>:<Bookmark size={11}/>}
                        </button>
                        {showPick && (
                          <InvitePicker
                            emails={profile.revealed_emails??[]}
                            phones={profile.revealed_phones??[]}
                            onConfirm={(em,ph)=>{setInvitePickerId(null);onInvite(profile,em,ph);}}
                            onClose={()=>setInvitePickerId(null)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ── Expanded row ── */}
                  {isExpanded && (
                    <tr className="ti-expanded-content">
                      <td colSpan={7} className="px-5 py-0">
                        <ExpandedRow profile={profile} navigate={navigate}/>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onChange={onPageChange}/>
    </div>
  );
}