
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { RegularizationTable } from "@/components/TimeManagement/regularization/RegularizationTable";
import { RegularizationDetails } from "@/components/TimeManagement/regularization/RegularizationDetails";
import { RegularizationActionDialog } from "@/components/TimeManagement/regularization/RegularizationActionDialog";
import { useRegularizationApproval } from "@/hooks/TimeManagement/regularization/useRegularizationApproval";

const RegularizationApproval = () => {
  const {
    searchTerm,
    setSearchTerm,
    filteredRequests,
    loading,
    activeTab,
    setActiveTab,
    detailsOpen,
    setDetailsOpen,
    actionDialogOpen,
    setActionDialogOpen,
    actionType,
    selectedRequest,
    approverNotes,
    setApproverNotes,
    handleViewDetails,
    openActionDialog,
    handleAction,
    getPendingCount,
    loadRequests
  } = useRegularizationApproval();

  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Regularization Requests
        </h1>
        <p className="text-muted-foreground">
          Review and approve employee timesheet regularization requests
        </p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending Requests
            {getPendingCount() > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {getPendingCount()}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {activeTab === "pending" ? "Pending Requests" : 
             activeTab === "approved" ? "Approved Requests" : "Rejected Requests"}
          </h2>
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
            <Button variant="outline" size="sm" onClick={loadRequests}>
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <RegularizationTable
              requests={filteredRequests}
              onViewDetails={handleViewDetails}
              showActions={true}
              onApprove={activeTab === "pending" ? (request) => openActionDialog(request, 'approve') : undefined}
              onReject={activeTab === "pending" ? (request) => openActionDialog(request, 'reject') : undefined}
            />
          </CardContent>
        </Card>
      </Tabs>

      <RegularizationDetails
        request={selectedRequest}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <RegularizationActionDialog 
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        actionType={actionType}
        approverNotes={approverNotes}
        onApproverNotesChange={setApproverNotes}
        onAction={handleAction}
      />
    </div>
  );
};

export default RegularizationApproval;
