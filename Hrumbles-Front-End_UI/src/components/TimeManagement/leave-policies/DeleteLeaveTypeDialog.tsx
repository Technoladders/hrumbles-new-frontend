import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeaveType } from "@/types/leave-types";

interface DeleteLeaveTypeDialogProps {
  leaveType: LeaveType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function DeleteLeaveTypeDialog({
  leaveType,
  open,
  onOpenChange,
  onConfirm,
}: DeleteLeaveTypeDialogProps) {
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [checking, setChecking]           = useState(false);

  useEffect(() => {
    if (!open || !leaveType) return;
    setChecking(true);
    supabase
      .from("employee_leave_balances")
      .select("id", { count: "exact", head: true })
      .eq("leave_type_id", leaveType.id)
      .then(({ count }) => {
        setAffectedCount(count ?? 0);
        setChecking(false);
      });
  }, [open, leaveType]);

  if (!leaveType) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-rose-200 dark:border-rose-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            Delete leave policy?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-1">
            <p>
              You are about to permanently delete{" "}
              <span className="font-semibold text-foreground">"{leaveType.name}"</span>.
              This action cannot be undone.
            </p>

            {checking ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking impact…
              </div>
            ) : (
              affectedCount !== null && affectedCount > 0 && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-semibold">⚠ Impact warning</p>
                  <p>
                    <span className="font-semibold">{affectedCount} employee balance record{affectedCount !== 1 ? "s" : ""}</span>{" "}
                    will also be deleted. Leave history and ledger entries linked to this policy will be lost.
                  </p>
                </div>
              )
            )}

            <p className="text-sm text-muted-foreground">
              Consider <span className="font-medium">deactivating</span> this policy instead
              to preserve history.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => onConfirm(leaveType.id)}
          >
            Delete policy
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}