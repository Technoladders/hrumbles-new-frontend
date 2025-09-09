import React, { useRef, useState } from 'react';
import { FormSectionProps } from '@/types/application';
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/careerPage/ui/button';
import { Textarea } from '@/components/careerPage/ui/textarea';
import { Label } from '@/components/careerPage/ui/label';
import { useToast } from '@/hooks/use-toast'; // --- CHANGE: Import your toast hook
import { FileText, Upload, X, Loader2 } from 'lucide-react'; // --- CHANGE: Import a loader icon
import { v4 as uuidv4 } from 'uuid';

const BUCKET_NAME = 'candidate_resumes';

// --- CHANGE: Define a more specific props interface to include the callback
interface FileUploadSectionProps extends FormSectionProps {
  onParseComplete: (parsedData: any) => void;
  onParseStart: () => void;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors,
  onParseStart,
  onParseComplete // --- CHANGE: Destructure the new callback prop
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- CHANGE: Renamed state to be more generic for the entire process
  const [isProcessing, setIsProcessing] = useState(false); 
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast(); // --- CHANGE: Initialize the toast hook

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError("File size exceeds 5MB. Please upload a smaller file.");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;

    setIsProcessing(true);
     onParseStart(); 
    setUploadError(null);
    toast({ title: "Uploading resume..." });

    try {
      // Step 1: Upload the file to storage (same as before)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Step 2: Get the public URL and update the form state
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueFileName);
      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to retrieve resume URL.");
      }
      const resumeUrl = urlData.publicUrl;
      updateFormData({ ...formData, resume: resumeUrl });

      // --- CHANGE: Step 3: Invoke the Edge Function to parse the resume ---
      toast({ title: "Resume uploaded. Parsing with AI..." });
      
      // Assumes you have an edge function named 'parse-resume' like in your AddCandidateDrawer
      const { data: parsedData, error: functionError } = await supabase.functions.invoke('parse-resume', {
        body: { fileUrl: resumeUrl },
      });

      if (functionError) {
        throw new Error(`AI Parsing Error: ${functionError.message}`);
      }
      
      // --- CHANGE: Step 4: Use the callback to send parsed data to the parent component ---
      if (parsedData) {
        onParseComplete(parsedData);
        toast({
          title: "Success!",
          description: "Your information has been auto-filled.",
          variant: 'default',
        });
      }

    } catch (error: any) {
      console.error('Resume processing error:', error);
      setUploadError(`Processing failed: ${error.message}`);
      toast({
        title: "An Error Occurred",
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
              disabled={isProcessing} // --- CHANGE: Disable while processing
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
                  disabled={isProcessing} // --- CHANGE: Disable while processing
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                  showValidationErrors && !formData.resume ? "border-red-300 bg-red-50" : "border-gray-300"
                } ${isProcessing ? 'cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:bg-slate-50'}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 font-medium">
                  {/* --- CHANGE: Improved loading text --- */}
                  {isProcessing ? 'Processing Resume...' : 'Upload your resume'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  PDF, DOC, or DOCX (Max 5MB)
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                  disabled={isProcessing}
                >
                  {/* --- CHANGE: Show loader in button --- */}
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : (
                    'Select File'
                  )}
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