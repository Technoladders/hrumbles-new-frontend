import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import ProgressScoreBar from "@/components/ui/ProgressScoreBar";
import Lottie from "lottie-react";
import rainbowLoader from "@/assets/animations/rainbowloader.json";
// import AIloader from "@/assets/animations/ai_loader.json"
import { FaPersonCircleQuestion } from "react-icons/fa6";
import { ArrowRight } from "lucide-react";
 
<ArrowRight className="mr-1 w-3 h-3 animate-bounce" />
 
 
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
  
 
  const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};
 
 
 
  // ✅ Case 1: Show score bar if validated with score
  if (isValidated && overallScore !== undefined) {
    return (
      <div className="w-[100px]">
        {/* <ProgressScoreBar
          score={overallScore}
          color="bg-purple text-white"
          showLabel
        /> */}
       <div className={`h-[20px] rounded-md ${getScoreColor(overallScore)}  flex items-center justify-center text-sm font-semibold`}>
  {overallScore}/100
</div>
 
 
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
<div className="relative group flex items-center justify-center">
  <Button
    variant={isValidated ? "outline" : "outline1"}
    size={isValidated ? "sm" : "xs"}
    // title="Click to validate"
    onClick={() => !isValidated && onValidate(candidateId, userId)}
    disabled={isValidated}
    className="relative z-10"
  >
    <FaPersonCircleQuestion />
  </Button>
 
  {/* AI Tip on Hover */}
  {!isValidated && (
  <div className="absolute left-full ml-2">
    <span
      className="text-[10px] whitespace-nowrap font-medium transition-all duration-300
        text-gray-500 group-hover:text-purple-600
        animate-slideText group-hover:[text-shadow:0_0_6px_rgba(147,51,234,0.6)]"
    >
      Click to Validate
    </span>
  </div>
)}
 
</div>
 
 
 
 
 
  );
};
 
export default ValidateResumeButton;