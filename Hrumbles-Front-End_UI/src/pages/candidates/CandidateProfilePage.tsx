import { useState, useMemo, FC } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Briefcase, GraduationCap, Award, Mail, Phone, Linkedin,
  Download, Info, History, ScanSearch, Sparkles, Building, Factory,
  MapPin, Calendar, Wallet, Clock, ChevronRight, TrendingUp, ChevronLeft,
  Eye, FileText, Banknote, Star, UserCheck, Copy, CheckCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompareWithJobDialog  from "@/components/candidates/talent-pool/CompareWithJobDialog";
import AnalysisHistoryDialog from "@/components/candidates/AnalysisHistoryDialog";
import EnrichDataDialog      from "@/components/candidates/talent-pool/EnrichDataDialog";
import { generateDocx, generatePdf } from "@/utils/cvGenerator";
import ResumeViewer          from "@/components/candidates/talent-pool/ResumeViewer";
import CandidateFullTimeline from "@/components/candidates/talent-pool/CandidateFullTimeline";
import { CandidateActivityPanel } from "@/components/candidates/activity/CandidateActivityPanel";

// ─── SVG gradient def ─────────────────────────────────────────────────────────
const GradDef = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="pg-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Highlight ────────────────────────────────────────────────────────────────
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const Highlight: FC<{ text: string; query: string[] }> = ({ text, query }) => {
  if (!query.length || !text) return <span>{text}</span>;
  const regex = new RegExp(`(${query.map(escapeRegExp).join("|")})`, "gi");
  return (
    <span>
      {text.split(regex).map((p, i) =>
        regex.test(p)
          ? <mark key={i} className="bg-yellow-200 text-black px-0.5 rounded-sm">{p}</mark>
          : p
      )}
    </span>
  );
};

const parseJsonArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try { const p = JSON.parse(data); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return[];
};

// ─── Copy chip ────────────────────────────────────────────────────────────────
const CopyChip = ({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); toast({ title: `${label} copied!` }); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-slate-200 bg-white text-[10px] font-medium text-slate-600 hover:border-[1px] hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] transition-all group"
    >
      <span className="text-slate-400 group-hover:text-purple-500">{icon}</span>
      <span className="break-all whitespace-normal text-left leading-tight py-0.5">{value}</span>
      {copied ? <CheckCheck size={10} className="text-emerald-500 flex-shrink-0" /> : <Copy size={10} className="text-slate-300 flex-shrink-0" />}
    </button>
  );
};

// ─── Stat pill ────────────────────────────────────────────────────────────────
const StatPill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-white hover:border-[1px] hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] transition-all group">
    <span className="text-slate-300 group-hover:text-purple-400 flex-shrink-0">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-[11px] font-semibold text-slate-700 whitespace-normal break-words leading-tight mt-0.5">{value}</p>
    </div>
  </div>
);

