// hooks/useJobFormState.ts

import { useState, useEffect } from "react";
import { JobData } from "@/lib/types";
import { getLastJobIdForOrg } from "@/services/jobs/supabaseQueries";
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';



const TUP_ORG_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";

// ==================================================================
// 1. TYPE DEFINITIONS
// ==================================================================

interface Skill {
  name: string;
  category: "IT" | "Non-IT";
}

export interface JobInformationData {
  hiringMode: string;
  jobId: string; // The form state expects camelCase
  jobTitle: string;
  numberOfCandidates: number;
  jobLocation: string[];
  noticePeriod: string;
  minimumYear: number;
  minimumMonth: number;
  maximumYear: number;
  maximumMonth: number;
  dueDate: string | null;
}

export interface ExperienceSkillsData {
  skills: string[];
}

export interface ClientDetailsData {
  clientName: string;
  clientBudget: string;
  endClient: string;
  pointOfContact: string;
  assignedTo: string;
  clientProjectId: string;
  currency_type: string;
  budget_type: string;
}

export interface JobDescriptionData {
  description: string;
  skills: Skill[];
}

export interface JobFormData {
  jobInformation: JobInformationData;
  experienceSkills: ExperienceSkillsData;
  clientDetails: ClientDetailsData;
  jobDescription: JobDescriptionData;
}

interface UseJobFormStateProps {
  jobType: "Internal" | "External";
  editJob: JobData | null;
}

// ==================================================================
// 2. THE CUSTOM HOOK
// ==================================================================

export const useJobFormState = ({ jobType, editJob }: UseJobFormStateProps) => {
  const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

    const organizationId = organization_id;


  const [formData, setFormData] = useState<JobFormData>({
    jobInformation: {
      hiringMode: jobType === "Internal" ? "Full Time" : "",
      jobId: "",
      jobTitle: "",
      numberOfCandidates: 1,
      jobLocation: [],
      noticePeriod: "",
      minimumYear: 0,
      minimumMonth: 0,
      maximumYear: 0,
      maximumMonth: 0,
      dueDate: null,
    },
    experienceSkills: {
      skills: [],
    },
    clientDetails: {
      clientName: "",
      clientBudget: "",
      endClient: "",
      pointOfContact: "",
      assignedTo: "",
      clientProjectId: "",
      currency_type: "INR",
      budget_type: "LPA",
    },
    jobDescription: { 
      description: '', 
      skills: [] 
    },
  });
  
  useEffect(() => {
    if (editJob) {
      const initialFormData: JobFormData = {
        jobInformation: {
          hiringMode: editJob.hiringMode || (jobType === "Internal" ? "Full Time" : ""),
          
          // --- THIS IS THE FIX ---
          // The `editJob` object was transformed, so we must use the camelCase `jobId` property.
          jobId: editJob.jobId || "",

          jobTitle: editJob.title || "",
          numberOfCandidates: Number(editJob.numberOfCandidates) || 1,
          jobLocation: editJob.location || [],
          noticePeriod: editJob.noticePeriod || "",
          minimumYear: editJob.experience?.min?.years || 0,
          minimumMonth: editJob.experience?.min?.months || 0,
          maximumYear: editJob.experience?.max?.years || 0,
          maximumMonth: editJob.experience?.max?.months || 0,
          dueDate: editJob.dueDate || null,
        },
        experienceSkills: {
          skills: editJob.skills || [],
        },
        clientDetails: {
          clientName: editJob.clientDetails?.clientName || "",
          clientBudget: String(editJob.clientDetails?.clientBudget) || "",
          endClient: editJob.clientDetails?.endClient || "",
          pointOfContact: editJob.clientDetails?.pointOfContact || "",
          assignedTo: editJob.assignedTo?.name || "",
          clientProjectId: editJob.clientProjectId || "",
          currency_type: editJob.currencyType || "INR",
          budget_type: editJob.budgetType || "LPA",
        },
        jobDescription: {
          description: editJob.description || "",
          skills: (editJob.skills || []).map(skillName => ({ name: skillName, category: 'IT' })),
        },
      };
      
      setFormData(initialFormData);
    }
  }, [editJob, jobType]);

    // 2. Handle Auto-ID Generation (Only for TUP Org & New Jobs)
  useEffect(() => {
    const generateTupId = async () => {
      if (!editJob && organizationId === TUP_ORG_ID) {
        
        const lastId = await getLastJobIdForOrg(TUP_ORG_ID);
        let nextId = "TUP001"; // Default start

        if (lastId) {
          // Extract numeric part
          const match = lastId.match(/^TUP(\d+)$/);
          if (match) {
            const numStr = match[1];
            const currentLength = numStr.length;
            const currentVal = parseInt(numStr, 10);
            
            // Calculate max value for current digit length (e.g., 999 for length 3)
            const maxVal = Math.pow(10, currentLength) - 1;
            
            let nextValString = "";
            let nextPrefixLength = currentLength;

            if (currentVal >= maxVal) {
               // Expand digits: 999 -> 0001
               nextPrefixLength = currentLength + 1;
               nextValString = "1".padStart(nextPrefixLength, "0");
            } else {
               // Standard increment
               nextValString = (currentVal + 1).toString().padStart(currentLength, "0");
            }
            
            nextId = `TUP${nextValString}`;
          }
        }

        setFormData(prev => ({
          ...prev,
          jobInformation: {
            ...prev.jobInformation,
            jobId: nextId
          }
        }));
      }
    };

    generateTupId();
  }, [organizationId, editJob]);


  const updateFormData = (step: keyof JobFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  };

  return {
    formData,
    updateFormData
  };
};