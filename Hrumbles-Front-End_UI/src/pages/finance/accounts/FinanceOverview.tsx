import React, { useState, useMemo } from 'react';
import { useAccountsStore } from '@/lib/accounts-data';
import AccountsLayout from '@/components/accounts/AccountsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatINR } from '@/utils/currency';
import { 
  ArrowDown, ArrowUp, Calendar, Download, 
  IndianRupee, PieChart as PieChartIcon, Activity 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePickerField } from '@/components/ui/DateRangePickerField';
// --- 1. IMPORT FRAMER MOTION ---
import { motion } from 'framer-motion';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}

// --- Define our tabs for the new component ---
const TABS_CONFIG = [
  { id: 'charts', label: 'Performance Charts', icon: <Activity className="h-4 w-4" /> },
  { id: 'breakdown', label: 'Breakdown Analysis', icon: <PieChartIcon className="h-4 w-4" /> }
];

const AccountsOverview: React.FC = () => {
  const { invoices, expenses, stats } = useAccountsStore();
  const [timeRange, setTimeRange] = useState('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const USD_TO_INR_RATE = 84;

  // --- 2. ADD STATE FOR THE ACTIVE TAB ---
  const [activeTab, setActiveTab] = useState(TABS_CONFIG[0].id);

  const chartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataByMonth: { [key: string]: { name: string; income: number; expenses: number } } = {};
    const today = new Date();

    // Debug: Log the data we're working with
    console.log('📊 Chart Data Debug:', {
      invoicesCount: invoices.length,
      expensesCount: expenses.length,
      sampleInvoice: invoices[0],
      sampleExpense: expenses[0],
      timeRange,
      customDateRange
    });

    // Helper to parse date strings - handles both 'YYYY-MM-DD' (from database) and 'DD-MM-YYYY' formats
    const parseDate = (dateString: string): Date | null => {
        if (!dateString) return null;
        
        // Try YYYY-MM-DD format first (standard database format)
        if (dateString.includes('-') && dateString.length === 10) {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                // Check if it's YYYY-MM-DD format
                if (parts[0].length === 4) {
                    // YYYY-MM-DD format
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                } else {
                    // DD-MM-YYYY format
                    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
            }
        }
        
        // Try to parse as ISO string
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    };

    // Determine date range based on timeRange selection
    let startDate: Date;
    let endDate: Date = today;

    // Calculate start date based on selected time range
    switch (timeRange) {
      case 'week':
        // Last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        // Last 30 days / 1 month
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        // Last 3 months
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        // Last 12 months / 1 year
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 12);
        break;
      case 'custom':
        // Custom date range
        if (customDateRange?.startDate && customDateRange?.endDate) {
          startDate = customDateRange.startDate;
          endDate = customDateRange.endDate;
        } else {
          // Fallback to last 7 months if custom range not set
          startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        }
        break;
      default:
        // Default to last 7 months
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    }

    console.log('📅 Date Range:', { timeRange, startDate, endDate });

    // Initialize months in the range
    let currentDate = new Date(startDate);
    currentDate.setDate(1); // Start from first day of month
    
    while (currentDate <= endDate) {
      const monthName = monthNames[currentDate.getMonth()];
      const year = currentDate.getFullYear().toString().slice(-2);
      const key = `${monthName} '${year}`;
      dataByMonth[key] = { name: key, income: 0, expenses: 0 };
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Process paid invoices for income
    let processedInvoices = 0;
    invoices
        .filter(inv => inv.status === 'Paid' && inv.paymentDate)
        .forEach(inv => {
            const paymentDate = parseDate(inv.paymentDate!);
            if (paymentDate && paymentDate >= startDate && paymentDate <= endDate) {
                const monthName = monthNames[paymentDate.getMonth()];
                const year = paymentDate.getFullYear().toString().slice(-2);
                const key = `${monthName} '${year}`;
                if (dataByMonth[key]) {
                    const amountInINR = inv.currency === 'USD'
                        ? (inv.paidAmount || inv.totalAmount) * USD_TO_INR_RATE
                        : (inv.paidAmount || inv.totalAmount);
                    dataByMonth[key].income += amountInINR;
                    processedInvoices++;
                }
            }
        });

    // Process expenses
    let processedExpenses = 0;
    expenses.forEach(exp => {
        const expenseDate = parseDate(exp.date);
        if (expenseDate && expenseDate >= startDate && expenseDate <= endDate) {
            const monthName = monthNames[expenseDate.getMonth()];
            const year = expenseDate.getFullYear().toString().slice(-2);
            const key = `${monthName} '${year}`;
            if (dataByMonth[key]) {
                dataByMonth[key].expenses += exp.amount;
                processedExpenses++;
            }
        }
    });
    
    console.log('✅ Processed:', { processedInvoices, processedExpenses, dataByMonth });
    
    return Object.values(dataByMonth);

  }, [invoices, expenses, timeRange, customDateRange]);

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

  // Check if we have any data to display
  const hasData = incomeVsExpensesData.some(d => d.income > 0 || d.expenses > 0);

  // Export report function
  const exportReport = () => {
    // Prepare CSV data
    const csvRows = [];
    
    // Add header with report info
    csvRows.push(['Financial Performance Report']);
    csvRows.push(['Generated:', new Date().toLocaleDateString()]);
    csvRows.push(['Time Range:', timeRange === 'custom' && customDateRange 
      ? `${customDateRange.startDate?.toLocaleDateString()} - ${customDateRange.endDate?.toLocaleDateString()}`
      : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
    ]);
    csvRows.push([]); // Empty row
    
    // Add summary statistics
    csvRows.push(['Summary Statistics']);
    csvRows.push(['Total Revenue', formatINR(stats.totalPaid, { showSymbol: true })]);
    csvRows.push(['Total Expenses', formatINR(stats.totalExpenses, { showSymbol: true })]);
    csvRows.push(['Net Profit', formatINR(stats.netProfit, { showSymbol: true })]);
    csvRows.push(['Avg Monthly Income', formatINR(incomeVsExpensesData.reduce((sum, d) => sum + d.income, 0) / incomeVsExpensesData.length, { showSymbol: true })]);
    csvRows.push(['Avg Monthly Expenses', formatINR(incomeVsExpensesData.reduce((sum, d) => sum + d.expenses, 0) / incomeVsExpensesData.length, { showSymbol: true })]);
    csvRows.push(['Avg Monthly Profit', formatINR(incomeVsExpensesData.reduce((sum, d) => sum + (d.income - d.expenses), 0) / incomeVsExpensesData.length, { showSymbol: true })]);
    csvRows.push([]); // Empty row
    
    // Add monthly breakdown
    csvRows.push(['Monthly Breakdown']);
    csvRows.push(['Month', 'Income (₹)', 'Expenses (₹)', 'Net Profit (₹)']);
    
    incomeVsExpensesData.forEach(item => {
      csvRows.push([
        item.name,
        item.income.toFixed(2),
        item.expenses.toFixed(2),
        (item.income - item.expenses).toFixed(2)
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with date
    const filename = `financial-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Report exported successfully:', filename);
  };
  
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
          <div className="flex gap-2 items-center">
            <Select 
              value={timeRange} 
              onValueChange={(value) => {
                setTimeRange(value);
                if (value === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setShowDatePicker(false);
                  setCustomDateRange(null);
                }
              }}
            >
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
            
            {/* Date Range Picker for Custom Range */}
            {showDatePicker && (
              <DateRangePickerField
                dateRange={customDateRange}
                onDateRangeChange={setCustomDateRange}
                onApply={() => {
                  // Data will automatically update via the useMemo dependency
                }}
              />
            )}
            
            <Button variant="outline" onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
          </div>
        </div>
        
        {/* --- 3. REPLACED TABS COMPONENT WITH ANIMATED VERSION --- */}

            <div className="inline-flex space-x-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1">
                {TABS_CONFIG.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative w-half flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition
                        ${
                          activeTab === tab.id 
                            ? 'text-white' 
                            : 'text-slate-600 hover:text-black dark:text-slate-300 dark:hover:text-white'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {activeTab === tab.id && (
                            <motion.span
                                layoutId="active-pill"
                                className="absolute inset-0 z-0 bg-blue-600"
                                style={{ borderRadius: 9999 }}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{tab.icon}</span>
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>
            {/* --- 4. CONDITIONALLY RENDER CONTENT BASED ON activeTab --- */}
            <div className="mt-4">
                {activeTab === 'charts' && (
                  <div className="space-y-6 pt-4">
                    {/* Single Combined Chart - Full Width */}
                    <Card className="shadow-lg">
                      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-2xl">Financial Performance Overview</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Income, Expenses & Net Profit Analysis</p>
                          </div>
                          <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
                              <span className="text-sm font-medium">Income</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-gradient-to-r from-red-400 to-red-600"></div>
                              <span className="text-sm font-medium">Expenses</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-4 bg-blue-600"></div>
                              <span className="text-sm font-medium">Net Profit</span>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-8">
                        {!hasData ? (
                          <div className="h-[500px] flex items-center justify-center">
                            <div className="text-center">
                              <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Financial Data Available</h3>
                              <p className="text-sm text-gray-500 mb-4">
                                {invoices.length === 0 && expenses.length === 0 
                                  ? "Start by adding invoices and expenses to see your financial performance."
                                  : "No data found for the selected time period. Try selecting a different date range."}
                              </p>
                              {/* <Button onClick={() => console.log('Debug Data:', { invoices, expenses })}>
                                Debug Data (Check Console)
                              </Button> */}
                            </div>
                          </div>
                        ) : (
                          <>
                        <div className="h-[500px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={incomeVsExpensesData}
                              margin={{ top: 50, right: 40, left: 20, bottom: 30 }}
                            >
                              <defs>
                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9}/>
                                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8}/>
                                </linearGradient>
                              </defs>
                              
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 13, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={{ stroke: '#E5E7EB' }}
                              />
                              <YAxis 
                                tick={{ fontSize: 13, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={{ stroke: '#E5E7EB' }}
                                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                              />
                              <Tooltip 
                                formatter={(value: number) => [`₹${value.toLocaleString()}`, '']} 
                                labelFormatter={(label) => `Month: ${label}`}
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                  padding: '12px'
                                }}
                                labelStyle={{ fontWeight: 600, marginBottom: '8px' }}
                              />
                              <Legend 
                                verticalAlign="top"
                                height={50}
                                iconType="rect"
                                wrapperStyle={{
                                  paddingBottom: '20px',
                                  fontSize: '14px',
                                  fontWeight: 500
                                }}
                              />
                              
                              <Bar 
                                dataKey="income" 
                                name="Income" 
                                fill="url(#incomeGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                                label={({ x, y, width, value, index }) => {
                                  if (!value || value === 0) return null;
                                  const yOffset = index % 2 === 0 ? -8 : -20;
                                  return (
                                    <text 
                                      x={x + width / 2} 
                                      y={y + yOffset} 
                                      fill="#059669" 
                                      fontSize={12}
                                      fontWeight={600}
                                      textAnchor="middle"
                                    >
                                      ₹{(value / 1000).toFixed(0)}K
                                    </text>
                                  );
                                }}
                              />
                              
                              <Bar 
                                dataKey="expenses" 
                                name="Expenses" 
                                fill="url(#expenseGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                                label={({ x, y, width, value, index }) => {
                                  if (!value || value === 0) return null;
                                  const yOffset = index % 2 === 0 ? -20 : -8;
                                  return (
                                    <text 
                                      x={x + width / 2} 
                                      y={y + yOffset} 
                                      fill="#DC2626" 
                                      fontSize={12}
                                      fontWeight={600}
                                      textAnchor="middle"
                                    >
                                      ₹{(value / 1000).toFixed(0)}K
                                    </text>
                                  );
                                }}
                              />
                              
                              <Line 
                                type="monotone" 
                                dataKey={(data) => data.income - data.expenses}
                                name="Net Profit" 
                                stroke="#2563EB" 
                                strokeWidth={4}
                                dot={{ 
                                  r: 6, 
                                  fill: '#2563EB', 
                                  strokeWidth: 3, 
                                  stroke: '#fff',
                                  filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3))'
                                }}
                                activeDot={{ 
                                  r: 8,
                                  fill: '#2563EB',
                                  stroke: '#fff',
                                  strokeWidth: 3
                                }}
                                label={({ x, y, value }) => {
                                  if (value === undefined || value === null) return null;
                                  return (
                                    <g>
                                      <rect
                                        x={x - 32}
                                        y={y - 28}
                                        width={64}
                                        height={22}
                                        fill="white"
                                        stroke="#2563EB"
                                        strokeWidth={2}
                                        rx={6}
                                        opacity={0.95}
                                      />
                                      <text 
                                        x={x} 
                                        y={y - 12} 
                                        fill="#2563EB" 
                                        fontSize={13}
                                        fontWeight={700}
                                        textAnchor="middle"
                                      >
                                        ₹{(value / 1000).toFixed(0)}K
                                      </text>
                                    </g>
                                  );
                                }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700 font-medium mb-1">Avg Monthly Income</p>
                            <p className="text-2xl font-bold text-green-900">
                              {formatINR(
                                incomeVsExpensesData.reduce((sum, d) => sum + d.income, 0) / incomeVsExpensesData.length,
                                { showSymbol: true }
                              )}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-700 font-medium mb-1">Avg Monthly Expenses</p>
                            <p className="text-2xl font-bold text-red-900">
                              {formatINR(
                                incomeVsExpensesData.reduce((sum, d) => sum + d.expenses, 0) / incomeVsExpensesData.length,
                                { showSymbol: true }
                              )}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium mb-1">Avg Monthly Profit</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {formatINR(
                                incomeVsExpensesData.reduce((sum, d) => sum + (d.income - d.expenses), 0) / incomeVsExpensesData.length,
                                { showSymbol: true }
                              )}
                            </p>
                          </div>
                        </div>
                        </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'breakdown' && (
                  <div className="space-y-6 pt-4">
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
                  </div>
                )}
            </div>
        </div>
     
    // </AccountsLayout>
  );
};

export default AccountsOverview;