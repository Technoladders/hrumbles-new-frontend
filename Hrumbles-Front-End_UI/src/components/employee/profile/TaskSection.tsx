
import React from "react";
import { Check, Clock } from "lucide-react";

interface TaskItemProps {
  time: string;
  title: string;
  completed: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ time, title, completed }) => (
  <div className="flex items-center gap-3 py-3 px-1 hover:bg-white/5 rounded-md transition-colors">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${completed ? 'bg-brand-accent' : 'bg-gray-100'}`}>
      {completed ? <Check className="w-4 h-4 text-brand-primary" /> : <Clock className="w-4 h-4 text-gray-400" />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{title}</div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
  </div>
);
