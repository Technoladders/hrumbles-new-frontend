import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector"; 

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import Loader from "@/components/ui/Loader";
import StatCard from "@/components/global/verifications/StatCard";
import MiniChartCard from "@/components/global/verifications/MiniChartCard";
import VerificationTypeTable from "@/components/global/verifications/VerificationTypeTable";
import PricingModal from "@/components/global/verifications/PricingModal";

import { Sigma, DollarSign, Activity, Settings, CheckCircle } from "lucide-react";
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

// 1. CONFIGURATION: Defined every single lookup type explicitly
// This ensures they appear as separate rows in your table.
const VERIFICATION_CONFIG = [
  { 
    id: 'mobile_to_uan', 
    label: 'Mobile to UAN', 
    successCodes: ['1016'], 
    color: '#7B43F1' 
  },
  { 
    id: 'pan_to_uan', 
    label: 'PAN to UAN', 
    successCodes: ['1029'], 
    color: '#6366F1' 
  },
  { 
    id: 'latest_passbook_mobile', 
    label: 'Latest Passbook (Mobile)', 
    successCodes: ['1022'], 
    color: '#00C49F' 
  },
  { 
    id: 'uan_full_history_gl', 
    label: 'UAN Full History (GL)', 
    successCodes: ['1013'], 
    color: '#F59E0B' 
  },
  { 
    id: 'uan_full_history', 
    label: 'UAN Full History', // Added fallback for Truthscreen naming convention
    successCodes: ['1013'], 
    color: '#D97706' 
  },
  { 
    id: 'latest_employment_uan', 
    label: 'Latest Employment (UAN)', 
    successCodes: ['1014'], 
    color: '#EC4899' 
  },
  { 
    id: 'latest_employment_mobile', 
    label: 'Latest Employment (Mobile)', 
    successCodes: ['1014'], 
    color: '#14B8A6' 
  }
];

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

      if (lookupsRes.error) throw lookupsRes.error;
      if (pricesRes.error) throw pricesRes.error;

      return { lookups: lookupsRes.data, prices: pricesRes.data };
    }
  });

  const { stats, totals, chartData, miniChartData } = useMemo(() => {
    if (!data) return { stats: [], totals: {}, chartData: [], miniChartData: { usage: [], cost: [] } };
    
    const getPrice = (typeKey: string, orgId: string | null): number => {
      const orgOverride = data.prices.find(p => p.organization_id === orgId && p.verification_type === typeKey);
      return orgOverride ? Number(orgOverride.price) : 
             (Number(data.prices.find(p => p.organization_id === null && p.verification_type === typeKey)?.price) || 0);
    };
    console.log("getPrice function defined", data);
    // 2. LOGIC UPDATE: Map over the detailed config array instead of grouping
    const typeStats = VERIFICATION_CONFIG.map((config) => {
      console.log("Processing config:", config);
      // Find database records that match this specific ID exactly
      const relevantLookups = data.lookups.filter(l => l.lookup_type === config.id);
      console.log("relevantLookups for", config.id, relevantLookups);
      const totalUsage = relevantLookups.length;
      
      // Calculate success based on the specific codes for this type
      const successfulCount = relevantLookups.filter(l => {
        const responseData = l.response_data as any;
        const code = String(responseData?.data?.code || responseData?.code || '');
        return config.successCodes.includes(code);
      }).length;

      const totalCost = relevantLookups.reduce((sum, l) => sum + getPrice(config.id, l.organization_id), 0);

      return { 
        key: config.id, 
        title: config.label, 
        color: config.color, 
        usage: totalUsage, 
        successRate: totalUsage > 0 ? (successfulCount / totalUsage) * 100 : 0, 
        cost: totalCost 
      };
    }); 
    // Note: I removed the .filter(usage > 0) so that ALL types show in the table even if count is 0,
    // which seems to be what you requested ("show all the details"). 

    const overallTotals = {
      verifications: typeStats.reduce((s, t) => s + t.usage, 0),
      cost: typeStats.reduce((s, t) => s + t.cost, 0),
      topType: typeStats.reduce((max, t) => (t.usage > max.usage ? t : max), typeStats[0] || {} as any),
    };

    // 3. CHART UPDATE: Stacked bars to show breakdown of all types daily
    const dailyChartData = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate }).map(day => {
        let entry: any = { name: format(day, 'dd/MM') };
        const dayStart = startOfDay(day).getTime();

        VERIFICATION_CONFIG.forEach((config) => {
            const dailyLookups = data.lookups.filter(l => 
              l.lookup_type === config.id && 
              startOfDay(new Date(l.created_at)).getTime() === dayStart
            );
            entry[`${config.label}_usage`] = dailyLookups.length;
            entry[`${config.label}_cost`] = dailyLookups.reduce((sum, l) => sum + getPrice(config.id, l.organization_id), 0);
        });
        return entry;
    });
    
    // Filter pie chart to only show non-zero values to keep it clean
    const activeStats = typeStats.filter(s => s.usage > 0);
    const usageForPie = activeStats.map(s => ({ name: s.title, value: s.usage, color: s.color }));
    const costForPie = activeStats.map(s => ({ name: s.title, value: s.cost, color: s.color }));

    return { stats: typeStats, totals: overallTotals, chartData: dailyChartData, miniChartData: { usage: usageForPie, cost: costForPie } };
  }, [data, dateRange]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader size={60} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Verifications Dashboard</h1>
          <p className="text-gray-500 mt-1">Global summary of all verification activities.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truthscreen">Truthscreen</SelectItem>
                  <SelectItem value="gridlines">Gridlines</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={() => setIsPricingModalOpen(true)} className="shadow-md bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"><Settings size={16} className="mr-2" /> Manage Pricing</Button>
        </div>
      </div>
      
   <div className="w-full md:w-auto inline-block">
        <EnhancedDateRangeSelector 
          value={dateRange} 
          onChange={(newRange) => {
            if (newRange?.startDate && newRange?.endDate) {
              setDateRange({
                startDate: newRange.startDate,
                endDate: newRange.endDate,
                key: 'selection'
              });
            }
          }} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Verifications" value={totals.verifications?.toLocaleString() || '0'} icon={<Sigma className="h-6 w-6 text-indigo-500"/>} />
        <StatCard title="Total Billed Cost" value={totals.cost?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0'} icon={<DollarSign className="h-6 w-6 text-green-500"/>} />
        <StatCard title="Most Used Type" value={totals.topType?.title || 'N/A'} description={`${totals.topType?.usage?.toLocaleString() || 0} checks`} icon={<Activity className="h-6 w-6 text-amber-500"/>} />
        <StatCard title="Avg. Success Rate" value={`${(totals.verifications ? (stats.reduce((a, b) => a + (b.successRate * b.usage), 0) / totals.verifications) : 0).toFixed(1)}%`} icon={<CheckCircle className="h-6 w-6 text-sky-500"/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(val) => chartDataType === 'cost' ? `₹${val}` : val} />
                          <Tooltip 
                            formatter={(value: number) => chartDataType === 'cost' ? value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : value.toLocaleString()}
                            cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }}
                           />
                          <Legend />
                          {/* Dynamically generate bars for every type in config */}
                          {VERIFICATION_CONFIG.map(v => (
                             <Bar key={v.id} dataKey={`${v.label}_${chartDataType}`} name={v.label} fill={v.color} radius={[4, 4, 0, 0]} stackId="a" />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <MiniChartCard title="Usage by Type" data={miniChartData.usage} chartType="pie" />
            <MiniChartCard title="Cost by Type" data={miniChartData.cost} chartType="bar" />
        </div>
      </div>
      
      {/* 4. TABLE: This will now receive the full list of stats, including 0 usage rows */}
      <VerificationTypeTable data={stats} sourceFilter={sourceFilter} />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  );
};

export default VerificationHubPage;