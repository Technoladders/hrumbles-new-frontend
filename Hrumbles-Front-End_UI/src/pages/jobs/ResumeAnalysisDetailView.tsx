// Hrumbles-Front-End_UI\src\pages\jobs\ResumeAnalysisDetailView.tsx
//
// CHANGES vs previous version:
// 1. [NEW] isSavedCandidate query — checks hr_job_candidates by candidateId AND
//    falls back to email match, so both old and new records are detected correctly.
// 2. [NEW] Sticky amber "NOT SAVED" banner with direct "Assign to Job Now" CTA —
//    shows only when candidate is not yet in hr_job_candidates. Turns green once saved.
// 3. [NEW] "Analysis Only" badge on the header name — visible even after scrolling
//    past the banner. Disappears once candidate is confirmed saved.
// 4. [NEW] handleProceedWithAssignment calls queryClient.invalidateQueries on the
//    saved-check key so the banner reactively clears after successful assignment.
// 5. useQueryClient added (was imported but unused in previous version).
// 6. All previous fixes retained: transformAnalysisToFormData reads
//    raw_ai_analysis.candidate_info, phone populated, section_wise_scoring
//    handles both array and object format.

import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Copy, Phone, Mail, Github, Linkedin,
  Briefcase, MapPin, Clock, TrendingUp, AlertTriangle, Star,
  ChevronDown, UserCheck, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { CandidateFormData } from "@/components/jobs/job/candidate/AddCandidateDrawer";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = "#6D28D9";
const ACCENT2 = "#7C3AED";
const CYAN    = "#0891B2";
const SUCCESS = "#059669";
const WARN    = "#D97706";
const DANGER  = "#DC2626";

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const safeArr = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const scoreColor = (s: number) => s >= 75 ? SUCCESS : s >= 50 ? WARN : DANGER;
const barColor   = (s: number) => s >= 8 ? "#10B981" : s >= 6 ? CYAN : s >= 4 ? "#F59E0B" : DANGER;

const barLabel = (s: number): { text: string; color: string; bg: string } => {
  if (s >= 9) return { text: "Strong",  color: SUCCESS, bg: "rgba(16,185,129,0.1)" };
  if (s >= 7) return { text: "Good",    color: CYAN,    bg: "rgba(8,145,178,0.1)"  };
  if (s >= 5) return { text: "Partial", color: WARN,    bg: "rgba(217,119,6,0.1)"  };
  if (s >= 3) return { text: "Gap",     color: DANGER,  bg: "rgba(220,38,38,0.1)"  };
  return        { text: "Missing", color: DANGER,  bg: "rgba(220,38,38,0.1)"  };
};

const recStyle = (r: string) => {
  const l = (r || "").toLowerCase();
  if (l.includes("strong_yes") || l.includes("yes") || l.includes("hire") || l.includes("recommend"))
    return { color: SUCCESS, bg: "rgba(5,150,105,0.06)", border: "rgba(5,150,105,0.2)", label: l.includes("strong") ? "STRONG YES" : "YES" };
  if (l.includes("no") || l.includes("reject"))
    return { color: DANGER, bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.2)", label: "NO" };
  return { color: WARN, bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.2)", label: "MAYBE" };
};

const initials = (n: string) => {
  const p = (n || "?").split(" ").filter(Boolean);
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : (p[0]?.[0] || "?").toUpperCase();
};

const parseFraction = (s: string | undefined) => {
  if (!s) return null;
  const m = String(s).match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { met: parseInt(m[1]), total: parseInt(m[2]) } : null;
};

