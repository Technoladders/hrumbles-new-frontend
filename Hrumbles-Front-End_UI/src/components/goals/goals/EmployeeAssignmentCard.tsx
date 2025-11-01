import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { isWithinInterval, format } from 'date-fns';
import { AssignedGoal, GoalInstance, GoalWithDetails } from '@/types/goal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Target, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extendEmployeeGoalTarget, removeEmployeeFromGoal } from '@/lib/goalService';

interface EmployeeAssignmentCardProps {
  assignment: AssignedGoal;
  onUpdate: () => void;
}

const EmployeeAssignmentCard: React.FC<EmployeeAssignmentCardProps> = ({ assignment, onUpdate }) => {
  const { toast } = useToast();
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [additionalTarget, setAdditionalTarget] = useState(0);

  const activeInstance: GoalInstance | undefined = useMemo(() => {
    const today = new Date();
    return (assignment.instances || []).find(inst => 
      isWithinInterval(today, { start: new Date(inst.period_start), end: new Date(inst.period_end) })
    );
  }, [assignment.instances]);

  const handleExtend = async () => {
    if (!activeInstance) {
      toast({ title: "No active period", description: "Cannot extend target as there is no active goal period for today.", variant: "destructive" });
      return;
    }
    const result = await extendEmployeeGoalTarget(activeInstance.id, additionalTarget);
    if (result) {
      toast({ title: "Target Extended Successfully" });
      onUpdate();
      setIsExtendOpen(false);
    } else {
      toast({ title: "Failed to Extend Target", variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    const success = await removeEmployeeFromGoal(assignment.id);
    if (success) {
      toast({ title: "Employee Removed Successfully" });
      onUpdate();
    } else {
      toast({ title: "Failed to Remove Employee", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <>
      <motion.div layout className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-gray-50/50">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={assignment.employee?.profile_picture_url} />
            <AvatarFallback>{getInitials(`${assignment.employee?.first_name} ${assignment.employee?.last_name}`)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{assignment.employee?.first_name} {assignment.employee?.last_name}</p>
            {activeInstance ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Today's Progress:</span>
                <Progress value={activeInstance.progress || 0} className="w-24 h-1.5" />
                <span>{activeInstance.current_value}/{activeInstance.target_value}</span>
              </div>
            ) : <p className="text-xs text-gray-400">No active period today</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeInstance && <Badge variant={activeInstance.status === 'completed' ? 'default' : 'outline'}>{activeInstance.status}</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsExtendOpen(true)} disabled={!activeInstance}><Target className="mr-2 h-4 w-4"/>Extend Target</DropdownMenuItem>
              <DropdownMenuItem onClick={handleRemove} className="text-red-500"><Trash2 className="mr-2 h-4 w-4"/>Remove Employee</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Target for {assignment.employee?.first_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">Current Target for this period: {activeInstance?.target_value}</p>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="additional-target">Additional Value</Label>
            <Input id="additional-target" type="number" value={additionalTarget} onChange={e => setAdditionalTarget(Number(e.target.value))} placeholder="e.g., 50"/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>Cancel</Button>
            <Button onClick={handleExtend}>Apply Extension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeAssignmentCard;