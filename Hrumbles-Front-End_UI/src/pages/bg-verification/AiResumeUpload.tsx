import { useState, FC } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import mammoth from 'mammoth';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed, same as AddCandidateModal

// --- TYPES ---
interface Props {
  // This prop is passed from the parent GlobalAddCandidateModal
  onAnalysisComplete: (data: any, file: File) => void;
}

// --- CONSTANTS ---
const TALENT_POOL_BUCKET = 'talent-pool-resumes';

// --- HELPERS ---
const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[\[\]\+\s]+/g, '_');
};

// --- COMPONENT ---
export const AiResumeUpload: FC<Props> = ({ onAnalysisComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Helper to parse file content into text
  const parseFileToText = async (file: File): Promise<string> => {
    if (file.type.includes('pdf')) {
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
      return data.text;
    } else if (file.type.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value;
    }
    throw new Error('Unsupported file type. Please use .pdf or .docx.');
  };

  // Helper to call the BGV analysis function
  const analyseResumeForBgv = async (text: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-resume-for-bgv', {
      body: { resumeText: text, organization_id: organizationId, user_id: user.id },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  // --- NEW: Background Function for Talent Pool ---
  // This function mimics the logic from AddCandidateModal but swallows errors/success
  const addToTalentPoolSilently = async (file: File, text: string) => {
    try {
      // 1. Upload to Storage
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${uuidv4()}-${sanitizedName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
          .from(TALENT_POOL_BUCKET)
          .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
          });
      
      if (uploadError) {
        console.warn('Silent Talent Pool Sync: Upload Failed', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage.from(TALENT_POOL_BUCKET).getPublicUrl(uploadData.path);
      const resumePath = urlData.publicUrl;

      // 2. Invoke Talent Pool Analysis Edge Function
      const { error: edgeFunctionError } = await supabase.functions.invoke('talent-analyse-resume', {
          body: {
              resumeText: text,
              organizationId: organizationId,
              userId: user.id,
              resumePath: resumePath,
          },
      });

      if (edgeFunctionError) {
        console.warn('Silent Talent Pool Sync: Edge Function Failed', edgeFunctionError);
      } else {
        console.log('Silent Talent Pool Sync: Success');
      }

    } catch (err) {
      // Catch-all to ensure absolutely no interruption to the main thread
      console.warn('Silent Talent Pool Sync: Unexpected Error', err);
    }
  };

  // Main handler for the file input
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading("Parsing and analyzing resume...");

    try {
      // Step 1: Parse the file to get raw text
      const text = await parseFileToText(file);
      
      // Step 2: Trigger Talent Pool Sync in Background
      // We do NOT await this. We let it run independently.
      addToTalentPoolSilently(file, text);

      // Step 3: Analyze for BGV (Blocking UI)
      const data = await analyseResumeForBgv(text);
      
      toast.success("Analysis complete. Please review the details.", { id: toastId });
      
      // Step 4: Pass data to parent
      onAnalysisComplete(data, file);

    } catch (err: any) {
      toast.error("Analysis Failed", { description: err.message, id: toastId });
      setIsProcessing(false); 
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Step 1: Upload Resume</DialogTitle>
        <DialogDescription>
          Upload a resume (.pdf or .docx) to automatically parse candidate information.
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
        <Input 
          type="file" 
          accept=".pdf,.docx" 
          onChange={handleSingleFileChange} 
          disabled={isProcessing} 
        />
        <p className="text-sm text-gray-500 mt-2">The system will extract the candidate's details for your review.</p>
        {isProcessing && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
      </div>
    </>
  );
};