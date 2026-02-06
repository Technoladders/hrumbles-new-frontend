// Hrumbles-Front-End_UI/src/components/sales/contact-detail/dialogs/LogCallDialog.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
  Minus, 
  Maximize2, 
  X, 
  ChevronDown,
  Loader2,
  User,
  Calendar,
  Clock
} from 'lucide-react';
import { EditorToolbar } from '../editor/EditorToolbar';
import { RichTextEditor, RichTextEditorRef } from '../editor/RichTextEditor';
import { cn } from '@/lib/utils';
import { format, addBusinessDays } from 'date-fns';

// Import editor styles
import '../editor/editor-styles.css';

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  onSubmit: (data: CallLogData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface CallLogData {
  type: 'call';
  title: string;
  description: string;
  metadata: {
    outcome: string;
    direction: string;
    duration: string;
    activityDate: string;
  };
  createFollowUp?: {
    taskType: string;
    dueDate: string;
    dueTime: string;
  };
}

// Call outcome options
const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'busy', label: 'Busy' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'left_voicemail', label: 'Left Voicemail' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'left_message', label: 'Left Message' },
];

// Call direction options
const CALL_DIRECTIONS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
];

// Duration options
const CALL_DURATIONS = [
  { value: '1', label: '1 minute' },
  { value: '2', label: '2 minutes' },
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

// Follow-up timing options
const FOLLOW_UP_OPTIONS = [
  { value: '1', label: 'Tomorrow' },
  { value: '2', label: 'In 2 business days' },
  { value: '3', label: 'In 3 business days' },
  { value: '5', label: 'In 1 week' },
  { value: '10', label: 'In 2 weeks' },
];

// Task type options
const TASK_TYPES = [
  { value: 'to-do', label: 'To-do' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
];

export const LogCallDialog: React.FC<LogCallDialogProps> = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting = false
}) => {
  // State
  const [outcome, setOutcome] = useState('');
  const [direction, setDirection] = useState('outbound');
  const [duration, setDuration] = useState('');
  const [activityDate, setActivityDate] = useState(() => 
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [editorContent, setEditorContent] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpTaskType, setFollowUpTaskType] = useState('to-do');
  const [followUpDays, setFollowUpDays] = useState('3');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const editorRef = useRef<RichTextEditorRef>(null);

  // Get follow-up date label
  const getFollowUpDateLabel = useCallback(() => {
    const days = parseInt(followUpDays);
    const futureDate = addBusinessDays(new Date(), days);
    return format(futureDate, 'EEEE, MMMM d');
  }, [followUpDays]);

  // Reset form
  const resetForm = useCallback(() => {
    setOutcome('');
    setDirection('outbound');
    setDuration('');
    setActivityDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setEditorContent('');
    setCreateFollowUp(false);
    setFollowUpTaskType('to-do');
    setFollowUpDays('3');
    editorRef.current?.clear();
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    const htmlContent = editorRef.current?.getHTML() || '';
    const textContent = editorRef.current?.getText() || '';
    
    if (!textContent.trim()) return;

    const data: CallLogData = {
      type: 'call',
      title: `Call: ${CALL_OUTCOMES.find(o => o.value === outcome)?.label || 'Logged'}`,
      description: htmlContent,
      metadata: {
        outcome,
        direction,
        duration,
        activityDate,
      }
    };

    if (createFollowUp) {
      const days = parseInt(followUpDays);
      const futureDate = addBusinessDays(new Date(), days);
      data.createFollowUp = {
        taskType: followUpTaskType,
        dueDate: format(futureDate, 'yyyy-MM-dd'),
        dueTime: '09:00',
      };
    }

    await onSubmit(data);
    handleClose();
  }, [outcome, direction, duration, activityDate, createFollowUp, followUpTaskType, followUpDays, onSubmit, handleClose]);

  // Toolbar handlers
  const handleBold = () => {
    document.execCommand('bold', false);
    editorRef.current?.focus();
  };
  const handleItalic = () => {
    document.execCommand('italic', false);
    editorRef.current?.focus();
  };
  const handleUnderline = () => {
    document.execCommand('underline', false);
    editorRef.current?.focus();
  };
  const handleStrikethrough = () => {
    document.execCommand('strikeThrough', false);
    editorRef.current?.focus();
  };
  const handleBulletList = () => {
    document.execCommand('insertUnorderedList', false);
    editorRef.current?.focus();
  };
  const handleOrderedList = () => {
    document.execCommand('insertOrderedList', false);
    editorRef.current?.focus();
  };
  const handleLink = (url: string) => {
    document.execCommand('createLink', false, url);
    editorRef.current?.focus();
  };

  // Check if form is valid
  const isValid = !!(editorRef.current && !editorRef.current.isEmpty());

  // Get contact initials
  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden",
          isFullscreen 
            ? "w-screen h-screen max-w-none rounded-none" 
            : "sm:max-w-[600px] rounded-lg",
          isMinimized && "h-auto"
        )}
      >
        {/* Header - Blue HubSpot Style */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-700 text-white cursor-move">
          <div className="flex items-center gap-2">
            <Phone size={16} />
            <span className="font-medium text-sm">Log Call</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minus size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleClose}
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Form Fields Section */}
            <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-4">
              {/* Row 1: Contact, Outcome, Direction */}
              <div className="grid grid-cols-3 gap-4">
                {/* Contacted Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacted
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full h-9 justify-start text-sm font-normal border-gray-200"
                      >
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
                      <DropdownMenuItem>
                        <User size={14} className="mr-2" />
                        Change contact...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Call Outcome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Outcome
                  </label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger className="h-9 text-sm border-gray-200">
                      <SelectValue placeholder="Select call outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_OUTCOMES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Call Direction */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Direction
                  </label>
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger className="h-9 text-sm border-gray-200">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_DIRECTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Activity Date & Duration */}
              <div className="grid grid-cols-2 gap-4">
                {/* Activity Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} />
                    Activity Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="h-9 text-sm border-gray-200"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={12} />
                    Duration
                  </label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-9 text-sm border-gray-200">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_DURATIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Rich Text Editor Section */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <EditorToolbar
                onBold={handleBold}
                onItalic={handleItalic}
                onUnderline={handleUnderline}
                onStrikethrough={handleStrikethrough}
                onBulletList={handleBulletList}
                onOrderedList={handleOrderedList}
                onLink={handleLink}
              />
              <RichTextEditor
                ref={editorRef}
                // placeholder="Start typing to log a call..."
                onChange={setEditorContent}
                minHeight="120px"
              />
            </div>

            {/* Associations & Follow-up Section */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 space-y-3">
              {/* Associated Records */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 text-sm text-blue-600 hover:text-blue-700 hover:bg-transparent"
                  >
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
                  <DropdownMenuItem className="text-blue-600">
                    + Add association
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Create Follow-up Task */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="create-followup"
                  checked={createFollowUp}
                  onCheckedChange={(checked) => setCreateFollowUp(!!checked)}
                  className="border-gray-300"
                />
                <label 
                  htmlFor="create-followup" 
                  className="text-sm text-gray-700 cursor-pointer flex items-center gap-2 flex-wrap"
                >
                  Create a
                  <Select 
                    value={followUpTaskType} 
                    onValueChange={setFollowUpTaskType}
                    disabled={!createFollowUp}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs border-gray-200 inline-flex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  task to follow up
                  <Select 
                    value={followUpDays} 
                    onValueChange={setFollowUpDays}
                    disabled={!createFollowUp}
                  >
                    <SelectTrigger className="h-7 w-44 text-xs border-gray-200 inline-flex">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label} ({format(addBusinessDays(new Date(), parseInt(opt.value)), 'EEEE')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-white flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !editorContent.trim()}
                className={cn(
                  "h-9 px-6",
                  (!editorContent.trim()) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log call
              </Button>
            </div>
          </>
        )}

        {/* Minimized State */}
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