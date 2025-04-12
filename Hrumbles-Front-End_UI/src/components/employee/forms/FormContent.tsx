
import React from "react";
import { PersonalDetailsForm } from "../PersonalDetailsForm";
import { EducationForm } from "../EducationForm";
import { ExperienceForm } from "../ExperienceForm";
import { BankAccountForm } from "../BankAccountForm";
import { FormProgress, FormData } from "@/utils/progressCalculator";
import { Experience, PersonalDetailsData } from "../types";

interface FormContentProps {
  activeTab: string;
  formData: FormData;
  updateSectionProgress: (section: keyof FormProgress, completed: boolean) => void;
  updateFormData: (section: keyof FormData, data: any) => void;
  formRef: React.RefObject<HTMLFormElement>; 
  isCheckingEmail?: boolean;
  emailError?: string | null;
  isSubmitting?: boolean;
  handleSaveAndNext: (data: any) => void;
}

export const FormContent: React.FC<FormContentProps> = ({
  activeTab,
  formData,
  updateSectionProgress,
  updateFormData,
  isCheckingEmail,
  emailError,
  isSubmitting,
  formRef,
  handleSaveAndNext
}) => {
  switch (activeTab) {
    case "personal":
      return (
        <PersonalDetailsForm
        onComplete={(completed: boolean, data?: any) => {
          console.log("onComplete called - Completed:", completed, "Data:", data);
          if (completed && data) {
            updateFormData("personal", data); // ✅ Ensure personal data is updated
            updateSectionProgress("personal", completed);
            setTimeout(() => { // 🕒 Delay moving forward to ensure state update
              handleSaveAndNext(data);
            }, 100);
          } else {
            console.warn("⚠️ Warning: No data received from PersonalDetailsForm");
          }
        }}
        
        initialData={formData.personal} // Ensure initial data is passed
        isCheckingEmail={isCheckingEmail}
        emailError={emailError}
        isSubmitting={isSubmitting}
        formRef={formRef}
      />
      
      );
      case "education":
        return (
          <>
            <EducationForm
              onComplete={(completed: boolean, data?: any) => {
                if (completed && data) {
                  updateFormData("education", data);
                  updateSectionProgress("education", completed);
                  handleSaveAndNext(data); // ✅ Automatically move to "bank" after saving
                }
              }}
              initialData={formData.education}
            />
            <div className="shrink-0 h-px mt-[29px] border-[rgba(239,242,255,1)] border-solid border-2" />
            <ExperienceForm
              onComplete={(completed: boolean, data?: Experience[]) => {
                if (completed && data) {
                  updateFormData("experience", data);
                  updateSectionProgress("experience", completed);
                }
              }}
              experiences={formData.experience}
            />
          </>
        );
      
    case "bank":
      return (
        <BankAccountForm
          onComplete={(completed: boolean, data?: any) => {
            if (completed && data) {
              updateFormData("bank", data);
              updateSectionProgress("bank", completed);
            }
          }}
          initialData={formData.bank}
        />
      );
    default:
      return null;
  }
};
