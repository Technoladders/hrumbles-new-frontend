import React, { useState, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import Loader from "@/components/ui/Loader";
import StatCardWithChart from "@/components/global/verifications/StatCardWithChart";
import DetailedLogTable from "@/components/global/verifications/DetailedLogTable";
import { Sigma, DollarSign, CheckCircle, UserCheck } from "lucide-react";
import { eachDayOfInterval, startOfDay, format } from 'date-fns';

const VERIFICATION_TYPES = {
  'uan-by-mobile-pan': { title: 'UAN by Mobile/PAN', lookupTypes: ['mobile', 'pan'], color: '#7B43F1' },
  'basic-uan-history': { title: 'Basic UAN History', lookupTypes: ['uan_full_history'], color: '#00C49F' },
};

const OrganizationVerificationReportPage: React.FC = () => {
  const { organizationId = '', verificationType = '' } = useParams<{ organizationId: string, verificationType: string }>();
  const config = VERIFICATION_TYPES[verificationType as keyof typeof VERIFICATION_TYPES];
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const [sourceFilter, setSourceFilter] = useState(queryParams.get('source') || 'truthscreen');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orgVerificationDetail', organizationId, verificationType, dateRange, sourceFilter],
    queryFn: async () => {
      const [logsRes, orgRes, pricesRes] = await Promise.all([
        supabase.from('uanlookups').select('*, verified_by:hr_employees(first_name, last_name)')
          .eq('organization_id', organizationId)
          .eq('source', sourceFilter)
          .in('lookup_type', config.lookupTypes)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString()),
        supabase.from('hr_organizations').select('name').eq('id', organizationId).single(),
        supabase.from('verification_pricing').select('price, organization_id')
          .eq('source', sourceFilter)
          .eq('verification_type', verificationType)
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      ]);
      if (logsRes.error || orgRes.error || pricesRes.error) throw new Error("Failed to fetch details.");
      return { logs: logsRes.data, orgName: orgRes.data.name, prices: pricesRes.data };
    },
    enabled: !!organizationId && !!config
  });

  const { logsWithCost, totals, pieChartData, statCardCharts } = useMemo(() => {
    if (!data) return { logsWithCost: [], totals: {}, pieChartData: [], statCardCharts: {} };

    const getPrice = (): number => {
        const orgOverride = data.prices.find(p => p.organization_id === organizationId);
        return orgOverride?.price ?? data.prices.find(p => p.organization_id === null)?.price ?? 0;
    };
    const pricePerCheck = getPrice();
    const logsWithCost = data.logs.map(log => ({ ...log, cost: pricePerCheck }));

    const successful = logsWithCost.filter(l => l.response_data?.status === 1).length;
    const totalCost = logsWithCost.length * pricePerCheck;
    
    const verifierCounts = logsWithCost.reduce((acc, log) => {
        const verifier = log.verified_by ? `${log.verified_by.first_name} ${log.verified_by.last_name}` : 'System';
        acc[verifier] = (acc[verifier] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const topVerifier = Object.entries(verifierCounts).sort((a, b) => b[1] - a[1])[0];

    const totalsData = {
      verifications: logsWithCost.length,
      cost: totalCost,
      successRate: logsWithCost.length > 0 ? (successful / logsWithCost.length) * 100 : 0,
      topVerifierName: topVerifier ? topVerifier[0] : 'N/A',
      topVerifierCount: topVerifier ? topVerifier[1] : 0,
    };
    
    const pieData = [
        { name: 'Successful', value: successful, color: '#22C55E' },
        { name: 'Failed', value: logsWithCost.length - successful, color: '#EF4444' }
    ];

    const days = eachDayOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
    const formatDay = (d: Date) => format(d, 'MMM dd');

    const dailyVerificationData = days.map(day => ({ name: formatDay(day), value: logsWithCost.filter(l => startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime()).length }));
    const dailyCostData = days.map(day => ({ name: formatDay(day), value: dailyVerificationData.find(d => d.name === formatDay(day))!.value * pricePerCheck }));
    const dailySuccessData = days.map(day => {
        const logsOnDay = logsWithCost.filter(l => startOfDay(new Date(l.created_at)).getTime() === startOfDay(day).getTime());
        if (logsOnDay.length === 0) return { name: formatDay(day), value: 0 };
        const successfulOnDay = logsOnDay.filter(l => l.response_data?.status === 1).length;
        return { name: formatDay(day), value: (successfulOnDay / logsOnDay.length) * 100 };
    });
    
    return { logsWithCost, totals: totalsData, pieChartData: pieData, statCardCharts: { verifications: dailyVerificationData, cost: dailyCostData, success: dailySuccessData } };
  }, [data, organizationId, dateRange]);

  if (!config) return <div className="p-8 text-red-500 bg-slate-50">Invalid verification type specified.</div>;
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader size={60} /></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-800">Detailed Report: '{config.title}'</h1>
        <p className="text-gray-500 mt-1 text-xl">For Organization: <span className="font-semibold text-indigo-600">{data?.orgName}</span></p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} onApply={() => {}}/>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full md:w-48 bg-white shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="truthscreen">Truthscreen</SelectItem><SelectItem value="gridlines">Gridlines</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardWithChart title="Total Verifications" value={totals.verifications?.toLocaleString() || '0'} icon={<Sigma className="h-5 w-5 text-indigo-500"/>} chartData={statCardCharts.verifications || []} chartColor="#7B43F1" chartType="bar" valueFormatter={(v) => v.toLocaleString()} />
        <StatCardWithChart title="Total Cost" value={totals.cost?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0'} icon={<DollarSign className="h-5 w-5 text-green-500"/>} chartData={statCardCharts.cost || []} chartColor="#00C49F" chartType="area" valueFormatter={(v) => v.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} />
        <StatCardWithChart title="Success Rate" value={`${totals.successRate?.toFixed(1) || 0}%`} icon={<CheckCircle className="h-5 w-5 text-sky-500"/>} chartData={statCardCharts.success || []} chartColor="#38BDF8" chartType="area" valueFormatter={(v) => `${v.toFixed(1)}%`} />
        <StatCardWithChart title="Top Verifier" value={totals.topVerifierName || 'N/A'} icon={<UserCheck className="h-5 w-5 text-amber-500"/>} chartData={statCardCharts.verifications?.map(d => ({ ...d, value: d.value > 0 ? 1 : 0 })) || []} chartColor="#F59E0B" valueFormatter={_ => `${totals.topVerifierCount} checks`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <DetailedLogTable data={logsWithCost} />
        </div>
        <div className="space-y-6">
            <Card className="shadow-lg border-none">
                <CardHeader><CardTitle className="text-base font-semibold text-gray-700">Success vs. Failure</CardTitle></CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                            <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={5} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {pieChartData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default OrganizationVerificationReportPage;