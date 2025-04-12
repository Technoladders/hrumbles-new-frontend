
import React from 'react';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Textarea } from '@/components/careerPage/ui/textarea';
import { Briefcase, FileText, Link, Github, Code } from 'lucide-react';
import { Button } from '@/components/careerPage/ui/button';

interface ProfessionalInfoStepProps {
  formData: {
    resume: File | null;
    coverLetter: string;
    linkedin: string;
    github: string;
    portfolio: string;
    experience: string;
    relevantExperience: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  showValidationErrors: boolean;
}

const ProfessionalInfoStep: React.FC<ProfessionalInfoStepProps> = ({
  formData,
  handleInputChange,
  handleFileChange,
  errors,
  showValidationErrors,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-500" />
          Professional Information
        </h3>
        <p className="text-sm text-gray-500">
          Share your work experience and professional background
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resume" className="text-sm font-medium">
            Resume/CV <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-col">
            <div className={`border rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors ${showValidationErrors && errors.resume ? "border-red-500" : ""}`}>
              <Input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="resume" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileText className="h-10 w-10 text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {formData.resume ? formData.resume.name : "Upload your resume"}
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF, DOC or DOCX (max 5MB)
                  </span>
                  <Button type="button" variant="outline" size="sm" className="mt-2">
                    Select File
                  </Button>
                </div>
              </label>
            </div>
            {showValidationErrors && errors.resume && (
              <p className="text-sm text-red-500 mt-1">{errors.resume}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="experience" className="text-sm font-medium">
            Years of Experience <span className="text-red-500">*</span>
          </Label>
          <Input
            id="experience"
            name="experience"
            value={formData.experience}
            onChange={handleInputChange}
            placeholder="e.g., 3"
            className={showValidationErrors && errors.experience ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.experience && (
            <p className="text-sm text-red-500 mt-1">{errors.experience}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="relevantExperience" className="text-sm font-medium">
            Relevant Experience <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="relevantExperience"
            name="relevantExperience"
            value={formData.relevantExperience}
            onChange={handleInputChange}
            placeholder="Describe your relevant experience for this position..."
            rows={4}
            className={showValidationErrors && errors.relevantExperience ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.relevantExperience && (
            <p className="text-sm text-red-500 mt-1">{errors.relevantExperience}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-sm font-medium">
            LinkedIn Profile
          </Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="linkedin"
              name="linkedin"
              value={formData.linkedin}
              onChange={handleInputChange}
              placeholder="linkedin.com/in/yourprofile"
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="github" className="text-sm font-medium">
            GitHub Profile
          </Label>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="github"
              name="github"
              value={formData.github}
              onChange={handleInputChange}
              placeholder="github.com/yourusername"
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="portfolio" className="text-sm font-medium">
            Portfolio/Website
          </Label>
          <div className="relative">
            <Code className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="portfolio"
              name="portfolio"
              value={formData.portfolio}
              onChange={handleInputChange}
              placeholder="https://your-website.com"
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="coverLetter" className="text-sm font-medium">
            Cover Letter
          </Label>
          <Textarea
            id="coverLetter"
            name="coverLetter"
            value={formData.coverLetter}
            onChange={handleInputChange}
            placeholder="Briefly describe why you're interested in this position..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfessionalInfoStep;
