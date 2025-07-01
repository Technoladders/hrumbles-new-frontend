import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimesheetList from "./components/TimesheetList";
import TimesheetDialog from "./components/TimesheetDialog";
import { useTimesheetApproval } from "./hooks/useTimesheetApproval"; 
import { toast } from "sonner";

const TimesheetApproval = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const {
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    loading,
    dialogTimesheet,
    dialogOpen,
    setDialogOpen,
    handleApprove,
    handleRequestClarification,
    fetchTimesheets,
    getPendingCount,
    openDialog,
  } = useTimesheetApproval();

  // Mock departments and employees (replace with API calls in production)
  const departments = Array.from(
    new Set(pendingTimesheets.map((t) => t.employee?.department?.name).filter(Boolean))
  ).concat("all");
  const employees = Array.from(
    new Set(
      pendingTimesheets.map(
        (t) => `${t.employee?.first_name} ${t.employee?.last_name}`
      )
    )
  ).concat("all");

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimesheets();
    setIsRefreshing(false);
    toast("Timesheet data refreshed");
  };

  // Filter pending timesheets
  const filteredPendingTimesheets = pendingTimesheets.filter((timesheet) => {
    const employeeName = `${timesheet.employee?.first_name} ${timesheet.employee?.last_name}`;
    return (
      (statusFilter === "all" || timesheet.status === statusFilter) &&
      (departmentFilter === "all" || timesheet.employee?.department?.name === departmentFilter) &&
      (employeeFilter === "all" || employeeName === employeeFilter)
    );
  });

  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Timesheet Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve employee timesheets
        </p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="relative">
            Pending Approvals
            {getPendingCount() > 0 && (
              <span className="ml-2 bg-primary absolute -top-2 -right-2 rounded-full px-2 py-1 text-xs text-white">
                {getPendingCount()}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="clarification">Clarifications</TabsTrigger>
          <TabsTrigger value="history">Approval History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <div className="grid gap-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold">Pending Approvals</h2>
              <div className="flex gap-2 items-center flex-wrap">
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="auto_terminated">Auto Terminated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept === "all" ? "All Departments" : dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp} value={emp}>
                        {emp === "all" ? "All Employees" : emp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <TimesheetList
                  timesheets={filteredPendingTimesheets}
                  loading={loading}
                  searchTerm={searchTerm}
                  type="pending"
                  onViewTimesheet={openDialog}
                  emptyMessage="No pending timesheet approvals"
                  handleApprove={handleApprove}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="clarification">
          <div className="grid gap-6">
            <h2 className="text-xl font-semibold">Clarifications Needed</h2>
            <Card>
              <CardContent className="p-0">
                <TimesheetList
                  timesheets={clarificationTimesheets}
                  loading={loading}
                  searchTerm={searchTerm}
                  type="clarification"
                  onViewTimesheet={openDialog}
                  onRespondToClarification={openDialog}
                  emptyMessage="No clarifications needed"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              <TimesheetList
                timesheets={approvedTimesheets}
                loading={loading}
                searchTerm={searchTerm}
                type="approved"
                onViewTimesheet={openDialog}
                emptyMessage="No approval history found"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialogTimesheet && (
        <TimesheetDialog
          dialogTimesheet={dialogTimesheet}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          handleApprove={handleApprove}
          handleRequestClarification={handleRequestClarification}
          type={dialogTimesheet.clarification_status === 'submitted' ? 'clarification' : 'normal'}
        />
      )}
    </div>
  );
};

export default TimesheetApproval;