
import React from "react";
import { Document } from "@/services/types/employee.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadPreview } from "./document-pair/FileUploadPreview";
import { DocumentDialogs } from "./document-pair/DocumentDialogs";
import { useDocumentUpload } from "./document-pair/useDocumentUpload";

interface DocumentPairProps {
  documentType: Document['documentType'];
  documents: Document[];
  label: string;
  required?: boolean;
  placeholder?: string;
  pattern?: string;
  updateDocumentNumber: (type: Document['documentType'], value: string) => void;
  onUpload: (type: Document['documentType'], file: File) => Promise<void>;
  onDelete: (type: Document['documentType']) => Promise<void>;
}

export const DocumentPair: React.FC<DocumentPairProps> = ({
  documentType,
  documents = [],
  label,
  required,
  placeholder,
  pattern,
  updateDocumentNumber,
  onUpload,
  onDelete,
}) => {
  const currentDocument = documents?.find(doc => doc.documentType === documentType);
  
  const {
    showReplaceDialog,
    showDeleteDialog,
    uploadProgress,
    isUploading,
    setShowReplaceDialog,
    setShowDeleteDialog,
    handleUpload,
    handleReplace,
    handleDelete,
    setPendingFile,
  } = useDocumentUpload({
    label,
    documentType,
    onUpload,
    onDelete,
    currentDocument,
  });

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          value={currentDocument?.documentNumber || ''}
          onChange={(e) => updateDocumentNumber(documentType, e.target.value)}
          placeholder={placeholder}
          pattern={pattern}
          className="w-full"
        />

        <FileUploadPreview
          currentDocument={currentDocument}
          label={label}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUpload={handleUpload}
          onDelete={() => setShowDeleteDialog(true)}
        />
      </div>

      <DocumentDialogs
        label={label}
        showReplaceDialog={showReplaceDialog}
        showDeleteDialog={showDeleteDialog}
        onReplaceDialogChange={setShowReplaceDialog}
        onDeleteDialogChange={setShowDeleteDialog}
        onReplace={handleReplace}
        onDelete={handleDelete}
        onCancelReplace={() => setPendingFile(null)}
      />
    </div>
  );
};
