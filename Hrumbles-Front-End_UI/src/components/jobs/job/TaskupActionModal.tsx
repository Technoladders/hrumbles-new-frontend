import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Defines the configuration for the modal's content
export interface TaskupModalConfig {
  title: string;
  description: string;
  fields: Array<'date' | 'reason' | 'feedback' | 'datetime' | 'billing_reason'>;
}

interface TaskupActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  config: TaskupModalConfig | null;
  candidateName: string;
}

export const TaskupActionModal: React.FC<TaskupActionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  config,
  candidateName,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  // Reset state whenever the modal opens with a new config
  useEffect(() => {
    if (isOpen) {
      setDate('');
      setTime('');
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const data: Record<string, any> = {};
    if (config?.fields.includes('date')) data.action_date = date;
    if (config?.fields.includes('datetime')) {
        data.interview_date = date;
        data.interview_time = time;
    }
    if (config?.fields.includes('reason')) data.reason = reason;
    if (config?.fields.includes('feedback')) data.feedback = reason; // Use the same state for simplicity
    if (config?.fields.includes('billing_reason')) data.billing_reason = reason;

    onSubmit(data);
  };
  
  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            For candidate: <span className="font-semibold">{candidateName}</span>. {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {config.fields.includes('datetime') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="action-date">Interview Date</Label>
                <Input id="action-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-time">Interview Time</Label>
                <Input id="action-time" type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </>
          )}
          {config.fields.includes('date') && (
            <div className="space-y-2">
              <Label htmlFor="action-date">Date</Label>
              <Input id="action-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          )}
          {(config.fields.includes('reason') || config.fields.includes('feedback') || config.fields.includes('billing_reason')) && (
            <div className="space-y-2">
              <Label htmlFor="action-reason">
                {config.fields.includes('reason') ? 'Reason' : config.fields.includes('billing_reason') ? 'Reason for Pending' : 'Feedback'}
              </Label>
              <Textarea
                id="action-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={`Enter ${config.fields.includes('reason') ? 'reason' : 'feedback'}...`}
                className="min-h-[100px]"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};