import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import QuillTableBetterDemo from '@/utils/QuillTableBetterDemo';

export interface JobLog {
  jobId: string;
  jobTitle: string;
  clientName: string;
  submissions: { name: string; id: string }[];
  hours: number;
  minutes: number;
  challenges: string;
}

interface JobLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobLog: JobLog | null;
  onSave: (updatedLog: JobLog) => void;
}

export const JobLogDialog: React.FC<JobLogDialogProps> = ({ open, onOpenChange, jobLog, onSave }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [challenges, setChallenges] = useState('');
 
  // FIX: State to prevent duplicate toolbar
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  useEffect(() => {
    if (jobLog) {
      setHours(jobLog.hours || 0);
      setMinutes(jobLog.minutes || 0);
      setChallenges(jobLog.challenges || '');
    }
  }, [jobLog]);
 
  // FIX: Delay editor rendering until the modal is fully mounted
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsEditorVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsEditorVisible(false);
    }
  }, [open]);

  if (!jobLog) return null;

  const handleSave = () => {
    onSave({ ...jobLog, hours, minutes, challenges });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Log Time for: {jobLog.jobTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{jobLog.clientName}</p>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {jobLog.submissions.length > 0 && (
            <div>
              <Label className="font-semibold">Profiles Submitted Today</Label>
              <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                {jobLog.submissions.map(s => <li key={s.id}>{s.name}</li>)}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" type="number" value={hours} onChange={e => setHours(parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minutes">Minutes</Label>
              <Input id="minutes" type="number" value={minutes} onChange={e => setMinutes(parseInt(e.target.value) || 0)} min="0" max="59" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="challenges">Challenges / Notes</Label>
            <div className="mt-1 border rounded-md">
              {/* FIX: Conditionally render the editor */}
              {isEditorVisible && (
                <QuillTableBetterDemo
                    value={challenges}
                    onChange={setChallenges}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};