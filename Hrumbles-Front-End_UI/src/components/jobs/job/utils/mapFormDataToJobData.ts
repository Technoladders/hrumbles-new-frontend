// utils/mapFormDataToJobData.ts

import { JobData } from "@/lib/types";
import { JobFormData } from "../hooks/useJobFormState";

/**
 * This is the ONLY translator you need. It converts the complex form state
 * into a single, clean object that perfectly matches the 'hr_jobs' table schema.
 */
export const mapFormDataToJobData = (
  formData: JobFormData, 
  editJob: JobData | null,
  jobType: "Internal" | "External",
  internalType: "Inhouse" | "Client Side" | null
): Partial<JobData> => {
  
  console.log("Step 1: Raw form data being mapped:", formData);

  const isClientSideInternal = jobType === "Internal" && internalType === "Client Side";
  const submissionType = isClientSideInternal ? "Client Side" : (internalType === 'Inhouse' ? 'Internal' : 'External');
  
  // Convert the array of skill OBJECTS to a simple array of STRINGS for the database.
  const skillsForDatabase = (formData.jobDescription.skills || []).map(skill => skill.name);
  
  // Construct the nested JSONB object for experience from Step 1's data.
  const experienceForDatabase = {
    min: { 
      years: formData.jobInformation.minimumYear || 0, 
      months: formData.jobInformation.minimumMonth || 0
    },
    max: { 
      years: formData.jobInformation.maximumYear || 0,
      months: formData.jobInformation.maximumMonth || 0
    }
  };

  // Create the final object that matches your database schema EXACTLY.
  const jobDataForDatabase: Partial<JobData> = {
    // --- Data from Job Information (Step 1) ---
    job_id: formData.jobInformation.jobId,
    title: formData.jobInformation.jobTitle,
    location: formData.jobInformation.jobLocation,
    hiring_mode: formData.jobInformation.hiringMode,
    notice_period: formData.jobInformation.noticePeriod,
    number_of_candidates: formData.jobInformation.numberOfCandidates,
    
    // --- Data from Job Description (Step 2) ---
    description: formData.jobDescription.description,
    
    // --- Correctly Mapped Data ---
    skills: skillsForDatabase,
    experience: experienceForDatabase,
    
    // --- Data from Client Details (if applicable) ---
    client_details: {
      clientName: formData.clientDetails.clientName,
      clientBudget: formData.clientDetails.clientBudget,
      endClient: formData.clientDetails.endClient,
      pointOfContact: formData.clientDetails.pointOfContact,
    },
    client_project_id: formData.clientDetails.clientProjectId || null,
    currency_type: formData.clientDetails.currency_type,
    budget_type: formData.clientDetails.budget_type,
    
    // --- Metadata and Defaults ---
    department: editJob?.department || "Engineering",
    status: editJob?.status || "Active",
    posted_date: editJob?.posted_date || new Date().toISOString().split('T')[0],
    client_owner: submissionType === "Client Side" ? formData.clientDetails.clientName : "Internal HR",
    submission_type: submissionType,
    job_type_category: jobType,
    description_bullets: [],
    applications: 0,
  };
  
  if (formData.clientDetails.assignedTo) {
    jobDataForDatabase.assigned_to = {
      type: "individual",
      name: formData.clientDetails.assignedTo
    };
  }
  
  if (editJob) {
    jobDataForDatabase.id = editJob.id;
  }

  console.log("Step 2: Final object ready for database:", jobDataForDatabase);
  return jobDataForDatabase;
};