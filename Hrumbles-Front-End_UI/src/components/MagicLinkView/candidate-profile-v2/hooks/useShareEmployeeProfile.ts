/**
 * useShareEmployeeProfile — Public (unauthenticated) hook for shared profile viewing.
 *
 * Unlike useEmployeeProfile, this hook:
 *   1. Does NOT use localStorage or any auth context
 *   2. Fetches candidate data from `shares` table only
 *   3. Fetches resume analysis using org_id from the share record
 *   4. Fetches BGV verification results from `uanlookups` table (read-only)
 *   5. Returns bgvResults for display in V2BgvResults component
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Candidate, DocumentState, ResumeAnalysis } from "@/components/MagicLinkView/types";

export interface BgvResultItem {
  status: string;
  data: any;
  meta: {
    timestamp: string;
    inputValue: string;
  };
}

export interface BgvResults {
  [lookupType: string]: BgvResultItem[];
}

interface UseShareEmployeeProfileReturn {
  candidate: Candidate | null;
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  resumeAnalysis: ResumeAnalysis | null;
  bgvResults: BgvResults;
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
    typeof data.name === "string"
  );
};

const BGV_LOOKUP_TYPES = [
  "mobile_to_uan",
  "pan_to_uan",
  "uan_full_history",
  "latest_employment_mobile",
  "latest_passbook_mobile",
  "latest_employment_uan",
  "uan_full_history_gl",
];

const defaultDocState = (value = ""): DocumentState => ({
  value,
  isVerifying: false,
  isVerified: false,
  verificationDate: null,
  error: null,
  isEditing: false,
});

export const useShareEmployeeProfile = (
  shareId?: string,
  dataOptions?: any
): UseShareEmployeeProfileReturn => {
  const [searchParams] = useSearchParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [documents, setDocuments] = useState<{
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  }>({
    uan: { ...defaultDocState(), isUANResultsOpen: false, results: [] },
    pan: defaultDocState(),
    pf: defaultDocState(),
    esic: defaultDocState(),
  });
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [bgvResults, setBgvResults] = useState<BgvResults>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      if (!shareId) {
        setError("No share ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // ─── 1. Fetch share record ───
        const { data: shareData, error: shareError } = await supabase
          .from("shares")
          .select("data_options, candidate, organization_id")
          .eq("share_id", shareId)
          .single();

        if (shareError || !shareData) {
          throw new Error("Share not found or invalid link.");
        }

        if (!isValidCandidate(shareData.candidate)) {
          throw new Error("Invalid shared candidate data.");
        }

        const candidateData: Candidate = shareData.candidate;
        const shareOrgId = shareData.organization_id;
        const parsedOptions =
          typeof shareData.data_options === "string"
            ? JSON.parse(shareData.data_options)
            : shareData.data_options;

        setCandidate(candidateData);

        // ─── 2. Set documents from metadata ───
        setDocuments({
          uan: {
            ...defaultDocState(candidateData?.metadata?.uan || ""),
            isUANResultsOpen: false,
            results: [],
          },
          pan: defaultDocState(candidateData?.metadata?.pan || ""),
          pf: defaultDocState(candidateData?.metadata?.pf || ""),
          esic: defaultDocState(candidateData?.metadata?.esicNumber || ""),
        });

        // ─── 3. Fetch resume analysis (if enabled in share options) ───
        const jobId = searchParams.get("jobId");
        const shouldFetchAnalysis = parsedOptions?.resumeAnalysis !== false;

        if (shouldFetchAnalysis && jobId && candidateData.id) {
          // Primary: candidate_resume_analysis
          const { data: primaryData } = await supabase
            .from("candidate_resume_analysis")
            .select("*")
            .eq("candidate_id", candidateData.id)
            .eq("job_id", jobId);

          if (primaryData && primaryData.length > 0) {
            setResumeAnalysis(primaryData[0] as ResumeAnalysis);
          } else if (candidateData.email && shareOrgId) {
            // Fallback: resume_analysis table
            const { data: fallbackData } = await supabase
              .from("resume_analysis")
              .select("*")
              .eq("job_id", jobId)
              .eq("organization_id", shareOrgId)
              .eq("email", candidateData.email)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (fallbackData) {
              setResumeAnalysis(fallbackData as ResumeAnalysis);
            }
          }
        }

        // ─── 4. Fetch BGV results (if enabled in share options) ───
        const shouldFetchBgv = parsedOptions?.bgvResults !== false;

        if (shouldFetchBgv && candidateData.id) {
          const { data: bgvData, error: bgvError } = await supabase
            .from("uanlookups")
            .select("lookup_type, response_data, created_at, lookup_value")
            .eq("candidate_id", candidateData.id)
            .in("lookup_type", BGV_LOOKUP_TYPES)
            .order("created_at", { ascending: false });

          if (!bgvError && bgvData) {
            const grouped: BgvResults = {};
            for (const res of bgvData) {
              if (!grouped[res.lookup_type]) {
                grouped[res.lookup_type] = [];
              }
              grouped[res.lookup_type].push({
                status: "completed",
                data: res.response_data,
                meta: {
                  timestamp: res.created_at,
                  inputValue: res.lookup_value,
                },
              });
            }
            setBgvResults(grouped);
          }
        }
      } catch (err: any) {
        console.error("Error fetching shared profile:", err);
        setError(err.message || "Failed to load shared profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [shareId, searchParams]);

  return {
    candidate,
    documents,
    resumeAnalysis,
    bgvResults,
    loading,
    error,
    setDocuments,
    setCandidate,
  };
};