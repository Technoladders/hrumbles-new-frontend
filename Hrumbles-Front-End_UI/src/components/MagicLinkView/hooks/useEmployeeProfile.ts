// hooks/useEmployeeProfile.ts
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Candidate, DocumentState, ResumeAnalysis } from "@/components/MagicLinkView/types"; // Assuming types are in lib/types.ts

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
  // Add other setters if needed for external manipulation
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
  shareMode: boolean,
  shareId?: string,
  initialSharedDataOptions?: any
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      try {
        let candidateData: Candidate | null = null;
        let uanVerificationData: any = null;

        if (shareMode && shareId) {
          const { data, error: shareError } = await supabase
            .from("shares")
            .select("data_options, candidate")
            .eq("share_id", shareId)
            .single();

          if (shareError) {
            throw shareError;
          }

          if (data && isValidCandidate(data.candidate)) {
            candidateData = data.candidate;
            // setSharedDataOptions(data.data_options as DataSharingOptions); // This needs to be handled by parent or a separate hook
            // setCurrentDataOptions(data.data_options as DataSharingOptions); // This too
          } else {
            throw new Error("Invalid shared data or link.");
          }
        } else if (candidateId) {
          const state = location.state as { candidate?: Candidate };
          if (state?.candidate && isValidCandidate(state.candidate)) {
            candidateData = state.candidate;
          } else {
            const { data, error: candidateError } = await supabase
              .from("hr_job_candidates")
              .select("*")
              .eq("id", candidateId)
              .single();

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
            "No candidate data provided and no candidateId/shareId in URL"
          );
        }

        setCandidate(candidateData);

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
            // Don't throw fatal error for UAN, just log
          } else if (verificationData) {
            uanVerificationData = verificationData;
          }
        }

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

        // Fetch resume analysis if not in share mode or allowed by options
        if (!shareMode && jobId && candidateData?.id) {
          const { data: resumeData, error: resumeError } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", candidateData.id)
            .eq("job_id", jobId)
            .single();

          if (resumeError && resumeError.code !== "PGRST116") {
            console.warn(
              "No resume analysis found for candidate and job:",
              resumeError?.message
            );
          } else if (resumeData) {
            setResumeAnalysis(resumeData as ResumeAnalysis);
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
  }, [candidateId, jobId, shareMode, shareId, location.state, toast]);

  return { candidate, documents, resumeAnalysis, loading, error, setDocuments, setCandidate };
};