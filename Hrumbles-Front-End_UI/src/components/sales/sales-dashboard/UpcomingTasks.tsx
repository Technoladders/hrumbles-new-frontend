// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/UpcomingTasks.tsx
import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  CheckSquare, 
  AlertCircle, 
  Clock, 
  Calendar,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  User,
  Users,
  Search,
  X,
  Loader2,
  UserPlus
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DashboardTaskDialog, ActivityLogData } from '@/components/sales/contact-detail/dialogs/ActivityDialogs';

// =====================
// TYPES
// =====================

interface Task {
  id: string;
  title: string;
  description?: string;
  description_html?: string;
  due_date: string;
  due_time?: string;
  priority: string;
  task_type: string;
  created_by: string;
  assigned_to?: string;
  contact_id?: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
}

interface UpcomingTasksProps {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  teamMembers?: TeamMember[];
  contacts?: any[];
  onRefresh?: () => void;
}

// =====================
// CONSTANTS
// =====================

const TASK_TYPES = [
  { value: 'to-do', label: 'To-do', icon: CheckSquare },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
];

const PRIORITIES = [
  { value: 'none', label: 'None', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  { value: 'low', label: 'Low', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'high', label: 'High', color: 'bg-red-50 text-red-700 border-red-200' },
];

const taskTypeIcons: Record<string, React.ReactNode> = {
  'to-do': <CheckSquare size={12} />,
  'call': <Phone size={12} />,
  'email': <Mail size={12} />,
  'meeting': <Calendar size={12} />
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-green-50 text-green-700 border-green-200',
  none: 'bg-gray-50 text-gray-600 border-gray-200'
};

// =====================
// HELPER FUNCTIONS
// =====================

const getInitials = (name: string) => {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
};

const formatDueDate = (date: string, time?: string) => {
  const parsedDate = parseISO(date);
  if (isToday(parsedDate)) {
    return time ? `Today at ${time}` : 'Today';
  }
  if (isTomorrow(parsedDate)) {
    return time ? `Tomorrow at ${time}` : 'Tomorrow';
  }
  return format(parsedDate, 'MMM d');
};

// =====================
// CREATE/EDIT TASK DIALOG
// =====================

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  teamMembers: TeamMember[];
  contacts: any[];
  onSuccess: () => void;
}

