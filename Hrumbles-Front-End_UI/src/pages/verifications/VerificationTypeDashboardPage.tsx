import React, { useState, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import Loader from "@/components/ui/Loader";
import StatCardWithChart from "@/components/global/verifications/StatCardWithChart";
import OrganizationUsageTable from "@/components/global/verifications/OrganizationUsageTable";
import { Sigma, DollarSign, Star, CheckCircle, ArrowUp, ArrowDown } from "lucide-react";
import { eachDayOfInterval, startOfDay, format } from 'date-fns';

const VERIFICATION_TYPES: Record<string, { title: string; lookupTypes: string[]; color: string; successCodes?: string[] }> = {
  'mobile_to_uan': { title: 'Mobile to UAN', lookupTypes: ['mobile_to_uan'], color: '#7B43F1', successCodes: ['1016'] },
  'pan_to_uan': { title: 'PAN to UAN', lookupTypes: ['pan_to_uan'], color: '#6366F1', successCodes: ['1029'] },
  'latest_passbook_mobile': { title: 'Latest Passbook (Mobile)', lookupTypes: ['latest_passbook_mobile'], color: '#00C49F', successCodes: ['1022'] },
  'uan_full_history_gl': { title: 'UAN Full History (GL)', lookupTypes: ['uan_full_history_gl'], color: '#F59E0B', successCodes: ['1013'] },
  'uan_full_history': { title: 'UAN Full History', lookupTypes: ['uan_full_history'], color: '#D97706', successCodes: ['1013'] },
  'latest_employment_uan': { title: 'Latest Employment (UAN)', lookupTypes: ['latest_employment_uan'], color: '#EC4899', successCodes: ['1014'] },
  'latest_employment_mobile': { title: 'Latest Employment (Mobile)', lookupTypes: ['latest_employment_mobile'], color: '#14B8A6', successCodes: ['1014'] },
  'uan-by-mobile-pan': { title: 'UAN by Mobile/PAN', lookupTypes: ['mobile', 'pan'], color: '#7B43F1' },
  'basic-uan-history': { title: 'Basic UAN History', lookupTypes: ['uan_full_history'], color: '#00C49F' },
};

const VerificationTypeDashboardPage: React.FC = () => {
  const params = useParams();
  const verificationType = params.verificationType || params.type || '';
  const config = VERIFICATION_TYPES[verificationType];
  
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const [sourceFilter, setSourceFilter] = useState(queryParams.get('source') || 'truthscreen');
  const [chartDataType, setChartDataType] = useState<'usage' | 'cost'>('usage');
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null; key: string }>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection'
  });

const { data, isLoading } = useQuery({
  queryKey: ['verificationTypeDashboard', verificationType, dateRange, sourceFilter],
  queryFn: async () => {
      if (!dateRange.startDate || !dateRange.endDate) return { organizations: [], lookups: [], prices: [] };
      const [orgsRes, lookupsRes, pricesRes] = await Promise.all([
          supabase.from('hr_organizations').select('id, name'),
          supabase.from('uanlookups').select('id, organization_id, response_data, created_at')
            .eq('source', sourceFilter)
            .in('lookup_type', config.lookupTypes)
            .gte('created_at', dateRange.startDate.toISOString())
            .lte('created_at', dateRange.endDate.toISOString()),
          // UPDATED: Now fetching both price and price_not_found
          supabase.from('verification_pricing').select('price, price_not_found, organization_id')
            .eq('source', sourceFilter)
            .or(`verification_type.eq.${verificationType},verification_type.in.(${config.lookupTypes.join(',')})`)
        ]);
        return { organizations: orgsRes.data || [], lookups: lookupsRes.data || [], prices: pricesRes.data || [] };
  },
  enabled: !!config && !!dateRange.startDate && !!dateRange.endDate
});

