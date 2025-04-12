
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";
import { useWorkTime } from "@/hooks/useWorkTime";
import { WorkTimeHistoryModal } from "../modals/WorkTimeHistoryModal";
import { PauseReasonModal } from "../modals/PauseReasonModal";
import { toast } from "sonner";
import { TimerDisplay } from "./time-tracker/TimerDisplay";
import { BreakStatus } from "./time-tracker/BreakStatus";
import { ControlButtons } from "./time-tracker/ControlButtons";
import { supabase } from "@/integrations/supabase/client";

interface TimeTrackerCardProps {
  employeeId: string;
}

export const TimeTrackerCard: React.FC<TimeTrackerCardProps> = ({ employeeId }) => {
  const {
    isLoading,
    activeSession,
    elapsedTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    formatTime,
  } = useWorkTime(employeeId);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [workTimeEntries, setWorkTimeEntries] = useState<any[]>([]);
  const [pauseDuration, setPauseDuration] = useState(0);

  const fetchWorkTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_employee_work_times')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setWorkTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching work time entries:', error);
      toast.error('Failed to load work history');
    }
  };

  useEffect(() => {
    fetchWorkTimeEntries();
  }, [employeeId]);

  // Refresh work time entries when active session changes
  useEffect(() => {
    if (activeSession) {
      fetchWorkTimeEntries();
    }
  }, [activeSession?.status]);

  const checkOfficeHours = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 10 && hours < 18;
  };

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'reset' | 'stop') => {
    if (isLoading) return;

    if (action === 'start' && !checkOfficeHours()) {
      toast.error("Work can only be started between 10 AM and 6 PM");
      return;
    }

    try {
      switch (action) {
        case 'start':
          await startTimer();
          break;
        case 'pause':
          setIsPauseModalOpen(true);
          break;
        case 'resume':
          await resumeTimer();
          setPauseDuration(0);
          break;
        case 'reset':
        case 'stop':
          await resetTimer();
          setPauseDuration(0);
          break;
      }
      await fetchWorkTimeEntries();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handlePauseReasonSelect = async (reason: string) => {
    try {
      await pauseTimer(reason);
      setPauseDuration(0);
      await fetchWorkTimeEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to start break");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession?.status === 'paused' && activeSession.pause_start_time) {
      interval = setInterval(() => {
        const pauseStart = new Date(activeSession.pause_start_time!).getTime();
        const currentTime = new Date().getTime();
        setPauseDuration(Math.floor((currentTime - pauseStart) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.status, activeSession?.pause_start_time]);

  return (
    <>
      <Card className="p-6 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-full flex flex-col justify-between relative">
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-4 right-4 hover:bg-brand-accent/10"
          onClick={() => setIsHistoryModalOpen(true)}
        >
          <List className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <h3 className="font-medium mb-6">Time Tracker</h3>
          
          <TimerDisplay
            elapsedTime={elapsedTime}
            status={activeSession?.status || null}
            formatTime={formatTime}
          />

          {activeSession?.status === 'paused' && (
            <BreakStatus
              pauseReason={activeSession.pause_reason}
              pauseDuration={pauseDuration}
              formatTime={formatTime}
            />
          )}
        </div>

        <ControlButtons
          activeSession={activeSession}
          isLoading={isLoading}
          checkOfficeHours={checkOfficeHours}
          onAction={handleAction}
        />
      </Card>

      <WorkTimeHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        entries={workTimeEntries}
      />

      <PauseReasonModal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        onSelectReason={handlePauseReasonSelect}
      />
    </>
  );
};
