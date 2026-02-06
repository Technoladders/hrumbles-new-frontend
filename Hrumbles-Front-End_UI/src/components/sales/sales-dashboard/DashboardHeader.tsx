// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/DashboardHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Download, 
  Plus, 
  Search,
  Bell,
  Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  dateRange: 'today' | 'week' | 'month' | 'quarter';
  onDateRangeChange: (range: 'today' | 'week' | 'month' | 'quarter') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dateRange,
  onDateRangeChange,
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Sales Dashboard</h1>
            <div className="h-6 w-px bg-gray-200" />
            <Select value={dateRange} onValueChange={(v: any) => onDateRangeChange(v)}>
              <SelectTrigger className="w-[140px] h-9 text-sm bg-white border-gray-200">
                <Calendar size={14} className="mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Center Section - Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search contacts, companies..." 
                className="w-full h-9 pl-10 bg-gray-50 border-gray-200 text-sm"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] text-gray-500">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 text-gray-500"
            >
              <Bell size={18} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 text-gray-500"
            >
              <Settings size={18} />
            </Button>

            <div className="h-6 w-px bg-gray-200 mx-2" />

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-sm"
              onClick={() => navigate('/contacts')}
            >
              <Download size={14} className="mr-1.5" />
              Export
            </Button>

            <Button
              size="sm"
              className="h-9 bg-blue-600 hover:bg-blue-700 text-sm"
              onClick={() => navigate('/contacts')}
            >
              <Plus size={14} className="mr-1.5" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};