// src/components/reports/ContactsTrendsReport.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Activity, ArrowUp, Sigma } from 'lucide-react';
import { DateRangePickerField } from './DateRangePickerField';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

const ContactsTrendsReport: React.FC = () => {
  const [rawData, setRawData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dataError } = await supabase.from('contacts')
          .select('created_at, hr_employees!contacts_created_by_fkey (id, first_name, last_name)')
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString());

        if (dataError) throw dataError;
        setRawData(data.filter(d => d.hr_employees));
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const { chartData, tableData, tableColumns, chartTitle } = useMemo(() => {
    const getCreatorName = (item: any) => `${item.hr_employees.first_name} ${item.hr_employees.last_name}`;

    let pivotedData: Record<string, any> = {};
    let columnMap: Record<string, string> = {};

    rawData.forEach(item => {
      const creatorName = getCreatorName(item);
      
      if (!pivotedData[creatorName]) {
        pivotedData[creatorName] = { 'Creator Name': creatorName };
      }

      let key = '';
      switch (granularity) {
        case 'weekly': key = format(new Date(item.created_at), 'E'); break;
        case 'monthly': key = format(new Date(item.created_at), 'MMM yyyy'); break;
        case 'yearly': key = format(new Date(item.created_at), 'yyyy'); break;
        default: key = format(new Date(item.created_at), 'yyyy-MM-dd'); break;
      }
      
      if (!columnMap[key]) columnMap[key] = key;
      pivotedData[creatorName][key] = (pivotedData[creatorName][key] || 0) + 1;
    });
    
    let columns = Object.keys(columnMap).sort((a, b) => {
        if (granularity === 'weekly') {
            const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return dayOrder.indexOf(a) - dayOrder.indexOf(b);
        }
        if (isValid(new Date(a)) && isValid(new Date(b))) {
            return new Date(a).getTime() - new Date(b).getTime();
        }
        return a.localeCompare(b);
    });

    const finalTableData = Object.values(pivotedData).map(row => {
        const total = columns.reduce((sum, col) => sum + (row[col] || 0), 0);
        return { ...row, Total: total };
    }).filter(row => row.Total > 0);

    const chartAggregatedData = columns.map(col => ({
        label: col,
        count: finalTableData.reduce((sum, row) => sum + (row[col] || 0), 0)
    }));

    return {
      chartData: chartAggregatedData,
      tableData: finalTableData,
      tableColumns: ['Creator Name', ...columns, 'Total'],
      chartTitle: `Trend for ${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`
    };
  }, [rawData, granularity, dateRange]);

  const totalAdded = tableData.reduce((sum, item) => sum + item.Total, 0);
  const peak = chartData.reduce((max, item) => item.count > max.count ? item : max, { label: 'N/A', count: 0 });
  const average = totalAdded > 0 && chartData.length > 0 ? (totalAdded / chartData.length).toFixed(1) : '0.0';

  const totalsRow = useMemo(() => {
    const totals: Record<string, number | string> = { 'Creator Name': 'Total' };
    tableColumns.slice(1).forEach(col => {
      totals[col] = tableData.reduce((sum, row) => sum + (row[col] || 0), 0);
    });
    return totals;
  }, [tableData, tableColumns]);

  const formatTick = (tick: string) => {
      const date = new Date(tick);
      if (!isValid(date)) return tick;
      if (granularity === 'daily') return format(date, 'MMM d');
      if (granularity === 'monthly') return tick.split(' ')[0];
      return tick;
  };

  return (
    <Card>
      <CardHeader><CardTitle>Contact Acquisition Trends</CardTitle><p className="text-sm text-muted-foreground">Analyze contact creation activity with detailed breakdowns.</p></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}><TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger><TabsTrigger value="monthly">Monthly</TabsTrigger><TabsTrigger value="yearly">Yearly</TabsTrigger></TabsList></Tabs>
            <div className="flex-1"><DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Contacts Added</CardTitle><Sigma className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{totalAdded}</div><p className="text-xs text-muted-foreground">in selected period</p></CardContent></Card><Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Peak Activity</CardTitle><ArrowUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{peak.count}</div><p className="text-xs text-muted-foreground">on {peak.label !== 'N/A' && granularity === 'daily' ? format(new Date(peak.label), 'MMM d, yyyy') : peak.label}</p></CardContent></Card><Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Average Additions</CardTitle><Activity className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">{average}</div><p className="text-xs text-muted-foreground">per {granularity.slice(0,-2)}</p></CardContent></Card></div>
        
        <Card>
            <CardHeader><CardTitle className="text-base">{chartTitle}</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">{isLoading ? <div className="flex h-full w-full items-center justify-center"><LoadingSpinner/></div> : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">{granularity === 'daily' ? (<AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tickFormatter={formatTick} /><YAxis allowDecimals={false}/><Tooltip /><Area type="monotone" dataKey="count" name="Contacts" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} /></AreaChart>) : (<BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tickFormatter={formatTick} /><YAxis allowDecimals={false}/><Tooltip /><Legend /><Bar dataKey="count" name="Contacts Added" fill="#8884d8" /></BarChart>)}</ResponsiveContainer>
                ) : (<div className="flex h-full w-full items-center justify-center"><Alert className="w-auto"><AlertCircle className="h-4 w-4"/><AlertDescription>No data for this period.</AlertDescription></Alert></div>)}</div>

                <div className="mt-6 rounded-md border">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader><TableRow>{tableColumns.map(col => <TableHead key={col} className={col !== 'Creator Name' ? 'text-center whitespace-nowrap' : 'sticky left-0 bg-secondary z-10'}>{formatTick(col)}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>{tableData.map(row => (
                                <TableRow key={row['Creator Name']}><TableCell className="font-medium whitespace-nowrap sticky left-0 bg-background z-10">{row['Creator Name']}</TableCell>{tableColumns.slice(1).map(col => <TableCell key={col} className="text-center">{row[col] || 0}</TableCell>)}</TableRow>
                            ))}</TableBody>
                            <TableFooter><TableRow><TableCell className="font-bold sticky left-0 bg-secondary z-10">Total</TableCell>{tableColumns.slice(1).map(col => <TableCell key={col} className="text-center font-bold">{totalsRow[col] || 0}</TableCell>)}</TableRow></TableFooter>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default ContactsTrendsReport;