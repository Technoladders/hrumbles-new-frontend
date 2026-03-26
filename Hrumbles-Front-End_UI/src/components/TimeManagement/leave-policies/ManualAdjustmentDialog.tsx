import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, AlertCircle, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LeaveType, ManualAdjustmentPayload } from "@/types/leave-types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select a leave type (e.g. when opened from policy table) */
  preselectedLeaveType?: LeaveType;
  /** Pre-select an employee (e.g. when opened from audit page) */
  preselectedEmployeeId?: string;
  year: number;
}

interface EmployeeBalance {
  employee_id: string;
  first_name: string;
  last_name: string;
  designation?: string;
  department?: string;
  remaining_days: number;
  used_days: number;
}

const CURRENT_YEAR = new Date().getFullYear();

export function ManualAdjustmentDialog({
  open,
  onOpenChange,
  preselectedLeaveType,
  preselectedEmployeeId,
  year,
}: ManualAdjustmentDialogProps) {
  const queryClient = useQueryClient();
  const authData    = getAuthDataFromLocalStorage();
  const org_id      = authData?.organization_id as string;

  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState(
    preselectedLeaveType?.id ?? ""
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    preselectedEmployeeId ?? ""
  );
  const [adjustmentType, setAdjustmentType]   = useState<"credit" | "debit">("credit");
  const [days, setDays]                       = useState<number>(1);
  const [reason, setReason]                   = useState("");
  const [searchQuery, setSearchQuery]         = useState("");

  useEffect(() => {
    if (open) {
      setSelectedLeaveTypeId(preselectedLeaveType?.id ?? "");
      setSelectedEmployeeId(preselectedEmployeeId ?? "");
      setAdjustmentType("credit");
      setDays(1);
      setReason("");
      setSearchQuery("");
    }
  }, [open, preselectedLeaveType, preselectedEmployeeId]);

  // ── Leave types ───────────────────────────────────────────────────────
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
    enabled: !!org_id && open,
  });

  // ── Employees + balances for selected leave type ──────────────────────
  const { data: employeeBalances = [], isLoading: loadingEmps } = useQuery<EmployeeBalance[]>({
    queryKey: ["employeeBalancesForAdjustment", org_id, selectedLeaveTypeId, year],
    queryFn: async () => {
      if (!selectedLeaveTypeId) return [];
      const { data, error } = await supabase
        .from("employee_leave_balances")
        .select(`
          employee_id,
          remaining_days,
          used_days,
          hr_employees!inner(
            first_name, last_name,
            hr_designations(name),
            hr_departments(name)
          )
        `)
        .eq("leave_type_id", selectedLeaveTypeId)
        .eq("year", year);
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        employee_id:   row.employee_id,
        first_name:    row.hr_employees?.first_name ?? "",
        last_name:     row.hr_employees?.last_name ?? "",
        designation:   row.hr_employees?.hr_designations?.name,
        department:    row.hr_employees?.hr_departments?.name,
        remaining_days: row.remaining_days ?? 0,
        used_days:      row.used_days ?? 0,
      }));
    },
    enabled: !!selectedLeaveTypeId && !!org_id && open,
  });

  const filteredEmployees = employeeBalances.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  });

  const selectedEmployee = employeeBalances.find(
    (e) => e.employee_id === selectedEmployeeId
  );

  // ── Submit mutation ───────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async (payload: ManualAdjustmentPayload) => {
      // 1. Insert ledger entry
      const { error: ledgerErr } = await supabase.from("leave_ledger").insert({
        employee_id:      payload.employee_id,
        leave_type_id:    payload.leave_type_id,
        event_type:       "adjustment",
        credit:           payload.type === "credit" ? payload.days : 0,
        debit:            payload.type === "debit"  ? payload.days : 0,
        transaction_date: new Date().toISOString().split("T")[0],
        reason:           payload.reason,
      });
      if (ledgerErr) throw ledgerErr;

      // 2. Update balance
      if (payload.type === "credit") {
        const { error } = await supabase.rpc("increment_leave_balance", {
          p_employee_id:   payload.employee_id,
          p_leave_type_id: payload.leave_type_id,
          p_year:          payload.year,
          p_days:          payload.days,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("decrement_leave_balance", {
          p_employee_id:   payload.employee_id,
          p_leave_type_id: payload.leave_type_id,
          p_year:          payload.year,
          p_days:          payload.days,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Balance adjusted successfully");
      queryClient.invalidateQueries({
        queryKey: ["employeeBalancesForAdjustment"],
      });
      queryClient.invalidateQueries({ queryKey: ["leaveLedger"] });
      queryClient.invalidateQueries({ queryKey: ["leaveBalanceSummary"] });
      setReason("");
      setDays(1);
      setSelectedEmployeeId("");
    },
    onError: (err: any) => toast.error(`Adjustment failed: ${err.message}`),
  });

  const handleSubmit = () => {
    if (!selectedEmployeeId || !selectedLeaveTypeId) {
      toast.error("Select an employee and a leave type");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required for audit trail");
      return;
    }
    if (days <= 0) {
      toast.error("Days must be greater than 0");
      return;
    }
    if (adjustmentType === "debit" && selectedEmployee && days > selectedEmployee.remaining_days) {
      toast.error(
        `Cannot deduct ${days} days — employee only has ${selectedEmployee.remaining_days} remaining`
      );
      return;
    }
    mutation.mutate({
      employee_id:    selectedEmployeeId,
      leave_type_id:  selectedLeaveTypeId,
      year,
      type:           adjustmentType,
      days,
      reason:         reason.trim(),
    });
  };

  const selectedLT = leaveTypes.find((t) => t.id === selectedLeaveTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-indigo-600 to-violet-700 rounded-t-lg shrink-0">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <User className="h-5 w-5" />
            Manual Balance Adjustment
          </DialogTitle>
          <DialogDescription className="text-indigo-200">
            Every adjustment is recorded in the audit ledger with your reason.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto px-6 py-5 space-y-5">

          {/* ── Row 1: leave type + year ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leave Policy</Label>
              {preselectedLeaveType ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/30">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: preselectedLeaveType.color }}
                  />
                  <span className="text-sm font-medium">{preselectedLeaveType.name}</span>
                </div>
              ) : (
                <Select
                  value={selectedLeaveTypeId}
                  onValueChange={(v) => {
                    setSelectedLeaveTypeId(v);
                    setSelectedEmployeeId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: t.color }}
                          />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/30">
                <span className="text-sm font-medium">{year}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Row 2: Employee selector ──────────────────────────── */}
          {!preselectedEmployeeId && selectedLeaveTypeId && (
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or department…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-44 rounded-lg border">
                {loadingEmps ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1">
                    <User className="h-6 w-6 opacity-30" />
                    <span className="text-sm">No employees found</span>
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.employee_id}
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.employee_id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
                          selectedEmployeeId === emp.employee_id
                            ? "bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div className="text-left">
                            <p className="font-medium">
                              {emp.first_name} {emp.last_name}
                            </p>
                            {emp.department && (
                              <p className="text-xs text-muted-foreground">{emp.department}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className={cn(
                            "font-bold",
                            emp.remaining_days <= 2
                              ? "text-rose-600"
                              : "text-emerald-600"
                          )}>
                            {emp.remaining_days}d
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* ── Pre-selected employee summary ─────────────────────── */}
          {preselectedEmployeeId && selectedEmployee && (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-semibold text-indigo-700">
                  {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                </div>
                <div>
                  <p className="font-medium">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                  {selectedEmployee.department && (
                    <p className="text-xs text-muted-foreground">{selectedEmployee.department}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground text-xs">Balance</p>
                <p className="font-bold">
                  <span className="text-emerald-600">{selectedEmployee.remaining_days}d</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-rose-500">{selectedEmployee.used_days}d used</span>
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* ── Adjustment controls ───────────────────────────────── */}
          <div className="space-y-4">
            {/* Credit / Debit toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType("credit")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  adjustmentType === "credit"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-border hover:border-emerald-300"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p>Add days</p>
                  <p className="font-normal text-xs text-muted-foreground">Credit balance</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("debit")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                  adjustmentType === "debit"
                    ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    : "border-border hover:border-rose-300"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <Minus className="h-4 w-4 text-rose-600" />
                </div>
                <div className="text-left">
                  <p>Deduct days</p>
                  <p className="font-normal text-xs text-muted-foreground">Debit balance</p>
                </div>
              </button>
            </div>

            {/* Days input */}
            <div className="space-y-2">
              <Label>Number of days</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-32"
              />
            </div>

            {/* Reason — mandatory */}
            <div className="space-y-2">
              <Label htmlFor="adj-reason">
                Reason{" "}
                <span className="text-rose-500">*</span>
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  (required for audit trail)
                </span>
              </Label>
              <Textarea
                id="adj-reason"
                placeholder="e.g. Carry forward correction, Policy change, Employee request approved by HR manager"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Preview */}
            {selectedEmployee && days > 0 && (
              <div className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border text-sm",
                adjustmentType === "credit"
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800"
              )}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">New balance after adjustment:</span>
                </div>
                <span className="font-bold text-base">
                  {adjustmentType === "credit"
                    ? selectedEmployee.remaining_days + days
                    : Math.max(0, selectedEmployee.remaining_days - days)} days
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />
        <DialogFooter className="px-6 py-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedEmployeeId ||
              !selectedLeaveTypeId ||
              !reason.trim() ||
              days <= 0 ||
              mutation.isPending
            }
            className={cn(
              adjustmentType === "credit"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            )}
          >
            {mutation.isPending ? "Saving…" : (
              adjustmentType === "credit"
                ? `Add ${days} day${days !== 1 ? "s" : ""}`
                : `Deduct ${days} day${days !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}