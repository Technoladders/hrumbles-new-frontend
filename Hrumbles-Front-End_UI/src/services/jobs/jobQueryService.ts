
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


// Get all jobs
// jobService.ts (or wherever getAllJobs is defined)
export const getAllJobs = async (): Promise<JobData[]> => {
  try {
    const { data } = await fetchAllJobs();
   
    
    // Convert raw data to job data
    const transformedData = Array.isArray(data) 
      ? data.map(job => transformToJobData(job))
      : [];
    
    return transformedData;
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

// Get jobs by job type
export const getJobsByType = async (jobType: string): Promise<JobData[]> => {
  try {
    const { data } = await fetchJobsByType(jobType);
    
    // Transform data to JobData format
    return Array.isArray(data) 
      ? data.map(job => transformToJobData(job))
      : [];
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
    
    return Array.isArray(data) 
      ? data.map(job => transformToJobData(job))
      : [];
  } catch (error) {
    console.error(`Failed to fetch jobs assigned to user ${userId}:`, error);
    throw error;
  }
};


// Create a new job
export const createJob = async (job: JobData, organization_id: string, created_by: string): Promise<JobData> => {
  try {
    // Transform JobData to DB format
    const dbJob = transformToDbJob(job);

    // Add organization_id and created_by to the dbJob object
    const jobWithMeta = {
      ...dbJob,
      organization_id, // Add organization_id
      created_by // Use the passed created_by
    };

    const { data } = await insertJob(jobWithMeta);
    
    return transformToJobData(data);
  } catch (error) {
    console.error("Failed to create job:", error);
    throw error;
  }
};

// Update a job
export const updateJob = async (id: string, job: JobData, updated_by: string): Promise<JobData> => {
  try {
    // Transform JobData to DB format
    const dbJob = transformToDbJob(job);

    // Add updated_by to the dbJob object
    const jobWithMeta = {
      ...dbJob,
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
