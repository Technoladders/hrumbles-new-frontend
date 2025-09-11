
import { JobData } from "@/lib/types";
import { DbJob } from "./types";

// Transform DB job record to application JobData model
// jobDataTransformer.ts
export const transformToJobData = (jobRecord: any): JobData => {
 
  const transformedJob: JobData = {
    id: jobRecord.id,
    jobId: jobRecord.job_id,
    title: jobRecord.title,
    department: jobRecord.department || "Engineering",
    location: jobRecord.location,
    type: jobRecord.job_type,
    status: jobRecord.status as "Active" | "Pending" | "Completed" | "OPEN" | "HOLD" | "CLOSE",
    postedDate: jobRecord.posted_date,
    applications: jobRecord.applications,
    dueDate: jobRecord.due_date,
    clientOwner: jobRecord.client_owner || "Internal HR",
    hiringMode: jobRecord.hiring_mode || "Full Time",
    submissionType: jobRecord.submission_type as "Internal" | "Client",
    jobType: jobRecord.job_type_category || "Staffing",
    experience: jobRecord.experience || undefined,
    skills: jobRecord.skills || [],
    description: jobRecord.description || undefined,
    descriptionBullets: jobRecord.description_bullets || [],
    clientDetails: jobRecord.client_details || undefined,
    noticePeriod: jobRecord.notice_period || undefined,
    numberOfCandidates: jobRecord.number_of_candidates || 0,
    organization: jobRecord.organization_id,
    createdBy: jobRecord.created_by,
    assigned_to: jobRecord.assigned_to || null, 
    candidate_count: jobRecord.candidate_count,
    hr_budget: jobRecord.budget,
    createdAt: jobRecord.created_at,
    hr_budget_type: jobRecord.budget_type,
    hr_job_candidates: jobRecord.hr_job_candidates
  };

 
  return transformedJob;
};

// Transform application JobData to DB job format
export const transformToDbJob = (job: JobData): Record<string, any> => {
  return {
    job_id: job.jobId,
    title: job.title,
    department: job.department,
    location: job.location,
    job_type: job.type,
    status: job.status,
    posted_date: job.postedDate,
    applications: job.applications,
    due_date: job.dueDate,
    client_owner: job.clientOwner,
    hiring_mode: job.hiringMode,
    submission_type: job.submissionType,
    job_type_category: job.jobType as string,
    skills: job.skills || [],
    description: job.description || null,
    experience: job.experience || null,
    client_details: job.clientDetails || null,
    description_bullets: job.descriptionBullets || [],
    notice_period: job.noticePeriod || null, 
    number_of_candidates: job.numberOfCandidates || 0,
    organization_id: job.organization,
    created_at: job.createdAt,
    // hr_job_candidates: job.hr_job_candidates
  };
};
