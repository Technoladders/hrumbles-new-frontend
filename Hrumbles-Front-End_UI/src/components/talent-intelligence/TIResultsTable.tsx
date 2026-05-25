// src/components/talent-intelligence/TIResultsTable.tsx  — v6
// Changes vs v5:
//   - RevealCell: only shows personal emails; if revealed but only professional → "No personal email"
//   - Email reveal button: only shown when ca.personal_email (not work_email)
//   - InvitePicker: personal emails only, multiple personal → user picks one

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Mail, Phone, Linkedin, ChevronLeft, ChevronRight,
  Eye, Loader2, Check, Copy, Send, ExternalLink, Zap,
  Bookmark, BookmarkCheck, Globe, X,
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
`;

// ── Personal email helper ─────────────────────────────────────
// Personal = not professional/work/role-based. Works for RR, Apollo, CO.
const isPersonalEmail = (e: TIRevealedEmail): boolean =>
  e.type === "personal" || e.type === "direct" || e.type === "personal_email";

// ── Portal tooltip ────────────────────────────────────────────
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
    setStyle({
      position: "fixed", left: Math.max(8, left), zIndex: 99999,
      ...(goBelow ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }),
    });
  }, []);

  const show = () => { calcPos(); clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(true), 220); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setVisible(false), 140); };

  return (
    <div ref={triggerRef} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {trigger}
      {visible && ReactDOM.createPortal(
        <div style={style}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[160px] max-w-[250px] animate-in fade-in zoom-in-95 duration-100"
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={hide}>
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ profile, size = 26 }: { profile: TIProfile; size?: number }) {
  const [err, setErr] = useState(false);
  const sz  = `${size}px`;
  const ini = (profile.full_name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  if (profile.profile_picture_url && !err) {
    return (
      <img src={profile.profile_picture_url} alt={profile.full_name ?? ""}
        style={{ width: sz, height: sz }}
        className="rounded-full object-cover ring-1 ring-slate-100 flex-shrink-0"
        onError={() => setErr(true)} />
    );
  }
  return (
    <div style={{ width: sz, height: sz, fontSize: Math.round(size * 0.34) }}
      className="rounded-full bg-gradient-to-br from-violet-100 to-purple-200 ring-1 ring-slate-100 flex items-center justify-center font-bold text-violet-700 flex-shrink-0">
      {ini}
    </div>
  );
}

// ── Company logo ──────────────────────────────────────────────
function CompanyLogo({ profile }: { profile: TIProfile }) {
  const [err, setErr] = useState(false);
  const domain = profile.company_domain ?? (profile.company as any)?.domain;
  const logo   = (profile.company as any)?.logo_url;
  if (logo && !err)   return <img src={logo} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0" onError={() => setErr(true)} />;
  if (domain && !err) return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-4 h-4 rounded flex-shrink-0" onError={() => setErr(true)} />;
  return (
    <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-slate-400">
      {(profile.company_name ?? "?")[0]}
    </div>
  );
}

// ── RevealCell ────────────────────────────────────────────────
// Email: only shows personal emails. Button: only if ca.personal_email.

interface RevealCellProps {
  profile:      TIProfile;
  onRevealDone: (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}
 
function RevealCell({ profile, onRevealDone }: RevealCellProps) {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;
  const userId         = auth?.userId ?? null;
 
  const [emails,       setEmails]       = useState<TIRevealedEmail[]>(profile.revealed_emails ?? []);
  const [phones,       setPhones]       = useState<TIRevealedPhone[]>(profile.revealed_phones ?? []);
  const [eLoad,        setELoad]        = useState(false);
  const [pLoad,        setPLoad]        = useState(false);
  const [eErr,         setEErr]         = useState<string|null>(null);
  const [pErr,         setPErr]         = useState<string|null>(null);
  const [copied,       setCopied]       = useState<string|null>(null);
  const [phonePending, setPhonePending] = useState(false);
 
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
 
  // Sync when profile prop changes (after RPC refresh)
  useEffect(() => { setEmails(profile.revealed_emails ?? []); setEErr(null); }, [profile.id, profile.revealed_emails?.length ?? 0]);
  useEffect(() => {
    const newPhones = profile.revealed_phones ?? [];
    setPhones(newPhones);
    // If phone arrived via webhook (polling resolved it), stop pending state
    if (newPhones.length > 0 && phonePending) {
      setPhonePending(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      onRevealDone(emails, newPhones);
    }
    setPErr(null);
  }, [profile.id, profile.revealed_phones?.length ?? 0]);
 
  const copy = (t: string) => { navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1500); };
 
  // ── Poll master_contactout_profiles for phone (Apollo webhook delivery) ─────
  const startPhonePolling = (linkedinUrl: string) => {
    let count = 0;
    const MAX  = 20;   // 20 polls × 3s = 60s max wait
    pollRef.current = setInterval(async () => {
      count++;
      if (count > MAX) {
        clearInterval(pollRef.current!); pollRef.current = null;
        setPhonePending(false);
        setPErr("Phone not returned yet — check back in a few minutes.");
        return;
      }
      try {
        const { data } = await supabase
          .from("master_contactout_profiles")
          .select("revealed_phones")
          .eq("linkedin_url", linkedinUrl)
          .maybeSingle();
        const newPhones: TIRevealedPhone[] = data?.revealed_phones ?? [];
        if (newPhones.length > 0) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setPhonePending(false);
          setPhones(newPhones);
          onRevealDone(emails, newPhones);
        }
      } catch { /* polling errors are non-fatal */ }
    }, 3000);
  };
 
  const reveal = async (type: "email"|"phone") => {
    if (!organizationId) return;
    const setLoad = type==="email" ? setELoad : setPLoad;
    const setErr  = type==="email" ? setEErr  : setPErr;
    setLoad(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("ti-reveal-contact", {
        body: { linkedinUrl: profile.linkedin_url, revealType: type, organizationId, userId },
      });
      if (error || (data?.error && !data?.phonePending)) {
        setErr(data?.message ?? data?.error ?? error?.message ?? "Reveal failed");
        return;
      }
      // ── Phone pending via Apollo webhook ──────────────────
      if (data?.phonePending) {
        setPhonePending(true);
        startPhonePolling(profile.linkedin_url);
        return;
      }
      // ── Normal success ────────────────────────────────────
      const ne: TIRevealedEmail[] = data.allEmails ?? [];
      const np: TIRevealedPhone[] = data.allPhones ?? [];
      const m = { emails: type==="email" ? ne : emails, phones: type==="phone" ? np : phones };
      setEmails(m.emails); setPhones(m.phones);
      onRevealDone(m.emails, m.phones);
    } catch(e: any) { setErr(e?.message ?? "Failed"); }
    finally { setLoad(false); }
  };
 
  const ca = profile.contact_availability;
  const hasPersonalEmail = !!ca?.personal_email;
  const hasPhone         = !!ca?.phone;
 
  const personalEmails   = emails.filter(isPersonalEmail);
  const emailWasRevealed = emails.length > 0;
  const hasPersonal      = personalEmails.length > 0;
  const primaryPersonal  = personalEmails[0] ?? null;
  const pp               = phones[0] ?? null;
 
  const allPhonesContent = (
    <div className="space-y-1.5">
      <p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">All Phones</p>
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 flex-1">{p.number}</span>
          {p.recommended && <span className="text-[7px] px-1 bg-green-100 text-green-700 rounded flex-shrink-0">✓</span>}
          <button onClick={() => copy(p.number)} className="text-slate-300 hover:text-violet-500 flex-shrink-0 transition-colors">
            {copied===p.number ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
          </button>
        </div>
      ))}
    </div>
  );
 
  const allPersonalEmailsContent = (
    <div className="space-y-1.5">
      <p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">Personal Emails</p>
      {personalEmails.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{e.email}</span>
          <button onClick={() => copy(e.email)} className="text-slate-300 hover:text-violet-500 flex-shrink-0 transition-colors">
            {copied===e.email ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
          </button>
        </div>
      ))}
    </div>
  );
 
  return (
    <div className="flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
      {/* Email */}
      {hasPersonalEmail && (
        hasPersonal ? (
          <PortalTip trigger={
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
              <Check size={8} className="text-emerald-500 flex-shrink-0" />
              <span className="text-[9px] font-mono text-slate-700 truncate">{primaryPersonal!.email}</span>
              {personalEmails.length > 1 && <span className="text-[8px] text-slate-400 flex-shrink-0">+{personalEmails.length-1}</span>}
            </div>
          } content={allPersonalEmailsContent} />
        ) : emailWasRevealed ? (
          <span className="text-[9px] text-slate-400 italic">No personal email</span>
        ) : (
          <button disabled={eLoad} onClick={() => reveal("email")}
            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-all",
              eErr ? "border-red-200 text-red-400" : "border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-400 disabled:opacity-50")}>
            {eLoad ? <Loader2 size={8} className="animate-spin" /> : <Mail size={8} />}
            {eLoad ? "…" : "Email"}
          </button>
        )
      )}
 
      {/* Phone */}
      {hasPhone && (
        pp ? (
          <PortalTip trigger={
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 cursor-default max-w-[130px]">
              <Check size={8} className="text-emerald-500 flex-shrink-0" />
              <span className="text-[9px] font-mono text-slate-700 truncate">{pp.number}</span>
              {phones.length > 1 && <span className="text-[8px] text-slate-400 flex-shrink-0">+{phones.length-1}</span>}
            </div>
          } content={allPhonesContent} />
        ) : phonePending ? (
          /* Apollo phone pending — polling for webhook delivery */
          <PortalTip
            trigger={
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-[9px] text-amber-600 font-medium max-w-[130px]">
                <Loader2 size={8} className="animate-spin flex-shrink-0" />
                <span className="truncate">Verifying…</span>
              </div>
            }
            content={
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-700">Phone pending</p>
                <p className="text-[9px] text-slate-500 leading-snug">Verifying this number. It will appear here automatically within 1–2 minutes.</p>
              </div>
            }
          />
        ) : (
          <button disabled={pLoad} onClick={() => reveal("phone")}
            className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-all",
              pErr ? "border-red-200 text-red-400" : "border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-400 disabled:opacity-50")}>
            {pLoad ? <Loader2 size={8} className="animate-spin" /> : <Phone size={8} />}
            {pLoad ? "…" : "Phone"}
          </button>
        )
      )}
 
      {!hasPersonalEmail && !hasPhone && <span className="text-[9px] text-slate-300">—</span>}
    </div>
  );
}
// ── Skills cell ───────────────────────────────────────────────
function SkillsCell({ skills, activeSkillLabels }: { skills: string[] | null; activeSkillLabels?: Set<string> }) {
  const all  = skills ?? [];
  const top  = all.slice(0, 2);
  const rest = all.slice(2);
  if (!all.length) return <span className="text-[9px] text-slate-300">—</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {top.map(sk => {
        const m = activeSkillLabels?.has(sk.toLowerCase());
        return (
          <span key={sk} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium border",
            m ? "bg-violet-100 text-violet-700 border-violet-300 ring-1 ring-violet-400" : "bg-slate-100 text-slate-500 border-slate-200")}>
            {sk}
          </span>
        );
      })}
      {rest.length > 0 && (
        <PortalTip
          trigger={<button className="text-[9px] text-violet-500 hover:text-violet-700 font-bold px-0.5">+{rest.length}</button>}
          content={
            <div>
              <p className="text-[8px] font-bold uppercase text-slate-400 mb-1.5">All Skills ({all.length})</p>
              <div className="flex flex-wrap gap-1">
                {all.map(sk => {
                  const m = activeSkillLabels?.has(sk.toLowerCase());
                  return (
                    <span key={sk} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium border",
                      m ? "bg-violet-100 text-violet-700 border-violet-300" : "bg-slate-100 text-slate-500 border-slate-200")}>
                      {sk}
                    </span>
                  );
                })}
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}

// ── InvitePicker — personal emails only ───────────────────────

interface InvitePickerProps {
  emails:    TIRevealedEmail[];
  phones:    TIRevealedPhone[];
  onConfirm: (email: string|null, phone: string|null) => void;
  onClose:   () => void;
}

function InvitePicker({ emails, phones, onConfirm, onClose }: InvitePickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // ── Personal emails ONLY ──────────────────────────────────
  const personalEmails = emails.filter(isPersonalEmail);

  const defaultSel = (): { kind: "email"|"phone"; value: string } | null => {
    if (personalEmails[0]) return { kind: "email",  value: personalEmails[0].email };
    if (phones[0])         return { kind: "phone",  value: phones[0].number };
    return null;
  };
  const [sel, setSel] = useState(defaultSel);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", fn), 100);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Invite via</p>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors"><X size={10} /></button>
      </div>

      {/* Personal emails only */}
      {personalEmails.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Personal Email</p>
          {personalEmails.map((e, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1 transition-colors">
              <input type="radio" name="ti-invite-sel"
                checked={sel?.kind==="email" && sel.value===e.email}
                onChange={() => setSel({kind:"email", value:e.email})}
                className="accent-violet-600 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700 truncate">{e.email}</span>
            </label>
          ))}
        </div>
      )}

      {/* No personal email notice */}
      {personalEmails.length === 0 && emails.length > 0 && (
        <p className="text-[10px] text-slate-400 italic px-1">No personal email available</p>
      )}

      {/* Phones */}
      {phones.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Phone</p>
          {phones.slice(0,3).map((ph, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1 transition-colors">
              <input type="radio" name="ti-invite-sel"
                checked={sel?.kind==="phone" && sel.value===ph.number}
                onChange={() => setSel({kind:"phone", value:ph.number})}
                className="accent-violet-600 flex-shrink-0" />
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[10px] font-mono text-slate-700">{ph.number}</span>
                {ph.recommended && <span className="text-[8px] px-1 bg-green-100 text-green-700 rounded">✓</span>}
              </div>
            </label>
          ))}
        </div>
      )}

      {personalEmails.length === 0 && phones.length === 0 && (
        <p className="text-[11px] text-slate-400 text-center py-1">No contact info available</p>
      )}

      <button disabled={!sel}
        onClick={() => sel && onConfirm(sel.kind==="email" ? sel.value : null, sel.kind==="phone" ? sel.value : null)}
        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-40 transition-all flex items-center justify-center gap-1.5">
        <Send size={10} /> Continue →
      </button>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────
function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / TI_PAGE_SIZE);
  if (totalPages <= 1) return null;
  const start = (page-1)*TI_PAGE_SIZE+1, end = Math.min(page*TI_PAGE_SIZE,total);
  const range: (number|"…")[] = [];
  if (totalPages <= 7) { for (let i=1;i<=totalPages;i++) range.push(i); }
  else {
    range.push(1); if (page>3) range.push("…");
    for (let i=Math.max(2,page-1);i<=Math.min(totalPages-1,page+1);i++) range.push(i);
    if (page<totalPages-2) range.push("…"); range.push(totalPages);
  }
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-white flex-shrink-0">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{start}–{end}</span> of <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={()=>onChange(page-1)} disabled={page===1} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronLeft size={13}/></button>
        {range.map((r,i) => r==="…"
          ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
          : <button key={r} onClick={()=>onChange(r as number)} className={cn("w-6 h-6 rounded text-xs font-medium transition-colors",r===page?"bg-violet-600 text-white":"text-slate-600 hover:bg-slate-100")}>{r}</button>
        )}
        <button onClick={()=>onChange(page+1)} disabled={page===Math.ceil(total/TI_PAGE_SIZE)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronRight size={13}/></button>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      {[160,120,130,140,130,110,70].map((w,i)=>(
        <td key={i} className="px-3 py-2"><div className="h-3 bg-slate-100 rounded" style={{width:`${Math.min(w,100)}%`}}/></td>
      ))}
    </tr>
  );
}

const COLS = [
  { label:"Profile",  minW:160 },
  { label:"Contact",  minW:128 },
  { label:"Title",    minW:130 },
  { label:"Skills",   minW:148 },
  { label:"Company",  minW:130 },
  { label:"Location", minW:110 },
  { label:"Actions",  minW:80  },
] as const;

const thStyle = (i: number): React.CSSProperties => ({
  position:  "sticky", top: 0, background: "#f8fafc",
  zIndex:    i === 0 ? 31 : 30,
  ...(i === 0 ? { left: 0 } : {}),
});

export interface TIResultsTableProps {
  profiles:        TIProfile[];
  total:           number;
  page:            number;
  isLoading:       boolean;
  isSearching:     boolean;
  activeFilters:   { skillChips?: { label: string; mode: string }[]; titles?: string[]; query?: string };
  onSelectProfile: (p: TIProfile) => void;
  onInvite:        (p: TIProfile, email: string|null, phone: string|null) => void;
  onPageChange:    (p: number) => void;
  onRevealUpdate:  (id: string, emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}

export function TIResultsTable({
  profiles, total, page, isLoading, isSearching,
  activeFilters, onSelectProfile, onInvite, onPageChange, onRevealUpdate,
}: TIResultsTableProps) {
  const [saved,          setSaved]          = useState<Set<string>>(new Set());
  const [invitePickerId, setInvitePickerId] = useState<string|null>(null);

  const activeSkillLabels = new Set(
    (activeFilters.skillChips ?? [])
      .filter(c => c.mode==="must"||c.mode==="nice")
      .map(c => c.label.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <style>{STICKY_CSS}</style>
        <table className="w-full border-collapse ti-table" style={{ minWidth: 960 }}>
          <thead>
            <tr>{COLS.map((c,i) => <th key={c.label} style={{ ...thStyle(i), minWidth: c.minW }} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">{c.label}</th>)}</tr>
          </thead>
          <tbody>{Array.from({length:10}).map((_,i)=><SkeletonRow key={i}/>)}</tbody>
        </table>
      </div>
    );
  }

  if (profiles.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <style>{STICKY_CSS}</style>
      {isSearching && <div className="h-0.5 bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500 animate-pulse flex-shrink-0" />}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse ti-table" style={{ minWidth: 960 }}>
          <thead>
            <tr>{COLS.map((c,i) => <th key={c.label} style={{ ...thStyle(i), minWidth: c.minW }} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap border-b border-slate-200">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {profiles.map((profile, idx) => {
              const isOTW    = profile.work_status === "open_to_work";
              const yrs      = calcYearsExperience(profile.experience);
              const domain   = profile.company_domain ?? (profile.company as any)?.domain;
              const isSaved  = saved.has(profile.id);
              const showPick = invitePickerId === profile.id;

              // Invite enabled only if personal email or phone is revealed
              const hasRevealedPersonalEmail = (profile.revealed_emails ?? []).some(isPersonalEmail);
              const hasRevealedPhone         = (profile.revealed_phones?.length ?? 0) > 0;
              const canInvite                = hasRevealedPersonalEmail || hasRevealedPhone;

              const titleWords = [
                ...(activeFilters.titles ?? []),
                ...(activeFilters.query?.split(/\s+/).filter(w=>w.length>2) ?? []),
              ].map(w=>w.toLowerCase()).filter(Boolean);

              const highlightTitle = (text: string) => {
                if (!titleWords.length) return <>{text}</>;
                const parts = text.split(new RegExp(`(${titleWords.join("|")})`, "gi"));
                return <>{parts.map((p,i)=>titleWords.includes(p.toLowerCase())?<mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5 not-italic">{p}</mark>:<span key={i}>{p}</span>)}</>;
              };

              return (
                <tr key={profile.id} onClick={() => onSelectProfile(profile)}
                  className="border-b border-slate-50 cursor-pointer group"
                  style={{ background: idx%2===0 ? undefined : "#f9f9fb" }}>

                  {/* 1. Profile — sticky */}
                  <td className="px-3 py-2 ti-col-sticky" style={{ position:"sticky", left:0, zIndex:1 }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Avatar profile={profile} />
                        {isOTW && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white flex items-center justify-center">
                            <Zap size={5} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-800 truncate leading-tight group-hover:text-violet-700 transition-colors">
                            {profile.full_name ?? "Unknown"}
                          </span>
                          {profile.linkedin_url && (
                            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                              onClick={e=>e.stopPropagation()}
                              className="flex-shrink-0 hover:text-blue-300 text-[#0A66C2] transition-colors">
                              <Linkedin size={9} />
                            </a>
                          )}
                        </div>
<div className="relative z-10 flex items-center gap-1.5 mt-1 flex-nowrap overflow-visible">

  {yrs && (
    <span
      className="
        inline-flex
        items-center
        px-2
        py-[3px]
        rounded-full
        text-[9px]
        font-bold
        whitespace-nowrap
        bg-indigo-100
        text-indigo-900
        shadow-sm
       
      "
    >
     {yrs}
    </span>
  )}

  {isOTW && (
    <span
      className="
        inline-flex
        items-center
        gap-1
        px-1.5
        py-[2px]
        rounded-full
        text-[8px]
        font-bold
        whitespace-nowrap
        bg-green-200
        text-green-900
        border
        border-green-300

        animate-bounce
      "
      style={{
  animation: "bounce 0.9s infinite"
}}
    >
   Open to Work
    </span>
  )}

</div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Contact */}
                  <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                    <RevealCell profile={profile} onRevealDone={(em,ph)=>onRevealUpdate(profile.id,em,ph)} />
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
                    <SkillsCell skills={profile.skills} activeSkillLabels={activeSkillLabels.size>0?activeSkillLabels:undefined} />
                  </td>

                  {/* 5. Company */}
                  <td className="px-3 py-2">
                    {profile.company_name ? (
                      <div className="flex items-start gap-1.5 min-w-0">
                        <CompanyLogo profile={profile} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-slate-700 truncate leading-tight">{profile.company_name}</p>
                          {domain && (
                            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer"
                              onClick={e=>e.stopPropagation()}
                              className="flex items-center gap-0.5 text-[8px] text-slate-400 hover:text-violet-500 transition-colors mt-0.5">
                              <Globe size={7}/><span className="truncate">{domain}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ) : <span className="text-[9px] text-slate-300">—</span>}
                  </td>

                  {/* 6. Location */}
                  <td className="px-3 py-2">
                    <p className="text-[10px] text-slate-500 truncate max-w-[105px]">{profile.location ?? "—"}</p>
                    {profile.country && profile.location!==profile.country && <p className="text-[9px] text-slate-400 truncate mt-0.5">{profile.country}</p>}
                  </td>

                  {/* 7. Actions */}
                  <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-0.5 relative">
                      <button onClick={()=>onSelectProfile(profile)} title="View profile"
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                        <ExternalLink size={11}/>
                      </button>
                      <button
                        onClick={()=>canInvite && setInvitePickerId(showPick?null:profile.id)}
                        title={canInvite ? "Send invite" : "Reveal personal email or phone first"}
                        disabled={!canInvite}
                        className={cn("w-6 h-6 flex items-center justify-center rounded transition-all",
                          canInvite ? "text-slate-400 hover:text-green-600 hover:bg-green-50" : "text-slate-200 cursor-not-allowed")}>
                        <Send size={11}/>
                      </button>
                      <button
                        onClick={()=>setSaved(p=>{const s=new Set(p); isSaved?s.delete(profile.id):s.add(profile.id); return s;})}
                        title={isSaved?"Saved":"Save"}
                        className={cn("w-6 h-6 flex items-center justify-center rounded transition-all",
                          isSaved?"text-emerald-600 bg-emerald-50":"text-slate-400 hover:text-violet-600 hover:bg-violet-50")}>
                        {isSaved ? <BookmarkCheck size={11}/> : <Bookmark size={11}/>}
                      </button>
                      {showPick && (
                        <InvitePicker
                          emails={profile.revealed_emails??[]}
                          phones={profile.revealed_phones??[]}
                          onConfirm={(em,ph)=>{ setInvitePickerId(null); onInvite(profile,em,ph); }}
                          onClose={()=>setInvitePickerId(null)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onChange={onPageChange} />
    </div>
  );
}