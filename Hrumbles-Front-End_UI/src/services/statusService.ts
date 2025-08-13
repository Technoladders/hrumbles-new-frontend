import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

// Type definitions
export interface MainStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  display_order?: number;
  type: 'main';
  subStatuses?: SubStatus[];
}

export interface SubStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  display_order?: number;
  type: 'sub';
  parent_id: string;
}

// Fetch all statuses with their sub-statuses
export const fetchAllStatuses = async (organizationId?: string): Promise<MainStatus[]> => {
  try {
    const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }

    // Define color mappings for BGV statuses
    const colorMap: { [key: string]: string } = {
      // Main Statuses
      '602d0e81-4f0e-4e9a-b79d-61d29668a1d6': '#3B82F6', // Initiated
      '7acb59b8-ac5a-483a-aa2b-b48dfb3261fb': '#14B8A6', // In Progress
      'a0200ec3-ed70-49ef-85d9-de0fa3649e05': '#F59E0B', // On Hold
      '390775e9-98b4-458a-8fc7-6205105cae64': '#10B981', // Completed
      '7a2a35b8-94ed-4182-99d7-5df2662792be': '#6B7280', // Closed
      // Sub-Statuses under Initiated
      '0a8da64d-bbbd-4936-9ff2-afb353eb86ce': '#60A5FA', // Pending Candidate Documents
      'b921b145-1018-4654-a1ac-ff6d83ccf235': '#3B82F6', // Documents Submitted
      // Sub-Statuses under In Progress
      '8573213c-5e20-41e7-9e3c-35d4068a1ebf': '#2DD4BF', // Verification Started
      '5d833e78-9d18-4cfb-93e9-0918145ff496': '#14B8A6', // Address Verification
      '56238948-0614-4171-a337-f4163364ee11': '#14B8A6', // Education Verification
      'e3c5787c-cc8f-4565-ad8e-83746a90d569': '#14B8A6', // Employment Verification
      '5c6642e5-adbd-4a79-b022-d04735d69639': '#14B8A6', // Criminal Record Verification
      '2538a810-89c5-4ff0-adb8-05018193ec16': '#0D9488', // Reference Check
      // Sub-Statuses under On Hold
      'a2033a14-fdf2-4940-8fde-c07eaf00ed73': '#FBBF24', // Awaiting Candidate Response
      '211e14b2-286d-4115-a64d-fb888943a746': '#F59E0B', // Awaiting Vendor Update
      // Sub-Statuses under Completed
      '922d42b8-5ddf-4aa2-8f9f-dd43d70ebf5a': '#10B981', // All Checks Clear
      'bf2c0e46-8ae7-4fea-b253-bfc0f2503828': '#FBBF24', // Minor Discrepancy
      'a6de2d0b-4b73-439f-9540-d555a1192e24': '#EF4444', // Major Discrepancy
      // Sub-Statuses under Closed
      '49533ca9-8196-4250-abc0-648ebd7725e8': '#9CA3AF', // Verification Not Required
      '886a545d-16b2-40fe-8e72-6907bb0bc4fa': '#6B7280', // Candidate Withdrawn
    };
    const { organization_id, userId } = authData;
    // First, get all main statuses
    const { data: mainStatuses, error: mainError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('type', 'main')
      .order('display_order', { ascending: true })
      .eq('organization_id', organization_id);

    if (mainError) throw mainError;

    // Then, get all sub-statuses
    const { data: subStatuses, error: subError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('type', 'sub')
      .order('display_order', { ascending: true })
      .eq('organization_id', organization_id);

    if (subError) throw subError;

    // Log the data for debugging
    // console.log('Main statuses:', mainStatuses);
    // console.log('Sub statuses:', subStatuses);

    if (!mainStatuses || !subStatuses || mainStatuses.length === 0) {
      console.warn('No statuses found, returning default statuses');
      return getDefaultStatuses();
    }

    // Map sub-statuses to their parent statuses
   const result = mainStatuses.map(mainStatus => ({
      ...mainStatus,
      color: colorMap[mainStatus.id] || mainStatus.color || '#777777',
      subStatuses: subStatuses
        .filter(sub => sub.parent_id === mainStatus.id)
        .map(sub => ({
          ...sub,
          color: colorMap[sub.id] || mainStatus.color || '#777777',
        }))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    }));

    return result;
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return getDefaultStatuses();
  }
};

// Helper function to create a default set of statuses if none exist in the database
const getDefaultStatuses = (): MainStatus[] => {
  // Create the 5-stage pipeline with sub-statuses based on the requirements
  const defaultMainStatuses: MainStatus[] = [
    {
      id: 'new',
      name: 'New',
      color: '#3b82f6', // blue
      display_order: 1,
      type: 'main',
      subStatuses: [
        {
          id: 'new_application',
          name: 'New Application',
          color: '#3b82f6',
          display_order: 1,
          type: 'sub',
          parent_id: 'new'
        }
      ]
    },
    {
      id: 'processed',
      name: 'Processed',
      color: '#f59e0b', // amber
      display_order: 2,
      type: 'main',
      subStatuses: [
        {
          id: 'process_internal',
          name: 'Process (Internal)',
          color: '#f59e0b',
          display_order: 1,
          type: 'sub',
          parent_id: 'processed'
        },
        {
          id: 'process_client',
          name: 'Process (Client)',
          color: '#f59e0b',
          display_order: 2,
          type: 'sub',
          parent_id: 'processed'
        },
        {
          id: 'duplicate_internal',
          name: 'Duplicate (Internal)',
          color: '#f59e0b',
          display_order: 3,
          type: 'sub',
          parent_id: 'processed'
        },
        {
          id: 'duplicate_client',
          name: 'Duplicate (Client)',
          color: '#f59e0b',
          display_order: 4,
          type: 'sub',
          parent_id: 'processed'
        },
        {
          id: 'reject_processed',
          name: 'Reject',
          color: '#ef4444',
          display_order: 5,
          type: 'sub',
          parent_id: 'processed'
        }
      ]
    },
    {
      id: 'interview',
      name: 'Interview',
      color: '#8b5cf6', // purple
      display_order: 3,
      type: 'main',
      subStatuses: [
        {
          id: 'technical_assessment',
          name: 'Technical Assessment',
          color: '#8b5cf6',
          display_order: 1,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'reschedule_interview',
          name: 'Reschedule Interview',
          color: '#8b5cf6',
          display_order: 2,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'technical_assessment_selected',
          name: 'Technical Assessment Selected',
          color: '#10b981',
          display_order: 3,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'technical_assessment_rejected',
          name: 'Technical Assessment Rejected',
          color: '#ef4444',
          display_order: 4,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l1',
          name: 'L1',
          color: '#8b5cf6',
          display_order: 5,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l1_selected',
          name: 'L1 Selected',
          color: '#10b981',
          display_order: 6,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l1_rejected',
          name: 'L1 Rejected',
          color: '#ef4444',
          display_order: 7,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l2',
          name: 'L2',
          color: '#8b5cf6',
          display_order: 8,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l2_selected',
          name: 'L2 Selected',
          color: '#10b981',
          display_order: 9,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l2_rejected',
          name: 'L2 Rejected',
          color: '#ef4444',
          display_order: 10,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l3',
          name: 'L3',
          color: '#8b5cf6',
          display_order: 11,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l3_selected',
          name: 'L3 Selected',
          color: '#10b981',
          display_order: 12,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'l3_rejected',
          name: 'L3 Rejected',
          color: '#ef4444',
          display_order: 13,
          type: 'sub',
          parent_id: 'interview'
        },
        {
          id: 'end_client_round',
          name: 'End Client Round',
          color: '#8b5cf6',
          display_order: 14,
          type: 'sub',
          parent_id: 'interview'
        }
      ]
    },
    {
      id: 'offered',
      name: 'Offered',
      color: '#10b981', // emerald
      display_order: 4,
      type: 'main',
      subStatuses: [
        {
          id: 'offer_issued',
          name: 'Offer Issued',
          color: '#10b981',
          display_order: 1,
          type: 'sub',
          parent_id: 'offered'
        },
        {
          id: 'on_hold',
          name: 'On Hold',
          color: '#f59e0b',
          display_order: 2,
          type: 'sub',
          parent_id: 'offered'
        }
      ]
    },
    {
      id: 'joined',
      name: 'Joined',
      color: '#6366f1', // indigo
      display_order: 5,
      type: 'main',
      subStatuses: [
        {
          id: 'joined_status',
          name: 'Joined',
          color: '#6366f1',
          display_order: 1,
          type: 'sub',
          parent_id: 'joined'
        },
        {
          id: 'no_show',
          name: 'No Show',
          color: '#ef4444',
          display_order: 2,
          type: 'sub',
          parent_id: 'joined'
        }
      ]
    }
  ];
  
  return defaultMainStatuses;
};

// Update candidate status and create timeline entry
export const updateCandidateStatus = async (
  candidateId: string, 
  subStatusId: string,
  userId?: string,
  additionalData: Record<string, any> = {}
): Promise<boolean> => {
  try {
    // Get the sub status to find its parent
    const { data: subStatus, error: subError } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', subStatusId)
      .single();
    
    if (subError) {
      console.error('Error fetching sub status:', subError);
      // If no sub status is found, use default New status
      return updateCandidateToDefaultStatus(candidateId, userId, additionalData);
    }

    // Get the previous status data
    const { data: prevCandidateData, error: prevError } = await supabase
      .from('hr_job_candidates')
      .select(`
        job_id,
        main_status_id,
        sub_status_id,
        main_status:job_statuses!main_status_id (name),
        sub_status:job_statuses!sub_status_id (name)
      `)
      .eq('id', candidateId)
      .maybeSingle(); // Use maybeSingle instead of single

    if (prevError && !prevError.message.includes('No rows found')) {
      console.error('Error fetching previous status:', prevError);
    }
    
    // Create the update data including additional fields if provided
    const updateData = {
      main_status_id: subStatus.parent_id,
      sub_status_id: subStatusId,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
      ...additionalData
    };
    
    // Update the candidate with both main and sub status
    const { error } = await supabase
      .from('hr_job_candidates')
      .update(updateData)
      .eq('id', candidateId);
    
    if (error) throw error;

    // Get the new status data for timeline entry
    const { data: mainStatus, error: mainStatusError } = await supabase
      .from('job_statuses')
      .select('name')
      .eq('id', subStatus.parent_id)
      .single();
    
    if (mainStatusError) {
      console.error('Error fetching main status:', mainStatusError);
    }

    // Create timeline entry for status change
    await createStatusChangeTimelineEntry(
      candidateId,
      userId || 'System',
      {
        previousState: prevCandidateData ? {
          mainStatusId: prevCandidateData.main_status_id,
          subStatusId: prevCandidateData.sub_status_id,
          mainStatusName: prevCandidateData.main_status?.name,
          subStatusName: prevCandidateData.sub_status?.name
        } : null,
        newState: {
          mainStatusId: subStatus.parent_id,
          subStatusId: subStatusId,
          mainStatusName: mainStatus?.name,
          subStatusName: subStatus.name
        },
        additionalData
      }
    );
    
    // Use the fixed updateCandidateStatusCounts function from candidateService
    if (prevCandidateData?.job_id) {
      await import('@/services/candidateService').then((module) => {
        module.updateCandidateStatusCounts(
          candidateId,
          prevCandidateData.job_id,
          subStatus.parent_id,
          subStatusId,
          userId
        );
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return false;
  }
};

// Function to set a candidate to default New status
const updateCandidateToDefaultStatus = async (
  candidateId: string,
  userId?: string,
  additionalData: Record<string, any> = {}
): Promise<boolean> => {
  try {
    const defaultStatuses = getDefaultStatuses();
    const defaultMainStatus = defaultStatuses.find(s => s.name === 'New');
    const defaultSubStatus = defaultMainStatus?.subStatuses?.[0];
    
    if (!defaultMainStatus || !defaultSubStatus) {
      throw new Error("Default statuses not found");
    }
    
    const updateData = {
      main_status_id: defaultMainStatus.id,
      sub_status_id: defaultSubStatus.id,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
      ...additionalData
    };
    
    const { error } = await supabase
      .from('hr_job_candidates')
      .update(updateData)
      .eq('id', candidateId);
    
    if (error) throw error;
    
    // Create timeline entry for default status
    await createStatusChangeTimelineEntry(
      candidateId,
      userId || 'System',
      {
        previousState: null,
        newState: {
          mainStatusId: defaultMainStatus.id,
          subStatusId: defaultSubStatus.id,
          mainStatusName: defaultMainStatus.name,
          subStatusName: defaultSubStatus.name
        },
        additionalData: { reason: "Set to default status" }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error setting default status:', error);
    return false;
  }
};

// Create a timeline entry for status change
export const createStatusChangeTimelineEntry = async (
  candidateId: string,
  createdBy: string,
  statusChangeData: {
    previousState: {
      mainStatusId: string;
      subStatusId: string;
      mainStatusName: string;
      subStatusName: string;
    } | null;
    newState: {
      mainStatusId: string;
      subStatusId: string;
      mainStatusName: string;
      subStatusName: string;
    };
    additionalData?: Record<string, any>;
  }
): Promise<boolean> => {
  try {

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    const eventData = {
      action: 'Status updated',
      timestamp: new Date().toISOString(),
      ...statusChangeData.additionalData
    };

    const { error } = await supabase
      .from('hr_candidate_timeline')
      .insert({
        candidate_id: candidateId,
        created_by: createdBy,
        event_type: 'status_change',
        previous_state: statusChangeData.previousState,
        new_state: statusChangeData.newState,
        event_data: eventData,
        organization_id: organization_id,
      });

    if (error) {
      console.error('Error creating timeline entry:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error creating timeline entry:', error);
    return false;
  }
};

// Update status change counts for reporting
export const updateStatusChangeCounts = async (
  candidateId: string,
  jobId: string,
  mainStatusId: string,
  subStatusId: string,
  userId?: string
): Promise<boolean> => {
  try {

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    // Check if a count entry already exists
    const { data: existingCount, error: countError } = await supabase
      .from('hr_status_change_counts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('main_status_id', mainStatusId)
      .eq('sub_status_id', subStatusId)
      .single();
    
    if (countError && !countError.message.includes('No rows found')) {
      throw countError;
    }

    if (existingCount) {
      // Update existing count
      const { error } = await supabase
        .from('hr_status_change_counts')
        .update({
          count: existingCount.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCount.id);
      
      if (error) throw error;
    } else {
      // Create new count entry
      const { error } = await supabase
        .from('hr_status_change_counts')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          main_status_id: mainStatusId,
          sub_status_id: subStatusId,
          employee_id: userId,
          count: 1,
          organization_id: organization_id,
        });
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating status change counts:', error);
    return false;
  }
};

// Get progress mapping for a status
export const getProgressForStatus = async (statusId: string): Promise<{
  screening: boolean;
  interview: boolean;
  offer: boolean;
  hired: boolean;
  joined: boolean;
}> => {
  try {
    // Default progress state (all false)
    const defaultProgress = {
      screening: false,
      interview: false,
      offer: false,
      hired: false,
      joined: false
    };
    
    if (!statusId) return defaultProgress;
    
    // Get the status
    const { data: status, error } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', statusId)
      .single();
    
    if (error) return defaultProgress;
    
    // If it's a sub-status, get its parent
    let mainStatus = status;
    if (status.type === 'sub') {
      const { data: parent, error: parentError } = await supabase
        .from('job_statuses')
        .select('*')
        .eq('id', status.parent_id)
        .single();
      
      if (parentError) return defaultProgress;
      mainStatus = parent;
    }
    
    // Based on our 5-stage pipeline: New -> Processed -> Interview -> Offered -> Joined
    const stages = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
    const stageIndex = stages.indexOf(mainStatus.name);
    
    if (stageIndex === -1) return defaultProgress;
    
    // Set progress based on the stage index
    // New: just screening
    // Processed: screening
    // Interview: screening + interview
    // Offered: screening + interview + offer
    // Joined: all stages
    return {
      screening: stageIndex >= 0, // True for all stages
      interview: stageIndex >= 2, // True starting from Interview
      offer: stageIndex >= 3,     // True starting from Offered
      hired: stageIndex >= 3,     // True starting from Offered (hired when offered)
      joined: stageIndex >= 4      // True only for Joined
    };
  } catch (error) {
    console.error('Error getting progress for status:', error);
    return {
      screening: false,
      interview: false,
      offer: false,
      hired: false,
      joined: false
    };
  }
};

// Get a specific status by ID
export const getStatusById = async (statusId: string): Promise<MainStatus | SubStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('job_statuses')
      .select('*')
      .eq('id', statusId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching status:', error);
    return null;
  }
};

// Create a new status
export const createStatus = async (
  status: Partial<MainStatus> | Partial<SubStatus>, 
  organizationId?: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('job_statuses')
      .insert({ ...status, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating status:', error);
    return null;
  }
};

// Update existing status
export const updateStatus = async (
  id: string,
  updates: Partial<MainStatus> | Partial<SubStatus>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('job_statuses')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating status:', error);
    return false;
  }
};

// Delete status
export const deleteStatus = async (id: string): Promise<boolean> => {
  try {
    // Check if this is a main status with sub-statuses
    if (id) {
      const { data: subStatuses, error: checkError } = await supabase
        .from('job_statuses')
        .select('id')
        .eq('parent_id', id);
      
      if (checkError) throw checkError;
      
      // If this main status has sub-statuses, don't allow deletion
      if (subStatuses && subStatuses.length > 0) {
        toast.error("Cannot delete a status that has sub-statuses. Delete the sub-statuses first.");
        return false;
      }
    }
    
    const { error } = await supabase
      .from('job_statuses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting status:', error);
    return false;
  }
};




export const updateClientSubmissionStatus = async (
  candidateId: string,
  jobId: string,
  subStatusId: string,
  userId?: string,
  additionalData: Record<string, any> = {}
): Promise<boolean> => {
  try {
const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    // Fetch the sub-status to verify it's "Processed (Client)"
    const { data: subStatus, error: subStatusError } = await supabase
      .from('job_statuses')
      .select('name, parent_id')
      .eq('id', subStatusId)
      .single();

    if (subStatusError || !subStatus) {
      console.error('Error fetching sub-status:', subStatusError);
      throw new Error('Invalid sub-status');
    }

    if (subStatus.name !== 'Processed (Client)') {
      console.error('Invalid sub-status for client submission:', subStatus.name);
      throw new Error('This function is only for Processed (Client) status');
    }

    const mainStatusId = subStatus.parent_id;
    const submissionDate = additionalData.submission_date
      ? new Date(additionalData.submission_date).toISOString()
      : new Date().toISOString();

    // Fetch previous state from hr_job_candidates
    const { data: prevCandidateData, error: prevError } = await supabase
      .from('hr_job_candidates')
      .select(`
        main_status_id,
        sub_status_id,
        main_status:job_statuses!main_status_id (name),
        sub_status:job_statuses!sub_status_id (name)
      `)
      .eq('id', candidateId)
      .maybeSingle();

    if (prevError && !prevError.message.includes('No rows found')) {
      console.error('Error fetching previous status:', prevError);
      throw prevError;
    }

    // Update hr_job_candidates with the new status and additional data
    const updateData = {
      main_status_id: mainStatusId,
      sub_status_id: subStatusId,
      updated_by: userId || null,
      updated_at: submissionDate,
      ...additionalData
    };

    const { error: updateError } = await supabase
      .from('hr_job_candidates')
      .update(updateData)
      .eq('id', candidateId);

    if (updateError) {
      console.error('Error updating candidate status:', updateError);
      throw updateError;
    }

    // Check if a count entry exists in hr_status_change_counts
    const { data: existingCount, error: countError } = await supabase
      .from('hr_status_change_counts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .eq('main_status_id', mainStatusId)
      .eq('sub_status_id', subStatusId)
      .maybeSingle();

    if (countError) {
      console.error('Error checking status count:', countError);
      throw countError;
    }

    if (existingCount) {
      // Update existing count
      const { error: updateCountError } = await supabase
        .from('hr_status_change_counts')
        .update({
          count: existingCount.count + 1,
          updated_at: submissionDate,
        })
        .eq('id', existingCount.id);

      if (updateCountError) {
          console.error('Error updating status count:', updateCountError);
          throw updateCountError;
      }
    } else {
      // Create new count entry
      const { error: insertCountError } = await supabase
        .from('hr_status_change_counts')
        .insert({
          candidate_id: candidateId,
          job_id: jobId,
          main_status_id: mainStatusId,
          sub_status_id: subStatusId,
          employee_id: userId,
          count: 1,
          created_at: submissionDate,
          updated_at: submissionDate,
          organization_id: organization_id,
        });

      if (insertCountError) {
          console.error('Error inserting status count:', insertCountError);
          throw insertCountError;
      }
    }

    // Fetch the main status name for the timeline entry
    const { data: mainStatus, error: mainStatusError } = await supabase
      .from('job_statuses')
      .select('name')
      .eq('id', mainStatusId)
      .single();

    if (mainStatusError) {
      console.error('Error fetching main status:', mainStatusError);
    }

    // Create timeline entry for status change
    const currentTime = new Date().toISOString();
    const eventData = {
      action: 'Status updated',
      timestamp: currentTime,
      client_budget: additionalData.accrual_ctc || null,
    };

    const { error: timelineError } = await supabase
      .from('hr_candidate_timeline')
      .insert({
        candidate_id: candidateId,
        created_by: userId || 'System',
        event_type: 'status_change',
        previous_state: prevCandidateData ? {
          mainStatusId: prevCandidateData.main_status_id,
          subStatusId: prevCandidateData.sub_status_id,
          mainStatusName: prevCandidateData.main_status?.name,
          subStatusName: prevCandidateData.sub_status?.name,
        } : null,
        new_state: {
          mainStatusId,
          subStatusId,
          mainStatusName: mainStatus?.name,
          subStatusName: subStatus.name,
        },
        event_data: eventData,
        created_at: currentTime,
        organization_id: organization_id,
      });

    if (timelineError) {
      console.error('Error creating timeline entry:', timelineError);
      throw timelineError;
    }

    return true;
  } catch (error) {
    console.error('Error in updateClientSubmissionStatus:', error);
    return false;
  }
};