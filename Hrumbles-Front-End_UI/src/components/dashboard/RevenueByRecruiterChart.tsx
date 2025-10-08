import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Calendar } from 'lucide-react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
 
// --- Helper Functions for Profit Calculation ---
const USD_TO_INR_RATE = 84;
 
const parseSalary = (salary?: string | number): number => {
  if (!salary) return 0;
  let salaryStr = String(salary);
  const isUSD = salaryStr.startsWith('$');
  const parts = salaryStr.replace(/[$,₹]/g, "").trim().split(" ");
  let amount = parseFloat(parts[0].replace(/,/g, '')) || 0;
  const budgetType = parts[1]?.toLowerCase() || "lpa";
 
  if (isUSD) amount *= USD_TO_INR_RATE;
  if (budgetType === "monthly") amount *= 12;
  else if (budgetType === "hourly") amount *= (160 * 12); // Assuming 160 hours/month
  return amount;
};
 
const calculateProfit = (candidate: any): number => {
  if (candidate.job_type === "Internal") {
    if (!candidate.accrual_ctc) return 0;
    const salaryAmount = parseSalary(candidate.ctc);
    const budgetAmount = parseSalary(candidate.accrual_ctc);
    return budgetAmount - salaryAmount;
  } else { // External
    const salaryAmount = parseSalary(candidate.ctc);
    const commissionValue = candidate.commission_value || 0;
    if (candidate.commission_type === "percentage") {
      return (salaryAmount * commissionValue) / 100;
    } else if (candidate.commission_type === "fixed") {
      return candidate.client_currency === 'USD' ? commissionValue * USD_TO_INR_RATE : commissionValue;
    }
    return 0;
  }
};
 
// --- Custom Legend for the Pie Chart ---
const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs text-gray-600">
            {payload.map((entry: any, index: number) => (
                <li key={`item-${index}`} className="flex items-center">
                    <span className="w-3 h-3 mr-2" style={{ backgroundColor: entry.color }} />
                    <span>{entry.payload.name}:</span>
                    <span className="font-semibold ml-1">{`${(entry.payload.percent * 100).toFixed(1)}%`}</span>
                </li>
            ))}
        </ul>
    );
};
 
// --- Main Component ---
const RevenueByRecruiterChart = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
 
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(new Date().setDate(new Date().getDate() - 90)),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
 
  const { data: rawRevenueData, isLoading: revenueDataLoading } = useQuery({
    queryKey: ['revenueByRecruiter', organizationId, dateRange[0].startDate, dateRange[0].endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_revenue_data_by_recruiter', {
        org_id: organizationId,
        start_date: dateRange[0].startDate.toISOString(),
        end_date: dateRange[0].endDate.toISOString(),
      });
      if (error) {
          console.error("Error fetching revenue data:", error);
          throw new Error("Failed to fetch revenue data.");
      }
      return data || [];
    },
    enabled: !!organizationId,
  });
 
  const revenueByRecruiter = useMemo(() => {
    if (!rawRevenueData) return [];
    
    const profitByRecruiter = rawRevenueData.reduce((acc: {[key: string]: number}, candidate) => {
      const profit = calculateProfit(candidate);
      if (profit > 0 && candidate.recruiter_name) {
          acc[candidate.recruiter_name] = (acc[candidate.recruiter_name] || 0) + profit;
      }
      return acc;
    }, {});
 
    return Object.entries(profitByRecruiter).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(0))
    })).sort((a, b) => b.value - a.value);
  }, [rawRevenueData]);
 
  return (
    <Card className="shadow-md border-none bg-white h-full flex flex-col">
        <CardHeader className="pb-4 flex-row items-center justify-between">
            <div>
                <CardTitle className="text-base font-semibold text-gray-700">Revenue by Recruiter</CardTitle>
                <CardDescription className="text-xs">Profit generated from joined candidates</CardDescription>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 text-xs">
                        <Calendar className="mr-2 h-4 w-4" />
                        {`${format(dateRange[0].startDate, "dd MMM yy")} - ${format(dateRange[0].endDate, "dd MMM yy")}`}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <DateRangePicker
                        onChange={(item: any) => setDateRange([item.selection])}
                        ranges={dateRange}
                        months={2}
                        direction="horizontal"
                        rangeColors={['#6366f1']}
                    />
                </PopoverContent>
            </Popover>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
            {revenueDataLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            ) : revenueByRecruiter.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={revenueByRecruiter}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                <text x={x} y={y} fill="#6b7280" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                    {new Intl.NumberFormat('en-IN').format(value as number)}
                                </text>
                                );
                            }}
                        >
                            {['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#f87171'].map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                            ))}
                        </Pie>
                        <Legend content={renderCustomLegend} />
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)} />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-sm text-gray-500">No revenue data for the selected period.</p>
            )}
        </CardContent>
    </Card>
  );
};
 
export default RevenueByRecruiterChart;