// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/UpcomingTasks.tsx
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckSquare, 
  AlertCircle, 
  Clock, 
  Calendar,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: string;
  task_type: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
}

interface UpcomingTasksProps {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
}

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

export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ overdue, today, upcoming }) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today');
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);

  // Complete task mutation
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.rpc('complete_task', {
        p_task_id: taskId,
        p_completed_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] });
    }
  });

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
    }
  };

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

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full flex flex-col">
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
        
        <Button variant="ghost" size="sm" className="text-xs text-blue-600">
          View All <ChevronRight size={14} className="ml-1" />
        </Button>
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
                "w-4 h-4 rounded-full text-[10px] flex items-center justify-center",
                tab.key === 'overdue' && tab.count > 0 ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-600"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {getActiveData().map((task) => (
          <div 
            key={task.id}
            className={cn(
              "p-3 rounded-lg border transition-all",
              activeTab === 'overdue' 
                ? "bg-red-50/50 border-red-100" 
                : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                className={cn(
                  "mt-0.5",
                  activeTab === 'overdue' && "border-red-300"
                )}
                onCheckedChange={() => completeTask.mutate(task.id)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {task.title}
                  </p>
                  {task.priority && task.priority !== 'none' && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] capitalize shrink-0", priorityStyles[task.priority])}
                    >
                      {task.priority}
                    </Badge>
                  )}
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
                    activeTab === 'overdue' ? "text-red-600" : "text-gray-500"
                  )}>
                    {activeTab === 'overdue' ? (
                      <AlertCircle size={10} />
                    ) : (
                      <Clock size={10} />
                    )}
                    {formatDueDate(task.due_date, task.due_time)}
                  </span>
                </div>

                {/* Contact */}
                {task.contact && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.contact.photo_url} />
                      <AvatarFallback className="text-[8px] bg-gray-200">
                        {getInitials(task.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500 truncate">{task.contact.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {getActiveData().length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <CheckSquare size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {activeTab === 'overdue' ? 'No overdue tasks!' : 
               activeTab === 'today' ? 'No tasks due today' : 
               'No upcoming tasks'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'overdue' ? 'Great job staying on track!' : 'Tasks will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};