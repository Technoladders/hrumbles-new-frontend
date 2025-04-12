import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import ProgressScoreBar from "@/components/ui/ProgressScoreBar";
import Lottie from "lottie-react";
import rainbowLoader from "@/assets/animations/rainbowloader.json";

interface ValidateResumeButtonProps {
  isValidated: boolean;
  candidateId: number;
  onValidate: (candidateId: number, userId?: string) => void;
  isLoading?: boolean;
  overallScore?: number;
}

const ValidateResumeButton = ({
  isValidated,
  candidateId,
  onValidate,
  isLoading,
  overallScore,
}: ValidateResumeButtonProps) => {
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id || null;

  

  // ✅ Case 1: Show score bar if validated with score
  if (isValidated && overallScore !== undefined) {
    return (
      <div className="w-[100px]">
        <ProgressScoreBar
          score={overallScore}
          color="bg-purple text-white"
          showLabel
        />
      </div>
    );
  }

  // ✅ Case 2: Show Lottie loader full width when loading
  if (isLoading) {
    return (
      <div className="w-[100px] flex items-center justify-center">
        <Lottie
          animationData={rainbowLoader}
          loop
          style={{
            height: 20,
            width: 100,
            background: "transparent",
          }}
        />
      </div>
    );
  }

  // ✅ Case 3: Button (validated with no score OR not validated)
  return (
    <Button
      variant={isValidated ? "outline" : "default"}
      size="sm"
      onClick={() => !isValidated && onValidate(candidateId, userId)}
      disabled={isValidated}
      className={cn(
        "h-6 min-w-[100px] px-2 text-sm border-none",
        isValidated && "text-gray-600 bg-gray-100"
      )}
    >
      {isValidated ? "Validated" : "Validate"}
    </Button>
  );
};

export default ValidateResumeButton;
