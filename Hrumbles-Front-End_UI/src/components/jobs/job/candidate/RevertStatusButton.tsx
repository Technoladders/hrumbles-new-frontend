// src/components/jobs/job/candidate/RevertStatusButton.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/jobs/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getRevertableTimelineEntry,
  revertCandidateStatus,
} from '@/services/statusService';

interface RevertStatusButtonProps {
  candidateId: string;
  candidateName: string;
  jobId: string;
  currentSubStatusName: string;
  revertedByUserId: string;
  onRevertSuccess: () => void;
}

const RevertStatusButton: React.FC<RevertStatusButtonProps> = ({
  candidateId,
  candidateName,
  jobId,
  currentSubStatusName,
  revertedByUserId,
  onRevertSuccess,
}) => {
  const [revertableEntry, setRevertableEntry] = useState<{
    id: string;
    previousState: {
      mainStatusName: string; subStatusName: string;
      mainStatusId: string; subStatusId: string;
    } | null;
    newState: {
      mainStatusName: string; subStatusName: string;
      mainStatusId: string; subStatusId: string;
    };
  } | null | undefined>(undefined); // undefined = loading, null = nothing to revert

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isReverting, setIsReverting] = useState(false);

  const fetchEntry = useCallback(async () => {
    setRevertableEntry(undefined);
    const entry = await getRevertableTimelineEntry(candidateId);
    setRevertableEntry(entry);
  }, [candidateId, currentSubStatusName]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleRevert = async () => {
    if (!revertableEntry) return;
    setIsReverting(true);
    try {
      const result = await revertCandidateStatus(
        candidateId,
        jobId,
        revertedByUserId,
        reason.trim() || undefined
      );

      if (result.success) {
        toast.success(
          `Status reverted: "${result.revertedFrom?.subStatusName}" → "${result.revertedTo?.subStatusName}"`
        );
        setPopoverOpen(false);
        setReason('');
        onRevertSuccess();
      } else {
        toast.error(result.error ?? 'Revert failed. Please try again.');
      }
    } finally {
      setIsReverting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (revertableEntry === undefined) {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="h-7 w-7 rounded-full text-slate-300"
      >
        <RotateCcw className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // ── Nothing to revert ─────────────────────────────────────────────────────
  if (revertableEntry === null) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="h-7 w-7 rounded-full text-slate-300 cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>No previous status to revert to</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // ── Revert available ──────────────────────────────────────────────────────
  const fromLabel = revertableEntry.newState.subStatusName;
  const toLabel   = revertableEntry.previousState?.subStatusName ?? '—';

  return (
    // FIX: Popover > TooltipProvider > Tooltip > TooltipTrigger asChild >
    //       PopoverTrigger asChild > Button
    //
    // Both TooltipTrigger and PopoverTrigger use asChild which merges
    // their event handlers into the single Button DOM node.
    // The old code had PopoverTrigger asChild wrapping TooltipProvider
    // (a context node with no DOM element) so clicks were swallowed.
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-amber-500 hover:bg-amber-500 hover:text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Revert: {fromLabel} → {toLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        className="w-80 p-4 shadow-xl border border-amber-200 bg-white"
        side="left"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Revert Status</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Undo the last status change for{' '}
              <span className="font-medium text-gray-700">{candidateName}</span>.
            </p>
          </div>
        </div>

        {/* Status transition preview */}
        <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium truncate max-w-[110px]"
              title={fromLabel}
            >
              {fromLabel}
            </span>
            <span className="text-gray-400 flex-shrink-0">→</span>
            <span
              className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium truncate max-w-[110px]"
              title={toLabel}
            >
              {toLabel}
            </span>
          </div>
        </div>

        {/* Optional reason */}
        <div className="mb-4">
          <Label htmlFor="revert-reason" className="text-xs text-gray-600 mb-1 block">
            Reason <span className="text-gray-400">(optional)</span>
          </Label>
          <Textarea
            id="revert-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Status was set incorrectly"
            className="text-sm min-h-[64px] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setPopoverOpen(false); setReason(''); }}
            disabled={isReverting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleRevert}
            disabled={isReverting}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isReverting ? 'Reverting…' : 'Confirm Revert'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RevertStatusButton;