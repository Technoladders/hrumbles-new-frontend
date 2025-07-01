
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveType } from "@/types/leave-types";

interface LeaveBalanceEmptyStateProps {
  currentEmployeeId?: string;
  leaveTypes?: LeaveType[];
  onInitializeBalances: (params: { employeeId: string; leaveTypeIds: string[] }) => void;
}

export function LeaveBalanceEmptyState({
  currentEmployeeId,
  leaveTypes,
  onInitializeBalances
}: LeaveBalanceEmptyStateProps) {
  const handleInitialize = () => {
    if (currentEmployeeId && leaveTypes && leaveTypes.length > 0) {
      const leaveTypeIds = leaveTypes.map(type => type.id);
      onInitializeBalances({ employeeId: currentEmployeeId, leaveTypeIds });
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-background text-center p-8">
      <p className="text-muted-foreground mb-4">No leave balances found for this employee</p>
      {currentEmployeeId && leaveTypes && leaveTypes.length > 0 && (
        <Button 
          onClick={handleInitialize}
          className="bg-primary/90 hover:bg-primary"
        >
          Initialize Leave Balances
        </Button>
      )}
    </Card>
  );
}
