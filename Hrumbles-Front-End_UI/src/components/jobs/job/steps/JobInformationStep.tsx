// src/components/jobs/job/steps/JobInformationStep.tsx
import { useSelector } from "react-redux";
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
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

const TUP_ORG_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";

const JobInformationStep = ({ 
  data, 
  onChange, 
  jobType 
}: JobInformationStepProps) => {

  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const isTupOrg = organizationId === TUP_ORG_ID;

  const handleFieldChange = (field: keyof JobInformationData, value: any) => {
    onChange({ ...data, [field]: value });
  };

    // Logic to get 'Tomorrow' in Asia/Kolkata timezone
  const getMinDate = () => {
    const now = new Date();
    // Get current time in Kolkata
    const kolkataTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    // Add 1 day
    kolkataTime.setDate(kolkataTime.getDate() + 1);
    kolkataTime.setHours(0, 0, 0, 0);
    return kolkataTime;
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
            <Input 
              id="jobId" 
              placeholder="Enter job ID" 
              value={data.jobId || ""} 
              onChange={(e) => handleFieldChange('jobId', e.target.value)} 
              // DISABLE IF TUP ORG
              disabled={isTupOrg}
              className={isTupOrg ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
            />
            </div>
            {isTupOrg && (
            <div className="space-y-2">
              <Label>Job Due Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !data.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.dueDate ? format(new Date(data.dueDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.dueDate ? new Date(data.dueDate) : undefined}
                    onSelect={(date) => handleFieldChange('dueDate', date ? date.toISOString() : null)}
                    disabled={(date) => date < getMinDate()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {/* <p className="text-[10px] text-gray-400">Asia/Kolkata Timezone</p> */}
            </div>
          )}
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