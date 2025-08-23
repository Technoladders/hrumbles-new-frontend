// src/components/clients-new/ClientFinancials.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { ClientMetrics, MonthlyData, HiresByMonth } from './ClientTypes';
import { TrendingUp, DollarSign, Users } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <p className="label font-bold text-gray-700">{label}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.dataKey === 'profitMargin' ? `${pld.value.toFixed(2)}%` : formatCurrency(pld.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ClientFinancialsProps {
  metrics: ClientMetrics;
  monthlyData: MonthlyData[];
  hiresByMonth: HiresByMonth[];
}

const COLORS = ['#7B43F1', '#A74BC8'];

const ClientFinancials: React.FC<ClientFinancialsProps> = ({ metrics, monthlyData, hiresByMonth }) => {
  const totalRevenue = metrics.candidateRevenue + metrics.employeeRevenueINR;
  const totalProfit = metrics.candidateProfit + metrics.employeeProfitINR;

  const pieData = [
    { name: 'Permanent Placements', value: metrics.candidateRevenue },
    { name: 'Contractual Staffing', value: metrics.employeeRevenueINR },
  ].filter(d => d.value > 0);

  const profitMarginData = monthlyData.map(d => ({
      ...d,
      profitMargin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div><p className="text-xs text-muted-foreground">For the selected period</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Profit</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div><p className="text-xs text-muted-foreground">For the selected period</p></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Performance Over Time</CardTitle></CardHeader>
        <CardContent>
            {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 12 }}/><YAxis yAxisId="left" tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 12 }}/><RechartsTooltip content={<CustomTooltip />} /><Legend /><Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#7B43F1" strokeWidth={2} name="Revenue"/><Line yAxisId="left" type="monotone" dataKey="profit" stroke="#A74BC8" strokeWidth={2} name="Profit"/></LineChart>
                </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">No time-series data available.</div>}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Revenue Contribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">{pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><RechartsTooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]}/><Legend /></PieChart>
                </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">No revenue data.</div>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Hires Per Month</CardTitle></CardHeader>
          <CardContent>
            {hiresByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={hiresByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><RechartsTooltip /><Legend /><Bar dataKey="hires" fill="#7B43F1" name="New Hires"/></BarChart>
                </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">No new hires in this period.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientFinancials;