import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useLeaveTypes } from "@/hooks/TimeManagement/useLeaveTypes";
import { useLeavePolicyPeriods } from "@/hooks/TimeManagement/useLeavePolicyPeriods";
import { LeaveTypesTable } from "@/components/TimeManagement/leave-policies/LeaveTypesTable";
import { AddLeaveTypeDialog } from "@/components/TimeManagement/leave-policies/AddLeaveTypeDialog";
import { LeavePeriodSettings } from "@/components/TimeManagement/leave-policies/LeavePeriodSettings";
import { LeaveType, LeavePolicyPeriod } from "@/types/leave-types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LeavePolicies = () => {
  const {
    leaveTypes,
    isLoading: isLeaveTypesLoading,
    addLeaveType,
    updateLeaveType,
    deleteLeaveType,
    isAddPolicyDialogOpen,
    setIsAddPolicyDialogOpen
  } = useLeaveTypes();

  const {
    policyPeriod,
    updatePolicyPeriod,
    isEditPeriodDialogOpen,
    setIsEditPeriodDialogOpen
  } = useLeavePolicyPeriods();

  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [isEditLeaveTypeDialogOpen, setIsEditLeaveTypeDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setIsEditLeaveTypeDialogOpen(true);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateLeaveType({ id, is_active: isActive });
  };

  // NEW FEATURE: Force Recalculation of Balances
  // Useful if you changed policies manually and want to reset everyone's balance
  const handleRecalculateAll = async () => {
    if(!confirm("This will recalculate balances for ALL employees based on current active policies. This might overwrite manual adjustments. Continue?")) return;
    
    setIsRecalculating(true);
    try {
      const { error } = await supabase.rpc('recalculate_all_balances', { 
        target_year: new Date().getFullYear() 
      });
      
      if (error) throw error;
      toast.success("Balances recalculated successfully.");
    } catch (error: any) {
      toast.error("Recalculation failed: " + error.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="content-area space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Policies</h1>
          <p className="text-muted-foreground">
            Configure leave types, accrual rules, and eligibility criteria.
          </p>
        </div>
        <div className="flex gap-2">
           {/* <Button variant="outline" onClick={handleRecalculateAll} disabled={isRecalculating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate Balances
          </Button> */}
          <Button className="gap-2" onClick={() => {
            setEditingLeaveType(null); // Clear editing state
            setIsAddPolicyDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: List of Policies */}
        <div className="md:col-span-3 lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Active Policies</CardTitle>
              <CardDescription>
                Manage the rules for different leave types.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLeaveTypesLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <LeaveTypesTable
                  leaveTypes={leaveTypes}
                  onEdit={handleEditLeaveType}
                  onDelete={deleteLeaveType}
                  onToggleActive={handleToggleActive}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Global Settings */}
        <div className="md:col-span-3 lg:col-span-1 space-y-6">
          <LeavePeriodSettings
            policyPeriod={policyPeriod}
            onUpdate={(data) => policyPeriod?.id && updatePolicyPeriod(policyPeriod.id, data as any)}
            isOpen={isEditPeriodDialogOpen}
            setIsOpen={setIsEditPeriodDialogOpen}
          />

          <Card>
            <CardHeader>
              <CardTitle>Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>
                <strong>Accrual:</strong> "Given Upfront" credits the full allowance on Jan 1st. "Monthly" credits 1/12th on the 1st of each month.
              </p>
              <p>
                <strong>Proration:</strong> If enabled, new employees joining mid-year only get days proportional to their time worked.
              </p>
              <p>
                <strong>Ledger:</strong> All changes are recorded in the Audit Log.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Dialog */}
      <AddLeaveTypeDialog
        open={isAddPolicyDialogOpen}
        onOpenChange={setIsAddPolicyDialogOpen}
        onSubmit={addLeaveType}
        isEditing={false}
      />

      {/* Edit Dialog */}
      {editingLeaveType && (
        <AddLeaveTypeDialog
          open={isEditLeaveTypeDialogOpen}
          onOpenChange={(open) => {
            setIsEditLeaveTypeDialogOpen(open);
            if (!open) setEditingLeaveType(null);
          }}
          onSubmit={(data) => {
             updateLeaveType({ ...data, id: editingLeaveType.id });
             setIsEditLeaveTypeDialogOpen(false);
          }}
          initialData={editingLeaveType}
          isEditing={true}
        />
      )}
    </div>
  );
};

export default LeavePolicies;