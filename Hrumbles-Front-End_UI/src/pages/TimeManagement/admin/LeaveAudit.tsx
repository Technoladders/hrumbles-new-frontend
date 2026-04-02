import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { LeaveLedgerViewer }      from "@/components/TimeManagement/leave-policies/LeaveLedgerViewer";
import { ManualAdjustmentDialog } from "@/components/TimeManagement/leave-policies/ManualAdjustmentDialog";
import { Search, User, SlidersHorizontal, RefreshCw } from "lucide-react";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { LeaveType } from "@/types/leave-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const LeaveAudit = () => {
  const authData    = getAuthDataFromLocalStorage();
  const org_id      = authData?.organization_id as string;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string | "all">("all");
  const [selectedYear, setSelectedYear]             = useState(CURRENT_YEAR);
  const [isAdjustOpen, setIsAdjustOpen]             = useState(false);
  const [isRecalculating, setIsRecalculating]       = useState(false);
  const [searchQuery, setSearchQuery]               = useState("");

  // Employees
  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ["employees-list", org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("id, first_name, last_name, hr_departments(name)")
        .eq("organization_id", org_id)
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!org_id,
  });

  // Leave types for filter
  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ["leaveTypes", org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("organization_id", org_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!org_id,
  });

  const selectedEmployee = employees.find((e: any) => e.id === selectedEmployeeId);
  const selectedLT = leaveTypes.find((t) => t.id === selectedLeaveTypeId);

  const filteredEmployees = (employees as any[]).filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.hr_departments?.name?.toLowerCase().includes(q)
    );
  });

  // Employee-level recalculate
  const handleEmployeeRecalc = async () => {
    if (!selectedEmployeeId) return;
    setIsRecalculating(true);
    try {
      const { error } = await supabase.rpc("recalculate_employee_balances", {
        p_employee_id: selectedEmployeeId,
        p_year:        selectedYear,
      });
      if (error) throw error;
      toast.success(`Balances recalculated for ${selectedYear}`);
    } catch (err: any) {
      toast.error(`Recalculation failed: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="content-area space-y-6 p-8">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            View and manage employee leave ledger history.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* ── Left sidebar ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Employee selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Employee list */}
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {loadingEmps ? (
                  <p className="text-xs text-muted-foreground px-2">Loading…</p>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2">No employees found</p>
                ) : (
                  filteredEmployees.map((emp: any) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors",
                        selectedEmployeeId === emp.id
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-xs">
                          {emp.first_name} {emp.last_name}
                        </p>
                        {emp.hr_departments?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {emp.hr_departments.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}{y === CURRENT_YEAR ? " (current)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Leave Type</Label>
                <Select
                  value={selectedLeaveTypeId}
                  onValueChange={setSelectedLeaveTypeId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leave types</SelectItem>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: t.color }}
                          />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Per-employee actions (only when employee selected) */}
          {selectedEmployeeId && (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => setIsAdjustOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Adjust balance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleEmployeeRecalc}
                disabled={isRecalculating}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
                Recalculate {selectedYear}
              </Button>
            </div>
          )}
        </div>

        {/* ── Main ledger ────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    {selectedEmployee
                      ? `${(selectedEmployee as any).first_name} ${(selectedEmployee as any).last_name} · ${selectedYear}${selectedLT ? ` · ${selectedLT.name}` : ""}`
                      : "Select an employee to view their ledger"}
                  </CardDescription>
                </div>
                {selectedEmployee && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 border">
                    {(selectedEmployee as any).first_name} {(selectedEmployee as any).last_name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedEmployeeId ? (
                <LeaveLedgerViewer
                  employeeId={selectedEmployeeId}
                  leaveTypeId={selectedLeaveTypeId === "all" ? undefined : selectedLeaveTypeId}
                  year={selectedYear}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl gap-3">
                  <User className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Select an employee from the sidebar to view their ledger</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual adjustment from audit page — no preselected leave type */}
      <ManualAdjustmentDialog
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        preselectedEmployeeId={selectedEmployeeId || undefined}
        year={selectedYear}
      />
    </div>
  );
};

export default LeaveAudit;