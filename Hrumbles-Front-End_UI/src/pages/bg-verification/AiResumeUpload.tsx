import { useState, FC } from 'react';
import { useSelector } from 'react-redux';

import { toast } from 'sonner';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AiCandidateReviewForm } from './AiCandidateReviewForm';
import mammoth from 'mammoth';

// Types
interface Props {
  onBack: () => void;
  jobId: string;
  closeModal: () => void;
}
interface BulkResult {
  fileName: string;
  status: 'success' | 'failed';
  data?: any;
  message: string;
}

const BUCKET_NAME = 'candidate-bgv-resumes';

export const AiResumeUpload: FC<Props> = ({ onBack, jobId, closeModal }) => {
  const [activeTab, setActiveTab] = useState('single');
  const [isProcessing, setIsProcessing] = useState(false);

  // Single upload state
  const [reviewData, setReviewData] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Bulk upload state
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  
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
    setResumeFile(file);
    toast.info("Parsing and analyzing resume...");
    try {
      const text = await parseFileToText(file);
      const data = await analyseResume(text);
      setReviewData({ ...data, resumeText: text }); // Pass text to review form
    } catch (err: any) {
      toast.error("Analysis Failed", { description: err.message });
      setResumeFile(null); // Clear file on error
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Bulk file handler
  const handleBulkFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setBulkResults([]);
    const results: BulkResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const text = await parseFileToText(file);
            const data = await analyseResume(text);
            results.push({ fileName: file.name, status: 'success', data: { ...data, resumeText: text, resumeFile: file }, message: 'Ready to save' });
        } catch (error: any) {
            results.push({ fileName: file.name, status: 'failed', message: error.message });
        }
        setBulkProgress(((i + 1) / files.length) * 100);
        setBulkResults([...results]);
    }
    toast.success("Bulk processing complete.");
    setIsProcessing(false);
  };
  
  // Final save for all successful bulk uploads
  const handleBulkSave = async () => {
    const successfulUploads = bulkResults.filter(r => r.status === 'success');
    if (successfulUploads.length === 0) return toast.error("No successful resumes to save.");

    setIsProcessing(true);
    toast.info(`Saving ${successfulUploads.length} candidates...`);
    let savedCount = 0;
    
    for (const result of successfulUploads) {
        try {
            const { resumeFile, ...candidateData } = result.data;
            const fileName = `${uuidv4()}-${resumeFile.name.replace(/[\[\]\+\s]+/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, resumeFile);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);

            await supabase.rpc('add_candidate_to_job', {
                p_job_id: jobId,
                p_organization_id: organizationId,
                p_user_id: user.id,
                p_candidate_data: candidateData,
                p_resume_url: urlData.publicUrl,
                p_resume_text: candidateData.resumeText
            });
            savedCount++;
        } catch(error: any) {
            toast.error(`Failed to save ${result.fileName}`, {description: error.message});
        }
    }
    toast.success(`${savedCount} out of ${successfulUploads.length} candidates saved successfully.`);
    closeModal();
  };

  if (reviewData) {
    return <AiCandidateReviewForm jobData={reviewData} resumeFile={resumeFile} jobId={jobId} closeModal={closeModal} onBack={() => setReviewData(null)} />;
  }

  return (
    <div className="py-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">Single Upload</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="single">
            <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
                <Input type="file" accept=".pdf,.docx" onChange={handleSingleFileChange} disabled={isProcessing} />
                <p className="text-sm text-gray-500 mt-2">Upload a single resume to review before saving.</p>
                {isProcessing && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
            </div>
        </TabsContent>
        <TabsContent value="bulk">
            <div className="mt-4 p-6 border-2 border-dashed rounded-lg text-center">
              <Input type="file" accept=".pdf,.docx" onChange={handleBulkFileChange} disabled={isProcessing} multiple />
              <p className="text-sm text-gray-500 mt-2">Select multiple resumes for batch processing.</p>
            </div>
            {isProcessing && <Progress value={bulkProgress} className="w-full mt-4" />}
            {bulkResults.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">Processing Report</h3>
                    <ScrollArea className="h-40 p-2 border rounded-md">
                        {/* Report rendering logic here */}
                    </ScrollArea>
                    <Button onClick={handleBulkSave} disabled={isProcessing} className="w-full mt-4">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save ${bulkResults.filter(r => r.status === 'success').length} Candidates`}
                    </Button>
                </div>
            )}
        </TabsContent>
      </Tabs>
      <div className="mt-4 flex justify-start">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>Back</Button>
      </div>
    </div>
  );
};