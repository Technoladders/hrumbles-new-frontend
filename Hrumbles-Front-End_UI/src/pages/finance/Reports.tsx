
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, LineChart } from 'lucide-react';
import { useFinancialStore } from '@/lib/financial-data';
import { formatINR } from '@/utils/currency';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Reports = () => {
  const navigate = useNavigate();
  const { stats, payments } = useFinancialStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Calculate some report metrics
  const totalPaid = payments
    .filter(p => p.status === 'Success')
    .reduce((sum, p) => sum + p.paymentAmount, 0);
  
  const totalPending = payments
    .filter(p => p.status === 'Pending')
    .reduce((sum, p) => sum + p.paymentAmount, 0);
  
  const avgPayment = payments.length > 0
    ? payments.reduce((sum, p) => sum + p.paymentAmount, 0) / payments.length
    : 0;
  
  // Mock data for the report chart
  const reportData = [
    { month: 'Jan', payroll: 78000000, expenses: 390000 },
    { month: 'Feb', payroll: 79000000, expenses: 385000 },
    { month: 'Mar', payroll: 81000000, expenses: 398000 },
    { month: 'Apr', payroll: 82000000, expenses: 400000 },
    { month: 'May', payroll: 83000000, expenses: 405000 },
    { month: 'Jun', payroll: 83500000, expenses: 410000 },
    { month: 'Jul', payroll: 84000000, expenses: 415000 },
    { month: 'Aug', payroll: 84500000, expenses: 418000 },
    { month: 'Sep', payroll: 85000000, expenses: 422000 },
    { month: 'Oct', payroll: 84800000, expenses: 426000 },
    { month: 'Nov', payroll: 85200000, expenses: 428000 },
    { month: 'Dec', payroll: 84912821, expenses: 429862.92 },
  ];
  
  const handleGenerateReport = () => {
    toast.info('Generating financial report...');
    setTimeout(() => {
      toast.success('Financial report generated successfully');
    }, 1500);
  };
  
  const handleDownloadReport = (type: string) => {
    toast.info(`Preparing ${type} report for download...`);
    setTimeout(() => {
      toast.success(`${type} report downloaded successfully`);
    }, 1500);
  };
  
  return (
    <PageTransition className="max-w-[1200px] mx-auto p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Financial Reports</h1>
        <p className="text-muted-foreground">
          Generate and analyze detailed financial reports
        </p>
      </div>
      
      {/* Report Generator */}
      <Card className="mb-8 border bg-blue-50">
        <CardHeader>
          <CardTitle className="text-xl">Generate Financial Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Analyze your financial report more easily with our virtual assistant
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter report parameters"
              className="bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={handleGenerateReport}>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Monthly Payroll"
          value={stats.monthlyPayroll}
          changePercent={stats.monthlyPayrollChange}
        />
        <MetricCard
          title="Company Expenses"
          value={stats.companyExpenses}
          changePercent={stats.companyExpensesChange}
        />
        <MetricCard
          title="Total Paid"
          value={totalPaid}
          changePercent="+3.2%"
        />
        <MetricCard
          title="Total Pending"
          value={totalPending}
          changePercent="-5.1%"
        />
      </div>
      
      {/* Report Chart */}
      <Card className="mb-8 border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Annual Financial Overview</CardTitle>
          <LineChart className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value) => formatINR(value as number)} />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="payroll" 
                  name="Monthly Payroll" 
                  stroke="#3b82f6" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="expenses" 
                  name="Company Expenses" 
                  stroke="#10b981" 
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Report Types */}
      <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <ReportCard
          title="Payroll Summary"
          description="Monthly summary of all payroll transactions"
          onDownload={() => handleDownloadReport('Payroll Summary')}
        />
        <ReportCard
          title="Expense Analysis"
          description="Detailed breakdown of company expenses"
          onDownload={() => handleDownloadReport('Expense Analysis')}
        />
        <ReportCard
          title="Tax Report"
          description="Summary of tax deductions and liabilities"
          onDownload={() => handleDownloadReport('Tax Report')}
        />
        <ReportCard
          title="Employee Earnings"
          description="Individual earnings reports for each employee"
          onDownload={() => handleDownloadReport('Employee Earnings')}
        />
        <ReportCard
          title="Financial Statement"
          description="Comprehensive financial statement"
          onDownload={() => handleDownloadReport('Financial Statement')}
        />
        <ReportCard
          title="Quarterly Review"
          description="Quarterly financial performance review"
          onDownload={() => handleDownloadReport('Quarterly Review')}
        />
      </div>
    </PageTransition>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  changePercent: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  changePercent,
}) => {
  const isPositive = changePercent.startsWith('+');
  
  return (
    <Card className="border">
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground mb-1">{title}</div>
        <div className="text-2xl font-bold financial-amount mb-1">
          {formatINR(value)}
        </div>
        <div className={isPositive ? 'text-success text-xs' : 'text-danger text-xs'}>
          {changePercent} from previous month
        </div>
      </CardContent>
    </Card>
  );
};

interface ReportCardProps {
  title: string;
  description: string;
  onDownload: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  title,
  description,
  onDownload,
}) => {
  return (
    <Card className="border hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <FileText className="h-8 w-8 text-blue-600 mb-2" />
            <h3 className="font-medium mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
};

export default Reports;
