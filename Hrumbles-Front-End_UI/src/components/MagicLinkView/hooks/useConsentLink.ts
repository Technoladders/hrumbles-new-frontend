import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Candidate } from "@/components/MagicLinkView/types";

interface UseConsentLinkReturn {
  isRequesting: boolean;
  consentLink: string | null;
  isCopied: boolean;
  generateConsentLink: (candidate: Candidate, organizationId: string) => Promise<void>;
  copyConsentLink: () => void;
  setConsentLink: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useConsentLink = (): UseConsentLinkReturn => {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [consentLink, setConsentLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateConsentLink = async (candidate: Candidate, organizationId: string) => {
    if (!candidate?.id || !organizationId) {
      toast({ title: "Error", description: "Missing candidate or organization details.", variant: "destructive" });
      return;
    }

    setIsRequesting(true);
    setConsentLink(null);

    try {
      // Set link to expire in 7 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      // 1. Insert a new consent request record
      const { data, error: insertError } = await supabase
        .from("candidate_consents")
        .insert({
          candidate_id: candidate.id,
          organization_id: organizationId,
          expires_at: expiryDate.toISOString(),
        })
        .select('consent_id')
        .single();
      
      if (insertError) throw insertError;
      if (!data) throw new Error("Failed to create consent record.");

      const { consent_id } = data;

      // 2. Update the candidate's status to 'pending'
      const { error: updateError } = await supabase
        .from('hr_job_candidates')
        .update({ consent_status: 'pending' })
        .eq('id', candidate.id);
      
      if (updateError) {
          // You might want to add logic here to delete the created consent record for consistency
          console.error("Failed to update candidate status, but consent record was created.");
          throw updateError;
      }

      const newConsentLink = `${window.location.origin}/consent/${consent_id}`;
      setConsentLink(newConsentLink);

      toast({
        title: "Consent Link Generated",
        description: "A link has been created to request the candidate's consent. It will expire in 7 days.",
      });

    } catch (error: any) {
      console.error("Error generating consent link:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create consent link.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const copyConsentLink = () => {
    if (consentLink) {
      navigator.clipboard.writeText(consentLink);
      setIsCopied(true);
      toast({ title: "Link Copied", description: "Consent link copied to clipboard." });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return {
    isRequesting,
    consentLink,
    isCopied,
    generateConsentLink,
    copyConsentLink,
    setConsentLink,
  };
};