import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ApplicationFormData } from '@/types/application';
import { Button } from '@/components/careerPage/ui/button';
import { User, Briefcase, GraduationCap, FileText, X, Loader2, DollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/careerPage/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/careerPage/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/careerPage/ui/table';
import { Card, CardContent } from '@/components/careerPage/ui/card';
import { Badge } from '@/components/careerPage/ui/badge';

// Import application form section components
import PersonalInfoSection from '@/components/careerPage/application-form/PersonalInfoSection';
import FileUploadSection from '@/components/careerPage/application-form/FileUploadSection';
import EducationSection from '@/components/careerPage/application-form/EducationSection';
import ExperienceSection from '@/components/careerPage/application-form/ExperienceSection';
import { supabase } from "@/integrations/supabase/client";
import '../../careerpage.css'
import SkillsSection from '@/components/careerPage/application-form/SkillSection';


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

  // Form data state initialized with the correct structure
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      availability: '',
      
    },
    currentSalary: 0,
      expectedSalary: 0,
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
      },
      // You can add more fields from your parser output here
    }));
    setIsParsing(false);
  };

  // State for confirmation and success modals
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Personal Information validation
    if (!formData.personalInfo.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
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
    
    if (!formData.personalInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.personalInfo.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.personalInfo.availability) {
      newErrors.availability = 'Availability is required';
    }
    
    // Resume validation
    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    }
    
 
    
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
        description: "There are some required fields that need to be filled.",
        variant: "destructive"
      });
    }
  };


 const confirmSubmission = async () => {
  setSubmitting(true);

  try {
    // Step 1: Package all the necessary data into a single payload.
    // The client's only job is to send this data to the secure backend endpoint.
    const payload = {
      applicationData: formData, // The complete form data object
      jobId: jobId,              // The ID of the job being applied for
       orgId: organizationId,     // The organization ID passed down as a prop
    };

    // Step 2: Invoke the single, powerful Edge Function.
    // This one function handles everything:
    // - Inserting into 'hr_job_candidates'
    // - Parsing the resume from the URL
    // - Calling Gemini AI for analysis
    // - Upserting the full profile into 'hr_talent_pool'
    const { error } = await supabase.functions.invoke('submit-application', {
      body: payload,
    });

    // Step 3: Handle the response.
    // If the Edge Function returns an error for any reason, it will be caught here.
    if (error) {
      throw error; // This will be caught by the catch block below.
    }

    // Step 4: Handle the success case.
    // If no error is thrown, the entire backend process was successful.
    setSubmitting(false);
    setShowConfirmDialog(false);

    toast({
      title: "Application Submitted Successfully!",
      description: `Your application for the ${jobTitle} position has been submitted. We will be in touch.`,
      variant: "default",
    });

    // Navigate the user away after a successful submission.
    onSubmitSuccess();

  } catch (error: any) {
    // This block catches any error, whether from the network or from the function itself.
    setSubmitting(false);
    toast({
      title: "Submission Failed",
      description: error.message || "An unexpected error occurred. Please try again.",
      variant: "destructive",
    });
  }
};


  

  // Update form data function to pass to child components
  const updateFormData = (newData: ApplicationFormData) => {
    setFormData(newData);
    console.log("Updated Personal Info:", newData.personalInfo);

console.log("Updated Resume:", newData.resume);
  };

  // Function to format date from YYYY-MM-DD to Month YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Function to get availability text
  const getAvailabilityText = (availability: string) => {
    switch(availability) {
      case 'immediate': return 'Immediate';
      case '15days': return '15 Days';
      case '30days': return '30 Days';
      case '45days': return '45 Days';
      case '60days': return '60 Days';
      case '90days': return '90 Days';
      default: return availability;
    }
  };

  return (
    <div className="w-full relative">

       {isParsing && (
        <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center rounded-xl">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-lg font-medium text-slate-700">Parsing your resume...</p>
          <p className="text-slate-500">Auto-filling form fields, please wait.</p>
        </div>
      )}
      <form onSubmit={handleSubmitApplication} className="max-w-2xl mx-auto flex flex-col h-full">
        <p className="text-center text-gray-500 mb-6">Complete all required fields marked with an asterisk (*)</p>
        
        <ScrollArea className="flex-1 max-h-[70vh] overflow-y-auto pr-4 -mr-4">
          <div className="space-y-10 pb-4">
              {/* 1. Resume Upload Section FIRST */}
          <FileUploadSection
            formData={formData}
            updateFormData={setFormData}
            errors={errors}
            showValidationErrors={showValidationErrors}
            onParseComplete={handleParseComplete} // Pass the handler
            onParseStart={() => setIsParsing(true)}
          />
          {/* 2. Personal Info Section */}
          <PersonalInfoSection
            formData={formData}
            updateFormData={setFormData}
            errors={errors}
            showValidationErrors={showValidationErrors}
          />
{/* <SkillsSection formData={formData} updateFormData={updateFormData} /> */}

          </div>
        </ScrollArea>
        
        <div className="flex justify-between mt-8 pt-4 border-t sticky bottom-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit Application
          </Button>
        </div>
      </form>

      {/* --- CHANGE: Improved Confirmation Dialog --- */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-bold">Review Your Application</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Please review all details for the <span className="font-semibold">{jobTitle}</span> position.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Personal Info Card */}
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
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium">{formData.personalInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{formData.personalInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Location</p>
                    <p className="font-medium">{formData.personalInfo.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary & Documents Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" /> Compensation & Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                        <p className="text-sm text-gray-500">Current Salary</p>
                        <p className="font-medium">{formData.currentSalary ? `₹${formData.currentSalary.toLocaleString('en-IN')}` : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Expected Salary</p>
                        <p className="font-medium">{formData.expectedSalary ? `₹${formData.expectedSalary.toLocaleString('en-IN')}` : 'N/A'}</p>
                    </div>
                    {formData.resume && (
                        <div className="md:col-span-2 border rounded-md p-3 bg-slate-50 flex items-center gap-3">
                            <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-gray-500">Resume</p>
                                <p className="font-medium break-all">{formData.resume.split('/').pop()}</p>
                            </div>
                        </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
            >
              Edit Application
            </Button>
            
            <Button
              type="button"
              onClick={confirmSubmission}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationForm;
