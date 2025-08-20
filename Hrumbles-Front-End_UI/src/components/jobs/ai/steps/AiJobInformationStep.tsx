// src/components/jobs/ai/steps/AiJobInformationStep.tsx

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LocationSelector from "@/components/jobs/job/LocationSelector"; // Reusable location component

interface JobInformationData {
  hiringMode: string;
  jobId: string;
  jobTitle: string;
  numberOfCandidates: number;
  jobLocation: string[];
  noticePeriod?: string;
}

interface AiJobInformationStepProps {
  data: JobInformationData;
  onChange: (data: Partial<JobInformationData>) => void;
}

const AiJobInformationStep = ({ data, onChange }: AiJobInformationStepProps) => {
  const safeJobLocation = Array.isArray(data.jobLocation) ? data.jobLocation : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Job Information</h3>
        <p className="text-sm text-gray-500">
          Review and complete the basic information about the job.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="hiringMode">Hiring Mode <span className="text-red-500">*</span></Label>
          <Select value={data.hiringMode} onValueChange={(value) => onChange({ hiringMode: value })}>
            <SelectTrigger id="hiringMode"><SelectValue placeholder="Select hiring mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Full Time">Full-Time</SelectItem>
              <SelectItem value="Contract">Contract</SelectItem>
              <SelectItem value="Part Time">Part-Time</SelectItem>
              <SelectItem value="Intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobId">Job ID <span className="text-red-500">*</span></Label>
          <Input id="jobId" placeholder="Enter a unique job ID" value={data.jobId} onChange={(e) => onChange({ jobId: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title <span className="text-red-500">*</span></Label>
          <Input id="jobTitle" placeholder="Enter job title" value={data.jobTitle} onChange={(e) => onChange({ jobTitle: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numCandidates">Number of Openings <span className="text-red-500">*</span></Label>
          <Input id="numCandidates" type="number" min={1} value={data.numberOfCandidates} onChange={(e) => onChange({ numberOfCandidates: parseInt(e.target.value, 10) || 1 })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="noticePeriod">Notice Period</Label>
          <Select value={data.noticePeriod || ""} onValueChange={(value) => onChange({ noticePeriod: value })}>
            <SelectTrigger id="noticePeriod"><SelectValue placeholder="Select notice period" /></SelectTrigger>
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
          <LocationSelector selectedLocations={safeJobLocation} onChange={(locations) => onChange({ jobLocation: locations })} placeholder="Select job locations" />
        </div>
      </div>
    </div>
  );
};

export default AiJobInformationStep;
// 