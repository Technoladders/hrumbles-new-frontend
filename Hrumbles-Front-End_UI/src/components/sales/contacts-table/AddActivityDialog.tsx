// AddActivityDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import type { SimpleContact } from '@/types/simple-contact.types';
import type { ActivityType } from '@/types/contact-detail.types';
import { Phone, Mail, Calendar, MessageSquare, CheckSquare, Plus } from 'lucide-react';

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: SimpleContact;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: 'call', label: 'Phone Call', icon: <Phone className="h-4 w-4" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { value: 'meeting', label: 'Meeting', icon: <Calendar className="h-4 w-4" /> },
  { value: 'linkedin_message', label: 'LinkedIn Message', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'task', label: 'Task', icon: <CheckSquare className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Plus className="h-4 w-4" /> },
];

export const AddActivityDialog: React.FC<AddActivityDialogProps> = ({ open, onOpenChange, contact }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  
  const [activityType, setActivityType] = React.useState<ActivityType>('call');
  const [description, setDescription] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [duration, setDuration] = React.useState<string>('');
  const [outcome, setOutcome] = React.useState('');

  const addActivityMutation = useMutation({
    mutationFn: async (activityData: {
      activity_type: ActivityType;
      description: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('contact_activities')
        .insert({
          contact_id: contact.id,
          organization_id,
          activity_type: activityData.activity_type,
          description: activityData.description,
          metadata: activityData.metadata || {},
          created_by: currentUser?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactActivities', contact.id] });
      toast({ title: 'Activity Logged', description: 'Your activity has been recorded successfully.' });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Log Activity',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setActivityType('call');
    setDescription('');
    setSubject('');
    setDuration('');
    setOutcome('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please enter a description for the activity.',
        variant: 'destructive',
      });
      return;
    }

    const metadata: Record<string, any> = {};
    if (subject) metadata.subject = subject;
    if (duration) metadata.duration = parseInt(duration);
    if (outcome) metadata.outcome = outcome;

    addActivityMutation.mutate({
      activity_type: activityType,
      description,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Log Activity for {contact.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Activity Type</Label>
              <Select value={activityType} onValueChange={(value) => setActivityType(value as ActivityType)}>
                <SelectTrigger id="activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        {type.icon}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(activityType === 'email' || activityType === 'meeting') && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder={activityType === 'email' ? 'Email subject' : 'Meeting subject'}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            {(activityType === 'call' || activityType === 'meeting') && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What happened during this activity?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {(activityType === 'call' || activityType === 'meeting') && (
              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger id="outcome">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addActivityMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {addActivityMutation.isPending ? 'Logging...' : 'Log Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};