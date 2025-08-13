import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import Lottie from "lottie-react";
import rainbowLoader from "@/assets/animations/rainbowloader.json";
import { FaPersonCircleQuestion } from "react-icons/fa6";
import { updateCandidateStatus } from "@/services/statusService";
import { toast } from "sonner";

interface ValidateResumeButtonProps {
  isValidated: boolean;
  candidateId: number;
  onValidate: (candidateId: number, userId?: string) => void;
  isLoading?: boolean;
  overallScore?: number;
  subStatusId?: string; // Optional: Current sub-status ID for BGV workflow
}

const isTerminalStatus = (statusId: string | undefined, statuses: any[]): boolean => {
  if (!statusId) return false;
  const terminalBGVStatusIds = [
    '922d42b8-5ddf-4aa2-8f9f-dd43d70ebf5a', // All Checks Clear
    'bf2c0e46-8ae7-4fea-b253-bfc0f2503828', // Minor Discrepancy
    'a6de2d0b-4b73-439f-9540-d555a1192e24', // Major Discrepancy
    '49533ca9-8196-4250-abc0-648ebd7725e8', // Verification Not Required
    '886a545d-16b2-40fe-8e72-6907bb0bc4fa', // Candidate Withdrawn
  ];
  return terminalBGVStatusIds.includes(statusId);
};

export const ValidateResumeButton = ({
  isValidated,
  candidateId,
  onValidate,
  isLoading,
  overallScore,
  subStatusId,
}: ValidateResumeButtonProps) => {
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id || null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleValidate = async () => {
    if (isValidated || isTerminalStatus(subStatusId, [])) return;
    try {
      // Call onValidate (e.g., for AI validation)
      await onValidate(candidateId, userId);
      // Update status to Documents Submitted or Verification Started
      const nextStatusId = 'b921b145-1018-4654-a1ac-ff6d83ccf235'; // Documents Submitted
      const success = await updateCandidateStatus(candidateId.toString(), nextStatusId, userId);
      if (success) {
        toast.success("Resume validated and status updated");
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error validating resume:", error);
      toast.error("Failed to validate resume");
    }
  };

  // Case 1: Show score bar if validated with score
  if (isValidated && overallScore !== undefined) {
    return (
      <div className="w-[100px]">
        <div
          className={cn(
            "h-[20px] rounded-md flex items-center justify-center text-sm font-semibold",
            getScoreColor(overallScore)
          )}
        >
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

  // Case 3: Button (validated with no score OR not validated)
  return (
    <div className="relative group flex items-center justify-center">
      <Button
        variant={isValidated || isTerminalStatus(subStatusId, []) ? "outline" : "default"}
        size={isValidated ? "sm" : "xs"}
        onClick={handleValidate}
        disabled={isValidated || isTerminalStatus(subStatusId, [])}
        className={cn("relative z-10", isValidated ? "border-gray-300" : "bg-purple-600 text-white")}
        title={isValidated ? "Resume already validated" : "Click to validate"}
      >
        <FaPersonCircleQuestion className="h-4 w-4" />
      </Button>
      {!isValidated && !isTerminalStatus(subStatusId, []) && (
        <div className="absolute left-full ml-2">
          <span
            className={cn(
              "text-[10px] whitespace-nowrap font-medium transition-all duration-300",
              "text-gray-500 group-hover:text-purple-600",
              "animate-slideText group-hover:[text-shadow:0_0_6px_rgba(147,51,234,0.6)]"
            )}
          >
            Click to Validate
          </span>
        </div>
      )}
    </div>
  );
};

export default ValidateResumeButton;