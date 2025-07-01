
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

interface LeaveHeaderProps {
  onRefresh: () => void;
  onRequestLeave: () => void;
  isRefreshing: boolean;
  isDisabled: boolean;
}

export function LeaveHeader({
  onRefresh,
  onRequestLeave,
  isRefreshing,
  isDisabled
}: LeaveHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">
          Request and manage your leave
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing || isDisabled}
          className="gap-2 shadow-sm hover:bg-accent/50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button 
          className="gap-2 bg-primary/90 hover:bg-primary shadow-sm" 
          onClick={onRequestLeave}
          disabled={isDisabled}
        >
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>
    </div>
  );
}
