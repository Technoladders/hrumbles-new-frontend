
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadDocument } from "@/utils/uploadDocument";

interface IdDocumentFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDocumentUpload: (url: string) => void;
  documentUrl?: string;
  onDocumentDelete: () => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  pattern?: string;
  className?: string;
}

export const IdDocumentField: React.FC<IdDocumentFieldProps> = ({
  label,
  value,
  onChange,
  onDocumentUpload,
  documentUrl,
  onDocumentDelete,
  error,
  placeholder,
  required,
  pattern,
  className,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

    setIsUploading(true);
    try {
      const url = await uploadDocument(file, 'id-documents', label.toLowerCase().replace(' ', '-'));
      onDocumentUpload(url);
      toast.success(`${label} document uploaded successfully`);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(`Failed to upload ${label} document`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="flex-grow">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            pattern={pattern}
            className={error ? "border-red-500" : ""}
          />
          {error && (
            <div className="text-red-500 text-xs flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          {documentUrl ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onDocumentDelete}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={isUploading}
                asChild
              >
                <label>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                  />
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </label>
              </Button>
            </div>
          )}
        </div>
      </div>
      {documentUrl && (
        <div className="text-xs text-green-600">
          Document uploaded successfully
        </div>
      )}
    </div>
  );
};
