// src/services/bgvService.ts

import { supabase } from "@/integrations/supabase/client";

interface StatusFromDB {
  id: string;
  name: string;
  type: 'main' | 'sub';
  parent_id: string | null;
}

interface SubStatus {
  id: string;
  name: string;
}

export interface MainStatus {
  id: string;
  name: string;
  subs: SubStatus[];
}
/**
 * Fetches the counts of candidates in each main BGV status for a given job.
 * Used for the verification pipeline chart.
 */
export const getVerificationStatusCounts = async (jobId: string) => {
  const { data, error } = await supabase
    .from('job_statuses')
    .select('name, color, hr_job_candidates(count)')
    .eq('name', ['Initiated', 'In Progress', 'On Hold', 'Completed', 'Closed']) // Filter for BGV main statuses
    .eq('hr_job_candidates.job_id', jobId);

  if (error) throw error;
  
  return data
    .map(status => ({
      name: status.name,
      color: status.color || '#cccccc',
      count: status.hr_job_candidates[0]?.count || 0,
    }))
    .filter(item => item.count > 0);
};

/**
 * Updates a candidate's BGV status and logs the change to the new timeline table.
 */
export const updateCandidateBgvStatus = async (
    candidateId: string, 
    newSubStatusId: string, 
    userId: string
): Promise<boolean> => {
    try {
        // 1. Get details about the new status and the candidate's current status for logging
        const { data: candidate, error: candidateError } = await supabase
            .from('hr_job_candidates')
            .select('sub_status_id, main_status_id')
            .eq('id', candidateId)
            .single();

        if (candidateError || !candidate) throw new Error("Candidate not found.");

        const { data: statuses, error: statusError } = await supabase
            .from('job_statuses')
            .select('id, name, parent_id')
            .in('id', [candidate.sub_status_id, newSubStatusId]);
        
        if (statusError) throw statusError;

        const oldStatus = statuses.find(s => s.id === candidate.sub_status_id);
        const newStatus = statuses.find(s => s.id === newSubStatusId);
        if (!newStatus) throw new Error("New status details not found.");
        
        // 2. Update the candidate's record
        const { error: updateError } = await supabase
            .from('hr_job_candidates')
            .update({
                main_status_id: newStatus.parent_id,
                sub_status_id: newSubStatusId,
                updated_by: userId,
                status: (await supabase.from('job_statuses').select('name').eq('id', newStatus.parent_id).single()).data?.name || 'In Progress'
            })
            .eq('id', candidateId);
        
        if (updateError) throw updateError;
        
        // 3. Log the change to the new BGV timeline table
        const { data: jobInfo } = await supabase.from('hr_job_candidates').select('job_id, organization_id').eq('id', candidateId).single();
        if (jobInfo) {
             await supabase.from('bgv_candidate_timeline').insert({
                candidate_id: candidateId,
                job_id: jobInfo.job_id,
                organization_id: jobInfo.organization_id,
                changed_by: userId,
                previous_status_id: oldStatus?.id || null,
                new_status_id: newStatus.id,
                event_description: `Status changed from "${oldStatus?.name || 'None'}" to "${newStatus.name}".`
            });
        }
        
        return true;
    } catch (error) {
        console.error("Error updating BGV status:", error);
        return false;
    }
};

export const getBgvStatuses = async (): Promise<MainStatus[]> => {
  // Assuming Ascendion's org ID. In a multi-tenant app, this would be dynamic.
  const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

  const { data, error } = await supabase
    .from('job_statuses')
    .select('id, name, type, parent_id')
    .eq('organization_id', ASCENDION_ORGANIZATION_ID)
    .in('name', [
        'Initiated', 'In Progress', 'On Hold', 'Completed', 'Closed',
        'Pending Candidate Documents', 'Documents Submitted', 'Verification Started',
        'Address Verification', 'Education Verification', 'Employment Verification',
        'Criminal Record Verification', 'Reference Check', 'Awaiting Candidate Response',
        'Awaiting Vendor Update', 'All Checks Clear', 'Minor Discrepancy',
        'Major Discrepancy', 'Verification Not Required', 'Candidate Withdrawn'
    ]);

  if (error) throw error;

  const mainStatusesMap = new Map<string, MainStatus>();
  const subStatuses: StatusFromDB[] = [];

  // First, populate the map with main statuses
  data.forEach(status => {
    if (status.type === 'main') {
      mainStatusesMap.set(status.id, { id: status.id, name: status.name, subs: [] });
    } else {
      subStatuses.push(status);
    }
  });

  // Second, attach sub-statuses to their parents
  subStatuses.forEach(sub => {
    if (sub.parent_id && mainStatusesMap.has(sub.parent_id)) {
      mainStatusesMap.get(sub.parent_id)!.subs.push({ id: sub.id, name: sub.name });
    }
  });

  return Array.from(mainStatusesMap.values());
};