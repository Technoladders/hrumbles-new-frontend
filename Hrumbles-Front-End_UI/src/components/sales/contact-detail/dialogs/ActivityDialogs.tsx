// Hrumbles-Front-End_UI/src/components/sales/contact-detail/dialogs/ActivityDialogs.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Bell,
  Linkedin,
  Search,
  UserPlus,
} from 'lucide-react';
import { HubSpotRichTextEditor, HubSpotEditorRef } from '../editor/HubSpotRichTextEditor';
import { cn } from '@/lib/utils';
import { format, addBusinessDays } from 'date-fns';

// Import editor styles
import '../editor/hubspot-editor.css';

// =====================
// TYPES
// =====================

export type ActivityType = 'call' | 'email' | 'note' | 'task' | 'meeting' | 'linkedin';

export interface ActivityLogData {
  id?: string;
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
  teamMembers?: any[];
  activity?: any;
}

interface DashboardTaskDialogProps extends Omit<BaseDialogProps, 'contact'> {
  contact?: any; // optional — can be pre-selected
  task?: any; // for edit mode
  teamMembers?: any[];
  contacts?: any[]; // full list for association
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
  { value: 'linkedin', label: 'LinkedIn' },
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

const LINKEDIN_ACTIVITY_TYPES = [
  { value: 'connection_request', label: 'Connection Request Sent' },
  { value: 'connection_accepted', label: 'Connection Accepted' },
  { value: 'message_sent', label: 'Message Sent' },
  { value: 'message_received', label: 'Message Received' },
  { value: 'inmail_sent', label: 'InMail Sent' },
  { value: 'inmail_received', label: 'InMail Received' },
  { value: 'profile_viewed', label: 'Profile Viewed' },
  { value: 'post_engagement', label: 'Post Engagement' },
  { value: 'comment', label: 'Comment' },
  { value: 'endorsement', label: 'Endorsement Given' },
];

const LINKEDIN_OUTCOMES = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'replied', label: 'Replied' },
  { value: 'no_response', label: 'No Response' },
  { value: 'declined', label: 'Declined' },
  { value: 'engaged', label: 'Engaged' },
];

// =====================
// HELPER FUNCTIONS
// =====================
const getInitials = (name: string) =>
  name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

const getActivityConfig = (type: ActivityType) => {
  const configs = {
    call: {
      icon: Phone,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      title: 'Log Call',
    },
    email: {
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      title: 'Log Email',
    },
    note: {
      icon: StickyNote,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-purple-600 hover:bg-purple-700',
      title: 'Create Note',
    },
    task: {
      icon: CheckSquare,
      color: 'text-green-600',
      bg: 'bg-green-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-green-600 hover:bg-green-700',
      title: 'Create Task',
    },
    meeting: {
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      headerBg: 'bg-slate-700',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
      title: 'Log Meeting',
    },
    linkedin: {
      icon: Linkedin,
      color: 'text-[#0A66C2]',
      bg: 'bg-[#0A66C2]/10',
      headerBg: 'bg-[#0A66C2]',
      buttonBg: 'bg-[#0A66C2] hover:bg-[#004182]',
      title: 'Log LinkedIn Activity',
    },
  };
  return configs[type];
};

