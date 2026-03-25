/**
 * EnrichedProfileSection.tsx
 *
 * Renders the rich profile data returned by useEnrichmentData.
 * Used inside both DetailPanelV2 (search panel) and SavedCandidateDetailPanel.
 *
 * Sections:
 *  - Social links (LinkedIn, Twitter, GitHub)
 *  - Seniority / Department / Function
 *  - Career timeline (employment history)
 *  - Current organisation (industry, headcount, funding, tech stack)
 */

import React, { useState } from "react";
import {
  Linkedin, Twitter, Github, ExternalLink,
  Briefcase, Building2, Globe, Users,
  ChevronDown, ChevronUp, MapPin, TrendingUp,
  DollarSign, Calendar, Code2, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnrichmentData, EmploymentEntry } from "../hooks/useEnrichmentData";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">{children}</p>
);

const fmtYear = (d: string | null) => {
  if (!d) return null;
  try { return new Date(d).getFullYear(); } catch { return null; }
};

const fmtDateRange = (start: string | null, end: string | null, isCurrent: boolean) => {
  const s = fmtYear(start);
  if (isCurrent) return s ? `${s} – Present` : "Present";
  const e = fmtYear(end);
  if (s && e && s !== e) return `${s} – ${e}`;
  if (s) return `${s}`;
  return null;
};

