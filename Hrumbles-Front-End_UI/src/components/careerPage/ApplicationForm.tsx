import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ApplicationFormData } from '@/types/application';
import { Button } from '@/components/careerPage/ui/button';
import { User, FileText, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/careerPage/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/careerPage/ui/dialog';
import { Card, CardContent } from '@/components/careerPage/ui/card';

// Import application form section components
import PersonalInfoSection from '@/components/careerPage/application-form/PersonalInfoSection';
import FileUploadSection from '@/components/careerPage/application-form/FileUploadSection';
import { supabase } from "@/integrations/supabase/client";
import '../../careerpage.css'

interface ApplicationFormProps {
  jobTitle: string;
  onSubmitSuccess: () => void;
  onCancel: () => void;
  previousApplications?: string[];
  onDuplicateApplication?: (email: string) => void;
  organizationId: string;
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobTitle,
  onSubmitSuccess,
  onCancel,
  previousApplications = [],
  onDuplicateApplication,
  organizationId
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const [isParsing, setIsParsing] = useState(false);

  // Initial State: Removed Salary fields
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      availability: '',
    },
    // Removed currentSalary and expectedSalary
    resume: null,
    coverLetter: '',
  });

  const handleParseComplete = (parsedData: any) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        fullName: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
        email: parsedData.email || prev.personalInfo.email,
        phone: parsedData.phone || prev.personalInfo.phone,
        location: parsedData.currentLocation || prev.personalInfo.location,
        // Availability usually isn't in resume, so we leave it
      },
    }));
    setIsParsing(false);
  };

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // 1. Full Name (Mandatory)
    if (!formData.personalInfo.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    // 2. Email (Mandatory)
    if (!formData.personalInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email)) {
      newErrors.email = 'Please enter a valid email';
    } else if (previousApplications.includes(formData.personalInfo.email)) {
      newErrors.email = 'You have already applied for this position';
      if (onDuplicateApplication) {
        onDuplicateApplication(formData.personalInfo.email);
      }
    }
    
    // 3. Resume (Mandatory)
    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    }

    // --- REMOVED MANDATORY CHECKS FOR: Phone, Location, Availability ---
    // If you want them back, uncomment below:
    /*
    if (!formData.personalInfo.phone.trim()) newErrors.phone = 'Required';
    if (!formData.personalInfo.location.trim()) newErrors.location = 'Required';
    if (!formData.personalInfo.availability) newErrors.availability = 'Required';
    */
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmDialog(true);
    } else {
      setShowValidationErrors(true);
      toast({
        title: "Please fix the errors",
        description: "Name, Email, and Resume are required.",
        variant: "destructive"
      });
    }
  };

  const confirmSubmission = async () => {
    setSubmitting(true);
    try {
      const payload = {
        applicationData: formData,
        jobId: jobId,
        orgId: organizationId,
      };

      const { error } = await supabase.functions.invoke('submit-application', {
        body: payload,
      });

      if (error) throw error;

      setSubmitting(false);
      setShowConfirmDialog(false);
      toast({
        title: "Application Submitted Successfully!",
        description: `Your application for ${jobTitle} has been submitted.`,
        variant: "default",
      });
      onSubmitSuccess();
    } catch (error: any) {
      setSubmitting(false);
      toast({
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const updateFormData = (newData: ApplicationFormData) => {
    setFormData(newData);
  };

  return (
    <div className="w-full relative">
       {isParsing && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center rounded-xl">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg font-medium text-slate-700">Parsing your resume...</p>
        </div>
      )}
      <form onSubmit={handleSubmitApplication} className="max-w-2xl mx-auto flex flex-col h-full">
        <p className="text-center text-gray-500 mb-6">Fields marked with * are required.</p>
        
        <ScrollArea className="flex-1 max-h-[70vh] overflow-y-auto pr-4 -mr-4">
          <div className="space-y-10 pb-4">
            <FileUploadSection
              formData={formData}
              updateFormData={setFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
              onParseComplete={handleParseComplete}
              onParseStart={() => setIsParsing(true)}
            />
            <PersonalInfoSection
              formData={formData}
              updateFormData={setFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
          </div>
        </ScrollArea>
        
        <div className="flex justify-between mt-8 pt-4 border-t sticky bottom-0 bg-background">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
            Submit Application
          </Button>
        </div>
      </form>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review details for <span className="font-semibold">{jobTitle}</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{formData.personalInfo.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{formData.personalInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{formData.personalInfo.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{formData.personalInfo.location || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Removed Salary Section, only showing Resume */}
            {formData.resume && (
              <Card>
                <CardContent className="p-6">
                    <div className="border rounded-md p-3 bg-slate-50 flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-gray-500">Resume</p>
                            <p className="font-medium break-all">{formData.resume.split('/').pop()}</p>
                        </div>
                    </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-6 border-t">
            <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Edit
            </Button>
            <Button type="button" onClick={confirmSubmission} disabled={submitting} className="bg-blue-600">
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationForm;