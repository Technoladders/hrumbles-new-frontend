// hooks/useJobFormState.ts

import { useState, useEffect } from "react";
import { JobData } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
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
  isSkillMatrixMandatory: boolean;
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

    const [orgSettings, setOrgSettings] = useState<any>(null);


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
      isSkillMatrixMandatory: true,
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
          isSkillMatrixMandatory: editJob.isSkillMatrixMandatory || false,
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
          currency_type: editJob.currency_type || "INR",  // Direct from DB (snake_case)
  budget_type: editJob.budget_type || "LPA",      // Direct from DB (snake_case)
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
    const fetchSettingsAndGenerateId = async () => {
      // 1. Fetch organizational settings
      const { data: orgData } = await supabase
        .from("hr_organizations")
        .select("is_job_id_auto, job_id_prefix, is_skill_matrix_mandatory")
        .eq("id", organizationId)
        .single();

      if (orgData) setOrgSettings(orgData);

      // Do not generate ID if we are editing an existing job
      if (editJob) return;

      // 2. Logic for TUP Org (Leaves original behavior unchanged)
      if (organizationId === TUP_ORG_ID) {
        const lastId = await getLastJobIdForOrg(TUP_ORG_ID, "TUP");
        let nextId = "TUP001";

        if (lastId) {
          const match = lastId.match(/^TUP(\d+)$/);
          if (match) {
            const numStr = match[1];
            const currentLength = numStr.length;
            const currentVal = parseInt(numStr, 10);
            const maxVal = Math.pow(10, currentLength) - 1;
            
            let nextValString = "";
            let nextPrefixLength = currentLength;

            if (currentVal >= maxVal) {
               nextPrefixLength = currentLength + 1;
               nextValString = "1".padStart(nextPrefixLength, "0");
            } else {
               nextValString = (currentVal + 1).toString().padStart(currentLength, "0");
            }
            nextId = `TUP${nextValString}`;
          }
        }
        setFormData(prev => ({...prev, jobInformation: { ...prev.jobInformation, jobId: nextId }}));
      } 
      // 3. Logic for New Org Settings Prefix
      else if (orgData?.is_job_id_auto && orgData?.job_id_prefix) {
        const prefix = orgData.job_id_prefix;
        const lastId = await getLastJobIdForOrg(organizationId, prefix);
        let nextId = `${prefix}001`;

        if (lastId) {
          const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = lastId.match(new RegExp(`^${escapedPrefix}(\\d+)$`));
          if (match) {
            const numStr = match[1];
            const currentLength = numStr.length;
            const currentVal = parseInt(numStr, 10);
            const maxVal = Math.pow(10, currentLength) - 1;
            
            let nextValString = "";
            let nextPrefixLength = currentLength;

            if (currentVal >= maxVal) {
               nextPrefixLength = currentLength + 1;
               nextValString = "1".padStart(nextPrefixLength, "0");
            } else {
               nextValString = (currentVal + 1).toString().padStart(currentLength, "0");
            }
            nextId = `${prefix}${nextValString}`;
          }
        }
        setFormData(prev => ({...prev, jobInformation: { ...prev.jobInformation, jobId: nextId }}));
      }
    };

    fetchSettingsAndGenerateId();
  }, [organizationId, editJob]);


  const updateFormData = (step: keyof JobFormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data },
    }));
  };

  return {
    formData,
    updateFormData,
    orgSettings
  };
};