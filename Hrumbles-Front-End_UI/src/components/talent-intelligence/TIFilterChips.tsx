// src/components/talent-intelligence/TIFilterChips.tsx  — v3
// Fixed: matches v3 TIFilters (removed seniority/jobFunction, added skillChips/titles/employers/edu)

import React from "react";
import { X } from "lucide-react";
import { TIFilters } from "@/types/talentIntelligence";

interface Props { filters: TIFilters; onChange: (f: TIFilters) => void; onReset: () => void; }

const REVEALED_LABELS: Record<string, string> = {
  email_revealed: "Email Revealed",
  phone_revealed: "Phone Revealed",
  not_revealed:   "Not Revealed",
};

const YEARS_LABELS: Record<string, string> = {
  "0_2": "0–2 yrs exp", "3_5": "3–5 yrs exp",
  "6_10": "6–10 yrs exp", "10": "10+ yrs exp",
};

export function TIFilterChips({ filters, onChange, onReset }: Props) {
  type Chip = { label: string; onRemove: () => void };
  const chips: Chip[] = [];
  const set = <K extends keyof TIFilters>(key: K, val: TIFilters[K]) =>
    onChange({ ...filters, [key]: val });

  if (filters.query)
    chips.push({ label: `"${filters.query}"`, onRemove: () => set("query", "") });
  if (filters.location)
    chips.push({ label: `📍 ${filters.location}`, onRemove: () => set("location", "") });
  if (filters.yearsExperience)
    chips.push({ label: YEARS_LABELS[filters.yearsExperience] ?? filters.yearsExperience, onRemove: () => set("yearsExperience", "") });

  // Skill chips
  const mustSkills    = (filters.skillChips ?? []).filter(c => c.mode === "must");
  const excludeSkills = (filters.skillChips ?? []).filter(c => c.mode === "exclude");
  mustSkills.forEach(c =>
    chips.push({ label: `Skill: ${c.label}`, onRemove: () => set("skillChips", filters.skillChips.filter(x => x.label !== c.label)) })
  );
  excludeSkills.forEach(c =>
    chips.push({ label: `Excl: ${c.label}`, onRemove: () => set("skillChips", filters.skillChips.filter(x => x.label !== c.label)) })
  );

  (filters.titles ?? []).forEach(t =>
    chips.push({ label: `Title: ${t}`, onRemove: () => set("titles", filters.titles.filter(x => x !== t)) })
  );
  (filters.currentEmployer ?? []).forEach(e =>
    chips.push({ label: `At: ${e}`, onRemove: () => set("currentEmployer", filters.currentEmployer.filter(x => x !== e)) })
  );
  (filters.previousEmployer ?? []).forEach(e =>
    chips.push({ label: `Was at: ${e}`, onRemove: () => set("previousEmployer", filters.previousEmployer.filter(x => x !== e)) })
  );
  (filters.previousTitle ?? []).forEach(t =>
    chips.push({ label: `Was: ${t}`, onRemove: () => set("previousTitle", filters.previousTitle.filter(x => x !== t)) })
  );
  (filters.industry ?? []).forEach(ind =>
    chips.push({ label: `Industry: ${ind}`, onRemove: () => set("industry", filters.industry.filter(x => x !== ind)) })
  );
  (filters.school ?? []).forEach(s =>
    chips.push({ label: `School: ${s}`, onRemove: () => set("school", filters.school.filter(x => x !== s)) })
  );
  (filters.degree ?? []).forEach(d =>
    chips.push({ label: `Degree: ${d}`, onRemove: () => set("degree", filters.degree.filter(x => x !== d)) })
  );

  if (filters.openToWork)  chips.push({ label: "Open to Work",  onRemove: () => set("openToWork", false) });
  if (filters.hasEmail)    chips.push({ label: "Has Email",     onRemove: () => set("hasEmail",   false) });
  if (filters.hasPhone)    chips.push({ label: "Has Phone",     onRemove: () => set("hasPhone",   false) });
  if (filters.revealedStatus !== "all")
    chips.push({ label: REVEALED_LABELS[filters.revealedStatus] ?? filters.revealedStatus, onRemove: () => set("revealedStatus", "all") });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-violet-50 border-b border-violet-100 flex-shrink-0">
      <span className="text-[10px] font-semibold text-violet-700 flex-shrink-0">Active:</span>
      {chips.map((chip, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-violet-200 rounded-full text-xs text-violet-700 font-medium shadow-sm">
          {chip.label}
          <button onClick={chip.onRemove} className="text-violet-400 hover:text-violet-700 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <button onClick={onReset} className="text-[11px] text-violet-500 hover:text-violet-700 underline ml-1 transition-colors">
        Clear all
      </button>
    </div>
  );
}