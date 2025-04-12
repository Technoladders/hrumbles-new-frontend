
import React from "react";
import { Input } from "@/components/ui/input";
import { ExperienceData } from "../types/ExperienceTypes";

interface ExperienceFormProps {
  formData: ExperienceData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ExperienceForm: React.FC<ExperienceFormProps> = ({
  formData,
  handleInputChange,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          Job Title
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          name="jobTitle"
          value={formData.jobTitle}
          onChange={handleInputChange}
          placeholder="Enter job title"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          Company Name
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          name="company"
          value={formData.company}
          onChange={handleInputChange}
          placeholder="Enter company name"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          Location
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="Enter location"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          Employment Type
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          name="employmentType"
          value={formData.employmentType}
          onChange={handleInputChange}
          placeholder="Select employment type"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          Start Date
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleInputChange}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[rgba(48,48,48,1)]">
          End Date
          <span className="text-[rgba(221,1,1,1)]">*</span>
        </label>
        <Input
          required
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleInputChange}
          className="mt-1"
        />
      </div>
    </div>
  );
};
