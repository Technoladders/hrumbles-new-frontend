import { LeaveBalanceCard } from "./LeaveBalanceCard";
import { LeaveBalanceLoadingSkeleton } from "./LeaveBalanceLoadingSkeleton";
import { LeaveBalanceEmptyState } from "./LeaveBalanceEmptyState";
import { EmployeeLeaveBalance, LeaveType } from "@/types/leave-types";

interface LeaveBalanceSectionProps {
  isLoading: boolean;
  leaveBalances: EmployeeLeaveBalance[];
  leaveTypes: LeaveType[] | undefined;
  currentEmployeeId: string;
  onInitializeBalances: () => void;
}

export function LeaveBalanceSection({
  isLoading,
  leaveBalances,
  leaveTypes,
  currentEmployeeId,
  onInitializeBalances
}: LeaveBalanceSectionProps) {
  if (isLoading) {
    return <LeaveBalanceLoadingSkeleton />;
  }

  if (leaveBalances.length === 0) {
    return (
      <LeaveBalanceEmptyState 
        currentEmployeeId={currentEmployeeId}
        leaveTypes={leaveTypes}
        onInitializeBalances={onInitializeBalances}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {leaveBalances.map(balance => (
        <LeaveBalanceCard key={balance.id} balance={balance} />
      ))}
    </div>
  );
}