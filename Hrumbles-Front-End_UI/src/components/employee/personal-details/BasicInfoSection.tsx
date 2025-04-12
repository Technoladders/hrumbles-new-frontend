
import React, {useEffect} from "react";
import { BasicDetailsFields } from "./components/BasicDetailsFields";
import { PersonalInfoFields } from "./components/PersonalInfoFields";
import { DocumentationSection } from "./components/DocumentationSection";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { Document } from "@/services/types/employee.types";
import { UseFormReturn } from "react-hook-form";
import { PersonalDetailsFormSchema } from "./schema/personalDetailsSchema";

interface BasicInfoSectionProps {
  register: UseFormReturn<PersonalDetailsFormSchema>;
  errors: any;
  isCheckingEmail?: boolean;
  emailError?: string | null;
  isCheckingPhone?: boolean;
  phoneError?: string | null;
  onProfilePictureChange?: (url: string) => void;
  onProfilePictureDelete?: () => Promise<void>;
  profilePictureUrl?: string;
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  setValue: UseFormReturn<PersonalDetailsFormSchema>['setValue'];
  watch: UseFormReturn<PersonalDetailsFormSchema>['watch'];
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  register,
  isCheckingEmail,
  emailError,
  isCheckingPhone,
  phoneError,
  onProfilePictureChange,
  onProfilePictureDelete,
  profilePictureUrl,
  documents,
  onDocumentsChange,
  setValue,
  watch
}) => {

  useEffect(() => {
    console.log("Received Props in BasicInfoSection:", {
      profilePictureUrl,
      firstName: watch("firstName"),
      lastName: watch("lastName"),
      email: watch("email"),
      phone: watch("phone"),
      dateOfBirth: watch("dateOfBirth"),
      maritalStatus: watch("maritalStatus"),
    });
  }, [profilePictureUrl, watch]);
  
  
  return (
    <div className="space-y-8">
      <div>
        <div className="text-[rgba(48,64,159,1)] font-bold">Personal Info</div>
        <div className="text-[rgba(80,80,80,1)] text-xs mb-4">
          Fill in your personal details below.
        </div>

        <div className="mb-6">
          <ProfilePictureUpload
            value={profilePictureUrl}
            onChange={(url) => onProfilePictureChange?.(url)}
            onDelete={onProfilePictureDelete}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <BasicDetailsFields
            form={register}
            isCheckingEmail={isCheckingEmail}
            emailError={emailError}
            isCheckingPhone={isCheckingPhone}
            phoneError={phoneError}
          />
          <PersonalInfoFields form={register} />
        </div>
      </div>

      <DocumentationSection
        documents={documents}
        onDocumentsChange={onDocumentsChange}
      />
    </div>
  );
};
