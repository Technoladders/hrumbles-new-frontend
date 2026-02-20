import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Existing hooks — reused as-is
import { useEmployeeProfile } from "@/components/MagicLinkView/hooks/useEmployeeProfile";
import { useShareEmployeeProfile } from "@/components/MagicLinkView/candidate-profile-v2/hooks/useShareEmployeeProfile";
import { useDocumentVerification } from "@/components/MagicLinkView/hooks/useDocumentVerification";
import { useWorkHistoryVerification } from "@/components/MagicLinkView/hooks/useWorkHistoryVerification";
import { useTimeline } from "@/components/MagicLinkView/hooks/useTimeline";
import { useShareLinkV2, DataSharingOptions } from "@/components/MagicLinkView/candidate-profile-v2/hooks/useShareLinkV2";
import { useUanLookup } from "@/components/MagicLinkView/hooks/useUanLookup";
import { useConsentLink } from "@/components/MagicLinkView/hooks/useConsentLink";

// Existing types
import { Candidate } from "@/components/MagicLinkView/types";

// New V2 sub-components
import { V2ProfileHeader } from "./components/V2ProfileHeader";
import { V2QuickStats } from "./components/V2QuickStats";
import { V2SkillsPanel } from "./components/V2SkillsPanel";
import { V2WorkTimeline } from "./components/V2WorkTimeline";
import { V2ResumeAnalysis } from "./components/V2ResumeAnalysis";
import { V2ActionBar } from "./components/V2ActionBar";
import { V2ShareDialog } from "./components/V2ShareDialog";
import { V2BgvDialog } from "./components/V2BgvDialog";
import { V2LoadingState } from "./components/V2LoadingState";
import { V2ErrorState } from "./components/V2ErrorState";
import { V2OverviewTab } from "./components/V2OverviewTab";
import { V2BgvResults } from "./components/V2BgvResults";

// ─── Helpers ───
const parseJsonArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeSkills = (skills: any[] | undefined): string[] => {
  if (!skills || !skills.length) return [];
  return skills.map((s) => (typeof s === "string" ? s : s?.name || "Unknown"));
};

const formatINR = (amount: number | string) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num)
    ? "N/A"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(num);
};

/* ─── Contact masking helpers ─── */
const maskEmail = (email: string) => {
  if (!email || email === "N/A") return "N/A";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length > 2 ? local[0] + "***" + local.slice(-1) : local[0] + "***";
  const domParts = domain.split(".");
  const maskedDomain = domParts[0].length > 2
    ? domParts[0][0] + "***" + "." + domParts.slice(1).join(".")
    : domParts.join(".");
  return maskedLocal + "@" + maskedDomain;
};

const maskPhone = (phone: string) => {
  if (!phone || phone === "N/A") return "N/A";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return phone.slice(0, phone.length - 4).replace(/\d/g, "*") + phone.slice(-4);
};

// ─── Props ───
interface CandidateProfileV2Props {
  shareMode?: boolean;
  shareId?: string;
  sharedDataOptions?: DataSharingOptions;
}

