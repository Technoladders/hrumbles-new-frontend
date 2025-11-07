// src/components/jobs/job/steps/JobInformationStep.tsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationSelector from "../LocationSelector";
// --- 1. IMPORT THE EXPERIENCE SELECTOR ---
import ExperienceSelector from "./experience-skills/ExperienceSelector";

// The interface now correctly includes all fields for this step
interface JobInformationData {
  hiringMode: string;
  jobId: string;
  jobTitle: string;
  numberOfCandidates: number;
  jobLocation: string[];
  noticePeriod: string;
  minimumYear: number;
  minimumMonth: number;
  maximumYear: number;
  maximumMonth: number;
}

interface JobInformationStepProps {
  data: Partial<JobInformationData>;
  onChange: (data: Partial<JobInformationData>) => void;
  jobType: "Internal" | "External";
}

const JobInformationStep = ({ 
  data, 
  onChange, 
  jobType 
}: JobInformationStepProps) => {

  const handleFieldChange = (field: keyof JobInformationData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const getHiringModeOptions = () => {
    if (jobType === "Internal") {
      return [
        { value: "Full Time", label: "Full-Time" },
        { value: "Contract", label: "Contract" },
        { value: "Part Time", label: "Part-Time" },
        { value: "Intern", label: "Intern" }
      ];
    }
    return [];
  };

  return (
    <div className="space-y-10">
      {/* --- Job Information Section --- */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg text-purple-600 font-medium">Job Information</h3>
          <p className="text-sm text-gray-500">
            Enter the basic information about the job posting.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label htmlFor="hiringMode">Hiring Mode <span className="text-red-500">*</span></Label>
            <Select 
              value={data.hiringMode || ""} 
              onValueChange={(value) => handleFieldChange('hiringMode', value)}
            >
              <SelectTrigger id="hiringMode"><SelectValue placeholder="Select hiring mode" /></SelectTrigger>
              <SelectContent>
                {getHiringModeOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID <span className="text-red-500">*</span></Label>
            <Input id="jobId" placeholder="Enter job ID" value={data.jobId || ""} onChange={(e) => handleFieldChange('jobId', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title <span className="text-red-500">*</span></Label>
            <Input id="jobTitle" placeholder="Enter job title" value={data.jobTitle || ""} onChange={(e) => handleFieldChange('jobTitle', e.target.value)} maxLength={60} />
            <p className="text-xs text-gray-500 text-right">{(data.jobTitle?.length || 0)}/60 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfCandidates">Number of Position <span className="text-red-500">*</span></Label>
            <Input id="numberOfCandidates" type="number" min={1} placeholder="Enter a number" value={data.numberOfCandidates || ""} onChange={(e) => handleFieldChange('numberOfCandidates', parseInt(e.target.value) || 1)} />
          </div>
            <div className="space-y-2">
            <Label htmlFor="noticePeriod">Notice Period</Label>
            <Select value={data.noticePeriod || ""} onValueChange={(value) => handleFieldChange('noticePeriod', value)}>
              <SelectTrigger id="noticePeriod">
                <SelectValue placeholder="Select notice period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Immediate">Immediate</SelectItem>
                <SelectItem value="15 Days">15 Days</SelectItem>
                <SelectItem value="30 Days">30 Days</SelectItem>
                <SelectItem value="45 Days">45 Days</SelectItem>
                <SelectItem value="90 Days">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobLocation">Job Location <span className="text-red-500">*</span></Label>
            <LocationSelector selectedLocations={data.jobLocation || []} onChange={(locations) => handleFieldChange('jobLocation', locations)} />
             <p className="text-xs text-gray-500">Multiple locations selectable.</p>
          </div>
        </div>
      </div>

      {/* --- FIX 2: THIS IS THE MISSING EXPERIENCE SECTION --- */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg text-purple-600 font-medium">Experience</h3>
          <p className="text-sm text-gray-500">
            Specify the required experience for this job.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExperienceSelector 
            label="Minimum Experience"
            yearsValue={data.minimumYear}
            monthsValue={data.minimumMonth}
            onYearChange={(year) => handleFieldChange('minimumYear', year)}
            onMonthChange={(month) => handleFieldChange('minimumMonth', month)}
          />
          <ExperienceSelector 
            label="Maximum Experience"
            yearsValue={data.maximumYear}
            monthsValue={data.maximumMonth}
            onYearChange={(year) => handleFieldChange('maximumYear', year)}
            onMonthChange={(month) => handleFieldChange('maximumMonth', month)}
            minYear={data.minimumYear}
            minMonth={data.minimumMonth}
          />
        </div>
      </div>
    </div>
  );
};

export default JobInformationStep;