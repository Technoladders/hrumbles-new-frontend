import React, { useState, useMemo } from 'react';
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assignGoalToEmployees } from "@/lib/supabaseData";
import { Employee, EmployeeGoalTarget, GoalWithDetails, GoalType } from "@/types/goal";
import { format } from "date-fns";
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import EmployeeAssignmentCard from './EmployeeAssignmentCard';
import GoalPeriodSelector from '../wizard/GoalPeriodSelector';

interface ManageAssignmentsTabProps {
  goal: GoalWithDetails;
  onAssignmentUpdate: () => void;
}

const ManageAssignmentsTab: React.FC<ManageAssignmentsTabProps> = ({ goal, onAssignmentUpdate }) => {
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [periodType, setPeriodType] = useState<GoalType | ''>('');
  const [period, setPeriod] = useState<{ start: Date, end: Date } | null>(null);
  const [employeeTargets, setEmployeeTargets] = useState<Map<string, number | undefined>>(new Map());
  const queryClient = useQueryClient();

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => (await supabase.from('hr_employees').select(`id, first_name, last_name, profile_picture_url, hr_departments(name)`)).data?.map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}`, department: e.hr_departments?.name, avatar: e.profile_picture_url, first_name: e.first_name, last_name: e.last_name })) || []
  });

  const assignmentsByPeriod = useMemo(() => {
    return (goal.assignments || []).reduce((acc, asg) => {
      const type = asg.goal_type || 'Uncategorized';
      if (!acc[type]) acc[type] = [];
      acc[type].push(asg);
      return acc;
    }, {} as Record<string, GoalWithDetails['assignments']>);
  }, [goal.assignments]);

  const alreadyAssignedIds = useMemo(() => new Set(goal.assignments.map(a => a.employee_id)), [goal.assignments]);
  const availableEmployees = useMemo(() => allEmployees.filter(e => e.department === goal.sector && !alreadyAssignedIds.has(e.id)), [allEmployees, goal.sector, alreadyAssignedIds]);

  const addAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (selectedEmployees.length === 0 || !period || !periodType) {
        throw new Error("Please select employees, a period, and set targets.");
      }
      const employeeGoalTargets: EmployeeGoalTarget[] = selectedEmployees.map(employee => {
        const targetValue = employeeTargets.get(employee.id);
        if (targetValue === undefined || isNaN(targetValue) || targetValue <= 0) {
          throw new Error(`Please set a valid, positive target for ${employee.name}.`);
        }
        return { employee, targetValue };
      });
      return await assignGoalToEmployees(goal.id, selectedEmployees.map(e=>e.id), periodType, employeeGoalTargets, format(period.start, 'yyyy-MM-dd'), format(period.end, 'yyyy-MM-dd'));
    },
    onSuccess: () => {
      toast.success("New employees assigned successfully!");
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onAssignmentUpdate();
      setSelectedEmployees([]);
      setEmployeeTargets(new Map());
      setPeriod(null);
      setPeriodType('');
    },
    onError: (error: Error) => toast.error(`Assignment failed: ${error.message}`),
  });

  const handleEmployeeSelection = (employeeId: string) => {
    const employee = availableEmployees.find(e => e.id === employeeId);
    if (employee && !selectedEmployees.some(e => e.id === employee.id)) {
      setSelectedEmployees(prev => [...prev, employee]);
      setEmployeeTargets(prev => new Map(prev.set(employee.id, goal.targetValue || 0)));
    }
  };

  const handleRemoveStagedEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== employeeId));
    setEmployeeTargets(prev => {
      const newMap = new Map(prev);
      newMap.delete(employeeId);
      return newMap;
    });
  };

  const handleTargetChange = (employeeId: string, value: string) => {
    setEmployeeTargets(prev => new Map(prev.set(employeeId, parseFloat(value) || undefined)));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[450px]">
      {/* Column 1: Existing Assignments */}
      <div>
        <h3 className="font-semibold mb-4 text-lg">Existing Assignments</h3>
        <ScrollArea className="h-[400px] pr-4">
          <Accordion type="multiple" className="w-full space-y-3">
            {Object.entries(assignmentsByPeriod).map(([type, assignments]) => (
              <AccordionItem value={type} key={type} className="border rounded-lg bg-background">
                <AccordionTrigger className="px-4 text-base hover:no-underline">{type} Assignments ({assignments.length})</AccordionTrigger>
                <AccordionContent className="p-2 space-y-2">
                  {(assignments || []).map(asg => <EmployeeAssignmentCard key={asg.id} assignment={asg} onUpdate={onAssignmentUpdate} />)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {goal.assignments.length === 0 && <p className="text-gray-500 text-center py-12">No employees assigned to this goal yet.</p>}
        </ScrollArea>
      </div>

      {/* Column 2: Add New Employees */}
      <div className="space-y-4 border-l lg:pl-8">
        <h3 className="font-semibold mb-4 text-lg flex items-center"><UserPlus className="mr-2 h-5 w-5 text-primary"/> Add New Employees</h3>
        <div className="space-y-4">
            <div><Label>1. Select Period Type</Label><Select value={periodType} onValueChange={v => setPeriodType(v as GoalType)}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="e.g., Monthly"/></SelectTrigger><SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Yearly">Yearly</SelectItem></SelectContent></Select></div>
            {periodType && <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}><Label>2. Select Date Range</Label><GoalPeriodSelector periodType={periodType} onPeriodChange={setPeriod} /></motion.div>}
            {period && <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}><Label>3. Select Employees</Label><Select onValueChange={handleEmployeeSelection}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="Add an employee..." /></SelectTrigger><SelectContent>{availableEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></motion.div>}
            
            {/* --- THIS IS THE CORRECTED SECTION --- */}
            {selectedEmployees.length > 0 && 
              <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                <Label>4. Set Target Values ({goal.metric_unit})</Label>
                <div className="space-y-2 border rounded-md p-4 mt-1.5 max-h-40 overflow-y-auto">
                  {selectedEmployees.map(employee => (
                    <div key={employee.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                      <p className="font-medium truncate">{employee.name}</p>
                      <Input 
                        type="number" 
                        placeholder="Target" 
                        value={employeeTargets.get(employee.id) || ''} 
                        onChange={e => handleTargetChange(employee.id, e.target.value)} 
                        className="text-center h-10"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedEmployee(employee.id)}>
                        <X className="h-4 w-4 text-red-500"/>
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            }
            {/* --- END OF CORRECTION --- */}
            
            <div className="pt-4">
                <Button className="w-full h-12 text-base" onClick={() => addAssignmentMutation.mutate()} disabled={addAssignmentMutation.isPending || selectedEmployees.length === 0}>
                    {addAssignmentMutation.isPending ? "Assigning..." : `Assign to ${selectedEmployees.length} Employee(s)`}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAssignmentsTab;