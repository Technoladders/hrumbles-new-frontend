
import { useState } from "react";
import { toast } from "sonner";
import { Document } from "@/services/types/employee.types";

interface UseDocumentUploadProps {
  label: string;
  documentType: Document['documentType'];
  onUpload: (type: Document['documentType'], file: File) => Promise<void>;
  onDelete: (type: Document['documentType']) => Promise<void>;
  currentDocument?: Document;
}

export const useDocumentUpload = ({
  label,
  documentType,
  onUpload,
  onDelete,
  currentDocument,
}: UseDocumentUploadProps) => {
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    if (currentDocument?.documentUrl) {
      setPendingFile(file);
      setShowReplaceDialog(true);
    } else {
      await processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload(documentType, file);
      setUploadProgress(100);
      toast.success(`${label} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Failed to upload ${label}`);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setPendingFile(null);
        setShowReplaceDialog(false);
      }, 500);
    }
  };

  const handleReplace = async () => {
    if (pendingFile) {
      await processUpload(pendingFile);
    }
  };

  const handleDelete = async () => {
    setIsUploading(true);
    try {
      await onDelete(documentType);
      toast.success(`${label} deleted successfully`);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(`Failed to delete ${label}`);
    } finally {
      setIsUploading(false);
    }
  };

  return {
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
  };
};
