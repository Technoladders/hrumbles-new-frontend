import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, FileText, Upload, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './quick-apply-modal.css';
import { v4 as uuidv4 } from 'uuid';

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    company: string;
    logoUrl?: string;
  };
  organizationId: string;
}

interface FormData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    availability: string;
  };
  resume: string | null;
  coverLetter: string;
}

const BUCKET_NAME = 'candidate_resumes';

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({
  isOpen,
  onClose,
  job,
  organizationId
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      availability: '',
    },
    resume: null,
    coverLetter: '',
  });

  // Handle file upload with AI parsing
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB. Please upload a smaller file.");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;

    setIsParsing(true);
    setUploadError(null);
    toast({ title: "Uploading resume..." });

    try {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uniqueFileName);
      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to retrieve resume URL.");
      }
      const resumeUrl = urlData.publicUrl;
      
      // Update form with resume URL
      setFormData(prev => ({ ...prev, resume: resumeUrl }));

      // Parse resume with AI
      toast({ title: "Resume uploaded. Parsing with AI..." });
      
      const { data: parsedData, error: functionError } = await supabase.functions.invoke('parse-resume', {
        body: { fileUrl: resumeUrl },
      });

      if (functionError) {
        throw new Error(`AI Parsing Error: ${functionError.message}`);
      }
      
      // Auto-fill form with parsed data
      if (parsedData) {
        setFormData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim(),
            email: parsedData.email || prev.personalInfo.email,
            phone: parsedData.phone || prev.personalInfo.phone,
            location: parsedData.currentLocation || prev.personalInfo.location,
          },
        }));
        
        toast({
          title: "Success!",
          description: "Your information has been auto-filled from your resume.",
          variant: 'default',
        });
      }

    } catch (error: any) {
      console.error('Resume processing error:', error);
      setUploadError(`Processing failed: ${error.message}`);
      toast({
        title: "An Error Occurred",
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume) {
      const filePath = formData.resume.split(`${BUCKET_NAME}/`)[1];
      if (filePath) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }
    }
    setFormData(prev => ({ ...prev, resume: null }));
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.personalInfo.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.personalInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.resume) {
      newErrors.resume = 'Resume is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (step === 'form') {
      if (validateForm()) {
        setStep('review');
      } else {
        toast({
          title: "Please fix the errors",
          description: "Name, Email, and Resume are required.",
          variant: "destructive"
        });
      }
      return;
    }

    if (step === 'review') {
      setSubmitting(true);
      try {
        const payload = {
          applicationData: formData,
          jobId: job.id,
          orgId: organizationId,
        };

        const { error } = await supabase.functions.invoke('submit-application', {
          body: payload,
        });

        if (error) throw error;

        setStep('success');
        toast({
          title: "Application Submitted Successfully!",
          description: `Your application for ${job.title} has been submitted.`,
          variant: "default",
        });
      } catch (error: any) {
        toast({
          title: "Submission Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      setFormData({
        personalInfo: {
          fullName: '',
          email: '',
          phone: '',
          location: '',
          availability: '',
        },
        resume: null,
        coverLetter: '',
      });
      setStep('form');
    }
    onClose();
  };

  if (!isOpen) return null;

  const splitFullName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const { firstName, lastName } = splitFullName(formData.personalInfo.fullName);

  const updateFullName = (field: 'firstName' | 'lastName', value: string) => {
    let newFullName = field === 'firstName' 
      ? `${value} ${lastName}`.trim() 
      : `${firstName} ${value}`.trim();
    
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, fullName: newFullName }
    }));
  };

  return (
    <div className="quick-apply-overlay" onClick={handleClose}>
      <div className="quick-apply-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="quick-apply-header">
          <div className="quick-apply-header-content">
            {job.logoUrl ? (
              <img src={job.logoUrl} alt={job.company} className="quick-apply-company-logo" />
            ) : (
              <div className="quick-apply-company-logo-placeholder">
                {job.company.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="quick-apply-title">Quick Apply</h2>
              <p className="quick-apply-subtitle">{job.title} • {job.company}</p>
            </div>
          </div>
          <button onClick={handleClose} className="quick-apply-close-btn">
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="quick-apply-progress">
          <div className={`progress-step ${step === 'form' ? 'active' : step === 'review' || step === 'success' ? 'completed' : ''}`}>
            <div className="progress-step-circle">1</div>
            <span className="progress-step-label">Fill Details</span>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === 'review' ? 'active' : step === 'success' ? 'completed' : ''}`}>
            <div className="progress-step-circle">2</div>
            <span className="progress-step-label">Review</span>
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === 'success' ? 'active completed' : ''}`}>
            <div className="progress-step-circle">3</div>
            <span className="progress-step-label">Done</span>
          </div>
        </div>

        {/* Content */}
        <div className="quick-apply-content">
          {isParsing && (
            <div className="parsing-overlay">
              <Loader2 className="parsing-spinner" size={48} />
              <p className="parsing-text">Parsing your resume with AI...</p>
            </div>
          )}

          {/* STEP 1: Form */}
          {step === 'form' && (
            <div className="quick-apply-form">
              <p className="form-required-note">Fields marked with * are required</p>

              {/* Resume Upload */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <FileText size={20} /> Resume *
                </h3>
                
                {formData.resume ? (
                  <div className="resume-uploaded">
                    <div className="resume-uploaded-content">
                      <FileText size={32} className="resume-icon" />
                      <div>
                        <p className="resume-filename">{formData.resume.split('/').pop()}</p>
                        <a 
                          href={formData.resume} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="resume-view-link"
                        >
                          View Resume
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveResume}
                      className="resume-remove-btn"
                      disabled={isParsing}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className={`resume-upload-area ${errors.resume ? 'error' : ''}`}>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={isParsing}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="resume-upload" className="resume-upload-label">
                      <Upload size={40} className="upload-icon" />
                      <h4 className="upload-title">
                        {isParsing ? 'Processing Resume...' : 'Upload your resume'}
                      </h4>
                      <p className="upload-subtitle">PDF, DOC, or DOCX (Max 5MB)</p>
                      <button 
                        type="button" 
                        className="upload-btn"
                        disabled={isParsing}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('resume-upload')?.click();
                        }}
                      >
                        {isParsing ? (
                          <>
                            <Loader2 size={16} className="btn-spinner" />
                            Please wait
                          </>
                        ) : (
                          'Select File'
                        )}
                      </button>
                    </label>
                  </div>
                )}

                {uploadError && <p className="error-text">{uploadError}</p>}
                {errors.resume && <p className="error-text">{errors.resume}</p>}
              </div>

              {/* Personal Information */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <User size={20} /> Personal Information
                </h3>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.fullName ? 'error' : ''}`}
                      value={firstName}
                      onChange={(e) => updateFullName('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.fullName ? 'error' : ''}`}
                      value={lastName}
                      onChange={(e) => updateFullName('lastName', e.target.value)}
                      placeholder="Doe"
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Email *</label>
                    <div className="form-input-icon">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        className={`form-input with-icon ${errors.email ? 'error' : ''}`}
                        value={formData.personalInfo.email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, email: e.target.value }
                        }))}
                        placeholder="john.doe@example.com"
                      />
                    </div>
                    {errors.email && <p className="error-text">{errors.email}</p>}
                  </div>

                  <div className="form-field">
                    <label className="form-label">Phone Number</label>
                    <PhoneInput
                      international
                      defaultCountry="IN"
                      placeholder="Enter phone number"
                      value={formData.personalInfo.phone}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, phone: value || '' }
                      }))}
                      className="phone-input-wrapper"
                    />
                  </div>

                  <div className="form-field form-field-full">
                    <label className="form-label">Availability</label>
                    <div className="form-input-icon">
                      <Calendar size={18} className="input-icon" />
                      <select
                        className="form-input with-icon"
                        value={formData.personalInfo.availability}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, availability: e.target.value }
                        }))}
                      >
                        <option value="">Select availability</option>
                        <option value="Immediate">Immediate</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                        <option value="45 Days">45 Days</option>
                        <option value="60 Days">60 Days</option>
                        <option value="90 Days">90 Days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="form-section">
                <h3 className="form-section-title">
                  <FileText size={20} /> Cover Letter (Optional)
                </h3>
                <textarea
                  className="form-textarea"
                  value={formData.coverLetter}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
                  placeholder="Write a brief cover letter explaining why you're interested in this position..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Review */}
          {step === 'review' && (
            <div className="quick-apply-review">
              <h3 className="review-title">Review Your Application</h3>
              <p className="review-subtitle">Please review your information before submitting</p>

              <div className="review-section">
                <h4 className="review-section-title">
                  <User size={18} /> Personal Information
                </h4>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Full Name</span>
                    <span className="review-value">{formData.personalInfo.fullName}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Email</span>
                    <span className="review-value">{formData.personalInfo.email}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Phone</span>
                    <span className="review-value">{formData.personalInfo.phone || '-'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Availability</span>
                    <span className="review-value">{formData.personalInfo.availability || '-'}</span>
                  </div>
                </div>
              </div>

              {formData.resume && (
                <div className="review-section">
                  <h4 className="review-section-title">
                    <FileText size={18} /> Resume
                  </h4>
                  <div className="review-resume">
                    <FileText size={24} className="review-resume-icon" />
                    <div>
                      <p className="review-resume-name">{formData.resume.split('/').pop()}</p>
                      <a 
                        href={formData.resume} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="review-resume-link"
                      >
                        View Resume
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {formData.coverLetter && (
                <div className="review-section">
                  <h4 className="review-section-title">
                    <FileText size={18} /> Cover Letter
                  </h4>
                  <p className="review-cover-letter">{formData.coverLetter}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Success */}
          {step === 'success' && (
            <div className="quick-apply-success">
              <div className="success-checkmark">
                <Check size={48} />
              </div>
              <h3 className="success-title">Application Submitted!</h3>
              <p className="success-message">
                Thank you for applying to <strong>{job.title}</strong> at <strong>{job.company}</strong>.
                We've received your application and will review it shortly.
              </p>
              <p className="success-note">
                You'll receive an email confirmation at <strong>{formData.personalInfo.email}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="quick-apply-footer">
          {step === 'form' && (
            <>
              <button type="button" onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} className="btn-primary">
                Continue to Review
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button 
                type="button" 
                onClick={() => setStep('form')} 
                className="btn-secondary"
                disabled={submitting}
              >
                Back to Edit
              </button>
              <button 
                type="button" 
                onClick={handleSubmit} 
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="btn-spinner" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button type="button" onClick={handleClose} className="btn-primary btn-full">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickApplyModal;