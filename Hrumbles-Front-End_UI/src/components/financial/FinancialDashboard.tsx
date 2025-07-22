import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinancialStats from './FinancialStats';
import PayrollTable from './PayrollTable';
import { PayrollDrawer } from './PayrollDrawer';
import { Calendar, Grid3x3, Search, Plus } from 'lucide-react';
import FinanceOverview from '@/pages/finance/accounts/FinanceOverview';

const FinancialDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [payrollDrawerOpen, setPayrollDrawerOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Financial Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Manage your payments, payroll, and financial reports
        </p>
      </div>

      <FinancialStats />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* <div className="relative w-full sm:w-64 md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search Member or Category"
            className="pl-8 text-sm sm:text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div> */}

        {/* <div className="flex items-center gap-2 sm:gap-3">
          <ViewToggleButton
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            label="Grid View"
          >
            <Grid3x3 className="h-4 w-4" />
          </ViewToggleButton>

          <ViewToggleButton
            active={viewMode === 'calendar'}
            onClick={() => setViewMode('calendar')}
            label="Calendar View"
          >
            <Calendar className="h-4 w-4" />
          </ViewToggleButton>

          <Button
            onClick={() => setPayrollDrawerOpen(true)}
            className="text-sm sm:text-base"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Payment</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div> */}
      </div>

      <FinanceOverview />

      <PayrollDrawer
        open={payrollDrawerOpen}
        onOpenChange={setPayrollDrawerOpen}
      />
    </div>
  );
};

interface ViewToggleButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}

const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({
  children,
  active,
  onClick,
  label,
}) => {
  return (
    <button
      className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
      onClick={onClick}
    >
      {children}
      <span className="ml-1 hidden sm:inline">{label}</span>
    </button>
  );
};

export default FinancialDashboard;