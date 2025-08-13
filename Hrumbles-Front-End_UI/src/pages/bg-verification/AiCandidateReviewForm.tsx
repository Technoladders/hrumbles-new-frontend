import { useState, useEffect, FC } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';

// UI Imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ArrowLeft } from 'lucide-react';

const BUCKET_NAME = 'candidate_resumes'; // Updated bucket name
const FOLDER_NAME = 'bgv-resumes';

interface WorkExperienceEntry {
  company: string;
  designation: string;
  start_date: string;
  end_date: string;
  responsibilities: string[];
  // New property for UI state
  isVerified: boolean;
}

interface ReviewFormData {
  candidate_name: string;
  email: string;
  phone: string;
  resumeText: string;
  work_experience: WorkExperienceEntry[];
}

interface Props {
  jobData: any;
  onReviewComplete: (data: any) => void;
  onBack: () => void;
}

export const AiCandidateReviewForm: FC<Props> = ({ jobData, onReviewComplete, onBack }) => {
   const [formData, setFormData] = useState({
    ...jobData,
    work_experience: (jobData.work_experience || []).map((exp: any) => ({ ...exp, isVerified: true }))
  });
  const [candidateIdInput, setCandidateIdInput] = useState('');
 
  // Handler to update a specific work experience entry
  const handleWorkExpChange = (index: number, field: keyof WorkExperienceEntry, value: any) => {
    const updatedWorkExp = [...formData.work_experience];
    updatedWorkExp[index] = { ...updatedWorkExp[index], [field]: value };
    setFormData({ ...formData, work_experience: updatedWorkExp });
  };


   return (
    // --- KEY CHANGE: Flexbox layout for scrolling ---
     <div className="flex flex-col h-[75vh]">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>Step 2: Review & Verify Details</DialogTitle>
        <DialogDescription>Edit any details extracted by the AI and uncheck any experience to exclude.</DialogDescription>
      </DialogHeader>
     
      {/* Scrollable Content Area */}
      <ScrollArea className="flex-grow mt-4 pr-4">
        <div className="space-y-4">
          {/* Basic Info Section */}
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Name</Label><Input value={formData.candidate_name || ''} onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>External ID (Optional)</Label><Input placeholder="Enter existing ID if any" value={candidateIdInput} onChange={(e) => setCandidateIdInput(e.target.value)} /></div>
            </CardContent>
          </Card>
          
          {/* Work Experience Section */}
          <div className="space-y-2">
            <Label className="font-semibold">Verified Work Experience</Label>
            <div className="space-y-3">
              {formData.work_experience.length > 0 ? (
                formData.work_experience.map((exp, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">{exp.designation || "No Designation"}</CardTitle>
                      <div className="flex items-center space-x-2"><Label htmlFor={`cb-${index}`} className="text-sm">Verify</Label><Checkbox id={`cb-${index}`} checked={exp.isVerified} onCheckedChange={(c) => handleWorkExpChange(index, 'isVerified', !!c)} /></div>
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
              ) : (
                <p className="text-sm text-center text-gray-500 py-8">No work experience extracted.</p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
      
      {/* Fixed Footer */}
     <div className="flex-shrink-0 flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => onReviewComplete(formData)}>Next: Assign to Job</Button>
      </div>
    </div>
  );
};

export default AiCandidateReviewForm;