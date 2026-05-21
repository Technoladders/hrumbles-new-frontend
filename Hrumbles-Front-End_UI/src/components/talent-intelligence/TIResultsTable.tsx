// src/components/talent-intelligence/TIResultsTable.tsx  — v2
// Proper table layout with inline reveal in email/phone columns + actions

import React, { useState, useCallback } from "react";
import {
  Mail, Phone, Linkedin, ChevronLeft, ChevronRight,
  Eye, Loader2, Check, Copy, ExternalLink, Send,
  Zap, MoreHorizontal,
} from "lucide-react";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { TIProfile, TIRevealedEmail, TIRevealedPhone, TI_PAGE_SIZE } from "@/types/talentIntelligence";

// ── Helpers ───────────────────────────────────────────────────

function initials(name: string | null) {
  return (name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function Avatar({ profile }: { profile: TIProfile }) {
  const [imgErr, setImgErr] = useState(false);
  if (profile.profile_picture_url && !imgErr) {
    return (
      <img src={profile.profile_picture_url} alt={profile.full_name ?? ""}
        className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
        onError={() => setImgErr(true)} />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
      {initials(profile.full_name)}
    </div>
  );
}

function SeniorityBadge({ v }: { v: string | null }) {
  if (!v) return null;
  const map: Record<string, string> = {
    "Entry": "bg-slate-100 text-slate-600",
    "Senior": "bg-blue-100 text-blue-700",
    "Manager": "bg-amber-100 text-amber-700",
    "Director": "bg-orange-100 text-orange-700",
    "VP": "bg-red-100 text-red-700",
    "CXO": "bg-purple-100 text-purple-700",
    "Owner / Founder": "bg-rose-100 text-rose-700",
    "Partner": "bg-indigo-100 text-indigo-700",
    "Head": "bg-cyan-100 text-cyan-700",
    "Intern": "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${map[v] ?? "bg-slate-100 text-slate-600"}`}>
      {v}
    </span>
  );
}

// ── Inline reveal cell ────────────────────────────────────────

interface RevealCellProps {
  profileId:     string;
  linkedinUrl:   string;
  revealType:    "email" | "phone";
  available:     boolean;
  initialEmails: TIRevealedEmail[];
  initialPhones: TIRevealedPhone[];
  onRevealDone:  (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}

function RevealCell({
  profileId, linkedinUrl, revealType, available,
  initialEmails, initialPhones, onRevealDone,
}: RevealCellProps) {
  const authData        = getAuthDataFromLocalStorage();
  const organizationId  = authData?.organization_id ?? null;
  const userId          = authData?.userId ?? null;

  const [emails,   setEmails]   = useState<TIRevealedEmail[]>(initialEmails);
  const [phones,   setPhones]   = useState<TIRevealedPhone[]>(initialPhones);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);

  // Sync when initial data changes (another cell triggered reveal)
  React.useEffect(() => { setEmails(initialEmails); }, [initialEmails.length]);
  React.useEffect(() => { setPhones(initialPhones); }, [initialPhones.length]);

  const revealed = revealType === "email" ? emails : phones;
  const primary  = revealType === "email"
    ? (emails.find(e => e.is_primary) ?? emails[0])
    : (phones.find(p => p.recommended) ?? phones[0]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const doReveal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!organizationId || loading) return;
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("contactout-enrich", {
        body: { linkedinUrl, revealType, organizationId, userId },
      });
      if (fnErr || data?.error) {
        setError(data?.message ?? fnErr?.message ?? "Reveal failed");
        return;
      }
      const newEmails: TIRevealedEmail[] = data.allEmails ?? [];
      const newPhones: TIRevealedPhone[] = data.allPhones ?? [];
      const merged = {
        emails: revealType === "email" ? newEmails : emails,
        phones: revealType === "phone" ? newPhones : phones,
      };
      setEmails(merged.emails);
      setPhones(merged.phones);
      onRevealDone(merged.emails, merged.phones);

      // Persist to master table
      const updates: Record<string, any> = { revealed_at: new Date().toISOString() };
      if (merged.emails.length) updates.revealed_emails = merged.emails;
      if (merged.phones.length) updates.revealed_phones = merged.phones;
      supabase.from("master_contactout_profiles").update(updates).eq("id", profileId).then(() => {});
    } catch (err: any) {
      setError(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!available) {
    return <span className="text-[10px] text-slate-300">—</span>;
  }

  // Already revealed: show primary value + copy
  if (primary) {
    const val = revealType === "email" ? (primary as TIRevealedEmail).email : (primary as TIRevealedPhone).number;
    return (
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs text-slate-700 font-medium truncate max-w-[130px]" title={val}>{val}</span>
        {revealed.length > 1 && (
          <span className="text-[9px] text-slate-400 bg-slate-100 rounded px-1 flex-shrink-0">+{revealed.length - 1}</span>
        )}
        <button onClick={e => { e.stopPropagation(); copyToClipboard(val); }}
          className="p-0.5 text-slate-400 hover:text-violet-600 flex-shrink-0 transition-colors">
          {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
        </button>
      </div>
    );
  }

  // Not revealed yet
  return (
    <div className="flex items-center gap-1">
      {error ? (
        <span className="text-[10px] text-red-500 truncate max-w-[100px]">{error}</span>
      ) : (
        <button onClick={doReveal} disabled={loading}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-violet-200 text-violet-600 text-[10px] font-medium hover:bg-violet-50 disabled:opacity-50 transition-colors whitespace-nowrap">
          {loading ? <Loader2 size={9} className="animate-spin" /> : <Eye size={9} />}
          {loading ? "…" : "Reveal"}
        </button>
      )}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────

interface PaginationProps { page: number; total: number; onPageChange: (p: number) => void; }
function Pagination({ page, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / TI_PAGE_SIZE);
  if (totalPages <= 1) return null;
  const start = (page - 1) * TI_PAGE_SIZE + 1;
  const end   = Math.min(page * TI_PAGE_SIZE, total);

  const range: (number | "…")[] = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) range.push(i); }
  else {
    range.push(1);
    if (page > 3) range.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i);
    if (page < totalPages - 2) range.push("…");
    range.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-white flex-shrink-0">
      <p className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{start}–{end}</span> of{" "}
        <span className="font-medium text-slate-700">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {range.map((r, i) => r === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-slate-400 text-xs">…</span>
        ) : (
          <button key={r} onClick={() => onPageChange(r as number)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${r === page ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {r}
          </button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page === Math.ceil(total / TI_PAGE_SIZE)}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-slate-100 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ── Main table ────────────────────────────────────────────────

export interface TIResultsTableProps {
  profiles:        TIProfile[];
  total:           number;
  page:            number;
  isLoading:       boolean;
  isSearching:     boolean;
  onSelectProfile: (p: TIProfile) => void;
  onInvite:        (p: TIProfile) => void;
  onPageChange:    (p: number) => void;
  onRevealUpdate:  (id: string, emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}

export function TIResultsTable({
  profiles, total, page, isLoading, isSearching,
  onSelectProfile, onInvite, onPageChange, onRevealUpdate,
}: TIResultsTableProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            {["Profile","Title","Company","Location","Seniority","Skills","Email","Phone","Actions"].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      </div>
    );
  }

  if (profiles.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {isSearching && <div className="h-0.5 bg-gradient-to-r from-violet-400 via-violet-600 to-violet-400 animate-pulse flex-shrink-0" />}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b border-slate-200">
              {[
                { label: "Profile",   cls: "w-[200px]" },
                { label: "Title",     cls: "w-[160px]" },
                { label: "Company",   cls: "w-[140px]" },
                { label: "Location",  cls: "w-[130px]" },
                { label: "Level",     cls: "w-[100px]" },
                { label: "Skills",    cls: "w-[160px]" },
                { label: "Email",     cls: "w-[170px]" },
                { label: "Phone",     cls: "w-[140px]" },
                { label: "Actions",   cls: "w-[90px]"  },
              ].map(col => (
                <th key={col.label} className={`px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${col.cls}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {profiles.map(profile => {
              const isOpenToWork = profile.work_status === "open_to_work";
              const currentExp   = (profile.experience ?? []).find(e => e.is_current);
              const company      = profile.company_name ?? currentExp?.company_name ?? "—";
              const skills       = (profile.skills ?? []).slice(0, 3);
              const hasEmail     = !!(profile.contact_availability?.personal_email || profile.contact_availability?.work_email);
              const hasPhone     = !!profile.contact_availability?.phone;

              return (
                <tr key={profile.id}
                  onClick={() => onSelectProfile(profile)}
                  className="hover:bg-violet-50/40 cursor-pointer transition-colors group">

                  {/* Profile */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Avatar profile={profile} />
                        {isOpenToWork && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center">
                            <Zap size={6} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-violet-700 transition-colors leading-tight">
                          {profile.full_name ?? "Unknown"}
                        </p>
                        {profile.linkedin_url && (
                          <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[#0A66C2] hover:text-[#004182] transition-colors inline-flex items-center gap-0.5">
                            <Linkedin size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Title */}
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-slate-600 truncate max-w-[150px]" title={profile.title ?? ""}>
                      {profile.title ?? "—"}
                    </p>
                  </td>

                  {/* Company */}
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-slate-700 font-medium truncate max-w-[130px]" title={company}>{company}</p>
                    {profile.company_industry && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{profile.company_industry}</p>
                    )}
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2.5">
                    <p className="text-xs text-slate-500 truncate max-w-[120px]" title={profile.location ?? ""}>{profile.location ?? "—"}</p>
                  </td>

                  {/* Level + Function */}
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <SeniorityBadge v={profile.seniority} />
                      {profile.job_function && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[90px]">{profile.job_function}</p>
                      )}
                    </div>
                  </td>

                  {/* Skills */}
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {skills.map(sk => (
                        <span key={sk} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] truncate max-w-[70px]" title={sk}>{sk}</span>
                      ))}
                      {(profile.skills?.length ?? 0) > 3 && (
                        <span className="text-[10px] text-slate-400">+{(profile.skills?.length ?? 0) - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <RevealCell
                      profileId={profile.id}
                      linkedinUrl={profile.linkedin_url}
                      revealType="email"
                      available={hasEmail}
                      initialEmails={profile.revealed_emails ?? []}
                      initialPhones={profile.revealed_phones ?? []}
                      onRevealDone={(em, ph) => onRevealUpdate(profile.id, em, ph)}
                    />
                  </td>

                  {/* Phone */}
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <RevealCell
                      profileId={profile.id}
                      linkedinUrl={profile.linkedin_url}
                      revealType="phone"
                      available={hasPhone}
                      initialEmails={profile.revealed_emails ?? []}
                      initialPhones={profile.revealed_phones ?? []}
                      onRevealDone={(em, ph) => onRevealUpdate(profile.id, em, ph)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onSelectProfile(profile)}
                        title="View profile"
                        className="p-1.5 rounded text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                        <ExternalLink size={13} />
                      </button>
                      <button onClick={() => onInvite(profile)}
                        title="Send invite"
                        className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                        <Send size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} total={total} onPageChange={onPageChange} />
    </div>
  );
}