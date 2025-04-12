
import React from "react";
import { UploadField } from "../UploadField";
import { Experience } from "@/services/types/employee.types";
import { DocumentUploadsProps } from "../types/ExperienceTypes";

export const ExperienceDocumentUploads: React.FC<DocumentUploadsProps> = ({
  formData,
  handleFileUpload,
}) => {
  const getFileDetails = (value: File | string | undefined) => {
    if (!value) return undefined;
    if (value instanceof File) {
      return {
        name: value.name,
        type: value.type,
        size: value.size
      };
    }
    return {
      name: typeof value === 'string' ? value.split('/').pop() || 'Document' : 'Document',
      type: 'application/pdf',
      url: typeof value === 'string' ? value : undefined
    };
  };

  const handleRemoveDocument = (field: keyof Experience) => () => {
    // This will be implemented when we add document removal functionality
    console.log('Remove document:', field);
  };

  return (
    <div className="space-y-4">
      <UploadField
        label="Offer Letter"
        required
        onUpload={handleFileUpload("offerLetter")}
        currentFile={getFileDetails(formData.offerLetter)}
        onRemove={handleRemoveDocument("offerLetter")}
        showProgress
      />

      <UploadField
        label="Separation Letter"
        required
        onUpload={handleFileUpload("separationLetter")}
        currentFile={getFileDetails(formData.separationLetter)}
        onRemove={handleRemoveDocument("separationLetter")}
        showProgress
      />

      <UploadField
        label="Payslips"
        required
        onUpload={handleFileUpload("payslips")}
        currentFile={
          formData.payslips?.length
            ? getFileDetails(formData.payslips[formData.payslips.length - 1])
            : undefined
        }
        value={
          formData.payslips?.length
            ? `${formData.payslips.length} file(s) selected`
            : undefined
        }
        showProgress
        multiple
      />
    </div>
  );
};
