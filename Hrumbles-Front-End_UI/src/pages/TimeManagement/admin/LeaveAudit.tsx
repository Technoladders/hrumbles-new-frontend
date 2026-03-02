import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeaveLedgerViewer } from "@/components/TimeManagement/leave-policies/LeaveLedgerViewer"; // Import the component we made in Phase 3
import { Search, User } from "lucide-react";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

const LeaveAudit = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const authData = getAuthDataFromLocalStorage();

  // Fetch all employees for the dropdown
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email')
        .eq('organization_id', authData?.organization_id)
        .eq('status', 'active')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!authData?.organization_id
  });

  return (
    <div className="content-area space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Audit Log</h1>
          <p className="text-muted-foreground">
            View the transaction history (Ledger) for employee leave balances.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar: Employee Selector */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Employee</CardTitle>
              <CardDescription>Choose an employee to audit</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading employees...</div>
              ) : (
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedEmployeeId && (
                 <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Selected Audit Target</p>
                      <p className="text-xs text-muted-foreground">
                        {employees?.find(e => e.id === selectedEmployeeId)?.email}
                      </p>
                    </div>
                 </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content: The Ledger Viewer */}
        <div className="md:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Real-time record of accruals, usage, and adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEmployeeId ? (
                <LeaveLedgerViewer employeeId={selectedEmployeeId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p>Select an employee to view their ledger</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LeaveAudit;