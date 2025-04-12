import React, { useRef, useState } from 'react';
import { FormSectionProps } from '@/types/application';
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/careerPage/ui/button';
import { Textarea } from '@/components/careerPage/ui/textarea';
import { Label } from '@/components/careerPage/ui/label';
import { Input } from '@/components/careerPage/ui/input';
import { FileText, Upload, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'candidate_resumes';

const FileUploadSection: React.FC<FormSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate File Size
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB. Please upload a smaller file.");
      return;
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    // Use a progress tracking method
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueFileName);
      if (data) {
        updateFormData({ ...formData, resume: data.publicUrl });
      } else {
        throw new Error("Failed to retrieve resume URL.");
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemoveFile = async () => {
    if (formData.resume) {
      const filePath = formData.resume.split(`${BUCKET_NAME}/`)[1];
      if (filePath) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }
    }
    updateFormData({ ...formData, resume: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-500" /> Professional Info
      </h3>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resume" className="flex items-center gap-1">
            Resume <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-col">
            <input
              ref={fileInputRef}
              type="file"
              id="resume"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="hidden"
            />

            {formData.resume ? (
              <div className="border border-gray-200 rounded-md p-4 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium truncate">{formData.resume.split('/').pop()}</p>
                    <a 
                      href={formData.resume} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      View Resume
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors ${
                  showValidationErrors && !formData.resume ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 font-medium">
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Upload your resume'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  PDF, DOC, or DOCX (Max 5MB)
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Select File'}
                </Button>
              </div>
            )}

            {uploadError && (
              <p className="text-red-500 text-sm mt-1">{uploadError}</p>
            )}

            {showValidationErrors && !formData.resume && (
              <p className="text-red-500 text-sm mt-1">Resume is required</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
          <Textarea
            id="coverLetter"
            value={formData.coverLetter}
            onChange={(e) => updateFormData({ ...formData, coverLetter: e.target.value })}
            placeholder="Write a brief cover letter explaining why you're interested in this position..."
            rows={6}
          />
        </div>
      </div>
    </div>
  );
};

export default FileUploadSection;
