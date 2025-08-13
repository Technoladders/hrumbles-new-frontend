import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";
import rainbowLoader from "@/assets/animations/rainbowloader.json"; // Adjust path if needed
import { FaPersonCircleQuestion } from "react-icons/fa6";

interface Props {
  isValidated: boolean;
  candidateId: string;
  onValidate: (candidateId: string) => void;
  isLoading?: boolean;
  overallScore?: number;
}

export const AiValidateResumeButton = ({ isValidated, candidateId, onValidate, isLoading, overallScore }: Props) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Case 1: Show score bar if validated with score
  if (isValidated && typeof overallScore === 'number') {
    return (
      <div className="w-[100px]">
        <div className={`h-[20px] rounded-md ${getScoreColor(overallScore)} flex items-center justify-center text-sm font-semibold`}>
          {overallScore}/100
        </div>
      </div>
    );
  }

  // Case 2: Show Lottie loader full width when loading
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

  // Case 3: Show the validation button
  return (
    <div className="relative group flex items-center justify-center">
      <Button
        variant={isValidated ? "outline" : "outline1"}
        size={isValidated ? "sm" : "xs"}
        title="Click to validate"
        onClick={() => !isValidated && onValidate(candidateId)}
        disabled={isValidated}
        className="relative z-10"
      >
        <FaPersonCircleQuestion />
      </Button>

      {!isValidated && (
        <div className="absolute left-full ml-2">
          <span
            className="text-[10px] whitespace-nowrap font-medium transition-all duration-300 text-gray-500 group-hover:text-purple-600 animate-slideText group-hover:[text-shadow:0_0_6px_rgba(147,51,234,0.6)]"
          >
            Click to Validate
          </span>
        </div>
      )}
    </div>
  );
};