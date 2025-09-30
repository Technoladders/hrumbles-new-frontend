import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelector } from 'react-redux';
import mammoth from 'mammoth';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}
interface BulkUploadResult {
  fileName: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
}

const BUCKET_NAME = 'talent-pool-resumes';

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[\[\]\+\s]+/g, '_');
};

const AddCandidateModal: FC<AddCandidateModalProps> = ({ isOpen, onClose, onCandidateAdded }) => {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('paste');
  const [bulkResults, setBulkResults] = useState<BulkUploadResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);

  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const parseFileToText = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
      return data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    throw new Error('Unsupported file type. Please use PDF or DOCX.');
  };

  // ✅ NEW: Batch version (using your exact systemPrompt)
  const analyseAndSaveProfilesBatch = async (resumes: { text: string; file?: File }[]): Promise<BulkUploadResult[]> => {
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });

    const systemPrompt = `
      Based on the provided resume text, perform a detailed extraction to create a professional profile. 
      Return ONLY a single, valid JSON object with the exact keys specified below. Do not include any markdown formatting or explanations.
      JSON Schema and Strict Instructions:
      "suggested_title": string.
      "candidate_name": string.
      "email": string.
      "phone": string.
      "linkedin_url": string.
      "github_url": string.
      "current_location": string.
      "professional_summary": array of strings.
      "top_skills": array of strings.
      "work_experience": array of objects.
      "education": array of objects.
      "projects": array of strings.
      "certifications": array of strings.
      "other_details": object.
      Important: preserve all fields exactly as specified.
    `;

    const userPrompt = resumes
      .map((r, i) => `### Resume ${i + 1}\n${r.text}`)
      .join("\n\n");

    console.log(`🔄 Sending ${resumes.length} resumes in ONE batch request...`);

    const result = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse the following resumes and return {"resumes":[...]}\n\n${userPrompt}` },
      ],
    });

    const responseJson = result.choices[0].message.content;
    if (!responseJson) throw new Error('AI response was empty.');

    const parsed = JSON.parse(responseJson);
    const profiles = parsed.resumes || [];
    const results: BulkUploadResult[] = [];

    for (let i = 0; i < profiles.length; i++) {
      try {
        let resumePath: string | null = null;
        if (resumes[i].file) {
          const sanitizedName = sanitizeFileName(resumes[i].file.name);
          const fileName = `${uuidv4()}-${sanitizedName}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, resumes[i].file);
          if (uploadError) throw new Error(`File Upload Error: ${uploadError.message}`);
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
          resumePath = urlData.publicUrl;
        }

        const { data: status, error: rpcError } = await supabase.rpc(
          'upsert_candidate_with_timeframe',
          {
            profile_data: profiles[i],
            resume_text: resumes[i].text,
            organization_id_input: organizationId,
            user_id_input: user.id,
            resume_path_input: resumePath,
            input_tokens_used: result.usage?.prompt_tokens || 0,
            output_tokens_used: result.usage?.completion_tokens || 0,
            usage_type_input: 'talent_pool_ingestion',
          }
        );

        if (rpcError) throw rpcError;

        results.push({
          fileName: resumes[i].file?.name || `Resume ${i + 1}`,
          status: 'success',
          message: `${profiles[i].candidate_name || 'N/A'} - Profile ${status.toLowerCase()}`,
        });
      } catch (error) {
        results.push({
          fileName: resumes[i].file?.name || `Resume ${i + 1}`,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  };

  // ✅ Updated to call batch function with one resume
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast.promise(
      (async () => {
        const text = await parseFileToText(file);
        const results = await analyseAndSaveProfilesBatch([{ text, file }]);
        const first = results[0];
        if (first.status === 'success') {
          onCandidateAdded();
          return first.message;
        }
        throw new Error(first.message);
      })(),
      {
        loading: 'Parsing and processing resume...',
        success: (msg) => msg,
        error: (err) => err.message || 'Error occurred',
        finally: () => setIsLoading(false),
      }
    );
  };

  const handlePasteAndSave = async () => {
    if (!resumeText.trim()) return toast.error('Resume text is empty.');
    setIsLoading(true);
    toast.promise(
      (async () => {
        const results = await analyseAndSaveProfilesBatch([{ text: resumeText }]);
        const first = results[0];
        if (first.status === 'success') {
          onCandidateAdded();
          return first.message;
        }
        throw new Error(first.message);
      })(),
      {
        loading: 'Analysing and saving profile...',
        success: (msg) => msg,
        error: (err) => err.message || 'Error occurred',
        finally: () => setIsLoading(false),
      }
    );
  };

  const handleBulkFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setIsBulkProcessing(true);
    setBulkResults([]);
    setBulkProgress(0);

    try {
      const resumes = await Promise.all(
        Array.from(files).map(async (file) => ({
          text: await parseFileToText(file),
          file,
        }))
      );
      const results = await analyseAndSaveProfilesBatch(resumes);
      setBulkResults(results);
      setBulkProgress(100);
      toast.success('Bulk processing complete.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isBulkProcessing) {
      onCandidateAdded();
    } else {
      onClose();
    }
    setResumeText('');
    setBulkResults([]);
    setBulkProgress(0);
    setIsBulkProcessing(false);
    setActiveTab('paste');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onRequestClose={handleClose} 
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0'
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)'
        }
      }}
      contentLabel="Add Candidate Modal"
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Add Candidate to Talent Pool</h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="paste">Paste Resume</TabsTrigger>
            <TabsTrigger value="upload">Upload Single Resume</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste">
            <Textarea placeholder="Paste the full resume text here..." rows={15} value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="mt-2" disabled={isLoading} />
          </TabsContent>

          <TabsContent value="upload">
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg text-center">
              <Input type="file" accept=".pdf,.docx" onChange={handleSingleFileChange} disabled={isLoading} />
              <p className="text-sm text-gray-500 mt-2">The file will be parsed, analysed, and saved immediately.</p>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg text-center">
              <Input type="file" accept=".pdf,.docx" onChange={handleBulkFileChange} disabled={isLoading} multiple />
              <p className="text-sm text-gray-500 mt-2">Select multiple PDF or DOCX files.</p>
            </div>
            {isBulkProcessing && <Progress value={bulkProgress} className="w-full mt-4" />}
            {bulkResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Bulk Upload Report</h3>
                <ScrollArea className="h-48 p-3 border rounded-md">
                  {bulkResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-2 mb-2 text-sm">
                      <div className="flex-shrink-0 pt-1">
                        {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {result.status === 'skipped' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="font-medium break-all">{result.fileName}</p>
                        <p className="text-gray-600">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        {activeTab === 'bulk' && isBulkProcessing && !isLoading ? (
            <Button onClick={handleClose}>Close Report & Refetch List</Button>
        ) : (
            <>
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                {activeTab === 'paste' && <Button onClick={handlePasteAndSave} disabled={isLoading || !resumeText}> {isLoading ? 'Processing...' : 'Analyse and Save'} </Button>}
            </>
        )}
      </div>
    </Modal>
  );
};
export default AddCandidateModal;
