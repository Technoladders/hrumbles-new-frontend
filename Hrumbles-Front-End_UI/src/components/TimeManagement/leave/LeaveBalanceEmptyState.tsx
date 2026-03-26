import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { LeaveType } from "@/types/leave-types";

interface LeaveBalanceEmptyStateProps {
  currentEmployeeId?: string;
  leaveTypes?:        LeaveType[];
  /** Fixed: matches the mutateAsync signature from useEmployeeLeaveBalances */
  onInitializeBalances: () => void;
}

export function LeaveBalanceEmptyState({
  currentEmployeeId,
  leaveTypes,
  onInitializeBalances,
}: LeaveBalanceEmptyStateProps) {
  const canInitialize =
    !!currentEmployeeId && !!leaveTypes && leaveTypes.length > 0;

  return (
    <Card className="p-8 text-center border-dashed">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <CalendarDays className="w-8 h-8 opacity-40" />
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">No leave balances found</p>
          <p className="text-sm">
            Your leave balances haven't been set up yet for this year.
          </p>
        </div>
        {canInitialize && (
          <Button
            onClick={onInitializeBalances}   // ← correct: Leave.tsx passes () => void
            className="bg-primary/90 hover:bg-primary"
          >
            Initialise Leave Balances
          </Button>
        )}
      </div>
    </Card>
  );
}