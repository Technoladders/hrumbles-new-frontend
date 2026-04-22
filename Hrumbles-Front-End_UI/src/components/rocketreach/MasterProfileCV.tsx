/**
 * MasterProfileCV.tsx — v2
 *
 * Compact, professional redesign:
 * - Narrower modal (max-w-3xl instead of 5xl) for better readability
 * - Dense header with avatar, name, title, tags in one block
 * - Two-column layout: left sidebar (contact/skills/education) + right main (experience)
 * - Tighter spacing throughout — more like a real CV, less like a landing page
 * - Matching Hrumbles violet/slate palette
 * - Click isolation: modal click stops propagation to prevent row opening detail panel
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Linkedin, MapPin, Calendar, Award, Users,
  BookOpen, Code, Languages as LangIcon, Mail, Phone,
  Building2, GraduationCap, Briefcase, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MasterProfileCVProps {
  linkedinUrl: string;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseJson = (field: any): any[] => {
  if (!field) return [];
  if (typeof field === "string") { try { return JSON.parse(field); } catch { return []; } }
  return Array.isArray(field) ? field : [];
};

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-violet-500">{icon}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-slate-100 my-4" />;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-200 rounded w-36" />
          <div className="h-3 bg-slate-200 rounded w-28" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
      </div>
      <div className="space-y-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export const MasterProfileCV: React.FC<MasterProfileCVProps> = ({ linkedinUrl, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!linkedinUrl) return;
    setLoading(true);
    supabase.from("master_contactout_profiles").select("*").eq("linkedin_url", linkedinUrl).single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) setProfile(data);
        setLoading(false);
      });
  }, [linkedinUrl]);

  // Stop all click propagation so row/detail-panel doesn't react
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={stopProp}
      >
        {loading ? (
          <Skeleton />
        ) : error || !profile ? (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm mb-3">Failed to load profile</p>
            <button onClick={onClose} className="text-violet-600 text-sm hover:underline">Close</button>
          </div>
        ) : (
          <ProfileContent profile={profile} onClose={onClose} />
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

// ── Profile content (split out to keep main component clean) ─────────────────
const ProfileContent: React.FC<{ profile: any; onClose: () => void }> = ({ profile, onClose }) => {
  const company        = typeof profile.company === "string" ? JSON.parse(profile.company || "{}") : (profile.company || {});
  const experience     = parseJson(profile.experience);
  const education      = parseJson(profile.education);
  const certifications = parseJson(profile.certifications);
  const skills         = parseJson(profile.skills);
  const languages      = parseJson(profile.languages);
  const projects       = parseJson(profile.projects);
  const publications   = parseJson(profile.publications);

  // Date formatter
  const fmtDate = (year?: number|string, month?: number|string): string => {
    if (!year) return "";
    if (month) return `${String(month).padStart(2,"0")}/${year}`;
    return String(year);
  };

  const fmtRange = (startYear?: any, startMonth?: any, endYear?: any, endMonth?: any, isCurrent?: boolean): string => {
    const start = startYear ? `${fmtDate(startYear, startMonth)}` : "?";
    const end   = isCurrent ? "Present" : endYear ? fmtDate(endYear, endMonth) : "?";
    return `${start} – ${end}`;
  };

  return (
    <>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-gradient-to-br from-violet-700 to-indigo-700 px-6 py-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <img
            src={profile.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || "?")}&size=120&background=7c3aed&color=fff`}
            alt={profile.full_name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg flex-shrink-0"
          />

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[18px] font-bold text-white leading-tight">{profile.full_name}</h1>
                <p className="text-[13px] text-white/85 mt-0.5 leading-tight">{profile.title}</p>
                {profile.headline && profile.headline !== profile.title && (
                  <p className="text-[11px] text-white/65 mt-1 line-clamp-1">{profile.headline}</p>
                )}
              </div>
              <button onClick={onClose} className="flex-shrink-0 text-white/60 hover:text-white transition-colors mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Tags row */}
            <div className="flex items-center flex-wrap gap-2 mt-2.5">
              {profile.location && (
                <span className="flex items-center gap-1 text-[10px] text-white/70">
                  <MapPin size={10} />{profile.location}
                </span>
              )}
              {profile.seniority && (
                <span className="text-[10px] bg-white/15 text-white/90 px-2 py-0.5 rounded-full capitalize">{profile.seniority}</span>
              )}
              {profile.job_function && (
                <span className="text-[10px] bg-white/15 text-white/90 px-2 py-0.5 rounded-full">{profile.job_function}</span>
              )}
              {profile.work_status === "open_to_work" && (
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">Open to Work</span>
              )}
              {profile.followers > 0 && (
                <span className="text-[10px] text-white/60 flex items-center gap-1">
                  <Users size={10} />{profile.followers.toLocaleString()}
                </span>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                  className="text-[10px] text-white/70 hover:text-white flex items-center gap-1 transition-colors">
                  <Linkedin size={10} />LinkedIn ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY (scrollable) ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex divide-x divide-slate-100">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="w-[220px] flex-shrink-0 p-5 space-y-5 bg-slate-50/60">

            {/* Current company */}
            {company?.name && (
              <Section title="Company" icon={<Building2 size={12} />}>
                <div className="flex items-center gap-2">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="" className="w-7 h-7 rounded-lg border border-slate-200 object-contain p-0.5 bg-white" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0">{company.name?.[0]}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-800 truncate">{company.name}</p>
                    {company.industry && <p className="text-[10px] text-slate-500 truncate">{company.industry}</p>}
                  </div>
                </div>
                {company.size && <p className="text-[10px] text-slate-400 mt-1.5">{company.size.toLocaleString()}+ employees</p>}
              </Section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <>
                <Divider />
                <Section title={`Skills (${skills.length})`} icon={<Star size={12} />}>
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 18).map((s: string, i: number) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-medium">{s}</span>
                    ))}
                    {skills.length > 18 && <span className="text-[9px] text-slate-400">+{skills.length - 18} more</span>}
                  </div>
                </Section>
              </>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <>
                <Divider />
                <Section title="Languages" icon={<LangIcon size={12} />}>
                  <div className="space-y-1">
                    {languages.map((lang: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-700">{lang.name}</span>
                        {lang.proficiency && <span className="text-[9px] text-slate-400">{lang.proficiency.split(" ")[0]}</span>}
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Education */}
            {education.length > 0 && (
              <>
                <Divider />
                <Section title="Education" icon={<GraduationCap size={12} />}>
                  <div className="space-y-3">
                    {education.map((edu: any, i: number) => (
                      <div key={i}>
                        <p className="text-[11px] font-semibold text-slate-800 leading-tight">{edu.school_name}</p>
                        {(edu.degree || edu.field_of_study) && (
                          <p className="text-[10px] text-slate-600 mt-0.5">{[edu.degree, edu.field_of_study].filter(Boolean).join(" · ")}</p>
                        )}
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {fmtRange(edu.start_date_year, null, edu.end_date_year)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* ── RIGHT MAIN ───────────────────────────────────────────────── */}
          <div className="flex-1 p-5 space-y-5 min-w-0">

            {/* Summary */}
            {profile.summary && (
              <Section title="About" icon={<Users size={12} />}>
                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4">{profile.summary}</p>
              </Section>
            )}

            {/* Experience */}
            {experience.length > 0 && (
              <>
                {profile.summary && <Divider />}
                <Section title={`Experience (${experience.length})`} icon={<Briefcase size={12} />}>
                  <div className="space-y-4">
                    {experience.map((exp: any, i: number) => (
                      <div key={i} className={cn("flex gap-3", i > 0 && "pt-4 border-t border-slate-100")}>
                        {/* Logo */}
                        <div className="flex-shrink-0 mt-0.5">
                          {exp.logo_url ? (
                            <img src={exp.logo_url} alt="" className="w-8 h-8 rounded-lg border border-slate-200 bg-white object-contain p-1 shadow-sm"
                              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-[12px] font-bold text-slate-400">
                              {exp.company_name?.[0] || "?"}
                            </div>
                          )}
                        </div>
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate">{exp.title}</p>
                            {exp.is_current && (
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">NOW</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{exp.company_name}</p>
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                            <Calendar size={8} />
                            {fmtRange(exp.start_date_year, exp.start_date_month, exp.end_date_year, exp.end_date_month, exp.is_current)}
                            {exp.locality && <span>· {exp.locality}</span>}
                          </div>
                          {exp.summary && (
                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{exp.summary}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <>
                <Divider />
                <Section title={`Certifications (${certifications.length})`} icon={<Award size={12} />}>
                  <div className="grid grid-cols-1 gap-2">
                    {certifications.map((cert: any, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 bg-amber-50/60 border border-amber-100 rounded-xl p-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Award size={12} className="text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-slate-800 leading-tight">{cert.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-amber-700 font-medium">{cert.authority}</span>
                            {cert.start_date_year && (
                              <span className="text-[9px] text-slate-400">· {cert.start_date_year}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <>
                <Divider />
                <Section title="Projects" icon={<Code size={12} />}>
                  <div className="space-y-3">
                    {projects.map((proj: any, i: number) => (
                      <div key={i} className="border border-slate-100 rounded-xl p-3">
                        <p className="text-[12px] font-semibold text-slate-800">{proj.title}</p>
                        {proj.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{proj.description}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Publications */}
            {publications.length > 0 && (
              <>
                <Divider />
                <Section title="Publications" icon={<BookOpen size={12} />}>
                  <div className="space-y-3">
                    {publications.map((pub: any, i: number) => (
                      <div key={i} className="border border-slate-100 rounded-xl p-3">
                        <p className="text-[12px] font-semibold text-slate-800">{pub.title}</p>
                        {pub.publisher && <p className="text-[10px] text-slate-500 mt-0.5">{pub.publisher}</p>}
                        {pub.description && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pub.description}</p>}
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-slate-100 px-5 py-2.5 flex items-center justify-between bg-slate-50/50">
        <span className="text-[9px] text-slate-400">
          Last updated {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
        <button onClick={onClose} className="text-[10px] text-violet-600 hover:text-violet-700 font-semibold transition-colors">
          Close ×
        </button>
      </div>
    </>
  );
};

export default MasterProfileCV;