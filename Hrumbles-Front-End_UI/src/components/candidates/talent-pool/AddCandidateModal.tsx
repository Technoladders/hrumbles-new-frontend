import React, { useState, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
/// --- HIGHLIGHT START: Remove or comment out this import ---
// import { GoogleGenerativeAI } from '@google/generative-ai';
/// --- HIGHLIGHT END ---
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
    console.log('Raw LLaMA response:', text);
    
    const match = text.match(/{[\s\S]*}/);
    if (!match) {
      throw new Error('AI response does not contain a JSON object. Raw response: ' + text.substring(0, 200) + '...');
    }
    
    const jsonStr = match[0];
    
    if (!jsonStr.trim().endsWith('}')) {
      throw new Error('AI response was truncated. Please increase max_tokens or simplify the resume content.');
    }
    
    try {
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (parseError) {
      throw new Error('AI response is not valid JSON: ' + parseError.message);
    }
  };

  const analyseAndSaveProfile = async (text: string, resumeFile?: File): Promise<{status: string; profile: any}> => {
    /// --- HIGHLIGHT START: LLaMA.cpp LOCAL SERVER INTEGRATION CHANGES ---

    // --- REMOVE OR COMMENT OUT THESE TWO LINES (Gemini API Key and instantiation) ---
    // const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY_TALENT;
    // const genAI = new GoogleGenerativeAI(geminiApiKey);
    // const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    // --- END REMOVAL/COMMENT OUT ---
    
    // --- ADD THESE TWO LINES (Local LLaMA Server URL and Model Name) ---
    const LOCAL_LLAMA_SERVER_URL = 'http://127.0.0.1:8080/v1/chat/completions';
    const LOCAL_LLAMA_MODEL_NAME = 'mistral-7b-instruct-v0.2.Q4_K_M.gguf'; // The model you successfully loaded
    // --- END ADDITION ---

    // --- YOUR ORIGINAL 'prompt' VARIABLE - PRESERVED AS REQUESTED ---
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
+Rule: This MUST be a valid JSON array of objects, separated by commas. Example: [{"company": "A"}, {"company": "B"}].
 Rule: If a company and a client are mentioned (e.g., "Company X | Client: Client Y"), extract only the primary company name ("Company X") into the "company" field.
 
 "education": array of objects, each with "institution", "degree", and "year".
+Rule: This MUST be a valid JSON array of objects, separated by commas. Example: [{"institution": "A"}, {"institution": "B"}].
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
    // --- END OF YOUR ORIGINAL 'prompt' VARIABLE ---

    // --- ADD CRUCIAL NEWLINE SANITIZATION AND DYNAMIC MESSAGE CONSTRUCTION ---
    // This explicitly replaces any non-standard newlines in the *actual resume text*.
    // JSON.stringify will then correctly escape the standard \n when sending the payload.
    const sanitizedResumeInput = text
      .replace(/\r\n/g, '\n') // Replace Windows newlines with Unix newlines
      .replace(/\r/g, '\n');  // Replace old Mac newlines with Unix newlines

    // Extract the system part from your original 'prompt' string.
    // We assume the system instructions end just before "Resume Text:"
    const systemInstructionEndIndex = prompt.indexOf("Resume Text:");
    const SYSTEM_PROMPT_CONTENT = systemInstructionEndIndex !== -1 
        ? prompt.substring(0, systemInstructionEndIndex).trim() 
        : prompt.trim(); // Fallback if "Resume Text:" not found

    // Construct the user content, embedding the sanitized resume text
    const USER_CONTENT = `Resume Text:\n\n---\n${sanitizedResumeInput}\n---`;

    // Construct the messages array for the OpenAI-compatible API
    const messages = [
      { role: "system", content: SYSTEM_PROMPT_CONTENT },
      { role: "user", content: USER_CONTENT }
    ];
    // --- END ADDITION/MODIFICATION FOR PROMPT ---

    // --- Optional: Debugging log to see the exact payload being sent ---
    console.log("--- DEBUG: Full JSON Payload to LLaMA server ---");
    console.log(JSON.stringify({
      model: LOCAL_LLAMA_MODEL_NAME,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.75,
    }, null, 2)); // Pretty-print for readability in console
    console.log("--- END DEBUG ---");
    // --- End Optional Debugging ---

    // --- REPLACE THE Gemini `model.generateContent(prompt)` CALL WITH `fetch` ---
    // This section replaces the Gemini API call with a fetch request to your local LLaMA server.
    const response = await fetch(LOCAL_LLAMA_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header (API key) is needed for local llama-server by default
      },
      body: JSON.stringify({
        model: LOCAL_LLAMA_MODEL_NAME,
        messages: messages, // Use the new messages array constructed from your prompt content
        max_tokens: 2500, // Increased from 1000 to 2500
        temperature: 0.0, // Set to 0.0 for more deterministic output, good for extraction
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Unknown error', details: response.statusText }));
      throw new Error(`Local LLaMA server error: ${response.status} - ${errorBody.message || JSON.stringify(errorBody)}`);
    }

    const result = await response.json();

    // Add response validation
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response structure from LLaMA server');
    }

    // Check if response was truncated
    if (result.choices[0].finish_reason === 'length') {
      throw new Error('Response was truncated due to token limit. Please increase max_tokens.');
    }

    // --- MODIFY TOKEN USAGE EXTRACTION ---
    // The token usage structure from llama-server's OpenAI-compatible API is different from Gemini.
    // The structure is result.usage.prompt_tokens and result.usage.completion_tokens
    const inputTokens = result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.completion_tokens || 0;
    
    // The model's actual generated content is in result.choices[0].message.content
    // Ensure you pass THIS content to cleanResponse
    const cleanedJson = cleanResponse(result.choices[0].message.content);
    // --- END TOKEN USAGE MODIFICATION ---

    /// --- HIGHLIGHT END: LLaMA.cpp LOCAL SERVER INTEGRATION CHANGES ---

    const profileData = JSON.parse(cleanedJson);
    let resumePath: string | null = null;
    if (resumeFile) {
        const sanitizedName = sanitizeFileName(resumeFile.name);
        const fileName = `${uuidv4()}-${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, resumeFile);
        
        if (uploadError) throw new Error(`File Upload Error: ${uploadData?.path || uploadError.message}`); // Fix for uploadData being null

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
    
    if (status === 'SKIPPED_NO_EMAIL') {
        throw new Error('Could not extract a valid email from the resume.');
    }
    
    return { status, profile: profileData };
  };

  // --- HANDLERS (remain unchanged) ---
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