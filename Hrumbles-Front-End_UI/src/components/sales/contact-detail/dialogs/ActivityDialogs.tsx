// Hrumbles-Front-End_UI/src/components/sales/contact-detail/dialogs/ActivityDialogs.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Phone, 
  Mail,
  StickyNote,
  Calendar,
  CheckSquare,
  Minus, 
  Maximize2, 
  X, 
  ChevronDown,
  Loader2,
  User,
  Clock,
  Bell
} from 'lucide-react';
import { HubSpotRichTextEditor, HubSpotEditorRef } from '../editor/HubSpotRichTextEditor';
import { cn } from '@/lib/utils';
import { format, addBusinessDays } from 'date-fns';

// Import editor styles
import '../editor/hubspot-editor.css';

// =====================
// TYPES
// =====================

export type ActivityType = 'call' | 'email' | 'note' | 'task' | 'meeting';

export interface ActivityLogData {
  type: ActivityType;
  title: string;
  description: string;
  descriptionHtml: string;
  metadata: Record<string, any>;
  createFollowUp?: {
    taskType: string;
    dueDate: string;
    dueTime: string;
  };
}

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  onSubmit: (data: ActivityLogData) => Promise<void>;
  isSubmitting?: boolean;
}

// =====================
// CONSTANTS
// =====================

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'busy', label: 'Busy' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'left_voicemail', label: 'Left Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'left_message', label: 'Left Message' },
];

const CALL_DIRECTIONS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

