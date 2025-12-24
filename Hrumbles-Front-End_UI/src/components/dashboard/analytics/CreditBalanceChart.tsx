import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays, Loader2 } from 'lucide-react';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subDays, startOfYear } from 'date-fns';

const CreditBalanceChart: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: new Date() });

  const fetchTransactions = useCallback(async (range: any) => {
    if (!organizationId || !range.from || !range.to) return;
    try {
      setLoading(true);
      const start = new Date(range.from); start.setHours(0, 0, 0, 0);
      const end = new Date(range.to); end.setHours(23, 59, 59, 999);
      const { data, error } = await supabase.from('credit_transactions').select('*').eq('organization_id', organizationId).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at', { ascending: true });
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [organizationId]);

  useEffect(() => { fetchTransactions(dateRange); }, [dateRange, fetchTransactions]);

  const handleManualDateChange = (range: any) => {
    const newFrom = range?.from || range?.startDate;
    const newTo = range?.to || range?.endDate;
    if (newFrom && newTo) {
      setSelectedPreset('custom');
      setDateRange({ from: new Date(newFrom), to: new Date(newTo) });
    }
  };

  const presets = [
    { id: 'last7days', label: 'Last 7 Days', get: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { id: 'thisMonth', label: 'This Month', get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
    { id: 'thisYear', label: 'This Year', get: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  ];

  const chartData = useMemo(() => {
    const grouped = transactions.reduce((acc: any, t: any) => {
      const day = t.created_at.split('T')[0];
      acc[day] = { date: day, balance: Number(t.balance_after) };
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [transactions]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { start: 0, end: 0, change: 0, percent: 0 };
    const start = (chartData[0] as any).balance;
    const end = (chartData[chartData.length - 1] as any).balance;
    const change = end - start;
    const percent = start !== 0 ? (change / start) * 100 : 0;
    return { start, end, change, percent };
  }, [chartData]);

  return (
    <Card className="shadow-md border-none bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-600" /> Credit Balance Over Time
            </CardTitle>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
              <EnhancedDateRangeSelector value={dateRange} onChange={handleManualDateChange} onApply={handleManualDateChange} monthsView={2} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.id} onClick={() => { setSelectedPreset(p.id); setDateRange(p.get()); }} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border ${selectedPreset === p.id ? 'bg-purple-600 text-white' : 'bg-white text-gray-500'}`}>{p.label}</button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 && (
          <div className="flex justify-between items-end mb-8">
            {/* HIGHLIGHT: stats now rounded to whole numbers */}
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Starting Credits</p><p className="text-sm font-bold">{Math.round(stats.start)}</p></div>
            <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Current Credits</p><p className="text-sm font-bold text-indigo-600">{Math.round(stats.end)}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Change</p><p className={`text-sm font-bold ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(stats.change)} ({Math.round(stats.percent)}%)</p></div>
          </div>
        )}
        <div className="h-[300px] w-full">
          {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600"/></div> : 
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', {month:'short', day:'numeric'})} />
                <YAxis tick={{fontSize: 10}} />
                {/* HIGHLIGHT: Tooltip now shows Credits as whole numbers */}
                <Tooltip formatter={(v: any) => [`${Math.round(v)} Credits`]} />
                <Area type="monotone" dataKey="balance" stroke="#7731E8" strokeWidth={3} fillOpacity={0.1} fill="#7731E8" />
              </AreaChart>
            </ResponsiveContainer>
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditBalanceChart;