import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
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
// Added Loader2 for the spinning icon to match your screenshot
import { CheckCircle, XCircle, AlertCircle, X, Loader2 } from 'lucide-react';

// --- TYPES ---
interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}

// Interface is updated to handle richer UI states
interface BulkUploadResult {
  fileName: string;
  // 'processing' is added for the state after upload is done but before backend confirmation
  status: 'success' | 'skipped' | 'failed' | 'uploading' | 'parsing' | 'processing';
  message: string;
  candidate_name?: string;
  job_queue_id?: string;
  uploadProgress?: number; // To track individual file upload percentage
}

const BUCKET_NAME = 'talent-pool-resumes';

// --- HELPER FUNCTION: Sanitize Filenames ---
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

  // --- HELPER FUNCTIONS ---
  const parseFileToText = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
        const { data, error } = await supabase.functions.invoke('talent-pool-parser', {
          body: file,
        });
        if (error) throw new Error(`PDF Parsing Error: ${error.message}`);
        return data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }
    throw new Error('Unsupported file type. Please use PDF or DOCX.');
  };

  // --- analyseAndSaveProfilesBatch - LOGIC UNCHANGED ---
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
        resume_path_input: resumePath,
        file_name: originalFileName,
        organization_id: organizationId,
        user_id: user.id,
      });
    });

    await Promise.all(fileUploadPromises);

    try {
      const { data, error } = await supabase.functions.invoke(
        'talent-pool-process-batch-candidates',
        { body: backendPayload }
      );

      if (error) {
        throw new Error(`Backend Processing Error: ${error.message}`);
      }
      if (!data || !Array.isArray(data.batch_results)) {
        throw new Error('Invalid response from backend function: Expected batch_results array.');
      }

      return data.batch_results.map((item: any) => ({
        fileName: item.file_name || 'N/A',
        status: item.status === 'success' || item.status === 'enqueued' ? 'success' : item.status === 'skipped' ? 'skipped' : 'failed',
        message: item.message || item.error || 'Processing initiated.',
        candidate_name: item.candidate_name,
      }));

    } catch (backendError) {
      console.error("[AddCandidateModal] Error calling Supabase Edge Function for batch processing:", backendError);
      return resumes.map(resume => ({
        fileName: resume.fileName || 'N/A',
        status: 'failed',
        message: backendError instanceof Error ? backendError.message : 'Unknown backend error'
      }));
    }
  };

  // --- HANDLERS (LOGIC UNCHANGED) ---
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast.promise(
      (async () => {
        const text = await parseFileToText(file);
        const results = await analyseAndSaveProfilesBatch([{ text, file, fileName: file.name }]);
        const firstResult = results[0];

        if (firstResult.status === 'success') {
          onCandidateAdded();
          return `Candidate processing enqueued! (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else if (firstResult.status === 'skipped') {
          onCandidateAdded();
          return `Candidate skipped: ${firstResult.message} (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
        } else {
          throw new Error(firstResult.message);
        }
      })(),
      {
        loading: 'Processing resume securely...',
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
        const results = await analyseAndSaveProfilesBatch([{ text: resumeText, fileName: 'pasted_resume.txt' }]);
        const firstResult = results[0];

        if (firstResult.status === 'success') {
          onCandidateAdded();
          return `Candidate processing enqueued! (Candidate: ${firstResult.candidate_name || firstResult.fileName})`;
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
    let results: BulkUploadResult[] = filesArray.map(file => ({
        fileName: file.name,
        status: 'parsing',
        message: 'Waiting in queue...',
        uploadProgress: 0,
    }));
    setBulkResults(results);

    const updateFileProgress = (index: number, newStatus: Partial<BulkUploadResult>) => {
        results = results.map((res, i) => i === index ? { ...res, ...newStatus } : res);
        setBulkResults([...results]);
    };

    const successfullyParsedResumes: Array<{ text: string; file: File; fileName: string }> = [];

    await Promise.all(filesArray.map(async (file, index) => {
        try {
            updateFileProgress(index, { status: 'parsing', message: 'Parsing resume...', uploadProgress: 25 });
            const text = await parseFileToText(file);
            successfullyParsedResumes.push({ text, file, fileName: file.name });
            // Simulate upload progress
            updateFileProgress(index, { status: 'uploading', message: 'Uploading...', uploadProgress: 75 });
            await new Promise(res => setTimeout(res, 250)); // Small delay for UX
            updateFileProgress(index, { status: 'processing', message: 'Upload complete, processing...', uploadProgress: 100 });
        } catch (error) {
            updateFileProgress(index, { status: 'failed', message: error instanceof Error ? error.message : 'Failed to parse', uploadProgress: 0 });
        }
        setBulkProgress(((index + 1) / filesArray.length) * 50);
    }));

    if (successfullyParsedResumes.length === 0) {
      toast.error("No valid resumes could be processed.");
      setIsLoading(false);
      setIsBulkProcessing(false);
      return;
    }

    toast.info(`Sending ${successfullyParsedResumes.length} resumes for secure analysis...`);
    setBulkProgress(50);

    try {
        const finalResults = await analyseAndSaveProfilesBatch(successfullyParsedResumes);
        setBulkProgress(100);

        let finalReport = [...results];
        finalResults.forEach(finalRes => {
            const index = finalReport.findIndex(r => r.fileName === finalRes.fileName);
            if (index !== -1) {
                finalReport[index] = { ...finalReport[index], ...finalRes };
            }
        });
        setBulkResults(finalReport);

        const successCount = finalResults.filter(r => r.status === 'success' || r.status === 'skipped').length;
        if (successCount > 0) {
            toast.success(`${successCount} candidates are being added to the Talent Pool.`);
            onCandidateAdded();
        } else {
            toast.error("No candidates were successfully added. See report.");
        }
    } catch (err) {
        toast.error("A critical error occurred during batch processing.");
        setBulkProgress(100);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClose = () => {
      onCandidateAdded(); // Always refetch on close to see latest results
      onClose();
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
          top: '50%', left: '50%', right: 'auto', bottom: 'auto',
          marginRight: '-50%', transform: 'translate(-50%, -50%)',
          width: '90%', maxWidth: '800px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', padding: '0'
        },
        overlay: { backgroundColor: 'rgba(0, 0, 0, 0.75)' }
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
              <Input type="file" accept=".pdf,.docx" onChange={handleBulkFileChange} disabled={isLoading || isBulkProcessing} multiple />
              <p className="text-sm text-gray-500 mt-2">Select multiple PDF or DOCX files. They will be parsed, analysed, and saved securely.</p>
            </div>
            {(isBulkProcessing || bulkResults.length > 0) && <Progress value={bulkProgress} className="w-full mt-4" />}
            {bulkResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Bulk Upload Report</h3>
                <ScrollArea className="h-48 p-3 border rounded-md">
                  
                  {/* --- THIS IS THE UPDATED UI RENDERING LOGIC --- */}
                  {bulkResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 mb-4 last:mb-0 text-sm">
                      <div className="flex-shrink-0 pt-1">
                        {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {result.status === 'skipped' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                        {result.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                        {(result.status === 'parsing' || result.status === 'uploading' || result.status === 'processing') && (
                          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium break-all">{result.fileName}</p>
                        <p className="text-gray-600 mt-1">{result.message}</p>
                        
                        {(result.status === 'parsing' || result.status === 'uploading' || result.status === 'processing') && result.uploadProgress !== undefined && (
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={result.uploadProgress} className="w-full" />
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {result.uploadProgress}%
                            </span>
                          </div>
                        )}
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
        {/* Logic for showing close/cancel buttons */}
        {activeTab === 'bulk' && !isLoading && bulkResults.length > 0 ? (
            <Button onClick={handleClose}>Close</Button>
        ) : (
            <>
                <Button variant="outline" onClick={handleClose} disabled={isLoading || isBulkProcessing}>Cancel</Button>
                {activeTab === 'paste' && <Button onClick={handlePasteAndSave} disabled={isLoading || !resumeText}> {isLoading ? 'Processing...' : 'Analyse and Save'} </Button>}
            </>
        )}
      </div>
    </Modal>
  );
};

export default AddCandidateModal;