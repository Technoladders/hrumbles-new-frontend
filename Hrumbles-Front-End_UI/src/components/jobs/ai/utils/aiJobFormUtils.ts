import { JobFormData } from "../hooks/useAiJobFormState";
import { JobData } from "@/lib/types";

/**
 * Validates the data for a given step in the AI job creation form.
 * @param step The current step number (1, 2, or 3).
 * @param formData The current state of the form data.
 * @returns `true` if the step is valid, otherwise `false`.
 */
export const validateStep = (step: number, formData: JobFormData): boolean => {
  // Add a guard clause to prevent errors if formData is not yet fully initialized
  if (!formData.jobInformation || !formData.experienceSkills || !formData.jobDescription) {
    return false;
  }

  switch (step) {
    case 1:
      const { jobInformation } = formData;
      // MODIFIED: Added checks to ensure values are not null before trimming.
      return (
        !!jobInformation.jobTitle && jobInformation.jobTitle.trim() !== '' &&
        !!jobInformation.jobId && jobInformation.jobId.trim() !== '' &&
        jobInformation.jobLocation.length > 0 &&
        jobInformation.numberOfCandidates > 0 &&
        !!jobInformation.hiringMode
      );
    case 2:
      const { experienceSkills } = formData;
      const minExp = experienceSkills.minimumYear * 12 + experienceSkills.minimumMonth;
      const maxExp = experienceSkills.maximumYear * 12 + experienceSkills.maximumMonth;
      return (
        maxExp >= minExp &&
        experienceSkills.skills.length > 0
      );
    case 3:
      const { jobDescription } = formData;
      // MODIFIED: Added a check to ensure description is not null before checking length.
      return !!jobDescription.description && jobDescription.description.length >= 100;
    default:
      return false;
  }
};

// The rest of the file (mapFormDataToJobData, mapJobDataToFormData) is correct and does not need changes.
/**
 * Maps the UI form data back to the database structure for saving.
 */
export const mapFormDataToJobData = (
  formData: JobFormData,
  organization_id: string,
  created_by: string
): Partial<JobData> => {
  const { jobInformation, experienceSkills, jobDescription } = formData;

  return {
    // From JobInformation Step
    title: jobInformation.jobTitle,
    jobId: jobInformation.jobId,
    location: jobInformation.jobLocation,
    hiring_mode: jobInformation.hiringMode,
    notice_period: jobInformation.noticePeriod,
    number_of_candidates: jobInformation.numberOfCandidates,

    // From ExperienceSkills Step
    experience: {
      minimumYear: experienceSkills.minimumYear,
      minimumMonth: experienceSkills.minimumMonth,
      maximumYear: experienceSkills.maximumYear,
      maximumMonth: experienceSkills.maximumMonth,
    },
    skills: experienceSkills.skills,

    // From JobDescription Step
    description: jobDescription.description,

    // Default/System values
    job_type_category: "Internal",
    status: "OPEN",
    organization_id,
    created_by,
  };
};

/**
 * Maps existing JobData (from DB) to the form's state shape for editing.
 */
export const mapJobDataToFormData = (job: JobData): JobFormData => {
  return {
    jobInformation: {
      jobTitle: job.title || '',
      jobLocation: job.location || [],
      hiringMode: job.hiring_mode || 'Full Time',
      jobId: job.jobId || '',
      noticePeriod: job.notice_period || 'Immediate',
      numberOfCandidates: job.number_of_candidates || 1,
    },
    experienceSkills: {
      minimumYear: job.experience?.minimumYear || 0,
      minimumMonth: job.experience?.minimumMonth || 0,
      maximumYear: job.experience?.maximumYear || 0,
      maximumMonth: job.experience?.maximumMonth || 0,
      skills: job.skills || [],
    },
    jobDescription: {
      description: job.description || '',
    },
  };
};