// =====================
// DASHBOARD TASK DIALOG (NEW)
// =====================
export const DashboardTaskDialog: React.FC<DashboardTaskDialogProps> = ({
  open,
  onOpenChange,
  task,
  contact,
  teamMembers = [],
  contacts = [],
  onSubmit,
  isSubmitting = false
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  
  // State
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('to-do');
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('09:00');
  const [reminder, setReminder] = useState('none');
  
  // Selection State
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [contactSearch, setContactSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // UI State
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const config = getActivityConfig('task');

  // Initialize form when opening
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title || '');
        setTaskType(task.task_type || 'to-do');
        setPriority(task.priority || 'none');
        setDueDate(task.due_date || format(new Date(), 'yyyy-MM-dd'));
        setDueTime(task.due_time || '09:00');
        setReminder(task.metadata?.reminder || 'none');
        setSelectedContactId(task.contact_id || '');
        setSelectedAssigneeId(task.assigned_to || '');
        // Note: Editor content population would need to happen after mount, 
        // usually passed as initialContent prop to editor
      } else {
        // Defaults
        setTitle('');
        setTaskType('to-do');
        setPriority('none');
        setDueDate(format(new Date(), 'yyyy-MM-dd'));
        setDueTime('09:00');
        setReminder('none');
        setSelectedContactId(contact?.id || ''); // Pre-select if contact passed
        setSelectedAssigneeId('');
      }
    }
  }, [open, task, contact]);

  // Handle Submit
  const handleSubmit = async () => {
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
        assignedTo: selectedAssigneeId,
        contactId: selectedContactId,
        status: 'pending'
      }
    };

    await onSubmit(data);
    onOpenChange(false);
  };

  // Filtering
  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
    c.email?.toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 20);

  const filteredTeam = teamMembers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedAssignee = teamMembers.find(m => m.id === selectedAssigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200",
          isFullscreen 
            ? "w-screen h-screen max-w-none rounded-none" 
            : "sm:max-w-[650px] max-h-[85vh] rounded-lg", // Constrained height for responsiveness
          isMinimized && "h-auto"
        )}
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing when interacting with popovers
      >
        {/* Header - Fixed */}
        <DialogHeader 
          title={task ? "Edit Task" : "Create Task"}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized}
          isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)}
          onFullscreen={() => setIsFullscreen(!isFullscreen)}
          onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-5 space-y-4">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Task Title *</Label>
                  <Input 
                    placeholder="Enter task title..." 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    className="font-medium"
                    autoFocus
                  />
                </div>

                {/* Association & Assignment Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assignee Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                      <UserPlus size={12} /> Assigned To
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left h-10 px-3 border-dashed border-gray-300">
                          {selectedAssignee ? (
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedAssignee.profile_picture_url} />
                                <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                                  {getInitials(`${selectedAssignee.first_name} ${selectedAssignee.last_name}`)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm">{selectedAssignee.first_name} {selectedAssignee.last_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Select assignee...</span>
                          )}
                          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px] p-0" align="start">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-500" />
                            <Input 
                              placeholder="Search team..." 
                              className="h-8 pl-7 text-xs" 
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-1">
                            {filteredTeam.map(member => (
                              <DropdownMenuItem 
                                key={member.id} 
                                onClick={() => setSelectedAssigneeId(member.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profile_picture_url} />
                                  <AvatarFallback className="text-[10px]">{getInitials(member.first_name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate font-medium">{member.first_name} {member.last_name}</span>
                                  <span className="truncate text-xs text-gray-500">{member.email}</span>
                                </div>
                                {selectedAssigneeId === member.id && <CheckSquare size={14} className="ml-auto text-green-600" />}
                              </DropdownMenuItem>
                            ))}
                            {filteredTeam.length === 0 && (
                              <div className="p-4 text-center text-xs text-gray-500">No team members found</div>
                            )}
                          </div>
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Contact Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                      <User size={12} /> Related Contact
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left h-10 px-3 border-dashed border-gray-300">
                           {selectedContact ? (
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedContact.photo_url} />
                                <AvatarFallback className="text-[9px] bg-green-100 text-green-700">
                                  {getInitials(selectedContact.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate text-sm">{selectedContact.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Search contact...</span>
                          )}
                          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[280px] p-0" align="start">
                        <div className="p-2 border-b">
                           <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-500" />
                            <Input 
                              placeholder="Search contacts..." 
                              className="h-8 pl-7 text-xs" 
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-1">
                            {filteredContacts.map(c => (
                              <DropdownMenuItem 
                                key={c.id} 
                                onClick={() => setSelectedContactId(c.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={c.photo_url} />
                                  <AvatarFallback className="text-[10px]">{getInitials(c.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="truncate font-medium">{c.name}</span>
                                  <span className="truncate text-xs text-gray-500">{c.email}</span>
                                </div>
                                {selectedContactId === c.id && <CheckSquare size={14} className="ml-auto text-green-600" />}
                              </DropdownMenuItem>
                            ))}
                            {filteredContacts.length === 0 && (
                               <div className="p-4 text-center text-xs text-gray-500">No contacts found</div>
                            )}
                          </div>
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Due Date">
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
                  </FormField>
                  <FormField label="Due Time">
                    <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9 text-sm" />
                  </FormField>
                </div>

                {/* Metadata Row */}
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

                {/* Rich Text Editor - Scrollable handled by parent */}
                <div className="pt-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Notes</Label>
                  <div className="border rounded-md shadow-sm">
                    <HubSpotRichTextEditor
                      ref={editorRef}
                      placeholder="Add task details, context, or instructions..."
                      minHeight="150px"
                      initialContent={task?.description_html || task?.description || ''}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 mt-auto">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                   {selectedContact ? (
                     <span>Linked to: <strong>{selectedContact.name}</strong></span>
                   ) : (
                     <span className="italic">No contact linked</span>
                   )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !title.trim()}
                    className={cn("px-6", config.buttonBg)}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {task ? 'Update Task' : 'Create Task'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// LOG CALL DIALOG
// =====================

export const LogCallDialog: React.FC<BaseDialogProps> = ({
  open, onOpenChange, contact, onSubmit, isSubmitting = false, activity
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

  // Load data for edit
  useEffect(() => {
    if (open) {
      if (activity) {
        setOutcome(activity.outcome || activity.metadata?.outcome || '');
        setDirection(activity.direction || activity.metadata?.direction || 'outbound');
        setDuration(activity.duration_minutes?.toString() || activity.metadata?.duration || '');
        const date = activity.activity_date || activity.created_at;
        setActivityDate(date ? format(new Date(date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        // Note: Editor content should be set via initialContent prop
      } else {
        setOutcome('');
        setDirection('outbound');
        setDuration('');
        setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setCreateFollowUp(false);
        editorRef.current?.clear();
      }
    }
  }, [open, activity]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      id: activity?.id,
      type: 'call',
      title: `Call: ${CALL_OUTCOMES.find(o => o.value === outcome)?.label || 'Logged'}`,
      description: text,
      descriptionHtml: html,
      metadata: { outcome, direction, duration, activityDate }
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
    onOpenChange(false);
  }, [outcome, direction, duration, activityDate, createFollowUp, followUpTaskType, followUpDays, onSubmit, onOpenChange, activity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit Call Log" : config.title}
          icon={<config.icon size={16} />}
          bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Contacted"><ContactSelector contact={contact} /></FormField>
                  <FormField label="Call Outcome">
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                      <SelectContent>{CALL_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Call Direction">
                    <Select value={direction} onValueChange={setDirection}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{CALL_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Activity Date" icon={<Calendar size={12} />}><Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="h-9 text-sm" /></FormField>
                  <FormField label="Duration" icon={<Clock size={12} />}>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Start typing to log a call..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  onChange={(html, text) => setHasContent(text.trim().length > 0)}
                  minHeight="120px"
                />
              </div>
            </div>
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp} setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType} setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays} setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit} isSubmitting={isSubmitting} isDisabled={!hasContent && !activity} // Allow edit if content exists
              buttonText={activity ? "Update call" : "Log call"}
              buttonClass={config.buttonBg}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// LOG EMAIL DIALOG
// =====================

export const LogEmailDialog: React.FC<BaseDialogProps> = ({
  open, onOpenChange, contact, onSubmit, isSubmitting = false, activity
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

  useEffect(() => {
    if (open) {
      if (activity) {
        setSubject(activity.title || activity.metadata?.subject || '');
        const date = activity.activity_date || activity.created_at;
        setActivityDate(date ? format(new Date(date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      } else {
        setSubject('');
        setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setCreateFollowUp(false);
        editorRef.current?.clear();
      }
    }
  }, [open, activity]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!subject.trim()) return;

    const data: ActivityLogData = {
      id: activity?.id,
      type: 'email',
      title: subject,
      description: text,
      descriptionHtml: html,
      metadata: { subject, activityDate }
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
    onOpenChange(false);
  }, [subject, activityDate, createFollowUp, followUpTaskType, followUpDays, onSubmit, onOpenChange, activity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit Email Log" : config.title}
          icon={<config.icon size={16} />} bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="To"><ContactSelector contact={contact} /></FormField>
                  <FormField label="Activity Date" icon={<Calendar size={12} />}><Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="h-9 text-sm" /></FormField>
                </div>
                <FormField label="Subject"><Input placeholder="Email subject..." value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-sm" /></FormField>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Enter email content..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  onChange={(html, text) => setHasContent(text.trim().length > 0)}
                  minHeight="150px"
                />
              </div>
            </div>
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp} setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType} setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays} setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit} isSubmitting={isSubmitting} isDisabled={!subject.trim()}
              buttonText={activity ? "Update email" : "Log email"}
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
  open, onOpenChange, contact, onSubmit, isSubmitting = false, activity
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('note');

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      id: activity?.id,
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
    onOpenChange(false);
  }, [createFollowUp, followUpTaskType, followUpDays, onSubmit, onOpenChange, activity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit Note" : config.title}
          icon={<config.icon size={16} />} bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="text-sm"><span className="text-gray-500">For: </span><span className="font-medium text-gray-900">{contact?.name}</span></div>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Write your note here..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  onChange={(html, text) => setHasContent(text.trim().length > 0)}
                  minHeight="180px"
                />
              </div>
            </div>
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp} setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType} setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays} setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit} isSubmitting={isSubmitting} isDisabled={!hasContent && !activity}
              buttonText={activity ? "Update note" : "Create note"}
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
  open, onOpenChange, contact, onSubmit, isSubmitting = false, teamMembers = [], activity
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('to-do');
  const [priority, setPriority] = useState('none');
  const [dueDate, setDueDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('09:00');
  const [reminder, setReminder] = useState('none');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const config = getActivityConfig('task');

  useEffect(() => {
    if (open) {
      if (activity) {
        setTitle(activity.title || '');
        setTaskType(activity.task_type || 'to-do');
        setPriority(activity.priority || 'none');
        setDueDate(activity.due_date || format(new Date(), 'yyyy-MM-dd'));
        setDueTime(activity.due_time || '09:00');
        setReminder(activity.metadata?.reminder || 'none');
        setSelectedAssigneeId(activity.assigned_to || '');
      } else {
        setTitle('');
        setTaskType('to-do');
        setPriority('none');
        setDueDate(format(new Date(), 'yyyy-MM-dd'));
        setDueTime('09:00');
        setReminder('none');
        setSelectedAssigneeId('');
        editorRef.current?.clear();
      }
    }
  }, [open, activity]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';

    const data: ActivityLogData = {
      id: activity?.id,
      type: 'task',
      title,
      description: text,
      descriptionHtml: html,
      metadata: { taskType, priority, dueDate, dueTime, reminder, assignedTo: selectedAssigneeId, status: 'pending' }
    };

    await onSubmit(data);
    onOpenChange(false);
  }, [title, taskType, priority, dueDate, dueTime, reminder, selectedAssigneeId, onSubmit, onOpenChange, activity]);

  const filteredTeam = teamMembers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  const selectedAssignee = teamMembers.find(m => m.id === selectedAssigneeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[650px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit Task" : config.title}
          icon={<config.icon size={16} />} bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
                <FormField label="Task Title *">
                  <Input placeholder="Enter your task..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
                </FormField>
                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1"><UserPlus size={12} /> Assigned To</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left h-10 px-3 border-dashed border-gray-300">
                          {selectedAssignee ? (
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Avatar className="h-5 w-5"><AvatarImage src={selectedAssignee.profile_picture_url} /><AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">{getInitials(`${selectedAssignee.first_name} ${selectedAssignee.last_name}`)}</AvatarFallback></Avatar>
                              <span className="truncate text-sm">{selectedAssignee.first_name} {selectedAssignee.last_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Select assignee (Optional)...</span>
                          )}
                          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[300px] p-0" align="start">
                        <div className="p-2 border-b"><div className="relative"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-500" /><Input placeholder="Search team..." className="h-8 pl-7 text-xs" value={assigneeSearch} onChange={(e) => setAssigneeSearch(e.target.value)} /></div></div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-1">
                            {filteredTeam.map(member => (
                              <DropdownMenuItem key={member.id} onClick={() => setSelectedAssigneeId(member.id)} className="flex items-center gap-2 cursor-pointer">
                                <Avatar className="h-6 w-6"><AvatarImage src={member.profile_picture_url} /><AvatarFallback className="text-[10px]">{getInitials(member.first_name)}</AvatarFallback></Avatar>
                                <div className="flex flex-col overflow-hidden"><span className="truncate font-medium">{member.first_name} {member.last_name}</span><span className="truncate text-xs text-gray-500">{member.email}</span></div>
                                {selectedAssigneeId === member.id && <CheckSquare size={14} className="ml-auto text-green-600" />}
                              </DropdownMenuItem>
                            ))}
                            {filteredTeam.length === 0 && <div className="p-4 text-center text-xs text-gray-500">No team members found</div>}
                          </div>
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Due Date"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" /></FormField>
                  <FormField label="Due Time"><Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-9 text-sm" /></FormField>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Task Type">
                    <Select value={taskType} onValueChange={setTaskType}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Priority">
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Reminder" icon={<Bell size={12} />}>
                    <Select value={reminder} onValueChange={setReminder}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{REMINDER_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Notes</Label>
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Add task notes..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  minHeight="100px"
                />
              </div>
            </div>
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Associated with: <span className="font-medium text-gray-900">{contact?.name}</span></div>
                <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} className={cn("h-9 px-6", config.buttonBg)}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {activity ? "Update task" : "Create task"}
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
  open, onOpenChange, contact, onSubmit, isSubmitting = false, activity
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

  useEffect(() => {
    if (open) {
      if (activity) {
        setTitle(activity.title || '');
        setOutcome(activity.outcome || activity.metadata?.outcome || '');
        setDuration(activity.duration_minutes?.toString() || activity.metadata?.duration || '30');
        const date = activity.activity_date || activity.metadata?.startTime || activity.created_at;
        setStartTime(date ? format(new Date(date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      } else {
        setTitle('');
        setOutcome('');
        setDuration('30');
        setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setCreateFollowUp(false);
        editorRef.current?.clear();
      }
    }
  }, [open, activity]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    if (!text.trim()) return;

    const data: ActivityLogData = {
      id: activity?.id,
      type: 'meeting',
      title: title || `Meeting: ${MEETING_OUTCOMES.find(o => o.value === outcome)?.label || 'Logged'}`,
      description: text,
      descriptionHtml: html,
      metadata: { outcome, duration, startTime }
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
    onOpenChange(false);
  }, [title, outcome, duration, startTime, createFollowUp, followUpTaskType, followUpDays, onSubmit, onOpenChange, activity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit Meeting" : config.title}
          icon={<config.icon size={16} />} bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
                <div className="flex items-center gap-2 text-sm"><span className="text-gray-500">Attendees:</span><span className="font-medium text-gray-900">{contact?.name}</span></div>
                <FormField label="Meeting Title"><Input placeholder="Enter meeting title..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" /></FormField>
                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Outcome"><Select value={outcome} onValueChange={setOutcome}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger><SelectContent>{MEETING_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></FormField>
                  <FormField label="Duration"><Select value={duration} onValueChange={setDuration}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select></FormField>
                  <FormField label="Start Time"><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" /></FormField>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Start typing to log a meeting..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  onChange={(html, text) => setHasContent(text.trim().length > 0)}
                  minHeight="120px"
                />
              </div>
            </div>
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp} setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType} setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays} setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit} isSubmitting={isSubmitting} isDisabled={!hasContent && !activity}
              buttonText={activity ? "Update meeting" : "Log meeting"}
              buttonClass={config.buttonBg}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// =====================
// LOG LINKEDIN DIALOG
// =====================

export const LogLinkedInDialog: React.FC<BaseDialogProps> = ({
  open, onOpenChange, contact, onSubmit, isSubmitting = false, activity
}) => {
  const editorRef = useRef<HubSpotEditorRef>(null);
  const [linkedinActivityType, setLinkedinActivityType] = useState('message_sent');
  const [outcome, setOutcome] = useState('pending');
  const [activityDate, setActivityDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('linkedin');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const config = getActivityConfig('linkedin');

  useEffect(() => {
    if (open) {
      if (activity) {
        setLinkedinActivityType(activity.metadata?.linkedinActivityType || 'message_sent');
        setOutcome(activity.outcome || activity.metadata?.outcome || 'pending');
        const date = activity.activity_date || activity.metadata?.activityDate || activity.created_at;
        setActivityDate(date ? format(new Date(date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setLinkedinUrl(activity.metadata?.linkedinUrl || contact?.linkedin_url || '');
      } else {
        setLinkedinActivityType('message_sent');
        setOutcome('pending');
        setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setLinkedinUrl(contact?.linkedin_url || '');
        setCreateFollowUp(false);
        editorRef.current?.clear();
      }
    }
  }, [open, activity, contact]);

  const handleSubmit = useCallback(async () => {
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    
    const activityLabel = LINKEDIN_ACTIVITY_TYPES.find(t => t.value === linkedinActivityType)?.label || 'LinkedIn Activity';
    
    const data: ActivityLogData = {
      id: activity?.id,
      type: 'linkedin',
      title: `LinkedIn: ${activityLabel}`,
      description: text,
      descriptionHtml: html,
      metadata: { linkedinActivityType, outcome, activityDate, linkedinUrl }
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
    onOpenChange(false);
  }, [linkedinActivityType, outcome, activityDate, linkedinUrl, createFollowUp, followUpTaskType, followUpDays, onSubmit, onOpenChange, activity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden flex flex-col transition-all duration-200", isFullscreen ? "w-screen h-screen max-w-none rounded-none" : "sm:max-w-[620px] max-h-[85vh] rounded-lg", isMinimized && "h-auto")}>
        <DialogHeader 
          title={activity ? "Edit LinkedIn Log" : config.title}
          icon={<config.icon size={16} />} bgClass={config.headerBg}
          isMinimized={isMinimized} isFullscreen={isFullscreen}
          onMinimize={() => setIsMinimized(!isMinimized)} onFullscreen={() => setIsFullscreen(!isFullscreen)} onClose={() => onOpenChange(false)}
        />

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#0A66C2]/5 rounded-lg border border-[#0A66C2]/20">
                  <Avatar className="h-10 w-10"><AvatarImage src={contact?.photo_url} /><AvatarFallback className="bg-[#0A66C2] text-white text-sm">{getInitials(contact?.name)}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="text-sm font-medium text-gray-900">{contact?.name}</p><p className="text-xs text-gray-500">{contact?.title || contact?.email}</p></div>
                  <Linkedin size={20} className="text-[#0A66C2]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Activity Type"><Select value={linkedinActivityType} onValueChange={setLinkedinActivityType}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{LINKEDIN_ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></FormField>
                  <FormField label="Outcome"><Select value={outcome} onValueChange={setOutcome}><SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger><SelectContent>{LINKEDIN_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Activity Date" icon={<Calendar size={12} />}><Input type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="h-9 text-sm" /></FormField>
                  <FormField label="LinkedIn Profile URL" icon={<Linkedin size={12} />}><Input placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="h-9 text-sm" /></FormField>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <HubSpotRichTextEditor
                  ref={editorRef}
                  placeholder="Add details about the LinkedIn interaction..."
                  initialContent={activity?.description_html || activity?.description || ''}
                  onChange={(html, text) => setHasContent(text.trim().length > 0)}
                  minHeight="120px"
                />
              </div>
            </div>
            <DialogFooter
              contact={contact}
              createFollowUp={createFollowUp} setCreateFollowUp={setCreateFollowUp}
              followUpTaskType={followUpTaskType} setFollowUpTaskType={setFollowUpTaskType}
              followUpDays={followUpDays} setFollowUpDays={setFollowUpDays}
              onSubmit={handleSubmit} isSubmitting={isSubmitting} isDisabled={false}
              buttonText={activity ? "Update activity" : "Log LinkedIn activity"}
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
  title,
  icon,
  bgClass,
  isMinimized,
  isFullscreen,
  onMinimize,
  onFullscreen,
  onClose,
}) => (
  <div
    className={cn(
      'flex items-center justify-between px-5 py-3.5 text-white shrink-0',
      bgClass,
      isFullscreen ? 'rounded-none' : 'rounded-t-lg'
    )}
  >
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="font-medium text-base">{title}</span>
    </div>
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
        onClick={onMinimize}
      >
        <Minus size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
        onClick={onFullscreen}
      >
        <Maximize2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X size={16} />
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
            <SelectTrigger className="h-7 w-24 text-xs inline-flex"><SelectValue /></SelectTrigger>
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
// Task log updated for dashboard