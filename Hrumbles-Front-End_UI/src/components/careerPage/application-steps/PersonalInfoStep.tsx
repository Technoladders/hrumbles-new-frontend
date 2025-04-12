
import React from 'react';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/careerPage/ui/alert';
import { User } from 'lucide-react';

interface PersonalInfoStepProps {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  showValidationErrors: boolean;
  previousApplications: string[];
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  formData,
  handleInputChange,
  errors,
  showValidationErrors,
  previousApplications,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          Personal Information
        </h3>
        <p className="text-sm text-gray-500">
          Tell us about yourself so we can get in touch with you
        </p>
      </div>

      {previousApplications.includes(formData.email) && formData.email && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Duplicate Application</AlertTitle>
          <AlertDescription>
            You have already applied for this position with this email address.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-sm font-medium">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            className={showValidationErrors && errors.fullName ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.fullName && (
            <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="you@example.com"
            className={showValidationErrors && errors.email ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+91 9876543210"
            className={showValidationErrors && errors.phone ? "border-red-500" : ""}
          />
          {showValidationErrors && errors.phone && (
            <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">
            Current Location
          </Label>
          <Input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="City, State, India"
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;
