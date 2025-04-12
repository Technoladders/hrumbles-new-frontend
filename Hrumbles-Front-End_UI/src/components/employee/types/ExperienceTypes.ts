
import { Experience } from "@/services/types/employee.types";

export type ExperienceData = Omit<Experience, 'id'> & {
  id?: string;
};

export interface ExperienceFormFieldsProps {
  formData: Partial<ExperienceData>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<Partial<ExperienceData>>>;
}

export interface DocumentUploadsProps {
  formData: Partial<ExperienceData>;
  handleFileUpload: (field: keyof Experience) => (file: File) => Promise<void>;
}
