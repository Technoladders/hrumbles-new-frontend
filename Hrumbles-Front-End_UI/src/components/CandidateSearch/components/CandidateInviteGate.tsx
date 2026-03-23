/**
 * CandidateInviteGate.tsx
 *
 * Self-contained invite flow for candidate search:
 *   Step 1: JobPickerModal — pick which job to invite for
 *   Step 2: InviteCandidateModal — send the invite
 *
 * Completely independent — does NOT import from ZiveXResultsPage or jobs.
 * Uses InviteCandidateModal directly (that modal is generic enough).
 * Uses inviteSource: 'candidate_search' (new source type).
 */

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Search, Briefcase } from "lucide-react";
import InviteCandidateModal from "@/components/jobs/job/invite/InviteCandidateModal";
import type { InviteSource } from "@/services/inviteService";
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
  candidate?:       ApolloCandidate;   // for snapshot + saved_candidates upsert
  apolloPersonId?:  string;            // for saved_candidates upsert
  organizationId?:  string;
  userId?:          string;
  onClose:          () => void;
  onInviteSent?:    (inviteId: string, jobId: string) => void; // callback after sent
}

// ─── Job Picker Modal ─────────────────────────────────────────────────────────
const JobPickerModal: React.FC<{
  jobs:     JobOption[];
  onSelect: (j: JobOption) => void;
  onClose:  () => void;
}> = ({ jobs, onSelect, onClose }) => {
  const [q, setQ] = useState("");
  const filtered  = jobs.filter(j =>
    j.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100 }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 1101, width: "calc(100vw - 32px)", maxWidth: "420px",
        background: "#fff", borderRadius: "14px",
        boxShadow: "0 20px 56px rgba(0,0,0,0.22)", overflow: "hidden",
        fontFamily: "inherit",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid #F3F4F6",
          background: "linear-gradient(135deg,#6D28D9,#7C3AED)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#fff" }}>
              Select Job — Invite Candidate
            </p>
            <p style={{ margin: "1px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>
              Choose which job this invite is for
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "6px", padding: "5px", cursor: "pointer", display: "flex" }}
          >
            <X size={13} color="#fff" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: "22px", top: "50%",
            transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search active jobs…"
            style={{ width: "100%", padding: "7px 10px 7px 28px", borderRadius: "7px",
              border: "1px solid #E5E7EB", fontSize: "12px", outline: "none",
              boxSizing: "border-box", background: "#F9FAFB" }}
          />
        </div>

        {/* List */}
        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#9CA3AF", fontSize: "12px" }}>
              No active jobs found
            </div>
          ) : filtered.map((j, i) => (
            <button
              key={j.id}
              onClick={() => onSelect(j)}
              style={{ width: "100%", padding: "10px 14px", border: "none", background: "none",
                textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                borderBottom: i < filtered.length - 1 ? "1px solid #F9FAFB" : "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F5F3FF")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EDE9FE",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase size={14} color="#7C3AED" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#111827",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {j.title}
                </p>
                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "10px", color: "#9CA3AF", fontFamily: "monospace" }}>{j.jobId}</span>
                  {j.hiringMode && (
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px",
                      borderRadius: "99px", background: "#EDE9FE", color: "#7C3AED" }}>
                      {j.hiringMode}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "18px", color: "#C4B5FD", flexShrink: 0 }}>›</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #F3F4F6", background: "#FAFAFA",
          display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 16px", borderRadius: "7px", border: "1px solid #E5E7EB",
              background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#6B7280" }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Main gate component ──────────────────────────────────────────────────────
export const CandidateInviteGate: React.FC<CandidateInviteGateProps> = ({
  candidateName, candidateEmail, candidatePhone,
  candidate, apolloPersonId, organizationId: propOrgId, userId,
  onClose, onInviteSent,
}) => {
  const reduxOrgId     = useSelector((s: any) => s.auth.organization_id);
  const organizationId = propOrgId || reduxOrgId;
  const [selectedJob, setSelectedJob] = useState<JobOption | null>(null);
  const [step, setStep] = useState<"pick_job" | "invite">("pick_job");
  const { upsert } = useUpsertSavedCandidate();

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
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const handleJobSelect = async (job: JobOption) => {
    setSelectedJob(job);
    setStep("invite");

    // Save as 'invited' immediately when job is selected.
    // We do this here rather than after InviteCandidateModal.onClose because
    // InviteCandidateModal.onClose is () => void and never passes back inviteId.
    // Selecting a job = clear intent to invite. The invite modal may still be
    // cancelled, but the candidate is already shortlisted so this is acceptable.
    if (apolloPersonId && userId) {
      upsert({
        apolloPersonId,
        organizationId,
        savedBy:     userId,
        saveType:    "invited",
        candidate,
        email:       candidateEmail,
        emailSource: candidateEmail ? "manual" : undefined,
        phone:       candidatePhone,
        phoneSource: candidatePhone ? "manual" : undefined,
        linkedJobId: job.id,   // auto-creates job folder in edge function
        status:      "contacted",
      }).then(savedId => {
        // If upsert returns an id and user completes the invite,
        // onInviteSent can be called with the job info.
        // We don't have inviteId here but folder + job link is set.
      }).catch((e: any) =>
        console.warn("[CandidateInviteGate] invited upsert non-fatal:", e?.message)
      );
    }
  };

  if (step === "pick_job") {
    return (
      <JobPickerModal
        jobs={jobs}
        onSelect={handleJobSelect}
        onClose={onClose}
      />
    );
  }

  if (step === "invite" && selectedJob) {
    return (
      <InviteCandidateModal
        isOpen={true}
        onClose={() => {
          // After invite modal closes (sent or cancelled), notify parent.
          // The 'invited' save_type was already set in handleJobSelect.
          onInviteSent?.(selectedJob.id, selectedJob.id);
          onClose();
        }}
        jobId={selectedJob.id}
        job={selectedJob}
        prefillName={candidateName}
        prefillEmail={candidateEmail || ""}
        prefillPhone={candidatePhone || ""}
        inviteSource={"candidate_search" satisfies InviteSource}
      />
    );
  }

  return null;
};