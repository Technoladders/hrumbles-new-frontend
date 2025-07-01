
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { EmployeeLeaveBalance } from "@/types/leave-types";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface LeaveBalanceCardProps {
  balance: EmployeeLeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const leaveType = balance.leave_type;
  const totalAllowance = balance.remaining_days + balance.used_days;
  const usagePercentage = totalAllowance > 0 
    ? (balance.used_days / totalAllowance) * 100 
    : 0;

  const baseColor = leaveType?.color || '#3b82f6';
  const gradientFrom = baseColor;
  const gradientTo = `${baseColor}80`; // Adding 80 for 50% opacity

  return (
    <Card 
      className={cn(
        "overflow-hidden border-none shadow-md transition-all hover:shadow-lg relative",
        "bg-gradient-to-br from-background/80 to-secondary/30",
        "backdrop-blur-sm"
      )}
    >
      <div 
        className="absolute inset-0 opacity-10 rounded-lg" 
        style={{ 
          backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` 
        }}
      />
      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: baseColor }}
          />
          <CardTitle className="text-lg">{leaveType?.name}</CardTitle>
        </div>
        <CardDescription>Leave balance</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold text-foreground">{balance.remaining_days} days</div>
        <p className="text-sm text-muted-foreground">Remaining for the year</p>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Used: {balance.used_days} days</span>
            <span>Total: {totalAllowance} days</span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2" 
            indicatorClassName="transition-all duration-500"
            style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
            indicatorStyle={{ 
              backgroundColor: baseColor,
              boxShadow: `0 2px 4px ${baseColor}40` 
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
