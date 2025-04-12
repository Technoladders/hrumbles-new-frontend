
import React from "react";
import { FileText, Replace, Trash2 } from "lucide-react";
import { UploadedFile, formatFileSize, getFileType } from "./types";

interface FilePreviewProps {
  file: UploadedFile;
  onReplace: (file: File) => void;
  onDelete: () => void;
  compact?: boolean;
  disabled?: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onReplace,
  onDelete,
  compact = false,
  disabled = false,
}) => {
  const isImage = file.type?.startsWith('image/');
  const fileSize = file.size ? formatFileSize(file.size) : '';
  const fileType = file.type ? getFileType(file.type) : '';

  return (
    <div className={`flex items-center gap-2 ${compact ? 'p-1.5' : 'p-2'} bg-gray-50 rounded-lg w-full group hover:bg-gray-100 transition-colors`}>
      {isImage ? (
        <img 
          src={file.url} 
          alt={file.name}
          className="h-6 w-6 object-cover rounded"
        />
      ) : (
        <FileText className="h-5 w-5 text-gray-500" />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[6px] font-medium truncate">{file.name}</span>
        {!compact && fileType && (
          <span className="text-[6px] text-gray-500">
            {fileType} {fileSize && `• ${fileSize}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer p-1.5 rounded-full hover:bg-gray-200 transition-colors">
          <Replace className="h-4 w-4 text-gray-500" />
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
            }}
            accept=".pdf,.png,.jpg,.jpeg"
            disabled={disabled}
          />
        </label>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};
