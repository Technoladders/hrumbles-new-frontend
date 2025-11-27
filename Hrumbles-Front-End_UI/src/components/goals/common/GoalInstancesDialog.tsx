import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
// IMPORT 1: Add Alert Dialog imports
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  
  // STATE CHANGE: Add state for the confirmation popup
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

  const [filter, setFilter] = useState<'past' | 'current' | 'upcoming'>('current');

  const FILTER_TABS = [
    { id: 'past', label: 'Past' },
    { id: 'current', label: 'Current' },
    { id: 'upcoming', label: 'Upcoming' },
  ] as const;

  useEffect(() => {
    if (open && goalType) {
      fetchInstances();
    }
  }, [open, goalId, goalType]);

  const fetchInstances = async () => {
    setIsLoading(true);
    const data = await getGoalInstances(goalId, goalType || '');
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
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in-progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue": return "bg-red-100 text-red-800 border-red-200";
      case "pending": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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
      toast({ title: "Instance Updated", description: "Goal instance has been successfully updated." });
      if (onUpdate) onUpdate();
    } else {
      toast({ title: "Error", description: "Failed to update goal instance.", variant: "destructive" });
    }
  };

  const handleDelete = async (instanceId: string) => {
    const success = await deleteGoalInstance(instanceId);
    if (success) {
      setInstances(instances.filter(i => i.id !== instanceId));
      setInstanceToDelete(null); // LOGIC CHANGE: Close popup
      toast({ title: "Instance Deleted", description: "Goal instance has been successfully deleted." });
      if (onUpdate) onUpdate();
    } else {
      toast({ title: "Error", description: "Failed to delete goal instance.", variant: "destructive" });
    }
  };

  const filteredInstances = useMemo(() => {
    const todayStart = startOfToday();
    const todayEnd = endOfDay(todayStart);
    return instances.filter(inst => {
      const periodStart = startOfDay(new Date(inst.period_start));
      const periodEnd = endOfDay(new Date(inst.period_end));
      switch (filter) {
        case 'past': return isBefore(periodEnd, todayStart);
        case 'upcoming': return isAfter(periodStart, todayEnd);
        case 'current': return !isAfter(periodStart, todayEnd) && !isBefore(periodEnd, todayStart);
        default: return true;
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <DialogTitle>{goalName} - {goalType} Instances</DialogTitle>
              <DialogDescription className="mt-1">
                View and manage all {goalType?.toLowerCase()} goal instances.
              </DialogDescription>
            </div>
            
            {/* SMOOTH PILL TABS */}
            <div className="flex p-1 bg-gray-100/80 rounded-full border border-gray-200/50">
              {FILTER_TABS.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as any)}
                    className={cn(
                      "relative flex items-center justify-center px-4 py-1.5 text-xs font-medium rounded-full transition-colors duration-200 z-10 outline-none focus-visible:ring-2 ring-primary/20",
                      isActive ? "text-white" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-filter-pill"
                        className="absolute inset-0 bg-violet-600 rounded-full -z-10 shadow-sm"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-violet-500"></div>
            <p className="mt-2 text-gray-500">Loading instances...</p>
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
            <p className="text-gray-500">No {filterLabels[filter].toLowerCase()} instances found.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader className="bg-violet-600 sticky top-0 z-10">
                <TableRow className="hover:bg-violet-600 border-none">
                  <TableHead className="text-white font-semibold pl-4 first:rounded-tl-md first:rounded-bl-md">Employee</TableHead>
                  <TableHead className="text-white font-semibold">Period</TableHead>
                  <TableHead className="text-white font-semibold">Progress</TableHead>
                  <TableHead className="text-white font-semibold">Status</TableHead>
                  <TableHead className="text-white font-semibold pr-4 last:rounded-tr-md last:rounded-br-md text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstances.map(instance => (
                  <TableRow key={instance.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-700 pl-4">
                      {instance.employee ? `${instance.employee.first_name} ${instance.employee.last_name}` : "Unknown"}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(instance.period_start)} - {formatDate(instance.period_end)}
                    </TableCell>
                    <TableCell>
                      {editingInstanceId === instance.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={editCurrentValue}
                            onChange={(e) => setEditCurrentValue(Number(e.target.value))}
                            className="w-16 h-8 text-xs"
                            disabled={goalName === "Submission" || goalName === "Onboarding"}
                          />
                          <span className="text-gray-400">/</span>
                          <Input
                            type="number"
                            value={editTargetValue}
                            onChange={(e) => setEditTargetValue(Number(e.target.value))}
                            className="w-16 h-8 text-xs"
                          />
                          <span className="text-xs text-gray-500">{metricUnit}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-medium text-sm">
                           {instance.current_value} <span className="text-gray-400 mx-1">/</span> {instance.target_value} {metricUnit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("px-2 py-0.5 rounded-md font-normal", getStatusColor(instance.status))}>
                        {instance.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="pr-4 py-3 text-right">
                      {editingInstanceId === instance.id ? (
                        <div className="flex items-center justify-center gap-3 bg-violet-50 border border-violet-100 shadow-sm rounded-full px-3 py-1.5 w-fit ml-auto">
                          <button 
                            onClick={() => handleSave(instance.id)} 
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setEditingInstanceId(null)} 
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Cancel"
                          >
                            <span className="text-lg leading-none h-4 w-4 flex items-center justify-center">&times;</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3 bg-white border border-gray-200 shadow-sm rounded-full px-3 py-1.5 w-fit ml-auto">
                          <button 
                            onClick={() => handleEdit(instance)} 
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <div className="w-[1px] h-3 bg-gray-200"></div>
                          {/* BUTTON CHANGE: Triggers popup state instead of immediate delete */}
                          <button 
                            onClick={() => setInstanceToDelete(instance.id)} 
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>

        {/* UI ADDITION: The Confirmation Dialog */}
        <AlertDialog open={!!instanceToDelete} onOpenChange={(open) => !open && setInstanceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this goal instance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => instanceToDelete && handleDelete(instanceToDelete)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
};

export default GoalInstancesDialog;