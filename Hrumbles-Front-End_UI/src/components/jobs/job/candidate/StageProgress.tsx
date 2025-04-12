
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StageProgressProps {
  stages: string[];
  currentStage: string;
}

const StageProgress = ({ stages, currentStage }: StageProgressProps) => {
  // Find the index of the current stage
  const currentIndex = stages.findIndex(stage => stage === currentStage);

  // Helper function to get a more readable stage name
  const getReadableStage = (stage: string): string => {
    // Convert camelCase to separate words (e.g., "InReview" to "In Review")
    return stage.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div className="flex items-center space-x-1">
      <TooltipProvider>
        {stages.map((stage, index) => {
          // Determine if this stage is complete, current, or upcoming
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          // Set the color based on stage status
          let dotColor = "bg-gray-200"; // Default color for upcoming stages
          if (isComplete) dotColor = "bg-blue-500";
          if (isCurrent) dotColor = "bg-amber-500";

          return (
            <React.Fragment key={stage}>
              {/* Stage dot with tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`${dotColor} rounded-full h-2.5 w-2.5 flex items-center justify-center cursor-pointer`}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-xs bg-gray-800 text-white">
                  {getReadableStage(stage)}
                </TooltipContent>
              </Tooltip>
              
              {/* Connecting line (don't add after the last stage) */}
              {index < stages.length - 1 && (
                <div 
                  className={`h-0.5 w-3 ${
                    index < currentIndex ? "bg-blue-500" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </TooltipProvider>
      
      {/* Current stage label below */}
      <div className="ml-2 text-xs text-gray-500">
        {getReadableStage(currentStage)}
      </div>
    </div>
  );
};

export default StageProgress;
