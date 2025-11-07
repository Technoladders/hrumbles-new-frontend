// src/components/jobs/job/steps/ExternalJobDescriptionStep.tsx

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Define the shape of the data this component receives
interface JobDescriptionData {
  description: string;
}

interface ExternalJobDescriptionStepProps {
  data: Partial<JobDescriptionData>;
  onChange: (data: Partial<JobDescriptionData>) => void;
}

const ExternalJobDescriptionStep = ({ data, onChange }: ExternalJobDescriptionStepProps) => {
  const minChars = 100;
  // Use optional chaining (?.) and a fallback to prevent crashes if `data` is undefined
  const currentLength = data?.description?.length || 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Job Description</h3>
        <p className="text-sm text-gray-500">
          Provide a detailed description of the job responsibilities and requirements.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Job Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          placeholder="Enter job description (minimum 100 characters)"
          value={data?.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-[400px]" // A larger default height
        />
        <div className="flex justify-between text-xs">
          <span className={currentLength < minChars ? "text-red-500" : "text-green-600"}>
            {currentLength} characters (minimum {minChars})
          </span>
          {currentLength < minChars && (
            <span className="text-red-500">
              Please add {minChars - currentLength} more characters
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalJobDescriptionStep;