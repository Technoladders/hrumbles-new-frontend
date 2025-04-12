
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JobDescriptionData {
  description: string;
}

interface JobDescriptionStepProps {
  data: JobDescriptionData;
  onChange: (data: Partial<JobDescriptionData>) => void;
}

const JobDescriptionStep = ({ data, onChange }: JobDescriptionStepProps) => {
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ description: e.target.value });
  };
  
  // Calculate remaining characters
  const minCharacters = 100;
  const currentLength = data.description.length;
  const isValid = currentLength >= minCharacters;
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Job Description</h3>
        <p className="text-sm text-gray-500">
          Provide a detailed description of the job responsibilities and requirements.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">
            Job Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Enter job description (minimum 100 characters)"
            value={data.description}
            onChange={handleDescriptionChange}
            className="min-h-40"
          />
          <div className="flex justify-between text-xs">
            <span className={currentLength < minCharacters ? "text-red-500" : "text-green-600"}>
              {currentLength} characters (minimum {minCharacters})
            </span>
            {!isValid && (
              <span className="text-red-500">
                Please add {minCharacters - currentLength} more characters
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium mb-3">Tips for a good job description:</h4>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4">
            <li>Start with a brief overview of the position and your company</li>
            <li>Detail the key responsibilities of the role</li>
            <li>List required qualifications and skills</li>
            <li>Mention desired experience and education requirements</li>
            <li>Include information about the work environment and company culture</li>
            <li>Specify any unique benefits or perks of the position</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionStep;
