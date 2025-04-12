
import { 
  PersonalDetailsData, 
  EducationData, 
  Experience, 
  BankAccountData 
} from "@/components/employee/types";

export interface FormProgress {
  personal: boolean;
  education: boolean;
  experience: boolean;
  bank: boolean;
}

export interface FormData {
  personal: PersonalDetailsData | null;
  education: EducationData | null;
  experience: Experience[];
  bank: BankAccountData | null;
}

export const calculateProgress = (formData: FormData): FormProgress => {
  const hasPersonalData = !!formData.personal;
  const hasEducationData = !!formData.education;
  const hasExperienceData = formData.experience && formData.experience.length > 0;
  const hasBankData = !!formData.bank;

  return {
    personal: hasPersonalData,
    education: hasEducationData,
    experience: hasExperienceData,
    bank: hasBankData,
  };
};

export const getProgressMessage = (formData: FormData): string => {
  const progress = calculateProgress(formData);
  const completedSections = Object.values(progress).filter(Boolean).length;
  const totalSections = Object.keys(progress).length;
  
  if (completedSections === totalSections) {
    return "All sections completed";
  }
  
  return `${completedSections} of ${totalSections} sections completed`;
};
