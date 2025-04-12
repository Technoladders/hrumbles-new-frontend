// components/jobs/candidate/ValidateResumeButton.tsx
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface ValidateResumeButtonProps {
  isValidated: boolean;
  candidateId: number;
  onValidate: (candidateId: number) => void;
}

const ValidateResumeButton = ({ isValidated, candidateId, onValidate }: ValidateResumeButtonProps) => {
  return (
    <Button
      variant={isValidated ? "outline" : "default"}
      size="sm"
      onClick={() => !isValidated && onValidate(candidateId)}
      disabled={isValidated}
    >
      {isValidated ? (
        <>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Validated
        </>
      ) : (
        "Validate"
      )}
    </Button>
  );
};

export default ValidateResumeButton;