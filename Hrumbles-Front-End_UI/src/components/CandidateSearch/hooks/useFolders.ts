/**
 * useFolders.ts
 * Fetches candidate_folders with candidate counts for the sidebar.
 * Uses get_folder_counts() RPC (migration 005).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FOLDERS_QUERY_KEY = "candidate-folders";

export interface FolderItem {
  folderId:       string;
  folderName:     string;
  folderColor:    string;
  linkedJobId:    string | null;
  linkedJobTitle: string | null;
  isDefault:      boolean;
  candidateCount: number;
  createdAt:      string;
}

export function useFolders(
  organizationId: string | null | undefined,
  savedBy:        string | null | undefined
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey:  [FOLDERS_QUERY_KEY, organizationId],
    queryFn:   async () => {
      if (!organizationId) return [] as FolderItem[];
      const { data, error } = await supabase.rpc("get_folder_counts", { p_org_id: organizationId });
      if (error) throw error;
      // RPC returns snake_case — map to camelCase
      return ((data as any[]) || []).map(r => ({
        folderId:       r.folder_id,
        folderName:     r.folder_name,
        folderColor:    r.folder_color ?? "#7C3AED",
        linkedJobId:    r.linked_job_id   ?? null,
        linkedJobTitle: r.linked_job_title ?? null,
        isDefault:      r.is_default,
        candidateCount: Number(r.candidate_count),
        createdAt:      r.created_at,
      })) as FolderItem[];
    },
    enabled:   !!organizationId,
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });

  const createFolder = async (name: string, color = "#7C3AED"): Promise<string | null> => {
    if (!organizationId || !savedBy) return null;
    const { data, error } = await supabase
      .from("candidate_folders")
      .insert({ organization_id: organizationId, created_by: savedBy, name: name.trim(), color })
      .select("id")
      .single();
    if (error) { console.error("[useFolders] create error:", error.message); return null; }
    invalidate();
    return data.id as string;
  };

  const deleteFolder = async (folderId: string) => {
    await supabase.from("candidate_folders").delete().eq("id", folderId);
    invalidate();
  };

  const renameFolder = async (folderId: string, name: string) => {
    await supabase.from("candidate_folders")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", folderId);
    invalidate();
  };

  return {
    folders:      query.data   ?? ([] as FolderItem[]),
    isLoading:    query.isLoading,
    refetch:      () => query.refetch(),
    createFolder,
    deleteFolder,
    renameFolder,
  };
}