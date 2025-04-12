
import React, { useState, type ChangeEvent } from "react";
import { LoaderCircle, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UploadFieldProps } from "./upload/types";
import { DeleteDialog } from "./upload/DeleteDialog";
import { FilePreview } from "./upload/FilePreview";
import { UploadProgress } from "./upload/UploadProgress";

export const UploadField: React.FC<UploadFieldProps> = ({
  label,
  value,
  required,
  onUpload,
  showProgress = false,
  currentFile,
  onRemove,
  error,
  multiple = false,
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setProgress(0);
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      try {
        await onUpload(file);
        setProgress(100);
        toast.success("Document uploaded successfully");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload document");
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsUploading(false);
          setProgress(0);
        }, 500);
      }
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (onRemove) {
      await onRemove();
      toast.success("Document deleted successfully");
    }
    setShowDeleteDialog(false);
  };

  const createSyntheticEvent = (file: File): ChangeEvent<HTMLInputElement> => {
    const input = document.createElement('input');
    input.type = 'file';
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    return {
      target: input,
      currentTarget: input,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: Event.AT_TARGET,
      isTrusted: true,
      preventDefault: () => {},
      isDefaultPrevented: () => false,
      stopPropagation: () => {},
      isPropagationStopped: () => false,
      persist: () => {},
      timeStamp: Date.now(),
      type: 'change',
      nativeEvent: new Event('change')
    } as ChangeEvent<HTMLInputElement>;
  };

  return (
    <>
      <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
        <div className="text-[rgba(48,48,48,1)] font-semibold text-[6px]">
          {label}
          {required && <span className="text-[rgba(221,1,1,1)]">*</span>}
        </div>
        
        <div className="self-stretch flex flex-col gap-1">
          {currentFile ? (
            <FilePreview
              file={currentFile}
              onReplace={(file) => {
                handleFileChange(createSyntheticEvent(file));
              }}
              onDelete={() => setShowDeleteDialog(true)}
              compact={compact}
              disabled={isUploading}
            />
          ) : (
            <div className={`flex items-center justify-between w-full ${compact ? 'p-2' : 'p-4'} border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors`}>
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <LoaderCircle className="animate-spin h-4 w-4" />
                  <span className="text-[6px]">Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-[6px] text-gray-600">{value || `Upload ${label}`}</span>
                </div>
              )}
              <label className="text-[rgba(225,1,2,1)] text-[6px] font-semibold cursor-pointer">
                + Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  disabled={isUploading}
                  multiple={multiple}
                />
              </label>
            </div>
          )}

          {showProgress && isUploading && (
            <UploadProgress progress={progress} />
          )}

          {error && (
            <div className="flex items-center gap-1 mt-1 text-[6px] text-[#DD0101]">
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
      />
    </>
  );
};
