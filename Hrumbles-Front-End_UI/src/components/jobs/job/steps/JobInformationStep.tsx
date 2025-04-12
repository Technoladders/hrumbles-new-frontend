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

interface JobInformationData {
  hiringMode: string;
  jobId: string;
  jobTitle: string;
  numberOfCandidates: number;
  jobLocation: string[];
  noticePeriod?: string;
}

interface JobInformationStepProps {
  data: JobInformationData;
  onChange: (data: Partial<JobInformationData>) => void;
  jobType: "Internal" | "External";
}

const JobInformationStep = ({ 
  data, 
  onChange, 
  jobType 
}: JobInformationStepProps) => {
  // Ensure jobLocation is always an array even if it comes in as null or undefined
  const safeJobLocation = Array.isArray(data.jobLocation) ? data.jobLocation : [];

  // Handle location change with proper error handling
  const handleLocationChange = (locations: string[]) => {
    try {
      onChange({ jobLocation: locations });
    } catch (error) {
      console.error("Error updating job locations:", error);
      // Fallback to empty array to prevent UI from breaking
      onChange({ jobLocation: [] });
    }
  };
  console.log("data",data)

  // Get appropriate hiring mode options based on job type
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
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Job Information</h3>
        <p className="text-sm text-gray-500">
          Enter the basic information about the job posting.
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {jobType === "Internal" && (
          <div className="space-y-1">
            <Label htmlFor="hiringMode">Hiring Mode <span className="text-red-500">*</span></Label>
            <Select 
              value={data.hiringMode} 
              onValueChange={(value) => onChange({ hiringMode: value })}
            >
              <SelectTrigger id="hiringMode">
                <SelectValue placeholder="Select hiring mode" />
              </SelectTrigger>
              <SelectContent>
                {getHiringModeOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="jobId">Job ID <span className="text-red-500">*</span></Label>
          <Input
            id="jobId"
            placeholder="Enter job ID"
            value={data.jobId}
            onChange={(e) => onChange({ jobId: e.target.value })}
          />
        </div>
        
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="jobTitle">Job Title <span className="text-red-500">*</span></Label>
          <Input
            id="jobTitle"
            placeholder="Enter job title"
            value={data.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            maxLength={60}
          />
          <p className="text-xs text-gray-500">
            {data.jobTitle.length}/60 characters
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="numberOfCandidates">Number of Candidates <span className="text-red-500">*</span></Label>
          <Input
  id="numberOfCandidates"
  type="number"
  min={1}
  placeholder="Enter number of candidates"
  value={data.numberOfCandidates || ""} // Allow the field to be cleared
  onChange={(e) => {
    const value = parseInt(e.target.value);
    onChange({ numberOfCandidates: isNaN(value) ? 0 : value }); // Use 0 or the parsed value
  }}
/>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="noticePeriod">Notice Period</Label>
          <Select 
            value={data.noticePeriod || ""} // Ensure the value is not undefined
            onValueChange={(value) => onChange({ noticePeriod: value })}
          >
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
        
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="jobLocation">Job Location <span className="text-red-500">*</span></Label>
          <LocationSelector
            selectedLocations={safeJobLocation}
            onChange={handleLocationChange}
            placeholder="Select job locations"
          />
          <p className="text-xs text-gray-500">
          Multiple locations selectable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JobInformationStep;