const DURATIONS = [
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

const MEETING_OUTCOMES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TASK_TYPES = [
  { value: 'to-do', label: 'To-do' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
];

const PRIORITIES = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const FOLLOW_UP_OPTIONS = [
  { value: '1', label: 'Tomorrow' },
  { value: '2', label: 'In 2 business days' },
  { value: '3', label: 'In 3 business days' },
  { value: '5', label: 'In 1 week' },
  { value: '10', label: 'In 2 weeks' },
];

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'At time of task' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
];

// =====================
// HELPER FUNCTIONS
// =====================

const getInitials = (name: string) => {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
};

const getActivityConfig = (type: ActivityType) => {
  const configs = {
    call: { 
      icon: Phone, 
      color: 'text-amber-600', 
      bg: 'bg-amber-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      title: 'Log Call'
    },
    email: { 
      icon: Mail, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      title: 'Log Email'
    },
    note: { 
      icon: StickyNote, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-purple-600 hover:bg-purple-700',
      title: 'Create Note'
    },
    task: { 
      icon: CheckSquare, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      title: 'Create Task'
    },
    meeting: { 
      icon: Calendar, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
      title: 'Log Meeting'
    },
  };
  return configs[type];
};

// =====================
// LOG CALL DIALOG
// =====================

export const LogCallDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [outcome, setOutcome] = useState('');
  const [direction, setDirection] = useState('outbound');
  const [duration, setDuration] = useState('');
  const [activityDate, setActivityDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('call');

  const resetForm = useCallback(() => {
    setOutcome('');
    setDirection('outbound');
    setDuration('');
    setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setCreateFollowUp(false);
    setFollowUpTaskType('to-do');
    setFollowUpDays('3');
    setHasContent(false);
    editorRef.current?.clear();
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      type: 'call',
      title: `Call: ${CALL_OUTCOMES.find(o => o.value === outcome)?.label || 'Logged'}`,
      description: text,
      descriptionHtml: html,
      metadata: {
        outcome,
        direction,
        duration,
        activityDate,
      }
    };

    if (createFollowUp) {
      const futureDate = addBusinessDays(new Date(), parseInt(followUpDays));
      data.createFollowUp = {
        taskType: followUpTaskType,
        dueDate: format(futureDate, 'yyyy-MM-dd'),
        dueTime: '09:00',
      };
    }

    await onSubmit(data);
    handleClose();
  }, [outcome, direction, duration, activityDate, createFollowUp, followUpTaskType, followUpDays, onSubmit, handleClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden",
          isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] rounded-lg",
          isMinimized && "h-auto"
        )}
      >
        {/* Header */}
        <DialogHeader 
          title={config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={handleClose}
        />

        {!isMinimized && (
          <>
            {/* Form Fields */}
            <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Contacted">
                  <ContactSelector contact={contact} />
                </FormField>
                <FormField label="Call Outcome">
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>
                      {CALL_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Call Direction">
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALL_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Activity Date" icon={<Calendar size={12} />}>
                  <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="h-9 text-sm" />
                </FormField>
                <FormField label="Duration" icon={<Clock size={12} />}>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select duration" /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>

            {/* Editor */}
            <div className="px-4 py-3 bg-gray-50">
              <HubSpotRichTextEditor
                ref={editorRef}
                placeholder="Start typing to log a call..."
                onChange={(html, text) => setHasContent(text.trim().length > 0)}
                minHeight="120px"
              />
            </div>

            {/* Footer */}
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp}
              setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType}
              setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays}
              setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={!hasContent}
              buttonText="Log call"
              buttonClass={config.buttonBg}
            />
          </>
        )}

        {isMinimized && (
          <div className="px-4 py-2 bg-white flex items-center justify-between">
            <span className="text-sm text-gray-600">Call with {contact?.name}</span>
            <Badge variant="secondary" className="text-xs">Draft</Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// LOG EMAIL DIALOG
// =====================

export const LogEmailDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [subject, setSubject] = useState('');
  const [activityDate, setActivityDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('email');

  const resetForm = useCallback(() => {
    setSubject('');
    setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setCreateFollowUp(false);
    setFollowUpTaskType('to-do');
    setFollowUpDays('3');
    setHasContent(false);
    editorRef.current?.clear();
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!subject.trim()) return;

    const data: ActivityLogData = {
      type: 'email',
      title: subject,
      description: text,
      descriptionHtml: html,
      metadata: {
        subject,
        activityDate,
      }
    };

    if (createFollowUp) {
      const futureDate = addBusinessDays(new Date(), parseInt(followUpDays));
      data.createFollowUp = {
        taskType: followUpTaskType,
        dueDate: format(futureDate, 'yyyy-MM-dd'),
        dueTime: '09:00',
      };
    }

    await onSubmit(data);
    handleClose();
  }, [subject, activityDate, createFollowUp, followUpTaskType, followUpDays, onSubmit, handleClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden",
        isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] rounded-lg",
        isMinimized && "h-auto"
      )}>
        <DialogHeader 
          title={config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={handleClose}
        />

        {!isMinimized && (
          <>
            <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="To">
                  <ContactSelector contact={contact} />
                </FormField>
                <FormField label="Activity Date" icon={<Calendar size={12} />}>
                  <Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="h-9 text-sm" />
                </FormField>
              </div>
              <FormField label="Subject">
                <Input placeholder="Email subject..." value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" />
              </FormField>
            </div>

            <div className="px-4 py-3 bg-gray-50">
              <HubSpotRichTextEditor
                ref={editorRef}
                placeholder="Enter email content..."
                onChange={(html, text) => setHasContent(text.trim().length > 0)}
                minHeight="150px"
              />
            </div>

            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp}
              setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType}
              setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays}
              setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={!subject.trim()}
              buttonText="Log email"
              buttonClass={config.buttonBg}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// CREATE NOTE DIALOG
// =====================

export const CreateNoteDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('note');

  const resetForm = useCallback(() => {
    setCreateFollowUp(false);
    setFollowUpTaskType('to-do');
    setFollowUpDays('3');
    setHasContent(false);
    editorRef.current?.clear();
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      type: 'note',
      title: 'Note',
      description: text,
      descriptionHtml: html,
      metadata: {}
    };

    if (createFollowUp) {
      const futureDate = addBusinessDays(new Date(), parseInt(followUpDays));
      data.createFollowUp = {
        taskType: followUpTaskType,
        dueDate: format(futureDate, 'yyyy-MM-dd'),
        dueTime: '09:00',
      };
    }

    await onSubmit(data);
    handleClose();
  }, [createFollowUp, followUpTaskType, followUpDays, onSubmit, handleClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden",
        isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] rounded-lg",
        isMinimized && "h-auto"
      )}>
        <DialogHeader 
          title={config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={handleClose}
        />

        {!isMinimized && (
          <>
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <div className="text-sm">
                <span className="text-gray-500">For: </span>
                <span className="font-medium text-gray-900">{contact?.name}</span>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50">
              <HubSpotRichTextEditor
                ref={editorRef}
                placeholder="Write your note here..."
                onChange={(html, text) => setHasContent(text.trim().length > 0)}
                minHeight="180px"
              />
            </div>

            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp}
              setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType}
              setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays}
              setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={!hasContent}
              buttonText="Create note"
              buttonClass={config.buttonBg}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// CREATE TASK DIALOG
