import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

  const cleanResponse = (text: string): string => {
    const match = text.match(/{[\s\S]*}/);
    if (!match) throw new Error('AI response is not valid JSON.');
    return match[0];
  };

  const analyseAndSaveProfile = async (text: string, resumeFile?: File): Promise<{status: string; profile: any}> => {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY_TALENT;
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `
     Based on the following resume text, perform a detailed extraction to create a professional profile. Return ONLY a single, valid JSON object with the exact keys specified below.
 
JSON Schema and Strict Instructions:
       
"suggested_title": string.
Rule 1: Use the most recent or prominent job title from work experience (e.g., "Technical Lead", "Full Stack Developer").
Rule 2: If no work experience, infer a suitable title from the professional summary and skills (e.g., "Frontend Developer").
 
"candidate_name": string (Full Name).
                                                 
"email": string (Email address).
 
"phone": string (Phone number, exactly as found).
 
"linkedin_url": string.
Rule: Must be a valid URL (starts with http, https, or www). If the text is just a phrase like "LinkedIn Profile", return null.
 
"github_url": string.
Rule: Must be a valid URL. If not a URL, return null.
 
"current_location": string.  
- Rule: Extract the full address if available (e.g., under "Address", "Location", or at the top of the resume).  
- If no address is found, return null.  
- Do not merge email or phone into address.  
                                                   
"professional_summary": array of strings  
Rules:  
1. Always return as an array of separate bullet points (strings).  
2. Each bullet point must be a single complete sentence or phrase from the resume.  
3. Do not merge multiple points into one string.  
4. If no professional summary is present, omit this field entirely.  
 
"top_skills": array of strings (List of key technical and soft skills).  
 
"work_experience": array of objects, each with "company", "designation", "duration", and "responsibilities" (array of strings).  
Rule: If a company and a client are mentioned (e.g., "Company X | Client: Client Y"), extract only the primary company name ("Company X") into the "company" field.  
 
"education": array of objects, each with "institution", "degree", and "year".  
Rule: If an institution name is not explicitly stated, return null for "institution".  
 
"projects": array of strings  
Rules:  
- Always extract the **entire Project Summary section exactly as written**, including titles, clients, environments, roles, descriptions, and bullet-point responsibilities.  
- Each project (PROJECT #1, PROJECT #2, etc.) must be preserved as one full string inside the array.  
- Do not replace with placeholders like "View Project". If a project block exists in the text, copy it fully.  
- Do not summarize or shorten. Preserve all formatting and wording.  
- If no projects exist in the resume, return an empty array.  
 
"certifications": array of strings.  
 
"other_details": object  
Rules:  
- Include only additional resume information that does not belong to the above categories.  
- Use exact heading names as keys (e.g., "Hackathons", "AI & Tech Online Courses", "Languages", "Achievements").  
- Do NOT include project-related information here.  
- If no such sections exist, return null.  
 
Important:  
- If a field cannot be found, use null or an empty array/string as appropriate.  
- Return only the JSON object, no explanations.  
- Give as a points.
 
 
  Resume Text:
 
  ---
   ${text} 
  ---
`;

    const result = await model.generateContent(prompt);
    
    // Extract token usage from the response
    const usageMetadata = result.response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    
    const cleanedJson = cleanResponse(result.response.text());
    // --- END: MODIFICATION ---
    const profileData = JSON.parse(cleanedJson);
    let resumePath: string | null = null;
    if (resumeFile) {
        // --- FIX: Sanitize the filename before uploading ---
        const sanitizedName = sanitizeFileName(resumeFile.name);
        const fileName = `${uuidv4()}-${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, resumeFile);
        
        if (uploadError) throw new Error(`File Upload Error: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
        resumePath = urlData.publicUrl;
    }

    const { data: status, error: rpcError } = await supabase.rpc('upsert_candidate_with_timeframe', {
      profile_data: profileData,
      resume_text: text,
      organization_id_input: organizationId,
      user_id_input: user.id,
      resume_path_input: resumePath,
       input_tokens_used: inputTokens,
      output_tokens_used: outputTokens,
      usage_type_input: 'talent_pool_ingestion'
    });

    if (rpcError) throw new Error(`Database Error: ${rpcError.message}`);
    
    // The RPC function now returns 'SKIPPED_NO_EMAIL' for bad parses
    if (status === 'SKIPPED_NO_EMAIL') {
        throw new Error('Could not extract a valid email from the resume.');
    }
    
    return { status, profile: profileData };
  };

  // --- HANDLERS ---
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
    setIsBulkProcessing(true); // --- FIX: Use a separate state for bulk processing
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
    // onCandidateAdded(); 
  };
  
  const handleClose = () => {
    // If a bulk process has run, we should refetch the list.
    if (isBulkProcessing) {
        onCandidateAdded();
    } else {
        onClose();
    }
    // Reset all state when closing
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
      // --- FIX: Responsive and Overflow Styling ---
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', // Responsive width
          maxWidth: '800px', // Max width for larger screens
          maxHeight: '90vh', // Max height to prevent overflow
          display: 'flex',
          flexDirection: 'column',
          padding: '0' // Remove default padding
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)'
        }
      }}
      contentLabel="Add Candidate Modal"
    >
      {/* --- FIX: Modal Layout for Scrolling --- */}
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