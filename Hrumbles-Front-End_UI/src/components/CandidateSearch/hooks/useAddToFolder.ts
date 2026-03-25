/**
 * useAddToFolder.ts
 * Mutation: add a saved_candidate to a folder (candidate_folder_members).
 * Also handles remove from folder.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FOLDERS_QUERY_KEY } from "./useFolders";
import { SAVED_CANDIDATES_QUERY_KEY } from "./useUpsertSavedCandidate";

export function useAddToFolder() {
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const queryClient             = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
  };

  const addToFolder = useCallback(async (
    folderId:          string,
    savedCandidateId:  string,
    addedBy:           string,
    folderNote?:       string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("candidate_folder_members")
        .upsert(
          { folder_id: folderId, saved_candidate_id: savedCandidateId, added_by: addedBy, folder_note: folderNote ?? null },
          { onConflict: "folder_id,saved_candidate_id", ignoreDuplicates: true }
        );
      if (e) throw e;
      invalidate();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  const removeFromFolder = useCallback(async (
    folderId:         string,
    savedCandidateId: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("candidate_folder_members")
        .delete()
        .eq("folder_id",          folderId)
        .eq("saved_candidate_id", savedCandidateId);
      if (e) throw e;
      invalidate();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  return { addToFolder, removeFromFolder, loading, error };
}