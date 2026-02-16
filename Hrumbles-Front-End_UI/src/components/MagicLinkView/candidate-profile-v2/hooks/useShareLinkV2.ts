import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/**
 * useShareLinkV2 — Generates share links with optional password protection & custom expiry.
 *
 * DataSharingOptions is the SINGLE SOURCE OF TRUTH for all share visibility gating.
 * All V2 components should import this interface from here.
 */

export interface DataSharingOptions {
  personalInfo: boolean;       // Name, role, salary, notice period, experience
  contactInfo: boolean;        // Email, phone, LinkedIn
  documentsInfo: boolean;      // PAN, UAN, PF, ESIC (from metadata jsonb)
  workInfo: boolean;           // Employment history, work timeline
  skillinfo: boolean;          // Skills, skill ratings, competency data
  resumeAnalysis: boolean;     // AI scoring, matched skills, gaps, recommendations
  resumeAttachment: boolean;   // Resume PDF preview & download
  maskContact: boolean;        // Mask email/phone partially (j***@g***.com)
  bgvResults: boolean;         // BGV verification results (UAN, employment history)
}

interface UseShareLinkV2Return {
  isSharing: boolean;
  magicLink: string | null;
  isCopied: boolean;
  showDataSelection: boolean;
  setShowDataSelection: React.Dispatch<React.SetStateAction<boolean>>;
  generateMagicLink: (
    dataOptions: DataSharingOptions,
    candidate: any,
    jobId: string | undefined,
    organizationId: string,
    password?: string,
    expiryDays?: number
  ) => Promise<void>;
  copyMagicLink: () => void;
  currentDataOptions: DataSharingOptions;
  setCurrentDataOptions: React.Dispatch<React.SetStateAction<DataSharingOptions>>;
  sharePassword: string | null;
}

/* ─── SHA-256 hash via Web Crypto API ─── */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Default sharing options — used when no initialSharedDataOptions provided */
export const DEFAULT_SHARE_OPTIONS: DataSharingOptions = {
  personalInfo: true,
  contactInfo: true,
  documentsInfo: true,
  workInfo: true,
  skillinfo: true,
  resumeAnalysis: true,
  resumeAttachment: true,
  maskContact: false,
  bgvResults: false,
};

export const useShareLinkV2 = (
  initialSharedDataOptions?: DataSharingOptions
): UseShareLinkV2Return => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [sharePassword, setSharePassword] = useState<string | null>(null);
  const [currentDataOptions, setCurrentDataOptions] =
    useState<DataSharingOptions>(initialSharedDataOptions || DEFAULT_SHARE_OPTIONS);

  const generateMagicLink = async (
    dataOptions: DataSharingOptions,
    candidate: any,
    jobId: string | undefined,
    organizationId: string,
    password?: string,
    expiryDays?: number
  ) => {
    if (!candidate) {
      toast({
        title: "Error",
        description: "No candidate data available to share.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    setCurrentDataOptions(dataOptions);

    try {
      const uuid = crypto.randomUUID();
      const shareId = `${uuid}-${Date.now()}`;
      const expiryDate = new Date();
      const days = expiryDays && expiryDays > 0 ? expiryDays : 2;
      expiryDate.setDate(expiryDate.getDate() + days);

      // Hash password if provided
      let passwordHash: string | null = null;
      if (password && password.trim().length > 0) {
        passwordHash = await hashPassword(password.trim());
        setSharePassword(password.trim());
      } else {
        setSharePassword(null);
      }

      const insertPayload: any = {
        share_id: shareId,
        expiry_date: expiryDate.getTime(),
        data_options: dataOptions,
        candidate,
        organization_id: organizationId,
        share_password_hash: passwordHash,
      };

      const { error } = await supabase.from("shares").insert(insertPayload);

      if (error) throw error;

      const shortLink = `${window.location.origin}/share-v2/${shareId}?expires=${expiryDate.getTime()}${
        jobId ? `&jobId=${jobId}` : ""
      }`;

      setMagicLink(shortLink);
      setIsSharing(false);

      toast({
        title: "Magic Link Created",
        description: password
          ? `A password-protected link has been created. It will expire in ${days} day${days > 1 ? "s" : ""}.`
          : `A shareable link has been created. It will expire in ${days} day${days > 1 ? "s" : ""}.`,
      });
    } catch (error: any) {
      console.error("Error generating magic link:", error);
      setIsSharing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to create magic link.",
        variant: "destructive",
      });
    }
  };

  const copyMagicLink = () => {
    if (magicLink) {
      navigator.clipboard.writeText(magicLink);
      setIsCopied(true);
      toast({
        title: "Link Copied",
        description: "Magic link copied to clipboard.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return {
    isSharing,
    magicLink,
    isCopied,
    showDataSelection,
    setShowDataSelection,
    generateMagicLink,
    copyMagicLink,
    currentDataOptions,
    setCurrentDataOptions,
    sharePassword,
  };
};