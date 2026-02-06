// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/QuickActions.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  Building2, 
  Upload, 
  Search,
  Sparkles,
  FileSpreadsheet,
  Target,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: UserPlus,
      label: 'Add Contact',
      description: 'Create a new contact',
      color: 'text-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100',
      border: 'border-blue-200',
      onClick: () => navigate('/contacts'),
    },
    {
      icon: Building2,
      label: 'Add Company',
      description: 'Add a new account',
      color: 'text-purple-600',
      bg: 'bg-purple-50 hover:bg-purple-100',
      border: 'border-purple-200',
      onClick: () => navigate('/companies'),
    },
    {
      icon: Upload,
      label: 'Import CSV',
      description: 'Bulk upload contacts',
      color: 'text-green-600',
      bg: 'bg-green-50 hover:bg-green-100',
      border: 'border-green-200',
      onClick: () => navigate('/lists'),
    },
    {
      icon: Search,
      label: 'Discovery',
      description: 'Find new prospects',
      color: 'text-amber-600',
      bg: 'bg-amber-50 hover:bg-amber-100',
      border: 'border-amber-200',
      onClick: () => navigate('/discovery'),
    },
    {
      icon: Sparkles,
      label: 'Enrich Data',
      description: 'Update contact info',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 hover:bg-indigo-100',
      border: 'border-indigo-200',
      onClick: () => navigate('/contacts'),
    },
    {
      icon: Target,
      label: 'View Pipeline',
      description: 'Kanban view',
      color: 'text-pink-600',
      bg: 'bg-pink-50 hover:bg-pink-100',
      border: 'border-pink-200',
      onClick: () => navigate('/sales/kanban'),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
            "hover:shadow-sm hover:-translate-y-0.5",
            action.bg,
            action.border
          )}
        >
          <action.icon size={20} className={action.color} />
          <span className="text-sm font-medium text-gray-900 mt-2">{action.label}</span>
          <span className="text-[10px] text-gray-500 mt-0.5">{action.description}</span>
        </button>
      ))}
    </div>
  );
};