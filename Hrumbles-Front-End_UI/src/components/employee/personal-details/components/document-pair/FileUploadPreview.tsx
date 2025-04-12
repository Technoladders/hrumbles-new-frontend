
import React from "react";
import { FileText, Loader2, Replace, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Document } from "@/services/types/employee.types";

interface FileUploadPreviewProps {
  currentDocument?: Document;
  label: string;
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  onDelete: () => void;
}

export const FileUploadPreview: React.FC<FileUploadPreviewProps> = ({
  currentDocument,
  label,
  isUploading,
  uploadProgress,
  onUpload,
  onDelete,
}) => {
  return (
    <div className="relative">
      {currentDocument?.documentUrl ? (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg w-full group hover:bg-gray-100 transition-colors">
          <FileText className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium truncate">
              {currentDocument.fileName || 'Document'}
            </span>
            <span className="text-xs text-gray-500">
              {currentDocument.documentType.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer p-1.5 rounded-full hover:bg-gray-200 transition-colors">
              <Replace className="h-4 w-4 text-gray-500" />
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
                disabled={isUploading}
              />
            </label>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
              disabled={isUploading}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
          <label className="w-full h-full flex items-center justify-between p-2 cursor-pointer">
            <div className="flex items-center gap-2">
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-xs text-gray-600">Upload {label}</span>
            </div>
            <span className="text-[rgba(225,1,2,1)] text-xs font-semibold">+ Upload</span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
              disabled={isUploading}
            />
          </label>
        </div>
      )}

      {isUploading && (
        <div className="mt-2">
          <Progress value={uploadProgress} className="h-1" />
          <div className="text-xs text-gray-500 text-right mt-1">
            {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
};
