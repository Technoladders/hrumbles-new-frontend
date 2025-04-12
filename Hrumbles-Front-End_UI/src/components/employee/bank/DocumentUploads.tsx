
import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { UploadField } from "../UploadField";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "./bankAccountSchema";
import { uploadDocument } from "@/utils/uploadDocument";
import { UploadedFile } from "../upload/types";

interface DocumentUploadsProps {
  setValue: (field: string, value: any) => void;
  formValues: {
    cancelledCheque?: File | string;
    passbookCopy?: File | string;
  };
}

export const DocumentUploads: React.FC<DocumentUploadsProps> = ({ setValue, formValues }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

  const handleFileUpload = (fieldName: "cancelledCheque" | "passbookCopy") => async (file: File) => {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (PNG, JPG)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "File size should not exceed 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading({ ...uploading, [fieldName]: true });

    try {
      const url = await uploadDocument(file, 'bank-documents', fieldName);
      setValue(fieldName, url);
      toast({
        title: "File uploaded",
        description: "Document uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading({ ...uploading, [fieldName]: false });
    }
  };

  const getFileDetails = (value: File | string | undefined): UploadedFile | undefined => {
    if (!value) return undefined;
    
    if (value instanceof File) {
      return {
        name: value.name,
        type: value.type,
        size: value.size
      };
    }

    return {
      name: value.split('/').pop() || 'Document',
      type: 'application/pdf',
      url: value
    };
  };

  const handleRemove = (fieldName: string) => () => {
    setValue(fieldName, undefined);
    toast({
      title: "Document removed",
      description: "Document has been removed successfully.",
    });
  };

  return (
    <div className="col-span-2">
      <div className="space-y-4">
        <UploadField
          label="Cancelled Cheque"
          required
          onUpload={handleFileUpload("cancelledCheque")}
          currentFile={getFileDetails(formValues.cancelledCheque)}
          onRemove={handleRemove("cancelledCheque")}
          showProgress
        />
        
        <UploadField
          label="Bank Passbook/Statement"
          required
          onUpload={handleFileUpload("passbookCopy")}
          currentFile={getFileDetails(formValues.passbookCopy)}
          onRemove={handleRemove("passbookCopy")}
          showProgress
        />
      </div>
    </div>
  );
};
