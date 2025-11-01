import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getGoals, createGoal } from "@/lib/supabaseData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from '@/components/ui/dialog';
import { Goal, SectorType } from '@/types/goal';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, DollarSign } from 'lucide-react';

interface Step1Props {
  onNext: (goal: Goal, department: string) => void;
  onClose: () => void;
}

interface JobStatus { id: string; name: string; }

const SelectionCard = ({ label, icon, onClick, isSelected }: { label: string; icon: React.ReactNode; onClick: () => void; isSelected: boolean; }) => (
  <button 
    onClick={onClick} 
    className={`group flex items-center justify-start border rounded-xl text-left transition-all duration-300 w-full p-4 hover:border-primary hover:bg-primary-foreground ${isSelected ? "border-primary bg-primary-foreground ring-2 ring-primary" : ""}`}
  >
    <div className={`p-3 rounded-lg ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-primary"}`}>{icon}</div>
    <h3 className="font-semibold text-lg ml-4">{label}</h3>
  </button>
);

const Step1_DefineGoal: React.FC<Step1Props> = ({ onNext, onClose }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedDepartment, setSelectedDepartment] = useState<SectorType | ''>('');
  const [performanceMetric, setPerformanceMetric] = useState<'performance' | 'revenue' | ''>('');
  const [goalSelectionType, setGoalSelectionType] = useState<'existing' | 'submission' | 'onboarding' | 'other'>('existing');
  const [selectedExistingGoalId, setSelectedExistingGoalId] = useState<string>('');
  const [newGoalName, setNewGoalName] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState('');

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: async () => (await supabase.from('hr_departments').select('id, name')).data || [] });
  const { data: allGoals = [] } = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  const { data: jobSubStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['jobSubStatuses', organizationId],
    queryFn: async () => (await supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId).eq('type', 'sub').order('name')).data || [],
    enabled: selectedDepartment === 'Human Resource',
  });

  const hrGoals = allGoals.filter(g => g.sector === 'Human Resource');

  const handleProceedToStep2 = async () => {
    if (!selectedDepartment || (selectedDepartment === 'Human Resource' && !performanceMetric)) {
      toast.error("Please complete all selections for Step 1.");
      return;
    }
    setLoading(true);
    let goalToAssign: Goal | null = null;

    if (goalSelectionType === 'existing' && selectedDepartment === 'Human Resource') {
        if (!selectedExistingGoalId) { toast.error("Please select an existing goal."); setLoading(false); return; }
        goalToAssign = allGoals.find(g => g.id === selectedExistingGoalId) || null;
    } else {
        if (!selectedStatusId) { toast.error("Please select a candidate status to track."); setLoading(false); return; }
        
        let name = '';
        let dateTable = 'hr_job_candidates';
        let dateColumn = 'submission_date';

        if (goalSelectionType === 'submission') { name = 'Submission'; dateColumn = 'submission_date'; } 
        else if (goalSelectionType === 'onboarding') { name = 'Onboarding'; dateColumn = 'joining_date'; } 
        else {
            if (!newGoalName) { toast.error("Please provide a name for your new goal."); setLoading(false); return; }
            name = newGoalName;
        }
        
        const newGoalPayload = {
            name, description: `Automated goal to track ${name}.`, sector: selectedDepartment,
            metricType: 'count', metricUnit: '#', is_automated: true,
            source_table: 'hr_status_change_counts', source_value_column: 'count', source_employee_column: 'candidate_owner',
            source_filter_conditions: { sub_status_id: selectedStatusId },
            source_date_table: dateTable, source_date_column: dateColumn,
        };
        goalToAssign = await createGoal(newGoalPayload as any);
    }

    setLoading(false);
    if (goalToAssign) { onNext(goalToAssign, selectedDepartment); } 
    else { toast.error("Could not create or find the selected goal."); }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="font-semibold">1. Select Department</Label>
          <div className="space-y-2 mt-2">
            {departments.map(d => (
              <SelectionCard key={d.id} label={d.name} icon={<Briefcase size={20}/>} isSelected={selectedDepartment === d.name} onClick={() => setSelectedDepartment(d.name as SectorType)} />
            ))}
          </div>
        </div>
        
        {selectedDepartment === 'Human Resource' && (
          <div className="space-y-6">
            <div>
              <Label className="font-semibold">2. Select Performance Metric</Label>
              <div className="space-y-2 mt-2">
                <SelectionCard label="Performance by Recruiter" icon={<Briefcase size={20}/>} isSelected={performanceMetric === 'performance'} onClick={() => setPerformanceMetric('performance')} />
                <div className="opacity-50 cursor-not-allowed">
                  <SelectionCard label="Revenue by Recruiter" icon={<DollarSign size={20}/>} isSelected={false} onClick={() => {}} />
                </div>
              </div>
            </div>

            {performanceMetric === 'performance' && (
              <div className="space-y-4">
                <Label className="font-semibold">3. Choose or Create Goal</Label>
                <Select onValueChange={(v) => setGoalSelectionType(v as any)} value={goalSelectionType}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Use Existing Template</SelectItem>
                    <SelectItem value="submission">Create: Submission Goal</SelectItem>
                    <SelectItem value="onboarding">Create: Onboarding Goal</SelectItem>
                    <SelectItem value="other">Create: Other Automated Goal</SelectItem>
                  </SelectContent>
                </Select>

                {goalSelectionType === 'existing' && <Select onValueChange={setSelectedExistingGoalId}><SelectTrigger><SelectValue placeholder="Select an existing goal..."/></SelectTrigger><SelectContent>{hrGoals.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select>}
                {(goalSelectionType === 'submission' || goalSelectionType === 'onboarding') && <Select onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}><SelectTrigger><SelectValue placeholder={`Select status that counts as "${goalSelectionType}"...`}/></SelectTrigger><SelectContent>{jobSubStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
                {goalSelectionType === 'other' && <div className="space-y-2 pt-2 border-t"><Input placeholder="Enter new goal name..." value={newGoalName} onChange={e => setNewGoalName(e.target.value)} /><Select onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}><SelectTrigger><SelectValue placeholder="Select status to track..."/></SelectTrigger><SelectContent>{jobSubStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleProceedToStep2} disabled={loading || !selectedDepartment}>Next</Button>
      </DialogFooter>
    </div>
  );
};

export default Step1_DefineGoal;