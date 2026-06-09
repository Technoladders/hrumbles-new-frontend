// Hrumbles-Front-End_UI\src\pages\jobs\JobDescription.tsx
// Redesign: Option C dense record card, max-w-[1400px], violet/indigo theme,
// Framer Motion animations, internal_poc_ids fetched from hr_employees,
// client POC from clientDetails.pointOfContact, full vendor gating.
// Role overview always fully expanded (no collapse). All commented blocks preserved.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { getCandidatesByJobId } from "@/services/candidateService";
import { motion } from "framer-motion";
import LoadingState from "@/components/jobs/job-description/LoadingState";
import ErrorState from "@/components/jobs/job-description/ErrorState";
import JobEditDrawer from "@/components/jobs/job-description/JobEditDrawer";
import { useJobEditState } from "@/components/jobs/job-description/hooks/useJobEditState";
import { Candidate } from "@/lib/types";
import { formatDisplayValue } from "@/components/jobs/job-description/utils/formatUtils";
import {
  ArrowLeft, Edit, Share, Building, Hourglass, UserPlus, Clock, IndianRupee,
  CircleUser, MapPin, CalendarDays, Users, FileText, UserCheck, Briefcase,
  CalendarClock, Bookmark, Share2, Building2, Calendar, DollarSign, TrendingUp,
  Target, Sparkles, Zap, Award, BadgeCheck,
} from "lucide-react";
import { formatBulletPoints } from "@/components/jobs/job-description/utils/formatUtils";
import JobEnrichedSkills from "@/components/jobs/job-description/JobEnrichedSkills";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

// Stagger children animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// ── Budget pill chip ─────────────────────────────────────────────────────────
const SpocRow = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "purple" | "teal";
}) => {
  const labelCls = variant === "purple" ? "text-violet-400" : "text-teal-600";
  const valueCls = variant === "purple" ? "text-violet-900" : "text-teal-900";
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className={`text-[9px] font-bold uppercase tracking-widest w-24 flex-shrink-0 ${labelCls}`}>
        {label}
      </span>
      <span className={`text-[11px] font-semibold ${valueCls}`}>{value}</span>
    </div>
  );
};

// ── Budget pill chip ─────────────────────────────────────────────────────────
const BudgetChip = ({ label, value }: { label: string; value: string }) => (
  <motion.div
    variants={rowVariants}
    className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100/60"
    whileHover={{ y: -1 }}
    transition={{ duration: 0.15 }}
  >
    <span className="text-[9px] font-semibold uppercase tracking-widest text-violet-400">
      {label}
    </span>
    <span className="text-[12px] font-bold text-violet-800">{value}</span>
  </motion.div>
);

// ── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2">
    {children}
  </p>
);

// ─────────────────────────────────────────────────────────────────────────────
// ModernJobDescription — Option C dense record card, violet/indigo theme
// ─────────────────────────────────────────────────────────────────────────────

const ModernJobDescription = ({ job, candidatesLength, onEditJob, isSaved, onToggleSaved }) => {
  const navigate = useNavigate();
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === "employee";
  const isVendor = userRole === "vendor";

  // ── Derived data ────────────────────────────────────────────────────────────
  const bulletPoints = formatBulletPoints(job.description || "");
  const experienceText = `${job.experience?.min?.years ?? 0}–${job.experience?.max?.years ?? "N/A"} years`;
  const hrBudget = job.hr_budget ? `${formatINR(job.hr_budget)} ${job.hr_budget_type ?? ""}` : null;
  const clientBudget = job.clientDetails?.clientBudget
    ? formatDisplayValue(job.clientDetails.clientBudget)
    : null;
  const vendorBudget =
    !isEmployee && job.vendor_budget
      ? `${formatINR(job.vendor_budget)} ${job.vendor_budget_type ?? ""}`
      : null;
  const locationText = job.location?.join(" · ") || "Remote";
  const postedDate = job.postedDate;
  const dueDate = job.dueDate;

  // ── SPOC data ──────────────────────────────────────────────────────────────
  // client_details JSONB:
  //   pointOfContact   — client-side POC name (string)
  //   clientName       — client company name
  //   internal_poc_ids — array of hr_employees UUIDs (internal POCs)
  const clientPoc: string | undefined = job.clientDetails?.pointOfContact;
  const clientName: string | undefined = job.clientDetails?.clientName || job.clientOwner;
  const internalPocIds: string[] = job.clientDetails?.internal_poc_ids ?? [];

  // Fetch internal POC employee names from hr_employees
  const { data: internalPocEmployees = [] } = useQuery({
    queryKey: ["internal-poc-employees", internalPocIds],
    queryFn: async () => {
      if (!internalPocIds.length) return [];
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, email, phone")
        .in("id", internalPocIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isVendor && internalPocIds.length > 0,
  });

  console.log("vendor budget raw:", job.vendor_budget);
  console.log("vendor budget type:", job.vendor_budget_type);
  console.log("vendorBudget:", vendorBudget);
  console.log("clientDetails:", job.clientDetails);

  return (
    <div className="min-h-screen bg-gray-50/80">

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-5 py-2.5 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{job.title}</h1>
            <p className="text-[10px] text-gray-400 font-mono">{job.jobId}</p>
          </div>
          {/* <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onToggleSaved(!isSaved)}
              className={`p-1.5 rounded-lg transition-all ${isSaved ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onEditJob}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-md hover:scale-105 transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          </div> */}
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-5 py-5">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="bg-white rounded-2xl border border-gray-200/70 overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(109,40,217,0.04)" }}
        >

          {/* ── Row 1: Title bar ──────────────────────────────────────────── */}
          <motion.div
            variants={rowVariants}
            className="px-5 py-3 bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 flex items-center gap-2.5 flex-wrap"
          >
            <span className="text-[10px] font-mono font-medium text-violet-200 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 flex-shrink-0">
              {job.jobId}
            </span>
            <span className="text-sm font-bold text-white flex-1 min-w-0 truncate">
              {job.title}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-green-400/20 text-green-100 border border-green-300/30">
                {job.status}
              </span>
              {!isVendor && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/20">
                  {job.jobType}
                </span>
              )}
              {!isVendor && job.hiringMode && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-violet-100 border border-white/15">
                  {job.hiringMode}
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Row 2: Meta strip ────────────────────────────────────────── */}
          <motion.div
            variants={rowVariants}
            className="px-5 py-2 border-b border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-1 bg-gray-50/40"
          >
            {!isVendor && clientName && (
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                <Building2 className="w-3 h-3 text-violet-400" />
                {clientName}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <MapPin className="w-3 h-3 text-violet-400" />
              {locationText}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Calendar className="w-3 h-3 text-violet-400" />
              {postedDate}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Briefcase className="w-3 h-3 text-violet-400" />
              {experienceText}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Users className="w-3 h-3 text-violet-400" />
              {job.numberOfCandidates} opening{job.numberOfCandidates !== 1 ? "s" : ""}
            </span>
          </motion.div>

          {/* ── Row 3: Details + SPOC ────────────────────────────────────── */}
          <motion.div
            variants={rowVariants}
            className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100"
          >
            {/* Left: job detail table */}
            <div className="px-5 py-3.5">
              <SectionLabel>Job details</SectionLabel>
              <table className="w-full text-[11px] border-collapse">
                <tbody>
                  <tr className="group">
                    <td className="py-[3px] pr-3 text-gray-400 w-28 whitespace-nowrap">Experience</td>
                    <td className="py-[3px] font-semibold text-gray-800">{experienceText}</td>
                  </tr>
                  <tr>
                    <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Openings</td>
                    <td className="py-[3px] font-semibold text-gray-800">{job.numberOfCandidates} positions</td>
                  </tr>
                  {dueDate && (
                    <tr>
                      <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Due date</td>
                      <td className="py-[3px] font-semibold text-gray-800">{dueDate}</td>
                    </tr>
                  )}
                  {job.noticePeriod && (
                    <tr>
                      <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Notice period</td>
                      <td className="py-[3px] font-semibold text-gray-800">{job.noticePeriod}</td>
                    </tr>
                  )}

                  {/* Budget rows — vendor sees only vendor budget */}
                  {isVendor ? (
                    <tr>
                      <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Budget</td>
                      <td className="py-[3px] font-semibold text-gray-800">
                        {job.vendor_budget
                          ? `${formatINR(job.vendor_budget)} ${job.vendor_budget_type ?? ""}`
                          : "—"}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {hrBudget && (
                        <tr>
                          <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">HR budget</td>
                          <td className="py-[3px] font-semibold text-gray-800">{hrBudget}</td>
                        </tr>
                      )}
                      {!isEmployee && clientBudget && (
                        <tr>
                          <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Client budget</td>
                          <td className="py-[3px] font-semibold text-gray-800">{clientBudget}</td>
                        </tr>
                      )}
                      {!isEmployee && vendorBudget && (
                        <tr>
                          <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">Vendor budget</td>
                          <td className="py-[3px] font-semibold text-gray-800">{vendorBudget}</td>
                        </tr>
                      )}
                      {job.clientDetails?.endClient && (
                        <tr>
                          <td className="py-[3px] pr-3 text-gray-400 whitespace-nowrap">End client</td>
                          <td className="py-[3px] font-semibold text-gray-800">
                            {job.clientDetails.endClient}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right: SPOC — fully hidden for vendor */}
            <div className="px-5 py-3.5">
              {isVendor ? (
                <div className="flex items-center h-full">
                  {/* <p className="text-[11px] text-gray-400 italic">
                    Client &amp; contact details are not available for this view.
                  </p> */}
                </div>
              ) : (
                <>
                  <SectionLabel>SPOC details</SectionLabel>
                  <div className="flex flex-col">
                    {clientPoc && (
                      <SpocRow label="Client POC" value={clientPoc} variant="teal" />
                    )}
                    {internalPocEmployees.length > 0 && (
                      <SpocRow
                        label="Internal SPOC"
                        value={internalPocEmployees
                          .map((e) => `${e.first_name} ${e.last_name}`.trim())
                          .join(", ")}
                        variant="purple"
                      />
                    )}
                    {!clientPoc && internalPocEmployees.length === 0 && (
                      <p className="text-[11px] text-gray-400 italic">No SPOC assigned yet.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Row 4: Required skills ────────────────────────────────────── */}
          <motion.div
            variants={rowVariants}
            className="px-5 py-3.5 border-b border-gray-100"
          >
            <JobEnrichedSkills skills={job.skills || []} />
          </motion.div>

          {/* ── Row 5: Role overview — always fully expanded ─────────────── */}
          <motion.div variants={rowVariants} className="px-5 py-3.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Target className="w-3 h-3 text-violet-400" />
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400">
                Role overview
                <span className="normal-case tracking-normal font-normal ml-1 text-gray-300">
                  ({bulletPoints.length})
                </span>
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col gap-1"
            >
              {bulletPoints.map((point, idx) => (
                <motion.div
                  key={idx}
                  variants={rowVariants}
                  className="flex items-start gap-2 group"
                >
                  <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0 group-hover:bg-violet-500 transition-colors" />
                  <p className="text-[11px] text-gray-600 leading-relaxed">{point}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page wrapper — queries + realtime unchanged
// ─────────────────────────────────────────────────────────────────────────────

const JobDescription = () => {
  const { id } = useParams<{ id: string }>();
  const { isDrawerOpen, openDrawer, closeDrawer, handleJobUpdate } = useJobEditState();
  const [isSaved, setIsSaved] = useState(false);

  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useQuery({
    queryKey: ["job-details", id],
    queryFn: () => getJobById(id || ""),
    enabled: !!id,
  });

  const {
    data: candidatesData = [],
    refetch: refetchCandidates,
  } = useQuery({
    queryKey: ["candidates-count", id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

  const candidates: Candidate[] = candidatesData.map((candidate) => ({
    id: parseInt(candidate.id) || 0,
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate,
    skills: candidate.skills,
  }));

  // Real-time listeners
  useEffect(() => {
    if (!id) return;

    const jobChannel = supabase
      .channel("job-desc-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hr_jobs", filter: `id=eq.${id}` },
        () => refetchJob()
      )
      .subscribe();

    const candidatesChannel = supabase
      .channel("candidates-desc-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hr_job_candidates", filter: `job_id=eq.${id}` },
        () => refetchCandidates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(candidatesChannel);
    };
  }, [id, refetchJob, refetchCandidates]);

  if (jobLoading) return <LoadingState />;
  if (jobError || !job) return <ErrorState />;

  return (
    <>
      <ModernJobDescription
        job={job}
        candidatesLength={candidates.length}
        onEditJob={openDrawer}
        isSaved={isSaved}
        onToggleSaved={setIsSaved}
      />
      <JobEditDrawer
        job={job}
        open={isDrawerOpen}
        onClose={closeDrawer}
        onUpdate={handleJobUpdate}
      />
    </>
  );
};

export default JobDescription;