
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const EventsList: React.FC = () => {
  return (
    <div className="relative h-[220px]">
      <ScrollArea className="h-full pr-4 -mr-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="w-full bg-white border border-gray-100 p-1.5 rounded-lg hover:border-[#1A73E8]/20 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
            >
              <div className="space-y-0.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="font-medium text-sm text-gray-800 truncate">
                        Team Sync {i + 1}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Team Sync {i + 1}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <div className="text-xs text-gray-500">10:00 AM</div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        Daily standup meeting with the development team to discuss progress in projects and address any blockers or concerns that team members might have
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        Daily standup meeting with the development team to discuss progress in projects and address any blockers or concerns that team members might have
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-2 text-xs text-[#1A73E8]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] flex-shrink-0" />
                  <span className="truncate">In Progress</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Subtle gradient to indicate more content */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
};
