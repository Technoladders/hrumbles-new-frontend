
import React from "react";
import { UploadField } from "../UploadField";
import { Experience } from "@/services/types/employee.types";

interface DocumentUploadsProps {
  formData: Partial<Experience>;
  handleFileUpload: (field: keyof Experience) => (file: File) => Promise<void>;
}

export const DocumentUploads: React.FC<DocumentUploadsProps> = ({
  formData,
  handleFileUpload,
}) => {
  const getDisplayValue = (value: File | string | undefined): string | undefined => {
    if (!value) return undefined;
    if (value instanceof File) return value.name;
    return typeof value === 'string' ? value : undefined;
  };

  return (
    <div className="space-y-4">
      <UploadField
        label="Offer Letter"
        required
        onUpload={handleFileUpload("offerLetter")}
        value={getDisplayValue(formData.offerLetter)}
        showProgress
      />
      <UploadField
        label="Separation Letter"
        required
        onUpload={handleFileUpload("separationLetter")}
        value={getDisplayValue(formData.separationLetter)}
        showProgress
      />
      <UploadField
        label="Payslip"
        required
        onUpload={handleFileUpload("payslips")}
        value={
          formData.payslips && formData.payslips.length > 0
            ? `${formData.payslips.length} file(s) selected`
            : undefined
        }
        showProgress
      />
    </div>
  );
};