// ─── Main Component ───
const CandidateProfileV2: React.FC<CandidateProfileV2Props> = ({
  shareMode = false,
  shareId,
  sharedDataOptions: initialSharedDataOptions,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { candidateId, jobId } = useParams<{ candidateId: string; jobId: string }>();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // ─── Active view tab state ───
  const [activeView, setActiveView] = useState<string>("overview");
  const [bgvOpen, setBgvOpen] = useState(false);

  // ─── Data hooks ───
  // Both hooks are always called (React rules), but each is a no-op when not needed.
  // useShareEmployeeProfile: only fetches when shareId is provided (share mode)
  // useEmployeeProfile: only fetches when NOT in share mode (uses localStorage/auth)
  const shareProfileHook = useShareEmployeeProfile(
    shareMode ? shareId : undefined,
    shareMode ? initialSharedDataOptions : undefined
  );
  const authProfileHook = useEmployeeProfile(!shareMode);

  // Select the active hook based on mode
  const {
    candidate,
    documents,
    resumeAnalysis,
    loading,
    error,
    setDocuments,
    setCandidate,
  } = shareMode ? shareProfileHook : authProfileHook;

  // BGV results only available from share hook
  const bgvResults = shareMode ? shareProfileHook.bgvResults : {};

  const {
    documents: verifiedDocuments,
    handleDocumentChange,
    toggleEditing,
    toggleUANResults,
    verifyDocument,
    saveDocuments,
    isSavingDocuments,
  } = useDocumentVerification(documents, shareMode);

  const {
    workHistory,
    setWorkHistory,
    isVerifyingAll: isVerifyingAllWorkHistory,
    verifyAllCompanies,
    handleVerifySingleWorkHistory,
    updateWorkHistoryItem,
  } = useWorkHistoryVerification(candidate, organization_id);

  const { timeline, timelineLoading, timelineError } = useTimeline(candidateId, shareMode);

  const {
    isSharing,
    magicLink,
    isCopied,
    setShowDataSelection,
    showDataSelection,
    generateMagicLink,
    copyMagicLink,
    currentDataOptions,
    setCurrentDataOptions,
    sharePassword,
  } = useShareLinkV2(initialSharedDataOptions);

  const {
    isRequesting: isRequestingConsent,
    consentLink,
    isCopied: isConsentLinkCopied,
    generateConsentLink,
    copyConsentLink,
  } = useConsentLink();

  // ─── Talent Pool Skills ───
  const { data: talentPoolEntry } = useQuery({
    queryKey: ["talentPoolSkills", candidate?.email],
    queryFn: async () => {
      if (!candidate?.email) return null;
      const { data, error } = await supabase
        .from("hr_talent_pool")
        .select("*")
        .eq("email", candidate.email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!candidate?.email,
  });

  const talentTopSkills = useMemo(
    () => parseJsonArray(talentPoolEntry?.top_skills),
    [talentPoolEntry]
  );

  const { data: enrichedSkills, isLoading: isLoadingEnriched } = useQuery({
    queryKey: ["enrichedSkills", talentTopSkills],
    queryFn: async () => {
      if (!talentTopSkills || talentTopSkills.length === 0) return [];
      const { data, error } = await supabase.rpc("get_enriched_skills", {
        p_skill_names: talentTopSkills,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!talentTopSkills && talentTopSkills.length > 0,
  });

  const sortedGroupedSkills = useMemo(() => {
    if (!enrichedSkills || !talentTopSkills) return {};
    const enrichedSkillMap = new Map(
      enrichedSkills.map((skill: any) => [skill.skill_name.trim().toLowerCase(), skill])
    );
    const groups = talentTopSkills.reduce((acc: any, rawSkill: string) => {
      const skillKey = rawSkill.trim().toLowerCase();
      const enriched = enrichedSkillMap.get(skillKey);
      if (enriched) {
        const groupKey = `${enriched.category || "Other"}`;
        if (!acc[groupKey]) acc[groupKey] = [];
        if (!acc[groupKey].some((s: any) => s.name === enriched.normalized_name)) {
          acc[groupKey].push({
            name: enriched.normalized_name,
            description: enriched.description,
            relatedSkills: enriched.related_skills || [],
          });
        }
      } else {
        const groupKey = "Other Skills";
        if (!acc[groupKey]) acc[groupKey] = [];
        if (!acc[groupKey].some((s: any) => s.name === rawSkill)) {
          acc[groupKey].push({ name: rawSkill, description: "No description available.", relatedSkills: [] });
        }
      }
      return acc;
    }, {} as Record<string, { name: string; description: string; relatedSkills: string[] }[]>);

    const entries = Object.entries(groups);
    const otherEntry = entries.find(([key]) => key.startsWith("Other"));
    const sorted = entries.filter(([key]) => !key.startsWith("Other")).sort(([a], [b]) => a.localeCompare(b));
    if (otherEntry) sorted.push(otherEntry);
    return Object.fromEntries(sorted);
  }, [enrichedSkills, talentTopSkills]);

  // ─── UAN Save handler ───
  const handleSaveUanResult = useCallback(
    async (dataToSave: any) => {
      if (dataToSave.status !== 1) return;
      const uanNumber = dataToSave?.msg?.uan_details?.[0]?.uan || null;
      if (!uanNumber) return;

      const updatedMetadata = { ...candidate.metadata, uan: uanNumber };
      const { error: updateError } = await supabase
        .from("hr_job_candidates")
        .update({ metadata: updatedMetadata })
        .eq("id", candidate.id);

      if (updateError) {
        toast({ title: "Profile Update Failed", description: updateError.message, variant: "destructive" });
      }

      setCandidate((prev) => ({ ...prev, metadata: updatedMetadata }));
      setDocuments((prev) => ({ ...prev, uan: { ...prev.uan, value: uanNumber } }));
      toast({ title: "Success", description: `UAN ${uanNumber} updated.`, variant: "success" });
    },
    [candidate, setCandidate, setDocuments, toast]
  );

  const {
    isLoading: isUanLoading,
    uanData,
    lookupMethod,
    setLookupMethod,
    lookupValue,
    setLookupValue,
    handleLookup: onUanLookup,
    isQueued: isUanQueued,
  } = useUanLookup(candidate, organization_id, user?.id, handleSaveUanResult);

  // ─── Sync effects ───
  useEffect(() => {
    setDocuments(verifiedDocuments);
  }, [verifiedDocuments, setDocuments]);

  useEffect(() => {
    if (shareMode && initialSharedDataOptions) {
      setCurrentDataOptions(initialSharedDataOptions);
    }
  }, [shareMode, initialSharedDataOptions, setCurrentDataOptions]);

  // ─── Formatted employee object with share mode gating ───
  const employee = useMemo(() => {
    if (!candidate) return null;

    const base = {
      id: candidate.id || "emp001",
      name: candidate.name || "Unknown Candidate",
      role: candidate.metadata?.role || "N/A",
      department: candidate.metadata?.department || "N/A",
      joinDate: candidate.appliedDate || "N/A",
      status: candidate.status || "Applied",
      tags: candidate.metadata?.tags || [],
      profileImage: candidate.metadata?.profileImage || "",
      email: candidate.email || "N/A",
      phone: candidate.phone || "N/A",
      location: candidate.metadata?.currentLocation || "N/A",
      skills: normalizeSkills(candidate.skills || candidate.skill_ratings),
      skillRatings: candidate.skill_ratings || [],
      experience: candidate.experience || "N/A",
      relevantExpYears: candidate.metadata?.relevantExperience || "N/A",
      relevantExpMonths: candidate.metadata?.relevantExperienceMonths || "N/A",
      preferredLocation: Array.isArray(candidate.metadata?.preferredLocations)
        ? candidate.metadata.preferredLocations.join(", ")
        : "N/A",
      resume: candidate.resume || candidate.metadata?.resume_url || "#",
      currentSalary: candidate.currentSalary || candidate.metadata?.currentSalary || "N/A",
      expectedSalary: candidate.expectedSalary || candidate.metadata?.expectedSalary || "N/A",
      linkedInId: candidate.metadata?.linkedInId || "N/A",
      noticePeriod: candidate.metadata?.noticePeriod || "N/A",
      lastWorkingDay: candidate.metadata?.lastWorkingDay,
      hasOffers: candidate.metadata?.hasOffers || "N/A",
      offerDetails: candidate.metadata?.offerDetails || "N/A",
      consentStatus: candidate.consent_status || "not_requested",
      // Document fields from metadata (for documentsInfo gating)
      pan: candidate.metadata?.pan || "N/A",
      uan: candidate.metadata?.uan || "N/A",
      pf: candidate.metadata?.pf || "N/A",
      esicNumber: candidate.metadata?.esicNumber || "N/A",
    };

    if (shareMode) {
      const opts = currentDataOptions;
      const shouldMask = opts?.maskContact ?? false;

      return {
        ...base,
        // Contact info gating
        email: opts?.contactInfo && candidate.email
          ? (shouldMask ? maskEmail(candidate.email) : candidate.email) : "N/A",
        phone: opts?.contactInfo && candidate.phone
          ? (shouldMask ? maskPhone(candidate.phone) : candidate.phone) : "N/A",
        linkedInId: opts?.contactInfo && candidate.metadata?.linkedInId
          ? candidate.metadata.linkedInId : "N/A",
        // Personal info gating
        currentSalary: opts?.personalInfo && (candidate.currentSalary || candidate.metadata?.currentSalary)
          ? (candidate.currentSalary || candidate.metadata?.currentSalary) : "N/A",
        expectedSalary: opts?.personalInfo && (candidate.expectedSalary || candidate.metadata?.expectedSalary)
          ? (candidate.expectedSalary || candidate.metadata?.expectedSalary) : "N/A",
        noticePeriod: opts?.personalInfo && candidate.metadata?.noticePeriod
          ? candidate.metadata.noticePeriod : "N/A",
        lastWorkingDay: opts?.personalInfo ? candidate.metadata?.lastWorkingDay : undefined,
        hasOffers: opts?.personalInfo && candidate.metadata?.hasOffers
          ? candidate.metadata.hasOffers : "N/A",
        offerDetails: opts?.personalInfo && candidate.metadata?.offerDetails
          ? candidate.metadata.offerDetails : "N/A",
        // Resume attachment gating
        resume: opts?.resumeAttachment
          ? (candidate.resume || candidate.metadata?.resume_url || "#") : "#",
        // Document info gating
        pan: opts?.documentsInfo ? (candidate.metadata?.pan || "N/A") : "N/A",
        uan: opts?.documentsInfo ? (candidate.metadata?.uan || "N/A") : "N/A",
        pf: opts?.documentsInfo ? (candidate.metadata?.pf || "N/A") : "N/A",
        esicNumber: opts?.documentsInfo ? (candidate.metadata?.esicNumber || "N/A") : "N/A",
      };
    }

    return base;
  }, [candidate, shareMode, currentDataOptions]);

  // ─── Available views — gated by share options ───
  const availableViews = useMemo(() => {
    const views: string[] = ["overview"];
    const opts = currentDataOptions;

    // Resume analysis tabs: only if resumeAnalysis option is on
    const showAnalysis = !shareMode || opts?.resumeAnalysis !== false;
    if (resumeAnalysis && showAnalysis) views.push("validation", "scoring");

    // Work history tab: only if workInfo option is on
    if (workHistory.length > 0 && (!shareMode || opts?.workInfo)) views.push("experience");

    // Skills tab: only if skillinfo option is on
    if (!shareMode || opts?.skillinfo) views.push("skills");

    // Resume preview: only if resumeAttachment option is on
    const showResume = !shareMode || opts?.resumeAttachment !== false;
    if (showResume) views.push("resume");

    // BGV Results: only in share mode if bgvResults option is on and data exists
    if (shareMode && opts?.bgvResults && Object.keys(bgvResults).length > 0) {
      views.push("bgv");
    }

    return views;
  }, [resumeAnalysis, workHistory, shareMode, currentDataOptions, bgvResults]);

  // ─── Parsed resume analysis fields ───
  const parsedMatchedSkills = useMemo(() => {
    if (!resumeAnalysis?.matched_skills) return [];
    const raw = resumeAnalysis.matched_skills;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }, [resumeAnalysis]);

  const parsedSectionScoring = useMemo(() => {
    if (!resumeAnalysis?.section_wise_scoring) return [];
    const raw = resumeAnalysis.section_wise_scoring;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  }, [resumeAnalysis]);

  const parsedMatchQuality = useMemo(() => {
    if (!resumeAnalysis?.match_quality) return null;
    const raw = resumeAnalysis.match_quality;
    if (typeof raw === "object" && raw !== null) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  }, [resumeAnalysis]);

  const parsedResumeQuality = useMemo(() => {
    if (!resumeAnalysis?.resume_quality) return null;
    const raw = resumeAnalysis.resume_quality;
    if (typeof raw === "object" && raw !== null) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  }, [resumeAnalysis]);

  const parsedRawAnalysis = useMemo(() => {
    if (!resumeAnalysis?.raw_ai_analysis) return null;
    const raw = resumeAnalysis.raw_ai_analysis;
    if (typeof raw === "object" && raw !== null) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  }, [resumeAnalysis]);

  // ─── Loading / Error states ───
  if (loading) return <V2LoadingState />;
  if (error) return <V2ErrorState error={error} onBack={() => navigate(-1)} />;
  if (!employee) return <V2ErrorState error="No candidate data found." onBack={() => navigate(-1)} />;

  // ─── View labels ───
  const viewLabels: Record<string, string> = {
    overview: "Overview",
    validation: "Skill Validation",
    scoring: "Section Scoring",
    experience: "Work History",
    skills: "Skill Matrix",
    resume: "Resume",
    bgv: "BGV Results",
  };

  return (
    <>
      {/* ─── Global Styles (unchanged) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .v2-root {
          --v2-primary: #7C3AED;
          --v2-primary-light: #8B5CF6;
          --v2-primary-dark: #6D28D9;
          --v2-primary-50: #F5F3FF;
          --v2-primary-100: #EDE9FE;
          --v2-primary-200: #DDD6FE;
          --v2-cyan: #06B6D4;
          --v2-green: #10B981;
          --v2-amber: #F59E0B;
          --v2-red: #EF4444;
          --v2-bg: #F8F9FC;
          --v2-bg-2: #F6F5F5;
          --v2-surface: rgba(255, 255, 255, 0.72);
          --v2-surface-solid: #FFFFFF;
          --v2-border: rgba(139, 92, 246, 0.1);
          --v2-border2: rgba(0, 0, 0, 0.06);
          --v2-text: #1E1B4B;
          --v2-text-secondary: #64748B;
          --v2-text-muted: #94A3B8;
          --v2-glass: rgba(255, 255, 255, 0.6);
          --v2-glass-border: rgba(255, 255, 255, 0.3);
          --v2-shadow: 0 4px 24px rgba(124, 58, 237, 0.06), 0 1px 3px rgba(0,0,0,0.04);
          --v2-shadow-lg: 0 8px 40px rgba(124, 58, 237, 0.08), 0 2px 8px rgba(0,0,0,0.04);
          --v2-radius: 16px;
          --v2-radius-sm: 10px;
          --v2-font: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          --v2-mono: 'JetBrains Mono', monospace;
        }
        .v2-root * { box-sizing: border-box; }
        .v2-root { font-family: var(--v2-font); background: var(--v2-bg-2); min-height: 100vh; color: var(--v2-text); background-image: none; }
        .v2-card { background: var(--v2-surface); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--v2-border); border-radius: var(--v2-radius); box-shadow: var(--v2-shadow); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .v2-card:hover { box-shadow: var(--v2-shadow-lg); }
        .v2-topnav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: 0; padding: 0 28px; height: 56px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--v2-border2); }
        .v2-view-tab { padding: 6px 16px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 500; color: var(--v2-text-secondary); border: none; background: transparent; transition: all 0.2s ease; font-family: var(--v2-font); white-space: nowrap; }
        .v2-view-tab:hover { color: var(--v2-text); background: var(--v2-primary-50); }
        .v2-view-tab.active { color: var(--v2-primary); background: var(--v2-primary-50); border: 1px solid var(--v2-primary-200); font-weight: 600; }
        @keyframes v2FadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes v2SlideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes v2ScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes v2Pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes v2Shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .v2-animate-in { animation: v2FadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .v2-animate-slide { animation: v2SlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .v2-animate-scale { animation: v2ScaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .v2-stagger-1 { animation-delay: 0.05s; } .v2-stagger-2 { animation-delay: 0.1s; } .v2-stagger-3 { animation-delay: 0.15s; } .v2-stagger-4 { animation-delay: 0.2s; } .v2-stagger-5 { animation-delay: 0.25s; }
        .v2-gauge-ring { position: relative; } .v2-gauge-ring svg { transform: rotate(-90deg); }
        .v2-gauge-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .v2-dim-track { height: 7px; background: rgba(124,58,237,0.08); border-radius: 4px; overflow: hidden; flex: 1; }
        .v2-dim-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .v2-req-table { width: 100%; border-collapse: collapse; } .v2-req-table thead tr { border-bottom: 2px solid var(--v2-border2); }
        .v2-req-table th { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: var(--v2-text-muted); padding: 0 12px 12px; text-align: left; }
        .v2-req-table td { padding: 14px 12px; font-size: 0.82rem; border-bottom: 1px solid var(--v2-border2); vertical-align: middle; }
        .v2-req-table tr:last-child td { border-bottom: none; } .v2-req-table tr:hover td { background: var(--v2-primary-50); }
        .v2-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
        .v2-tag-green { background: rgba(16,185,129,0.1); color: #059669; border: 1px solid rgba(16,185,129,0.2); }
        .v2-tag-amber { background: rgba(245,158,11,0.1); color: #D97706; border: 1px solid rgba(245,158,11,0.2); }
        .v2-tag-red { background: rgba(239,68,68,0.1); color: #DC2626; border: 1px solid rgba(239,68,68,0.2); }
        .v2-score-pill { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; font-family: var(--v2-mono); font-size: 0.8rem; font-weight: 700; }
        .v2-sp-high { background: rgba(16,185,129,0.1); color: #059669; } .v2-sp-mid { background: rgba(245,158,11,0.1); color: #D97706; } .v2-sp-low { background: rgba(239,68,68,0.1); color: #DC2626; }
        .v2-root ::-webkit-scrollbar { width: 5px; height: 5px; } .v2-root ::-webkit-scrollbar-track { background: transparent; } .v2-root ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.15); border-radius: 3px; }
        @media print { .v2-topnav, .v2-action-bar { display: none !important; } .v2-card { box-shadow: none !important; border: 1px solid #ddd !important; } }
      `}</style>

      <div className="v2-root">
        {/* ─── Top Navigation ─── */}
        <div className="v2-topnav">
          {!shareMode && (
            <button
              onClick={() => navigate(-1)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 600, border: "1px solid var(--v2-border2)",
                background: "transparent", color: "var(--v2-text-secondary)",
                fontFamily: "var(--v2-font)", marginRight: 16, transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--v2-primary-200)";
                e.currentTarget.style.color = "var(--v2-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--v2-border2)";
                e.currentTarget.style.color = "var(--v2-text-secondary)";
              }}
            >
              ← Back
            </button>
          )}
          <div style={{ display: "flex", gap: 3 }}>
            {availableViews.map((view) => (
              <button
                key={view}
                className={`v2-view-tab ${activeView === view ? "active" : ""}`}
                onClick={() => setActiveView(view)}
              >
                {viewLabels[view] || view}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <V2ActionBar
              shareMode={shareMode}
              employee={employee}
              onShareClick={() => setShowDataSelection(true)}
              onBgvClick={() => setBgvOpen(true)}
              resumeUrl={employee.resume}
              toast={toast}
              showResume={!shareMode || currentDataOptions?.resumeAttachment !== false}
            />
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px 56px" }}>
          {/* ─── VIEW: Overview ─── */}
          {activeView === "overview" && (
            <V2OverviewTab
              employee={employee}
              resumeAnalysis={resumeAnalysis}
              parsedMatchedSkills={parsedMatchedSkills}
              parsedSectionScoring={parsedSectionScoring}
              parsedMatchQuality={parsedMatchQuality}
              parsedResumeQuality={parsedResumeQuality}
              parsedRawAnalysis={parsedRawAnalysis}
              workHistory={workHistory}
              sortedGroupedSkills={sortedGroupedSkills}
              isLoadingEnriched={isLoadingEnriched}
              shareMode={shareMode}
              currentDataOptions={currentDataOptions}
              formatINR={formatINR}
            />
          )}

          {/* ─── VIEW: Skill Validation ─── */}
          {activeView === "validation" && resumeAnalysis && (
            <V2ResumeAnalysis
              view="validation"
              resumeAnalysis={resumeAnalysis}
              parsedMatchedSkills={parsedMatchedSkills}
              parsedSectionScoring={parsedSectionScoring}
              parsedMatchQuality={parsedMatchQuality}
              parsedResumeQuality={parsedResumeQuality}
              shareMode={shareMode}
              currentDataOptions={currentDataOptions}
            />
          )}

          {/* ─── VIEW: Section Scoring ─── */}
          {activeView === "scoring" && resumeAnalysis && (
            <V2ResumeAnalysis
              view="scoring"
              resumeAnalysis={resumeAnalysis}
              parsedMatchedSkills={parsedMatchedSkills}
              parsedSectionScoring={parsedSectionScoring}
              parsedMatchQuality={parsedMatchQuality}
              parsedResumeQuality={parsedResumeQuality}
              shareMode={shareMode}
              currentDataOptions={currentDataOptions}
            />
          )}

          {/* ─── VIEW: Work History ─── */}
          {activeView === "experience" && workHistory.length > 0 && (
            <div className="v2-animate-in">
              <V2WorkTimeline
                workHistory={workHistory}
                shareMode={shareMode}
                isVerifyingAll={isVerifyingAllWorkHistory}
                onVerifyAllCompanies={verifyAllCompanies}
                onVerifySingleWorkHistory={handleVerifySingleWorkHistory}
                updateWorkHistoryItem={updateWorkHistoryItem}
                expanded
              />
            </div>
          )}

          {/* ─── VIEW: Skill Matrix ─── */}
          {activeView === "skills" && (
            <div className="v2-animate-in">
              <V2SkillsPanel
                sortedGroupedSkills={sortedGroupedSkills}
                isLoading={isLoadingEnriched}
                skillRatings={employee.skillRatings}
                shareMode={shareMode}
                sharedDataOptions={currentDataOptions}
                expanded
              />
            </div>
          )}

          {/* ─── VIEW: Resume Preview ─── */}
          {activeView === "resume" && (
            <div className="v2-card v2-animate-in" style={{ padding: 24 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--v2-text)", marginBottom: 16 }}>
                Resume Preview
              </h3>
              {employee.resume && employee.resume !== "#" ? (
                <iframe
                  src={employee.resume}
                  title="Resume Preview"
                  style={{
                    width: "100%", height: 800, border: "1px solid var(--v2-border2)",
                    borderRadius: "var(--v2-radius-sm)",
                  }}
                />
              ) : (
                <p style={{ color: "var(--v2-text-muted)", textAlign: "center", padding: 40 }}>
                  No resume available for preview.
                </p>
              )}
            </div>
          )}

          {/* ─── VIEW: BGV Results (share mode only) ─── */}
          {activeView === "bgv" && shareMode && (
            <V2BgvResults bgvResults={bgvResults} />
          )}
        </div>
      </div>

      {/* ─── Share Dialog ─── */}
      {!shareMode && (
        <V2ShareDialog
          open={showDataSelection}
          onClose={() => setShowDataSelection(false)}
          onConfirm={(options, password, expiryDays) => generateMagicLink(options, candidate!, jobId, organization_id, password, expiryDays)}
          defaultOptions={currentDataOptions}
          isSharing={isSharing}
          magicLink={magicLink}
          isCopied={isCopied}
          onCopyMagicLink={copyMagicLink}
          sharePassword={sharePassword}
        />
      )}

      {/* ─── BGV Dialog ─── */}
      {!shareMode && (
        <V2BgvDialog
          open={bgvOpen}
          onClose={() => setBgvOpen(false)}
          candidate={candidate}
          employee={employee}
          documents={verifiedDocuments}
        />
      )}
    </>
  );
};

export default CandidateProfileV2;