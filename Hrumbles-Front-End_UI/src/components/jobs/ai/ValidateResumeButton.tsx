// =========================================================================
// ====== THIS IS THE COMPLETE AND FINAL CODE FOR ValidateResumeButton.tsx ======
// =========================================================================

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import Lottie from "lottie-react";
import rainbowLoader from "@/assets/animations/rainbowloader.json";
import { FaPersonCircleQuestion } from "react-icons/fa6";
import { updateCandidateStatus } from "@/services/statusService";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/jobs/ui/tooltip";

// Props interface remains the same
interface ValidateResumeButtonProps {
  isValidated: boolean;
  candidateId: number;
  onValidate: (candidateId: number, userId?: string) => void;
  isLoading?: boolean;
  overallScore?: number;
  subStatusId?: string;
}

// Your isTerminalStatus function remains the same
const isTerminalStatus = (statusId: string | undefined): boolean => {
  if (!statusId) return false;
  const terminalBGVStatusIds = [
    '922d42b8-5ddf-4aa2-8f9f-dd43d70ebf5a',
    'bf2c0e46-8ae7-4fea-b253-bfc0f2503828',
    'a6de2d0b-4b73-439f-9540-d555a1192e24',
    '49533ca9-8196-4250-abc0-648ebd7725e8',
    '886a545d-16b2-40fe-8e72-6907bb0bc4fa',
  ];
  return terminalBGVStatusIds.includes(statusId);
};

// NEW: This function creates the "3D" look with gradients and shadows
const getScoreStyles = (score: number): string => {
  if (score > 80) return 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 border border-emerald-300';
  if (score >= 75) return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 border border-amber-300';
  return 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/30 border border-rose-400';
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

  // Your handleValidate function remains exactly the same
  const handleValidate = async () => {
    if (isValidated || isTerminalStatus(subStatusId)) return;
    try {
      await onValidate(candidateId, userId);
      const nextStatusId = 'b921b145-1018-4654-a1ac-ff6d83ccf235';
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

  // --- THE UI LOGIC IS NOW CORRECTED BELOW ---

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="w-[100px] flex items-center justify-center">
        <Lottie
          animationData={rainbowLoader}
          loop
          style={{ height: 48, width: 48 }} // Made loader bigger to match score circle
        />
      </div>
    );
  }

  // 2. Validated with Score State (This is the 3D Circle)
  if (isValidated && overallScore !== undefined && overallScore !== null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div
              className={`flex items-center justify-center h-12 w-12 rounded-full font-bold text-xl transition-transform duration-200 hover:scale-110 ${getScoreStyles(overallScore)}`}
            >
              {overallScore}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Validation Score: {overallScore}/100</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 3. Default State (Click to Validate Button)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={handleValidate}
            disabled={isTerminalStatus(subStatusId)}
            className="h-9 w-9 bg-gray-700 hover:bg-gray-800 text-white"
          >
            <FaPersonCircleQuestion className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to Validate</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ValidateResumeButton;