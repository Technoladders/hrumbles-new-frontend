import { useState } from 'react';
import Modal from 'react-modal';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';

// Import your card-based comparison view and its data type
import { CandidateComparisonView, ParsedCandidateProfile } from './CandidateComparisonView'; 

// --- DYNAMIC MODAL STYLES ---
const compactViewStyles = {
  content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '50vw', maxWidth: '750px', padding: '0', border: 'none', borderRadius: '12px', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' },
  overlay: { backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' },
};
const compareViewStyles = {
  content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '96vw', maxWidth: '2000px', height: '90vh', padding: '0', border: 'none', borderRadius: '12px', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)', background: '#F9FAFB', overflow: 'hidden' },
  overlay: { backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' },
};

Modal.setAppElement('#root');
const ITEMS_PER_PAGE = 5;

// --- SELF-CONTAINED HELPER FUNCTIONS ---

async function parseFileToText(file: File): Promise<string> {
  const isDoc = file.type === 'application/msword';
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (isDoc || isDocx) {
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (file.type === 'application/pdf') {
    const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
    if (error) throw new Error(`PDF Parsing Failed: ${error.message}`);
    return data.text;
  }
  throw new Error('Unsupported file type');
}

const createSystemPrompt = (requiredSkills: string[]) => `
You are an expert HR AI Assistant. Your task is to analyze a resume and return a structured JSON object.
RETURN ONLY a single, valid JSON object. Do not include any explanations or markdown.

**JSON Schema:**
{
  "candidate_name": "string",
  "location": "string | null",
  "summary": "string",
  "education_summary": "string | null",
  "experience_years": "string | null",
  "validation_score": "number",
  "matched_skills": "string[]",
  "unmatched_skills": "string[]",
  "missed_skills": "string[]" 
}

**Field Extraction and Analysis Rules (IMPORTANT):**

1.  **candidate_name**, **location**, **summary**, **education_summary**, **experience_years**: Extract these as before.
2.  **validation_score**: Calculate the score (0-100) based on skill match and experience.
3.  **matched_skills**: An array of skills present in BOTH the resume AND this required list: [${requiredSkills.join(', ')}].
4.  **unmatched_skills**: An array of up to 10 other relevant skills from the resume that are NOT in the required list.
5.  **missed_skills**: This is crucial. An array of skills that are in the required list ([${requiredSkills.join(', ')}]) but are NOT found in the resume. This shows what the candidate is missing.
`;


async function getRealParsedData(resumeText: string, jobSkills: string[]): Promise<ParsedCandidateProfile> {
  const systemPrompt = createSystemPrompt(jobSkills);
  const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true });
  const result = await openai.chat.completions.create({ model: 'gpt-4.1-nano', response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Resume Text:\n---\n${resumeText}\n---` }] });
  const content = result.choices[0].message.content;
  if (!content) throw new Error("AI returned empty response.");
  return JSON.parse(content);
}

// --- MAIN COMPONENT ---
const ResumeUploadModal = ({ isOpen, onClose, onCandidateAdded,job }: any) => {
  
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'bulk'>('paste');
  const [bulkView, setBulkView] = useState<'upload' | 'compare'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidateProfile[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [resumeText, setResumeText] = useState('');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // This check is now essential and correct
    if (!job?.skills || !job?.id) return toast.error("Job details are required for analysis.");
    
    setIsProcessing(true);
    setProgress(0);
    
    const analysisPromises = Array.from(files).map(async (file, index) => {
      try {
        // --- Step 1: Upload to Storage to get permanent URL ---
        const sanitizedFileName = file.name.replace(/[^\w\s.-]/g, ''); 
     const filePath = `public/resumes/${job.id}/${uuidv4()}-${sanitizedFileName}`; 
        
        const { error: uploadError } = await supabase.storage
          .from('candidate-resumes')
          .upload(filePath, file, { contentType: file.type });
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('candidate-resumes').getPublicUrl(filePath);
        const resumeUrl = urlData.publicUrl;

        // --- Step 2: Parse and Analyze ---
        const text = await parseFileToText(file);
        const profile = await getRealParsedData(text, job.skills);
        
        profile.fileName = file.name;
        profile.resume_url = resumeUrl; // Use the permanent URL
        profile.resume_text = text; // Keep the text for saving later

        setProgress(((index + 1) / files.length) * 100);
        return { status: 'fulfilled' as const, value: profile };

      } catch (error: any) {
        toast.error(`Failed to process ${file.name}: ${error.message}`);
        setProgress(((index + 1) / files.length) * 100);
        return { status: 'rejected' as const, reason: error };
      }
    });

    const results = await Promise.all(analysisPromises);
    const successfullyParsed = results.filter(res => res.status === 'fulfilled').map(res => res.value);

    if (successfullyParsed.length > 0) {
      successfullyParsed.sort((a, b) => (b.validation_score || 0) - (a.validation_score || 0));
      setParsedCandidates(successfullyParsed);
      setBulkView('compare');
    } else { 
      toast.error("No resumes could be processed."); 
    }
    setIsProcessing(false);
  };

  
   const handleFinalizeSelection = async () => {
    const candidatesToFinalize = Array.from(selectedIndices).map(index => parsedCandidates[index]);
    if (candidatesToFinalize.length === 0) return toast.error("Please select candidates to add.");

    setIsProcessing(true);
    toast.info(`Adding ${candidatesToFinalize.length} candidates to the job...`);

   const insertPromises = candidatesToFinalize.map(candidate => {
  const payload = {
    job_id: job.id,
    candidate_id: uuidv4(),
    resume_text: (candidate as any).resume_text,
    overall_score: candidate.validation_score,
    matched_skills: JSON.stringify(candidate.matched_skills),
    summary: candidate.summary,
    top_skills: candidate.unmatched_skills, 
    candidate_name: candidate.candidate_name,
    resume_url: candidate.resume_url,
    created_by: user.id,
    organization_id: organizationId,
  };
  
  // --- ADD THIS LOG ---
  console.log("Attempting to insert payload:", payload);
  
  return supabase.from('resume_analysis').insert(payload);
});
    
    const results = await Promise.all(insertPromises);
    const errors = results.filter(res => res.error);

    if (errors.length > 0) {
      toast.error(`${errors.length} candidates could not be saved.`);
      console.error("Supabase insert errors:", errors);
    }
    if (results.length > errors.length) {
      toast.success(`${results.length - errors.length} candidates were successfully added!`);
    }

    onCandidateAdded(); // Signal parent page to refetch
    handleClose();
    setIsProcessing(false);
  };
  const handleClose = () => {
    setActiveTab('paste');
    setBulkView('upload');
    setParsedCandidates([]);
    setSelectedIndices(new Set());
    setCurrentPage(1);
    setProgress(0);
    setIsProcessing(false);
    setResumeText('');
    setSingleFile(null);
    onClose();
  };

  const handleSelectionChange = (actualIndex: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(actualIndex)) {
      newSet.delete(actualIndex);
    } else {
      newSet.add(actualIndex);
    }
    setSelectedIndices(newSet);
  };
  
  const handleSelectAll = () => {
    const allSelected = selectedIndices.size === parsedCandidates.length;
    if (allSelected) {
      setSelectedIndices(new Set());
    } else {
      const allIndices = new Set(parsedCandidates.map((_, index) => index));
      setSelectedIndices(allIndices);
    }
  };
  
  const totalPages = Math.ceil(parsedCandidates.length / ITEMS_PER_PAGE);
  const candidatesToDisplay = parsedCandidates.length > ITEMS_PER_PAGE
    ? parsedCandidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : parsedCandidates;
  const isCompareViewActive = activeTab === 'bulk' && bulkView === 'compare';
  
  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} style={isCompareViewActive ? compareViewStyles : compactViewStyles}>
      <div className={`flex flex-col h-full ${isCompareViewActive ? 'bg-gray-50' : 'bg-white'}`}>
        
        {isCompareViewActive ? (
          <CandidateComparisonView
            candidates={candidatesToDisplay}
            selectedIndices={selectedIndices}
            onSelectionChange={handleSelectionChange}
            onSelectAll={handleSelectAll}
            onExit={handleClose}
            onAddSingleCandidate={(candidate) => {
              console.log("Adding single candidate:", candidate);
              toast.success(`${candidate.candidate_name} added to pool!`);
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalCandidates={parsedCandidates.length}
          />
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Analyse and Add Candidate</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-grow bg-white">
              <div className="flex justify-center p-4">
                <div className="bg-gray-100 rounded-lg p-1 flex items-center space-x-1">
                  <button onClick={() => setActiveTab('paste')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'paste' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Paste Resume</button>
                  <button onClick={() => setActiveTab('upload')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'upload' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Upload Single</button>
                  <button onClick={() => setActiveTab('bulk')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'bulk' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>Bulk Upload</button>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'paste' && <Textarea placeholder="Paste the full resume text here..." className="min-h-[250px]" value={resumeText} onChange={(e) => setResumeText(e.target.value)} />}
                {activeTab === 'upload' && <div className="p-6 border-2 border-dashed rounded-lg text-center"><Input type="file" onChange={(e) => setSingleFile(e.target.files ? e.target.files[0] : null)} accept=".pdf,.doc,.docx"/></div>}
                {activeTab === 'bulk' && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">Select multiple files (.pdf, .doc, .docx). They will be analyzed for your review.</p>
                    <div className="p-6 border-2 border-dashed rounded-lg"><Input type="file" onChange={handleBulkUpload} disabled={isProcessing} multiple accept=".pdf,.doc,.docx"/></div>
                    {isProcessing && <Progress value={progress} className="w-full mt-4" />}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {isCompareViewActive &&
          <div className="flex justify-end gap-2 p-4 border-t mt-auto bg-gray-50 flex-shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleFinalizeSelection} disabled={isProcessing} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isProcessing ? 'Adding...' : `Add ${selectedIndices.size} Selected`}
            </Button>
          </div>
        }
      </div>
    </Modal>
  );
};

export default ResumeUploadModal;