const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onOpenChange,
  task,
  teamMembers,
  contacts,
  onSuccess
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [taskType, setTaskType] = useState(task?.task_type || 'to-do');
  const [priority, setPriority] = useState(task?.priority || 'none');
  const [dueDate, setDueDate] = useState(task?.due_date || format(new Date(), 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState(task?.due_time || '09:00');
  const [assignedTo, setAssignedTo] = useState<string[]>(task?.assigned_to ? [task.assigned_to] : []);
  const [contactId, setContactId] = useState(task?.contact_id || '');
  const [contactSearch, setContactSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setTitle(task?.title || '');
      setDescription(task?.description || '');
      setTaskType(task?.task_type || 'to-do');
      setPriority(task?.priority || 'none');
      setDueDate(task?.due_date || format(new Date(), 'yyyy-MM-dd'));
      setDueTime(task?.due_time || '09:00');
      setAssignedTo(task?.assigned_to ? [task.assigned_to] : []);
      setContactId(task?.contact_id || '');
    }
  }, [open, task]);

  const filteredContacts = contacts?.filter(c => 
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 10) || [];

  const filteredAssignees = teamMembers?.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  ) || [];

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const taskData = {
        title,
        description,
        type: 'task',
        task_type: taskType,
        priority,
        due_date: dueDate,
        due_time: dueTime,
        contact_id: contactId || null,
        assigned_to: assignedTo[0] || null, // For now, single assignee
        organization_id: organizationId,
        created_by: user?.id,
        is_completed: false,
      };

      if (task?.id) {
        // Update existing task
        const { error } = await supabase
          .from('contact_activities')
          .update(taskData)
          .eq('id', task.id);
        if (error) throw error;
      } else {
        // Create new task
        const { error } = await supabase
          .from('contact_activities')
          .insert(taskData);
        if (error) throw error;
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (memberId: string) => {
    setAssignedTo(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Task Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon size={14} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <Badge variant="outline" className={cn("text-xs", p.color)}>
                        {p.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Associate Contact */}
          <div className="space-y-2">
            <Label>Associate Contact (Optional)</Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {contactSearch && filteredContacts.length > 0 && (
              <ScrollArea className="h-32 border rounded-md">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setContactId(contact.id);
                      setContactSearch(contact.name);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50",
                      contactId === contact.id && "bg-blue-50"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={contact.photo_url} />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            )}
            {contactId && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                <User size={14} className="text-blue-600" />
                <span className="text-sm text-blue-700">
                  {contacts?.find(c => c.id === contactId)?.name || 'Contact selected'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-auto"
                  onClick={() => {
                    setContactId('');
                    setContactSearch('');
                  }}
                >
                  <X size={12} />
                </Button>
              </div>
            )}
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserPlus size={14} />
              Assign To
            </Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-32 border rounded-md">
              {filteredAssignees.map(member => (
                <div
                  key={member.id}
                  onClick={() => toggleAssignee(member.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50",
                    assignedTo.includes(member.id) && "bg-green-50"
                  )}
                >
                  <Checkbox checked={assignedTo.includes(member.id)} />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={member.profile_picture_url} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(`${member.first_name} ${member.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
            {assignedTo.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {assignedTo.map(id => {
                  const member = teamMembers?.find(m => m.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {member?.first_name} {member?.last_name}
                      <X 
                        size={10} 
                        className="cursor-pointer" 
                        onClick={() => toggleAssignee(id)} 
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// =====================
// MAIN COMPONENT
// =====================

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ 
  overdue, 
  today, 
  upcoming,
  teamMembers = [],
  contacts = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Mutations (Keep existing logic)
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.rpc('complete_task', { p_task_id: taskId, p_completed_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      onRefresh?.();
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('contact_activities').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      onRefresh?.();
    }
  });

  // Handle Create/Update from the new DashboardTaskDialog
  const handleTaskSubmit = async (data: ActivityLogData) => {
    try {
      const taskPayload = {
        title: data.title,
        description: data.description,
        description_html: data.descriptionHtml,
        type: 'task',
        task_type: data.metadata.taskType,
        priority: data.metadata.priority,
        due_date: data.metadata.dueDate,
        due_time: data.metadata.dueTime,
        contact_id: data.metadata.contactId || null,
        assigned_to: data.metadata.assignedTo || null,
        metadata: { reminder: data.metadata.reminder },
        organization_id: organizationId,
        created_by: user?.id,
        is_completed: false,
      };

      if (editingTask?.id) {
        // Update
        const { error } = await supabase
          .from('contact_activities')
          .update(taskPayload)
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('contact_activities')
          .insert(taskPayload);
        if (error) throw error;
      }

      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      setTaskDialogOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const tabs = [
    { key: 'overdue' as const, label: 'Overdue', count: overdue.length, color: 'text-red-600' },
    { key: 'today' as const, label: 'Today', count: today.length, color: 'text-blue-600' },
    { key: 'upcoming' as const, label: 'Upcoming', count: upcoming.length, color: 'text-gray-600' },
  ];

  const getActiveData = () => {
    switch (activeTab) {
      case 'overdue': return overdue;
      case 'today': return today;
      case 'upcoming': return upcoming;
      default: return [];
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-5 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-100 rounded-lg">
              <CheckSquare size={18} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Tasks</h3>
              <p className="text-xs text-gray-500">{overdue.length + today.length + upcoming.length} pending</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1"
              onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}
            >
              <Plus size={14} />
              New Task
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600">
              View All <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "w-5 h-5 rounded-full text-[10px] flex items-center justify-center",
                  tab.key === 'overdue' && tab.count > 0 ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-600"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {getActiveData().map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isOverdue={activeTab === 'overdue'}
                onComplete={() => completeTask.mutate(task.id)}
                onEdit={() => { setEditingTask(task); setTaskDialogOpen(true); }}
                onDelete={() => deleteTask.mutate(task.id)}
                teamMembers={teamMembers}
              />
            ))}
            {getActiveData().length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <CheckSquare size={32} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">No tasks found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* NEW Responsive Task Dialog */}
      <DashboardTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        teamMembers={teamMembers}
        contacts={contacts}
        onSubmit={handleTaskSubmit}
      />
    </>
  );
};

// =====================
// TASK CARD COMPONENT
// =====================

interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  teamMembers: TeamMember[];
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isOverdue,
  onComplete,
  onEdit,
  onDelete,
  teamMembers
}) => {
  const creator = task.creator || teamMembers.find(m => m.id === task.created_by);
  const assignee = task.assignee || teamMembers.find(m => m.id === task.assigned_to);

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-all group",
        isOverdue 
          ? "bg-red-50/50 border-red-100 hover:border-red-200" 
          : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          className={cn(
            "mt-0.5",
            isOverdue && "border-red-300"
          )}
          onCheckedChange={onComplete}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 line-clamp-1">
              {task.title}
            </p>
            <div className="flex items-center gap-1">
              {task.priority && task.priority !== 'none' && (
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] capitalize shrink-0", priorityStyles[task.priority])}
                >
                  {task.priority}
                </Badge>
              )}
              
              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil size={12} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 size={12} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Task Type */}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              {taskTypeIcons[task.task_type] || taskTypeIcons['to-do']}
              <span className="capitalize">{task.task_type || 'Task'}</span>
            </span>

            {/* Due Date */}
            <span className={cn(
              "inline-flex items-center gap-1 text-xs",
              isOverdue ? "text-red-600" : "text-gray-500"
            )}>
              {isOverdue ? (
                <AlertCircle size={10} />
              ) : (
                <Clock size={10} />
              )}
              {formatDueDate(task.due_date, task.due_time)}
            </span>
          </div>

          {/* Contact & Assignee Info */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Contact */}
            {task.contact && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.contact.photo_url} />
                  <AvatarFallback className="text-[8px] bg-gray-200">
                    {getInitials(task.contact.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-500 truncate max-w-[100px]">
                  {task.contact.name}
                </span>
              </div>
            )}

            {/* Assigned To */}
            {assignee && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-full">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={assignee.profile_picture_url} />
                  <AvatarFallback className="text-[7px] bg-blue-200 text-blue-700">
                    {getInitials(`${assignee.first_name} ${assignee.last_name}`)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-blue-700 font-medium">
                  Assigned to {assignee.first_name}
                </span>
              </div>
            )}

            {/* Created By */}
            {creator && (
              <span className="text-[10px] text-gray-400">
                by {creator.first_name} {creator.last_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingTasks;