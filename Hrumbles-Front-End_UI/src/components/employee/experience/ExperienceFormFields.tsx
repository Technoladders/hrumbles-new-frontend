
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Experience } from "@/services/types/employee.types";

interface ExperienceFormFieldsProps {
  formData: Partial<Experience>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Experience>>>;
}

export const ExperienceFormFields: React.FC<ExperienceFormFieldsProps> = ({
  formData,
  handleInputChange,
  setFormData,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium">Job Title</label>
        <Input
          required
          name="jobTitle"
          value={formData.jobTitle}
          onChange={handleInputChange}
          placeholder="Enter job title"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Company</label>
        <Input
          required
          name="company"
          value={formData.company}
          onChange={handleInputChange}
          placeholder="Enter company name"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="Enter location"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Employment Type</label>
        <Select
          value={formData.employmentType}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, employmentType: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Full Time">Full Time</SelectItem>
            <SelectItem value="Part Time">Part Time</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
            <SelectItem value="Internship">Internship</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Start Date</label>
        <Input
          required
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label className="text-sm font-medium">End Date</label>
        <Input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};