// ─── Section card ─────────────────────────────────────────────────────────────
const SCard = ({ icon, title, iconBg, children }: {
  icon: React.ReactNode; title: string; iconBg: string; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/40">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

// ─── Header action button ─────────────────────────────────────────────────────
const HBtn = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 hover:border-[1px] hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 transition-all"
  >
    {icon}{label}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const CandidateProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [searchParams]         = useSearchParams();
  const [isCompareOpen, setCompareOpen]   = useState(false);
  const[isHistoryOpen, setHistoryOpen]   = useState(false);
  const[isEnrichOpen,  setEnrichOpen]    = useState(false);
  const [currentWorkPage, setCurrentWorkPage] = useState(0);
  const ITEMS_PER_PAGE = 4;

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const highlightQuery = useMemo(() => {
    const stripQ = (v: string) => v.replace(/^"|"$/g, "").trim();
    const terms: string[] = [];
    for (const key of ["keywords","skills","companies","educations","locations"]) {
      [...(searchParams.get(`mandatory_${key}`)?.split(",") || []), ...(searchParams.get(`optional_${key}`)?.split(",") ||[])].filter(Boolean).forEach(v => terms.push(stripQ(v)));
    }
    const lk = searchParams.get("keywords"); if (lk) lk.split(",").filter(Boolean).forEach(v => terms.push(stripQ(v)));
    const cc = searchParams.get("current_company"); if (cc) terms.push(cc);
    const cd = searchParams.get("current_designation"); if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [searchParams]);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["talentPoolCandidate", candidateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_talent_pool").select("*").eq("id", candidateId).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!candidateId,
  });

  const topSkills = useMemo(() => parseJsonArray(candidate?.top_skills),[candidate]);

  const { data: enrichedSkills, isLoading: loadingSkills } = useQuery({
    queryKey: ["enrichedSkills", topSkills],
    queryFn: async () => {
      if (!topSkills?.length) return[];
      const { data, error } = await supabase.rpc("get_enriched_skills", { p_skill_names: topSkills });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!topSkills?.length,
  });

  const { data: relatedCandidates, isLoading: loadingRelated } = useQuery({
    queryKey:["relatedCandidates", candidateId, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_related_candidates", { p_candidate_id: candidateId, p_organization_id: organizationId, p_limit: 10 });
      if (error) return[];
      return data;
    },
    enabled: !!candidateId && !!organizationId,
  });

  const { data: exportPermission, isLoading: loadingPerm } = useQuery({
    queryKey:["exportPermission", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase.from("button_permissions").select("is_enabled").eq("organization_id", organizationId).eq("permission_type", "talent_exportbutton").single();
      if (error || !data) return null;
      return data.is_enabled;
    },
    enabled: !!organizationId,
  });

  const hasExportPermission = exportPermission === true && !loadingPerm;

  const groupedSkills = useMemo(() => {
    if (!enrichedSkills || !topSkills) return {};
    const map = new Map(enrichedSkills.map((s: any) =>[s.skill_name.trim().toLowerCase(), s]));
    return topSkills.reduce((acc: Record<string, { name: string; description: string }[]>, raw: string) => {
      const enriched = map.get(raw.trim().toLowerCase()) as any;
      const group = enriched ? (enriched.category || "Other") : "Other Skills";
      if (!acc[group]) acc[group] =[];
      const name = enriched ? enriched.normalized_name : raw;
      if (!acc[group].some((s: any) => s.name === name)) acc[group].push({ name, description: enriched?.description || "" });
      return acc;
    }, {} as Record<string, { name: string; description: string }[]>);
  }, [enrichedSkills, topSkills]);

  const sortedGroupedSkills = useMemo(() => {
    const entries = Object.entries(groupedSkills);
    const other = entries.find(([k]) => k.startsWith("Other"));
    const sorted = entries.filter(([k]) => !k.startsWith("Other")).sort(([a], [b]) => a.localeCompare(b));
    if (other) sorted.push(other);
    return Object.fromEntries(sorted);
  }, [groupedSkills]);

  const getEndYear = (d: string) => {
    if (!d || typeof d !== "string") return 0;
    if (d.toLowerCase().includes("present") || d.toLowerCase().includes("current")) return new Date().getFullYear() + 1;
    const y = d.match(/\d{4}/g);
    return y ? Math.max(...y.map(Number)) : 0;
  };

  const sortedWorkExperience = useMemo(() => {
    const w = parseJsonArray(candidate?.work_experience);
    return [...w].sort((a: any, b: any) => getEndYear(b.duration || b.end_date || "") - getEndYear(a.duration || a.end_date || ""));
  }, [candidate]);

  const workTotalPages = Math.ceil(sortedWorkExperience.length / ITEMS_PER_PAGE);
  const showWorkNav    = workTotalPages > 1;
  const currentWorkItems = sortedWorkExperience.slice(currentWorkPage * ITEMS_PER_PAGE, (currentWorkPage + 1) * ITEMS_PER_PAGE);

  const getGridCols = (n: number) => ({ 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }[n] ?? "grid-cols-4");

  const displaySalary = (raw?: string | number | null, parsed?: string | number | null) => {
    if ((!raw || raw === "0" || raw === 0) && (!parsed || parsed === "0" || parsed === 0)) return "N/A";

    let finalNum: number | null = null;
    
    // Process smartly parsed CTC
    if (parsed) {
      let p = parseFloat(String(parsed));
      if (!isNaN(p)) {
        // e.g., '2.5' often means 2.5 Lakhs
        if (p > 0 && p <= 100) p = p * 100000;
        finalNum = p;
      }
    }

    // Fallback logic if parsed wasn't available but we have a raw readable string
    if (finalNum === null && raw) {
      const rawStr = String(raw).toLowerCase();
      let r = parseFloat(rawStr.replace(/[^0-9.]/g, ""));
      if (!isNaN(r) && r > 0) {
        if (rawStr.includes("lac") || rawStr.includes("lakh") || rawStr.includes("lpa") || r <= 100) {
          r = r * 100000;
        }
        finalNum = r;
      }
    }

    // Format intelligently into INR
    if (finalNum !== null && finalNum > 0) {
      if (finalNum >= 100000) {
        const lakhs = finalNum / 100000;
        const formattedLakhs = Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(2);
        return `₹ ${formattedLakhs} LPA`;
      }
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(finalNum);
    }

    // Final fallback
    if (raw && String(raw).trim() !== "0") return String(raw).trim();
    return "N/A";
  };

  const professionalSummary = useMemo(() => {
    const pts = candidate?.professional_summary;
    const arr = parseJsonArray(pts);
    if (arr.length > 0) return arr.join("\n");
    if (typeof pts === "string" && pts.trim()) return pts;
    return "";
  }, [candidate]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-purple-600 border-r-pink-500 animate-spin" />
    </div>
  );
  if (!candidate) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-400 text-sm">Candidate not found</p>
    </div>
  );

  const statPills =[
    { icon: <Briefcase size={12} />,     label: "Experience",   value: candidate.total_experience || "N/A" },
    { icon: <Star size={12} />,          label: "Relevant Exp", value: candidate.relevant_experience || candidate.total_experience || "N/A" },
    { icon: <Clock size={12} />,         label: "Notice",       value: candidate.notice_period || "N/A" },
    { icon: <MapPin size={12} />,        label: "Location",     value: candidate.current_location || "N/A" },
    { icon: <Banknote size={12} />,      label: "Current CTC",  value: displaySalary(candidate.current_salary, candidate.parsed_current_ctc) },
    { icon: <Banknote size={12} />,      label: "Expected CTC", value: displaySalary(candidate.expected_salary, candidate.parsed_expected_ctc) },
    { icon: <GraduationCap size={12} />, label: "Education",    value: candidate.highest_education || "N/A" },
    { icon: <UserCheck size={12} />,     label: "Has Offers",   value: candidate.has_offers === true || candidate.has_offers === "yes" ? "Yes" : "No" },
    { icon: <MapPin size={12} />,        label: "Preferred",    value: parseJsonArray(candidate.preferred_locations).length > 0 ? parseJsonArray(candidate.preferred_locations).slice(0, 2).join(", ") : "N/A" },
  ];

  const bounceAnim = `@keyframes pg-bounce { 0%,100%{transform:translateX(0) scale(1)} 50%{transform:translateX(5px) scale(1.05)} }`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <GradDef />
      <style>{bounceAnim}</style>

      {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 -mx-0 px-6 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.history.back()}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] transition-all"
          >
            <ArrowLeft size={13} className="text-slate-500" />
          </button>
          <div>
            <p className="text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              {candidate.candidate_name}
            </p>
            <p className="text-[9px] text-slate-400">{candidate.suggested_title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <HBtn icon={<ScanSearch size={11} />} label="Compare" onClick={() => setCompareOpen(true)} />
          <HBtn icon={<History size={11} />}    label="History"  onClick={() => setHistoryOpen(true)} />
          <HBtn icon={<Sparkles size={11} />}   label="Enrich"   onClick={() => setEnrichOpen(true)} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={hasExportPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Download size={11} />Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => generatePdf(candidate)} className="text-[11px]">Download as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateDocx(candidate)} className="text-[11px]">Download as DOCX</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-6 py-5 max-w-[1400px] mx-auto space-y-5">

        {/* ── HERO CARD ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-purple-600 to-pink-600" />

          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
                <span className="text-xl font-black text-white">
                  {candidate.candidate_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                  <Highlight text={candidate.candidate_name || ""} query={highlightQuery} />
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  <Highlight text={candidate.suggested_title || ""} query={highlightQuery} />
                </p>
                {candidate.current_company && (
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Factory size={10} className="text-slate-300" />
                    {candidate.current_company}
                    {candidate.current_designation && <span className="text-slate-300">·</span>}
                    {candidate.current_designation}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {candidate.email && (
                    <CopyChip value={candidate.email} label="Email" icon={<Mail size={10} />} />
                  )}
                  {candidate.phone && (
                    <CopyChip value={candidate.phone} label="Phone" icon={<Phone size={10} />} />
                  )}
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-slate-200 bg-white text-[10px] font-medium text-slate-600 hover:border-[1px] hover:[border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] transition-all">
                      <Linkedin size={10} />LinkedIn
                    </a>
                  )}
                  {candidate.resume_path && (
                    <a href={candidate.resume_path} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-[10px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all">
                      <Eye size={10} />View Resume
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
              {statPills.map((s, i) => <StatPill key={i} {...s} />)}
            </div>
          </div>
        </div>

        {/* ── WORK HISTORY CAROUSEL ───────────────────────────────────────── */}
        {sortedWorkExperience.length > 0 && (
          <SCard icon={<Briefcase size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Work Experience" iconBg="bg-violet-50">
            <div className="p-5 relative">
              <div className="relative px-8">
                {showWorkNav && (
                  <button
                    onClick={() => setCurrentWorkPage(p => Math.max(p - 1, 0))}
                    disabled={currentWorkPage === 0}
                    className="absolute left-0 top-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: currentWorkPage === 0 ? "#e2e8f0" : "linear-gradient(to right, #9333ea, #ec4899)" }}
                  >
                    <ChevronLeft size={14} className="text-white" />
                  </button>
                )}
                {showWorkNav && (
                  <button
                    onClick={() => setCurrentWorkPage(p => Math.min(p + 1, workTotalPages - 1))}
                    disabled={currentWorkPage === workTotalPages - 1}
                    style={{
                      background: currentWorkPage === workTotalPages - 1 ? "#e2e8f0" : "linear-gradient(to right, #9333ea, #ec4899)",
                      animation: currentWorkPage === workTotalPages - 1 ? "none" : "pg-bounce 1.75s infinite",
                    }}
                    className="absolute right-0 top-4 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} className="text-white" />
                  </button>
                )}

                <div className="relative py-2">
                  <div className="absolute top-4 left-0 w-full h-px bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200" />
                  <div className={`grid ${getGridCols(currentWorkItems.length)} gap-4 relative`}>
                    {currentWorkItems.map((exp: any, i: number) => {
                      const title    = exp.designation || exp.title || "";
                      const company  = exp.company || "";
                      const duration = exp.duration || (exp.start_date && exp.end_date ? `${exp.start_date} – ${exp.end_date}` : exp.start_date || exp.end_date || "");
                      const isCurrent = duration.toLowerCase().includes("present") || duration.toLowerCase().includes("current");
                      return (
                        <div key={i} className="flex flex-col items-center group">
                          <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center mb-2 shadow-md ${isCurrent ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-white border-2 border-purple-200"}`}>
                            {isCurrent && <div className="absolute inset-0 rounded-full bg-purple-400 opacity-30 animate-ping" />}
                            <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-white" : "bg-purple-300"}`} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-800 text-center line-clamp-2 leading-tight">
                            <Highlight text={company} query={highlightQuery} />
                          </p>
                          <p className="text-[9px] font-semibold text-center mt-0.5 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent line-clamp-2">
                            <Highlight text={title} query={highlightQuery} />
                          </p>
                          <p className="text-[9px] text-slate-400 text-center mt-0.5">{duration}</p>
                          {isCurrent && <span className="mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">Current</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {showWorkNav && (
                <p className="text-[9px] text-slate-400 text-center mt-4">
                  Page {currentWorkPage + 1} of {workTotalPages}
                </p>
              )}
            </div>
          </SCard>
        )}

        {/* ── 2/3 + 1/3 GRID ─────────────────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* LEFT — main content */}
          <div className="space-y-5 lg:col-span-2">

            {/* Skills */}
            <SCard icon={<TrendingUp size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Top Skills" iconBg="bg-violet-50">
              <div className="p-4">
                {loadingSkills ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[...Array(10)].map((_, i) => <div key={i} className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />)}
                  </div>
                ) : Object.keys(sortedGroupedSkills).length === 0 ? (
                  <p className="text-xs text-slate-400">No skills available.</p>
                ) : (() => {
                  const entries = Object.entries(sortedGroupedSkills);
                  const half = Math.ceil(entries.length / 2);
                  const firstHalf  = entries.slice(0, half);
                  const secondHalf = entries.slice(half);

                  const renderTable = (tableEntries: [string, { name: string; description: string }[]][]) => (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="w-1/3 text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Category
                          </th>
                          <th className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Skills
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableEntries.map(([groupKey, skills]) => (
                          <tr key={groupKey} className="border-b border-slate-50 hover:bg-violet-50/20 transition-colors">
                            <td className="px-3 py-2 align-top font-semibold text-[10px] text-slate-600 whitespace-normal leading-snug">
                              {groupKey}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {(skills as { name: string; description: string }[]).map(skill => (
                                  <div key={skill.name} className="relative group/sk">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border-[1px] text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] cursor-default whitespace-normal leading-snug">
                                      <Highlight text={skill.name} query={highlightQuery} />
                                    </span>
                                    {skill.description && skill.description !== "No description available." && (
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs p-2 rounded-lg bg-slate-800 text-white text-[10px] shadow-xl opacity-0 group-hover/sk:opacity-100 transition-opacity z-20 pointer-events-none">
                                        {skill.description}
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] h-2 w-2 bg-slate-800 rotate-45" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );

                  const totalSkills = entries.reduce((acc, [, s]) => acc + s.length, 0);

                  if (totalSkills <= 5 || entries.length <= 2) {
                    return renderTable(entries);
                  }
                  return (
                    <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
                      <div>{renderTable(firstHalf)}</div>
                      <div>{renderTable(secondHalf)}</div>
                    </div>
                  );
                })()}
              </div>
            </SCard>

            {/* About */}
            {professionalSummary && (
              <SCard icon={<Info size={14} style={{ stroke: "url(#pg-grad)" }} />} title="About" iconBg="bg-blue-50">
                <div className="p-4">
                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">{professionalSummary}</p>
                </div>
              </SCard>
            )}

            {/* Education */}
            {parseJsonArray(candidate.education).length > 0 && (
              <SCard icon={<GraduationCap size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Education" iconBg="bg-indigo-50">
                <div className="px-4 py-3">
                  <div className="relative border-l border-slate-100 ml-2 space-y-4">
                    {parseJsonArray(candidate.education).map((edu: any, i: number) => (
                      <div key={i} className="relative pl-4">
                        <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm" />
                        <p className="text-[11px] font-bold text-slate-800 leading-tight">
                          <Highlight text={edu.degree || ""} query={highlightQuery} />
                        </p>
                        <p className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-0.5">
                          <Highlight text={edu.institution || ""} query={highlightQuery} />
                        </p>
                        {edu.year && (
                          <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={9} />{edu.year}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </SCard>
            )}

            {/* Certifications */}
            {parseJsonArray(candidate.certifications).length > 0 && (
              <SCard icon={<Award size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Certifications" iconBg="bg-amber-50">
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {parseJsonArray(candidate.certifications).map((cert: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 group">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0" />
                      <p className="text-[11px] font-medium text-slate-700 leading-snug group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                        {cert}
                      </p>
                    </div>
                  ))}
                </div>
              </SCard>
            )}

            {/* Other Details */}
            {candidate.other_details && Object.keys(candidate.other_details).length > 0 && (
              <SCard icon={<Info size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Other Details" iconBg="bg-cyan-50">
                <div className="p-4 space-y-3">
                  {Object.entries(candidate.other_details).map(([key, value]) =>
                    Array.isArray(value) && value.length > 0 && (
                      <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <h4 className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{key}</h4>
                        <ul className="space-y-1">
                          {value.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <ChevronRight size={12} className="text-slate-300 flex-shrink-0 mt-0.5" />{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}
                </div>
              </SCard>
            )}

            {/* Resume */}
            {(candidate.resume_path || candidate.resume_text) && (
              <SCard icon={<FileText size={14} style={{ stroke: "url(#pg-grad)" }} />} title="Resume / CV" iconBg="bg-pink-50">
                <div className="p-4">
                  <ResumeViewer
                    resumePath={candidate.resume_path}
                    resumeText={candidate.resume_text}
                    highlightTerms={highlightQuery}
                    hasExportPermission={hasExportPermission}
                  />
                </div>
              </SCard>
            )}
          </div>

          {/* RIGHT — sidebar */}
          <div className="space-y-5">

            {/* Activity Panel */}
            <CandidateActivityPanel
              candidateId={candidateId!}
              candidateName={candidate.candidate_name ?? ""}
            />

            {/* Timeline */}
            <CandidateFullTimeline
              candidateId={candidateId!}
              candidateEmail={candidate.email ?? ""}
              candidateName={candidate.candidate_name ?? ""}
              talentPoolCreatedAt={candidate.created_at}
            />

            {/* Related Candidates */}
            {(loadingRelated || (relatedCandidates && relatedCandidates.length > 0)) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/40 rounded-t-xl">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                    <Star size={14} style={{ stroke: "url(#pg-grad)" }} />
                  </div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Related Candidates
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {loadingRelated ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-3/4 bg-slate-100 rounded animate-pulse" />
                          <div className="h-2 w-1/2 bg-slate-100 rounded animate-pulse" />
                        </div>
                      </div>
                    ))
                  ) : (
                    relatedCandidates.map((rc: any, idx: number) => (
                      <div key={rc.id} className="relative group/rc">
                        <Link
                          to={`/talent-pool/${rc.id}`}
                          className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-50/40 transition-colors ${idx === relatedCandidates.length - 1 ? 'rounded-b-xl' : ''}`}
                        >
                          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center text-[11px] font-bold text-purple-700 shadow-sm">
                            {rc.candidate_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-slate-800 group-hover/rc:bg-gradient-to-r group-hover/rc:from-purple-600 group-hover/rc:to-pink-600 group-hover/rc:bg-clip-text group-hover/rc:text-transparent transition-all truncate">
                              {rc.candidate_name}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">{rc.suggested_title}</p>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white border-[1px] text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1] flex-shrink-0">
                            {rc.matching_skill_count}
                          </span>
                        </Link>

                        {/* Matched skills tooltip */}
                        {rc.matching_skills?.length > 0 && (
                          <div className="absolute right-0 top-0 -translate-y-full mb-1 opacity-0 group-hover/rc:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                            <div className="bg-slate-900 rounded-xl p-3 shadow-2xl w-56 -mt-2">
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-700">
                                Matched Skills
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {rc.matching_skills.map((skill: string) => (
                                  <span key={skill}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-700 text-slate-200">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              <div className="absolute bottom-[-4px] right-6 h-2 w-2 bg-slate-900 rotate-45" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {candidateId && (
        <>
          <CompareWithJobDialog  isOpen={isCompareOpen} onClose={() => setCompareOpen(false)}  candidateId={candidateId} />
          <AnalysisHistoryDialog isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} candidateId={candidateId} candidateName={candidate.candidate_name} />
          <EnrichDataDialog      isOpen={isEnrichOpen}  onClose={() => setEnrichOpen(false)}  candidate={candidate} />
        </>
      )}
    </div>
  );
};

export default CandidateProfilePage;