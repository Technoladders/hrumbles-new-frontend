
import { useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";

export interface TimesheetApprovalState {
  pendingTimesheets: TimeLog[];
  clarificationTimesheets: TimeLog[];
  approvedTimesheets: TimeLog[];
  loading: boolean;
  dialogTimesheet: TimeLog | null;
  dialogOpen: boolean;
  rejectionReason: string;
  
  setPendingTimesheets: (timesheets: TimeLog[]) => void;
  setClarificationTimesheets: (timesheets: TimeLog[]) => void;
  setApprovedTimesheets: (timesheets: TimeLog[]) => void;
  setLoading: (loading: boolean) => void;
  setDialogTimesheet: (timesheet: TimeLog | null) => void;
  setDialogOpen: (open: boolean) => void;
  setRejectionReason: (reason: string) => void;
}

export const useTimesheetApprovalState = (): TimesheetApprovalState => {
  const [pendingTimesheets, setPendingTimesheets] = useState<TimeLog[]>([]);
  const [clarificationTimesheets, setClarificationTimesheets] = useState<TimeLog[]>([]);
  const [approvedTimesheets, setApprovedTimesheets] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogTimesheet, setDialogTimesheet] = useState<TimeLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  return {
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    loading,
    dialogTimesheet,
    dialogOpen,
    rejectionReason,
    
    setPendingTimesheets,
    setClarificationTimesheets,
    setApprovedTimesheets,
    setLoading,
    setDialogTimesheet,
    setDialogOpen,
    setRejectionReason
  };
};