// ─── transformAnalysisToFormData ──────────────────────────────────────────────
const transformAnalysisToFormData = (
  analysis: any,
  talentPoolCandidate?: { resume_path?: string },
): Partial<CandidateFormData> => {
  if (!analysis) { toast.error("Analysis data is missing."); return {}; }

  const info        = analysis.raw_ai_analysis?.candidate_info  || analysis.candidate_info  || {};
  const expAnalysis = analysis.raw_ai_analysis?.experience_analysis || analysis.experience_analysis || {};

  const fullName = info.name || analysis.candidate_name || "";
  const [firstName, ...lastParts] = fullName.split(" ");
  const lastName  = lastParts.join(" ");
  const expYears  = expAnalysis.total_years
    ?? (analysis.experience_years ? parseInt(analysis.experience_years, 10) : undefined);

  return {
    firstName:             firstName || "",
    lastName:              lastName  || "",
    email:                 info.email    || analysis.email        || "",
    phone:                 info.phone    || analysis.phone_number || "",
    currentLocation:       info.location || analysis.location     || "",
    preferredLocations:    [],
    totalExperience:       isNaN(expYears) ? undefined : expYears,
    totalExperienceMonths: 0,
    resume:                talentPoolCandidate?.resume_path || analysis.resume_url || null,
    skills:                safeArr(analysis.top_skills).map((skill: string) => ({
      name: skill, rating: 0, experienceYears: 0, experienceMonths: 0,
    })),
    linkedInId:    info.linkedin  || analysis.linkedin  || "",
    currentSalary: undefined,
    expectedSalary: undefined,
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const GaugeRing: React.FC<{ score: number; size?: number }> = ({ score, size = 72 }) => {
  const R = size * 0.42;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;
  const col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={size * 0.08} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke={col} strokeWidth={size * 0.08}
          strokeDasharray={C} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)", transition: "stroke-dashoffset 1.2s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: size * 0.24, fontWeight: 800, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.11, color: "#9CA3AF", fontWeight: 500 }}>/100</span>
      </div>
    </div>
  );
};

