
import { useState, useEffect } from "react";
import { JobData } from "@/lib/types";

interface UseJobFormStateProps {
  jobType: "Internal" | "External";
  editJob: JobData | null;
}

export interface JobInformationData {
  hiringMode: string;
  jobId: string;
  jobTitle: string;
  numberOfCandidates: number;
  jobLocation: string[];
  noticePeriod: string;
}

export interface ExperienceSkillsData {
  minimumYear: number;
  minimumMonth: number;
  maximumYear: number;
  maximumMonth: number;
  skills: string[];
}

export interface ClientDetailsData {
  clientName: string;
  clientBudget: string;
  endClient: string;
  pointOfContact: string;
  assignedTo: string;
  clientProjectId: string;
}

export interface JobDescriptionData {
  description: string;
}

export interface JobFormData {
  jobInformation: JobInformationData;
  experienceSkills: ExperienceSkillsData;
  clientDetails: ClientDetailsData;
  jobDescription: JobDescriptionData;
}

export const useJobFormState = ({ jobType, editJob }: UseJobFormStateProps) => {
  const [formData, setFormData] = useState<JobFormData>({
    jobInformation: {
      hiringMode: jobType === "Internal" ? "Full Time" : "",
      jobId: "",
      jobTitle: "",
      numberOfCandidates: 1,
      jobLocation: [],
      noticePeriod: "",
    },
    experienceSkills: {
      minimumYear: 0,
      minimumMonth: 0,
      maximumYear: 0,
      maximumMonth: 0,
      skills: [],
    },
    clientDetails: {
      clientName: "",
      clientBudget: "",
      endClient: "",
      pointOfContact: "",
      assignedTo: "",
      clientProjectId: "",
    },
    jobDescription: {
      description: "",
    },
  });
  
  // Initialize form with edit job data if provided
  useEffect(() => {
    if (editJob) {
      const initialFormData = {
        jobInformation: {
          hiringMode: editJob.hiringMode || (jobType === "Internal" ? "Full Time" : ""),
          jobId: editJob.jobId || "",
          jobTitle: editJob.title || "",
          numberOfCandidates: editJob.numberOfCandidates || "",
          jobLocation: editJob.location || [],
          noticePeriod: editJob.noticePeriod || "",
        },
        experienceSkills: {
          minimumYear: editJob.experience?.min?.years || 0,
          minimumMonth: editJob.experience?.min?.months || 0,
          maximumYear: editJob.experience?.max?.years || 0,
          maximumMonth: editJob.experience?.max?.months || 0,
          skills: editJob.skills || [],
        },
        clientDetails: {
          clientName: editJob.clientDetails?.clientName || "",
          clientBudget: editJob.clientDetails?.clientBudget || "",
          endClient: editJob.clientDetails?.endClient || "",
          pointOfContact: editJob.clientDetails?.pointOfContact || "",
          assignedTo: editJob.assignedTo?.name || "",
          clientProjectId: editJob.clientProjectId || "",
        },
        jobDescription: {
          description: editJob.description || "",
        },
      };
      
      setFormData(initialFormData);
    }
  }, [editJob, jobType]);

  const updateFormData = (step: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: {...prev[step as keyof typeof prev], ...data},
    }));
  };

  return {
    formData,
    updateFormData
  };
};
