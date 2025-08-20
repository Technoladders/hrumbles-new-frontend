import { useState } from 'react';
import { deepMerge } from '@/lib/utils'; // You'll need a deep merge utility

// Define the shape of your form data
export interface JobFormData {
  jobInformation: {
    hiringMode: string;
    jobId: string;
    jobTitle: string;
    numberOfCandidates: number;
    jobLocation: string[];
    noticePeriod?: string;
  };
  experienceSkills: {
    minimumYear: number;
    minimumMonth: number;
    maximumYear: number;
    maximumMonth: number;
    skills: string[];
  };
  jobDescription: {
    description: string;
  };
}

const defaultState: JobFormData = {
  jobInformation: { hiringMode: 'Full Time', jobId: '', jobTitle: '', numberOfCandidates: 1, jobLocation: [], noticePeriod: '' },
  experienceSkills: { minimumYear: 0, minimumMonth: 0, maximumYear: 0, maximumMonth: 0, skills: [] },
  jobDescription: { description: '' },
};

export const useAiJobFormState = ({ initialAiData }: { initialAiData?: Partial<JobFormData> | null }) => {
  const getInitialState = (): JobFormData => {
    if (initialAiData) {
      // Deep merge will intelligently combine the AI data with the default structure
      return deepMerge(defaultState, initialAiData);
    }
    return defaultState;
  };

  const [formData, setFormData] = useState<JobFormData>(getInitialState);

  const updateFormData = (step: keyof JobFormData, data: any) => {
    setFormData(prev => ({ ...prev, [step]: { ...prev[step], ...data } }));
  };

  return { formData, updateFormData, setFormData };
};