// jobQueryService.ts

import { JobData } from "@/lib/types";
import { transformToJobData, transformToDbJob } from "./jobDataTransformer"; 
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

// Create a new job
export const createJob = async (job: JobData): Promise<JobData> => {
  try {
    const { data } = await insertJob(job);
    return transformToJobData(data);
  } catch (error) {
    console.error("Failed to create job:", error);
    throw error;
  }
};

// Update a job
// Update a job
export const updateJob = async (id: string, job: JobData, updated_by: string): Promise<JobData> => {
  try {
    // --- FIX 2: REMOVE the double transformation. The 'job' object is already formatted. ---
    const jobWithMeta = { ...job, updated_by };
    
    // Pass the already-correct object directly to the update function.
    const { data } = await updateJobRecord(id, jobWithMeta);
    return transformToJobData(data);
  } catch (error) {
    console.error(`Failed to update job with ID ${id}:`, error);
    throw error;
  }
};

export const updateAssociate = async (id: string, job: JobData, updated_by: string): Promise<JobData> => {
  try {
    // Transform JobData to DB format
    const dbJob = transformToDbJob(job);

    // Add updated_by to the dbJob object
    const jobWithMeta = {
      ...dbJob,
      submission_type: "Client Side",
      updated_by // Add updated_by
    };

    const { data } = await updateJobRecord(id, jobWithMeta);
    
    return transformToJobData(data);
  } catch (error) {
    console.error(`Failed to update job with ID ${id}:`, error);
    throw error;
  }
};
// Update job status
export const updateJobStatus = async (jobId: string, status: string): Promise<JobData> => {
  try {
    const { data } = await updateJobStatusRecord(jobId, status);
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