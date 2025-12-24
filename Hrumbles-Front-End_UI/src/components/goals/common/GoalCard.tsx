// src/components/goals/common/GoalCard.tsx
import React, { useState, useMemo } from "react";
import { Link } from 'react-router-dom';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { MoreHorizontal, Target, Trash2, List, UserMinus, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import GoalInstancesDialog from '@/components/goals/common/GoalInstancesDialog';
import { useGoalManagement } from '@/hooks/useGoalManagement';
import { useToast } from '@/hooks/use-toast';
import { removeEmployeeFromGoal } from '@/lib/goalService';
import { GoalWithDetails, AssignedGoal, Employee } from '@/types/goal';
import { cn } from '@/lib/utils';
import EditGoalFlow from "@/components/goals/goals/EditGoalFlow";

interface GoalCardProps {
  goal: GoalWithDetails;
  onUpdate?: () => void;
  className?: string;
}

// UPDATED: Pill-shaped progress with "Less to High" Gradient
const CustomProgressBar = ({ current, target, progress, height = "h-7" }: { current: number, target: number, progress: number, height?: string }) => {
  const text = `${current} / ${target}`;
  return (
    <div className={cn("relative w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50 shadow-inner", height)}>
      {/* Background Layer: Dark gray text visible when no bar is present */}
      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{text}</span>
      </div>
      
      {/* Progress Layer: Gradient bar from lighter violet to deep indigo */}
      <div 
        className={cn(
          "absolute left-0 top-0 h-full transition-all duration-700 ease-out flex items-center justify-center overflow-hidden rounded-full",
          // GRADIENT APPLIED HERE: from-violet-400 (light) to-indigo-700 (deep/high)
          "bg-gradient-to-r from-violet-400 via-violet-600 to-indigo-700 shadow-[0_0_15px_rgba(124,58,237,0.3)]"
        )}
        style={{ width: `${progress}%` }}
      >
        {/* Foreground Text Revelation Layer */}
        <div className="absolute w-[1000%] left-0 h-full flex items-center justify-center pointer-events-none">
             <div className="w-[10%] flex items-center justify-center">
                <span className="text-[11px] font-bold text-white uppercase tracking-tight drop-shadow-sm">{text}</span>
             </div>
        </div>
      </div>
      
      {/* Percentage label logic */}
      {height === "h-7" && (
        <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
           <span className={cn("text-[10px] font-black", progress > 90 ? "text-white" : "text-gray-400")}>
             {progress}%
           </span>
        </div>
      )}
    </div>
  );
};

const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate, className }) => {
  const { toast } = useToast();
  const { handleDeleteGoal } = useGoalManagement();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInstancesDialogOpen, setIsInstancesDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const goalTypes = ["Daily", "Weekly", "Monthly", "Yearly"];
  const defaultTab = useMemo(() => goalTypes.find(type => goal.assignments?.some(a => a.goal_type === type)) || "Daily", [goal.assignments]);
  const [selectedGoalType, setSelectedGoalType] = useState<string>(defaultTab);

  const assignmentsByType = useMemo(() => {
    const groups: Record<string, AssignedGoal[]> = { Daily: [], Weekly: [], Monthly: [], Yearly: [] };
    goal.assignments?.forEach(assignment => { if (groups[assignment.goal_type]) groups[assignment.goal_type].push(assignment); });
    return groups;
  }, [goal.assignments]);

  const activeGoalTypes = useMemo(() => goalTypes.filter(type => assignmentsByType[type].length > 0), [assignmentsByType]);
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    goal.assignedTo?.forEach(e => map.set(e.id, { ...e, first_name: e.first_name || 'User', last_name: e.last_name || '' }));
    return map;
  }, [goal.assignedTo]);

  const activePeriodData = useMemo(() => {
    const today = new Date();
    return (assignmentsByType[selectedGoalType] || []).map(assignment => {
      const activeInstance = (assignment.instances || []).find(inst => 
        isWithinInterval(today, { start: startOfDay(new Date(inst.period_start)), end: endOfDay(new Date(inst.period_end)) })
      );
      return { assignment, activeInstance };
    }).filter(item => item.activeInstance);
  }, [assignmentsByType, selectedGoalType]);

  const overall = useMemo(() => {
    const current = activePeriodData.reduce((sum, d) => sum + (d.activeInstance?.current_value || 0), 0);
    const target = activePeriodData.reduce((sum, d) => sum + (d.activeInstance?.target_value || 0), 0);
    return { current, target, progress: target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0 };
  }, [activePeriodData]);

  const handleRemoveEmployeeFromGoal = async (assignedGoalId: string) => {
    const success = await removeEmployeeFromGoal(assignedGoalId);
    if (success) {
      toast({ title: "Employee Removed" });
      onUpdate?.();
    }
  };

  return (
    <>
      <Card className="flex flex-col h-full bg-white shadow-lg hover:shadow-2xl transition-all duration-500 border-none rounded-3xl overflow-hidden group">
        <CardHeader className="pb-3 pt-6 px-6">
          <div className="flex justify-between items-start">
            <Link to={`/goals/${goal.id}/${selectedGoalType}`} className={cn("block pr-4", className)}>
              <CardTitle className="text-xl font-black text-gray-800 tracking-tight group-hover:text-violet-600 transition-colors">{goal.name}</CardTitle>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-gray-400 hover:bg-violet-50"><MoreHorizontal className="h-5 w-5"/></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-none p-2">
                <DropdownMenuLabel className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="rounded-xl focus:bg-violet-50 focus:text-violet-600 font-semibold"><Edit className="h-4 w-4 mr-2" /> Edit / Assign</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsInstancesDialogOpen(true)} className="rounded-xl focus:bg-blue-50 focus:text-blue-600 font-semibold"><List className="h-4 w-4 mr-2" /> View History</DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-gray-50" />
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600 rounded-xl focus:bg-red-50 focus:text-red-600 font-semibold"><Trash2 className="h-4 w-4 mr-2" /> Delete Goal</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 border-none">{goal.sector || 'General'}</Badge>
            <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-slate-200">{activePeriodData.length} Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-grow pt-0 px-6">
          <Tabs value={selectedGoalType} onValueChange={setSelectedGoalType} className="w-full">
            <TabsList className="rounded-full bg-slate-50 p-1 mb-6 border border-slate-100 w-fit">
              {activeGoalTypes.map(type => (
                <TabsTrigger key={type} value={type} className="px-5 py-2 rounded-full text-[10px] font-black uppercase data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  {type} <span className="ml-1 opacity-50">({assignmentsByType[type].length})</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={selectedGoalType} className="space-y-6 mt-0">
              {activePeriodData.length > 0 ? (
                <>
                  <CustomProgressBar current={overall.current} target={overall.target} progress={overall.progress} />
                  
                  <div className="text-[10px] flex justify-between bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100 font-black uppercase text-slate-400 tracking-wider">
                    <div className="flex items-center"><Target className="h-3.5 w-3.5 mr-2 text-violet-400" />{goal.metric_unit || 'units'}</div>
                    <div className="flex items-center">Ends {format(new Date(activePeriodData[0]?.activeInstance?.period_end), "MMM d, yyyy")}</div>
                  </div>
                  
                  <Accordion type="single" collapsible defaultValue="employees" className="border-none">
                    <AccordionItem value="employees" className="border-none">
                      <AccordionTrigger className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] py-4 hover:no-underline hover:text-slate-500 transition-colors">
                        <div className="flex items-center">Assigned Employees <span className="ml-2 text-violet-500 bg-violet-50 px-2 rounded-full text-[10px] tracking-normal">{activePeriodData.length}</span></div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="max-h-72 pr-3">
                          <div className="space-y-5 pt-2">
                            {activePeriodData.map(({ assignment, activeInstance }) => {
                              const emp = employeeMap.get(assignment.employee_id);
                              return (
                                <div key={assignment.id} className="space-y-2 group">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="font-bold text-[11px] text-slate-700 tracking-tight">{emp?.first_name} {emp?.last_name}</span>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-3 w-3" /></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem onClick={() => handleRemoveEmployeeFromGoal(assignment.id)} className="text-red-600 text-[11px] font-bold"><UserMinus className="h-3 w-3 mr-2" />Remove</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <CustomProgressBar current={activeInstance?.current_value || 0} target={activeInstance?.target_value || 0} progress={activeInstance?.progress || 0} height="h-6" />
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active assignments</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <GoalInstancesDialog open={isInstancesDialogOpen} onOpenChange={setIsInstancesDialogOpen} goalId={goal.id} goalName={goal.name} goalType={selectedGoalType} metricUnit={goal.metric_unit || 'units'} onUpdate={onUpdate} />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-xl">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              This will permanently delete "{goal.name}" and all performance data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-2xl font-bold border-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleDeleteGoal(goal.id); onUpdate?.(); }} className="bg-red-600 hover:bg-red-700 rounded-2xl font-bold shadow-lg shadow-red-100">Delete Goal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
       <EditGoalFlow goal={goal} onClose={() => { setIsEditDialogOpen(false); onUpdate?.(); }} />
      </Dialog>
    </>
  );
};

export default GoalCard;