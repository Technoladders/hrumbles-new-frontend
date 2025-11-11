// src/components/clients-new/ClientFinancials.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, BarChart,RadialBarChart, RadialBar, Bar, XAxis, YAxis, CartesianGrid,ComposedChart, AreaChart, Area, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
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

 <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
            {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    {/* --- Chart is now simplified to an AreaChart for Revenue --- */}
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <defs>
                          {/* --- Define the purple color gradient for the Revenue area --- */}
                          <linearGradient id="revenueGradientPurple" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }}/>
                        
                        {/* --- A single Y-Axis for Revenue --- */}
                        <YAxis stroke="#7B43F1" tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 12 }}/>

                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend />
                        
                        {/* --- Area chart for Revenue, using the purple gradient --- */}
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#7B43F1" 
                            strokeWidth={2} 
                            fill="url(#revenueGradientPurple)" 
                            name="Revenue" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                    No time-series data available.
                </div>
            )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* --- Card 1: Redesigned Revenue Contribution Chart --- */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Contribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        {/* This CustomLabel will display the total in the center */}
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-2xl font-bold fill-gray-800">
                            {formatCurrency(totalRevenue)}
                        </text>
                        <text x="50%" y="50%" dy={20} textAnchor="middle" className="text-sm fill-gray-500">
                            Total Revenue
                        </text>
                        
                        <Pie 
                            data={pieData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={70} // Made the hole slightly bigger
                            outerRadius={90} // Made the ring slightly thicker
                            paddingAngle={5} // Adds a nice gap between segments
                            dataKey="value"
                        >
                            {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">No revenue data.</div>
            )}
          </CardContent>
        </Card>

        {/* --- Card 2: Redesigned Hires Per Month Chart (Now an Area Chart) --- */}
   <Card>
  <CardHeader>
    <CardTitle>Hires Per Month</CardTitle>
  </CardHeader>
  <CardContent >
    {hiresByMonth.length > 0 ? (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={hiresByMonth}
         margin={{
            top: 0,    // To give space for the Legend at the top
            right: 0,  // To prevent the tooltip from being cut off
            left: -40,  // The key change: pulls the chart to the left
            bottom: -10,  // Standard bottom margin
          }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <RechartsTooltip />
          <Legend verticalAlign='top' />
          <Bar 
            dataKey="hires" 
            fill="#7B43F1" 
            name="New Hires" 
            radius={[10,10,0,0]}   
          />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
        No new hires in this period.
      </div>
    )}
  </CardContent>
</Card>


      </div>
    </div>
  );
}

export default ClientFinancials;