import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import Loader from "@/components/ui/Loader";
import StatCard from "@/components/global/verifications/StatCard";
import MiniChartCard from "@/components/global/verifications/MiniChartCard";
import VerificationTypeTable from "@/components/global/verifications/VerificationTypeTable";
import PricingModal from "@/components/global/verifications/PricingModal";

import { Sigma, DollarSign, Activity, Settings, CheckCircle, BarChart2 } from "lucide-react";
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

const VERIFICATION_TYPES = {
  'uan-by-mobile-pan': { title: 'UAN by Mobile/PAN', lookupTypes: ['mobile', 'pan'], color: '#7B43F1' },
  'basic-uan-history': { title: 'Basic UAN History', lookupTypes: ['uan_full_history'], color: '#00C49F' },
};

const VerificationHubPage: React.FC = () => {
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [chartDataType, setChartDataType] = useState<'usage' | 'cost'>('usage');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection'
  });
  const [sourceFilter, setSourceFilter] = useState('truthscreen');

  const { data, isLoading } = useQuery({
    queryKey: ['verificationGlobalHub', dateRange, sourceFilter],
    queryFn: async () => {
      const [lookupsRes, pricesRes] = await Promise.all([
        supabase.from('uanlookups').select('id, organization_id, lookup_type, response_data, created_at')
          .eq('source', sourceFilter)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString()),
        supabase.from('verification_pricing').select('price, organization_id, verification_type')
          .eq('source', sourceFilter)
      ]);
      if (lookupsRes.error || pricesRes.error) throw new Error("Data fetch failed");
      return { lookups: lookupsRes.data, prices: pricesRes.data };
    }
  });

  const { stats, totals, chartData, miniChartData } = useMemo(() => {
    if (!data) return { stats: [], totals: {}, chartData: [], miniChartData: { usage: [], cost: [] } };
    
    const getPrice = (typeKey: string, orgId: string | null): number => {
      const orgOverride = data.prices.find(p => p.organization_id === orgId && p.verification_type === typeKey);
      return orgOverride?.price ?? data.prices.find(p => p.organization_id === null && p.verification_type === typeKey)?.price ?? 0;
    };
    
    const typeStats = Object.entries(VERIFICATION_TYPES).map(([key, config]) => {
      const relevantLookups = data.lookups.filter(l => config.lookupTypes.includes(l.lookup_type));
      const successful = relevantLookups.filter(l => l.response_data?.status === 1).length;
      return { key, title: config.title, color: config.color, usage: relevantLookups.length, successRate: relevantLookups.length > 0 ? (successful / relevantLookups.length) * 100 : 0, cost: relevantLookups.reduce((sum, l) => sum + getPrice(key, l.organization_id), 0) };
    });

    const overallTotals = {
      verifications: typeStats.reduce((s, t) => s + t.usage, 0),
      cost: typeStats.reduce((s, t) => s + t.cost, 0),
      topType: typeStats.reduce((max, t) => (t.usage > max.usage ? t : max), typeStats[0] || {} as any),
    };

    const dailyChartData = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate }).map(day => {
        let entry: any = { name: format(day, 'dd/MM') };
        Object.entries(VERIFICATION_TYPES).forEach(([key, config]) => {
            const dailyLookups = data.lookups.filter(l => config.lookupTypes.includes(l.lookup_type) && startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime());
            entry[`${config.title}_usage`] = dailyLookups.length;
            entry[`${config.title}_cost`] = dailyLookups.reduce((sum, l) => sum + getPrice(key, l.organization_id), 0);
        });
        return entry;
    });
    
    const usageForPie = typeStats.map(s => ({ name: s.title, value: s.usage, color: s.color }));
    const costForPie = typeStats.map(s => ({ name: s.title, value: s.cost, color: s.color }));

    return { stats: typeStats, totals: overallTotals, chartData: dailyChartData, miniChartData: { usage: usageForPie, cost: costForPie } };
  }, [data]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader size={60} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Verifications Dashboard</h1>
          <p className="text-gray-500 mt-1">Global summary of all verification activities.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="truthscreen">Truthscreen</SelectItem><SelectItem value="gridlines">Gridlines</SelectItem></SelectContent>
            </Select>
            <Button onClick={() => setIsPricingModalOpen(true)} className="shadow-md bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"><Settings size={16} className="mr-2" /> Manage Pricing</Button>
        </div>
      </div>
      
      <div className="w-full md:w-1/3"><DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} onApply={() => {}}/></div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Verifications" value={totals.verifications?.toLocaleString() || '0'} icon={<Sigma className="h-6 w-6 text-indigo-500"/>} />
        <StatCard title="Total Billed Cost" value={totals.cost?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0'} icon={<DollarSign className="h-6 w-6 text-green-500"/>} />
        <StatCard title="Most Used Type" value={totals.topType?.title || 'N/A'} description={`${totals.topType?.usage?.toLocaleString() || 0} checks`} icon={<Activity className="h-6 w-6 text-amber-500"/>} />
        <StatCard title="Avg. Success Rate" value={`${(stats.reduce((a, b) => a + (b.successRate * b.usage), 0) / (totals.verifications || 1)).toFixed(1)}%`} icon={<CheckCircle className="h-6 w-6 text-sky-500"/>} />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-none bg-white">
              <CardHeader className="border-b flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <CardTitle className="text-xl">Daily Trends</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Comparing daily {chartDataType === 'usage' ? 'verifications' : 'costs'}.</p>
                  </div>
                  <Tabs value={chartDataType} onValueChange={(v) => setChartDataType(v as any)} className="mt-2 md:mt-0">
                      <TabsList><TabsTrigger value="usage">By Usage</TabsTrigger><TabsTrigger value="cost">By Cost</TabsTrigger></TabsList>
                  </Tabs>
              </CardHeader>
              <CardContent className="h-[350px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(val) => chartDataType === 'cost' ? `₹${val/1000}k` : val} />
                          <Tooltip 
                            formatter={(value: number) => chartDataType === 'cost' ? value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : value.toLocaleString()}
                            cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }}
                           />
                          <Legend />
                          {Object.values(VERIFICATION_TYPES).map(v => (
                             <Bar key={v.title} dataKey={`${v.title}_${chartDataType}`} name={v.title} fill={v.color} radius={[4, 4, 0, 0]} />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
        </div>

        {/* Right Column (Mini Charts) */}
        <div className="space-y-6">
            <MiniChartCard title="Usage by Type" data={miniChartData.usage} chartType="pie" />
            <MiniChartCard title="Cost by Type" data={miniChartData.cost} chartType="bar" />
        </div>
      </div>
      
      {/* Full-width Table */}
      <VerificationTypeTable data={stats} sourceFilter={sourceFilter} />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  );
};

export default VerificationHubPage;