import { useState, useEffect, useMemo } from "react";
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

  useEffect(() => {
    fetchTimesheets();
  }, []);
  
  // Combine all timesheets to derive a complete list for filters
  const allTimesheets = useMemo(() => [
    ...pendingTimesheets, 
    ...clarificationTimesheets, 
    ...approvedTimesheets
  ], [pendingTimesheets, clarificationTimesheets, approvedTimesheets]);

  // Derive unique departments from all timesheets
  const departments = useMemo(() => {
    const uniqueDepts = new Set(
      allTimesheets.map((t) => t.employee?.department?.name).filter(Boolean)
    );
    return ["all", ...Array.from(uniqueDepts)];
  }, [allTimesheets]);

  // Derive employees based on the selected department
  const employees = useMemo(() => {
    const relevantTimesheets = departmentFilter === "all"
      ? allTimesheets
      : allTimesheets.filter(t => t.employee?.department?.name === departmentFilter);
      
    const uniqueEmployees = new Set(
      relevantTimesheets.map(t => `${t.employee?.first_name} ${t.employee?.last_name}`)
    );
    return ["all", ...Array.from(uniqueEmployees)];
  }, [allTimesheets, departmentFilter]);

  // Reset employee filter when department changes
  useEffect(() => {
    setEmployeeFilter("all");
  }, [departmentFilter]);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimesheets();
    setIsRefreshing(false);
    toast("Timesheet data refreshed");
  };
  
  // A generic filtering function for all tabs
  const filterTimesheets = (timesheets: any[]) => {
    return timesheets.filter((timesheet) => {
      const employeeName = `${timesheet.employee?.first_name} ${timesheet.employee?.last_name}`;
      const searchMatch = searchTerm ? employeeName.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const departmentMatch = departmentFilter === "all" || timesheet.employee?.department?.name === departmentFilter;
      const employeeMatch = employeeFilter === "all" || employeeName === employeeFilter;
      
      return searchMatch && departmentMatch && employeeMatch;
    });
  };

  // Apply filters to each list
  const filteredPendingTimesheets = filterTimesheets(pendingTimesheets).filter(
    (timesheet) => statusFilter === "all" || timesheet.status === statusFilter
  );
  const filteredClarificationTimesheets = filterTimesheets(clarificationTimesheets);
  const filteredApprovedTimesheets = filterTimesheets(approvedTimesheets);

  const filterControls = (
    <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
       <h2 className="text-xl font-semibold capitalize">{activeTab} Timesheets</h2>
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Search */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input
      type="search"
      placeholder="Search employees..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  {/* Status Filter (Conditional) */}
  {activeTab === 'pending' && (
    <div className="flex-shrink-0 order-2 w-full sm:w-[180px]">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="auto_terminated">Auto Terminated</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}

  {/* Department Filter */}
  <div className="flex-shrink-0 order-3 w-full sm:w-[180px]">
    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
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
  </div>

  {/* Employee Filter */}
  <div className="flex-shrink-0 order-4 w-full sm:w-[180px]">
    <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
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
  </div>

  {/* Refresh Button */}
  <Button 
    variant="outline" 
    size="sm" 
    onClick={handleRefresh} 
    disabled={isRefreshing}
    className="flex-shrink-0 order-5 rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
  >
    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
    Refresh
  </Button>
</div>
    </div>
 );
  
  return (
    <div className="content-area">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Timesheet Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve employee timesheets
        </p>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
<TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
      <TabsTrigger
        value="pending"
        className="relative px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center"
      >
        Pending Approvals
        {getPendingCount() > 0 && (
          <span className="ml-2 bg-primary rounded-full px-2 py-1 text-xs text-white">
            {getPendingCount()}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="clarification"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Clarifications
      </TabsTrigger>
      <TabsTrigger
        value="history"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Approval History
      </TabsTrigger>
    </TabsList>

        {filterControls}
        
        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <TimesheetList
                timesheets={filteredPendingTimesheets}
                loading={loading}
                type="pending"
                onViewTimesheet={openDialog}
                emptyMessage="No pending timesheet approvals"
                handleApprove={handleApprove}
                handleRequestClarification={handleRequestClarification}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clarification">
          <Card>
            <CardContent className="p-0">
              <TimesheetList
                timesheets={filteredClarificationTimesheets}
                loading={loading}
                type="clarification"
                onViewTimesheet={openDialog}
                onRespondToClarification={openDialog}
                emptyMessage="No clarifications needed"
                handleApprove={handleApprove}
                handleRequestClarification={handleRequestClarification}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <TimesheetList
                timesheets={filteredApprovedTimesheets}
                loading={loading}
                type="approved"
                onViewTimesheet={openDialog}
                emptyMessage="No approval history found"
                handleApprove={handleApprove}
                handleRequestClarification={handleRequestClarification}
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