// src/components/talent-intelligence/TIFilterChips.tsx  — v2

import React from "react";
import { X } from "lucide-react";
import {
  TIFilters, SENIORITY_OPTIONS, JOB_FUNCTION_OPTIONS,
} from "@/types/talentIntelligence";

interface Props { filters: TIFilters; onChange: (f: TIFilters) => void; onReset: () => void; }

const REVEALED_LABELS: Record<string, string> = {
  email_revealed: "Email Revealed",
  phone_revealed: "Phone Revealed",
  not_revealed:   "Not Revealed",
};

export function TIFilterChips({ filters, onChange, onReset }: Props) {
  type Chip = { label: string; onRemove: () => void };
  const chips: Chip[] = [];
  const set = <K extends keyof TIFilters>(key: K, val: TIFilters[K]) => onChange({ ...filters, [key]: val });

  if (filters.query)    chips.push({ label: `"${filters.query}"`,             onRemove: () => set("query", "") });
  if (filters.location) chips.push({ label: `📍 ${filters.location}`,         onRemove: () => set("location", "") });
  if (filters.company)  chips.push({ label: `🏢 ${filters.company}`,          onRemove: () => set("company", "") });
  filters.seniority.forEach(s => {
    const lbl = SENIORITY_OPTIONS.find(o => o.value === s)?.label ?? s;
    chips.push({ label: `Level: ${lbl}`, onRemove: () => set("seniority", filters.seniority.filter(x => x !== s)) });
  });
  filters.jobFunction.forEach(jf => {
    const lbl = JOB_FUNCTION_OPTIONS.find(o => o.value === jf)?.label ?? jf;
    chips.push({ label: `Function: ${lbl}`, onRemove: () => set("jobFunction", filters.jobFunction.filter(x => x !== jf)) });
  });
  filters.industry.forEach(ind => chips.push({ label: `Industry: ${ind}`, onRemove: () => set("industry", filters.industry.filter(x => x !== ind)) }));
  filters.skills.forEach(sk => chips.push({ label: `Skill: ${sk}`,         onRemove: () => set("skills",   filters.skills.filter(x => x !== sk)) }));
  if (filters.openToWork)         chips.push({ label: "Open to Work",  onRemove: () => set("openToWork", false) });
  if (filters.hasEmail)           chips.push({ label: "Has Email",     onRemove: () => set("hasEmail",   false) });
  if (filters.hasPhone)           chips.push({ label: "Has Phone",     onRemove: () => set("hasPhone",   false) });
  if (filters.revealedStatus !== "all") chips.push({ label: REVEALED_LABELS[filters.revealedStatus] ?? filters.revealedStatus, onRemove: () => set("revealedStatus", "all") });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-violet-50 border-b border-violet-100 flex-shrink-0">
      <span className="text-[10px] font-semibold text-violet-700 flex-shrink-0">Active:</span>
      {chips.map((chip, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-violet-200 rounded-full text-xs text-violet-700 font-medium shadow-sm">
          {chip.label}
          <button onClick={chip.onRemove} className="text-violet-400 hover:text-violet-700 transition-colors"><X size={10} /></button>
        </span>
      ))}
      <button onClick={onReset} className="text-[11px] text-violet-500 hover:text-violet-700 underline ml-1 transition-colors">Clear all</button>
    </div>
  );
}