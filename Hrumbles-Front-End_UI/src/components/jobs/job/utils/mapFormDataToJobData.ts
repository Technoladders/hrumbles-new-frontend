
import { JobData } from "@/lib/types";
import { JobFormData } from "../hooks/useJobFormState";

export const mapFormDataToJobData = (
  formData: JobFormData, 
  editJob: JobData | null,
  jobType: "Internal" | "External",
   internalType: "Inhouse" | "Client Side" | null
): JobData => {
  console.log("Mapping form data to job data:", formData);

  const isClientSideInternal = jobType === "Internal" && internalType === "Client Side";
  const submissionType = isClientSideInternal || jobType === "External" ? "Client" : "Internal";
  const clientOwner = submissionType === "Client" ? formData.clientDetails.clientName : "Internal HR";
  
  // Create the job data object
  const jobData: JobData = {
    id: editJob?.id || crypto.randomUUID(),
    jobId: formData.jobInformation.jobId,
    title: formData.jobInformation.jobTitle,
    department: editJob?.department || "Engineering", // Default value, could be made editable
    location: formData.jobInformation.jobLocation,
    type: "Full-time", // Default value, could be made editable
    status: editJob?.status || "Active",
    postedDate: editJob?.postedDate || new Date().toISOString().split('T')[0],
    applications: editJob?.applications || 0,
    dueDate: editJob?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientOwner: clientOwner,
    submissionType: submissionType,
    hiringMode: formData.jobInformation.hiringMode || "Full Time",
    
    jobType: jobType, // Set the job type
    experience: {
      min: { 
        years: formData.experienceSkills.minimumYear, 
        months: formData.experienceSkills.minimumMonth 
      },
      max: { 
        years: formData.experienceSkills.maximumYear, 
        months: formData.experienceSkills.maximumMonth 
      }
    },
    skills: formData.experienceSkills.skills,
    description: formData.jobDescription.description,
    descriptionBullets: [],
    clientDetails: {
      clientName: formData.clientDetails.clientName,
      clientBudget: formData.clientDetails.clientBudget,
      endClient: formData.clientDetails.endClient,
      pointOfContact: formData.clientDetails.pointOfContact
    },
    noticePeriod: formData.jobInformation.noticePeriod,
    numberOfCandidates: formData.jobInformation.numberOfCandidates 
  };

  // Only add clientProjectId if it's present in the form data
  if (formData.clientDetails.clientProjectId) {
    jobData.clientProjectId = formData.clientDetails.clientProjectId;
  }

  // Add assignedTo if present
  if (formData.clientDetails.assignedTo) {
    jobData.assignedTo = {
      type: "individual",
      name: formData.clientDetails.assignedTo
    };
  }

  console.log("Final job data:", jobData);
  return jobData;
};
