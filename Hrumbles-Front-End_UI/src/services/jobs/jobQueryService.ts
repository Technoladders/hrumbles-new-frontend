// jobQueryService.ts

import { JobData } from "@/lib/types";
import { transformToJobData, transformToDbJob } from "./jobDataTransformer"; 
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllJobs,
  fetchJobsByType,
  fetchJobById,
  insertJob,
  updateJobRecord,
  updateJobStatusRecord,
  deleteJobRecord,
  fetchJobsAssignedToUser
} from "./supabaseQueries";
import { sub } from "date-fns";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";


// Get all jobs
export const getAllJobs = async (): Promise<JobData[]> => {
  try {
    const { data } = await fetchAllJobs();
    return Array.isArray(data) ? data.map(job => transformToJobData(job)) : [];
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

// Get jobs by job type
export const getJobsByType = async (jobType: string): Promise<JobData[]> => {
  try {
    const { data } = await fetchJobsByType(jobType);
    return Array.isArray(data) ? data.map(job => transformToJobData(job)) : [];
  } catch (error) {
    console.error(`Failed to fetch ${jobType} jobs:`, error);
    throw error;
  }
};

// Get job by ID
export const getJobById = async (id: string): Promise<JobData | null> => {
  try {
    const { data } = await fetchJobById(id);
    return data ? transformToJobData(data) : null;
  } catch (error) {
    console.error(`Failed to fetch job with ID ${id}:`, error);
    throw error;
  }
};

// Get jobs assigned to a specific user
export const getJobsAssignedToUser = async (userId: string): Promise<JobData[]> => {
  try {
    const { data } = await fetchJobsAssignedToUser(userId);
    return Array.isArray(data) ? data.map(job => transformToJobData(job)) : [];
  } catch (error) {
    console.error(`Failed to fetch jobs assigned to user ${userId}:`, error);
    throw error;
  }
};

// --- HELPER: Resolve Creator Email ---
const resolveCreatorEmail = async (job: JobData): Promise<string> => {
  let creatorId = typeof job.createdBy === 'string' ? job.createdBy : job.createdBy?.id;
  if (!creatorId) {
    const { data } = await supabase.from('hr_jobs').select('created_by').eq('id', job.id).single();
    creatorId = data?.created_by;
  }
  if (creatorId) {
    const { data } = await supabase.from('hr_employees').select('email').eq('id', creatorId).single();
    return data?.email || '';
  }
  return '';
};

// --- NEW HELPER: Trigger CREATION Email ---
export const sendJobCreatedNotification = async (job: JobData, organizationId: string, userId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: config } = await supabase.from('hr_email_configurations').select('recipients, is_active').eq('organization_id', organizationId).eq('report_type', 'job_creation_notify').maybeSingle();
    
    const configIds = (config?.is_active && config?.recipients) ? config.recipients : [];
    const { data: configEmployees } = await supabase.from('hr_employees').select('email').in('id', configIds);
    const configEmails = configEmployees?.map(e => e.email).filter(Boolean) || [];

    const { data: creator } = await supabase.from('hr_employees').select('email, first_name, last_name').eq('id', userId).single();
    const creatorEmail = creator?.email || '';
    const createdBy = creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() : 'System';

    if (!creatorEmail && configEmails.length === 0) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Send-Job-Created-Email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
            creatorEmail,
            configEmails,
            jobDetails: job,
            createdBy: createdBy,
            APP_BASE_URL: window.location.origin
        })
    });
  } catch (error) { console.error("Failed to trigger job creation email:", error); }
};

// --- NEW HELPER: Trigger UPDATED Email ---
export const sendJobUpdatedNotification = async (job: JobData, organizationId: string, updatedByUserId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: config } = await supabase.from('hr_email_configurations').select('recipients, is_active').eq('organization_id', organizationId).eq('report_type', 'job_update_notify').maybeSingle();
    const configIds = (config?.is_active && config?.recipients) ? config.recipients : [];

    const { data: configEmployees } = await supabase.from('hr_employees').select('email').in('id', configIds);
    const configEmails = configEmployees?.map(e => e.email).filter(Boolean) || [];

    const creatorEmail = await resolveCreatorEmail(job);

    const { data: updater } = await supabase.from('hr_employees').select('first_name, last_name').eq('id', updatedByUserId).single();
    const updatedBy = updater ? `${updater.first_name || ''} ${updater.last_name || ''}`.trim() : 'System';

    let assignedEmails: string[] = [];
    if (job.assigned_to?.id && job.assigned_to.type === 'individual') {
      const assignedIds = job.assigned_to.id.split(',');
      const { data: aEmps } = await supabase.from('hr_employees').select('email').in('id', assignedIds);
      assignedEmails = aEmps?.map(e => e.email).filter(Boolean) || [];
    }

    if (!creatorEmail && configEmails.length === 0 && assignedEmails.length === 0) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/Send-Job-Updated-Email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
            creatorEmail,
            configEmails,
            assignedEmails,
            jobDetails: job,
            updatedBy: updatedBy,
            APP_BASE_URL: window.location.origin
        })
    });
  } catch (error) { console.error("Failed to trigger job update email:", error); }
};


// --- EXISTING CRUD FUNCTIONS (UPDATED TO TRIGGER EMAILS) ---

export const createJob = async (job: JobData, organizationId: string, userId: string): Promise<JobData> => {
  try {
    const { data } = await insertJob(job);
    const newJob = transformToJobData(data);
    sendJobCreatedNotification(newJob, organizationId, userId).catch(e => console.error(e));
    return newJob;
  } catch (error) { throw error; }
};

export const updateJob = async (id: string, job: JobData, updated_by: string): Promise<JobData> => {
  try {
    const jobWithMeta = { ...job, updated_by };
    const { data } = await updateJobRecord(id, jobWithMeta);
    const updatedJob = transformToJobData(data);
    
    const authData = getAuthDataFromLocalStorage();
    sendJobUpdatedNotification(updatedJob, authData?.organization_id || job.organization || '', updated_by).catch(e=>console.error(e));
    
    return updatedJob;
  } catch (error) { throw error; }
};

export const updateAssociate = async (id: string, job: JobData, updated_by: string): Promise<JobData> => {
  try {
    const dbJob = transformToDbJob(job);
    const jobWithMeta = { ...dbJob, submission_type: "Client Side", updated_by };
    const { data } = await updateJobRecord(id, jobWithMeta);
    const updatedJob = transformToJobData(data);

    const authData = getAuthDataFromLocalStorage();
    sendJobUpdatedNotification(updatedJob, authData?.organization_id || job.organization || '', updated_by).catch(e=>console.error(e));

    return updatedJob;
  } catch (error) { throw error; }
};
// Update job status
// Update the service to pass the extra fields
export const updateJobStatus = async (jobId: string, status: string, extraFields: any = {}): Promise<JobData> => {
  try {
    const { data } = await updateJobStatusRecord(jobId, status, extraFields);
    return transformToJobData(data);
  } catch (error) {
    console.error(`Failed to update job status for job ${jobId}:`, error);
    throw error;
  }
};

// Delete a job
export const deleteJob = async (id: string): Promise<void> => {
  try {
    await deleteJobRecord(id);
  } catch (error) {
    console.error(`Failed to delete job with ID ${id}:`, error);
    throw error;
  }
};