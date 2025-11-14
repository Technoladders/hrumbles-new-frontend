import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { format, isValid } from 'date-fns';
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, Sigma, ArrowUp, Activity, TrendingUp, CheckCircle, Tag, User } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// --- Type Definitions ---
interface Verification {
  id: string;
  created_at: string;
  lookup_type: string;
  lookup_value: string;
  response_data: {
    status: number;
    msg?: { uan_details?: { name: string; uan: string }[] };
  };
  verified_by: { first_name: string; last_name: string } | null;
}

interface GroupedData { [statusName: string]: Verification[]; }
interface TableRowData {
  type: 'header' | 'data';
  statusName?: string;
  count?: number;
  verification?: Verification;
}

// --- Chart Colors ---
const COLORS = ['#7B43F1', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}`}</p>
        <p className="text-gray-600">{`Verifications: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// --- Helper Functions ---
const formatValue = (value: string | number | null | undefined) => {
  return value != null ? String(value) : 'N/A';
};

const formatDate = (date: string) => {
  const parsedDate = new Date(date);
  return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy p') : date;
};

// --- Main Component ---
const UanByMobileOrPanReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: (() => {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      return start;
    })(),
    endDate: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifierFilter, setVerifierFilter] = useState('all');
  const [verifierOptions, setVerifierOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !dateRange.startDate || !dateRange.endDate) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('uanlookups')
          .select('*, verified_by:hr_employees(first_name, last_name)')
          .eq('organization_id', organizationId)
          .in('lookup_type', ['mobile', 'pan'])
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const formattedVerifications: Verification[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          lookup_type: item.lookup_type,
          lookup_value: item.lookup_value,
          response_data: item.response_data,
          verified_by: item.verified_by,
        }));
        setVerifications(formattedVerifications);

        const uniqueVerifiers = [...new Set(formattedVerifications
          .map(v => v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}`.trim() : 'System')
          .filter(v => v && v !== 'System'))].sort();
        setVerifierOptions(uniqueVerifiers);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, dateRange]);

  // --- Memoized Data Transformations ---
  const filteredVerifications = useMemo(() => {
    return verifications
      .filter(v => {
        const statusName = v.response_data?.status === 1 ? 'Found' : 'Not Found';
        const statusMatch = statusFilter === 'all' || statusName === statusFilter;
        const verifierMatch = verifierFilter === 'all' ||
          (v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}`.trim() : 'System') === verifierFilter;
        return statusMatch && verifierMatch;
      })
      .filter(v => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        const uanDetails = v.response_data?.msg?.uan_details?.[0];
        return (
          v.lookup_value?.toLowerCase().includes(lowerSearch) ||
          uanDetails?.name?.toLowerCase().includes(lowerSearch) ||
          uanDetails?.uan?.toLowerCase().includes(lowerSearch)
        );
      });
  }, [verifications, searchTerm, statusFilter, verifierFilter]);

  const groupedByStatus = useMemo<GroupedData>(() => {
    return filteredVerifications.reduce((acc: GroupedData, verification) => {
      const statusName = verification.response_data?.status === 1 ? 'Found' : 'Not Found';
      if (!acc[statusName]) acc[statusName] = [];
      acc[statusName].push(verification);
      return acc;
    }, {});
  }, [filteredVerifications]);

  const chartData = useMemo(() => {
    return Object.entries(groupedByStatus)
      .map(([name, group]) => ({ name, value: group.length }))
      .sort((a, b) => b.value - a.value);
  }, [groupedByStatus]);

  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) {
      return filteredVerifications.map(v => ({
        type: 'data',
        verification: v,
        statusName: v.response_data?.status === 1 ? 'Found' : 'Not Found',
      }));
    }
    return Object.entries(groupedByStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([statusName, verificationsInGroup]) => [
        {
          type: 'header',
          statusName,
          count: verificationsInGroup.length,
        },
        ...expandedGroups.includes(statusName)
          ? verificationsInGroup.map(v => ({
              type: 'data',
              verification: v,
              statusName,
            }))
          : [],
      ]);
  }, [isGrouped, filteredVerifications, groupedByStatus, expandedGroups]);

  // --- Summary Metrics ---
  const totalVerifications = filteredVerifications.length;
  const peakStatus = chartData.reduce((max, item) => item.value > max.value ? item : max, { name: 'N/A', value: 0 });
  const averageVerifications = chartData.length > 0 ? (totalVerifications / chartData.length).toFixed(1) : '0.0';
  const topStatus = chartData[0] || { name: 'N/A', value: 0 };

  // --- Pagination Logic ---
  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = tableRows.slice(startIndex, startIndex + itemsPerPage);

  // --- Export Functions ---
  const exportToCSV = () => {
    const dataForExport = filteredVerifications.map(v => {
      const uanDetails = v.response_data?.msg?.uan_details?.[0];
      return {
        'Verified On': formatDate(v.created_at),
        'Input': `${v.lookup_type} ${v.lookup_value}`,
        'Candidate Name': formatValue(uanDetails?.name),
        'UAN': formatValue(uanDetails?.uan),
        'Status': v.response_data?.status === 1 ? 'Found' : 'Not Found',
        'Verified By': v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
      };
    });
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uan_by_mobile_or_pan_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('UAN by Mobile/PAN Report', 14, 20);
    const tableData = filteredVerifications.map(v => {
      const uanDetails = v.response_data?.msg?.uan_details?.[0];
      return [
        formatDate(v.created_at),
        `${v.lookup_type} ${v.lookup_value}`,
        formatValue(uanDetails?.name),
        formatValue(uanDetails?.uan),
        v.response_data?.status === 1 ? 'Found' : 'Not Found',
        v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
      ];
    });
    (doc as any).autoTable({
      head: [['Verified On', 'Input', 'Candidate Name', 'UAN', 'Status', 'Verified By']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`uan_by_mobile_or_pan_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- Toggle Group Expansion ---
  const toggleGroup = (statusName: string) => {
    setExpandedGroups(prev =>
      prev.includes(statusName)
        ? prev.filter(g => g !== statusName)
        : [...prev, statusName]
    );
  };

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  if (isLoading && verifications.length === 0 && !error) {
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
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Verifications</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalVerifications}</h3>
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
              <p className="text-sm font-medium text-gray-500 mb-2">Peak Status</p>
              <h3 className="text-2xl font-bold text-gray-800 truncate" title={peakStatus.name}>{peakStatus.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{peakStatus.value} verifications</p>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
              <ArrowUp size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Average Verifications</p>
              <h3 className="text-2xl font-bold text-gray-800">{averageVerifications}</h3>
              <p className="text-xs text-gray-500 mt-1">per status</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
              <Activity size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Top Status</p>
              <h3 className="text-2xl font-bold text-gray-800 truncate" title={topStatus.name}>{topStatus.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{topStatus.value} verifications</p>
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
          <CardContent className="p-6">
            <div className="h-[300px] w-full animate-fade-in">
              {isLoading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={130}
                      paddingAngle={5}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid oklch(62.7% 0.265 303.9)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                      itemStyle={{ color: '#4b5563' }}
                      formatter={(value: number) => `${value} verifications`}
                    />
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
        </Card>

        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6">
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex h-[300px] w-full items-center justify-center">
                  <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartData.length * 40 > 300 ? chartData.length * 40 : 300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#4b5563' }} interval={0} />
                    <Tooltip
                      cursor={{ fill: '#f3e8ff' }}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid oklch(62.7% 0.265 303.9)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                      itemStyle={{ color: '#4b5563' }}
                      formatter={(value: number) => [`${value} verifications`, 'Verifications']}
                    />
                    <Bar dataKey="value" name="Verifications" fill="#7B43F1" radius={[0, 4, 4, 0]} />
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
      <div className="space-y-6">
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Date Range */}
  <div className="flex-shrink-0 order-4 w-full sm:w-auto">
    <EnhancedDateRangeSelector
      value={dateRange}
      onChange={setDateRange}
    />
  </div>

  {/* Status Filter */}
  <div className="flex-shrink-0 order-2 w-full sm:w-[150px]">
    <Select value={statusFilter} onValueChange={onFilterChange(setStatusFilter)}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-gray-500" />
          <SelectValue placeholder="Filter by Status" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Statuses</SelectItem>
        <SelectItem value="Found">Found</SelectItem>
        <SelectItem value="Not Found">Not Found</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Verifier Filter */}
  <div className="flex-shrink-0 order-3 w-full sm:w-[150px]">
    <Select value={verifierFilter} onValueChange={onFilterChange(setVerifierFilter)}>
      <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-500" />
          <SelectValue placeholder="Filter by Verifier" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Verifiers</SelectItem>
        {verifierOptions.map(v => (
          <SelectItem key={v} value={v}>{v}</SelectItem>
        ))}
        <SelectItem value="System">System</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Search Bar */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search
      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      size={18}
    />
    <Input
      placeholder="Search by Input, Name, or UAN..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={(e) => { 
        setSearchTerm(e.target.value); 
        setCurrentPage(1); 
      }}
    />
  </div>

  {/* Group Button */}
  <Button 
    variant="outline" 
    onClick={() => setIsGrouped(!isGrouped)} 
    className="flex-shrink-0 order-5 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
  >
    {isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />}
    {isGrouped ? 'Ungroup' : 'Group by Status'}
  </Button>

  {/* Export Buttons */}
  <div className="flex gap-2 flex-shrink-0 order-6">
    <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
    <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
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
                  <TableHead className="sticky left-0 bg-gray-50 z-10 text-left font-medium text-gray-500 px-4 py-2 w-[200px]">
                    Verified On
                  </TableHead>
                  <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Input</TableHead>
                  <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Candidate Name</TableHead>
                  <TableHead className="text-left font-medium text-gray-500 px-4 py-2">UAN</TableHead>
                  <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Status</TableHead>
                  <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Verified By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => {
                    if (row.type === 'header') {
                      return (
                        <TableRow key={row.statusName} className="bg-gray-50 hover:bg-gray-100 transition">
                          <TableCell colSpan={6} className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleGroup(row.statusName!)}
                                className="p-0 h-6 w-6"
                              >
                                {expandedGroups.includes(row.statusName!) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              {row.statusName} <Badge variant="secondary">{row.count}</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const { verification, statusName } = row;
                    const uanDetails = verification!.response_data?.msg?.uan_details?.[0];
                    return (
                      <TableRow key={verification!.id} className="hover:bg-gray-50 transition">
                        <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">
                          {formatDate(verification!.created_at)}
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">
                          <Badge variant="outline">{verification!.lookup_type}</Badge> {verification!.lookup_value}
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(uanDetails?.name)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(uanDetails?.uan)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">
                          <Badge variant={statusName === 'Found' ? 'success' : 'destructive'}>{statusName}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">
                          {verification!.verified_by ? `${verification!.verified_by.first_name} ${verification!.verified_by.last_name}` : 'System'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No data found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
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
                <option value="100">100</option>
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
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, tableRows.length)} of {tableRows.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UanByMobileOrPanReport;