import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell } from 'recharts';
import Loader from "@/components/ui/Loader";
import StatCard from "@/components/global/verifications/StatCard";
import MiniChartCard from "@/components/global/verifications/MiniChartCard";
import VerificationTypeTable from "@/components/global/verifications/VerificationTypeTable";
import PricingModal from "@/components/global/verifications/PricingModal";

import { Sigma, DollarSign, Activity, Settings, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format, eachDayOfInterval, startOfDay, addDays, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';

// Configuration for verification types
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
    label: 'UAN Full History',
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
  const [sourceFilter, setSourceFilter] = useState('gridlines');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  
  // NEW: States for weekly pagination and filtering
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [activeVerificationTypes, setActiveVerificationTypes] = useState<Set<string>>(
    new Set(VERIFICATION_CONFIG.map(v => v.label))
  );

  // Fetch organizations for the dropdown
  const { data: organizationsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['verificationGlobalHub', dateRange, sourceFilter],
    queryFn: async () => {
      const [lookupsRes, pricesRes] = await Promise.all([
        supabase.from('uanlookups').select('id, organization_id, lookup_type, response_data, created_at')
          .eq('source', sourceFilter)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString()),
        supabase.from('verification_pricing').select('price, price_not_found, organization_id, verification_type')
          .eq('source', sourceFilter)
      ]);

      if (lookupsRes.error) throw lookupsRes.error;
      if (pricesRes.error) throw pricesRes.error;

      return { lookups: lookupsRes.data, prices: pricesRes.data };
    }
  });

  const { stats, totals, weeklyChartData, weeks, miniChartData } = useMemo(() => {
    if (!data) return { stats: [], totals: {}, weeklyChartData: [], weeks: [], miniChartData: { usage: [], cost: [] } };
    
    // Filter lookups by organization if selected
    const filteredLookups = organizationFilter === 'all' 
      ? data.lookups 
      : data.lookups.filter(l => l.organization_id === organizationFilter);
    
    const getPrice = (typeKey: string, orgId: string | null): { price: number; priceNotFound: number } => {
      const orgOverride = data.prices.find(p => p.organization_id === orgId && p.verification_type === typeKey);
      const defaultPricing = data.prices.find(p => p.organization_id === null && p.verification_type === typeKey);
      
      return {
        price: orgOverride ? Number(orgOverride.price) : (Number(defaultPricing?.price) || 0),
        priceNotFound: orgOverride ? Number(orgOverride.price_not_found) : (Number(defaultPricing?.price_not_found) || 0)
      };
    };

    // Map over the detailed config array
    const typeStats = VERIFICATION_CONFIG.map((config) => {
      const relevantLookups = filteredLookups.filter(l => l.lookup_type === config.id);
      const totalUsage = relevantLookups.length;
      
      // Calculate success based on the specific codes for this type
      const successfulCount = relevantLookups.filter(l => {
        const responseData = l.response_data as any;
        const code = String(responseData?.data?.code || responseData?.code || '');
        return config.successCodes.includes(code);
      }).length;

      const failedCount = totalUsage - successfulCount;

      const totalCost = relevantLookups.reduce((sum, l) => {
        const prices = getPrice(config.id, l.organization_id);
        const responseData = l.response_data as any;
        const code = String(responseData?.data?.code || responseData?.code || '');
        const isSuccess = config.successCodes.includes(code);
        return sum + (isSuccess ? prices.price : prices.priceNotFound);
      }, 0);

      return { 
        key: config.id, 
        title: config.label, 
        color: config.color, 
        usage: totalUsage,
        successfulCount,
        failedCount, 
        successRate: totalUsage > 0 ? (successfulCount / totalUsage) * 100 : 0, 
        cost: totalCost 
      };
    }); 

    const overallTotals = {
      verifications: typeStats.reduce((s, t) => s + t.usage, 0),
      cost: typeStats.reduce((s, t) => s + t.cost, 0),
      topType: typeStats.reduce((max, t) => (t.usage > max.usage ? t : max), typeStats[0] || {} as any),
    };

    // NEW: Generate weekly data instead of daily
    // Split date range into 7-day blocks (weeks)
    const allWeeks: { start: Date; end: Date; label: string }[] = [];
    let currentStart = new Date(dateRange.startDate);
    
    while (currentStart <= dateRange.endDate) {
      const weekEnd = addDays(currentStart, 6);
      const actualEnd = weekEnd > dateRange.endDate ? dateRange.endDate : weekEnd;
      
      allWeeks.push({
        start: currentStart,
        end: actualEnd,
        label: `${format(currentStart, 'MMM dd')} - ${format(actualEnd, 'MMM dd')}`
      });
      
      currentStart = addDays(weekEnd, 1);
    }

    // Generate chart data for all weeks
    const allWeeksChartData = allWeeks.map((week) => {
      let entry: any = { name: week.label };
      
      const weekDays = eachDayOfInterval({ start: week.start, end: week.end });
      
      VERIFICATION_CONFIG.forEach((config) => {
        const weekLookups = filteredLookups.filter(l => {
          const lookupDate = startOfDay(new Date(l.created_at));
          return l.lookup_type === config.id && 
                 weekDays.some(day => startOfDay(day).getTime() === lookupDate.getTime());
        });
        
        entry[`${config.label}_usage`] = weekLookups.length;
        entry[`${config.label}_cost`] = weekLookups.reduce((sum, l) => {
          const prices = getPrice(config.id, l.organization_id);
          const responseData = l.response_data as any;
          const code = String(responseData?.data?.code || responseData?.code || '');
          const isSuccess = config.successCodes.includes(code);
          return sum + (isSuccess ? prices.price : prices.priceNotFound);
        }, 0);
      });
      
      return entry;
    });
    
    // Filter pie chart to only show non-zero values
    const activeStats = typeStats.filter(s => s.usage > 0);
    const usageForPie = activeStats.map(s => ({ name: s.title, value: s.usage, color: s.color }));
    const costForPie = activeStats.map(s => ({ name: s.title, value: s.cost, color: s.color }));

    return { 
      stats: typeStats, 
      totals: overallTotals, 
      weeklyChartData: allWeeksChartData, 
      weeks: allWeeks,
      miniChartData: { usage: usageForPie, cost: costForPie } 
    };
  }, [data, dateRange, organizationFilter]);

  // Get current week data for display
  const currentWeekData = useMemo(() => {
    if (!weeklyChartData || weeklyChartData.length === 0) return [];
    return [weeklyChartData[currentWeekIndex] || weeklyChartData[0]];
  }, [weeklyChartData, currentWeekIndex]);

  // Reset week index when date range or filters change
  React.useEffect(() => {
    setCurrentWeekIndex(0);
  }, [dateRange, organizationFilter, sourceFilter]);

  // Toggle verification type filter
  const toggleVerificationType = (typeName: string) => {
    setActiveVerificationTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(typeName)) {
        // If only one is active, don't allow deselecting it
        if (newSet.size > 1) {
          newSet.delete(typeName);
        } else {
          // If all were selected and user clicks one, show only that one
          return new Set([typeName]);
        }
      } else {
        // If this was the last one not selected, select all
        newSet.add(typeName);
        if (newSet.size === VERIFICATION_CONFIG.length) {
          return new Set(VERIFICATION_CONFIG.map(v => v.label));
        }
      }
      return newSet;
    });
  };

  // Custom legend component with click handlers
  const CustomLegend = ({ onClick }: { onClick: (typeName: string) => void }) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4 px-4">
        {VERIFICATION_CONFIG.map((config) => {
          const isActive = activeVerificationTypes.has(config.label);
          return (
            <button
              key={config.id}
              onClick={() => onClick(config.label)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                isActive 
                  ? 'bg-slate-100 border-2 border-slate-400 font-semibold' 
                  : 'bg-white border border-slate-200 opacity-50 hover:opacity-75'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-gray-700">{config.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader size={60} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Verifications Dashboard</h1>
          <p className="text-gray-500 mt-1">Global summary of all verification activities.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-48 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truthscreen">Truthscreen</SelectItem>
                  <SelectItem value="gridlines">Gridlines</SelectItem>
                </SelectContent>
            </Select>
            
            <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger className="w-full md:w-56 bg-white shadow-sm">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizationsData?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>

            <Button 
              onClick={() => setIsPricingModalOpen(true)} 
              className="shadow-md bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto"
            >
              <Settings size={16} className="mr-2" /> Manage Pricing
            </Button>
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
        <StatCard 
          title="Total Verifications" 
          value={totals.verifications?.toLocaleString() || '0'} 
          icon={<Sigma className="h-6 w-6 text-indigo-500"/>} 
        />
        <StatCard 
          title="Total Billed Cost" 
          value={totals.cost?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) || '₹0'} 
          icon={<DollarSign className="h-6 w-6 text-green-500"/>} 
        />
        <StatCard 
          title="Most Used Type" 
          value={totals.topType?.title || 'N/A'} 
          description={`${totals.topType?.usage?.toLocaleString() || 0} checks`} 
          icon={<Activity className="h-6 w-6 text-amber-500"/>} 
        />
        <StatCard 
          title="Avg. Success Rate" 
          value={`${(totals.verifications ? (stats.reduce((a, b) => a + (b.successRate * b.usage), 0) / totals.verifications) : 0).toFixed(1)}%`} 
          icon={<CheckCircle className="h-6 w-6 text-sky-500"/>} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-none bg-white">
              <CardHeader className="border-b flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <CardTitle className="text-xl">Weekly Trends</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Comparing weekly {chartDataType === 'usage' ? 'verifications' : 'costs'}
                      {organizationFilter !== 'all' && organizationsData && (
                        <span className="font-semibold text-indigo-600">
                          {' '}for {organizationsData.find(o => o.id === organizationFilter)?.name}
                        </span>
                      )}
                    </p>
                    {weeks && weeks.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Week {currentWeekIndex + 1} of {weeks.length}: {weeks[currentWeekIndex]?.label}
                      </p>
                    )}
                  </div>
                  <Tabs value={chartDataType} onValueChange={(v) => setChartDataType(v as any)} className="mt-2 md:mt-0">
                      <TabsList>
                        <TabsTrigger value="usage">By Usage</TabsTrigger>
                        <TabsTrigger value="cost">By Cost</TabsTrigger>
                      </TabsList>
                  </Tabs>
              </CardHeader>
              <CardContent className="h-[400px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentWeekData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                          <YAxis 
                            stroke="#9ca3af" 
                            tick={{ fontSize: 12 }} 
                            tickFormatter={(val) => chartDataType === 'cost' ? `₹${val}` : val} 
                          />
                          <Tooltip 
                            formatter={(value: number) => chartDataType === 'cost' ? value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : value.toLocaleString()}
                            cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }}
                          />
                          {VERIFICATION_CONFIG.filter(v => activeVerificationTypes.has(v.label)).map(v => (
                             <Bar 
                               key={v.id} 
                               dataKey={`${v.label}_${chartDataType}`} 
                               name={v.label} 
                               fill={v.color} 
                               radius={[4, 4, 0, 0]} 
                               stackId="a" 
                             />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Custom Legend */}
                  <CustomLegend onClick={toggleVerificationType} />
                  
                  {/* Pagination Controls */}
                  <div className="flex justify-center items-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentWeekIndex === 0}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous Week
                    </Button>
                    
                    <span className="text-sm text-gray-600 font-medium">
                      Week {currentWeekIndex + 1} / {weeks.length}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentWeekIndex(prev => Math.min(weeks.length - 1, prev + 1))}
                      disabled={currentWeekIndex >= weeks.length - 1}
                      className="flex items-center gap-2"
                    >
                      Next Week
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
              </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <MiniChartCard 
              title="Usage by Type" 
              data={miniChartData.usage.filter(d => activeVerificationTypes.has(d.name))} 
              chartType="pie" 
              onLegendClick={toggleVerificationType}
              activeItems={activeVerificationTypes}
            />
            <MiniChartCard 
              title="Cost by Type" 
              data={miniChartData.cost.filter(d => activeVerificationTypes.has(d.name))} 
              chartType="bar" 
              onLegendClick={toggleVerificationType}
              activeItems={activeVerificationTypes}
            />
        </div>
      </div>
      
      <VerificationTypeTable 
        data={stats} 
        sourceFilter={sourceFilter} 
        organizationFilter={organizationFilter}
        organizationName={
          organizationFilter !== 'all' && organizationsData
            ? organizationsData.find(o => o.id === organizationFilter)?.name
            : undefined
        }
      />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
    </div>
  );
};

export default VerificationHubPage;