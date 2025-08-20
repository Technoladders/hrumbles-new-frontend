import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JobFormData } from '../hooks/useAiJobFormState';

// MODIFIED: Use the standardized interface
interface AiJobDescriptionStepProps {
  data: JobFormData['jobDescription'];
  onChange: (data: Partial<JobFormData['jobDescription']>) => void;
}

const AiJobDescriptionStep = ({ data, onChange }: AiJobDescriptionStepProps) => {
  const minLength = 100;
  const currentLength = data.description.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Job Description</h3>
        <p className="text-sm text-gray-500">
          Review and edit the full job description.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Job Description <span className="text-red-500">*</span></Label>
        <Textarea
          id="description"
          placeholder="Enter a detailed job description..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-[400px]"
        />
        <p className={`text-xs ${currentLength < minLength ? 'text-red-500' : 'text-gray-500'}`}>
          {currentLength} / {minLength} characters minimum
        </p>
      </div>
    </div>
  );
};

export default AiJobDescriptionStep;