const fmt000 = (n: number | null) => {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(0)}K`;
  return String(n);
};

// ─── Social link pill ─────────────────────────────────────────────────────────
const SocialLink: React.FC<{
  href:    string;
  icon:    React.ElementType;
  label:   string;
  color:   string;
}> = ({ href, icon: Icon, label, color }) => {
  const clean = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a href={clean} target="_blank" rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
        "hover:opacity-80 hover:shadow-sm",
        color
      )}>
      <Icon size={11} />
      {label}
      <ExternalLink size={9} className="opacity-50" />
    </a>
  );
};

// ─── Employment row ───────────────────────────────────────────────────────────
const EmploymentRow: React.FC<{ entry: EmploymentEntry; isFirst: boolean }> = ({ entry, isFirst }) => {
  const dateRange = fmtDateRange(entry.startDate, entry.endDate, entry.isCurrent);
  return (
    <div className="flex gap-2.5">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          entry.isCurrent ? "bg-violet-500" : "bg-slate-300"
        )} />
        {!isFirst && <div className="w-px flex-1 bg-slate-100 mt-1" style={{ minHeight: "16px" }} />}
      </div>
      {/* Content */}
      <div className="pb-3 min-w-0">
        <p className={cn(
          "text-[11px] font-semibold leading-tight",
          entry.isCurrent ? "text-slate-800" : "text-slate-600"
        )}>
          {entry.title || "—"}
          {entry.isCurrent && (
            <span className="ml-1.5 text-[8px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-600">Now</span>
          )}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{entry.organizationName || "—"}</p>
        {dateRange && (
          <p className="text-[9px] text-slate-400 mt-0.5">{dateRange}</p>
        )}
      </div>
    </div>
  );
};

// ─── Tag pill ─────────────────────────────────────────────────────────────────
const Tag: React.FC<{ children: React.ReactNode; variant?: "violet" | "slate" | "blue" }> = ({
  children, variant = "slate"
}) => {
  const cls = {
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    slate:  "bg-slate-50  text-slate-600  border-slate-200",
    blue:   "bg-blue-50   text-blue-700   border-blue-200",
  }[variant];
  return (
    <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-semibold border", cls)}>
      {children}
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
interface EnrichedProfileSectionProps {
  data:            EnrichmentData;
  collapsedByDefault?: boolean;
}

export const EnrichedProfileSection: React.FC<EnrichedProfileSectionProps> = ({
  data, collapsedByDefault = false,
}) => {
  const [showAllHistory,   setShowAllHistory]   = useState(false);
  const [showAllTech,      setShowAllTech]      = useState(false);

  const visibleHistory = showAllHistory
    ? data.employmentHistory
    : data.employmentHistory.slice(0, 3);

  const visibleTech = showAllTech
    ? data.orgTechnologies
    : data.orgTechnologies.slice(0, 8);

  const hasSocial  = data.linkedinUrl || data.twitterUrl || data.githubUrl;
  const hasMeta    = data.seniority || data.departments.length > 0 || data.functions.length > 0;
  const hasHistory = data.employmentHistory.length > 0;
  const hasOrg     = data.orgName || data.orgIndustry || data.orgHeadcount;

  return (
    <div className="space-y-0">

      {/* SOCIAL LINKS */}
      {hasSocial && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Social Profiles</SHead>
          <div className="flex flex-wrap gap-1.5">
            {data.linkedinUrl && (
              <SocialLink href={data.linkedinUrl} icon={Linkedin} label="LinkedIn"
                color="bg-blue-50 text-blue-700 border-blue-200" />
            )}
            {data.twitterUrl && (
              <SocialLink href={data.twitterUrl} icon={Twitter} label="Twitter"
                color="bg-sky-50 text-sky-700 border-sky-200" />
            )}
            {data.githubUrl && (
              <SocialLink href={data.githubUrl} icon={Github} label="GitHub"
                color="bg-slate-100 text-slate-700 border-slate-200" />
            )}
          </div>
        </div>
      )}

      {/* SENIORITY / ROLE META */}
      {hasMeta && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Role & Seniority</SHead>
          <div className="flex flex-wrap gap-1">
            {data.seniority && (
              <Tag variant="violet">{data.seniority}</Tag>
            )}
            {data.departments.map(d => (
              <Tag key={d} variant="slate">{d.replace(/_/g, " ")}</Tag>
            ))}
            {data.subdepartments.filter(sd => !data.departments.includes(sd)).map(sd => (
              <Tag key={sd} variant="slate">{sd.replace(/_/g, " ")}</Tag>
            ))}
            {data.functions.map(f => (
              <Tag key={f} variant="blue">{f.replace(/_/g, " ")}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* LOCATION */}
      {(data.city || data.country) && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Location</SHead>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <MapPin size={11} className="text-violet-400 flex-shrink-0" />
            {[data.city, data.state, data.country].filter(Boolean).join(", ")}
          </div>
          {data.headline && (
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed italic">"{data.headline}"</p>
          )}
        </div>
      )}

      {/* CAREER HISTORY */}
      {hasHistory && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Career History</SHead>
          <div className="space-y-0">
            {visibleHistory.map((e, i) => (
              <EmploymentRow key={e.id} entry={e} isFirst={i === visibleHistory.length - 1} />
            ))}
          </div>
          {data.employmentHistory.length > 3 && (
            <button
              onClick={() => setShowAllHistory(v => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1 transition-colors"
            >
              {showAllHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {showAllHistory
                ? "Show less"
                : `Show ${data.employmentHistory.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* CURRENT ORGANISATION */}
      {hasOrg && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Current Organisation</SHead>

          {/* Org header */}
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0 shadow-sm">
              {data.orgName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800">{data.orgName}</p>
              {data.orgIndustry && (
                <p className="text-[10px] text-slate-500 capitalize">{data.orgIndustry}</p>
              )}
            </div>
          </div>

          {/* Org meta grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {data.orgHeadcount && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <Users size={10} className="text-violet-400 flex-shrink-0" />
                {fmt000(data.orgHeadcount)} employees
              </div>
            )}
            {data.orgFounded && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <Calendar size={10} className="text-violet-400 flex-shrink-0" />
                Founded {data.orgFounded}
              </div>
            )}
            {data.orgAnnualRevenue && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <DollarSign size={10} className="text-violet-400 flex-shrink-0" />
                Revenue {data.orgAnnualRevenue}
              </div>
            )}
            {data.orgTotalFunding && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <TrendingUp size={10} className="text-violet-400 flex-shrink-0" />
                Raised {data.orgTotalFunding}
              </div>
            )}
            {data.orgCity && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <MapPin size={10} className="text-violet-400 flex-shrink-0" />
                {[data.orgCity, data.orgCountry].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex gap-1.5 mb-2">
            {data.orgWebsite && (
              <a href={data.orgWebsite} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 hover:text-violet-600 hover:border-violet-300 transition-colors">
                <Globe size={9} /> Website
              </a>
            )}
            {data.orgLinkedin && (
              <a href={data.orgLinkedin} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700 hover:opacity-80 transition-colors">
                <Linkedin size={9} /> LinkedIn
              </a>
            )}
          </div>

          {/* Description */}
          {data.orgDescription && (
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">
              {data.orgDescription}
            </p>
          )}
        </div>
      )}

      {/* TECH STACK */}
      {data.orgTechnologies.length > 0 && (
        <div className="px-4 py-3 border-b border-violet-100">
          <SHead>Company Tech Stack</SHead>
          <div className="flex flex-wrap gap-1">
            {visibleTech.map(t => (
              <span key={t}
                className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                {t}
              </span>
            ))}
          </div>
          {data.orgTechnologies.length > 8 && (
            <button
              onClick={() => setShowAllTech(v => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors"
            >
              {showAllTech ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {showAllTech
                ? "Show less"
                : `+${data.orgTechnologies.length - 8} more`}
            </button>
          )}
        </div>
      )}

    </div>
  );
};