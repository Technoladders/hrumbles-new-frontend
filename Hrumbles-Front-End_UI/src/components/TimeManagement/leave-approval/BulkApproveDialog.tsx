import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { LeaveRequest } from "@/types/leave-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BulkApproveDialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  requests:      LeaveRequest[];
  approverId:    string;
  organization_id: string;
}

type RequestOutcome = "pending" | "processing" | "approved" | "failed";

interface RequestState {
  id:      string;
  outcome: RequestOutcome;
  error?:  string;
}

export function BulkApproveDialog({
  open,
  onOpenChange,
  requests,
  approverId,
  organization_id,
}: BulkApproveDialogProps) {
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning]       = useState(false);
  const [isDone, setIsDone]             = useState(false);
  const [states, setStates]             = useState<Map<string, RequestState>>(new Map());

  const allIds = requests.map((r) => r.id);

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === allIds.length ? new Set() : new Set(allIds)
    );
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selected = requests.filter((r) => selectedIds.has(r.id));

  const processedCount = [...states.values()].filter(
    (s) => s.outcome === "approved" || s.outcome === "failed"
  ).length;

  const successCount = [...states.values()].filter(
    (s) => s.outcome === "approved"
  ).length;

  const failedCount = [...states.values()].filter(
    (s) => s.outcome === "failed"
  ).length;

  const progress =
    selected.length > 0
      ? Math.round((processedCount / selected.length) * 100)
      : 0;

  const handleApprove = async () => {
    if (selected.length === 0) return;
    setIsRunning(true);
    setIsDone(false);

    // Initialise state map
    const initMap = new Map<string, RequestState>();
    selected.forEach((r) => initMap.set(r.id, { id: r.id, outcome: "pending" }));
    setStates(initMap);

    // Sequential processing — validate each before approving
    for (const req of selected) {
      setStates((prev) => {
        const next = new Map(prev);
        next.set(req.id, { id: req.id, outcome: "processing" });
        return next;
      });

      try {
        // 1. Validate (server-side, org-scoped)
        const { data: validation, error: valErr } = await supabase.rpc(
          "validate_leave_request",
          {
            p_employee_id:   req.employee_id,
            p_leave_type_id: req.leave_type_id,
            p_start_date:    req.start_date,
            p_end_date:      req.end_date,
            p_total_days:    req.working_days,
            p_org_id:        organization_id,
          }
        );

        if (valErr || !validation?.valid) {
          throw new Error(validation?.message ?? "Validation failed");
        }

        // 2. Approve
        const { error: updateErr } = await supabase
          .from("leave_requests")
          .update({
            status:       "approved",
            approved_by:  approverId,
            approved_at:  new Date().toISOString(),
          })
          .eq("id", req.id);

        if (updateErr) throw updateErr;

        setStates((prev) => {
          const next = new Map(prev);
          next.set(req.id, { id: req.id, outcome: "approved" });
          return next;
        });
      } catch (err: any) {
        setStates((prev) => {
          const next = new Map(prev);
          next.set(req.id, {
            id:      req.id,
            outcome: "failed",
            error:   err.message ?? "Unknown error",
          });
          return next;
        });
      }
    }

    setIsRunning(false);
    setIsDone(true);

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["pendingLeaveRequests"] });
    queryClient.invalidateQueries({ queryKey: ["recentLeaveApprovals"] });
    queryClient.invalidateQueries({ queryKey: ["employeeLeaveBalances"] });
    queryClient.invalidateQueries({ queryKey: ["leaveLedger"] });
  };

  const handleClose = () => {
    if (isRunning) return; // Can't close while processing
    setSelectedIds(new Set());
    setStates(new Map());
    setIsDone(false);
    onOpenChange(false);
  };

  const getStateIcon = (id: string) => {
    const s = states.get(id);
    if (!s || s.outcome === "pending")    return null;
    if (s.outcome === "processing")       return <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />;
    if (s.outcome === "approved")         return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s.outcome === "failed")           return <XCircle className="h-4 w-4 text-rose-500" />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-t-lg shrink-0">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Bulk Approve Leave Requests
          </DialogTitle>
          <DialogDescription className="text-emerald-200">
            Each request is validated server-side before approving. Failed validations are skipped.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar — shown while running */}
        {(isRunning || isDone) && (
          <div className="px-6 py-4 border-b space-y-2 shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isRunning ? "Processing…" : "Complete"}
              </span>
              <span>
                <span className="text-emerald-600 font-semibold">{successCount} approved</span>
                {failedCount > 0 && (
                  <span className="text-rose-600 font-semibold ml-2">{failedCount} failed</span>
                )}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {/* Select all header */}
          {!isRunning && !isDone && (
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Checkbox
                  checked={selectedIds.size === allIds.length && allIds.length > 0}
                  onCheckedChange={toggleAll}
                />
                {selectedIds.size === allIds.length
                  ? "Deselect all"
                  : `Select all (${allIds.length})`}
              </button>
              {selectedIds.size > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                  {selectedIds.size} selected
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-2">
            {requests.map((req) => {
              const state   = states.get(req.id);
              const isFailed = state?.outcome === "failed";
              const isApproved = state?.outcome === "approved";
              const empName = req.employee
                ? `${(req.employee as any).first_name ?? ""} ${(req.employee as any).last_name ?? ""}`.trim()
                : "Unknown";

              return (
                <div
                  key={req.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                    isApproved && "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20",
                    isFailed   && "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20",
                    !isApproved && !isFailed && selectedIds.has(req.id)
                      ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10"
                      : !isApproved && !isFailed ? "border-border" : ""
                  )}
                >
                  {/* Checkbox — only shown pre-run */}
                  {!isRunning && !isDone && (
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onCheckedChange={() => toggleOne(req.id)}
                    />
                  )}

                  {/* State icon — shown during/after run */}
                  {(isRunning || isDone) && (
                    <div className="w-5 flex items-center justify-center">
                      {getStateIcon(req.id) ?? (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{empName}</p>
                      {(req.employee as any)?.hr_departments?.name && (
                        <span className="text-xs text-muted-foreground">
                          · {(req.employee as any).hr_departments.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ background: req.leave_type?.color ?? "#6366f1" }}
                      />
                      {req.leave_type?.name} ·{" "}
                      {format(parseISO(req.start_date), "MMM d")}–
                      {format(parseISO(req.end_date),   "MMM d, yyyy")} ·{" "}
                      {req.working_days} working day{req.working_days !== 1 ? "s" : ""}
                    </p>
                    {/* Error message */}
                    {isFailed && state?.error && (
                      <p className="text-xs text-rose-600 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {state.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="px-6 py-4 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            {isDone ? "Close" : "Cancel"}
          </Button>
          {!isDone && (
            <Button
              onClick={handleApprove}
              disabled={selectedIds.size === 0 || isRunning}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving {processedCount + 1} of {selected.length}…
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Approve {selectedIds.size} request{selectedIds.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}