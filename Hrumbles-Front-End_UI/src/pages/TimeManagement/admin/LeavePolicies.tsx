import { useState } from "react";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useLeaveTypes }         from "@/hooks/TimeManagement/useLeaveTypes";
import { useLeavePolicyPeriods } from "@/hooks/TimeManagement/useLeavePolicyPeriods";
import { LeaveTypesTable }       from "@/components/TimeManagement/leave-policies/LeaveTypesTable";
import { AddLeaveTypeDialog }    from "@/components/TimeManagement/leave-policies/AddLeaveTypeDialog";
import { LeavePeriodSettings }   from "@/components/TimeManagement/leave-policies/LeavePeriodSettings";
import { LeaveBalanceOverview }  from "@/components/TimeManagement/leave-policies/LeaveBalanceOverview";
import { ManualAdjustmentDialog } from "@/components/TimeManagement/leave-policies/ManualAdjustmentDialog";
import { RecalculateDialog }     from "@/components/TimeManagement/leave-policies/RecalculateDialog";
import { LeaveType }             from "@/types/leave-types";

const CURRENT_YEAR = new Date().getFullYear();

const LeavePolicies = () => {
  const {
    leaveTypes,
    isLoading,
    isRecalculating,
    addLeaveType,
    updateLeaveType,
    deleteLeaveType,
    copyLeaveType,
    recalculateOrgBalances,
    isAddPolicyDialogOpen,
    setIsAddPolicyDialogOpen,
  } = useLeaveTypes();

  const {
    policyPeriod,
    updatePolicyPeriod,
    isEditPeriodDialogOpen,
    setIsEditPeriodDialogOpen,
  } = useLeavePolicyPeriods();

  const [editingLeaveType, setEditingLeaveType]         = useState<LeaveType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen]         = useState(false);
  const [adjustTarget, setAdjustTarget]                 = useState<LeaveType | null>(null);
  const [isAdjustOpen, setIsAdjustOpen]                 = useState(false);
  const [isRecalcDialogOpen, setIsRecalcDialogOpen]     = useState(false);

  const handleEdit = (lt: LeaveType) => {
    setEditingLeaveType(lt);
    setIsEditDialogOpen(true);
  };

  const handleAdjust = (lt: LeaveType) => {
    setAdjustTarget(lt);
    setIsAdjustOpen(true);
  };

  return (
    <div className="content-area space-y-6 p-8">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Policies</h1>
          <p className="text-muted-foreground mt-1">
            Configure leave types, accrual rules, and eligibility criteria.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsRecalcDialogOpen(true)}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`} />
            Recalculate
          </Button>
          <Button
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setEditingLeaveType(null);
              setIsAddPolicyDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left / main: policies table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
              <CardDescription>
                Manage the rules for different leave types.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <LeaveTypesTable
                  leaveTypes={leaveTypes}
                  onEdit={handleEdit}
                  onDelete={deleteLeaveType}
                  onToggleActive={(id, active) => updateLeaveType({ id, is_active: active })}
                  onCopy={copyLeaveType}
                  onAdjust={handleAdjust}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: settings + overview */}
        <div className="space-y-6">
          <LeavePeriodSettings
            policyPeriod={policyPeriod}
            onUpdate={(data) =>
              policyPeriod?.id && updatePolicyPeriod(policyPeriod.id, data as any)
            }
            isOpen={isEditPeriodDialogOpen}
            setIsOpen={setIsEditPeriodDialogOpen}
          />

          <LeaveBalanceOverview year={CURRENT_YEAR} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Upfront:</span>{" "}
                Full allowance credited on Jan 1 (or leave year start).
              </p>
              <p>
                <span className="font-medium text-foreground">Monthly:</span>{" "}
                1/12th of annual allowance credited on the 1st of each month.
              </p>
              <p>
                <span className="font-medium text-foreground">Proration:</span>{" "}
                Joiners mid-year receive days proportional to remaining months.
              </p>
              <p>
                <span className="font-medium text-foreground">Recalculate:</span>{" "}
                Recomputes balances for all active employees in your org. Safe to run anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────── */}

      {/* Create */}
      <AddLeaveTypeDialog
        open={isAddPolicyDialogOpen}
        onOpenChange={setIsAddPolicyDialogOpen}
        onSubmit={addLeaveType}
        isEditing={false}
      />

      {/* Edit */}
      {editingLeaveType && (
        <AddLeaveTypeDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) setEditingLeaveType(null);
          }}
          onSubmit={(data) => {
            updateLeaveType({ ...data, id: editingLeaveType.id });
            setIsEditDialogOpen(false);
          }}
          initialData={editingLeaveType}
          isEditing
        />
      )}

      {/* Manual balance adjustment — opened from policy table */}
      <ManualAdjustmentDialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          setIsAdjustOpen(open);
          if (!open) setAdjustTarget(null);
        }}
        preselectedLeaveType={adjustTarget ?? undefined}
        year={CURRENT_YEAR}
      />

      {/* Recalculate confirmation */}
      <RecalculateDialog
        open={isRecalcDialogOpen}
        onOpenChange={setIsRecalcDialogOpen}
        onConfirm={(year) => {
          recalculateOrgBalances(year);
          setIsRecalcDialogOpen(false);
        }}
        isRecalculating={isRecalculating}
      />
    </div>
  );
};

export default LeavePolicies;