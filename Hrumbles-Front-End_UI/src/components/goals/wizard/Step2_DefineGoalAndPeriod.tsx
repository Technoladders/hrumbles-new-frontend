import React, { useState } from 'react';
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
  
  const [goalSelectionType, setGoalSelectionType] = useState<'existing' | 'submission' | 'onboarding' | 'other' | ''>('');
  const [selectedExistingGoalId, setSelectedExistingGoalId] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');
  
  const [periodType, setPeriodType] = useState<GoalType | ''>('');
  const [period, setPeriod] = useState<{ start: Date, end: Date } | null>(null);

  const { data: allGoals = [] } = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  const { data: jobSubStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['jobSubStatuses', organizationId],
    queryFn: async () => (await supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId).eq('type', 'sub').order('name')).data || [],
    enabled: department === 'Human Resource',
  });
  const hrGoals = allGoals.filter(g => g.sector === department);

  const handleConfirmGoal = () => {
    if (!goalSelectionType || (goalSelectionType === 'existing' && !selectedExistingGoalId) || (goalSelectionType !== 'existing' && !selectedStatusId) || (goalSelectionType === 'other' && !newGoalName)) {
        toast.error("Please complete all fields for the goal definition.");
        return;
    }
    setIsGoalDefined(true);
  };

   const handleProceed = async () => {
    if (!period) { toast.error("Please select a date range."); return; }

    let goalDef: GoalDefinition | null = null;
    
    if (goalSelectionType === 'existing') {
        if (!selectedExistingGoalId) { toast.error("Please select an existing goal."); return; }
        const existingGoal = allGoals.find(g => g.id === selectedExistingGoalId);
        if (!existingGoal) { toast.error("Selected goal not found."); return; }
        goalDef = {
            type: 'existing',
            id: existingGoal.id,
            name: existingGoal.name,
        };
    } else {
        if (!selectedStatusId) { toast.error("Please select a status to track."); return; }
        let name = '', dateColumn = 'submission_date';

        if (goalSelectionType === 'submission') { name = 'Submission'; dateColumn = 'submission_date'; }
        else if (goalSelectionType === 'onboarding') { name = 'Onboarding'; dateColumn = 'joining_date'; }
        else {
            if (!newGoalName) { toast.error("Please name your new goal."); return; }
            name = newGoalName;
        }

        goalDef = {
            type: 'new',
            name: name,
            payload: { // This is the data packet we will send to step 3
                name, description: `Automated goal for ${name}`, sector: department as any,
                metricType: 'count', metricUnit: '#', is_automated: true,
                source_table: 'hr_status_change_counts', source_value_column: 'count',
                source_employee_column: 'candidate_owner',
                source_filter_conditions: { sub_status_id: selectedStatusId },
                source_date_table: 'hr_job_candidates', source_date_column: dateColumn,
            }
        };
    }
    
    if (goalDef) {
      onNext(goalDef, { type: periodType as GoalType, ...period });
    } else {
      toast.error("Could not define the goal. Please try again.");
    }
  };
  
  return (
    <div className="space-y-6">
      <AnimatePresence>
        {!isGoalDefined ? (
          <motion.div key="defineGoal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
            <Label className="font-semibold text-lg flex items-center"><BookOpen className="mr-3 h-5 w-5 text-primary"/>1. Define the Goal</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectionCard label="Use Existing Template" icon={<BookOpen size={20}/>} isSelected={goalSelectionType === 'existing'} onClick={() => setGoalSelectionType('existing')} />
                <SelectionCard label="Create: Submission Goal" icon={<PlusCircle size={20}/>} isSelected={goalSelectionType === 'submission'} onClick={() => setGoalSelectionType('submission')} />
                <SelectionCard label="Create: Onboarding Goal" icon={<PlusCircle size={20}/>} isSelected={goalSelectionType === 'onboarding'} onClick={() => setGoalSelectionType('onboarding')} />
                <SelectionCard label="Create: Other Goal" icon={<PlusCircle size={20}/>} isSelected={goalSelectionType === 'other'} onClick={() => setGoalSelectionType('other')} />
            </div>
            
            {goalSelectionType && <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="pt-2 space-y-3">
                {goalSelectionType === 'existing' && <Select onValueChange={setSelectedExistingGoalId}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select an existing goal..."/></SelectTrigger><SelectContent>{hrGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>}
                {(goalSelectionType === 'submission' || goalSelectionType === 'onboarding') && <Select onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}><SelectTrigger className="h-12 text-base"><SelectValue placeholder={`Select status that counts as "${goalSelectionType}"...`}/></SelectTrigger><SelectContent>{jobSubStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
                {goalSelectionType === 'other' && <div className="space-y-3 pt-2 border-t"><Input className="h-12 text-base" placeholder="Enter new goal name..." value={newGoalName} onChange={e => setNewGoalName(e.target.value)} /><Select onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}><SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select status to track..."/></SelectTrigger><SelectContent>{jobSubStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>}
                <div className="flex justify-end pt-2"><Button onClick={handleConfirmGoal} size="lg">Confirm Goal <CheckCircle className="ml-2 h-5 w-5"/></Button></div>
            </motion.div>}
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