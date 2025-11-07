// src/components/jobs/job/steps/ExternalJobInfoStep.tsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LocationSelector from "../LocationSelector";
import ExperienceSelector from "./experience-skills/ExperienceSelector";

// --- 1. Import BOTH of your existing components ---
import ClientInformationFields from "./client-details/ClientInformationFields"; 
import BudgetField from "./client-details/BudgetField"; // Add this import

// This interface combines all the fields for the step.
interface ExternalJobInfoData {
  clientName: string;
  pointOfContact: string;
  endClient: string;
  clientBudget: string;
  currency_type: string;
  budget_type: string;
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

const ExternalJobInfoStep = ({ data, onChange }: ExternalJobInfoStepProps) => {
  // This component now becomes much simpler. It just passes data down.
  const handleFieldChange = (field: keyof ExternalJobInfoData, value: any) => {
    onChange({ ...data, [field]: value });
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
          
          {/* Renders Client Name, End Client, and Point of Contact */}
          <ClientInformationFields
            data={data as any}
            onChange={onChange}
          />

          {/* --- 2. Use the existing BudgetField component here --- */}
          {/* It now correctly renders your custom budget input. */}
          {/* <div className="col-span-full">
            <BudgetField
              data={data as any}
              onChange={onChange}
            />
          </div> */}
        </div>
      </div>

      {/* --- Job Information Section (No changes) --- */}
      <div className="space-y-6">
         <div>
              <h3 className="text-lg text-purple-600 pfont-medium">Job Information</h3>
              <p className="text-sm text-gray-500">Enter the basic information about the job posting.</p>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jobId">Job ID <span className="text-red-500">*</span></Label>
                <Input id="jobId" value={data.jobId || ''} onChange={(e) => handleFieldChange('jobId', e.target.value)} />
              </div>
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
              <div className="space-y-2 col-span-2">
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