
// Personal Information
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  availability: string; // Added new field
  
}

// Experience Entry
export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  description: string;
  fromDate: string;
  toDate: string;
  currentlyWorking: boolean;
  skills: string[];
}

// Education Entry
export interface EducationEntry {
  institute: string;
  degree: string;
  percentage: string;
  fromDate: string;
  toDate: string;
}

// Complete Application Form Data
export interface ApplicationFormData {
  expectedSalary: Number;
  currentSalary: Number;
  personalInfo: PersonalInfo;
  resume: File | null;
  coverLetter: string;

}

// Form components props
export interface FormSectionProps {
  formData: ApplicationFormData;
  updateFormData: (newData: ApplicationFormData) => void;
  errors: Record<string, string>;
  showValidationErrors: boolean;
}
