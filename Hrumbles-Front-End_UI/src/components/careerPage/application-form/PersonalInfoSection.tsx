import React from 'react';
import { FormSectionProps } from '@/types/application';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/careerPage/ui/select';
import { User, Mail, MapPin, Calendar } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const PersonalInfoSection: React.FC<FormSectionProps> = ({ 
  formData, 
  updateFormData,
  errors,
  showValidationErrors
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({
      ...formData,
      personalInfo: { ...formData.personalInfo, [name]: value }
    });
  };

  const handlePhoneChange = (value: string | undefined) => {
    updateFormData({
      ...formData,
      personalInfo: { ...formData.personalInfo, phone: value || '' }
    });
  };

  const handleAvailabilityChange = (value: string) => {
    updateFormData({
      ...formData,
      personalInfo: { ...formData.personalInfo, availability: value }
    });
  };

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
    
    updateFormData({
      ...formData,
      personalInfo: { ...formData.personalInfo, fullName: newFullName }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
        <User className="h-5 w-5 text-blue-500" /> Personal Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => updateFullName('firstName', e.target.value)}
            placeholder="John"
            className={showValidationErrors && !firstName ? "border-red-500" : ""}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => updateFullName('lastName', e.target.value)}
            placeholder="Doe"
            className={showValidationErrors && !lastName ? "border-red-500" : ""}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
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
        </div>
        
        {/* Removed Mandatory Asterisk for Phone */}
        <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
                international
                defaultCountry="IN"
                placeholder="Enter phone number"
                value={formData.personalInfo.phone}
                onChange={handlePhoneChange}
                className="input-style-for-phone"
            />
        </div>

        {/* --- REMOVED SALARY FIELDS HERE --- */}

        {/* Removed Mandatory Asterisk for Location */}
        {/* <div className="space-y-2">
          <Label htmlFor="location">Place of Residence</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="location"
              name="location"
              value={formData.personalInfo.location}
              onChange={handleInputChange}
              placeholder="Enter City"
              className="pl-10"
            />
          </div>
        </div> */}
        
        {/* Removed Mandatory Asterisk for Availability */}
        <div className="space-y-2">
          <Label htmlFor="availability">Availability</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
            <Select value={formData.personalInfo.availability} onValueChange={handleAvailabilityChange}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Joining availability" />
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
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;