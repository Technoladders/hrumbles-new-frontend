import React from "react";
import { Clock, X, Users, Briefcase, MapPin, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecentSearch } from "../../types";

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Quick-start role presets — realistic hiring scenarios ─────────────────
const ROLE_PRESETS = [
  {
    label: "Senior Engineer",
    icon:  Briefcase,
    hint:  "5+ yrs · Backend or Full-stack",
    filters: { title: "Senior Software Engineer", seniority: "senior" },
  },
  {
    label: "Product Manager",
    icon:  Users,
    hint:  "Mid to senior level",
    filters: { title: "Product Manager", seniority: "manager" },
  },
  {
    label: "Data Scientist",
    icon:  Briefcase,
    hint:  "ML / Analytics focus",
    filters: { title: "Data Scientist", seniority: "senior" },
  },
  {
    label: "DevOps Engineer",
    icon:  Briefcase,
    hint:  "Cloud & infra specialist",
    filters: { title: "DevOps Engineer", seniority: "senior" },
  },
  {
    label: "UX Designer",
    icon:  Users,
    hint:  "Product design · mid-level",
    filters: { title: "UX Designer", seniority: "entry" },
  },
  {
    label: "Engineering Manager",
    icon:  Users,
    hint:  "Team lead · director level",
    filters: { title: "Engineering Manager", seniority: "manager" },
  },
] as const;

// ── How-to steps ──────────────────────────────────────────────────────────
const HOW_TO = [
  { icon: Briefcase, color: "text-sky-500",    bg: "bg-sky-50",    label: "Set a job title",   desc: "Type or pick from your CRM suggestions" },
  { icon: Users,     color: "text-indigo-500", bg: "bg-indigo-50", label: "Choose seniority",  desc: "Filter by level — entry through C-suite" },
  { icon: MapPin,    color: "text-emerald-500",bg: "bg-emerald-50",label: "Add a location",    desc: "Country, state or city — or leave open" },
  { icon: Building2, color: "text-amber-500",  bg: "bg-amber-50",  label: "Narrow by company", desc: "Target candidates from specific orgs" },
];

interface IdleStateProps {
  recentSearches: RecentSearch[];
  onApplyRecent: (r: RecentSearch) => void;
  onRemoveRecent: (id: string) => void;
  onQuickSearch: (skills: string[]) => void;
}

export const IdleState: React.FC<IdleStateProps> = ({
  recentSearches, onApplyRecent, onRemoveRecent, onQuickSearch,
}) => (
  <div className="max-w-xl mx-auto px-6 py-8 space-y-8">

    {/* ── Header ── */}
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Users size={14} className="text-violet-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">Candidate Search</h2>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed pl-9">
        Search by job title, seniority, location, or company. Results show
        verified-email candidates only — use the filters on the left to begin.
      </p>
    </div>

    {/* ── How it works ── */}
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        How to search
      </p>
      <div className="grid grid-cols-2 gap-2">
        {HOW_TO.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 bg-white"
          >
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", step.bg)}>
              <step.icon size={12} className={step.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 leading-tight">{step.label}</p>
              <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ── Role presets ── */}
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">
        Common roles — click to pre-fill
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {ROLE_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => onQuickSearch([p.filters.title])}
            className={cn(
              "flex items-start gap-2 px-3 py-2 rounded-lg text-left",
              "bg-white border border-slate-200",
              "hover:border-violet-300 hover:bg-violet-50",
              "transition-all group",
            )}
          >
            <div className="w-5 h-5 rounded bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-violet-100 transition-colors">
              <p.icon size={10} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 group-hover:text-violet-700 leading-tight transition-colors">
                {p.label}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.hint}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* ── Recent searches ── */}
    {recentSearches.length > 0 && (
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Clock size={10} className="text-slate-400" />
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Recent searches
          </p>
        </div>
        <div className="space-y-1.5">
          {recentSearches.map(r => (
            <div
              key={r.id}
              className="group flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-violet-200 hover:bg-violet-50/30 cursor-pointer transition-all"
              onClick={() => onApplyRecent(r)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{r.summary}</span>
                  <span className="text-[9px] text-slate-400 flex-shrink-0 ml-auto font-mono">
                    {timeAgo(r.timestamp)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.chips.slice(0, 5).map((chip, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100"
                    >
                      {chip}
                    </span>
                  ))}
                  {r.chips.length > 5 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400">
                      +{r.chips.length - 5}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemoveRecent(r.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 text-slate-400 transition-all flex-shrink-0 mt-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ── Footer note ── */}
    <p className="text-[9px] text-slate-400 text-center leading-relaxed pb-2">
      All results include verified email · name &amp; company shown · contact via enrichment
    </p>
  </div>
);