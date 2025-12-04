// src/components/jobs/job/steps/ExternalJobInfoStep.tsx
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LocationSelector from "../LocationSelector";
import ExperienceSelector from "./experience-skills/ExperienceSelector";
import ClientInformationFields from "./client-details/ClientInformationFields"; 
import BudgetField from "./client-details/BudgetField";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar"; // Ensure you have this shadcn component
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils"

// The interface is updated to include hiringMode
interface ExternalJobInfoData {
  clientName: string;
  pointOfContact: string;
  endClient: string;
  clientBudget: string;
  currency_type: string;
  budget_type: string;
  hiringMode: string; // <-- ADDED
  jobId: string;
  jobTitle: string;
  numberOfCandidates: number;
  noticePeriod: string;
  jobLocation: string[];
  minimumYear: number;
  minimumMonth: number;
  maximumYear: number;
  maximumMonth: number;
}

interface ExternalJobInfoStepProps {
  data: Partial<ExternalJobInfoData>;
  onChange: (data: Partial<ExternalJobInfoData>) => void;
}

const TUP_ORG_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";

const ExternalJobInfoStep = ({ data, onChange }: ExternalJobInfoStepProps) => {

  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const isTupOrg = organizationId === TUP_ORG_ID;

  const handleFieldChange = (field: keyof ExternalJobInfoData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Options for the new Hiring Mode dropdown
  const getHiringModeOptions = () => {
    return [
      { value: "Full Time", label: "Full-Time" },
      { value: "Contract", label: "Contract" },
      { value: "Part Time", label: "Part-Time" },
      { value: "Intern", label: "Intern" }
    ];
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

  return (
    <div className="space-y-10">
      
      {/* --- Client Details Section --- */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg text-purple-600 font-medium">Client Details</h3>
          <p className="text-sm text-gray-500">Enter details about the client for this job posting.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClientInformationFields
            data={data as any}
            onChange={onChange}
          />
        </div>
      </div>

      {/* --- Job Information Section --- */}
      <div className="space-y-6">
         <div>
              <h3 className="text-lg text-purple-600 font-medium">Job Information</h3>
              <p className="text-sm text-gray-500">Enter the basic information about the job posting.</p>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* --- NEW HIRING MODE FIELD --- */}
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
              {/* --- END NEW HIRING MODE FIELD --- */}
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

               {/* NEW DUE DATE PICKER - ONLY FOR TUP ORG */}
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
                <Input id="jobTitle" value={data.jobTitle || ''} onChange={(e) => handleFieldChange('jobTitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfCandidates">Number of Position <span className="text-red-500">*</span></Label>
                <Input id="numberOfCandidates" type="number" value={data.numberOfCandidates || 1} onChange={(e) => handleFieldChange('numberOfCandidates', parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Select value={data.noticePeriod || ''} onValueChange={(value) => handleFieldChange('noticePeriod', value)}>
                    <SelectTrigger><SelectValue placeholder="Select notice period" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Immediate">Immediate</SelectItem>
                        <SelectItem value="15 Days">15 Days</SelectItem>
                        <SelectItem value="30 Days">30 Days</SelectItem>
                        <SelectItem value="45 Days">45 Days</SelectItem>
                        <SelectItem value="90 Days">90 Days</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 ">
                <Label htmlFor="jobLocation">Job Location <span className="text-red-500">*</span></Label>
                <LocationSelector selectedLocations={data.jobLocation || []} onChange={(locations) => handleFieldChange('jobLocation', locations)} />
              </div>

               <div className="space-y-2 col-span-2">
                <BudgetField
                  data={data as any}
                  onChange={onChange}
                />
              </div>
         </div>
      </div>
      
      {/* --- Experience Section (No changes) --- */}
      <div className="space-y-6">
         <div>
            <h3 className="text-lg text-purple-600 font-medium">Experience</h3>
            <p className="text-sm text-gray-500">Specify the required experience for this job.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExperienceSelector label="Minimum Experience" yearsValue={data.minimumYear} monthsValue={data.minimumMonth} onYearChange={(year) => handleFieldChange('minimumYear', year)} onMonthChange={(month) => handleFieldChange('minimumMonth', month)} />
            <ExperienceSelector label="Maximum Experience" yearsValue={data.maximumYear} monthsValue={data.maximumMonth} onYearChange={(year) => handleFieldChange('maximumYear', year)} onMonthChange={(month) => handleFieldChange('maximumMonth', month)} />
         </div>
      </div>

    </div>
  );
};

export default ExternalJobInfoStep;