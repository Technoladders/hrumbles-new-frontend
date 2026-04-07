/**
 * RRTable.tsx — RocketReach results table
 *
 * Mirrors CandidateTable.tsx exactly:
 * - Same gradient header style, checkbox, avatar, reveal dots
 * - RR-specific: shows teaser emails/phones before reveal
 * - After reveal: shows enriched badge + email grade dots
 * - revealedIds: Set<number> of rr_profile_ids this org has already revealed
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, Briefcase } from "lucide-react";
import type { RRProfile } from "../types";

// ─── Gradient def ─────────────────────────────────────────────────────────────
const GradientDef: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="rr-icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const COLORS = [
  "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];
const avatarCls  = (id: number) => COLORS[id % COLORS.length];
const initials   = (name: string | null) => (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

// ─── Availability dot ─────────────────────────────────────────────────────────
const AvailDot: React.FC<{
  ok: boolean; revealed: boolean; Icon: React.ElementType;
  tooltip: string; selected: boolean;
}> = ({ ok, revealed, Icon, tooltip, selected }) => (
  <span title={tooltip} className="flex-shrink-0">
    <Icon
      size={11}
      className={cn(!ok && !revealed && (selected ? "text-violet-500/30" : "text-slate-200"))}
      style={revealed
        ? { stroke: "url(#rr-icon-gradient)" }
        : ok ? { stroke: "url(#rr-icon-gradient)", opacity: 0.4 }
        : {}
      }
    />
  </span>
);

// ─── Enriched badge ───────────────────────────────────────────────────────────
const EnrichedBadge: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span className={cn(
    "inline-flex items-center px-1 py-0.5 rounded-full text-[8px] font-bold leading-none whitespace-nowrap flex-shrink-0",
    selected ? "bg-orange-400/20 text-orange-200 border border-orange-400/30"
             : "bg-orange-50 text-orange-600 border border-orange-200"
  )}>
    RR
  </span>
);

// ─── Single row ───────────────────────────────────────────────────────────────
interface RowProps {
  profile:       RRProfile;
  selected:      boolean;
  checked:       boolean;
  revealed:      boolean;  // already revealed by this org
  onRowClick:    () => void;
  onCheckChange: (v: boolean) => void;
}

const RRRow: React.FC<RowProps> = ({ profile: p, selected, checked, revealed, onRowClick, onCheckChange }) => {
  const enriched  = !!p._enriched || revealed;
  const hasEmail  = enriched
    ? (p._allEmails?.length ?? 0) > 0
    : (p.teaser?.professional_emails?.length ?? 0) > 0 || (p.teaser?.emails?.length ?? 0) > 0;
  const hasPhone  = enriched
    ? (p._allPhones?.length ?? 0) > 0
    : (p.teaser?.phones?.length ?? 0) > 0;
  const hasLoc    = !!(p.city || p.location);
  const hasOrg    = !!p.current_employer;

  return (
    <tr
      onClick={onRowClick}
      className={cn(
        "group border-b cursor-pointer transition-colors duration-100",
        selected ? "bg-violet-700 border-violet-600 hover:bg-violet-700"
                 : "border-slate-100 hover:bg-violet-50/40"
      )}
    >
      {/* Checkbox */}
      <td className="pl-3 pr-1.5 py-2 w-8" onClick={e => e.stopPropagation()}>
        <Checkbox checked={checked} onCheckedChange={onCheckChange}
          className={cn("h-3 w-3", selected && "[&>span]:border-white")} />
      </td>

      {/* Name */}
      <td className="pl-2 pr-3 py-2 min-w-[160px]">
        <div className="flex items-center gap-2">
          {p.profile_pic ? (
            <img src={p.profile_pic} alt={p.name ?? ""} onError={e => (e.currentTarget.style.display = "none")}
              className="w-6 h-6 rounded-md object-cover flex-shrink-0 ring-1 ring-slate-100" />
          ) : (
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0",
              selected ? "bg-white/20 text-white" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white")}>
              {initials(p.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <p className={cn("text-[9px] font-semibold leading-tight truncate max-w-[110px]",
                selected ? "text-white" : "text-slate-700")}>
                {p.name ?? "—"}
              </p>
              {enriched && <EnrichedBadge selected={selected} />}
            </div>
            <p className={cn("text-[9px] mt-0.5 font-mono", selected ? "text-violet-200" : "text-slate-400")}>
              #{p.id}
            </p>
          </div>
        </div>
      </td>

      {/* Title */}
      <td className="px-3 py-2 min-w-[170px] max-w-[240px]">
        <span className={cn("text-[9px] leading-snug line-clamp-2",
          selected ? "text-violet-100" : "text-slate-500")}>
          {p.current_title ?? "—"}
        </span>
      </td>

      {/* Company */}
      <td className="px-3 py-2 min-w-[120px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn("w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold",
            selected ? "bg-white/20 text-white" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white")}>
            {(p.current_employer?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className={cn("text-[9px] font-medium truncate max-w-[90px]",
              selected ? "text-violet-100" : "text-slate-600")}>
              {p.current_employer ?? "—"}
            </p>
            {p.current_employer_domain && (
              <p className={cn("text-[8px] truncate max-w-[90px]",
                selected ? "text-violet-200/60" : "text-slate-400")}>
                {p.current_employer_domain}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-3 py-2 min-w-[100px]">
        <span className={cn("text-[9px] line-clamp-1", selected ? "text-violet-100" : "text-slate-500")}>
          {p.location ?? p.city ?? "—"}
        </span>
      </td>

      {/* Contact dots */}
      <td className="px-3 py-2 w-[88px]">
        <div className="flex items-center gap-2">
          <AvailDot ok={hasEmail} revealed={enriched && hasEmail} Icon={Mail}
            tooltip={enriched && hasEmail ? "Email revealed" : hasEmail ? "Email available" : "No email"}
            selected={selected} />
          <AvailDot ok={hasPhone} revealed={enriched && hasPhone} Icon={Phone}
            tooltip={enriched && hasPhone ? "Phone revealed" : hasPhone ? "Phone available" : "No phone"}
            selected={selected} />
          <AvailDot ok={hasLoc} revealed={false} Icon={MapPin}
            tooltip="Location" selected={selected} />
          <AvailDot ok={hasOrg} revealed={false} Icon={Briefcase}
            tooltip="Company data" selected={selected} />
        </div>
      </td>
    </tr>
  );
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="border-b border-slate-100">
    <td className="pl-3 pr-1.5 py-2"><div className="h-3 w-3 rounded bg-slate-100 animate-pulse" /></td>
    <td className="pl-2 pr-3 py-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-violet-100 animate-pulse flex-shrink-0" />
        <div className="space-y-1 flex-1">
          <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
          <div className="h-2 w-14 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </td>
    <td className="px-3 py-2"><div className="h-2.5 w-36 bg-slate-100 rounded animate-pulse" /></td>
    <td className="px-3 py-2">
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-5 rounded bg-violet-50 animate-pulse" />
        <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
    </td>
    <td className="px-3 py-2"><div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" /></td>
    <td className="px-3 py-2">
      <div className="flex items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-2.5 w-2.5 rounded-full bg-violet-100 animate-pulse" />
        ))}
      </div>
    </td>
  </tr>
);

// ─── Full table ───────────────────────────────────────────────────────────────
interface RRTableProps {
  profiles:    RRProfile[];
  loading?:    boolean;
  selectedId:  number | null;
  checkedIds:  Set<number>;
  revealedIds: Set<number>;
  onSelectRow:   (p: RRProfile | null) => void;
  onCheckRow:    (id: number, v: boolean) => void;
  onCheckAll:    (v: boolean) => void;
}

export const RRTable: React.FC<RRTableProps> = ({
  profiles, loading, selectedId, checkedIds, revealedIds,
  onSelectRow, onCheckRow, onCheckAll,
}) => {
  const allChecked = profiles.length > 0 && profiles.every(p => checkedIds.has(p.id));

  const TH: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <th className={cn(
      "py-2 text-[9px] font-semibold uppercase tracking-wider",
      "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent",
      cls
    )}>
      {children}
    </th>
  );

  return (
    <div className="overflow-x-auto relative">
      <GradientDef />
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-violet-100 bg-violet-50/40 sticky top-0 z-10">
            <th className="pl-3 pr-1.5 py-2 w-8">
              <Checkbox checked={allChecked} onCheckedChange={onCheckAll} className="h-3 w-3" />
            </th>
            <TH cls="pl-2 pr-3">Candidate</TH>
            <TH cls="px-3">Current Role</TH>
            <TH cls="px-3">Company</TH>
            <TH cls="px-3">Location</TH>
            <TH cls="px-3 w-[88px]">Contact</TH>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
            : profiles.map(p => (
                <RRRow
                  key={p.id} profile={p}
                  selected={selectedId === p.id}
                  checked={checkedIds.has(p.id)}
                  revealed={revealedIds.has(p.id)}
                  onRowClick={() => onSelectRow(selectedId === p.id ? null : p)}
                  onCheckChange={v => onCheckRow(p.id, v)}
                />
              ))
          }
        </tbody>
      </table>
      {!loading && profiles.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-xs">No results to display</div>
      )}
    </div>
  );
};