const { orgStats, totals, chartData, statCardCharts } = useMemo(() => {
  if (!data || !config || !dateRange.startDate || !dateRange.endDate) return { orgStats: [], totals: {}, chartData: [], statCardCharts: {} };

  // UPDATED: Now returns both price and priceNotFound
  const getPrices = (orgId: string | null): { price: number; priceNotFound: number } => {
      const orgOverride = data.prices.find(p => p.organization_id === orgId);
      const defaultPricing = data.prices.find(p => p.organization_id === null);
      
      return {
          price: orgOverride ? Number(orgOverride.price) : (Number(defaultPricing?.price) || 0),
          priceNotFound: orgOverride ? Number(orgOverride.price_not_found) : (Number(defaultPricing?.price_not_found) || 0)
      };
  };
  
  const checkSuccess = (log: any) => {
      if (config.successCodes) {
          const responseData = log.response_data as any;
          const code = String(responseData?.data?.code || responseData?.code || '');
          return config.successCodes.includes(code);
      }
      return log.response_data?.status === 1;
  };

  const stats = data.organizations.map(org => {
    const orgLookups = data.lookups.filter(l => l.organization_id === org.id);
    const successfulLookups = orgLookups.filter(l => checkSuccess(l));
    const failedLookups = orgLookups.filter(l => !checkSuccess(l));
    
    const prices = getPrices(org.id);
    
    // UPDATED: Calculate cost based on successful and failed verifications
    const cost = (successfulLookups.length * prices.price) + (failedLookups.length * prices.priceNotFound);
    
    return { 
        id: org.id, 
        name: org.name, 
        usage: orgLookups.length,
        successfulCount: successfulLookups.length, // NEW
        failedCount: failedLookups.length, // NEW
        successRate: orgLookups.length > 0 ? (successfulLookups.length / orgLookups.length) * 100 : 0, 
        unitPrice: prices.price, // Price for successful verifications
        priceNotFound: prices.priceNotFound, // NEW: Price for failed verifications
        cost: cost // UPDATED: Now uses both prices
    };
  }).filter(s => s.usage > 0);
  
  const sortedBySuccess = [...stats].sort((a,b) => b.successRate - a.successRate);
  const topOrgByUsage = stats.reduce((max, o) => (o.usage > (max?.usage || 0) ? o : max), null as any);

  const totalsData = {
    verifications: stats.reduce((s, o) => s + o.usage, 0),
    cost: stats.reduce((s, o) => s + o.cost, 0),
    topOrg: topOrgByUsage,
    avgSuccessRate: stats.reduce((s,o) => s + (o.successRate * o.usage), 0) / (stats.reduce((s,o) => s + o.usage, 0) || 1),
    highestSuccessOrg: sortedBySuccess[0],
    lowestSuccessOrg: sortedBySuccess[sortedBySuccess.length - 1],
  };

  const days = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  const formatDay = (d: Date) => format(d, 'MMM dd');

  const dailyVerificationData = days.map(day => ({ name: formatDay(day), value: data.lookups.filter(l => startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime()).length }));
  
  // UPDATED: Daily cost calculation now uses both prices
  const dailyCostData = days.map(day => {
      const lookupsOnDay = data.lookups.filter(l => startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime());
      return { 
          name: formatDay(day), 
          value: lookupsOnDay.reduce((sum, l) => {
              const prices = getPrices(l.organization_id);
              return sum + (checkSuccess(l) ? prices.price : prices.priceNotFound);
          }, 0) 
      };
  });
  
  const dailySuccessData = days.map(day => {
      const lookupsOnDay = data.lookups.filter(l => startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime());
      const successfulOnDay = lookupsOnDay.filter(l => checkSuccess(l)).length;
      return { name: formatDay(day), value: lookupsOnDay.length > 0 ? (successfulOnDay / lookupsOnDay.length) * 100 : 0 };
  });
  const dailyTopOrgData = days.map(day => ({ name: formatDay(day), value: topOrgByUsage ? data.lookups.filter(l => l.organization_id === topOrgByUsage.id && startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime()).length : 0 }));

  return {
    orgStats: stats.sort((a,b) => b.usage - a.usage), totals: totalsData, chartData: stats.sort((a,b) => b[chartDataType] - a[chartDataType]).slice(0, 10),
    statCardCharts: { verifications: dailyVerificationData, cost: dailyCostData, success: dailySuccessData, topOrg: dailyTopOrgData }
  };
}, [data, chartDataType, dateRange, config]);

  if (!config) return <div className="p-8 text-red-500 bg-slate-50 flex items-center justify-center h-screen">Invalid verification type specified: {verificationType}</div>;
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader size={60} /></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      <div><h1 className="text-3xl font-extrabold text-gray-800">'{config.title}' Dashboard</h1><p className="text-gray-500 mt-1">Breakdown of usage by organization.</p></div>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-auto"><EnhancedDateRangeSelector value={dateRange} onChange={(newRange) => newRange?.startDate && newRange?.endDate && setDateRange({ startDate: newRange.startDate, endDate: newRange.endDate, key: 'selection' })} /></div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="w-full md:w-48 bg-white shadow-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="truthscreen">Truthscreen</SelectItem><SelectItem value="gridlines">Gridlines</SelectItem></SelectContent></Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardWithChart title="Total Verifications" value={totals.verifications?.toLocaleString() || '0'} icon={<Sigma className="h-5 w-5 text-indigo-500"/>} chartData={statCardCharts.verifications || []} chartColor="#7B43F1" chartType="bar" valueFormatter={(v) => v.toLocaleString()} />
        <StatCardWithChart title="Total Billed Cost" value={totals.cost?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0'} icon={<DollarSign className="h-5 w-5 text-green-500"/>} chartData={statCardCharts.cost || []} chartColor="#00C49F" chartType="area" valueFormatter={(v) => v.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} />
        <StatCardWithChart title="Top Org Usage" value={totals.topOrg?.name || 'N/A'} icon={<Star className="h-5 w-5 text-amber-500"/>} chartData={statCardCharts.topOrg || []} chartColor="#F59E0B" chartType="area" valueFormatter={(v) => `${v.toLocaleString()} checks`} />
        <StatCardWithChart title="Overall Success Rate" value={`${totals.avgSuccessRate?.toFixed(1) || 0}%`} icon={<CheckCircle className="h-5 w-5 text-sky-500"/>} chartData={statCardCharts.success || []} chartColor="#38BDF8" chartType="area" valueFormatter={(v) => `${v.toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card className="shadow-xl border-none bg-white">
                <CardHeader className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 flex flex-col md:flex-row justify-between items-center rounded-t-2xl">
                    <h2 className="text-xl font-semibold">Top Organizations by {chartDataType}</h2>
                    <Tabs value={chartDataType} onValueChange={(v) => setChartDataType(v as any)}><TabsList className="bg-white/20 text-white border border-white/30"><TabsTrigger value="usage" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white">By Usage</TabsTrigger><TabsTrigger value="cost" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 text-white">By Cost</TabsTrigger></TabsList></Tabs>
                </CardHeader>
                <CardContent className="h-[400px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(val) => chartDataType === 'cost' ? `₹${val/1000}k` : val} />
                            <YAxis dataKey="name" type="category" width={120} stroke="#9ca3af" tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => chartDataType === 'cost' ? value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : value.toLocaleString()} cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }} />
                            <Bar dataKey={chartDataType} name={chartDataType === 'usage' ? "Verifications" : "Cost (INR)"} fill={config.color} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card className="shadow-lg border-none"><CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-gray-700">Overall Success Rate</CardTitle></CardHeader><CardContent className="h-[140px] flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ value: totals.avgSuccessRate }]} startAngle={90} endAngle={-270}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar background dataKey="value" cornerRadius={10} fill={config.color} /><text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-800 text-3xl font-bold">{`${totals.avgSuccessRate?.toFixed(1)}%`}</text></RadialBarChart></ResponsiveContainer></CardContent></Card>
            <Card className="shadow-lg border-none p-6"><CardTitle className="text-base font-semibold text-gray-700 mb-4">Success Rate Leaders</CardTitle><div className="space-y-3">{totals.highestSuccessOrg && (<div className="flex items-start justify-between"><span className="text-sm text-gray-500 flex items-center"><ArrowUp className="h-4 w-4 text-green-500 mr-1"/>Highest</span><div className="text-right"><p className="font-semibold text-gray-800">{totals.highestSuccessOrg.name}</p><p className="text-sm text-green-600 font-medium">{totals.highestSuccessOrg.successRate.toFixed(1)}%</p></div></div>)}{totals.lowestSuccessOrg && (<div className="flex items-start justify-between"><span className="text-sm text-gray-500 flex items-center"><ArrowDown className="h-4 w-4 text-red-500 mr-1"/>Lowest</span><div className="text-right"><p className="font-semibold text-gray-800">{totals.lowestSuccessOrg.name}</p><p className="text-sm text-red-600 font-medium">{totals.lowestSuccessOrg.successRate.toFixed(1)}%</p></div></div>)}</div></Card>
        </div>
      </div>
      
      <OrganizationUsageTable data={orgStats} verificationType={verificationType} sourceFilter={sourceFilter} />
    </div>
  );
};

export default VerificationTypeDashboardPage;