const InsightCard: React.FC<{
  accent: string; label: string; valueMain: string; valueSub?: string;
  desc: string; badge: string; badgeColor: string; badgeBg: string;
}> = ({ accent, label, valueMain, valueSub, desc, badge, badgeColor, badgeBg }) => (
  <div style={{
    background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE",
    padding: "12px 16px", position: "relative", overflow: "hidden",
    boxShadow: "0 1px 4px rgba(109,40,217,0.06)",
  }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, borderRadius: "10px 0 0 10px" }} />
    <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF", marginBottom: 6 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
      <span style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{valueMain}</span>
      {valueSub && <span style={{ fontFamily: "monospace", fontSize: 12, color: "#9CA3AF" }}>{valueSub}</span>}
    </div>
    <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>{desc}</div>
    <div style={{ display: "inline-flex", marginTop: 6, fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badgeBg, color: badgeColor }}>{badge}</div>
  </div>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; accent?: string }> = ({
  title, children, accent = ACCENT,
}) => (
  <div style={{
    background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE",
    boxShadow: "0 1px 4px rgba(109,40,217,0.06)", overflow: "hidden", marginBottom: 12,
  }}>
    <div style={{ padding: "10px 16px", borderBottom: "1px solid #F5F3FF", display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: accent }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#4B5563" }}>{title}</span>
    </div>
    <div style={{ padding: "12px 16px" }}>{children}</div>
  </div>
);

// ─── Saved Status Banner ──────────────────────────────────────────────────────
const SavedStatusBanner: React.FC<{
  isSaved: boolean | null;
  isLoading: boolean;
  onAssignClick: () => void;
}> = ({ isSaved, isLoading, onAssignClick }) => {
  if (isLoading || isSaved === null) return null;

  if (isSaved) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
        border: "1.5px solid #34D399", borderRadius: 8,
        padding: "8px 16px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 2px 8px rgba(52,211,153,0.12)",
      }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <UserCheck size={12} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46" }}>Candidate is already saved in a job pipeline</div>
          <div style={{ fontSize: 10, color: "#047857", marginTop: 1 }}>
            This candidate has been assigned and exists as an active candidate record.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
      border: "1.5px solid #F59E0B", borderRadius: 8,
      padding: "10px 16px", marginBottom: 12,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 10,
      position: "sticky", top: 8, zIndex: 50,
      boxShadow: "0 4px 16px rgba(245,158,11,0.15)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "#F59E0B", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          boxShadow: "0 0 0 0 rgba(245,158,11,0.4)",
          animation: "warnPulse 2s ease-in-out infinite",
        }}>
          <ShieldAlert size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>
            ⚠ This candidate has NOT been added to any job yet
          </div>
          <div style={{ fontSize: 10, color: "#B45309", marginTop: 2, lineHeight: 1.4 }}>
            You are viewing an <strong>AI analysis record only</strong> — not a saved candidate profile.
            Click <strong>"Assign to Job Now"</strong> to add them to a real job pipeline.
          </div>
        </div>
      </div>
      <button
        onClick={onAssignClick}
        style={{
          background: "linear-gradient(135deg, #D97706, #B45309)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "8px 16px", fontWeight: 700, fontSize: 11,
          cursor: "pointer", whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(217,119,6,0.35)",
          display: "flex", alignItems: "center", gap: 6,
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        <UserCheck size={13} />
        Assign to Job Now
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ResumeAnalysisDetailView = () => {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>();
  const navigate      = useNavigate();
  const location      = useLocation();
  const queryClient   = useQueryClient();

  const queryParams   = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const talentId      = queryParams.get("talentId");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId]         = useState<string | null>(null);
  const [openCombobox, setOpenCombobox]           = useState(false);
  const [copiedField, setCopiedField]             = useState<string | null>(null);

  const user = useSelector((state: any) => state.auth.user);

  // ── Fetch analysis record ─────────────────────────────────────────────────
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["resume-analysis", jobId, candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resume_analysis").select("*")
        .eq("job_id", jobId).eq("candidate_id", candidateId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!candidateId,
  });

  // ── Check if candidate exists in hr_job_candidates ─────────────────
  const { data: savedRecord, isLoading: isSavedLoading } = useQuery({
    queryKey: ["candidate-saved-check", candidateId, analysis?.email],
    queryFn: async () => {
      const { data: byId } = await supabase
        .from("hr_job_candidates")
        .select("id, job_id, name")
        .eq("id", candidateId)
        .maybeSingle();

      if (byId) return byId;

      const email = analysis?.raw_ai_analysis?.candidate_info?.email
        || analysis?.candidate_info?.email
        || analysis?.email;

      if (!email) return null;

      const { data: byEmail } = await supabase
        .from("hr_job_candidates")
        .select("id, job_id, name")
        .eq("email", email)
        .maybeSingle();

      return byEmail ?? null;
    },
    enabled: !!candidateId && !isLoading,
  });

  const isSavedCandidate: boolean | null = isSavedLoading ? null : !!savedRecord;

  // ── Fetch talent pool candidate ────────────────────────────────────────────
  const { data: talentPoolCandidate } = useQuery({
    queryKey: ["talentPoolCandidate", talentId],
    queryFn: async () => {
      if (!talentId) return null;
      const { data, error } = await supabase
        .from("hr_talent_pool").select("resume_path").eq("id", talentId).single();
      if (error) { if (error.code === "PGRST116") return null; throw error; }
      return data;
    },
    enabled: !!talentId,
  });

  // ── Fetch all jobs ──────────────────────────────────────────────────────
  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_jobs").select("id, title, job_id").order("title", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (analysis?.job_id && jobs?.length && !selectedJobId) {
      const match = jobs.find((j) => j.id === analysis.job_id);
      if (match) setSelectedJobId(match.id);
    }
  }, [analysis?.job_id, jobs, selectedJobId]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const currentJob = jobs?.find((j) => j.id === analysis?.job_id);
  const otherJobs  = jobs?.filter((j) => j.id !== analysis?.job_id) || [];

  const rawAI         = analysis?.raw_ai_analysis || {};
  const candidateInfo = rawAI.candidate_info  || analysis?.candidate_info  || {};
  const matchQuality  = rawAI.match_quality   || analysis?.match_quality   || {};
  const expAnalysis   = rawAI.experience_analysis || analysis?.experience_analysis || {};
  const reqCoverage   = rawAI.requirements_coverage || {};
  const resumeQuality = rawAI.resume_quality  || analysis?.resume_quality  || {};

  const score          = analysis?.overall_score ?? null;
  const recommendation = matchQuality?.hiring_recommendation || null;
  const confidence     = matchQuality?.confidence_level || null;
  const mqSummary      = matchQuality?.summary || analysis?.summary || "";
  const keyDiffs       = safeArr(matchQuality?.key_differentiators);
  const topSkills      = safeArr(analysis?.top_skills);
  const devGaps        = safeArr(analysis?.development_gaps);
  const missingAreas   = safeArr(analysis?.missing_or_weak_areas);
  const certs          = safeArr(analysis?.additional_certifications);
  const matchedSkills  = safeArr(analysis?.matched_skills);

  const sectionScoring = useMemo((): any[] => {
    const raw = analysis?.section_wise_scoring;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw);
  }, [analysis?.section_wise_scoring]);

  const rawCompanies    = safeArr(expAnalysis?.companies);
  const totalYears      = expAnalysis?.total_years    ?? null;
  const relevantYears   = expAnalysis?.relevant_years ?? null;
  const roleProgression = expAnalysis?.role_progression || "";

  const mustHave    = parseFraction(reqCoverage?.must_have_skills_met);
  const niceToHave  = parseFraction(reqCoverage?.nice_to_have_skills_met);
  const coveragePct = mustHave
    ? Math.round((mustHave.met / mustHave.total) * 100)
    : matchedSkills.length > 0
      ? Math.round((matchedSkills.filter((s: any) => s.matched === "yes").length / matchedSkills.length) * 100)
      : 0;
  const nicePct = niceToHave && niceToHave.total > 0
    ? Math.round((niceToHave.met / niceToHave.total) * 100)
    : null;

  const competencyDims = useMemo(() =>
    [...matchedSkills]
      .map((s) => ({ name: s.requirement || s.skill || "Unknown", score: Number(s.score) || 0, matched: s.matched }))
      .sort((a, b) => b.score - a.score),
    [matchedSkills],
  );

  const progressionChain = useMemo(() =>
    [...rawCompanies].reverse().map((c: any) => c.name || c.company_name).filter(Boolean),
    [rawCompanies],
  );

  const copyField = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // ── Assign handler ────────────────────────────────────────────────────────
  const handleProceedWithAssignment = () => {
    if (!selectedJobId) { toast.error("Please select a job."); return; }
    if (!analysis)      { toast.error("Analysis data missing."); return; }

    const formData = transformAnalysisToFormData(analysis, talentPoolCandidate);
    sessionStorage.setItem("aiCandidateForFinalize", JSON.stringify(formData));

    queryClient.invalidateQueries({ queryKey: ["candidate-saved-check", candidateId, analysis?.email] });

    setIsAssignModalOpen(false);
    toast.info("Redirecting to job page to finalize candidate details…");
    navigate(`/jobs/${selectedJobId}`);
  };

  // ── Loading / empty states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${ACCENT}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
        <AlertTriangle size={32} style={{ color: WARN }} />
        <p style={{ fontSize: 14, color: "#6B7280" }}>No analysis found for this candidate.</p>
      </div>
    );
  }

  const recS = recommendation ? recStyle(recommendation) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "12px 16px", background: "#FAF9FB", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes warnPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.45) }
          50%      { box-shadow: 0 0 0 6px rgba(245,158,11,0) }
        }
        .ra-fadein  { animation: fadeIn .3s ease both }
        .ra-dim-row { display:grid; grid-template-columns:150px 1fr 32px 56px; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid #F5F3FF }
        .ra-dim-row:last-child { border-bottom:none }
        .ra-career-item { position:relative; padding-left:28px; padding-bottom:16px }
        .ra-career-item:last-child { padding-bottom:0 }
        .ra-career-item::before { content:''; position:absolute; left:7px; top:8px; bottom:0; width:2px; background:linear-gradient(180deg,rgba(109,40,217,0.3),transparent) }
        .ra-career-item:last-child::before { display:none }
        .ra-dot { position:absolute; left:0; top:3px; width:16px; height:16px; border-radius:50%; border:2px solid #6D28D9; background:#fff; z-index:1 }
        .ra-dot.active { background:#6D28D9; box-shadow:0 0 0 3px rgba(109,40,217,0.12) }
        @media(max-width:768px) { .ra-dim-row { grid-template-columns:100px 1fr 28px 48px } }
      `}</style>

      {/* ── Back button ── */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: ACCENT, fontWeight: 600, fontSize: 12, marginBottom: 12 }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* ══ Saved-status banner ══════════════════════════════════ */}
      <SavedStatusBanner
        isSaved={isSavedCandidate}
        isLoading={isSavedLoading}
        onAssignClick={() => setIsAssignModalOpen(true)}
      />

      {/* ── Header card ── */}
      <div className="ra-fadein" style={{
        background: "#fff", borderRadius: 12,
        border: isSavedCandidate === false
          ? "1.5px solid #FCD34D"
          : "1px solid #EDE9FE",
        boxShadow: isSavedCandidate === false
          ? "0 2px 12px rgba(245,158,11,0.1)"
          : "0 2px 8px rgba(109,40,217,0.06)",
        marginBottom: 12, overflow: "hidden", position: "relative",
      }}>
        {/* Top gradient stripe */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: isSavedCandidate === false
            ? "linear-gradient(90deg, #F59E0B, #D97706)"
            : `linear-gradient(90deg, ${ACCENT}, ${CYAN})`,
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap" }}>

          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isSavedCandidate === false
              ? "linear-gradient(135deg, #F59E0B, #D97706)"
              : `linear-gradient(135deg, ${ACCENT}, ${CYAN})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
            boxShadow: isSavedCandidate === false
              ? "0 3px 10px rgba(245,158,11,0.25)"
              : "0 3px 10px rgba(109,40,217,0.2)",
          }}>
            {initials(analysis.candidate_name || "?")}
          </div>

          {/* Name + badges + contact */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1722", margin: 0, letterSpacing: "-0.01em" }}>
                {analysis.candidate_name || "Unknown Candidate"}
              </h1>

              {/* "Analysis Only" badge */}
              {isSavedCandidate === false && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const,
                  letterSpacing: "1px", padding: "3px 8px", borderRadius: 20,
                  background: "rgba(245,158,11,0.12)", color: "#D97706",
                  border: "1px solid rgba(245,158,11,0.35)",
                }}>
                  <ShieldAlert size={8} />
                  Analysis Only
                </span>
              )}

              {/* "Saved" badge */}
              {isSavedCandidate === true && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const,
                  letterSpacing: "1px", padding: "3px 8px", borderRadius: 20,
                  background: "rgba(5,150,105,0.1)", color: "#059669",
                  border: "1px solid rgba(5,150,105,0.25)",
                }}>
                  <UserCheck size={8} />
                  Saved Candidate
                </span>
              )}
            </div>

            {currentJob && (
              <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3 }}>
                Analysed for <strong style={{ color: ACCENT }}>{currentJob.title}</strong>
                {" · "}{new Date(analysis.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}

            {/* Contact row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", marginTop: 8 }}>
              {(candidateInfo.email || analysis.email) && (
                <button onClick={() => copyField(candidateInfo.email || analysis.email, "email")}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280", padding: 0 }}>
                  <Mail size={10} style={{ color: ACCENT }} />
                  {candidateInfo.email || analysis.email}
                  {copiedField === "email" ? <Check size={9} style={{ color: SUCCESS }} /> : <Copy size={9} />}
                </button>
              )}
              {(candidateInfo.phone || analysis.phone_number) && (
                <button onClick={() => copyField(candidateInfo.phone || analysis.phone_number, "phone")}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280", padding: 0 }}>
                  <Phone size={10} style={{ color: ACCENT }} />
                  {candidateInfo.phone || analysis.phone_number}
                  {copiedField === "phone" ? <Check size={9} style={{ color: SUCCESS }} /> : <Copy size={9} />}
                </button>
              )}
              {(candidateInfo.linkedin || analysis.linkedin) && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                  <Linkedin size={10} style={{ color: ACCENT }} />
                  {candidateInfo.linkedin || analysis.linkedin}
                </span>
              )}
              {(candidateInfo.github || analysis.github) && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B7280" }}>
                  <Github size={10} style={{ color: ACCENT }} />
                  {candidateInfo.github || analysis.github}
                </span>
              )}
            </div>
          </div>

          {/* Hiring decision badge */}
          {recS && (
            <div style={{
              background: recS.bg, border: `1.5px solid ${recS.border}`,
              borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 110,
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: recS.color, marginBottom: 3 }}>Decision</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: recS.color }}>⚖ {recS.label}</div>
              {confidence && <div style={{ fontSize: 9, color: recS.color, marginTop: 2, opacity: 0.8 }}>{confidence} confidence</div>}
            </div>
          )}

          {/* Score gauge */}
          {score !== null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <GaugeRing score={score} size={72} />
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF" }}>Match Score</span>
            </div>
          )}

          {/* Assign button */}
          <button
            onClick={() => setIsAssignModalOpen(true)}
            style={{
              background: isSavedCandidate === false
                ? "linear-gradient(135deg, #D97706, #B45309)"
                : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              color: "#fff", border: "none", borderRadius: 8, fontWeight: 700,
              fontSize: 11, padding: "8px 14px", cursor: "pointer",
              boxShadow: isSavedCandidate === false
                ? "0 2px 10px rgba(217,119,6,0.3)"
                : `0 2px 10px rgba(109,40,217,0.25)`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <UserCheck size={13} />
            {isSavedCandidate ? "Re-assign" : "Assign to Job"}
          </button>
        </div>

        {/* Info strip */}
        {(totalYears !== null || candidateInfo.location || analysis.location || resumeQuality?.parsing_confidence) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", borderTop: "1px solid #F5F3FF" }}>
            {[
              totalYears    !== null ? { label: "Total Exp.",      value: `${totalYears} years`,              icon: <Briefcase size={10} /> } : null,
              relevantYears !== null ? { label: "Relevant Exp.",   value: `${relevantYears} years`,           icon: <TrendingUp size={10} /> } : null,
              (candidateInfo.location || analysis.location) ? { label: "Location", value: candidateInfo.location || analysis.location, icon: <MapPin size={10} /> } : null,
            ].filter(Boolean).map((item: any, i: number) => (
              <div key={i} style={{ padding: "8px 12px", borderRight: "1px solid #F5F3FF", borderBottom: "1px solid #F5F3FF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#9CA3AF", marginBottom: 2 }}>
                  <span style={{ color: ACCENT }}>{item.icon}</span>{item.label}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1a1722" }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI summary ── */}
      {mqSummary && (
        <div className="ra-fadein" style={{
          background: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: 10,
          padding: "14px 18px", marginBottom: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
            <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: ACCENT }}>AI Validation Summary</span>
          </div>
          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: mqSummary.replace(/\*\*(.*?)\*\*/g, `<strong style="color:#1E1B4B;font-weight:700">$1</strong>`) }}
          />
        </div>
      )}

      {/* ── 4 Insight stat cards ── */}
      <div className="ra-fadein" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
        <InsightCard accent={SUCCESS} label="Must-Have Skills"
          valueMain={mustHave ? String(mustHave.met) : String(matchedSkills.filter((s: any) => s.matched === "yes").length)}
          valueSub={mustHave ? `/${mustHave.total}` : `/${matchedSkills.length}`}
          desc={mustHave && mustHave.total - mustHave.met > 0 ? `${mustHave.total - mustHave.met} critical requirement${mustHave.total - mustHave.met > 1 ? "s" : ""} unmet` : "All requirements met"}
          badge={`${coveragePct}% coverage`}
          badgeColor={coveragePct >= 70 ? SUCCESS : WARN}
          badgeBg={coveragePct >= 70 ? "rgba(5,150,105,0.08)" : "rgba(217,119,6,0.08)"}
        />
        <InsightCard accent={CYAN} label="Nice-to-Have Skills"
          valueMain={niceToHave ? String(niceToHave.met) : "—"}
          valueSub={niceToHave ? `/${niceToHave.total}` : ""}
          desc={nicePct !== null ? `${nicePct}% secondary coverage` : "Not specified separately"}
          badge={nicePct !== null ? (nicePct >= 50 ? "Acceptable" : "Below target") : "N/A"}
          badgeColor={CYAN} badgeBg="rgba(8,145,178,0.08)"
        />
        <InsightCard
          accent={totalYears !== null && totalYears < 3 ? DANGER : WARN}
          label="Experience"
          valueMain={totalYears !== null ? String(totalYears) : "—"}
          valueSub={totalYears !== null ? " yrs" : ""}
          desc={relevantYears !== null ? `${relevantYears} yrs directly relevant` : "No experience data"}
          badge={totalYears !== null ? (totalYears >= 5 ? "Meets Req." : "Below threshold") : "N/A"}
          badgeColor={totalYears !== null && totalYears >= 5 ? SUCCESS : WARN}
          badgeBg={totalYears !== null && totalYears >= 5 ? "rgba(5,150,105,0.08)" : "rgba(217,119,6,0.08)"}
        />
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "12px 16px", boxShadow: "0 1px 4px rgba(109,40,217,0.06)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: ACCENT, borderRadius: "10px 0 0 10px" }} />
          <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: "#9CA3AF", marginBottom: 6 }}>Role Progression</div>
          {progressionChain.length > 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: ACCENT, marginBottom: 3 }}>↑</div>
              <div style={{ fontSize: 10, color: "#6B7280", lineHeight: 1.5 }}>{progressionChain.join(" → ")}</div>
              <div style={{ display: "inline-flex", marginTop: 6, fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(109,40,217,0.07)", color: ACCENT }}>
                {roleProgression ? roleProgression.charAt(0).toUpperCase() + roleProgression.slice(1) : "Progressing"}
              </div>
            </>
          ) : <div style={{ fontSize: 11, color: "#9CA3AF" }}>No work history data</div>}
        </div>
      </div>

      {/* ── Key differentiators ── */}
      {keyDiffs.length > 0 && (
        <div className="ra-fadein" style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(109,40,217,0.06)" }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: ACCENT, whiteSpace: "nowrap" }}>✦ Key Differentiators</span>
          {keyDiffs.map((d: string, i: number) => (
            <span key={i} style={{ fontSize: 10, color: "#4B5563", padding: "3px 10px", borderRadius: 20, background: "rgba(109,40,217,0.06)", border: "1px solid rgba(109,40,217,0.12)" }}>{d}</span>
          ))}
        </div>
      )}

      {/* ── Top skills ── */}
      {topSkills.length > 0 && (
        <div className="ra-fadein" style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(109,40,217,0.06)" }}>
          <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1.2px", color: CYAN, whiteSpace: "nowrap" }}>Top Skills</span>
          {topSkills.map((s: any, i: number) => {
            const name = typeof s === "string" ? s : s?.name || "Skill";
            return (
              <span key={i} style={{ fontSize: 10, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.15)", color: CYAN }}>{name}</span>
            );
          })}
        </div>
      )}

      {/* ── Competency Dimensions + Career Progression ── */}
      {(competencyDims.length > 0 || rawCompanies.length > 0) && (
        <div className="ra-fadein" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {competencyDims.length > 0 && (
            <SectionCard title="Competency Dimension Scores">
              {competencyDims.map((dim, i) => {
                const pct = (dim.score / 10) * 100;
                const lb  = barLabel(dim.score);
                return (
                  <div className="ra-dim-row" key={i}>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dim.name}>{dim.name}</div>
                    <div style={{ height: 5, background: "#F5F3FF", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${barColor(dim.score)}, ${barColor(dim.score)}bb)`, borderRadius: 3, transition: "width 0.7s ease" }} />
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800, color: barColor(dim.score), textAlign: "right" }}>{Math.round(dim.score)}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, textAlign: "center", background: lb.bg, color: lb.color }}>{lb.text}</div>
                  </div>
                );
              })}
            </SectionCard>
          )}

          {rawCompanies.length > 0 && (
            <SectionCard title="Career Progression" accent={CYAN}>
              {rawCompanies.map((entry: any, i: number) => {
                const name = entry.name || entry.company_name || "Unknown";
                const desg = entry.designation || "";
                const dur  = entry.duration || entry.years || "";
                const rel  = entry.relevance_score ?? null;
                return (
                  <div className="ra-career-item" key={i}>
                    <div className={`ra-dot ${i === 0 ? "active" : ""}`} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1722" }}>{name}</div>
                    {desg && <div style={{ fontSize: 10, color: ACCENT, fontWeight: 500, marginTop: 1 }}>{desg}</div>}
                    {dur  && <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 2, display: "flex", alignItems: "center", gap: 2 }}><Clock size={8} />{dur}</div>}
                    {rel !== null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <div style={{ height: 3, width: 60, background: "#F5F3FF", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(rel / 10) * 100}%`, background: barColor(rel), borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 500 }}>{rel}/10 relevance</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Matched Skills table ── */}
      {matchedSkills.length > 0 && (
        <SectionCard title={`Matched Skills & Requirements (${matchedSkills.length})`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` }}>
                  {["Requirement", "Status", "Score", "Evidence"].map((h) => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase" as const, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchedSkills.map((skill: any, idx: number) => {
                  const statusColor = skill.matched === "yes" ? SUCCESS : skill.matched === "partial" ? WARN : "#9CA3AF";
                  const statusBg    = skill.matched === "yes" ? "rgba(5,150,105,0.08)" : skill.matched === "partial" ? "rgba(217,119,6,0.08)" : "rgba(156,163,175,0.08)";
                  const statusLabel = skill.matched === "yes" ? "✓ Yes" : skill.matched === "partial" ? "~ Partial" : "✗ No";
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAF9", borderBottom: "1px solid #F5F3FF" }}>
                      <td style={{ padding: "7px 10px", fontSize: 10, color: "#374151", fontWeight: 500 }}>{skill.requirement}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 6, background: statusBg, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {skill.score != null && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ height: 3, width: 40, background: "#F5F3FF", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(skill.score / 10) * 100}%`, background: barColor(skill.score), borderRadius: 2 }} />
                            </div>
                            <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: barColor(skill.score) }}>{skill.score}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "7px 10px", fontSize: 10, color: "#6B7280", maxWidth: 250 }}>
                        {skill.evidence || skill.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Section-wise scoring ── */}
      {sectionScoring.length > 0 && (
        <SectionCard title="Section-wise Scoring Breakdown">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` }}>
                  {["Section", "Wt %", "Submenu", "Wt %", "Score", "Remarks"].map((h) => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sectionScoring.flatMap((section: any, si: number) => {
                  const subs = safeArr(section.submenus);
                  if (subs.length === 0) return [];
                  return subs.map((sub: any, subIdx: number) => (
                    <tr key={`${si}-${subIdx}`} style={{ background: si % 2 === 0 ? "#fff" : "#FAFAF9", borderBottom: "1px solid #F5F3FF" }}>
                      {subIdx === 0 && (
                        <td rowSpan={subs.length} style={{ padding: "7px 10px", fontSize: 10, fontWeight: 700, color: ACCENT, verticalAlign: "top", borderRight: "1px solid #F5F3FF" }}>
                          {section.section || section.name || "Section"}
                        </td>
                      )}
                      {subIdx === 0 && (
                        <td rowSpan={subs.length} style={{ padding: "7px 10px", fontSize: 9, fontWeight: 600, color: "#6B7280", verticalAlign: "top", borderRight: "1px solid #F5F3FF" }}>
                          {section.weightage}%
                        </td>
                      )}
                      <td style={{ padding: "7px 10px", fontSize: 10, color: "#374151" }}>{sub.submenu}</td>
                      <td style={{ padding: "7px 10px", fontSize: 9, color: "#9CA3AF" }}>{sub.weightage}%</td>
                      <td style={{ padding: "7px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ height: 3, width: 32, background: "#F5F3FF", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(sub.score / 10) * 100}%`, background: barColor(sub.score), borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: barColor(sub.score) }}>{sub.score}/10</span>
                        </div>
                      </td>
                      <td style={{ padding: "7px 10px", fontSize: 10, color: "#6B7280" }}>{sub.remarks}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Gaps + Certifications ── */}
      {(missingAreas.length > 0 || devGaps.length > 0 || certs.length > 0) && (
        <div className="ra-fadein" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          {(missingAreas.length > 0 || devGaps.length > 0) && (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #FEE2E2", boxShadow: "0 1px 4px rgba(220,38,38,0.04)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #FEE2E2", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: DANGER }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: DANGER }}>Gaps & Missing Areas</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {[...missingAreas, ...devGaps].map((item: any, i: number) => {
                  const text = typeof item === "string" ? item : item?.name || item?.area || item?.gap || "Gap";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, paddingBottom: 8, borderBottom: "1px solid #FEF2F2", marginBottom: 8 }}>
                      <span style={{ color: DANGER, fontSize: 11, flexShrink: 0, marginTop: 1 }}>⚠</span>
                      <span style={{ fontSize: 10, color: "#374151" }}>{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {certs.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #EDE9FE", boxShadow: "0 1px 4px rgba(109,40,217,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #F5F3FF", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: SUCCESS }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", color: SUCCESS }}>Certifications</span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {certs.map((c: any, i: number) => {
                  const name = typeof c === "string" ? c : c?.name || c?.title || "Cert";
                  const icons = ["🏆", "📜", "🎓", "⭐", "🔰"];
                  return (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #D1FAE5", background: "rgba(5,150,105,0.04)", fontSize: 10, fontWeight: 500, color: "#065F46" }}>
                      {icons[i % icons.length]} {name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Job Modal ── */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle style={{ color: ACCENT }}>Assign Candidate to Job</DialogTitle>
          </DialogHeader>
          <div style={{ padding: "12px 0" }}>
            <Label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Select Job</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-full justify-between" disabled={isJobsLoading}>
                  {selectedJobId
                    ? `${jobs?.find((j) => j.id === selectedJobId)?.title} (${jobs?.find((j) => j.id === selectedJobId)?.job_id})`
                    : "Select a job…"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search by title or job ID…" />
                  <CommandList className="max-h-[220px] overflow-y-auto">
                    <CommandEmpty>No jobs found.</CommandEmpty>
                    {currentJob && (
                      <CommandGroup heading="Current Job">
                        <CommandItem value={`${currentJob.job_id} ${currentJob.title}`}
                          onSelect={() => { setSelectedJobId(currentJob.id); setOpenCombobox(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedJobId === currentJob.id ? "opacity-100" : "opacity-0")} />
                          {currentJob.title} ({currentJob.job_id}) — Current
                        </CommandItem>
                      </CommandGroup>
                    )}
                    <CommandGroup heading="Other Jobs">
                      {otherJobs.map((j) => (
                        <CommandItem key={j.id} value={`${j.id} ${j.title}`}
                          onSelect={() => { setSelectedJobId(j.id); setOpenCombobox(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedJobId === j.id ? "opacity-100" : "opacity-0")} />
                          {j.title} ({j.job_id})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAssignModalOpen(false); setOpenCombobox(false); }}>Cancel</Button>
            <Button onClick={handleProceedWithAssignment} disabled={!selectedJobId || isJobsLoading}
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: "#fff", border: "none" }}>
              Proceed to Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResumeAnalysisDetailView;