// Hrumbles-Front-End_UI\src\pages\jobs\JobDescription.tsx
// UI REFRESH v2: 
//  • Client name in title bar (highlighted)
//  • SPOC column → 3 compact inline-label cards (Client POC / Internal SPOC / Assigned)
//  • All cards on violet theme (no teal)
//  • Compact padding throughout
//  • All data logic, queries, realtime — unchanged

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
  ArrowLeft, Building2, MapPin, Calendar, Briefcase, Users,
  FileText, UserCheck, Target, User,
} from "lucide-react";
import { formatBulletPoints } from "@/components/jobs/job-description/utils/formatUtils";
import JobEnrichedSkills from "@/components/jobs/job-description/JobEnrichedSkills";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" } },
};

// ── Meta pill ────────────────────────────────────────────────────────────────
const MetaPill = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 11, fontWeight: 500, color: "#475569",
    background: "white", border: "1px solid #E2E8F0",
    borderRadius: 99, padding: "3px 10px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  }}>
    <Icon size={11} color="#7C3AED" />
    {children}
  </span>
);

// ── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
    {Icon && <Icon size={11} color="#7C3AED" />}
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#94A3B8" }}>
      {children}
    </span>
  </div>
);

// ── Glass card (violet only) ─────────────────────────────────────────────────
const GlassCard = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderLeft: "3px solid #7C3AED",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    padding: "12px 14px",
    backdropFilter: "blur(4px)",
    ...style,
  }}>
    {children}
  </div>
);

// ── Compact info card — one or more inline label:value rows ──────────────────
const InfoCard = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: "white",
    border: "1px solid #EDE9FE",
    borderLeft: "3px solid #A78BFA",
    borderRadius: 8,
    padding: "8px 10px",
    boxShadow: "0 1px 4px rgba(109,40,217,0.06)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 5,
  }}>
    {children}
  </div>
);

// ── Single inline label:value row inside InfoCard ────────────────────────────
const InfoRow = ({
  label,
  value,
  emptyText = "—",
}: {
  label: string;
  value?: string | null;
  emptyText?: string;
}) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase" as const, color: "#7C3AED",
      flexShrink: 0, opacity: 0.75, width: 90,
    }}>
      {label}
    </span>
    <span style={{
      fontSize: 11, fontWeight: 600, color: "#1E293B",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
      flex: 1, minWidth: 0,
    }}>
      {value?.trim() || emptyText}
    </span>
  </div>
);

// ── Trough ───────────────────────────────────────────────────────────────────
const Trough = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: "linear-gradient(135deg, #FAFAFA, #F8F9FF)",
    borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9",
    padding: "16px 20px", ...style,
  }}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ModernJobDescription
// ─────────────────────────────────────────────────────────────────────────────
const ModernJobDescription = ({ job, candidatesLength, onEditJob, isSaved, onToggleSaved }) => {
  const navigate = useNavigate();
  const userRole   = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === "employee";
  const isVendor   = userRole === "vendor";

  const bulletPoints    = formatBulletPoints(job.description || "");
  const experienceText  = `${job.experience?.min?.years ?? 0}–${job.experience?.max?.years ?? "N/A"} years`;
  const hrBudget        = job.hr_budget ? `${formatINR(job.hr_budget)} ${job.hr_budget_type ?? ""}` : null;
  const clientBudget    = job.clientDetails?.clientBudget ? formatDisplayValue(job.clientDetails.clientBudget) : null;
  const vendorBudget    = !isEmployee && job.vendor_budget ? `${formatINR(job.vendor_budget)} ${job.vendor_budget_type ?? ""}` : null;
  const locationText    = job.location?.join(" · ") || "Remote";
  const clientPoc       = job.clientDetails?.pointOfContact as string | undefined;
  const clientName      = (job.clientDetails?.clientName || job.clientOwner) as string | undefined;
  const internalPocIds  = (job.clientDetails?.internal_poc_ids ?? []) as string[];

  // Parse assigned recruiter names from comma-separated string
  const assignedRecruiterNames: string[] = (job.assigned_to?.name ?? "")
    .split(",").map((n: string) => n.trim()).filter(Boolean);

  // Parse assigned vendor names from array
const assignedVendorNames: string[] = Array.isArray(job?.assigned_vendor)
  ? job.assigned_vendor
      .map((v: any) =>
        typeof v === "string"
          ? v.trim()
          : v?.name?.trim()
      )
      .filter(Boolean)
  : [];

  // Fetch internal POC names
  const { data: internalPocEmployees = [] } = useQuery({
    queryKey: ["internal-poc-employees", internalPocIds],
    queryFn: async () => {
      if (!internalPocIds.length) return [];
      const { data, error } = await supabase
        .from("hr_employees").select("id, first_name, last_name, email, phone").in("id", internalPocIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !isVendor && internalPocIds.length > 0,
  });

  const internalPocNameStr = internalPocEmployees
    .map((e: any) => `${e.first_name} ${e.last_name}`.trim()).join(", ");

  // Job detail rows (left card)
  const detailRows = [
    { label: "Experience",    value: experienceText },
    { label: "Openings",      value: `${job.numberOfCandidates} position${job.numberOfCandidates !== 1 ? "s" : ""}` },
    job.dueDate         && { label: "Due date",      value: job.dueDate },
    job.noticePeriod    && { label: "Notice period", value: job.noticePeriod },
    isVendor            && { label: "Budget",        value: job.vendor_budget ? `${formatINR(job.vendor_budget)} ${job.vendor_budget_type ?? ""}` : "—" },
    !isVendor && hrBudget                             && { label: "HR budget",     value: hrBudget },
    !isVendor && !isEmployee && clientBudget          && { label: "Client budget", value: clientBudget },
    !isVendor && !isEmployee && vendorBudget          && { label: "Vendor budget", value: vendorBudget },
    !isVendor && job.clientDetails?.endClient         && { label: "End client",    value: job.clientDetails.endClient },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #F8F6FF 0%, #F1F5F9 60%, #F0FDF4 100%)" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(124,58,237,0.08)",
        boxShadow: "0 1px 0 rgba(124,58,237,0.06)",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => navigate(-1)}
            style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}>
            <ArrowLeft size={16} color="#64748B" />
          </motion.button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {job.title}
            </h1>
            <p style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace", margin: 0 }}>{job.jobId}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px" }}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" style={{
          background: "white", borderRadius: 16, overflow: "hidden",
          border: "1px solid rgba(124,58,237,0.1)",
          boxShadow: [
            "0 0 0 1px rgba(124,58,237,0.05)", "0 4px 6px -1px rgba(0,0,0,0.04)",
            "0 12px 32px -4px rgba(109,40,217,0.08)", "0 32px 64px -12px rgba(0,0,0,0.06)",
          ].join(", "),
        }}>

          {/* ── Row 1: Title bar with client name ─────────────────────────── */}
          <motion.div variants={rowVariants} style={{
            padding: "13px 20px",
            background: "linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #4F46E5 100%)",
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

            {/* Job ID monospace chip */}
            <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 600, color: "rgba(221,214,254,0.9)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
              {job.jobId}
            </span>

            {/* Job title */}
            <span style={{ fontSize: 14, fontWeight: 700, color: "white", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {job.title}
            </span>

            {/* ★ Client name — highlighted in header */}
            {!isVendor && clientName && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.18)", color: "white",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                <Building2 size={11} style={{ opacity: 0.75 }} />
                {clientName}
              </span>
            )}

            {/* Status / type chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(74,222,128,0.2)", color: "#86EFAC", border: "1px solid rgba(134,239,172,0.3)" }}>
                {job.status}
              </span>
              {!isVendor && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {job.jobType}
                </span>
              )}
              {!isVendor && job.hiringMode && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.1)", color: "rgba(221,214,254,0.9)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {job.hiringMode}
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Row 2: Meta pills ─────────────────────────────────────────── */}
          <motion.div variants={rowVariants} style={{
            padding: "9px 20px", borderBottom: "1px solid #F1F5F9",
            display: "flex", flexWrap: "wrap" as const, gap: 6, alignItems: "center",
            background: "linear-gradient(180deg, #FDFCFF 0%, #FAFAFA 100%)",
          }}>
            <MetaPill icon={MapPin}>{locationText}</MetaPill>
            <MetaPill icon={Calendar}>{job.postedDate}</MetaPill>
            <MetaPill icon={Briefcase}>{experienceText}</MetaPill>
            <MetaPill icon={Users}>{job.numberOfCandidates} opening{job.numberOfCandidates !== 1 ? "s" : ""}</MetaPill>
          </motion.div>

          {/* ── Row 3: Details + SPOC cards ───────────────────────────────── */}
          <Trough>
            <motion.div variants={rowVariants} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              {/* Left: Job details glass card */}
              <GlassCard>
                <SectionLabel icon={FileText}>Job details</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 2 }}>
                  {detailRows.map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(109,40,217,0.06)" }}>
                      <span style={{ fontSize: 10, color: "#7C3AED", fontWeight: 500, width: 100, flexShrink: 0, opacity: 0.75 }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#1E293B" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Right: 3 compact InfoCards — hidden entirely for vendor */}
              {!isVendor && (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>

                  {/* Card 1 — Client POC (label + value inline) */}
                  {clientPoc && (
                    <InfoCard>
                      <InfoRow label="Client POC" value={clientPoc} />
                    </InfoCard>
                  )}

                  {/* Card 2 — Internal SPOC (comma-separated names) */}
                  {(internalPocEmployees.length > 0 || internalPocIds.length > 0) && (
                    <InfoCard>
                      <InfoRow
                        label="Internal SPOC"
                        value={internalPocNameStr || "Loading…"}
                      />
                    </InfoCard>
                  )}

                  {/* Card 3 — Assigned: recruiter + vendor rows, skip empty */}
{/* Card 3 — Assigned Recruiter */}
{assignedRecruiterNames.length > 0 && (
  <InfoCard>
    <InfoRow
      label="Recruiter Assigned"
      value={assignedRecruiterNames.join(", ")}
    />
  </InfoCard>
)}

{/* Card 4 — Assigned Vendor */}
{assignedVendorNames.length > 0 && (
  <InfoCard>
    <InfoRow
      label="Vendor Assigned"
      value={assignedVendorNames.join(", ")}
    />
  </InfoCard>
)}

                  {/* Empty state — no SPOC/assigned data at all */}
                  {!clientPoc && internalPocIds.length === 0 && assignedRecruiterNames.length === 0 && assignedVendorNames.length === 0 && (
                    <InfoCard>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <User size={14} color="#C4B5FD" />
                        <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>
                          No SPOC or assignment data yet
                        </span>
                      </div>
                    </InfoCard>
                  )}
                </div>
              )}
            </motion.div>
          </Trough>

          {/* ── Row 4: Skills ─────────────────────────────────────────────── */}
          <motion.div variants={rowVariants} style={{ padding: "16px 20px", borderTop: "1px solid #F1F5F9" }}>
            <JobEnrichedSkills skills={job.skills || []} />
          </motion.div>

          {/* ── Row 5: Role overview ──────────────────────────────────────── */}
          <Trough style={{ borderBottom: "none" }}>
            <motion.div variants={rowVariants}>
              <SectionLabel icon={Target}>
                Role overview
                <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: "normal", marginLeft: 4, color: "#CBD5E1" }}>
                  ({bulletPoints.length})
                </span>
              </SectionLabel>

              <motion.div variants={containerVariants} initial="hidden" animate="show" style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "6px 20px",
              }}>
                {bulletPoints.map((point, idx) => (
                  <motion.div key={idx} variants={rowVariants}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                    whileHover={{ x: 2 }} transition={{ duration: 0.12 }}>
                    <span style={{ marginTop: 5, width: 5, height: 5, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, margin: 0 }}>{point}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </Trough>

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

  const { data: job, isLoading: jobLoading, error: jobError, refetch: refetchJob } = useQuery({
    queryKey: ["job-details", id],
    queryFn:  () => getJobById(id || ""),
    enabled:  !!id,
  });

  const { data: candidatesData = [], refetch: refetchCandidates } = useQuery({
    queryKey: ["candidates-count", id],
    queryFn:  () => getCandidatesByJobId(id || ""),
    enabled:  !!id,
  });

  const candidates: Candidate[] = candidatesData.map((candidate) => ({
    id: parseInt(candidate.id) || 0, name: candidate.name, status: candidate.status,
    experience: candidate.experience, matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate, skills: candidate.skills,
  }));

  useEffect(() => {
    if (!id) return;
    const jobChannel = supabase.channel("job-desc-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_jobs", filter: `id=eq.${id}` }, () => refetchJob())
      .subscribe();
    const candidatesChannel = supabase.channel("candidates-desc-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "hr_job_candidates", filter: `job_id=eq.${id}` }, () => refetchCandidates())
      .subscribe();
    return () => { supabase.removeChannel(jobChannel); supabase.removeChannel(candidatesChannel); };
  }, [id, refetchJob, refetchCandidates]);

  if (jobLoading) return <LoadingState />;
  if (jobError || !job) return <ErrorState />;

  return (
    <>
      <ModernJobDescription job={job} candidatesLength={candidates.length}
        onEditJob={openDrawer} isSaved={isSaved} onToggleSaved={setIsSaved} />
      <JobEditDrawer job={job} open={isDrawerOpen} onClose={closeDrawer} onUpdate={handleJobUpdate} />
    </>
  );
};

export default JobDescription;