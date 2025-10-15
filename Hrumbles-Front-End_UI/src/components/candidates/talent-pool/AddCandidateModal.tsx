import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import OpenAI from 'openai'; // Changed from GoogleGenerativeAI
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
}

const BUCKET_NAME = 'talent-pool-resumes';

// --- NEW HELPER FUNCTION: Sanitize Filenames ---
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

  const analyseAndSaveProfile = async (text: string, resumeFile?: File): Promise<{status: string; profile: any}> => {
    let resumePath: string | null = null;
    if (resumeFile) {
        const sanitizedName = sanitizeFileName(resumeFile.name);
        const fileName = `${uuidv4()}-${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, resumeFile, {
                cacheControl: '3600',
                upsert: false,
            });
        
        if (uploadError) throw new Error(`File Upload Error: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
        resumePath = urlData.publicUrl;
    }

    // --- CALL THE NEW SUPABASE EDGE FUNCTION ---
    const { data, error: edgeFunctionError } = await supabase.functions.invoke('talent-analyse-resume', {
        body: {
            resumeText: text,
            organizationId: organizationId, // Pass these to the Edge Function
            userId: user.id,             // Pass these to the Edge Function
            resumePath: resumePath,      // Pass the uploaded path
        },
        // headers: { 'Content-Type': 'application/json' } // invoke handles this for JSON body
    });

    if (edgeFunctionError) {
        console.error('Edge Function invocation error:', edgeFunctionError);
        // The Edge Function returns structured error, try to parse it
        try {
            const errorBody = JSON.parse(edgeFunctionError.message);
            throw new Error(errorBody.error || edgeFunctionError.message);
        } catch {
            throw new Error(`Failed to process resume: ${edgeFunctionError.message}`);
        }
    }
    
    // The Edge Function now returns the status and profile directly
    const { status, profile } = data;

    if (status === 'SKIPPED_NO_EMAIL') {
        throw new Error('Could not extract a valid email from the resume.');
    }
    
    return { status, profile };
  };

  // --- HANDLERS (No changes needed below this line) ---
  const handleSingleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast.promise(
        (async () => {
            const text = await parseFileToText(file);
            const { status } = await analyseAndSaveProfile(text, file);
            if (status === 'INSERTED' || status === 'UPDATED') {
                onCandidateAdded(); // This will close the modal and refetch
                return `Candidate profile ${status.toLowerCase()} successfully!`;
            } else if (status === 'SKIPPED_RECENT') {
                onClose(); // Just close the modal
                return 'Candidate already exists and was updated recently.';
            }
        })(),
        {
            loading: 'Parsing and processing resume...',
            success: (message) => message,
            error: (err) => err.message || 'An unexpected error occurred.',
            finally: () => setIsLoading(false)
        }
    );
  };

  const handlePasteAndSave = async () => {
    if (!resumeText.trim()) return toast.error('Resume text is empty.');
    setIsLoading(true);
    toast.promise(
        (async () => {
            const { status } = await analyseAndSaveProfile(resumeText);
            if (status === 'INSERTED' || status === 'UPDATED') {
                onCandidateAdded();
                return `Candidate profile ${status.toLowerCase()} successfully!`;
            } else if (status === 'SKIPPED_RECENT') {
                onClose();
                return 'Candidate already exists and was updated recently.';
            }
        })(),
        {
            loading: 'Analysing and saving profile...',
            success: (message) => message,
            error: (err) => err.message || 'An unexpected error occurred.',
            finally: () => setIsLoading(false)
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
    const results: BulkUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await parseFileToText(file);
        const { status, profile } = await analyseAndSaveProfile(text, file);
        if (status === 'INSERTED' || status === 'UPDATED') {
          results.push({ fileName: file.name, status: 'success', message: `${profile.candidate_name || 'N/A'} - Profile ${status.toLowerCase()}` });
        } else if (status === 'SKIPPED_RECENT') {
          results.push({ fileName: file.name, status: 'skipped', message: `${profile.candidate_name || 'N/A'} - Skipped (already exists)` });
        }
      } catch (error) {
        results.push({ fileName: file.name, status: 'failed', message: error instanceof Error ? error.message : 'Unknown error' });
      }
      setBulkProgress(((i + 1) / files.length) * 100);
      setBulkResults([...results]);
    }
    
    toast.success("Bulk processing complete. Check results below.");
    setIsLoading(false);
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
  }


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