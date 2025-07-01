
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLeaveTypes } from "@/hooks/TimeManagement/useLeaveTypes";
import { useLeavePolicyPeriods } from "@/hooks/TimeManagement/useLeavePolicyPeriods";
import { LeaveTypesTable } from "@/components/TimeManagement/leave-policies/LeaveTypesTable";
import { AddLeaveTypeDialog } from "@/components/TimeManagement/leave-policies/AddLeaveTypeDialog";
import { LeavePeriodSettings } from "@/components/TimeManagement/leave-policies/LeavePeriodSettings";
import { LeaveType, LeavePolicyPeriod } from "@/types/leave-types";

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
    leavePeriods,
    loading: isPolicyPeriodLoading,
    isSubmitting,
    createLeavePolicyPeriod,
    updateLeavePolicyPeriod,
    deleteLeavePolicyPeriod,
    policyPeriod,
    isEditPeriodDialogOpen,
    setIsEditPeriodDialogOpen
  } = useLeavePolicyPeriods();

  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [isEditLeaveTypeDialogOpen, setIsEditLeaveTypeDialogOpen] = useState(false);

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setIsEditLeaveTypeDialogOpen(true);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateLeaveType({ id, is_active: isActive });
  };

  // Function to adapt interface for LeavePeriodSettings component
  const handleUpdatePolicyPeriod = (data: Partial<LeavePolicyPeriod>) => {
    if (policyPeriod && policyPeriod.id) {
      updateLeavePolicyPeriod(policyPeriod.id, data as LeavePolicyPeriod);
    }
  };

  return (
    <div className="content-area">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Policies</h1>
          <p className="text-muted-foreground">
            Manage leave types and allocation policies
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddPolicyDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Leave Type
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Leave Types</CardTitle>
              <CardDescription>
                Different types of leave available to employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLeaveTypesLoading ? (
                <div className="flex justify-center p-4">
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

        <div>
          <LeavePeriodSettings
            policyPeriod={policyPeriod}
            onUpdate={handleUpdatePolicyPeriod}
            isOpen={isEditPeriodDialogOpen}
            setIsOpen={setIsEditPeriodDialogOpen}
          />
        </div>
      </div>

      <AddLeaveTypeDialog
        open={isAddPolicyDialogOpen}
        onOpenChange={setIsAddPolicyDialogOpen}
        onSubmit={addLeaveType}
      />

      {editingLeaveType && (
        <AddLeaveTypeDialog
          open={isEditLeaveTypeDialogOpen}
          onOpenChange={setIsEditLeaveTypeDialogOpen}
          onSubmit={(data) => updateLeaveType({...data, id: editingLeaveType.id})}
          initialData={editingLeaveType}
          isEditing={true}
        />
      )}
    </div>
  );
};

export default LeavePolicies;
