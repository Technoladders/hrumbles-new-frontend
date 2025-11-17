import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createGoal, getGoals } from "@/lib/supabaseData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from '@/components/ui/dialog';
import { Goal, GoalType } from '@/types/goal';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, PlusCircle, BookOpen, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import GoalPeriodSelector from './GoalPeriodSelector';
import { GoalDefinition } from './CreateAndAssignGoalWizard';
import { AUTOMATION_SOURCES } from '@/lib/goalAutomationConfig';

interface Step2Props {
  department: string;
  metric: string;
  onNext: (goalDef: GoalDefinition, period: { type: GoalType, start: Date, end: Date }) => void;
  onBack: () => void;
}

const SelectionCard = ({ label, icon, onClick, isSelected }: { label: string; icon: React.ReactNode; onClick: () => void; isSelected: boolean; }) => (
  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(`group flex items-center justify-start border rounded-xl text-left transition-all duration-300 w-full p-4`, isSelected ? "border-primary bg-primary-foreground ring-2 ring-primary" : "hover:border-primary")}>
    <div className={cn(`p-3 rounded-lg`, isSelected ? "bg-primary text-white" : "bg-gray-100 text-primary")}>{icon}</div>
    <h3 className="font-semibold text-lg ml-4">{label}</h3>
  </motion.button>
);

