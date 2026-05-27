/**
 * CandidateInviteGate.tsx — v2
 *
 * Changes:
 *   - Fetches existing active invites on mount (by email + phone)
 *   - JobPickerModal shows per-job "Invited Xd ago" badges
 *   - Selecting a job with active invite shows confirmation step
 *   - Passes existingInvites to InviteCandidateModal
 */

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Search, Briefcase, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import InviteCandidateModal from "@/components/jobs/job/invite/InviteCandidateModal";
import type { InviteSource, ExistingInvite } from "@/services/inviteService";
import { getExistingInvites } from "@/services/inviteService";
import { useUpsertSavedCandidate } from "../hooks/useUpsertSavedCandidate";
import type { ApolloCandidate } from "../types";

interface JobOption {
  id:          string;
  title:       string;
  jobId:       string;
  location?:   string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?:     string[];
  description?:string;
  hiringMode?: string;
  jobType?:    string;
  clientDetails?: { clientName?: string };
  noticePeriod?:  string;
  department?:    string;
}

interface CandidateInviteGateProps {
  candidateName:    string;
  candidateEmail?:  string;
  candidatePhone?:  string;
  candidate?:       ApolloCandidate;
  apolloPersonId?:  string;
  organizationId?:  string;
  userId?:          string;
  onClose:          () => void;
  onInviteSent?:    (inviteId: string, jobId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────
function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Job Picker Modal — with existing-invite badges ────────────
const JobPickerModal: React.FC<{
  jobs:            JobOption[];
  existingInvites: ExistingInvite[];
  onSelect:        (j: JobOption, existing: ExistingInvite | null) => void;
  onClose:         () => void;
}> = ({ jobs, existingInvites, onSelect, onClose }) => {
  const [q, setQ] = useState("");
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(q.toLowerCase()));

  // Build a map of job_id → existing invite
  const inviteByJobId = new Map<string, ExistingInvite>(
    existingInvites.map(inv => [inv.job_id, inv])
  );

  return (
    <>
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1100 }}/>
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        zIndex:1101, width:"calc(100vw - 32px)", maxWidth:"440px",
        background:"#fff", borderRadius:"14px",
        boxShadow:"0 20px 56px rgba(0,0,0,0.22)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"14px 16px", borderBottom:"1px solid #F3F4F6",
          background:"linear-gradient(135deg,#6D28D9,#7C3AED)",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <p style={{ margin:0, fontSize:"13px", fontWeight:700, color:"#fff" }}>
              Select Job — Invite Candidate
            </p>
            <p style={{ margin:"1px 0 0", fontSize:"10px", color:"rgba(255,255,255,0.7)" }}>
              Choose which job this invite is for
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:"rgba(255,255,255,0.15)", border:"none",
              borderRadius:"6px", padding:"5px", cursor:"pointer", display:"flex" }}>
            <X size={13} color="#fff"/>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding:"10px 12px", borderBottom:"1px solid #F3F4F6", position:"relative" }}>
          <Search size={13} style={{ position:"absolute", left:"22px", top:"50%",
            transform:"translateY(-50%)", color:"#9CA3AF" }}/>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search active jobs…"
            style={{ width:"100%", padding:"7px 10px 7px 28px", borderRadius:"7px",
              border:"1px solid #E5E7EB", fontSize:"12px", outline:"none",
              boxSizing:"border-box", background:"#F9FAFB" }}/>
        </div>

        {/* List */}
        <div style={{ maxHeight:"300px", overflowY:"auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"24px", textAlign:"center", color:"#9CA3AF", fontSize:"12px" }}>
              No active jobs found
            </div>
          ) : filtered.map((j, i) => {
            const existing = inviteByJobId.get(j.id) ?? null;
            return (
              <button key={j.id} onClick={() => onSelect(j, existing)}
                style={{ width:"100%", padding:"10px 14px", border:"none", background:"none",
                  textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px",
                  borderBottom:i < filtered.length-1 ? "1px solid #F9FAFB" : "none" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#F5F3FF")}
                onMouseLeave={e=>(e.currentTarget.style.background="none")}>
                <div style={{ width:"30px", height:"30px", borderRadius:"8px",
                  background: existing ? "#FEF3C7" : "#EDE9FE",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Briefcase size={14} color={existing ? "#D97706" : "#7C3AED"}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:"12px", fontWeight:600, color:"#111827",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {j.title}
                  </p>
                  <div style={{ display:"flex", gap:"6px", marginTop:"2px", alignItems:"center" }}>
                    <span style={{ fontSize:"10px", color:"#9CA3AF", fontFamily:"monospace" }}>{j.jobId}</span>
                    {j.hiringMode && (
                      <span style={{ fontSize:"10px", fontWeight:600, padding:"1px 6px",
                        borderRadius:"99px", background:"#EDE9FE", color:"#7C3AED" }}>
                        {j.hiringMode}
                      </span>
                    )}
                    {/* Already invited badge */}
                    {existing && (
                      <span style={{ fontSize:"9px", fontWeight:700, padding:"1px 6px",
                        borderRadius:"99px", background:"#FEF3C7", color:"#92400E",
                        display:"flex", alignItems:"center", gap:"3px" }}>
                        <Clock size={8}/> Invited {daysAgo(existing.sent_at)}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:"18px", color: existing ? "#FCD34D" : "#C4B5FD", flexShrink:0 }}>›</span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 14px", borderTop:"1px solid #F3F4F6", background:"#FAFAFA",
          display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"7px 16px", borderRadius:"7px", border:"1px solid #E5E7EB",
              background:"#fff", fontSize:"12px", fontWeight:600, cursor:"pointer", color:"#6B7280" }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

// ── Re-send confirmation step ─────────────────────────────────
const ResendConfirmation: React.FC<{
  job:      JobOption;
  existing: ExistingInvite;
  onConfirm:() => void;
  onBack:   () => void;
  onClose:  () => void;
}> = ({ job, existing, onConfirm, onBack, onClose }) => (
  <>
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1100 }}/>
    <div style={{
      position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      zIndex:1101, width:"calc(100vw - 32px)", maxWidth:"400px",
      background:"#fff", borderRadius:"14px",
      boxShadow:"0 20px 56px rgba(0,0,0,0.22)", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{ padding:"14px 16px", background:"linear-gradient(135deg,#D97706,#B45309)",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <AlertTriangle size={15} color="#FEF3C7"/>
          <p style={{ margin:0, fontSize:"13px", fontWeight:700, color:"#fff" }}>
            Already Invited
          </p>
        </div>
        <button onClick={onClose}
          style={{ background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:"6px", padding:"5px", cursor:"pointer", display:"flex" }}>
          <X size={13} color="#fff"/>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding:"20px" }}>
        <p style={{ margin:"0 0 12px", fontSize:"13px", color:"#374151", lineHeight:1.6 }}>
          This candidate already has an active invite for{" "}
          <strong>{job.title}</strong> sent{" "}
          <strong>{daysAgo(existing.sent_at)}</strong>
          {" "}({new Date(existing.sent_at).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}).
        </p>
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:"8px",
          padding:"10px 12px", marginBottom:"16px" }}>
          <p style={{ margin:0, fontSize:"12px", color:"#92400E" }}>
            Status: <strong style={{ textTransform:"capitalize" }}>{existing.status}</strong>
            {" "} · Sending a new invite will create a duplicate.
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <button onClick={onBack}
            style={{ flex:1, padding:"9px", borderRadius:"8px",
              border:"1px solid #E5E7EB", background:"#fff",
              fontSize:"12px", fontWeight:600, cursor:"pointer", color:"#374151" }}>
            ← Back to Jobs
          </button>
          <button onClick={onConfirm}
            style={{ flex:1, padding:"9px", borderRadius:"8px", border:"none",
              background:"linear-gradient(135deg,#D97706,#B45309)",
              color:"#fff", fontSize:"12px", fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
            <RefreshCw size={12}/> Re-send Anyway
          </button>
        </div>
      </div>
    </div>
  </>
);

// ── Main gate component ───────────────────────────────────────
export const CandidateInviteGate: React.FC<CandidateInviteGateProps> = ({
  candidateName, candidateEmail, candidatePhone,
  candidate, apolloPersonId, organizationId: propOrgId, userId,
  onClose, onInviteSent,
}) => {
  const reduxOrgId     = useSelector((s: any) => s.auth.organization_id);
  const organizationId = propOrgId || reduxOrgId;

  const [selectedJob,    setSelectedJob]    = useState<JobOption | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ job: JobOption; existing: ExistingInvite } | null>(null);
  const [step,           setStep]           = useState<"pick_job" | "confirm_resend" | "invite">("pick_job");
  const [existingInvites,setExistingInvites]= useState<ExistingInvite[]>([]);

  const { upsert } = useUpsertSavedCandidate();

  // ── Fetch active invites for this candidate ───────────────
  useEffect(() => {
    if (!organizationId || (!candidateEmail && !candidatePhone)) return;
    getExistingInvites(organizationId, candidateEmail, candidatePhone)
      .then(setExistingInvites)
      .catch(() => {});
  }, [organizationId, candidateEmail, candidatePhone]);

  // ── Jobs query ────────────────────────────────────────────
  const { data: jobs = [] } = useQuery<JobOption[]>({
    queryKey: ["cs-jobs-for-invite", organizationId],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("hr_jobs")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(j => ({
        id:          j.id,
        title:       j.title,
        jobId:       j.job_id,
        location:    j.location,
        experience:  j.experience,
        skills:      j.skills,
        description: j.description,
        hiringMode:  j.hiring_mode,
        jobType:     j.job_type,
        clientDetails: j.client_details,
        noticePeriod: j.notice_period,
        department:   j.department,
      }));
    },
    enabled:   !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Job selected from picker ──────────────────────────────
  const handleJobSelect = (job: JobOption, existing: ExistingInvite | null) => {
    if (existing) {
      // Has active invite → show confirmation
      setPendingConfirm({ job, existing });
      setStep("confirm_resend");
    } else {
      proceedToInvite(job);
    }
  };

  const proceedToInvite = async (job: JobOption) => {
    setSelectedJob(job);
    setStep("invite");

    if (apolloPersonId && userId) {
      upsert({
        apolloPersonId, organizationId, savedBy: userId, saveType: "invited",
        candidate,
        email:       candidateEmail,
        emailSource: candidateEmail ? "manual" : undefined,
        phone:       candidatePhone,
        phoneSource: candidatePhone ? "manual" : undefined,
        linkedJobId: job.id,
        status:      "contacted",
      }).catch((e: any) =>
        console.warn("[CandidateInviteGate] invited upsert non-fatal:", e?.message)
      );
    }
  };

  if (step === "pick_job") {
    return (
      <JobPickerModal
        jobs={jobs}
        existingInvites={existingInvites}
        onSelect={handleJobSelect}
        onClose={onClose}
      />
    );
  }

  if (step === "confirm_resend" && pendingConfirm) {
    return (
      <ResendConfirmation
        job={pendingConfirm.job}
        existing={pendingConfirm.existing}
        onConfirm={() => { setPendingConfirm(null); proceedToInvite(pendingConfirm.job); }}
        onBack={() => { setPendingConfirm(null); setStep("pick_job"); }}
        onClose={onClose}
      />
    );
  }

  if (step === "invite" && selectedJob) {
    return (
      <InviteCandidateModal
        isOpen={true}
        onClose={() => {
          onInviteSent?.(selectedJob.id, selectedJob.id);
          onClose();
        }}
        jobId={selectedJob.id}
        job={selectedJob}
        prefillName={candidateName}
        prefillEmail={candidateEmail || ""}
        prefillPhone={candidatePhone || ""}
        inviteSource={"candidate_search" satisfies InviteSource}
        existingInvites={existingInvites}
      />
    );
  }

  return null;
};