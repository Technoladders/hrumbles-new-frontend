import { useState } from 'react';
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
import mammoth from 'mammoth'; // Keep this for .docx files

// NOTE: All client-side PDF parsing libraries are now gone.

const AddCandidateModal = ({ isOpen, onClose, onCandidateAdded }: any) => {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    toast.info("Parsing resume file...");

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        // --- START: SUPABASE EDGE FUNCTION LOGIC ---
        const { data, error } = await supabase.functions.invoke('talent-pool-parser', {
          body: file, // The Supabase client handles sending the file correctly.
        });

        if (error) {
          throw new Error(error.message);
        }

        text = data.text;
        // --- END: SUPABASE EDGE FUNCTION LOGIC ---
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // .docx parsing can remain on the client-side as it's reliable.
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
      }
      setResumeText(text);
      toast.success("Resume parsed successfully!");
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse file.');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanResponse = (text: string) => {
    const match = text.match(/{[\s\S]*}/);
    if (!match) throw new Error('AI response is not valid JSON.');
    return match[0];
  };

  const handleAnalyseAndSave = async () => {
    if (!resumeText.trim()) {
      toast.error('Resume text cannot be empty.');
      return;
    }
    setIsLoading(true);

    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `
  Based on the following resume text, perform a detailed extraction to create a professional profile.
  Return ONLY a single, valid JSON object with the exact keys specified below.

  **JSON Schema and Strict Instructions:**
  - "suggested_title": string.
    - **Rule 1:** Use the most recent or prominent job title from work experience (e.g., "Technical Lead", "Full Stack Developer").
    - **Rule 2:** If no work experience, infer a suitable title from the professional summary and skills (e.g., "Frontend Developer").
  - "candidate_name": string (Full Name).
  - "email": string (Email address).
  - "phone": string (Phone number, exactly as found).
  - "linkedin_url": string.
    - **Rule:** Must be a valid URL (starts with http, https, or www). If the text is just a phrase like "LinkedIn Profile", return null.
  - "github_url": string.
    - **Rule:** Must be a valid URL. If not a URL, return null.
  - "professional_summary": string (A brief, 2-3 sentence summary).
  - "top_skills": array of strings (List of key technical and soft skills).
  - "work_experience": array of objects, each with "company", "designation", "duration", and "responsibilities" (array of strings).
    - **Rule:** If a company and a client are mentioned (e.g., "Company X | Client: Client Y"), extract only the primary company name ("Company X") into the "company" field.
  - "education": array of objects, each with "institution", "degree", and "year".
    - **Rule:** If an institution name is not explicitly stated, return null for "institution" instead of guessing a location.
  - "projects": array of objects, each with "name", "description", and "technologies" (array of strings).
    - **Rule:** If a "Key Project" is described within a work experience entry, extract it into this "projects" array.
    - **Rule:** For "technologies", extract *all* mentioned technologies, libraries, or frameworks from the project description.
  - "certifications": array of strings.
  
  **Important:** If a field's value cannot be found, use null or an empty array/string as appropriate. Do not add any explanatory text before or after the JSON object.

  Resume Text:
  ---
  ${resumeText}
  ---
`;


      const result = await model.generateContent(prompt);
      const cleanedJson = cleanResponse(result.response.text());
      const profileData = JSON.parse(cleanedJson);

      // Save to Supabase
      const { data: status, error } = await supabase.rpc('upsert_candidate_with_timeframe', {
        profile_data: profileData,
        resume_text: resumeText,
        organization_id_input: organizationId,
        user_id_input: user.id
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle the different outcomes based on the status returned by the function.
      if (status === 'INSERTED' || status === 'UPDATED') {
        toast.success(`Candidate profile ${status.toLowerCase()} successfully!`);
        onCandidateAdded(); // This will refetch data and close the modal.
      } else if (status === 'SKIPPED_RECENT') {
        toast.info('Candidate already exists.', {
          description: 'The profile was updated less than a month ago, so no changes were made.',
        });
        onClose(); // Just close the modal without refetching.
      } else {
        // Fallback for any unexpected status.
        toast.error('An unknown server response was received.');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={{ content: { maxWidth: '800px', margin: 'auto' } }}>
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Add Candidate to Talent Pool</h2>
        <Tabs defaultValue="paste">
          <TabsList>
            <TabsTrigger value="paste">Paste Resume</TabsTrigger>
            <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          </TabsList>
          <TabsContent value="paste">
            <Textarea
              placeholder="Paste the full resume text here..."
              rows={15}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="mt-2"
              disabled={isLoading}
            />
          </TabsContent>
          <TabsContent value="upload">
            <div className="mt-2 p-6 border-2 border-dashed rounded-lg text-center">
              <Input type="file" accept=".pdf,.docx" onChange={handleFileChange} disabled={isLoading} />
              <p className="text-sm text-gray-500 mt-2">Supports PDF and DOCX files.</p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleAnalyseAndSave} disabled={isLoading || !resumeText}>
            {isLoading ? 'Analysing...' : 'Analyse and Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddCandidateModal;