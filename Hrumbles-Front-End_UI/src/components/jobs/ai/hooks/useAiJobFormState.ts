import { useState } from 'react';
import { deepMerge } from '@/lib/utils';

// MODIFIED: This interface now EXACTLY matches the props of your step components.
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

// MODIFIED: The default state now matches the corrected interface.
const defaultState: JobFormData = {
  jobInformation: {
    hiringMode: 'Full Time',
    jobId: '',
    jobTitle: '',
    numberOfCandidates: 1,
    jobLocation: [],
    noticePeriod: 'Immediate',
  },
  experienceSkills: {
    minimumYear: 0,
    minimumMonth: 0,
    maximumYear: 0,
    maximumMonth: 0,
    skills: [],
  },
  jobDescription: {
    description: '',
  },
};

export const useAiJobFormState = ({ initialAiData }: { initialAiData?: Partial<JobFormData> | null }) => {
  const getInitialState = (): JobFormData => {
    if (initialAiData) {
      return deepMerge(defaultState, initialAiData);
    }
    return defaultState;
  };

  const [formData, setFormData] = useState<JobFormData>(getInitialState);

  const updateFormData = (step: keyof JobFormData, data: any) => {
    setFormData(prev => ({ ...prev, [step]: { ...prev[step], ...data } }));
  };

  // This is correct and remains the same.
  return { formData, updateFormData, setFormData };
};