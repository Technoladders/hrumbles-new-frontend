
import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Progress } from "@/lib/types";
import { fetchAllStatuses } from "@/services/statusService";
import { toast } from "sonner";

// Define types for status objects
export interface MainStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  display_order?: number;
  type: 'main';
  subStatuses?: SubStatus[];
}

export interface SubStatus {
  id: string;
  name: string;
  description?: string;
  color?: string;
  display_order?: number;
  type: 'sub';
  parent_id: string;
}

interface ProgressColumnProps {
  progress?: Progress;
  currentStatus?: string;
  mainStatus?: Partial<MainStatus> | null;
  subStatus?: Partial<SubStatus> | null;
}

// Get color for a stage based on status data
const getStageColor = (
  stage: MainStatus, 
  mainStatus?: Partial<MainStatus> | null
): string => {
  // If this is the current stage and has a custom color, use it
  if (mainStatus?.name === stage.name && mainStatus?.color) {
    return mainStatus.color;
  }
  
  // Otherwise use the stage's own color
  if (stage.color) {
    return stage.color;
  }
  
  // Default fallback colors if no custom color is provided
  const defaultColors: Record<string, string> = {
    'New': '#3b82f6',      // Blue
    'Processed': '#8b5cf6', // Purple
    'Interview': '#f59e0b', // Amber
    'Offered': '#10b981',  // Emerald
    'Joined': '#059669',   // Green
    'Rejected': '#D32F2F', // Red
    'Not Started': '#9CA3AF' // Gray
  };
  
  return defaultColors[stage.name] || '#9CA3AF';
};

export const ProgressColumn = ({ 
  progress, 
  currentStatus, 
  mainStatus, 
  subStatus 
}: ProgressColumnProps) => {
  const [allStatuses, setAllStatuses] = useState<MainStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all statuses from the database
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setLoading(true);
        const data = await fetchAllStatuses();
        // Ensure we have our 5-stage pipeline loaded and sorted correctly
        const pipelineOrder = ['New', 'Processed', 'Interview', 'Offered', 'Joined'];
        const sortedData = [...data].sort((a, b) => {
          const aIndex = pipelineOrder.indexOf(a.name);
          const bIndex = pipelineOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
        setAllStatuses(sortedData);
      } catch (error) {
        console.error("Error loading statuses:", error);
        toast.error("Failed to load status information");
      } finally {
        setLoading(false);
      }
    };

    loadStatuses();
  }, []);
  
  // Determine the current stage based on available data
  const getCurrentStage = (): string => {
    // If we have explicit main status, use that
    if (mainStatus?.name) {
      return mainStatus.name;
    }
    
    // Otherwise, determine from progress
    if (progress) {
      // Check each standard progress field in order
      const progressFields = ['joined', 'hired', 'offer', 'interview', 'screening'];
      for (const field of progressFields) {
        if (progress[field as keyof Progress]) {
          // Convert field name to proper stage name (capitalize first letter)
          return field.charAt(0).toUpperCase() + field.slice(1);
        }
      }
    }
    
    // Default if no data
    return 'Not Started';
  };
  
  const currentStage = getCurrentStage();

  // Format the display status text
  const getStatusDisplayText = (): string => {
    if (mainStatus && subStatus) {
      return `${mainStatus.name}${subStatus.name ? ` (${subStatus.name})` : ''}`;
    } else if (currentStatus) {
      return currentStatus;
    }
    return currentStage;
  };
  
  // Determine if a specific stage should be colored based on current progress
  const shouldColorStage = (stage: MainStatus): boolean => {
    if (!mainStatus) {
      // If no main status is provided, use progress
      if (progress) {
        return allStatuses.findIndex(s => s.name === stage.name) <= 
               allStatuses.findIndex(s => s.name === getCurrentStage());
      }
      return false;
    }
    
    // Find the index of the current main status in our stages array
    const currentMainStatusIndex = allStatuses.findIndex(s => s.name === mainStatus.name);
    const stageIndex = allStatuses.findIndex(s => s.name === stage.name);
    
    // If the stage is before or equal to the current main status, it should be colored
    return stageIndex <= currentMainStatusIndex;
  };
  
  // If still loading statuses, show minimal indicator
  if (loading) {
    return <div className="h-6 flex items-center"><div className="w-20 h-1 bg-gray-200 rounded animate-pulse"></div></div>;
  }

  // If no statuses are available, show a fallback
  if (allStatuses.length === 0) {
    return <div className="text-sm text-gray-500">Status information unavailable</div>;
  }

  return (
    <div className="flex flex-col gap-1 w-4">
      <div className="flex items-center gap-0.5">
        {allStatuses.map((stage, index) => {
          // Check if this stage corresponds to the current main status
          const isCurrentMainStage = mainStatus?.name === stage.name;
          // Check if this stage should be colored based on progress
          const shouldColor = shouldColorStage(stage);
          
          // Get color from stage
          const stageColor = getStageColor(stage, isCurrentMainStage ? mainStatus : null);

          return (
            <React.Fragment key={stage.id}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="group relative cursor-pointer transition-all duration-150">
                      <div
                        className="h-1.5 w-7 rounded-sm transition-all hover:opacity-80"
                        style={{ 
                          backgroundColor: shouldColor ? stageColor : "#e5e7eb",
                          height: isCurrentMainStage ? "8px" : "6px"
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-white border shadow-md p-2 rounded-md"
                    sideOffset={4}
                  >
                    <div className="text-xs whitespace-nowrap">
                      <div className="font-medium pb-1 border-b border-gray-100 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span 
                            className="inline-block w-2 h-2 rounded-full" 
                            style={{ backgroundColor: stageColor }}
                          ></span>
                          {stage.name}
                          {currentStage === stage.name && " (Current)"}
                        </span>
                      </div>
                      {isCurrentMainStage && stage.subStatuses && stage.subStatuses.length > 0 && (
                        <div className="text-gray-500 mt-1">
                          <div className="text-[10px] uppercase font-semibold mb-0.5">Current Sub-status:</div>
                          <div className="ml-1 flex items-center gap-1">
                            <span 
                              className="inline-block w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: subStatus?.color || stageColor }}
                            ></span>
                            <span>{subStatus?.name || "None"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < allStatuses.length - 1 && (
                <div className={`h-px w-1 ${
                  shouldColor && shouldColorStage(allStatuses[index + 1])
                    ? "bg-gray-400"
                    : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Current Stage Indicator */}
      <div className="flex items-center gap-1.5">
        <div 
          className="w-4 h-2 rounded-full flex-shrink-0 animate-pulse"
          style={{
            backgroundColor: subStatus?.color || mainStatus?.color || getStageColor({
              name: currentStage,
              type: 'main'
            } as MainStatus)
          }}
        />
        <span className="text-xs text-gray-600">
          <span className="font-medium">
            {getStatusDisplayText()}
          </span>
          {(currentStatus && !mainStatus) && (
            <>
              <span className="mx-1 text-gray-400">•</span>
              <span className="text-gray-500">{currentStatus}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};
