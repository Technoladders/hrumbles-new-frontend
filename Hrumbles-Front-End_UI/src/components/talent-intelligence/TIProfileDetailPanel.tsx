// src/components/talent-intelligence/TIProfileDetailPanel.tsx
// ============================================================
// Right slide-over panel for a selected Talent Intelligence profile.
// Tabs: Overview | Experience | Education | Skills
// Contact reveal: calls edge function, persists back to master table
// ============================================================

import React, { useState, useEffect } from "react";
import {
  X, Linkedin, MapPin, Building2, Users, Briefcase,
  Mail, Phone, ChevronRight, GraduationCap, Star,
  Award, Globe, ExternalLink, Loader2, Eye, EyeOff,
  Clock, Zap,
} from "lucide-react";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { TIProfile, TIRevealedEmail, TIRevealedPhone } from "@/types/talentIntelligence";

// ── Helpers ───────────────────────────────────────────────────

function formatMonthYear(year: number, month: number): string {
  if (!year) return "";
  if (!month) return String(year);
  const d = new Date(year, month - 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatExperience(exp: any): string {
  const start = formatMonthYear(exp.start_date_year, exp.start_date_month);
  const end   = exp.is_current ? "Present" : formatMonthYear(exp.end_date_year, exp.end_date_month);
  return [start, end].filter(Boolean).join(" – ");
}

function companyLogo(exp: any) {
  if (exp.logo_url) {
    return (
      <img
        src={exp.logo_url}
        alt={exp.company_name}
        className="w-8 h-8 rounded object-contain border border-slate-100"
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
      <Building2 size={14} className="text-slate-400" />
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────

type Tab = "overview" | "experience" | "education" | "skills";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "experience", label: "Experience" },
  { id: "education",  label: "Education" },
  { id: "skills",     label: "Skills" },
];

// ── Contact reveal section ────────────────────────────────────

interface RevealSectionProps {
  profile: TIProfile;
  onRevealSuccess: (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}

function RevealSection({ profile, onRevealSuccess }: RevealSectionProps) {
  // ── Auth
  const organizationId: string | null = useSelector(
    (state: any) =>
      state.auth?.organizationId ??
      state.auth?.user?.organization_id ??
      state.organization?.id ??
      null
  );
  const userId: string | null = useSelector(
    (state: any) => state.auth?.user?.id ?? null
  );

  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [emailError,   setEmailError]   = useState<string | null>(null);
  const [phoneError,   setPhoneError]   = useState<string | null>(null);

  // Revealed state: seed from profile columns (free if already revealed)
  const [revealedEmails, setRevealedEmails] = useState<TIRevealedEmail[]>(
    profile.revealed_emails ?? []
  );
  const [revealedPhones, setRevealedPhones] = useState<TIRevealedPhone[]>(
    profile.revealed_phones ?? []
  );

  // Sync when profile changes (panel opened on different profile)
  useEffect(() => {
    setRevealedEmails(profile.revealed_emails ?? []);
    setRevealedPhones(profile.revealed_phones ?? []);
    setEmailError(null);
    setPhoneError(null);
  }, [profile.id]);

  const ca = profile.contact_availability;
  const canRevealEmail = ca?.personal_email || ca?.work_email;
  const canRevealPhone = ca?.phone;

  // Persist revealed data back to master_contactout_profiles
  const persistReveal = async (
    emails: TIRevealedEmail[],
    phones: TIRevealedPhone[]
  ) => {
    const updates: Record<string, any> = { revealed_at: new Date().toISOString() };
    if (emails.length > 0) updates.revealed_emails = emails;
    if (phones.length > 0) updates.revealed_phones = phones;

    await supabase
      .from("master_contactout_profiles")
      .update(updates)
      .eq("id", profile.id)
      .then(({ error }) => {
        if (error) console.error("[TIProfileDetailPanel] persist reveal error:", error);
      });
  };

  const doReveal = async (revealType: "email" | "phone") => {
    if (!organizationId) return;

    const setLoading = revealType === "email" ? setEmailLoading : setPhoneLoading;
    const setError   = revealType === "email" ? setEmailError   : setPhoneError;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("contactout-enrich", {
        body: {
          linkedinUrl:    profile.linkedin_url,
          revealType,
          organizationId,
          userId,
          // No contactId/candidateProfileId — TI context
        },
      });

      if (error || data?.error) {
        const msg = data?.message ?? data?.error ?? error?.message ?? "Reveal failed";
        if (data?.code === "INSUFFICIENT_CREDITS") {
          setError(`Insufficient credits. ${msg}`);
        } else {
          setError(msg);
        }
        return;
      }

      // Merge new reveals with existing (CO API returns empty arrays for the other type)
      const newEmails: TIRevealedEmail[] = data.allEmails ?? [];
      const newPhones: TIRevealedPhone[] = data.allPhones ?? [];

      const mergedEmails = revealType === "email"
        ? newEmails
        : revealedEmails; // preserve existing emails on phone reveal

      const mergedPhones = revealType === "phone"
        ? newPhones
        : revealedPhones; // preserve existing phones on email reveal

      setRevealedEmails(mergedEmails);
      setRevealedPhones(mergedPhones);
      onRevealSuccess(mergedEmails, mergedPhones);

      // Persist back to master table (fire-and-forget)
      persistReveal(mergedEmails, mergedPhones);

    } catch (err: any) {
      console.error("[TIProfileDetailPanel] reveal error:", err);
      setError(err?.message ?? "Reveal failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!canRevealEmail && !canRevealPhone) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <p className="text-xs text-slate-400">No contact information available for this profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Email */}
      {canRevealEmail && (
        <div className="p-3 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Email</span>
            </div>
            {revealedEmails.length === 0 && (
              <button
                onClick={() => doReveal("email")}
                disabled={emailLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors"
              >
                {emailLoading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Eye size={11} />
                )}
                {emailLoading ? "Revealing..." : "Reveal"}
              </button>
            )}
          </div>

          {revealedEmails.length > 0 ? (
            <div className="space-y-1.5">
              {revealedEmails.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <a
                    href={`mailto:${e.email}`}
                    className="text-sm text-violet-700 font-medium hover:underline"
                  >
                    {e.email}
                  </a>
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">
                    {e.type ?? (e.is_primary ? "primary" : "other")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {emailError ?? "Click Reveal to unlock email contact"}
            </p>
          )}
          {emailError && revealedEmails.length === 0 && (
            <p className="text-xs text-red-500 mt-1">{emailError}</p>
          )}
        </div>
      )}

      {/* Phone */}
      {canRevealPhone && (
        <div className="p-3 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Phone</span>
            </div>
            {revealedPhones.length === 0 && (
              <button
                onClick={() => doReveal("phone")}
                disabled={phoneLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-violet-300 text-violet-700 text-xs rounded-lg font-medium hover:bg-violet-50 disabled:opacity-60 transition-colors"
              >
                {phoneLoading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Eye size={11} />
                )}
                {phoneLoading ? "Revealing..." : "Reveal"}
              </button>
            )}
          </div>

          {revealedPhones.length > 0 ? (
            <div className="space-y-1.5">
              {revealedPhones.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <a
                    href={`tel:${p.number}`}
                    className="text-sm text-violet-700 font-medium hover:underline"
                  >
                    {p.number}
                  </a>
                  <div className="flex items-center gap-1">
                    {p.recommended && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        recommended
                      </span>
                    )}
                    {p.type && (
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded capitalize">
                        {p.type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {phoneError ?? "Click Reveal to unlock phone contact"}
            </p>
          )}
          {phoneError && revealedPhones.length === 0 && (
            <p className="text-xs text-red-500 mt-1">{phoneError}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────

function OverviewTab({ profile }: { profile: TIProfile }) {
  return (
    <div className="space-y-4">
      {profile.summary && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">About</h4>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-6">
            {profile.summary}
          </p>
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Briefcase size={13} />, label: "Function",  val: profile.job_function },
          { icon: <Star size={13} />,      label: "Seniority", val: profile.seniority },
          { icon: <Building2 size={13} />, label: "Industry",  val: profile.company_industry },
          { icon: <Users size={13} />,     label: "Company size",
            val: profile.company_size ? `${profile.company_size.toLocaleString()}+ employees` : null },
          { icon: <Globe size={13} />,     label: "Country",   val: profile.country },
          { icon: <Users size={13} />,     label: "Followers",
            val: profile.followers ? `${profile.followers.toLocaleString()}` : null },
        ]
          .filter(item => item.val)
          .map(({ icon, label, val }) => (
            <div key={label} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
              <div className="text-violet-500 mt-0.5 flex-shrink-0">{icon}</div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className="text-xs font-medium text-slate-700 leading-tight">{val}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Languages */}
      {profile.languages && profile.languages.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Languages</h4>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map(lang => (
              <span key={lang.name} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">
                {lang.name}
                {lang.proficiency && (
                  <span className="text-slate-400 ml-1">· {lang.proficiency.replace(/_/g, " ")}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExperienceTab({ profile }: { profile: TIProfile }) {
  const exp = profile.experience ?? [];
  if (exp.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No experience data available</p>;
  }
  return (
    <div className="space-y-4">
      {exp.map((e, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">{companyLogo(e)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{e.title}</p>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">{e.company_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatExperience(e)}</p>
            {e.locality && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {e.locality}
              </p>
            )}
            {e.summary && (
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                {e.summary}
              </p>
            )}
            {e.is_current && (
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                Current
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationTab({ profile }: { profile: TIProfile }) {
  const edu = profile.education ?? [];
  const certs = profile.certifications ?? [];

  if (edu.length === 0 && certs.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No education data available</p>;
  }

  return (
    <div className="space-y-5">
      {edu.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Education</h4>
          <div className="space-y-4">
            {edu.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{e.school_name}</p>
                  {e.degree && (
                    <p className="text-xs text-slate-600 mt-0.5">{e.degree}</p>
                  )}
                  {e.field_of_study && (
                    <p className="text-xs text-slate-500">{e.field_of_study}</p>
                  )}
                  {(e.start_date_year || e.end_date_year) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {e.start_date_year} {e.end_date_year ? `– ${e.end_date_year}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {certs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Certifications</h4>
          <div className="space-y-3">
            {certs.map((c, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Award size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{c.name}</p>
                  {c.authority && (
                    <p className="text-xs text-slate-500 mt-0.5">{c.authority}</p>
                  )}
                  {c.start_date_year && (
                    <p className="text-xs text-slate-400">{c.start_date_year}</p>
                  )}
                  {c.license && (
                    <p className="text-xs text-slate-400 font-mono">{c.license}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsTab({ profile }: { profile: TIProfile }) {
  const skills = profile.skills ?? [];
  if (skills.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No skills data available</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map(sk => (
        <span
          key={sk}
          className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs rounded-full font-medium"
        >
          {sk}
        </span>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────

interface TIProfileDetailPanelProps {
  profile: TIProfile | null;
  onClose: () => void;
  onProfileUpdate: (id: string, patch: Partial<TIProfile>) => void;
}

export function TIProfileDetailPanel({
  profile,
  onClose,
  onProfileUpdate,
}: TIProfileDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Reset tab when profile changes
  useEffect(() => {
    setActiveTab("overview");
  }, [profile?.id]);

  if (!profile) return null;

  const isOpenToWork = profile.work_status === "open_to_work";

  const currentExp = (profile.experience ?? []).find(e => e.is_current);

  const handleRevealSuccess = (
    emails: TIRevealedEmail[],
    phones: TIRevealedPhone[]
  ) => {
    onProfileUpdate(profile.id, {
      revealed_emails: emails,
      revealed_phones: phones,
      revealed_at:     new Date().toISOString(),
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] max-w-[92vw] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#0A66C2] hover:underline font-medium"
              >
                <Linkedin size={13} />
                View on LinkedIn
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile hero */}
        <div className="px-5 pt-4 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={profile.full_name ?? ""}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-xl font-bold">
                  {(profile.full_name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                </div>
              )}
              {isOpenToWork && (
                <div
                  title="Open to Work"
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                >
                  <Zap size={9} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {profile.full_name ?? "Unknown"}
              </h2>
              {profile.title && (
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">{profile.title}</p>
              )}
              {(currentExp?.company_name ?? profile.company_name) && (
                <p className="text-xs text-violet-700 font-medium mt-0.5">
                  @ {currentExp?.company_name ?? profile.company_name}
                </p>
              )}
              {profile.location && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin size={10} />
                  {profile.location}
                </p>
              )}
              {isOpenToWork && (
                <span className="mt-1 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Open to Work
                </span>
              )}
            </div>
          </div>

          {/* Discovered meta */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
            {profile.first_discovered_at && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Discovered {new Date(profile.first_discovered_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {profile.discovery_count && profile.discovery_count > 1 && (
              <span className="flex items-center gap-1">
                · Appeared in {profile.discovery_count} search{profile.discovery_count > 1 ? "es" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Contact reveal */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Contact Information
          </p>
          <RevealSection
            profile={profile}
            onRevealSuccess={handleRevealSuccess}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 flex-shrink-0 bg-white">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-violet-700 border-b-2 border-violet-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview"   && <OverviewTab   profile={profile} />}
          {activeTab === "experience" && <ExperienceTab profile={profile} />}
          {activeTab === "education"  && <EducationTab  profile={profile} />}
          {activeTab === "skills"     && <SkillsTab     profile={profile} />}
        </div>
      </div>
    </>
  );
}