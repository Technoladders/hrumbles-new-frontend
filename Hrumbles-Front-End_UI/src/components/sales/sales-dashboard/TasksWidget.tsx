// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/TasksWidget.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Plus, 
  ArrowRight,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  is_completed: boolean;
  contacts?: {
    id: number;
    name: string;
  };
}

interface TasksWidgetProps {
  tasks: Task[];
  isLoading: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-green-50 text-green-700 border-green-200',
};

export const TasksWidget: React.FC<TasksWidgetProps> = ({ tasks, isLoading }) => {
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return isPast(parseISO(dateString)) && !isToday(parseISO(dateString));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
          <p className="text-xs text-gray-500 mt-0.5">{tasks.length} pending</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
        >
          <Plus size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex gap-3 animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const overdue = isOverdue(task.due_date);
              const dueText = formatDueDate(task.due_date);

              return (
                <div 
                  key={task.id} 
                  className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex gap-3">
                    {/* Checkbox */}
                    <Checkbox 
                      checked={task.is_completed}
                      className="mt-0.5 border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm text-gray-900 line-clamp-1",
                        task.is_completed && "line-through text-gray-400"
                      )}>
                        {task.title}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {dueText && (
                          <span className={cn(
                            "text-[11px] flex items-center gap-1",
                            overdue ? "text-red-600" : "text-gray-400"
                          )}>
                            {overdue && <AlertCircle size={10} />}
                            <Calendar size={10} />
                            {dueText}
                          </span>
                        )}
                        
                        {task.priority && (
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-4",
                              PRIORITY_STYLES[task.priority.toLowerCase()] || "bg-gray-50 text-gray-600"
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                        
                        {task.contacts?.name && (
                          <span className="text-[11px] text-gray-400 truncate">
                            • {task.contacts.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckSquare size={16} className="text-green-500" />
              </div>
              <p className="text-sm font-medium text-gray-900">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">No pending tasks</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 text-xs"
              >
                <Plus size={12} className="mr-1" />
                Create task
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {tasks.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            View all tasks
            <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};