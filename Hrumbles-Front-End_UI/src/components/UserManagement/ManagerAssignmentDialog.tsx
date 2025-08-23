import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Building, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string | null;
  department_name?: string | null;
  profile_picture_url?: string | null;
  reporting_manager_id?: string | null;
}

interface ManagerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

const ManagerAssignmentDialog: React.FC<ManagerAssignmentDialogProps> = ({
  open,
  onOpenChange,
  employee,
  onSuccess
}) => {
  const [managers, setManagers] = useState<Employee[]>([]);
    const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [selectedManagerId, setSelectedManagerId] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && employee) {
      setManagers([]); // Reset to avoid stale data
      // CORRECTED: Use 'none' for the unassigned state
      setSelectedManagerId(employee.reporting_manager_id || 'none');
      fetchPotentialManagers();
    }
  }, [open, employee]);

  const fetchPotentialManagers = async () => {
    if (!employee) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_employees')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          profile_picture_url,
          department:hr_departments(name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .neq('id', employee.id)
        .order('first_name');

      if (error) throw error;

      const formattedManagers = (data || []).map(mgr => ({
        id: mgr.id,
        first_name: mgr.first_name || '',
        last_name: mgr.last_name || '',
        email: mgr.email || '',
        position: mgr.position || '',
        department_name: Array.isArray(mgr.department) ? mgr.department[0]?.name || '' : mgr.department?.name || '',
        profile_picture_url: mgr.profile_picture_url || ''
      })) as Employee[];

      const validManagers = await filterCircularReporting(formattedManagers);
      setManagers(validManagers);

    } catch (error) {
      console.error('Error fetching potential managers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch potential managers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCircularReporting = async (potentialManagers: Employee[]) => {
    if (!employee) return potentialManagers;

    try {
      const { data: subordinates, error } = await supabase
        .rpc('get_employee_subordinates', { employee_id: employee.id });

      if (error) {
        console.error('Error checking subordinates:', error);
        toast({
          title: "Warning",
          description: "Unable to verify subordinates. All potential managers are shown.",
          variant: "destructive",
        });
        return potentialManagers;
      }

      const subordinateIds = new Set(subordinates?.map((s: any) => s.id) || []);
      return potentialManagers.filter(mgr => !subordinateIds.has(mgr.id));
    } catch (error) {
      console.error('Error filtering circular reporting:', error);
      toast({
        title: "Error",
        description: "Failed to filter circular reporting.",
        variant: "destructive",
      });
      return potentialManagers;
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setSaving(true);
      // CORRECTED: Handle the 'none' value by converting it to null for the database
      const managerToSet = selectedManagerId === 'none' ? null : selectedManagerId;

      const { error } = await supabase
        .from('hr_employees')
        .update({ 
          reporting_manager_id: managerToSet,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Reporting manager has been updated successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating reporting manager:', error);
      toast({
        title: "Error",
        description: "Failed to update reporting manager.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assign Reporting Manager
          </DialogTitle>
          <DialogDescription>
            Set the reporting manager for {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={employee.profile_picture_url || undefined} />
                <AvatarFallback>
                  {getInitials(employee.first_name, employee.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">
                  {employee.first_name} {employee.last_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {employee.position && (
                    <>
                      <span>{employee.position}</span>
                      {employee.department_name && <span>•</span>}
                    </>
                  )}
                  {employee.department_name && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      <span>{employee.department_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager-select">Reporting Manager</Label>
            {loading ? (
              <div className="h-10 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
            ) : (
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reporting manager..." />
                </SelectTrigger>
                <SelectContent>
                  {/* CORRECTED: Use 'none' as the value to prevent the crash */}
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-gray-400" />
                      <span>No reporting manager</span>
                    </div>
                  </SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      <div className="flex items-center gap-3 w-full">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={manager.profile_picture_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(manager.first_name, manager.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">
                            {manager.first_name} {manager.last_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {manager.position && <span>{manager.position}</span>}
                            {manager.position && manager.department_name && <span>•</span>}
                            {manager.department_name && <span>{manager.department_name}</span>}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Employees without a manager will report to users with "Direct" permissions.
            </p>
          </div>

          {employee.reporting_manager_id && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">Current</Badge>
                <span className="text-gray-600 dark:text-gray-300">
                  Currently reports to: {managers.find(m => m.id === employee.reporting_manager_id)?.first_name || 'Unknown'} {managers.find(m => m.id === employee.reporting_manager_id)?.last_name || ''}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || saving}
            className="min-w-24"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerAssignmentDialog;