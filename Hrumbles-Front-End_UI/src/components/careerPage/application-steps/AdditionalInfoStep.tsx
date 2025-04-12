
import React from 'react';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Textarea } from '@/components/careerPage/ui/textarea';
import { CreditCard, Info } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/careerPage/ui/select";

interface AdditionalInfoStepProps {
  formData: {
    education: string;
    skills: string;
    noticePeriod: string;
    currentCTC: string;
    expectedCTC: string;
    referral: string;
    additionalInfo: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  errors: Record<string, string>;
  showValidationErrors: boolean;
}

const AdditionalInfoStep: React.FC<AdditionalInfoStepProps> = ({
  formData,
  handleInputChange,
  handleSelectChange,
  errors,
  showValidationErrors,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Additional Information
        </h3>
        <p className="text-sm text-gray-500">
          Help us get to know you better
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="education" className="text-sm font-medium">
            Education <span className="text-red-500">*</span>
          </Label>
          <Input
            id="education"
            name="education"
            value={formData.education}
            onChange={handleInputChange}
            placeholder="Highest degree, University, Year"
            className={showValidationErrors && errors.education ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.education && (
            <p className="text-sm text-red-500 mt-1">{errors.education}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="skills" className="text-sm font-medium">
            Key Skills <span className="text-red-500">*</span>
          </Label>
          <Input
            id="skills"
            name="skills"
            value={formData.skills}
            onChange={handleInputChange}
            placeholder="e.g., JavaScript, Project Management, Design"
            className={showValidationErrors && errors.skills ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.skills && (
            <p className="text-sm text-red-500 mt-1">{errors.skills}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="noticePeriod" className="text-sm font-medium">
            Notice Period
          </Label>
          <Select
            value={formData.noticePeriod}
            onValueChange={(value) => handleSelectChange('noticePeriod', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your notice period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="15 days">15 days</SelectItem>
              <SelectItem value="30 days">30 days</SelectItem>
              <SelectItem value="45 days">45 days</SelectItem>
              <SelectItem value="60 days">60 days</SelectItem>
              <SelectItem value="90 days">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentCTC" className="text-sm font-medium">
              Current CTC (LPA)
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="currentCTC"
                name="currentCTC"
                value={formData.currentCTC}
                onChange={handleInputChange}
                placeholder="e.g., 8.5 LPA"
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="expectedCTC" className="text-sm font-medium">
              Expected CTC (LPA)
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="expectedCTC"
                name="expectedCTC"
                value={formData.expectedCTC}
                onChange={handleInputChange}
                placeholder="e.g., 12 LPA"
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="referral" className="text-sm font-medium">
            How did you hear about us?
          </Label>
          <Input
            id="referral"
            name="referral"
            value={formData.referral}
            onChange={handleInputChange}
            placeholder="e.g., LinkedIn, Company Website, Referral"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="additionalInfo" className="text-sm font-medium">
            Anything else you'd like to share?
          </Label>
          <Textarea
            id="additionalInfo"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
            placeholder="Share any additional information that might be relevant..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoStep;
