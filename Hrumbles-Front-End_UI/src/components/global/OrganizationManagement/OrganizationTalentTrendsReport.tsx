import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DateRangePickerField } from '@/components/ui/DateRangePickerField'; // Using the alias for shared UI components
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ChartType = 'area' | 'bar';
interface OrganizationOption { // Renamed from Recruiter
  id: string;
  name: string;
}

interface TrendDataRow {
  created_at: string;
  organization_id: string;
  organization_name: string;
}

const OrganizationTalentTrendsReport: React.FC = () => { // Renamed component
  const [rawData, setRawData] = useState<TrendDataRow[]>([]); // Using TrendDataRow
  const [allOrganizations, setAllOrganizations] = useState<OrganizationOption[]>([]); // Renamed
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
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]); // Renamed
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all organizations for the filter dropdown
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data: orgsData, error: orgsError } = await supabase
          .from('hr_organizations')
          .select('id, name')
          .order('name');
        if (orgsError) throw orgsError;
        setAllOrganizations(orgsData.map((org: any) => ({ id: org.id, name: org.name })));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch organizations.');
      }
    };
    fetchOrganizations();
  }, []);

  // Fetch trend data using the new RPC function
  useEffect(() => {
    const fetchData = async () => {
      if (!appliedDateRange.startDate || !appliedDateRange.endDate) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dataError } = await supabase.rpc('get_organization_talent_trends', {
          start_date: appliedDateRange.startDate.toISOString(),
          end_date: appliedDateRange.endDate.toISOString(),
        });
        if (dataError) throw dataError;
        setRawData(data);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appliedDateRange]); // selectedOrganizations is not a dependency here because RPC doesn't filter by it

  const { chartData, verticalChartData, tableData, tableColumns, chartTitle, organizationNames } = useMemo(() => { // Renamed
    const getOrganizationName = (item: TrendDataRow) => item.organization_name; // Adjusted to use organization_name

    let pivotedData: Record<string, any> = {};
    let columnMap: Record<string, string> = {};

    // Filter rawData by selectedOrganizations before pivoting
    const filteredRawData = selectedOrganizations.length > 0
      ? rawData.filter(item => selectedOrganizations.includes(item.organization_id))
      : rawData;

    filteredRawData.forEach(item => {
      const organizationName = getOrganizationName(item);
      if (!pivotedData[organizationName]) {
        pivotedData[organizationName] = { 'Organization Name': organizationName }; // Renamed column
      }

      let key = '';
      switch (granularity) {
        case 'weekly': key = format(new Date(item.created_at), 'E'); break;
        case 'monthly': key = format(new Date(item.created_at), 'MMM yyyy'); break;
        case 'yearly': key = format(new Date(item.created_at), 'yyyy'); break;
        default: key = format(new Date(item.created_at), 'yyyy-MM-dd'); break;
      }

      if (!columnMap[key]) columnMap[key] = key;
      pivotedData[organizationName][key] = (pivotedData[organizationName][key] || 0) + 1;
    });

    let columns = Object.keys(columnMap).sort((a, b) => {
      if (granularity === 'weekly') {
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return dayOrder.indexOf(a) - dayOrder.indexOf(b);
      }
      if (granularity === 'monthly' || granularity === 'yearly' || granularity === 'daily') {
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return a.localeCompare(b);
    });

    const finalTableData = Object.values(pivotedData).map(row => {
      const total = columns.reduce((sum, col) => sum + (row[col] || 0), 0);
      return { ...row, Total: total };
    }).filter(row => row.Total > 0);

    const chartAggregatedData = columns.map(col => {
      const total = Object.values(pivotedData).reduce((sum, org) => sum + (org[col] || 0), 0);
      return { label: col, total };
    });

    const verticalChartData = finalTableData.map(row => ({
      organization_name: row['Organization Name'], // Renamed
      count: row.Total
    })).sort((a, b) => b.count - a.count);

    return {
      chartData: chartAggregatedData,
      verticalChartData,
      tableData: finalTableData,
      tableColumns: ['Organization Name', ...columns, 'Total'], // Renamed
      chartTitle: `Talent Trend for ${format(appliedDateRange.startDate, 'MMM d, yyyy')} - ${format(appliedDateRange.endDate, 'MMM d, yyyy')}`,
      organizationNames: Object.keys(pivotedData)
    };
  }, [rawData, granularity, appliedDateRange, selectedOrganizations]); // Add selectedOrganizations to useMemo dependencies

  const filteredTableData = useMemo(() =>
    tableData.filter(row =>
      row['Organization Name'].toLowerCase().includes(searchTerm.toLowerCase()) // Renamed
    ), [tableData, searchTerm]);

  const totalAdded = filteredTableData.reduce((sum, item) => sum + item.Total, 0);
  const peak = chartData.reduce((max, item) => {
    return item.total > max.count ? { label: item.label, count: item.total } : max;
  }, { label: 'N/A', count: 0 });
  const average = totalAdded > 0 && chartData.length > 0 ? (totalAdded / chartData.length).toFixed(1) : '0.0';
  const topContributor = verticalChartData[0] || { organization_name: 'N/A', count: 0 }; // Renamed

  const totalsRow = useMemo(() => {
    const totals: Record<string, number | string> = { 'Organization Name': 'Total' }; // Renamed
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
      const rowData: Record<string, any> = { 'Organization Name': row['Organization Name'] }; // Renamed
      tableColumns.slice(1).forEach(col => {
        rowData[col] = row[col] || 0;
      });
      return rowData;
    });
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'organization_talent_trends_report.csv'; // Renamed
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Organization Talent Trends Report', 14, 20); // Renamed
    (doc as any).autoTable({
      head: [tableColumns],
      body: filteredTableData.map(row => tableColumns.map(col => row[col] || 0)),
      startY: 30,
    });
    doc.save('organization_talent_trends_report.pdf'); // Renamed
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Organization Talent Acquisition Trends</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze organization activity with detailed breakdowns for any period.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Added</p>
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
                <p className="text-sm font-medium text-gray-500 mb-2">Top Contributing Organization</p> {/* Renamed */}
                <h3 className="text-2xl font-bold text-gray-800 truncate" title={topContributor.organization_name}>{topContributor.organization_name}</h3> {/* Renamed */}
                <p className="text-xs text-gray-500 mt-1 truncate">{`${topContributor.count} profiles added`}</p>
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
                          formatter={(value: number) => [`${value} profiles`, 'Total Profiles']}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total Profiles"
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
                          formatter={(value: number) => [`${value} profiles`, 'Total Profiles']}
                        />
                        <Bar dataKey="total" name="Total Profiles" fill="#7B43F1" radius={[4, 4, 0, 0]} />
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
              <CardTitle className="text-base">Contribution by Organization</CardTitle> {/* Renamed */}
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex h-[300px] w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : verticalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={verticalChartData.length * 40 > 300 ? verticalChartData.length * 40 : 300}>
                    <BarChart data={verticalChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                      <YAxis dataKey="organization_name" type="category" width={150} tick={{ fontSize: 12, fill: '#4b5563' }} interval={0} /> {/* Renamed */}
                      <Tooltip
                        cursor={{ fill: '#f3e8ff' }}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid oklch(62.7% 0.265 303.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#4b5563' }}
                        formatter={(value: number) => [`${value} profiles`, 'Profiles Added']}
                      />
                      <Bar dataKey="count" name="Profiles Added" fill="#7B43F1" radius={[0, 4, 4, 0]} />
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
                    <span>{selectedOrganizations.length > 0 ? `${selectedOrganizations.length} Organizations Selected` : 'Filter Organizations'}</span> {/* Renamed */}
                    {selectedOrganizations.length > 0 && <Badge variant="secondary" className="ml-auto">{selectedOrganizations.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrganizations([])}>Deselect All</Button>
                    {allOrganizations.map(org => ( // Renamed
                      <Label key={org.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                        <Checkbox
                          checked={selectedOrganizations.includes(org.id)}
                          onCheckedChange={() => setSelectedOrganizations(p => p.includes(org.id) ? p.filter(id => id !== org.id) : [...p, org.id])}
                        />
                        {org.name}
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
                  placeholder="Search organizations in table..." // Renamed
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
                            col === 'Organization Name' // Renamed
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
                        <TableRow key={row['Organization Name']} className="hover:bg-gray-50 transition"> {/* Renamed */}
                          <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">
                            {row['Organization Name']} {/* Renamed */}
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

export default OrganizationTalentTrendsReport;