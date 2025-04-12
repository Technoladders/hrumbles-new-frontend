import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ApplicationFormData } from '@/types/application';
import { Button } from '@/components/careerPage/ui/button';
import { User, Briefcase, GraduationCap, FileText, X } from 'lucide-react';
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
}

const ApplicationForm: React.FC<ApplicationFormProps> = ({
  jobTitle,
  onSubmitSuccess,
  onCancel,
  previousApplications = [],
  onDuplicateApplication
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

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
    
    const isValid = validateForm();
    
    if (isValid) {
      // Check for duplicate application
      if (previousApplications.includes(formData.personalInfo.email)) {
        if (onDuplicateApplication) {
          onDuplicateApplication(formData.personalInfo.email);
        }
        return;
      }
      
      // Show confirmation dialog
      setShowConfirmDialog(true);
    } else {
      // Show validation errors
      setShowValidationErrors(true);
      toast({
        title: "Please fix the errors",
        description: "There are some required fields that need to be filled.",
        variant: "destructive"
      });
      
      // Scroll to the first error
      const firstErrorElement = document.querySelector('.border-red-500');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };


  const confirmSubmission = async () => {
    setSubmitting(true);

    try {
        console.log("Updated Resume:", formData.resume);  // Debugging Log

        // Ensure newData.resume is valid before proceeding
        if (!formData.resume) {
            throw new Error("Resume URL is missing or undefined");
        }

        // Insert job application into `hr_job_candidates` table
        const { error } = await supabase.from('hr_job_candidates').insert([
            {
                job_id: jobId,
                name: formData.personalInfo.fullName,
                email: formData.personalInfo.email,
                phone: formData.personalInfo.phone,
                location: formData.personalInfo.location,
                availability: formData.personalInfo.availability,
                current_salary: formData.currentSalary,
                expected_salary: formData.expectedSalary,
                resume_url: formData.resume,  // Directly using newData.resume
                cover_letter: formData.coverLetter,
                applied_date: new Date().toISOString(),
                applied_from: 'Candidate'
            },
        ]);

        if (error) throw error;

        setSubmitting(false);
        setShowConfirmDialog(false);

        toast({
            title: "Application Submitted Successfully!",
            description: `Your application for the ${jobTitle} position has been submitted.`,
            variant: "default",
        });

        navigate(`/job/${jobId}`);
    } catch (error) {
        setSubmitting(false);
        toast({
            title: "Submission Failed",
            description: error.message || "There was an error submitting your application.",
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
    <div className="w-full">
      <form onSubmit={handleSubmitApplication} className="max-w-2xl mx-auto flex flex-col h-full">
        <p className="text-center text-gray-500 mb-6">Complete all required fields marked with an asterisk (*)</p>
        
        <ScrollArea className="flex-1 max-h-[70vh] overflow-y-auto pr-4 -mr-4">
          <div className="space-y-10 pb-4">
            {/* Personal Information Section */}
            <PersonalInfoSection
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />

{/* <SkillsSection formData={formData} updateFormData={updateFormData} /> */}


            {/* Resume & Cover Letter Section */}
            <FileUploadSection
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-bold">Review Your Application</DialogTitle>
            <DialogDescription className="text-base mt-2">
              Please review all details before submitting your application for the <span className="font-semibold">{jobTitle}</span> position.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Personal Information Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Personal Information
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
                  
                  <div>
                    <p className="text-sm text-gray-500">Availability</p>
                    <p className="font-medium">{getAvailabilityText(formData.personalInfo.availability)}</p>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
            
           
            {/* Files Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Documents
                </h3>
                    {/* Salary Details Section */}
    <div className="border rounded-md p-4 bg-green-50 mb-4">
      <h4 className="text-md font-semibold text-gray-700 mb-2">Salary Details</h4>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Current Salary:</span> ${formData.currentSalary.toLocaleString()}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Expected Salary:</span> ${formData.expectedSalary.toLocaleString()}
      </p>
    </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 bg-blue-50">
                    <p className="text-sm text-gray-600 mb-1">Resume</p>
                    <p className="font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      {formData.resume?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formData.resume && `${(formData.resume.size / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                  
                  {formData.coverLetter && (
                    <div className="border rounded-md p-4 bg-blue-50">
                      <p className="text-sm text-gray-600 mb-1">Cover Letter</p>
                      <p className="text-sm leading-relaxed line-clamp-3">
                        {formData.coverLetter}
                      </p>
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
