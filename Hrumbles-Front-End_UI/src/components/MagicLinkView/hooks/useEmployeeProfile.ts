// hooks/useEmployeeProfile.ts
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Candidate, DocumentState, ResumeAnalysis } from "@/components/MagicLinkView/types"; // Assuming types are in lib/types.ts
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

// hooks/useEmployeeProfile.ts

useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      const authData = getAuthDataFromLocalStorage();
          if (!authData) {
            throw new Error('Failed to retrieve authentication data');
          }
          const { organization_id, userId } = authData;
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
  .select(`*`) // <-- Replace "*" with this explicit list
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

        // --- MODIFIED SECTION: Fetch resume analysis with fallback ---
 // --- START OF REVISED SECTION WITH DEBUGGING ---
        if (!shareMode && jobId && candidateData?.id) {
          console.log("%c[Debug] Starting resume analysis fetch...", "color: blue; font-weight: bold;");

          // 1. Primary Query
          const { data: primaryDataArray, error: primaryResumeError } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", candidateData.id)
            .eq("job_id", jobId);

          console.log("[Debug] Primary query to 'candidate_resume_analysis' returned:", {
            data: primaryDataArray,
            error: primaryResumeError,
          });

          // 2. The crucial check: Is the result array empty or null?
          if (primaryDataArray && primaryDataArray.length > 0) {
            console.log("%c[Debug] Found data in primary table. Setting state.", "color: green;");
            setResumeAnalysis(primaryDataArray[0] as ResumeAnalysis);
          } else {
            // 3. This block now correctly runs if the primary query returns [] or null.
            console.log("%c[Debug] Primary check failed. Attempting fallback.", "color: orange;");

            // Add a specific log to check the exact values being used for the fallback condition.
            console.log("[Debug] Checking fallback conditions with:", {
                email: candidateData.email,
                organization_id: candidateData.organization_id,
            });

            if (candidateData.email && organization_id) {
              console.log(`[Debug] Fallback triggered: Searching 'resume_analysis' for email: ${candidateData.email}`);

              // 4. Fallback Query
              const { data: fallbackResumeData, error: fallbackResumeError } = await supabase
                .from("resume_analysis")
                .select("*")
                .eq("job_id", jobId)
                .eq("organization_id", organization_id)
                .eq("email", candidateData.email)
                .order("updated_at", { ascending: false })
  .limit(1)
  .maybeSingle();

              console.log("[Debug] Fallback query to 'resume_analysis' returned:", {
                  data: fallbackResumeData,
                  error: fallbackResumeError,
              });

              if (fallbackResumeData) {
                console.log("%c[Debug] Found data in fallback table. Setting state.", "color: green;");
                setResumeAnalysis(fallbackResumeData as ResumeAnalysis);
              } else {
                console.log("[Debug] No data found in fallback table.");
              }
            } else {
              console.log("%c[Debug] Fallback skipped: Candidate is missing email or organization_id.", "color: red;");
            }
          }
        }
        // --- END OF REVISED SECTION ---

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