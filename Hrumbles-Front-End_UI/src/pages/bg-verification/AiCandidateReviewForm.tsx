// src/pages/jobs/ai/AiCandidateReviewForm.tsx

import { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid'; // <<< IMPORT UUID

// UI Imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ArrowLeft } from 'lucide-react';

// Constants for Supabase Storage
const BUCKET_NAME = 'candidate_resumes';
const FOLDER_NAME = 'bgv-resumes';

interface WorkExperienceEntry {
  company: string;
  designation: string;
  start_date: string;
  end_date: string;
  responsibilities: string[];
  isVerified: boolean;
}

interface Props {
  jobData: any;
  resumeFile: File | null; // <<< ADDED PROP TO RECEIVE THE FILE
  onSaveComplete: () => void;
  onBack: () => void;
}

export const AiCandidateReviewForm: FC<Props> = ({ jobData, resumeFile, onSaveComplete, onBack }) => {
  const [formData, setFormData] = useState({
    ...jobData,
    work_experience: (jobData.work_experience || []).map((exp: any) => ({ ...exp, isVerified: true }))
  });
    const navigate = useNavigate(); 
  const [candidateIdInput, setCandidateIdInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  const handleWorkExpChange = (index: number, field: keyof WorkExperienceEntry, value: any) => {
    const updatedWorkExp = [...formData.work_experience];
    updatedWorkExp[index] = { ...updatedWorkExp[index], [field]: value };
    setFormData({ ...formData, work_experience: updatedWorkExp });
  };

  const handleSaveCandidate = async () => {
    // <<< UPLOAD LOGIC MOVED HERE
    if (!resumeFile) {
      toast.error("Resume file is missing. Please go back and re-upload.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload the resume file to Supabase Storage
      const sanitizedFileName = resumeFile.name.replace(/[\[\]\+\s]+/g, '_');
      const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
      const filePath = `${FOLDER_NAME}/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, resumeFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);
      const resumeUrl = urlData.publicUrl;

     // 2. Prepare the candidate data payload
      const verifiedWorkExperience = formData.work_experience.filter((exp: WorkExperienceEntry) => exp.isVerified);
      const candidatePayload = {
        ...formData,
        work_experience: verifiedWorkExperience,
        existing_candidate_id: candidateIdInput || null,
      };

      // 3. Call the RPC function, which returns the new candidate's ID as a string
      const { data: newCandidateId, error } = await supabase.rpc('create_candidate_from_resume', {
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_candidate_data: candidatePayload,
        p_resume_url: resumeUrl,
      });

      if (error) throw error;

      // --- CHANGE: Updated redirection logic ---
      // The RPC function returns a string ID, not an object.
      if (newCandidateId && typeof newCandidateId === 'string') {
        toast.success(`Candidate ${formData.candidate_name} saved. Redirecting...`);
        onSaveComplete(); // Close modal/reset state
        // Navigate to the profile page. Use 'unassigned' for the job ID in the URL,
        // as the profile page component doesn't use it and can handle candidates without a job.
        navigate(`/jobs/unassigned/candidate/${newCandidateId}/bgv`);
      } else {
        // Fallback to original behavior if the response is not the expected string ID
        toast.success(`Candidate ${formData.candidate_name} saved successfully.`);
        onSaveComplete();
      }

    } catch (err: any) {
      toast.error("Failed to save candidate", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  
  return (
    <div className="flex flex-col h-[75vh]">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>Step 2: Review & Save Candidate</DialogTitle>
        {/* --- CHANGE: Updated instruction text --- */}
        <DialogDescription>Modify details as required. Uncheck 'Experience' to exclude.</DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="flex-grow mt-4 pr-4">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Name</Label><Input value={formData.candidate_name || ''} onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
               <div className="space-y-1"><Label>Candidate ID (Optional)</Label><Input placeholder="Enter existing ID if any" value={candidateIdInput} onChange={(e) => setCandidateIdInput(e.target.value)} /></div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <Label className="font-semibold">Verified Work Experience</Label>
            {formData.work_experience.length > 0 ? (
              formData.work_experience.map((exp: WorkExperienceEntry, index: number) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">{exp.designation || "No Designation"}</CardTitle>
                    <div className="flex items-center space-x-2"><Label htmlFor={`cb-${index}`} className="text-sm">Include</Label><Checkbox id={`cb-${index}`} checked={exp.isVerified} onCheckedChange={(c) => handleWorkExpChange(index, 'isVerified', !!c)} /></div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1 md:col-span-3"><Label className="text-xs">Company</Label><Input value={exp.company || ''} onChange={(e) => handleWorkExpChange(index, 'company', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Start Date (YYYY-MM)</Label><Input value={exp.start_date || ''} onChange={(e) => handleWorkExpChange(index, 'start_date', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">End Date (YYYY-MM)</Label><Input value={exp.end_date || ''} onChange={(e) => handleWorkExpChange(index, 'end_date', e.target.value)} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : <p className="text-sm text-center text-gray-500 py-8">No work experience extracted.</p>}
          </div>
        </div>
      </ScrollArea>
      
      <div className="flex-shrink-0 flex justify-between pt-4 border-t mt-4">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSaveCandidate} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Candidate
        </Button>
      </div>
    </div>
  );
};