import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, isAfter, startOfToday, startOfDay, endOfDay } from "date-fns";
import { getGoalInstances, updateGoalInstance, deleteGoalInstance } from "@/lib/goalService";
import { GoalInstance } from "@/types/goal";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoalInstancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
  goalType: string | null;
  metricUnit: string;
  onUpdate?: () => void;
}

const GoalInstancesDialog: React.FC<GoalInstancesDialogProps> = ({
  open,
  onOpenChange,
  goalId,
  goalName,
  goalType,
  metricUnit,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [instances, setInstances] = useState<GoalInstance[]>([]);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editTargetValue, setEditTargetValue] = useState<number>(0);
  const [editCurrentValue, setEditCurrentValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // --- UPDATED: State for filtering ---
  const [filter, setFilter] = useState<'past' | 'current' | 'upcoming'>('current');

  useEffect(() => {
    if (open && goalType) {
      fetchInstances();
    }
  }, [open, goalId, goalType]);

  const fetchInstances = async () => {
    setIsLoading(true);
    const data = await getGoalInstances(goalId, goalType || '');
    // Filter out instances with missing or invalid employee data
    const validInstances = data.filter(instance => 
      instance.employee && 
      instance.assigned_goal && 
      instance.employee.first_name && 
      instance.employee.last_name
    );
    setInstances(validInstances);
    setIsLoading(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEdit = (instance: GoalInstance) => {
    setEditingInstanceId(instance.id);
    setEditTargetValue(instance.target_value);
    setEditCurrentValue(instance.current_value);
  };

  const handleSave = async (instanceId: string) => {
    const updated = await updateGoalInstance(instanceId, {
      target_value: editTargetValue,
      current_value: editCurrentValue,
      status: editCurrentValue >= editTargetValue ? "completed" : "in-progress",
    });

    if (updated) {
      setInstances(instances.map(i => i.id === instanceId ? updated : i));
      setEditingInstanceId(null);
      toast({
        title: "Instance Updated",
        description: "Goal instance has been successfully updated.",
      });
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to update goal instance.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (instanceId: string) => {
    const success = await deleteGoalInstance(instanceId);
    if (success) {
      setInstances(instances.filter(i => i.id !== instanceId));
      toast({
        title: "Instance Deleted",
        description: "Goal instance has been successfully deleted.",
      });
      if (onUpdate) onUpdate();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete goal instance.",
        variant: "destructive",
      });
    }
  };

  // --- UPDATED: Memoized filtering logic with full day boundaries ---
  const filteredInstances = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfDay(todayStart);
    return instances.filter(inst => {
      const periodStart = startOfDay(new Date(inst.period_start));
      const periodEnd = endOfDay(new Date(inst.period_end));
      switch (filter) {
        case 'past':
          return isBefore(periodEnd, todayStart);
        case 'upcoming':
          return isAfter(periodStart, todayEnd);
        case 'current':
          return !isAfter(periodStart, todayEnd) && !isBefore(periodEnd, todayStart);
        default:
          return true;
      }
    });
  }, [instances, filter]);

  const filterLabels: Record<'past' | 'current' | 'upcoming', string> = {
    past: 'Past',
    current: 'Current',
    upcoming: 'Upcoming'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle>{goalName} - {goalType} Instances</DialogTitle>
              <DialogDescription>
                View and manage all {goalType?.toLowerCase()} goal instances for {goalName}.
                {goalName === "Submission" || goalName === "Onboarding"
                  ? " Current values are automatically updated from status change counts."
                  : ""}
              </DialogDescription>
            </div>
            {/* --- UPDATED: Three Filter Buttons --- */}
            <div className="flex items-center gap-2">
              {(['past', 'current', 'upcoming'] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                >
                  {filterLabels[f]}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500">Loading instances...</p>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No {filterLabels[filter].toLowerCase()} instances found.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* --- UPDATE: Map over filteredInstances --- */}
                {filteredInstances.map(instance => (
                  <TableRow key={instance.id}>
                    <TableCell>
                      {instance.employee ? (
                        `${instance.employee.first_name} ${instance.employee.last_name}`
                      ) : (
                        "Unknown"
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(instance.period_start)} - {formatDate(instance.period_end)}
                    </TableCell>
                    <TableCell>
                      {editingInstanceId === instance.id ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editCurrentValue}
                            onChange={(e) => setEditCurrentValue(Number(e.target.value))}
                            className="w-20"
                            disabled={goalName === "Submission" || goalName === "Onboarding"}
                          />
                          <span>/</span>
                          <Input
                            type="number"
                            value={editTargetValue}
                            onChange={(e) => setEditTargetValue(Number(e.target.value))}
                            className="w-20"
                          />
                          <span>{metricUnit}</span>
                        </div>
                      ) : (
                        `${instance.current_value} / ${instance.target_value} ${metricUnit}`
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingInstanceId === instance.id ? (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(instance.id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingInstanceId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(instance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDelete(instance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalInstancesDialog;