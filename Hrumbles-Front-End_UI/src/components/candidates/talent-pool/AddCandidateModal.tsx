import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
// import OpenAI from 'openai'; // <--- REMOVED: No longer needed client-side
// import { GoogleGenerativeAI } from '@google/generative-ai'; // <--- REMOVED: No longer needed client-side
import { v4 as uuidv4 } from 'uuid'; // Still used for unique file names before upload
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

// --- TYPES ---
interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}
interface BulkUploadResult {
  fileName: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
  candidate_name?: string; // Added to display name in report
  job_queue_id?: string; // Edge Functions don't use RQ, but keep if your EF returns it for consistency
}

const BUCKET_NAME = 'talent-pool-resumes';

// --- HELPER FUNCTION: Sanitize Filenames ---
const sanitizeFileName = (fileName: string): string => {
  // Replace illegal characters and multiple spaces/underscores with a single underscore.
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

  // --- HELPER FUNCTIONS ---
  const parseFileToText = async (file: File): Promise<string> => {
    // This part is good, it uses a Supabase Function for PDF parsing, or client-side for DOCX
    if (file.type === 'application/pdf') {
        const { data, error } = await supabase.functions.invoke('talent-pool-parser', {
          body: file,
          // You might need to specify a Content-Type for file uploads in Supabase Functions
          // headers: { 'Content-Type': 'application/pdf' }
        });
        if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
        // Supabase Function invocation data comes as { data: { text: "..." } }
        return data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }
    throw new Error('Unsupported file type. Please use PDF or DOCX.');
  };

  // --- MODIFIED: analyseAndSaveProfilesBatch - Now calls a Supabase Edge Function for secure processing ---
  // This function will handle both single and batch calls to the backend
  const analyseAndSaveProfilesBatch = async (
    resumes: Array<{ text: string; file?: File; fileName?: string }>
  ): Promise<BulkUploadResult[]> => {
    const backendPayload: Array<{
      resume_text: string;
      resume_path_input: string | null;
      file_name: string;
      organization_id: string;
      user_id: string;
    }> = [];

    // Step 1: Upload all files to Supabase Storage concurrently BEFORE calling the Edge Function
    const fileUploadPromises = resumes.map(async (resume, index) => {
      let resumePath: string | null = null;
      let originalFileName: string = resume.fileName || `resume-${index}.txt`;

      if (resume.file) {
        const sanitizedName = sanitizeFileName(resume.file.name);
        originalFileName = resume.file.name;
        const uniqueFileName = `${uuidv4()}-${sanitizedName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(uniqueFileName, resume.file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error(`File Upload Error for ${originalFileName}: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
        resumePath = urlData.publicUrl;
      }

      backendPayload.push({
        resume_text: resume.text,
        resume_path_input: resumePath, // This is the public URL
        file_name: originalFileName,
        organization_id: organizationId,
        user_id: user.id,
      });
    });

    await Promise.all(fileUploadPromises); // Wait for all file uploads to complete

    // Step 2: Call the Supabase Edge Function with the prepared batch payload
    try {
      console.log("[AddCandidateModal] Invoking Supabase Edge Function: 'talent-pool-process-batch-candidates'"); // Log
      console.log("[AddCandidateModal] Backend payload for Edge Function:", backendPayload); // Log

      const { data, error } = await supabase.functions.invoke(
        'talent-pool-process-batch-candidates', // <--- Your deployed Edge Function name
        { body: backendPayload }
      );

      console.log("[AddCandidateModal] Supabase Function Invoke Data:", data); // Log
      console.log("[AddCandidateModal] Supabase Function Invoke Error:", error); // Log

      if (error) {
        // This 'error' object is from Supabase JS client itself (e.g., network error, function not found)
        throw new Error(`Backend Processing Error: ${error.message}`);
      }
      if (!data || !Array.isArray(data.batch_results)) {
        throw new Error('Invalid response from backend function: Expected batch_results array.');
      }

      return data.batch_results.map((item: any) => ({
        fileName: item.file_name || 'N/A',
        status: item.status === 'success' || item.status === 'enqueued' ? 'success' : item.status === 'skipped' ? 'skipped' : 'failed',
        message: item.message || item.error || 'Processing initiated.',
        candidate_name: item.candidate_name, // Should come from EF response
      }));

    } catch (backendError) {
      console.error("[AddCandidateModal] Error calling Supabase Edge Function for batch processing:", backendError);
      // Return a failed status for all original resumes if the batch call itself fails
      return resumes.map(resume => ({
        fileName: resume.fileName || 'N/A',
        status: 'failed',
        message: backendError instanceof Error ? backendError.message : 'Unknown backend error'
      }));
    }
  };

  // --- HANDLERS ---
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast.promise(
      (async () => {
        const text = await parseFileToText(file);
        // Treat single file as a batch of one for consistency in backend call
        const results = await analyseAndSaveProfilesBatch([{ text, file, fileName: file.name }]);
        const firstResult = results[0];

        if (firstResult.status === 'success') {
          onCandidateAdded();
          return `Candidate processing enqueued! Check Talent Pool list shortly. (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else if (firstResult.status === 'skipped') {
          onCandidateAdded(); // Still refresh parent as candidate might have been updated
          return `Candidate skipped: ${firstResult.message} (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else {
          throw new Error(firstResult.message);
        }
      })(),
      {
        loading: 'Parsing, uploading and processing resume securely...',
        success: (message) => message,
        error: (err) => err.message || 'An unexpected error occurred.',
        finally: () => setIsLoading(false),
      }
    );
  };

  const handlePasteAndSave = async () => {
    if (!resumeText.trim()) return toast.error('Resume text is empty.');
    setIsLoading(true);
    toast.promise(
      (async () => {
        // Treat pasted text as a batch of one
        const results = await analyseAndSaveProfilesBatch([{ text: resumeText, fileName: 'pasted_resume.txt' }]);
        const firstResult = results[0];

        if (firstResult.status === 'success') {
          onCandidateAdded();
          return `Candidate processing enqueued! Check Talent Pool list shortly. (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else if (firstResult.status === 'skipped') {
          onCandidateAdded();
          return `Candidate skipped: ${firstResult.message} (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else {
          throw new Error(firstResult.message);
        }
      })(),
      {
        loading: 'Analysing and saving profile securely...',
        success: (message) => message,
        error: (err) => err.message || 'An unexpected error occurred.',
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

    const filesArray = Array.from(files);
    const resumesToParse: Array<{ text: string; file?: File; fileName?: string }> = [];
    const interimResults: BulkUploadResult[] = []; // To show parsing progress

    // Step 1: Parse all files concurrently (local or via Supabase Function for PDFs)
    await Promise.all(
      filesArray.map(async (file, index) => {
        try {
          const text = await parseFileToText(file); // Parse locally or via Supabase Function
          resumesToParse.push({ text, file, fileName: file.name });
          interimResults.push({ fileName: file.name, status: 'success', message: 'Parsed and ready for upload.' }); // Initial status

        } catch (error) {
          interimResults.push({ fileName: file.name, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error during parsing.' });
          console.error(`Error parsing file ${file.name}:`, error);
        }
        setBulkProgress(((index + 1) / filesArray.length) * 50); // Progress for local parsing
        setBulkResults([...interimResults]); // Update UI with current file parsing status
      })
    );
    
    // Filter out files that failed parsing
    const successfullyParsedResumes = resumesToParse.filter(r => r.text);
    if (successfullyParsedResumes.length === 0) {
      toast.error("No valid resumes could be parsed for batch processing. Check report.");
      setIsLoading(false);
      setIsBulkProcessing(false);
      return;
    }

    toast.info(`Calling backend for batch analysis of ${successfullyParsedResumes.length} resumes...`);
    setBulkProgress(50); // Indicate start of backend call phase

    // Step 2: Call the secure backend (Edge Function) with the batch of parsed texts/uploaded file paths
    try {
      const finalResults = await analyseAndSaveProfilesBatch(successfullyParsedResumes);
      setBulkResults(finalResults);
      setBulkProgress(100);

      const successfulCount = finalResults.filter(r => r.status === 'success' || r.status === 'skipped').length;
      if (successfulCount > 0) {
        toast.success(`Batch processing jobs enqueued for ${successfulCount} candidates. Profiles will appear in Talent Pool shortly.`);
        onCandidateAdded(); // Trigger refetch in parent
      } else {
        toast.error("No candidates were successfully enqueued. Check report for details.");
      }
      
    } catch (backendError) {
      toast.error(backendError instanceof Error ? backendError.message : 'An unexpected error occurred during batch API call.');
      console.error("Error during batch talent pool ingest API call:", backendError);
      setBulkResults(prev => prev.map(res => ({ ...res, status: 'failed', message: res.message || 'Batch API call failed.' })));
      setBulkProgress(100); // Complete progress bar even on error
    } finally {
      setIsLoading(false);
      setIsBulkProcessing(false);
    }
  };

  const handleClose = () => {
      // Only trigger refetch if some processing was initiated
      const hasProcessedAnything = isBulkProcessing || (activeTab === 'paste' && resumeText.trim()) || (activeTab === 'upload' && !isLoading);
      if (hasProcessedAnything) {
          onCandidateAdded();
      }
      onClose(); // Always close the modal
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
              <p className="text-sm text-gray-500 mt-2">The file will be parsed, analysed, and saved securely.</p>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg text-center">
              <Input type="file" accept=".pdf,.docx" onChange={handleBulkFileChange} disabled={isLoading} multiple />
              <p className="text-sm text-gray-500 mt-2">Select multiple PDF or DOCX files. They will be parsed, analysed, and saved securely.</p>
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