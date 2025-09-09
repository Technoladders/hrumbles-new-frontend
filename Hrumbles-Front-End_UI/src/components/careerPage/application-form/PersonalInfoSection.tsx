
import React from 'react';
import { FormSectionProps } from '@/types/application';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/careerPage/ui/select';
import { User, Mail, Phone, MapPin, Linkedin, Github, Calendar } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// Helper for formatting currency
const formatINR = (value: number): string => {
    if (!value) return '';
    return new Intl.NumberFormat("en-IN", { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
};


const PersonalInfoSection: React.FC<FormSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData };
    updatedFormData.personalInfo = {
      ...updatedFormData.personalInfo,
      [name]: value
    };
    updateFormData(updatedFormData);
  };

    const handlePhoneChange = (value: string | undefined) => {
    const updatedFormData = { ...formData };
    updatedFormData.personalInfo = { ...updatedFormData.personalInfo, phone: value || '' };
    updateFormData(updatedFormData);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ ...formData, [name]: value ? Number(value) : 0 });
  };

  const handleAvailabilityChange = (value: string) => {
    const updatedFormData = { ...formData };
    updatedFormData.personalInfo = {
      ...updatedFormData.personalInfo,
      availability: value
    };
    updateFormData(updatedFormData);
  };

  const splitFullName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
    
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    
    return { firstName, lastName };
  };

  const { firstName, lastName } = splitFullName(formData.personalInfo.fullName);

  const updateFullName = (field: 'firstName' | 'lastName', value: string) => {
    let newFullName = '';
    
    if (field === 'firstName') {
      newFullName = `${value} ${lastName}`.trim();
    } else {
      newFullName = `${firstName} ${value}`.trim();
    }
    
    const updatedFormData = { ...formData };
    updatedFormData.personalInfo = {
      ...updatedFormData.personalInfo,
      fullName: newFullName
    };
    updateFormData(updatedFormData);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
        <User className="h-5 w-5 text-blue-500" /> Personal Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="flex items-center gap-1">
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => updateFullName('firstName', e.target.value)}
            placeholder="John"
            className={showValidationErrors && !firstName ? "border-red-500" : ""}
          />
          {showValidationErrors && !firstName && (
            <p className="text-red-500 text-sm">First name is required</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName" className="flex items-center gap-1">
            Last Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => updateFullName('lastName', e.target.value)}
            placeholder="Doe"
            className={showValidationErrors && !lastName ? "border-red-500" : ""}
          />
          {showValidationErrors && !lastName && (
            <p className="text-red-500 text-sm">Last name is required</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1">
            Email <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.personalInfo.email}
              onChange={handleInputChange}
              placeholder="john.doe@example.com"
              className={`pl-10 ${showValidationErrors && !formData.personalInfo.email ? "border-red-500" : ""}`}
            />
          </div>
          {showValidationErrors && !formData.personalInfo.email && (
            <p className="text-red-500 text-sm">Email is required</p>
          )}
        </div>
        
        <div className="space-y-2">
        <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
        <PhoneInput
            international
            defaultCountry="IN"
            placeholder="Enter phone number"
            value={formData.personalInfo.phone}
            onChange={handlePhoneChange}
            className={`input-style-for-phone ${showValidationErrors && !formData.personalInfo.phone ? "border-red-500" : ""}`}
        />
        {showValidationErrors && !formData.personalInfo.phone && (
            <p className="text-red-500 text-sm">Phone number is required</p>
        )}
      </div>

      {/* Add Salary Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="currentSalary">Current CTC (per annum)</Label>
          <Input
            id="currentSalary"
            name="currentSalary"
            type="number"
            value={formData.currentSalary || ''}
            onChange={handleSalaryChange}
            placeholder="e.g., 1000000"
          />
          {formData.currentSalary > 0 && <p className="text-sm text-gray-500 mt-1">{formatINR(formData.currentSalary)}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedSalary">Expected CTC (per annum)</Label>
          <Input
            id="expectedSalary"
            name="expectedSalary"
            type="number"
            value={formData.expectedSalary || ''}
            onChange={handleSalaryChange}
            placeholder="e.g., 1200000"
          />
          {formData.expectedSalary > 0 && <p className="text-sm text-gray-500 mt-1">{formatINR(formData.expectedSalary)}</p>}
        </div>
      </div>
        
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-1">
            Place of Residence <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="location"
              name="location"
              value={formData.personalInfo.location}
              onChange={handleInputChange}
              placeholder="Enter City"
              className={`pl-10 ${showValidationErrors && !formData.personalInfo.location ? "border-red-500" : ""}`}
            />
          </div>
          {showValidationErrors && !formData.personalInfo.location && (
            <p className="text-red-500 text-sm">Location is required</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="availability" className="flex items-center gap-1">
            Availability <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
            <Select 
              value={formData.personalInfo.availability} 
              onValueChange={handleAvailabilityChange}
            >
              <SelectTrigger className={`pl-10 ${showValidationErrors && !formData.personalInfo.availability ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Immediate">Immediate</SelectItem>
                <SelectItem value="15 Days">15 Days</SelectItem>
                <SelectItem value="30 Days">30 Days</SelectItem>
                <SelectItem value="45 Days">45 Days</SelectItem>
                <SelectItem value="60 Days">60 Days</SelectItem>
                <SelectItem value="90 Days">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showValidationErrors && !formData.personalInfo.availability && (
            <p className="text-red-500 text-sm">Availability is required</p>
          )}
        </div>
        
        {/* <div className="space-y-2">
          <Label htmlFor="linkedin" className="flex items-center gap-1">
            LinkedIn Profile
          </Label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="linkedin"
              name="linkedin"
              value={formData.personalInfo.linkedin}
              onChange={handleInputChange}
              placeholder="linkedin.com/in/johndoe"
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="github" className="flex items-center gap-1">
            GitHub Profile
          </Label>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="github"
              name="github"
              value={formData.personalInfo.github}
              onChange={handleInputChange}
              placeholder="github.com/johndoe"
              className="pl-10"
            />
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default PersonalInfoSection;
