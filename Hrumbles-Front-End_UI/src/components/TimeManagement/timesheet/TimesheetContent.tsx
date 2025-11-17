import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeLog } from "@/types/time-tracker-types";
import { TimesheetTable } from "@/components/TimeManagement/timesheet/TimesheetTable";

interface TimesheetContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTimesheets: TimeLog[];
  clarificationTimesheets: TimeLog[];
  approvedTimesheets: TimeLog[];
  loading: boolean;
  onViewTimesheet: (timesheet: TimeLog) => void;
  onRespondToClarification: (timesheet: TimeLog) => void;
  employeeHasProjects: boolean; // Add employeeHasProjects
}

export const TimesheetContent: React.FC<TimesheetContentProps> = ({
  activeTab,
  setActiveTab,
  pendingTimesheets,
  clarificationTimesheets,
  approvedTimesheets,
  loading,
  onViewTimesheet,
  onRespondToClarification,
  employeeHasProjects, // Destructure employeeHasProjects
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Management</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading timesheets...</div>
        ) : (
<div className="flex-shrink-0 order-1">
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
      <TabsTrigger
        value="pending"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center"
      >
        Pending
        {pendingTimesheets.length > 0 && (
          <span className="ml-2 bg-primary text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">
            {pendingTimesheets.length}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="clarification"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center"
      >
        Clarification Needed
        {clarificationTimesheets.length > 0 && (
          <span className="ml-2 bg-amber-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">
            {clarificationTimesheets.length}
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger
        value="approved"
        className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
          data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
      >
        Approved
      </TabsTrigger>
    </TabsList>
    
    <TabsContent value="pending">
      {pendingTimesheets.length === 0 ? (
        <div>No pending timesheets found.</div>
      ) : (
        <TimesheetTable 
          timesheets={pendingTimesheets}
          loading={loading}
          onViewTimesheet={onViewTimesheet}
          type="pending"
          employeeHasProjects={employeeHasProjects} // Pass employeeHasProjects
        />
      )}
    </TabsContent>
    
    <TabsContent value="clarification">
      {clarificationTimesheets.length === 0 ? (
        <div>No timesheets requiring clarification found.</div>
      ) : (
        <TimesheetTable 
          timesheets={clarificationTimesheets}
          loading={loading}
          onViewTimesheet={onViewTimesheet}
          onRespondToClarification={onRespondToClarification}
          type="clarification"
          employeeHasProjects={employeeHasProjects} // Pass employeeHasProjects
        />
      )}
    </TabsContent>
    
    <TabsContent value="approved">
      {approvedTimesheets.length === 0 ? (
        <div>No approved timesheets found.</div>
      ) : (
        <TimesheetTable 
          timesheets={approvedTimesheets}
          loading={loading}
          onViewTimesheet={onViewTimesheet}
          type="approved"
          employeeHasProjects={employeeHasProjects} // Pass employeeHasProjects
        />
      )}
    </TabsContent>
  </Tabs>
</div>
        )}
      </CardContent>
    </Card>
  );
};