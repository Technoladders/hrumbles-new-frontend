// 

// Bulk Uplopad removed tab

import { useState, FC } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import mammoth from 'mammoth';

// Types
interface Props {
  jobId: string;
  closeModal: () => void;
}

const BUCKET_NAME = 'candidate_resumes';
const FOLDER_NAME = 'bgv-resumes';

export const AiResumeUpload: FC<Props> = ({ jobId, closeModal }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Helper to parse file
  const parseFileToText = async (file: File): Promise<string> => {
    if (file.type.includes('pdf')) {
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
      return data.text;
    } else if (file.type.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value;
    }
    throw new Error('Unsupported file type.');
  };

  // Main analysis function
  const analyseResume = async (text: string) => {
    const { data, error } = await supabase.functions.invoke('analyze-resume-for-bgv', {
      body: { resumeText: text, organization_id: organizationId, user_id: user.id },
    });
    if (error) throw new Error(error.message);
    return data;
  };

  // Single file handler
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast.info("Parsing and analyzing resume...");
    try {
      const text = await parseFileToText(file);
      const data = await analyseResume(text);
      
      // Upload file to Supabase storage
      const fileName = `${FOLDER_NAME}/${uuidv4()}-${file.name.replace(/[\[\]\+\s]+/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

      // Save candidate to job
      await supabase.rpc('add_candidate_to_job', {
        p_job_id: jobId,
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_candidate_data: data,
        p_resume_url: urlData.publicUrl,
        p_resume_text: text
      });

      toast.success("Candidate successfully added!");
      closeModal();
    } catch (err: any) {
      toast.error("Analysis Failed", { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-4">
      <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
        <Input type="file" accept=".pdf,.docx" onChange={handleSingleFileChange} disabled={isProcessing} />
        <p className="text-sm text-gray-500 mt-2">Upload a single resume to add a candidate.</p>
        {isProcessing && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
      </div>
      <div className="mt-4 flex justify-start">
        <Button variant="outline" onClick={closeModal} disabled={isProcessing}>Cancel</Button>
      </div>
    </div>
  );
};