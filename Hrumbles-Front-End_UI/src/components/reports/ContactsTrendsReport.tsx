import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Activity, ArrowUp, Sigma, Calendar, Search, Download, ChevronLeft, ChevronRight, User, CheckCircle, TrendingUp } from 'lucide-react';
import { DateRangePickerField } from './DateRangePickerField';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ChartType = 'area' | 'bar';
interface ContactProfile {
  id: string;
  created_at: string;
  creator_name: string;
  created_by: string;
  contact_name: string;
  company_name: string | null;
}
interface Creator {
  id: string;
  name: string;
}
interface AggregatedData {
  creator_name: string;
  count: number;
  lastAdded: string;
}

const ContactsTrendsReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [rawData, setRawData] = useState<ContactProfile[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [totalContactCount, setTotalContactCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!organizationId) return;
      setIsLoading(true);
      try {
        const { count, error: countError } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        if (countError) throw countError;
        setTotalContactCount(count ?? 0);

        const { data: employeesData, error: employeesError } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .eq('organization_id', organizationId)
          .order('first_name');
        if (employeesError) throw employeesError;
        setAllCreators(employeesData.map((emp: any) => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
        })));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [organizationId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !appliedDateRange.startDate || !appliedDateRange.endDate) return;
      setIsLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('contacts')
          .select(`
            id, name, created_at, created_by,
            hr_employees!contacts_created_by_fkey(id, first_name, last_name),
            companies(name)
          `)
          .eq('organization_id', organizationId)
          .gte('created_at', appliedDateRange.startDate.toISOString())
          .lte('created_at', appliedDateRange.endDate.toISOString());

        if (selectedCreators.length > 0) {
          query = query.in('created_by', selectedCreators);
        }
        const { data, error: dataError } = await query;
        if (dataError) throw dataError;

        const formattedData: ContactProfile[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          created_by: item.created_by,
          creator_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}` : 'N/A',
          contact_name: item.name,
          company_name: item.companies ? item.companies.name : null,
        }));
        setRawData(formattedData);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        setRawData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appliedDateRange, selectedCreators, organizationId]);

  const filteredRawData = useMemo(() => {
    return rawData.filter(profile => {
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(profile.created_by);
      const matchesSearch = searchTerm === '' ||
        profile.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCreator && matchesSearch;
    });
  }, [rawData, searchTerm, selectedCreators]);

  const { chartData, pieChartData, tableData, tableColumns, aggregatedData, chartTitle } = useMemo(() => {
    const getCreatorName = (item: any) => item.creator_name || 'N/A';

    // Pivoted table data
    let pivotedData: Record<string, any> = {};
    let columnMap: Record<string, string> = {};

    filteredRawData.forEach(item => {
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

    // Single-axis chart data (total contacts per time period)
    const chartAggregatedData = columns.map(col => ({
      label: col,
      total: Object.values(pivotedData).reduce((sum, row) => sum + (row[col] || 0), 0)
    }));

    // Aggregated data for vertical BarChart
    const aggData = filteredRawData.reduce((acc, profile) => {
      const name = profile.creator_name || 'Unknown';
      if (!acc[name]) {
        acc[name] = { count: 0, lastAdded: new Date(0).toISOString() };
      }
      acc[name].count += 1;
      if (new Date(profile.created_at) > new Date(acc[name].lastAdded)) {
        acc[name].lastAdded = profile.created_at;
      }
      return acc;
    }, {} as Record<string, { count: number; lastAdded: string }>);

    const aggregated = Object.entries(aggData)
      .map(([creator_name, data]) => ({ creator_name, ...data }))
      .sort((a, b) => b.count - a.count);

    // PieChart data (top 4 creators + Others)
    const topN = 4;
    const topContributors = aggregated.slice(0, topN);
    const otherCount = aggregated.slice(topN).reduce((acc, curr) => acc + curr.count, 0);
    const pieData = topContributors.map(d => ({ name: d.creator_name, value: d.count }));
    if (otherCount > 0) pieData.push({ name: 'Others', value: otherCount });

    return {
      chartData: chartAggregatedData,
      pieChartData: pieData,
      tableData: finalTableData,
      tableColumns: ['Creator Name', ...columns, 'Total'],
      aggregatedData: aggregated,
      chartTitle: `Trend for ${format(appliedDateRange.startDate, 'MMM d, yyyy')} - ${format(appliedDateRange.endDate, 'MMM d, yyyy')}`
    };
  }, [filteredRawData, granularity, appliedDateRange]);

  const filteredTableData = useMemo(() =>
    tableData.filter(row =>
      row['Creator Name'].toLowerCase().includes(searchTerm.toLowerCase())
    ), [tableData, searchTerm]);

  const totalAdded = filteredTableData.reduce((sum, item) => sum + item.Total, 0);
  const peak = chartData.reduce((max, item) => item.total > max.count ? { label: item.label, count: item.total } : max, { label: 'N/A', count: 0 });
  const average = totalAdded > 0 && chartData.length > 0 ? (totalAdded / chartData.length).toFixed(1) : '0.0';
  const topContributor = aggregatedData[0] || { creator_name: 'N/A', count: 0, lastAdded: 'N/A' };

  const totalsRow = useMemo(() => {
    const totals: Record<string, number | string> = { 'Creator Name': 'Total' };
    tableColumns.slice(1).forEach(col => {
      totals[col] = filteredTableData.reduce((sum, row) => sum + (row[col] || 0), 0);
    });
    return totals;
  }, [filteredTableData, tableColumns]);

  const formatTick = (tick: string) => {
    const date = new Date(tick);
    if (!isValid(date)) return tick;
    if (granularity === 'daily') return format(date, 'MMM d');
    if (granularity === 'monthly') return tick.split(' ')[0];
    return tick;
  };

  const handleApplyFilters = () => {
    setAppliedDateRange(draftDateRange);
    setCurrentPage(1);
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredTableData.slice(startIndex, startIndex + itemsPerPage);

  // Export Functions
  const exportToCSV = () => {
    const dataForExport = filteredTableData.map(row => {
      const rowData: Record<string, any> = { 'Creator Name': row['Creator Name'] };
      tableColumns.slice(1).forEach(col => {
        rowData[col] = row[col] || 0;
      });
      return rowData;
    });
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'contacts_trends_report.csv';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Contacts Trends Report', 14, 20);
    (doc as any).autoTable({
      head: [tableColumns],
      body: filteredTableData.map(row => tableColumns.map(col => row[col] || 0)),
      startY: 30,
    });
    doc.save('contacts_trends_report.pdf');
  };

  if (isLoading && rawData.length === 0 && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10 animate-fade-in">
      <main className="w-full max-w-8xl mx-auto space-y-8">
        {/* Title Section */}
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Contact Acquisition Trends</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze contact creation activity with detailed breakdowns.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Contacts Added</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalAdded}</h3>
                <p className="text-xs text-gray-500 mt-1">in selected period</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-full">
                <Sigma size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Peak Activity</p>
                <h3 className="text-2xl font-bold text-gray-800">{peak.count}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  on {peak.label !== 'N/A' && granularity === 'daily' ? format(new Date(peak.label), 'MMM d, yyyy') : peak.label}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                <ArrowUp size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Average Additions</p>
                <h3 className="text-2xl font-bold text-gray-800">{average}</h3>
                <p className="text-xs text-gray-500 mt-1">per {granularity.slice(0, -2)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
                <Activity size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Top Contributor</p>
                <h3 className="text-2xl font-bold text-gray-800 truncate" title={topContributor.creator_name}>{topContributor.creator_name}</h3>
                <p className="text-xs text-gray-500 mt-1 truncate">{`${topContributor.count} contacts added`}</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                <TrendingUp size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="bg-purple-500 text-white p-3 flex justify-between ">

              <CardTitle className="text-base">{chartTitle}</CardTitle>
              {/* <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <TabsList className="grid grid-cols-2 w-32">
                  <TabsTrigger value="area" className="text-xs">Area</TabsTrigger>
                  <TabsTrigger value="bar" className="text-xs">Bar</TabsTrigger>
                </TabsList>
              </Tabs> */}
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full animate-fade-in">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" tickFormatter={formatTick} tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid oklch(62.7% 0.265 303.9)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          }}
                          itemStyle={{ color: '#4b5563' }}
                          cursor={{ fill: '#f3e8ff' }}
                          formatter={(value: number) => [`${value} contacts`, 'Total Contacts']}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total Contacts"
                          stroke="#7B43F1"
                          fill="#7B43F1"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="label" tickFormatter={formatTick} tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid oklch(62.7% 0.265 303.9)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          }}
                          itemStyle={{ color: '#4b5563' }}
                          cursor={{ fill: '#f3e8ff' }}
                          formatter={(value: number) => [`${value} contacts`, 'Total Contacts']}
                        />
                        <Bar dataKey="total" name="Total Contacts" fill="#7B43F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Alert className="w-auto bg-gray-50 border-gray-200">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <AlertDescription className="text-gray-600">No data for this period.</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="bg-purple-500 text-white p-3">
              <CardTitle className="text-base">Contribution by Creator</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex h-[300px] w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : aggregatedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={aggregatedData.length * 40 > 300 ? aggregatedData.length * 40 : 300}>
                    <BarChart data={aggregatedData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                      <YAxis dataKey="creator_name" type="category" width={150} tick={{ fontSize: 12, fill: '#4b5563' }} interval={0} />
                      <Tooltip
                        cursor={{ fill: '#f3e8ff' }}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid oklch(62.7% 0.265 303.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#4b5563' }}
                        formatter={(value: number) => [`${value} contacts`, 'Contacts Added']}
                      />
                      <Bar dataKey="count" name="Contacts Added" fill="#7B43F1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] w-full items-center justify-center">
                    <Alert className="w-auto bg-gray-50 border-gray-200">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <AlertDescription className="text-gray-600">No data for this period.</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="purple-gradient text-white p-6">
              <CardTitle className="text-base">Contribution Share</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="h-[300px] w-full animate-fade-in">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#7B43F1', '#A74BC8', '#8884d8', '#a388d8', '#c3a8d8'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${value} contacts`}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid oklch(62.7% 0.265 303.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#4b5563' }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '14px', color: '#4b5563' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Alert className="w-auto bg-gray-50 border-gray-200">
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <AlertDescription className="text-gray-600">No data for this period.</AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Filter Bar and Table */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                <TabsList className="grid grid-cols-4 w-full sm:w-80">
                  <TabsTrigger value="daily" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Daily
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Yearly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <DateRangePickerField
                  dateRange={draftDateRange}
                  onDateRangeChange={setDraftDateRange}
                  className="pl-10 h-10 w-full"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto flex-grow justify-start text-left font-normal gap-2">
                    <User className="h-4 w-4" />
                    <span>{selectedCreators.length > 0 ? `${selectedCreators.length} Creators Selected` : 'Filter Creators'}</span>
                    {selectedCreators.length > 0 && <Badge variant="secondary" className="ml-auto">{selectedCreators.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCreators([])}>Deselect All</Button>
                    {allCreators.map(creator => (
                      <Label key={creator.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                        <Checkbox
                          checked={selectedCreators.includes(creator.id)}
                          onCheckedChange={() => setSelectedCreators(prev =>
                            prev.includes(creator.id) ? prev.filter(id => id !== creator.id) : [...prev, creator.id]
                          )}
                        />
                        {creator.name}
                      </Label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={handleApplyFilters} className="w-full sm:w-auto flex-shrink-0 bg-indigo-600 hover:bg-indigo-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search by creator, contact, or company..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 shadow-sm animate-scale-in">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      {tableColumns.map(col => (
                        <TableHead
                          key={col}
                          className={
                            col === 'Creator Name'
                              ? 'sticky left-0 bg-gray-50 z-10 text-left font-medium text-gray-500 px-4 py-2'
                              : 'text-center whitespace-nowrap font-medium text-gray-500 px-4 py-2'
                          }
                        >
                          {formatTick(col)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map(row => (
                        <TableRow key={row['Creator Name']} className="hover:bg-gray-50 transition">
                          <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">
                            {row['Creator Name']}
                          </TableCell>
                          {tableColumns.slice(1).map(col => (
                            <TableCell key={col} className="text-center text-gray-600 px-4 py-2">
                              {row[col] || 0}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={tableColumns.length} className="h-24 text-center text-gray-500">
                          No data found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-gray-50">
                      <TableCell className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2">Total</TableCell>
                      {tableColumns.slice(1).map(col => (
                        <TableCell key={col} className="text-center font-bold text-gray-800 px-4 py-2">
                          {totalsRow[col] || 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="w-[70px] h-10 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTableData.length)} of {filteredTableData.length}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContactsTrendsReport;