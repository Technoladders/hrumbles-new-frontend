import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Clock, AlertCircle, Coffee, UtensilsCrossed, Timer, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface WorkTimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  status: string;
  pause_reason?: string;
  pause_start_time?: string;
  pause_end_time?: string;
  total_pause_duration_minutes?: number;
  excess_break_minutes?: number;
  missed_breaks?: string[];
  auto_stopped?: boolean;
  overtime_minutes?: number;
  regular_hours_completed?: boolean;
}

interface WorkTimeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkTimeEntry[];
}

export const WorkTimeHistoryModal: React.FC<WorkTimeHistoryModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  const [showOvertime, setShowOvertime] = useState(false);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "In progress";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const groupEntriesByDate = (entries: WorkTimeEntry[]) => {
    const grouped: { [key: string]: WorkTimeEntry[] } = {};
    entries.forEach(entry => {
      const date = format(new Date(entry.start_time), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    return grouped;
  };

  const getActivityColor = (entry: WorkTimeEntry) => {
    if (entry.pause_reason === 'Lunch Break') {
      return {
        border: 'border-l-[#FF9F43]',
        bg: 'bg-[#FFF4E9]',
        text: 'text-[#FF9F43]'
      };
    }
    if (entry.pause_reason === 'Coffee Break') {
      return {
        border: 'border-l-[#4CAF50]',
        bg: 'bg-[#F2FCE2]',
        text: 'text-[#4CAF50]'
      };
    }
    if (entry.overtime_minutes && entry.overtime_minutes > 0) {
      return {
        border: 'border-l-[#9B87F5]',
        bg: 'bg-[#F5F2FF]',
        text: 'text-[#9B87F5]'
      };
    }
    return {
      border: 'border-l-[#2C4D9E]',
      bg: 'bg-[#F0F4FF]',
      text: 'text-[#2C4D9E]'
    };
  };

  const getActivityIcon = (entry: WorkTimeEntry) => {
    if (entry.pause_reason === 'Lunch Break') return <UtensilsCrossed className="h-4 w-4" />;
    if (entry.pause_reason === 'Coffee Break') return <Coffee className="h-4 w-4" />;
    if (entry.overtime_minutes && entry.overtime_minutes > 0) return <Timer className="h-4 w-4" />;
    return <Briefcase className="h-4 w-4" />;
  };

  const getDailySummary = (dayEntries: WorkTimeEntry[]) => {
    const totalWorkMinutes = dayEntries.reduce((acc, entry) => 
      acc + (entry.duration_minutes || 0), 0);
    const totalBreakMinutes = dayEntries.reduce((acc, entry) => 
      acc + (entry.total_pause_duration_minutes || 0), 0);
    const totalOvertimeMinutes = dayEntries.reduce((acc, entry) => 
      acc + (entry.overtime_minutes || 0), 0);

    const targetMinutes = 8 * 60; // 8 hours in minutes (updated from 7)
    const remainingMinutes = Math.max(0, targetMinutes - totalWorkMinutes);
    
    // Calculate if overtime should be shown (only after 9 hours total)
    const shouldShowOvertime = (totalWorkMinutes + totalBreakMinutes) >= (9 * 60); // 9 hours in minutes

    return { totalWorkMinutes, totalBreakMinutes, totalOvertimeMinutes, remainingMinutes, shouldShowOvertime };
  };

  const groupedEntries = groupEntriesByDate(entries);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-3 bg-gradient-to-r from-[#30409F] to-[#4B5FBD] sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white" />
              <DialogTitle className="text-sm font-semibold text-white tracking-tight">
                Work Time History
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              {Object.values(groupedEntries).some(entries => 
                getDailySummary(entries).shouldShowOvertime
              ) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white">Show Overtime</span>
                  <Switch
                    checked={showOvertime}
                    onCheckedChange={setShowOvertime}
                  />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([date, dayEntries]) => {
              const { 
                totalWorkMinutes, 
                totalBreakMinutes, 
                totalOvertimeMinutes,
                remainingMinutes,
                shouldShowOvertime
              } = getDailySummary(dayEntries);

              return (
                <div key={date} className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>

                  <div className="bg-white p-4 rounded-lg border mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Daily Progress</span>
                        <span>{formatDuration(totalWorkMinutes)} / 8h 0m</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-[#2C4D9E] rounded-l"
                          style={{ width: `${(totalWorkMinutes / (8 * 60)) * 100}%` }}
                        />
                        <div 
                          className="bg-[#FF9F43]"
                          style={{ width: `${(totalBreakMinutes / (8 * 60)) * 100}%` }}
                        />
                        {showOvertime && shouldShowOvertime && (
                          <div 
                            className="bg-[#9B87F5] rounded-r"
                            style={{ width: `${(totalOvertimeMinutes / (8 * 60)) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-sm">
                          <div className="text-[#2C4D9E] font-medium">Work Time</div>
                          <div>{formatDuration(totalWorkMinutes)}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-[#FF9F43] font-medium">Break Time</div>
                          <div>{formatDuration(totalBreakMinutes)}</div>
                        </div>
                        {shouldShowOvertime && (
                          <div className="text-sm">
                            <div className="text-[#9B87F5] font-medium">Overtime</div>
                            <div>{formatDuration(totalOvertimeMinutes)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dayEntries.map(entry => {
                      const colors = getActivityColor(entry);
                      return (
                        <div
                          key={entry.id}
                          className={`border-l-4 ${colors.border} ${colors.bg} p-4 rounded-lg`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`${colors.text}`}>
                                  {getActivityIcon(entry)}
                                </span>
                                <span className="font-medium">
                                  {format(new Date(entry.start_time), 'h:mm a')}
                                  {entry.end_time && ` - ${format(new Date(entry.end_time), 'h:mm a')}`}
                                </span>
                                {entry.pause_reason && (
                                  <span className={`text-sm ${colors.text}`}>
                                    {entry.pause_reason}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Duration: {formatDuration(entry.duration_minutes)}
                                {entry.regular_hours_completed && (
                                  <span className="text-[#4BAE4F] ml-2">(Regular hours completed)</span>
                                )}
                              </div>
                              {entry.pause_reason && entry.total_pause_duration_minutes && (
                                <div className="text-sm text-gray-600">
                                  Break Duration: {formatDuration(entry.total_pause_duration_minutes)}
                                  {entry.excess_break_minutes && entry.excess_break_minutes > 0 && (
                                    <span className="text-[#FF5252] ml-2">
                                      (Excess: {entry.excess_break_minutes}m)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              entry.status === 'completed' 
                                ? 'bg-green-100 text-green-700'
                                : entry.status === 'running'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {entry.status}
                            </div>
                          </div>
                          
                          {entry.missed_breaks && entry.missed_breaks.length > 0 && (
                            <div className="mt-2 text-sm text-[#FFA726] flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Missed breaks: {entry.missed_breaks.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