// =====================

export const CreateTaskDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('to-do');
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('09:00');
  const [reminder, setReminder] = useState('none');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const config = getActivityConfig('task');

  const resetForm = useCallback(() => {
    setTitle('');
    setTaskType('to-do');
    setPriority('none');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setDueTime('09:00');
    setReminder('none');
    editorRef.current?.clear();
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';

    const data: ActivityLogData = {
      type: 'task',
      title,
      description: text,
      descriptionHtml: html,
      metadata: {
        taskType,
        priority,
        dueDate,
        dueTime,
        reminder,
        status: 'pending'
      }
    };

    await onSubmit(data);
    handleClose();
  }, [title, taskType, priority, dueDate, dueTime, reminder, onSubmit, handleClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden",
        isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] rounded-lg",
        isMinimized && "h-auto"
      )}>
        <DialogHeader 
          title={config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={handleClose}
        />

        {!isMinimized && (
          <>
            <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
              <FormField label="Task Title *">
                <Input placeholder="Enter your task..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Due Date">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
                </FormField>
                <FormField label="Due Time">
                  <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9 text-sm" />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Task Type">
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Priority">
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Reminder" icon={<Bell size={12} />}>
                  <Select value={reminder} onValueChange={setReminder}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REMINDER_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Notes</Label>
              <HubSpotRichTextEditor
                ref={editorRef}
                placeholder="Add task notes..."
                minHeight="100px"
              />
            </div>

            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Associated with: <span className="font-medium text-gray-900">{contact?.name}</span>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim()}
                  className={cn("h-9 px-6", config.buttonBg)}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create task
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// LOG MEETING DIALOG
// =====================

export const LogMeetingDialog: React.FC<BaseDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [duration, setDuration] = useState('30');
  const [startTime, setStartTime] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('meeting');

  const resetForm = useCallback(() => {
    setTitle('');
    setOutcome('');
    setDuration('30');
    setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setCreateFollowUp(false);
    setFollowUpTaskType('to-do');
    setFollowUpDays('3');
    setHasContent(false);
    editorRef.current?.clear();
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      type: 'meeting',
      title: title || `Meeting: ${MEETING_OUTCOMES.find(o => o.value === outcome)?.label || 'Logged'}`,
      description: text,
      descriptionHtml: html,
      metadata: {
        outcome,
        duration,
        startTime,
      }
    };

    if (createFollowUp) {
      const futureDate = addBusinessDays(new Date(), parseInt(followUpDays));
      data.createFollowUp = {
        taskType: followUpTaskType,
        dueDate: format(futureDate, 'yyyy-MM-dd'),
        dueTime: '09:00',
      };
    }

    await onSubmit(data);
    handleClose();
  }, [title, outcome, duration, startTime, createFollowUp, followUpTaskType, followUpDays, onSubmit, handleClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 overflow-hidden",
        isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] rounded-lg",
        isMinimized && "h-auto"
      )}>
        <DialogHeader 
          title={config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={handleClose}
        />

        {!isMinimized && (
          <>
            <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Attendees:</span>
                <span className="font-medium text-gray-900">{contact?.name}</span>
              </div>

              <FormField label="Meeting Title">
                <Input placeholder="Enter meeting title..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
              </FormField>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Outcome">
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                    <SelectContent>
                      {MEETING_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Duration">
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Start Time">
                  <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
                </FormField>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50">
              <HubSpotRichTextEditor
                ref={editorRef}
                placeholder="Start typing to log a meeting..."
                onChange={(html, text) => setHasContent(text.trim().length > 0)}
                minHeight="120px"
              />
            </div>

            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp}
              setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType}
              setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays}
              setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isDisabled={!hasContent}
              buttonText="Log meeting"
              buttonClass={config.buttonBg}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// SHARED COMPONENTS
// =====================

interface DialogHeaderProps {
  title: string;
  icon: React.ReactNode;
  bgClass: string;
  isMinimized: boolean;
  isFullscreen: boolean;
  onMinimize: () => void;
  onFullscreen: () => void;
  onClose: () => void;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({
  title, icon, bgClass, isMinimized, isFullscreen, onMinimize, onFullscreen, onClose
}) => (
  <div className={cn("flex items-center justify-between px-4 py-3 text-white", bgClass)}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-medium text-sm">{title}</span>
    </div>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10" onClick={onMinimize}>
        <Minus size={14} />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10" onClick={onFullscreen}>
        <Maximize2 size={14} />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10" onClick={onClose}>
        <X size={14} />
      </Button>
    </div>
  </div>
);

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

interface ContactSelectorProps {
  contact: any;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({ contact }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="w-full h-9 justify-start text-sm font-normal">
        <Avatar className="h-5 w-5 mr-2">
          <AvatarImage src={contact?.photo_url} />
          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
            {getInitials(contact?.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{contact?.name}</span>
        <ChevronDown size={12} className="ml-auto text-gray-400" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56">
      <DropdownMenuItem><User size={14} className="mr-2" />Change contact...</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface DialogFooterProps {
  contact: any;
  createFollowUp: boolean;
  setCreateFollowUp: (v: boolean) => void;
  followUpTaskType: string;
  setFollowUpTaskType: (v: string) => void;
  followUpDays: string;
  setFollowUpDays: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isDisabled: boolean;
  buttonText: string;
  buttonClass: string;
}

const DialogFooter: React.FC<DialogFooterProps> = ({
  contact, createFollowUp, setCreateFollowUp, followUpTaskType, setFollowUpTaskType,
  followUpDays, setFollowUpDays, onSubmit, isSubmitting, isDisabled, buttonText, buttonClass
}) => (
  <div className="px-4 py-3 bg-white border-t border-gray-200 space-y-3">
    {/* Associations */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 text-sm text-teal-600 hover:text-teal-700 hover:bg-transparent">
          Associated with 1 record
          <ChevronDown size={12} className="ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={contact?.photo_url} />
              <AvatarFallback className="text-[9px] bg-blue-100 text-blue-600">
                {getInitials(contact?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{contact?.name}</p>
              <p className="text-xs text-gray-500">Contact</p>
            </div>
          </div>
        </div>
        <DropdownMenuItem className="text-teal-600">+ Add association</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Follow-up row */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <Checkbox
          id="create-followup"
          checked={createFollowUp}
          onCheckedChange={(c) => setCreateFollowUp(!!c)}
        />
        <label htmlFor="create-followup" className="text-sm text-gray-700 cursor-pointer flex items-center gap-2 flex-wrap">
          Create a
          <Select value={followUpTaskType} onValueChange={setFollowUpTaskType} disabled={!createFollowUp}>
            <SelectTrigger className="h-7 w-20 text-xs inline-flex"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          task to follow up
          <Select value={followUpDays} onValueChange={setFollowUpDays} disabled={!createFollowUp}>
            <SelectTrigger className="h-7 w-40 text-xs inline-flex"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FOLLOW_UP_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label} ({format(addBusinessDays(new Date(), parseInt(o.value)), 'EEEE')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      
      <Button
        onClick={onSubmit}
        disabled={isSubmitting || isDisabled}
        className={cn("h-9 px-6", buttonClass, isDisabled && "opacity-50 cursor-not-allowed")}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {buttonText}
      </Button>
    </div>
  </div>
);