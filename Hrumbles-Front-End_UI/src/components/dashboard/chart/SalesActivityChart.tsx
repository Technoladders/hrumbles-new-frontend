import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PeriodwiseDatePicker } from "@/components/ui/custom/PeriodwiseDatePicker";
import { Loader2, Users, Building2, Edit3, CalendarClock } from "lucide-react";
import { startOfMonth, endOfMonth, isSameDay, format, addDays } from "date-fns";

interface SalesActivityChartProps {
  organizationId: string;
  employeeId?: string;
}

interface ActivityData {
  date: string;
  contacts_added: number;
  accounts_added: number;
  contacts_updated: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export const SalesActivityChart: React.FC<SalesActivityChartProps> = ({ organizationId, employeeId }) => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [frequency, setFrequency] = useState<string>("Daily");
  
  const [dateRange, setDateRange] = useState<DateRange | null>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const pickerMode = frequency === 'All' ? 'daily' : (frequency.toLowerCase() as any);

  // Date Formatting Helpers (Consistent with your Goal component)
  const computeStartIso = (date: Date | null): string | null => {
    if (!date) return null;
    return `${format(date, 'yyyy-MM-dd')}T00:00:00.000Z`;
  };

  const computeEndIso = (start: Date | null, end: Date | null): string | null => {
    if (!start) return null;
    let endDate = end ? new Date(end) : new Date(start);
    const nextDay = addDays(endDate, 1);
    return `${format(nextDay, 'yyyy-MM-dd')}T00:00:00.000Z`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !dateRange?.startDate) return;

      try {
        setIsLoading(true);
        const searchStartDate = computeStartIso(dateRange.startDate);
        const searchEndDate = computeEndIso(dateRange.startDate, dateRange.endDate || dateRange.startDate);

        if (!searchStartDate || !searchEndDate) return;

        // Calling the RPC (See SQL provided below to create this)
        const { data: rpcData, error } = await supabase.rpc('get_sales_crm_activity_analytics', {
          org_id: organizationId,
          search_start_date: searchStartDate,
          search_end_date: searchEndDate,
          filter_employee_id: employeeId || null,
          group_by_period: frequency.toLowerCase() // 'daily', 'weekly', 'monthly'
        });

        if (error) throw error;
        setData(rpcData || []);
        
      } catch (error) {
        console.error("Error fetching CRM data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, employeeId, dateRange, frequency]);

  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[450px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3"></div>
              Sales & CRM Activity
            </h3>
            
            <div className="hidden sm:block">
               <PeriodwiseDatePicker
                  value={dateRange}
                  onChange={setDateRange}
                  onApply={() => {}}
                  monthsView={2}
                  mode={pickerMode}
               />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
            <Tabs value={frequency} onValueChange={setFrequency} className="w-full sm:w-auto">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 p-1 shadow-inner">
                {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((val) => (
                  <TabsTrigger 
                    key={val}
                    value={val} 
                    className="px-3 py-1.5 rounded-full text-xs font-medium data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all"
                  >
                    {val}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="sm:hidden w-full flex justify-end">
               <PeriodwiseDatePicker
                  value={dateRange}
                  onChange={setDateRange}
                  onApply={() => {}}
                  monthsView={1}
                  mode={pickerMode}
               />
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tickFormatter={(str) => format(new Date(str), frequency === 'Daily' ? 'MMM dd' : 'MMM yyyy')}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                
                <Bar name="Contacts Added" dataKey="contacts_added" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Accounts Added" dataKey="accounts_added" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Contacts Updated" dataKey="contacts_updated" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
              <CalendarClock className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No activity found for this period.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};