// src/hooks/useOrganizationStatusIds.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // adjust path

interface StatusIds {
  offeredMainId: string | null;
  joinedMainId: string | null;
  offerIssuedSubId: string | null;
  joinedSubId: string | null;
}

const fetchStatusIds = async (orgId: string): Promise<StatusIds> => {
  const { data, error } = await supabase
    .from("job_statuses")
    .select("id, name, type, parent_id")
    .eq("organization_id", orgId);

  if (error) throw new Error(error.message);

  // Helper to find a status by name & type (optional parent check for sub-statuses)
  const find = (name: string, type: "main" | "sub", parentName?: string) =>
    (data ?? []).find(
      (s) =>
        s.name === name &&
        s.type === type &&
        (!parentName || s.parent_id === (data ?? []).find(p => p.name === parentName && p.type === "main")?.id)
    )?.id ?? null;

  return {
    offeredMainId: find("Offered", "main"),
    joinedMainId: find("Joined", "main"),
    offerIssuedSubId: find("Offer Issued", "sub", "Offered"),
    joinedSubId: find("Joined", "sub", "Joined"),
  };
};

export const useOrganizationStatusIds = (orgId: string | undefined) =>
  useQuery({
    queryKey: ["organization-status-ids", orgId],
    queryFn: () => fetchStatusIds(orgId!),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes – statuses rarely change
  });