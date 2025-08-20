// src/pages/jobs/ai/AiResumeUpload.tsx

import { useState, FC } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import mammoth from 'mammoth';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// --- TYPES ---
interface Props {
  // This prop is passed from the parent GlobalAddCandidateModal
  onAnalysisComplete: (data: any, file: File) => void;
}

// --- COMPONENT ---
export const AiResumeUpload: FC<Props> = ({ onAnalysisComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Helper to parse file content into text
  const parseFileToText = async (file: File): Promise<string> => {
    if (file.type.includes('pdf')) {
      // Assuming a Supabase function for PDF parsing
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
      return data.text;
    } else if (file.type.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value;
    }
    throw new Error('Unsupported file type. Please use .pdf or .docx.');
  };

  // Helper to call the analysis function
  const analyseResume = async (text: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-resume-for-bgv', {
      body: { resumeText: text, organization_id: organizationId, user_id: user.id },
    });
    if (error) throw new Error(error.message);
    return data;
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
      
      // Step 2: Analyze the text to extract candidate data
      const data = await analyseResume(text);
      
      toast.success("Analysis complete. Please review the details.", { id: toastId });
      
      // Step 3: Pass the extracted data and the original file back to the parent modal
      onAnalysisComplete(data, file);

    } catch (err: any) {
      toast.error("Analysis Failed", { description: err.message, id: toastId });
      setIsProcessing(false); // Stop the spinner only on failure
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