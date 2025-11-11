import { create } from 'zustand';
import { TimeLog } from '@/types/time-tracker-types';

interface TimesheetState {
  submissionTarget: { timeLog: TimeLog, finalDurationMinutes: number } | null;
  isSubmissionModalOpen: boolean;
  refreshTracker: number; // <-- NEW: The refresh trigger
  openSubmissionModal: (timeLog: TimeLog, finalDurationMinutes: number) => void;
  closeSubmissionModal: () => void;
  triggerTrackerRefresh: () => void; // <-- NEW: The function to trigger a refresh
}

export const useTimesheetStore = create<TimesheetState>((set) => ({
  submissionTarget: null,
  isSubmissionModalOpen: false,
  refreshTracker: 0, // <-- Initialize
  openSubmissionModal: (timeLog, finalDurationMinutes) => set({ 
    submissionTarget: { timeLog, finalDurationMinutes },
    isSubmissionModalOpen: true 
  }),
  closeSubmissionModal: () => set({ 
    submissionTarget: null, 
    isSubmissionModalOpen: false 
  }),
  // --- NEW ---
  triggerTrackerRefresh: () => set((state) => ({ 
    refreshTracker: state.refreshTracker + 1 
  })),
}));