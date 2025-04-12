
import React from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkTimeStats } from "@/hooks/useWorkTimeStats";
import { format, isSameDay, isBefore, isAfter } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkTimeCardProps {
  employeeId: string;
}

export const WorkTimeCard: React.FC<WorkTimeCardProps> = ({ employeeId }) => {
  const { weeklyStats, totalWeeklyHours, isLoading } = useWorkTimeStats(employeeId);

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getHeightPercentage = (hours: number) => {
    const maxHours = Math.max(...weeklyStats.map(day => day.total), 8);
    return (hours / maxHours) * 100;
  };

  const getBarColor = (date: Date) => {
    const today = new Date();
    if (isSameDay(date, today)) {
      return "bg-white border border-gray-200";
    }
    if (isBefore(date, today)) {
      return "bg-black";
    }
    return "bg-transparent border border-gray-200";
  };

  if (isLoading) {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-[350px]">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-7 gap-1 h-[180px]">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg w-full h-full"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-[350px] flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-medium">Work Time this Week</h3>
          <div className="text-sm text-gray-500">
            Total: {formatHours(totalWeeklyHours)}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="grid grid-cols-7 gap-1 h-[200px]">
          {weeklyStats.map((day, i) => (
            <div key={i} className="flex flex-col h-full">
              <div className="flex-1 flex items-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-300 ${getBarColor(day.date)}`}
                        style={{
                          height: `${Math.max(getHeightPercentage(day.total), 5)}%`
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{format(day.date, 'EEEE, MMM d')}</p>
                        <p className="text-sm">
                          {day.total > 0 
                            ? `Worked: ${formatHours(day.total)}`
                            : isBefore(day.date, new Date())
                              ? 'No work recorded'
                              : 'Upcoming'
                          }
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-center text-xs text-gray-500 mt-2">
                {format(day.date, 'EEE')}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
