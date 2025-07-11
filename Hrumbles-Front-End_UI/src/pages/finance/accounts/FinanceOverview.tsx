import React, { useState, useMemo } from 'react';
import { useAccountsStore } from '@/lib/accounts-data';
import AccountsLayout from '@/components/accounts/AccountsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatINR } from '@/utils/currency';
import { 
  ArrowDown, ArrowUp, Calendar, Download, 
  IndianRupee, PieChart as PieChartIcon, Activity 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AccountsOverview: React.FC = () => {
  const { invoices, expenses, stats } = useAccountsStore();
  const [timeRange, setTimeRange] = useState('month');
  const USD_TO_INR_RATE = 84;

  const chartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataByMonth: { [key: string]: { name: string; income: number; expenses: number } } = {};
    const today = new Date();

    // Initialize the last 7 months to ensure they appear in the chart
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = monthNames[d.getMonth()];
        const year = d.getFullYear().toString().slice(-2);
        const key = `${monthName} '${year}`;
        dataByMonth[key] = { name: key, income: 0, expenses: 0 };
    }

    // Helper to parse 'DD-MM-YYYY' string to a Date object
    const parseDate = (dateString: string): Date | null => {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return null;
    };

    // Process paid invoices for income
    invoices
        .filter(inv => inv.status === 'Paid' && inv.paymentDate)
        .forEach(inv => {
            const paymentDate = parseDate(inv.paymentDate!);
            if (paymentDate) {
                const monthName = monthNames[paymentDate.getMonth()];
                const year = paymentDate.getFullYear().toString().slice(-2);
                const key = `${monthName} '${year}`;
                if (dataByMonth[key]) {
                    const amountInINR = inv.currency === 'USD'
                        ? (inv.paidAmount || inv.totalAmount) * USD_TO_INR_RATE
                        : (inv.paidAmount || inv.totalAmount);
                    dataByMonth[key].income += amountInINR;
                }
            }
        });

    // Process expenses
    expenses.forEach(exp => {
        const expenseDate = parseDate(exp.date);
        if (expenseDate) {
            const monthName = monthNames[expenseDate.getMonth()];
            const year = expenseDate.getFullYear().toString().slice(-2);
            const key = `${monthName} '${year}`;
            if (dataByMonth[key]) {
                dataByMonth[key].expenses += exp.amount;
            }
        }
    });
    
    return Object.values(dataByMonth);

  }, [invoices, expenses]);

  const incomeVsExpensesData = chartData;
  
  const profitData = incomeVsExpensesData.map(item => ({
    name: item.name,
    profit: item.income - item.expenses,
  }));
  
  const pieChartData = [
    { name: 'Paid', value: stats.totalPaid, color: '#10B981' },
    { name: 'Overdue', value: stats.totalOverdue, color: '#EF4444' },
    { name: 'Unpaid', value: stats.totalInvoiced - stats.totalPaid - stats.totalOverdue - stats.totalDraft, color: '#F59E0B' },
    { name: 'Draft', value: stats.totalDraft, color: '#6B7280' },
  ].filter(item => item.value > 0);
  
  const expensesByCategoryData = Object.values(
    expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = {
          name: category,
          value: 0,
          color: getCategoryColor(category),
        };
      }
      acc[category].value += expense.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>)
  );
  
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Rent': '#3B82F6',
      'Utilities': '#8B5CF6',
      'Salary': '#EC4899',
      'Office Supplies': '#10B981',
      'Travel': '#F59E0B',
      'Marketing': '#6366F1',
      'Software': '#14B8A6',
      'Hardware': '#F43F5E',
      'Other': '#6B7280',
    };
    
    return colors[category] || '#6B7280';
  }
  
  return (
    // <AccountsLayout title="Financial Overview">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  <h3 className="text-2xl font-bold">{formatINR(stats.totalPaid, { showSymbol: false })}</h3>
                </div>
                <div className="flex items-center text-xs gap-1 mt-1 text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>12.5% from last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-red-600" />
                  <h3 className="text-2xl font-bold">{formatINR(stats.totalExpenses, { showSymbol: false })}</h3>
                </div>
                <div className="flex items-center text-xs gap-1 mt-1 text-red-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>8.2% from last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-blue-600" />
                  <h3 className="text-2xl font-bold">{formatINR(stats.netProfit, { showSymbol: false })}</h3>
                </div>
                <div className="flex items-center text-xs gap-1 mt-1 text-blue-600">
                  <ArrowUp className="h-3 w-3" />
                  <span>15.3% from last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Financial Performance</h2>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="charts" className="w-full">
          <TabsList>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Performance Charts
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" /> Breakdown Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="charts" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={incomeVsExpensesData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`₹${value.toLocaleString()}`]} 
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="income" name="Revenue" fill="#3B82F6" />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Profit Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={profitData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`₹${value.toLocaleString()}`]} 
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          name="Net Profit" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="breakdown" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`₹${value.toLocaleString()}`]} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expensesByCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`₹${value.toLocaleString()}`]} 
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    // </AccountsLayout>
  );
};

export default AccountsOverview;