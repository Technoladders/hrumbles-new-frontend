import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LeaveRequestTable } from "./LeaveRequestTable";
import { LeaveRequest } from "@/types/leave-types";

interface LeaveRequestsSectionProps {
  isLoading: boolean;
  leaveRequests: LeaveRequest[];
  onCancel: (request: LeaveRequest) => void;
  onViewDetails: (request: LeaveRequest) => void;
}

export function LeaveRequestsSection({
  isLoading,
  leaveRequests,
  onCancel,
  onViewDetails
}: LeaveRequestsSectionProps) {
  return (
    <Card className="mt-6 overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-background">
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>
          Your submitted leave requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <LeaveRequestTable 
            requests={leaveRequests} 
            onCancel={onCancel}
            onViewDetails={onViewDetails}
          />
        )}
      </CardContent>
    </Card>
  );
}