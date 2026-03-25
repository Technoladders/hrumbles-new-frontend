/**
 * CandidateTable — v2
 *
 * New vs v1:
 * - Accepts crossCheckMap: shows "In CRM" badge on rows where the candidate
 *   already exists in the contacts table (anywhere on the platform)
 * - Accepts revealHistoryMap: shows email/phone reveal status directly
 *   in the Contact column so recruiters know they don't need to pay again
 * - "Status" micro-column added between Company and Contact
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, Briefcase, UserCheck } from "lucide-react";
import { ApolloCandidate } from "../types";
import type { CrossCheckResult, RevealHistory } from "../hooks/useApolloIdCrossCheck";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100   text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100  text-amber-700",
  "bg-rose-100   text-rose-700",
  "bg-cyan-100   text-cyan-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-orange-100 text-orange-700",
];

const avatarColor = (id: string) =>
  AVATAR_COLORS[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_COLORS.length];

const initials = (fn: string, ln: string) =>
  ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase();

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch { return ""; }
};

// ─── Shared SVG gradient def (rendered once) ──────────────────────────────────
const GradientDef: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Availability dot ─────────────────────────────────────────────────────────
const AvailDot: React.FC<{
  ok:       boolean | string;
  revealed: boolean;   // already revealed by this org — show stronger highlight
  Icon:     React.ElementType;
  tooltip:  string;
  selected: boolean;
}> = ({ ok, revealed, Icon, tooltip, selected }) => {
  const isOk = ok === true || ok === "Yes";

  // Colour logic:
  // • revealed=true  → gradient (they paid, they can see it)
  // • isOk=true only → faint gradient (Apollo reports it exists but not revealed yet)
  // • neither        → slate-200 (nothing there)
  const style = revealed
    ? { stroke: "url(#icon-gradient)" }
    : isOk && !selected
    ? { stroke: "url(#icon-gradient)", opacity: 0.4 }
    : {};

  return (
    <span title={tooltip} className="flex-shrink-0">
      <Icon
        size={11}
        className={cn(
          !isOk && !revealed && (selected ? "text-violet-500/30" : "text-slate-200")
        )}
        style={isOk || revealed ? style : {}}
      />
    </span>
  );
};

// ─── "In CRM" badge ───────────────────────────────────────────────────────────
const InCrmBadge: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    title="This person already exists in your CRM"
    className={cn(
      "inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full",
      "text-[8px] font-bold leading-none whitespace-nowrap flex-shrink-0",
      selected
        ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
        : "bg-emerald-50 text-emerald-600 border border-emerald-200",
    )}
  >
    <UserCheck size={8} />
    CRM
  </span>
);

// ─── "Revealed" micro-badge ───────────────────────────────────────────────────
const RevealedBadge: React.FC<{
  emailRevealed: boolean;
  phoneRevealed: boolean;
  selected:      boolean;
}> = ({ emailRevealed, phoneRevealed, selected }) => {
  if (!emailRevealed && !phoneRevealed) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full",
        "text-[8px] font-bold leading-none whitespace-nowrap flex-shrink-0",
        selected
          ? "bg-violet-300/20 text-violet-200 border border-violet-300/30"
          : "bg-violet-50 text-violet-600 border border-violet-200",
      )}
      title={[
        emailRevealed && "Email revealed",
        phoneRevealed && "Phone revealed",
      ].filter(Boolean).join(" · ")}
    >
      {emailRevealed && phoneRevealed ? "✓ Both" : emailRevealed ? "✓ Email" : "✓ Phone"}
    </span>
  );
};

// ─── Single candidate row ─────────────────────────────────────────────────────
interface RowProps {
  candidate:     ApolloCandidate;
  selected:      boolean;
  checked:       boolean;
  crossCheck?:   CrossCheckResult;
  revealHistory?: RevealHistory;
  onRowClick:    () => void;
  onCheckChange: (v: boolean) => void;
}

const CandidateRow: React.FC<RowProps> = ({
  candidate: c, selected, checked,
  crossCheck, revealHistory,
  onRowClick, onCheckChange,
}) => {
  const avCls  = avatarColor(c.id);
  const init   = initials(c.first_name, c.last_name_obfuscated);
  const title  = c.title || "—";
  const org    = c.organization?.name || "—";
  const hasLoc = c.has_city || c.has_state || c.has_country;

  const isInCrm       = !!crossCheck;
  const emailRevealed = !!(revealHistory?.emailRevealed || crossCheck?.hasEmail);
  const phoneRevealed = !!revealHistory?.phoneRevealed;

  return (
    <tr
      onClick={onRowClick}
      className={cn(
        "group border-b cursor-pointer transition-colors duration-100",
        selected
          ? "bg-violet-700 border-violet-600 hover:bg-violet-700"
          : "border-slate-100 hover:bg-violet-50/40",
      )}
    >
      {/* Checkbox */}
      <td className="pl-3 pr-1.5 py-2 w-8" onClick={e => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckChange}
          className={cn("h-3 w-3", selected && "[&>span]:border-white")}
        />
      </td>

      {/* NAME */}
      <td className="pl-2 pr-3 py-2 min-w-[160px]">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0",
            selected
              ? "bg-white/20 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
          )}>
            {init}
          </div>

          {/* Name + badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <p className={cn(
                "text-[9px] font-semibold leading-tight truncate max-w-[110px]",
                selected ? "text-white" : "text-slate-700",
              )}>
                {c.first_name} {c.last_name_obfuscated}
              </p>
              {isInCrm && <InCrmBadge selected={selected} />}
              {(emailRevealed || phoneRevealed) && (
                <RevealedBadge
                  emailRevealed={emailRevealed}
                  phoneRevealed={phoneRevealed}
                  selected={selected}
                />
              )}
            </div>
            <p className={cn(
              "text-[9px] mt-0.5",
              selected ? "text-violet-200" : "text-slate-400",
            )}>
              {fmtDate(c.last_refreshed_at)}
            </p>
          </div>
        </div>
      </td>

      {/* TITLE */}
      <td className="px-3 py-2 min-w-[170px] max-w-[240px]">
        <span className={cn(
          "text-[9px] leading-snug line-clamp-2",
          selected ? "text-violet-100" : "text-slate-500",
        )}>
          {title}
        </span>
      </td>

      {/* COMPANY */}
      <td className="px-3 py-2 min-w-[120px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn(
            "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold",
            selected
              ? "bg-white/20 text-white"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
          )}>
            {org[0]?.toUpperCase() || "?"}
          </div>
          <span className={cn(
            "text-[9px] font-medium truncate max-w-[90px]",
            selected ? "text-violet-100" : "text-slate-600",
          )}>
            {org}
          </span>
        </div>
      </td>

      {/* CONTACT availability dots */}
      <td className="px-3 py-2 w-[88px]">
        <div className="flex items-center gap-2">
          <AvailDot
            ok={c.has_email}
            revealed={emailRevealed}
            Icon={Mail}
            tooltip={emailRevealed ? "Email revealed" : c.has_email ? "Email available (not revealed)" : "No email"}
            selected={selected}
          />
          <AvailDot
            ok={c.has_direct_phone}
            revealed={phoneRevealed}
            Icon={Phone}
            tooltip={phoneRevealed ? "Phone revealed" : c.has_direct_phone === "Yes" ? "Phone available (not revealed)" : "No phone"}
            selected={selected}
          />
          <AvailDot
            ok={hasLoc}
            revealed={false}
            Icon={MapPin}
            tooltip="Location on file"
            selected={selected}
          />
          <AvailDot
            ok={!!c.organization?.name}
            revealed={false}
            Icon={Briefcase}
            tooltip="Organisation data"
            selected={selected}
          />
        </div>
      </td>
    </tr>
  );
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <tr className="border-b border-slate-100">
    <td className="pl-3 pr-1.5 py-2">
      <div className="h-3 w-3 rounded bg-slate-100 animate-pulse" />
    </td>
    <td className="pl-2 pr-3 py-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-violet-100 animate-pulse flex-shrink-0" />
        <div className="space-y-1 flex-1">
          <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse" />
          <div className="h-2 w-14 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </td>
    <td className="px-3 py-2">
      <div className="h-2.5 w-36 bg-slate-100 rounded animate-pulse" />
    </td>
    <td className="px-3 py-2">
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-5 rounded bg-violet-50 animate-pulse" />
        <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
    </td>
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
interface CandidateTableProps {
  people:          ApolloCandidate[];
  loading?:        boolean;
  selectedId:      string | null;
  checkedIds:      Set<string>;
  crossCheckMap?:  Map<string, CrossCheckResult>;
  revealHistoryMap?: Map<string, RevealHistory>;
  onSelectRow:     (c: ApolloCandidate | null) => void;
  onCheckRow:      (id: string, v: boolean) => void;
  onCheckAll:      (v: boolean) => void;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({
  people, loading, selectedId, checkedIds,
  crossCheckMap   = new Map(),
  revealHistoryMap = new Map(),
  onSelectRow, onCheckRow, onCheckAll,
}) => {
  const allChecked = people.length > 0 && people.every(p => checkedIds.has(p.id));

  const TH: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <th className={cn(
      "py-2 text-[9px] font-semibold uppercase tracking-wider",
      "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent",
      cls,
    )}>
      {children}
    </th>
  );

  return (
    <div className="overflow-x-auto relative">
      {/* Single gradient def — referenced by all AvailDots in this render */}
      <GradientDef />

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-violet-100 bg-violet-50/40 sticky top-0 z-10">
            <th className="pl-3 pr-1.5 py-2 w-8">
              <Checkbox
                checked={allChecked}
                onCheckedChange={onCheckAll}
                className="h-3 w-3"
              />
            </th>
            <TH cls="pl-2 pr-3">Candidate</TH>
            <TH cls="px-3">Current Role</TH>
            <TH cls="px-3">Company</TH>
            <TH cls="px-3 w-[88px]">Contact</TH>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
            : people.map(c => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  selected={selectedId === c.id}
                  checked={checkedIds.has(c.id)}
                  crossCheck={crossCheckMap.get(c.id)}
                  revealHistory={revealHistoryMap.get(c.id)}
                  onRowClick={() => onSelectRow(selectedId === c.id ? null : c)}
                  onCheckChange={v => onCheckRow(c.id, v)}
                />
              ))
          }
        </tbody>
      </table>

      {!loading && people.length === 0 && (
        <div className="py-16 text-center text-slate-400 text-xs">
          No results to display
        </div>
      )}
    </div>
  );
};