// hooks/useShareLink.ts
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Candidate, DataSharingOptions } from "@/components/MagicLinkView/types"; // Assuming types are here

interface UseShareLinkReturn {
  isSharing: boolean;
  magicLink: string | null;
  isCopied: boolean;
  setShowDataSelection: React.Dispatch<React.SetStateAction<boolean>>;
  showDataSelection: boolean;
  generateMagicLink: (
    dataOptions: DataSharingOptions,
    candidate: Candidate,
    jobId: string | undefined,
    organizationId: string
  ) => Promise<void>;
  copyMagicLink: () => void;
  currentDataOptions: DataSharingOptions;
  setCurrentDataOptions: React.Dispatch<React.SetStateAction<DataSharingOptions>>;
}

export const useShareLink = (
  initialSharedDataOptions?: DataSharingOptions
): UseShareLinkReturn => {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [currentDataOptions, setCurrentDataOptions] =
    useState<DataSharingOptions>(
      initialSharedDataOptions || {
        personalInfo: true,
        contactInfo: true,
        documentsInfo: true,
        workInfo: true,
        skillinfo: true,
      }
    );

  const generateMagicLink = async (
    dataOptions: DataSharingOptions,
    candidate: Candidate,
    jobId: string | undefined,
    organizationId: string
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
      expiryDate.setDate(expiryDate.getDate() + 2); // Expires in 2 days

      const { error } = await supabase.from("shares").insert({
        share_id: shareId,
        expiry_date: expiryDate.getTime(),
        data_options: dataOptions,
        candidate,
        organization_id: organizationId,
      });

      if (error) {
        throw error;
      }

      const shortLink = `${window.location.origin}/share/${shareId}?expires=${expiryDate.getTime()}${
        jobId ? `&jobId=${jobId}` : ""
      }`;

      setMagicLink(shortLink);
      setIsSharing(false);

      toast({
        title: "Magic Link Created",
        description:
          "A shareable link with your selected data has been created. It will expire in 2 days.",
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
    setShowDataSelection,
    showDataSelection,
    generateMagicLink,
    copyMagicLink,
    currentDataOptions,
    setCurrentDataOptions,
  };
};