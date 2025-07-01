// hooks/useDocumentVerification.ts
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { verifyDualUAN } from "@/components/MagicLinkView/services/VerificationServices"; // Import from service
import { DocumentState, WorkHistory, Candidate } from "@/components/MagicLinkView/types"; // Assuming types are here

interface UseDocumentVerificationReturn {
  documents: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  };
  setDocuments: React.Dispatch<
    React.SetStateAction<{
      uan: DocumentState;
      pan: DocumentState;
      pf: DocumentState;
      esic: DocumentState;
    }>
  >;
  handleDocumentChange: (type: keyof typeof documents, value: string) => void;
  toggleEditing: (type: keyof typeof documents) => void;
  toggleUANResults: () => void;
  verifyDocument: (
    type: keyof typeof documents,
    candidateId: string,
    workHistory: WorkHistory[],
    candidate: Candidate | null,
    organizationId: string
  ) => Promise<void>;
  saveDocuments: (candidateId: string, candidateMetadata: any) => Promise<void>;
  isSavingDocuments: boolean;
}

export const useDocumentVerification = (
  initialDocuments: {
    uan: DocumentState;
    pan: DocumentState;
    pf: DocumentState;
    esic: DocumentState;
  },
  shareMode: boolean
): UseDocumentVerificationReturn => {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isSavingDocuments, setIsSavingDocuments] = useState(false);
  const { toast } = useToast();

  const handleDocumentChange = (type: keyof typeof documents, value: string) => {
    if (shareMode) return;
    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        value,
      },
    }));
  };

  const toggleEditing = (type: keyof typeof documents) => {
    if (shareMode) return;
    if (documents[type].isVerified) {
      toast({
        title: "Cannot edit verified document",
        description: "Please contact HR to update verified documents.",
        variant: "destructive",
      });
      return;
    }
    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isEditing: !prev[type].isEditing,
      },
    }));
  };

  const toggleUANResults = () => {
    setDocuments((prev) => ({
      ...prev,
      uan: {
        ...prev.uan,
        isUANResultsOpen: !prev.uan.isUANResultsOpen,
      },
    }));
  };

  const getLatestEmployer = (workHistory: WorkHistory[]): string => {
    if (!workHistory.length) return "";
    const sortedHistory = [...workHistory].sort((a, b) => {
      const startYearA = parseInt(a.years.split("-")[0], 10) || 0;
      const startYearB = parseInt(b.years.split("-")[0], 10) || 0;
      return startYearB - startYearA;
    });
    return sortedHistory[0].company_name;
  };

  const verifyDocument = async (
    type: keyof typeof documents,
    candidateId: string,
    workHistory: WorkHistory[],
    candidate: Candidate | null,
    organizationId: string
  ) => {
    if (shareMode) return;
    if (!documents[type].value.trim()) {
      toast({
        title: "Validation Error",
        description: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } number cannot be empty.`,
        variant: "destructive",
      });
      return;
    }

    setDocuments((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isVerifying: true,
        error: null,
      },
    }));

    if (type === "uan") {
      try {
        const transID = crypto.randomUUID();
        const employer_name = getLatestEmployer(workHistory);
        if (!employer_name) {
          throw new Error("No employer name available from work history");
        }
        const result = await verifyDualUAN(
          transID,
          documents.uan.value,
          employer_name,
          candidateId,
          organizationId
        );

        setDocuments((prev) => ({
          ...prev,
          uan: {
            ...prev.uan,
            isVerifying: false,
            isVerified: true,
            verificationDate: new Date().toLocaleString(),
            error: null,
            isEditing: false,
            isUANResultsOpen: true,
            results: result.msg || [],
          },
        }));

        toast({
          title: "Dual Employment Verification Successful",
          description: `UAN number verified successfully.`,
        });
      } catch (error: any) {
        setDocuments((prev) => ({
          ...prev,
          uan: {
            ...prev.uan,
            isVerifying: false,
            isVerified: false,
            error:
              error.message ||
              "Dual UAN verification failed. Please check the number and try again.",
            isUANResultsOpen: false,
            results: [],
          },
        }));
        toast({
          title: "Verification Failed",
          description:
            error.message ||
            "Dual UAN verification failed. Please check the number and try again.",
          variant: "destructive",
        });
      }
    } else {
      // Simulate other document verifications
      setTimeout(() => {
        const isSuccess = Math.random() > 0.3;
        setDocuments((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isVerifying: false,
            isVerified: isSuccess,
            verificationDate: isSuccess ? new Date().toLocaleString() : null,
            error: isSuccess
              ? null
              : "Verification failed. Please check the document number.",
            isEditing: false,
          },
        }));
        toast({
          title: isSuccess ? "Verification Successful" : "Verification Failed",
          description: isSuccess
            ? `${
                type.charAt(0).toUpperCase() + type.slice(1)
              } number has been verified successfully.`
            : "Unable to verify document. Please check the number and try again.",
          variant: isSuccess ? "default" : "destructive",
        });
      }, 1500);
    }
  };

  const saveDocuments = async (candidateId: string, candidateMetadata: any) => {
    if (shareMode || !candidateId) return;
    setIsSavingDocuments(true);

    try {
      const updatedMetadata = {
        ...candidateMetadata,
        uan: documents.uan.value || null,
        pan: documents.pan.value || null,
        pf: documents.pf.value || null,
        esicNumber: documents.esic.value || null,
      };

      const { error } = await supabase
        .from("hr_job_candidates")
        .update({
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", candidateId);

      if (error) {
        throw new Error("Failed to update document data: " + error.message);
      }

      toast({
        title: "Documents Updated",
        description: "Document numbers have been successfully updated.",
      });

      setDocuments((prev) => ({
        uan: { ...prev.uan, isEditing: false },
        pan: { ...prev.pan, isEditing: false },
        pf: { ...prev.pf, isEditing: false },
        esic: { ...prev.esic, isEditing: false },
      }));
    } catch (err: any) {
      console.error("Error saving documents:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save document data.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDocuments(false);
    }
  };

  return {
    documents,
    setDocuments,
    handleDocumentChange,
    toggleEditing,
    toggleUANResults,
    verifyDocument,
    saveDocuments,
    isSavingDocuments,
  };
};