
import React, { useState } from 'react';
import { Button } from '@/components/careerPage/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/careerPage/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/careerPage/ui/alert-dialog';
import { X, Save, Check, FileText, Briefcase, GraduationCap, User, AlertTriangle, Loader2 } from 'lucide-react';
import { ApplicationFormData, EducationEntry, ExperienceEntry, PersonalInfo } from '@/types/application';
import PersonalInfoSection from './application-form/PersonalInfoSection';
import ExperienceSection from './application-form/ExperienceSection';
import EducationSection from './application-form/EducationSection';
import FileUploadSection from './application-form/FileUploadSection';
import { ScrollArea } from '@/components/careerPage/ui/scroll-area';
import { isValidResumeFile } from '@/lib/validation';
import { Alert, AlertTitle } from '@/components/careerPage/ui/alert';
import '../../careerpage.css'

interface CandidateFormProps {
  jobTitle: string;
  onSubmitSuccess: () => void;
  onCancel: () => void;
  previousApplications: string[];
  onDuplicateApplication: (email: string) => void;
}

const CandidateForm: React.FC<CandidateFormProps> = ({
  jobTitle,
  onSubmitSuccess,
  onCancel,
  previousApplications,
  onDuplicateApplication
}) => {
  const initialFormData: ApplicationFormData = {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      availability: ''
    },
    experiences: [],
    education: [],
    resume: null,
    coverLetter: ''
  };
  
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const updateFormData = (newData: ApplicationFormData) => {
    setFormData(newData);
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    // Validate personal info
    const { fullName, email, phone, location, availability } = formData.personalInfo;
    const nameParts = fullName.trim().split(' ');
    
    if (!fullName || nameParts.length < 2) {
      newErrors.fullName = 'Full name is required (first and last name)';
      isValid = false;
    }
    
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }
    
    if (!phone) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Phone number must have at least 10 digits';
      isValid = false;
    }
    
    if (!location) {
      newErrors.location = 'Location is required';
      isValid = false;
    }
    
    if (!availability) {
      newErrors.availability = 'Availability is required';
      isValid = false;
    }
    
    // Validate experience entries
    if (formData.experiences.length === 0) {
      newErrors.experiences = 'At least one experience entry is required';
      isValid = false;
    } else {
      formData.experiences.forEach((exp, index) => {
        if (!exp.title) {
          newErrors[`experience_${index}_title`] = 'Title is required';
          isValid = false;
        }
        
        if (!exp.company) {
          newErrors[`experience_${index}_company`] = 'Company is required';
          isValid = false;
        }
        
        if (!exp.fromDate) {
          newErrors[`experience_${index}_fromDate`] = 'From date is required';
          isValid = false;
        }
        
        if (!exp.toDate && !exp.currentlyWorking) {
          newErrors[`experience_${index}_toDate`] = 'To date is required if not currently working';
          isValid = false;
        }
        
        if (exp.skills.length === 0) {
          newErrors[`experience_${index}_skills`] = 'At least one skill is required';
          isValid = false;
        }
      });
    }
    
    // Validate education entries
    if (formData.education.length === 0) {
      newErrors.education = 'At least one education entry is required';
      isValid = false;
    } else {
      formData.education.forEach((edu, index) => {
        if (!edu.institute) {
          newErrors[`education_${index}_institute`] = 'Institute is required';
          isValid = false;
        }
        
        if (!edu.degree) {
          newErrors[`education_${index}_degree`] = 'Degree is required';
          isValid = false;
        }
        
        if (!edu.fromDate) {
          newErrors[`education_${index}_fromDate`] = 'From date is required';
          isValid = false;
        }
        
        if (!edu.toDate) {
          newErrors[`education_${index}_toDate`] = 'To date is required';
          isValid = false;
        }
      });
    }
    
    // Validate resume
    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
      isValid = false;
    } else if (!isValidResumeFile(formData.resume)) {
      newErrors.resume = 'Invalid file format. Please upload PDF, DOC, or DOCX';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate application
    if (previousApplications.includes(formData.personalInfo.email)) {
      onDuplicateApplication(formData.personalInfo.email);
      return;
    }
    
    // Show confirmation dialog if valid
    const isValid = validateForm();
    
    if (isValid) {
      setShowConfirmationDialog(true);
    } else {
      setShowValidationErrors(true);
      
      // Scroll to the top to show validation errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleConfirmSubmission = () => {
    setShowConfirmationDialog(false);
    setSubmitting(true);
    
    // Simulate a submission with a timeout
    setTimeout(() => {
      setSubmitting(false);
      setShowSuccessDialog(true);
    }, 1500);
  };
  
  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    onSubmitSuccess();
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {showValidationErrors && Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Please fix the following errors</AlertTitle>
          </Alert>
        )}
        
        <ScrollArea className="flex-1 max-h-[70vh] pr-4 -mr-4">
          <div className="space-y-10 pb-4">
            <PersonalInfoSection 
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
            
            <ExperienceSection 
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
            
            <EducationSection 
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
            
            <FileUploadSection 
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              showValidationErrors={showValidationErrors}
            />
          </div>
        </ScrollArea>
        
        {/* Form Actions - Fixed at the bottom */}
        <div className="flex justify-between pt-4 mt-4 border-t sticky bottom-0 bg-background">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          
          <Button 
            type="submit" 
            disabled={submitting}
            className="relative"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Submit Application
              </>
            )}
          </Button>
        </div>
      </form>
      
      {/* Confirmation Dialog */}
      <AlertDialog 
        open={showConfirmationDialog} 
        onOpenChange={setShowConfirmationDialog}
      >
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Confirm Application Details</AlertDialogTitle>
            <AlertDialogDescription>
              Please review your application details before final submission
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <ScrollArea className="flex-1 mt-4 pr-4 -mr-4">
            <div className="space-y-6 mb-6">
              {/* Personal Information */}
              <div className="space-y-2">
                <h3 className="text-base font-medium flex items-center gap-2 text-blue-600 border-b pb-1">
                  <User className="h-4 w-4" /> Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="font-medium">Full Name:</span> {formData.personalInfo.fullName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {formData.personalInfo.email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {formData.personalInfo.phone}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {formData.personalInfo.location}
                  </div>
                  <div>
                    <span className="font-medium">Availability:</span> {formData.personalInfo.availability}
                  </div>
                  {formData.personalInfo.linkedin && (
                    <div>
                      <span className="font-medium">LinkedIn:</span> {formData.personalInfo.linkedin}
                    </div>
                  )}
                  {formData.personalInfo.github && (
                    <div>
                      <span className="font-medium">GitHub:</span> {formData.personalInfo.github}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Experience */}
              <div className="space-y-2">
                <h3 className="text-base font-medium flex items-center gap-2 text-blue-600 border-b pb-1">
                  <Briefcase className="h-4 w-4" /> Experience
                </h3>
                {formData.experiences.map((exp, index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-md">
                    <div className="text-sm">
                      <div className="font-medium">{exp.title} at {exp.company}</div>
                      {exp.location && <div className="text-gray-600">{exp.location}</div>}
                      <div className="text-gray-600">
                        {formatDate(exp.fromDate)} - {exp.currentlyWorking ? 'Present' : formatDate(exp.toDate)}
                      </div>
                      {exp.description && (
                        <div className="mt-2 text-gray-700 whitespace-pre-line">
                          {exp.description}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {exp.skills.map((skill, skillIndex) => (
                          <span 
                            key={skillIndex} 
                            className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Education */}
              <div className="space-y-2">
                <h3 className="text-base font-medium flex items-center gap-2 text-blue-600 border-b pb-1">
                  <GraduationCap className="h-4 w-4" /> Education
                </h3>
                {formData.education.map((edu, index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-md text-sm">
                    <div className="font-medium">{edu.degree}</div>
                    <div>{edu.institute}</div>
                    {edu.percentage && <div>Percentage/CGPA: {edu.percentage}</div>}
                    <div className="text-gray-600">
                      {formatDate(edu.fromDate)} - {formatDate(edu.toDate)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Resume & Cover Letter */}
              <div className="space-y-2">
                <h3 className="text-base font-medium flex items-center gap-2 text-blue-600 border-b pb-1">
                  <FileText className="h-4 w-4" /> Resume & Cover Letter
                </h3>
                <div className="text-sm">
                  {formData.resume && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span>
                        {formData.resume.name} ({(formData.resume.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                  
                  {formData.coverLetter && (
                    <div className="mt-2">
                      <div className="font-medium">Cover Letter:</div>
                      <p className="whitespace-pre-line mt-1">{formData.coverLetter}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <AlertDialogFooter className="border-t pt-4 mt-2">
            <AlertDialogCancel>Edit Details</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmission}>
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              Application Submitted Successfully
            </DialogTitle>
            <DialogDescription>
              Thank you for applying for the {jobTitle} position. We'll review your application and get back to you soon.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 text-center">
            <Button onClick={handleCloseSuccessDialog}>
              Return to Job Listings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidateForm;
