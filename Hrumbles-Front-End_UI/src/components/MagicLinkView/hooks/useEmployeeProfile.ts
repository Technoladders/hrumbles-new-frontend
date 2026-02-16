// hooks/useEmployeeProfile.ts
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Candidate, DocumentState, ResumeAnalysis } from "@/components/MagicLinkView/types";
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

interface UseEmployeeProfileReturn {
  candidate: Candidate | null;
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  resumeAnalysis: ResumeAnalysis | null;
  loading: boolean;
  error: string | null;
  setDocuments: React.Dispatch<
    React.SetStateAction<{
      uan: DocumentState;
      pan: DocumentState;
      pf: DocumentState;
      esic: DocumentState;
    }>
  >;
  setCandidate: React.Dispatch<React.SetStateAction<Candidate | null>>;
}

const isValidCandidate = (data: any): data is Candidate => {
  return (
    data &&
    typeof data === "object" &&
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    (typeof data.experience === "string" || data.experience === undefined) &&
    (typeof data.matchScore === "number" || data.matchScore === undefined) &&
    (typeof data.appliedDate === "string" || data.appliedDate === undefined)
  );
};

export const useEmployeeProfile = (
  enabled: boolean
): UseEmployeeProfileReturn => {
  const { candidateId, jobId } = useParams<{
    candidateId: string;
    jobId: string;
  }>();
  const location = useLocation();
  const { toast } = useToast();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [documents, setDocuments] = useState<{
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  }>({
    uan: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
      isUANResultsOpen: false,
      results: [],
    },
    pan: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    pf: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
    esic: {
      value: "",
      isVerifying: false,
      isVerified: false,
      verificationDate: null,
      error: null,
      isEditing: false,
    },
  });
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(
    null
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      const authData = getAuthDataFromLocalStorage();
      // authData may be null in share mode (unauthenticated user)
      const organization_id = authData?.organization_id;
      const userId = authData?.userId;

      try {
        let candidateData: Candidate | null = null;
        let uanVerificationData: any = null;

        if (candidateId) {
          // ─── NORMAL MODE: Fetch from hr_job_candidates ───
          const state = location.state as { candidate?: Candidate };
          if (state?.candidate && isValidCandidate(state.candidate)) {
            candidateData = state.candidate;
          } else {
            const { data, error: candidateError } = await supabase
              .from("hr_job_candidates")
              .select(`*`)
              .eq("id", candidateId)
              .maybeSingle();

            if (candidateError || !data) {
              throw new Error(
                "Failed to fetch candidate data: " +
                  (candidateError?.message || "No data found")
              );
            }
            if (isValidCandidate(data)) {
              candidateData = data;
            } else {
              throw new Error("Invalid candidate data received from Supabase");
            }
          }
        } else {
          throw new Error(
            "No candidate data provided and no candidateId in URL"
          );
        }

        setCandidate(candidateData);

        // ─── UAN Verification ───
        if (candidateData?.id) {
          const { data: verificationData, error: verificationError } =
            await supabase
              .from("hr_dual_uan_verifications")
              .select("uan, created_at, msg")
              .eq("candidate_id", candidateData.id)
              .eq("status", 1)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

          if (verificationError && verificationError.code !== "PGRST116") {
            console.error(
              "Supabase Dual UAN verification fetch error:",
              verificationError
            );
          } else if (verificationData) {
            uanVerificationData = verificationData;
          }
        }

        // ─── Set Documents ───
        setDocuments((prev) => ({
          uan: {
            ...prev.uan,
            value: candidateData?.metadata?.uan || uanVerificationData?.uan || "",
            isVerified: !!uanVerificationData,
            verificationDate: uanVerificationData
              ? new Date(uanVerificationData.created_at).toLocaleString()
              : null,
            isUANResultsOpen: !!uanVerificationData,
            results: uanVerificationData?.msg || [],
          },
          pan: {
            ...prev.pan,
            value: candidateData?.metadata?.pan || "",
          },
          pf: {
            ...prev.pf,
            value: candidateData?.metadata?.pf || "",
          },
          esic: {
            ...prev.esic,
            value: candidateData?.metadata?.esicNumber || "",
          },
        }));

        // ─── RESUME ANALYSIS FETCH ───
        const effectiveJobId = jobId;

        if (effectiveJobId && candidateData?.id) {
          console.log("%c[Debug] Starting resume analysis fetch...", "color: blue; font-weight: bold;");

          // 1. Primary Query: candidate_resume_analysis
          const { data: primaryDataArray, error: primaryResumeError } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", candidateData.id)
            .eq("job_id", effectiveJobId);

          console.log("[Debug] Primary query returned:", {
            data: primaryDataArray,
            error: primaryResumeError,
          });

          if (primaryDataArray && primaryDataArray.length > 0) {
            console.log("%c[Debug] Found data in primary table.", "color: green;");
            setResumeAnalysis(primaryDataArray[0] as ResumeAnalysis);
          } else {
            // 2. Fallback: resume_analysis table
            console.log("%c[Debug] Primary empty. Attempting fallback.", "color: orange;");

            const effectiveOrgId = organization_id;

            if (candidateData.email && effectiveOrgId) {
              const { data: fallbackResumeData, error: fallbackResumeError } = await supabase
                .from("resume_analysis")
                .select("*")
                .eq("job_id", effectiveJobId)
                .eq("organization_id", effectiveOrgId)
                .eq("email", candidateData.email)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              console.log("[Debug] Fallback query returned:", {
                data: fallbackResumeData,
                error: fallbackResumeError,
              });

              if (fallbackResumeData) {
                setResumeAnalysis(fallbackResumeData as ResumeAnalysis);
              }
            }
          }
        }

      } catch (err: any) {
        console.error("Error fetching employee profile:", err);
        setError(err.message || "Failed to load employee data.");
        toast({
          title: "Error",
          description: err.message || "Failed to load employee data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [enabled, candidateId, jobId, location.state, toast]);

  return { candidate, documents, resumeAnalysis, loading, error, setDocuments, setCandidate };
};