const Step2_DefineGoalAndPeriod: React.FC<Step2Props> = ({ department, metric, onNext, onBack }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [loading, setLoading] = useState(false);
  const [isGoalDefined, setIsGoalDefined] = useState(false);
 
  const [goalSelectionType, setGoalSelectionType] = useState<'existing' | 'new'>(department === 'Human Resource' ? 'existing' : 'new');
  const [selectedExistingGoalId, setSelectedExistingGoalId] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
 
  const [periodType, setPeriodType] = useState<GoalType | ''>('');
  const [period, setPeriod] = useState<{ start: Date, end: Date } | null>(null);
  const isHrFlow = department === 'Human Resource';
  const sourceConfig = useMemo(() => AUTOMATION_SOURCES.find(s => s.value === metric), [metric]);
  const { data: allGoals = [] } = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  
  const { data: allStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['jobStatuses', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_statuses')
        .select('id, name, color, type, parent_id, display_order')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });
      return data || [];
    },
    enabled: isHrFlow,
  });

  const groupedStatuses = useMemo(() => {
    const mains = allStatuses.filter((s: any) => s.type === 'main').sort((a: any, b: any) => a.display_order - b.display_order);
    return mains.map((main: any) => ({
      main,
      subs: allStatuses
        .filter((s: any) => s.type === 'sub' && s.parent_id === main.id)
        .sort((a: any, b: any) => a.display_order - b.display_order),
    })).filter((g: any) => g.subs.length > 0);
  }, [allStatuses]);

  console.log('groupedStatuses', groupedStatuses);
 
  const relevantGoals = allGoals.filter(g => g.sector === department);
  const handleConfirmGoal = () => {
    setIsGoalDefined(true);
  };
  const handleProceed = async () => {
    if (!period) { toast.error("Please select a date range."); return; }
    let goalDef: GoalDefinition | null = null;
   
    if (goalSelectionType === 'existing') {
        const existingGoal = allGoals.find(g => g.id === selectedExistingGoalId);
        if (!existingGoal) { toast.error("Selected goal not found."); return; }
        goalDef = { type: 'existing', id: existingGoal.id, name: existingGoal.name };
    } else {
        if (!newGoalName || !selectedStatusId) { toast.error("Please provide a name and select a status/stage."); return; }
       
        let payload = {};
        if (isHrFlow) {
            payload = { name: newGoalName, description: `Automated goal for ${newGoalName}`, sector: department as any, metricType: 'count', metricUnit: '#', is_automated: true, source_table: 'hr_status_change_counts', source_value_column: 'count', source_employee_column: 'candidate_owner', source_filter_conditions: { sub_status_id: selectedStatusId }, source_date_table: 'hr_job_candidates', source_date_column: 'submission_date' };
        } else if (sourceConfig) {
            payload = { name: newGoalName, description: `Automated goal for ${sourceConfig.label}`, sector: department as any, metricType: 'count', metricUnit: '#', is_automated: true, source_table: sourceConfig.sourceTable, source_value_column: sourceConfig.valueColumn, source_employee_column: sourceConfig.employeeColumn, source_date_column: sourceConfig.dateColumn, source_filter_conditions: { filter_column: sourceConfig.filterColumn, filter_value: selectedStatusId } };
        }
        goalDef = { type: 'new', name: newGoalName, payload };
    }
   
    if (goalDef) { onNext(goalDef, { type: periodType as GoalType, ...period }); }
    else { toast.error("Could not define the goal."); }
  };
 
  const renderGoalCreationUI = () => {
      if (isHrFlow) {
          // Keep the rich HR flow with multiple creation options
          return (
              <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectionCard label="Use Existing Template" icon={<BookOpen size={20}/>} isSelected={goalSelectionType === 'existing'} onClick={() => setGoalSelectionType('existing')} />
                      <SelectionCard label="Create New Goal" icon={<PlusCircle size={20}/>} isSelected={goalSelectionType === 'new'} onClick={() => setGoalSelectionType('new')} />
                  </div>
                  {goalSelectionType === 'existing' && <Select onValueChange={setSelectedExistingGoalId}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select an existing HR goal..."/></SelectTrigger><SelectContent>{relevantGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>}
                  {goalSelectionType === 'new' && <div className="space-y-3 pt-2 border-t"><Input className="h-12 text-base" placeholder="Enter new goal name..." value={newGoalName} onChange={e => setNewGoalName(e.target.value)} /><Select onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select HR status to track..."/></SelectTrigger><SelectContent>{groupedStatuses.map((group: any) => (<div key={group.main.id} className="py-1"><div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-gray-200">{group.main.name}</div>{group.subs.map((sub: any) => (<SelectItem key={sub.id} value={sub.id} className="pl-8"><div className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: sub.color }}></div>{sub.name}</div></SelectItem>))}</div>))}</SelectContent></Select></div>}
              </div>
          );
      }
      if (sourceConfig) {
          // Simpler flow for Sales & Marketing
          return (
              <div className="space-y-3">
                  <Input className="h-12 text-base" placeholder="Enter new goal name (e.g., 'Q4 Leads')" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} />
                  <Select onValueChange={setSelectedStatusId}>
                      <SelectTrigger className="h-12 text-base"><SelectValue placeholder={`Select ${sourceConfig.label} stage to track...`}/></SelectTrigger>
                      <SelectContent>{sourceConfig.statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
          );
      }
      return null;
  };
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {!isGoalDefined ? (
          <motion.div key="defineGoal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
            <Label className="font-semibold text-lg flex items-center"><BookOpen className="mr-3 h-5 w-5 text-primary"/>1. Define the Goal</Label>
            {renderGoalCreationUI()}
            <div className="flex justify-end pt-4"><Button onClick={handleConfirmGoal} size="lg">Confirm Goal <CheckCircle className="ml-2 h-5 w-5"/></Button></div>
          </motion.div>
        ) : (
          <motion.div key="setPeriod" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Label className="font-semibold text-lg flex items-center"><Clock className="mr-3 h-5 w-5 text-primary"/>2. Set Assignment Period</Label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as GoalType[]).map(type => (
                     <Button key={type} variant={periodType === type ? 'default' : 'outline'} className="h-14 text-base" onClick={() => setPeriodType(type)}>{type}</Button>
                 ))}
             </div>
            {periodType && (
              <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="pt-2">
                  <Label className="font-medium">Select Date Range for <span className="text-primary font-semibold">{periodType}</span> Periods</Label>
                  <GoalPeriodSelector periodType={periodType} onPeriodChange={setPeriod} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <DialogFooter className="pt-8">
        <Button variant="outline" onClick={isGoalDefined ? () => setIsGoalDefined(false) : onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Button onClick={handleProceed} disabled={loading || !isGoalDefined || !period}>Next</Button>
      </DialogFooter>
    </div>
  );
};

export default Step2_DefineGoalAndPeriod;