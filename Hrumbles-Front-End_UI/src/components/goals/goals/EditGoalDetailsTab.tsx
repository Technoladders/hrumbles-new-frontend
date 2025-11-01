import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { GoalWithDetails } from '@/types/goal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditGoalDetailsTabProps {
  goal: GoalWithDetails;
  onClose: () => void;
}

interface JobStatus { id: string; name: string; }

const EditGoalDetailsTab: React.FC<EditGoalDetailsTabProps> = ({ goal, onClose }) => {
  const queryClient = useQueryClient();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  // Form State
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description || '');
  const [selectedStatusId, setSelectedStatusId] = useState<string>(goal.source_filter_conditions?.sub_status_id || '');

  const { data: jobSubStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['jobSubStatuses', organizationId],
    queryFn: async () => (await supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId).eq('type', 'sub').order('name')).data || [],
    enabled: goal.is_automated && goal.sector === 'Human Resource',
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (updatedData: Partial<GoalWithDetails>) => {
      const { error } = await supabase.from('hr_goals').update(updatedData).eq('id', goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onClose();
    },
    onError: (error: Error) => toast.error(`Update failed: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<GoalWithDetails> = { name, description };
    if (goal.is_automated) {
      payload.source_filter_conditions = { ...goal.source_filter_conditions, sub_status_id: selectedStatusId };
    }
    updateGoalMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="goal-name">Goal Name</Label>
          <Input id="goal-name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="goal-description">Description</Label>
          <Textarea id="goal-description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {goal.is_automated && goal.sector === 'Human Resource' && (
          <div>
            <Label>Tracked Candidate Status</Label>
            <Select value={selectedStatusId} onValueChange={setSelectedStatusId} disabled={isLoadingStatuses}>
              <SelectTrigger><SelectValue placeholder="Select a status to track..." /></SelectTrigger>
              <SelectContent>
                {jobSubStatuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={updateGoalMutation.isPending}>
          {updateGoalMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default EditGoalDetailsTab;