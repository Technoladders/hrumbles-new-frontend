import { useState, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSelector } from 'react-redux';
import { useLeaveApprovals } from "@/hooks/TimeManagement/leave-approvals/useLeaveApprovals";
import { PendingLeaveTable } from "@/components/TimeManagement/leave-approval/PendingLeaveTable";
import { RecentApprovalsTable } from "@/components/TimeManagement/leave-approval/RecentApprovalsTable";
import { LeaveApprovalActionDialog } from "@/components/TimeManagement/leave-approval/LeaveApprovalActionDialog";
import { LeaveRequest } from "@/types/leave-types";

const LeaveApproval = () => {
  const user = useSelector((state: any) => state.auth.user);
  const currentEmployeeId = user?.id || "";
  const { 
    pendingRequests, 
    recentApprovals, 
    isLoading,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelApprovedLeave,
    selectedRequest,
    setSelectedRequest
  } = useLeaveApprovals(currentEmployeeId);

  console.log("requests", pendingRequests);

  const [searchTerm, setSearchTerm] = useState("");
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | 'cancel'>('approve');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);

  const filteredPendingRequests = useMemo(() => {
    console.log('Filtering pending requests', { searchTerm, pendingRequests });
    return pendingRequests.filter(req => {
      const name = req.employee?.name || req.employee?.email || 'Unknown';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [pendingRequests, searchTerm]);

  const filteredRecentApprovals = useMemo(() => {
    return recentApprovals.filter(req => {
      const name = req.employee?.name || req.employee?.email || 'Unknown';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [recentApprovals, searchTerm]);

  const handleApproveClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDialogAction('approve');
    setIsActionDialogOpen(true);
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDialogAction('reject');
    setIsActionDialogOpen(true);
  };

  const handleCancelClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDialogAction('cancel');
    setIsActionDialogOpen(true);
  };

  const handleActionConfirm = (requestId: string, reason?: string) => {
    switch (dialogAction) {
      case 'approve':
        approveLeaveRequest(requestId);
        break;
      case 'reject':
        if (reason) {
          rejectLeaveRequest({ requestId, reason });
        }
        break;
      case 'cancel':
        if (reason) {
          cancelApprovedLeave({ requestId, reason });
        }
        break;
    }
    setIsActionDialogOpen(false);
  };

  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
        <p className="text-muted-foreground">
          Review and manage employee leave requests
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Requests</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search employees..."
                  className="w-[250px] pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <CardDescription>
            Leave requests awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingLeaveTable 
            requests={filteredPendingRequests} 
            isLoading={isLoading}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Approvals</CardTitle>
          <CardDescription>
            Recently approved or rejected leave requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentApprovalsTable 
            approvals={filteredRecentApprovals} 
            isLoading={isLoading}
            onCancel={handleCancelClick}
          />
        </CardContent>
      </Card>

      <LeaveApprovalActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        request={selectedRequest}
        actionType={dialogAction}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
};

export default LeaveApproval;