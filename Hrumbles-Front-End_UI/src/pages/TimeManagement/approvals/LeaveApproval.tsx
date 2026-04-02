import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckSquare, Search } from "lucide-react";
import { useLeaveApprovals }         from "@/hooks/TimeManagement/leave-approvals/useLeaveApprovals";
import { PendingLeaveTable }          from "@/components/TimeManagement/leave-approval/PendingLeaveTable";
import { RecentApprovalsTable }       from "@/components/TimeManagement/leave-approval/RecentApprovalsTable";
import { LeaveApprovalActionDialog }  from "@/components/TimeManagement/leave-approval/LeaveApprovalActionDialog";
import { BulkApproveDialog }          from "@/components/TimeManagement/leave-approval/BulkApproveDialog";
import { LeaveRequest }               from "@/types/leave-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

const LeaveApproval = () => {
  const user              = useSelector((state: any) => state.auth.user);
  const currentEmployeeId = user?.id ?? "";
  const authData          = getAuthDataFromLocalStorage();
  const organization_id   = authData?.organization_id as string ?? "";

  const {
    pendingRequests,
    recentApprovals,
    isLoading,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelApprovedLeave,
    selectedRequest,
    setSelectedRequest,
  } = useLeaveApprovals(currentEmployeeId);

  const [searchTerm, setSearchTerm]           = useState("");
  const [dialogAction, setDialogAction]       = useState<"approve" | "reject" | "cancel">("approve");
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen]     = useState(false);
  const [selectedBulkIds, setSelectedBulkIds]       = useState<Set<string>>(new Set());

  const filteredPending = useMemo(() =>
    pendingRequests.filter((r) => {
      const emp = r.employee as any;
      const name = emp
        ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.toLowerCase()
        : "";
      return !searchTerm || name.includes(searchTerm.toLowerCase());
    }),
    [pendingRequests, searchTerm]
  );

  const handleApproveClick = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setDialogAction("approve");
    setIsActionDialogOpen(true);
  };

  const handleRejectClick = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setDialogAction("reject");
    setIsActionDialogOpen(true);
  };

  const handleCancelClick = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setDialogAction("cancel");
    setIsActionDialogOpen(true);
  };

  const handleActionConfirm = (requestId: string, reason?: string) => {
    switch (dialogAction) {
      case "approve": approveLeaveRequest(requestId); break;
      case "reject":  reason && rejectLeaveRequest({ requestId, reason }); break;
      case "cancel":  reason && cancelApprovedLeave({ requestId, reason }); break;
    }
    setIsActionDialogOpen(false);
  };

  const toggleBulkId = (id: string) => {
    setSelectedBulkIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Requests available for bulk (filtered by search)
  const bulkCandidates = filteredPending;

  return (
    <div className="content-area space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage employee leave requests.
          </p>
        </div>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Pending Requests
                {filteredPending.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">
                    {filteredPending.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Leave requests awaiting approval</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-52 pl-8 h-9"
                  placeholder="Search employees…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredPending.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => setIsBulkDialogOpen(true)}
                >
                  <CheckSquare className="h-4 w-4" />
                  Bulk Approve
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <PendingLeaveTable
            requests={filteredPending}
            isLoading={isLoading}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
          />
        </CardContent>
      </Card>

      {/* Recent approvals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Recently approved, rejected, or cancelled leave requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentApprovalsTable
            approvals={recentApprovals}
            isLoading={isLoading}
            onCancel={handleCancelClick}
          />
        </CardContent>
      </Card>

      {/* Action dialog (single) */}
      <LeaveApprovalActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        request={selectedRequest}
        actionType={dialogAction}
        onConfirm={handleActionConfirm}
      />

      {/* Bulk approve dialog */}
      <BulkApproveDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        requests={bulkCandidates}
        approverId={currentEmployeeId}
        organization_id={organization_id}
      />
    </div>
  );
};

export default LeaveApproval;