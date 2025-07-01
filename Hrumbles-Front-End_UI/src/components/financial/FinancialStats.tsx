
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/utils/currency';
import { useFinancialStore } from '@/lib/financial-data';
import { IndianRupee, Upload, TrendingDown, TrendingUp } from 'lucide-react';

const FinancialStats: React.FC = () => {
  const { stats } = useFinancialStore();

  if (!stats) {
    return <div></div>; 
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in">
      <StatCard
        title="Monthly Payroll"
        value={stats.monthlyPayroll}
        changePercent={stats.monthlyPayrollChange}
        icon={<IndianRupee className="w-5 h-5" />}
      />
      
      <StatCard
        title="Company Expenses"
        value={stats.companyExpenses}
        changePercent={stats.companyExpensesChange}
        icon={<Upload className="w-5 h-5" />}
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  changePercent: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  changePercent,
  icon,
}) => {
  const isPositive = changePercent.startsWith('+');
  
  return (
    <Card className="overflow-hidden card-hover border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold financial-amount">
          {formatINR(value)}
        </div>
        <div className={`flex items-center text-xs mt-1 ${
          isPositive ? 'text-success' : 'text-danger'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          <span>{changePercent}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialStats;
