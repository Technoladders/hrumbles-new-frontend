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
import { AlertCircle, Search, Download, ChevronDown, ChevronRight, Calendar, ChevronLeft, Sigma, ArrowUp, Activity, TrendingUp, CheckCircle, Tag, User } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// --- Type Definitions ---
interface Verification {
  id: string;
  created_at: string;
  lookup_value: string;
  response_data: {
    status: number;
    msg?: { name: string; establishment_name?: string; EstablishmentId?: string; Doj?: string; DateOfExitEpf?: string; MemberId?: string; date_of_joining?: string; date_of_exit?: string }[];
  };
  verified_by: { first_name: string; last_name: string } | null;
}

interface ChartData {
  name: string;
  value: number;
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
const BasicUanReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

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
          .eq('lookup_type', 'uan_full_history')
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const formattedVerifications: Verification[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
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
        const history = v.response_data?.msg?.[0];
        return (
          v.lookup_value?.toLowerCase().includes(lowerSearch) ||
          history?.name?.toLowerCase().includes(lowerSearch)
        );
      });
  }, [verifications, searchTerm, statusFilter, verifierFilter]);

  const chartData = useMemo<ChartData[]>(() => {
    const grouped = filteredVerifications.reduce((acc: { [key: string]: number }, v) => {
      const statusName = v.response_data?.status === 1 ? 'Found' : 'Not Found';
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredVerifications]);

  const paginatedData = useMemo(() => {
    return filteredVerifications.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  }, [filteredVerifications, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);

  // --- Summary Metrics ---
  const totalVerifications = filteredVerifications.length;
  const peakStatus = chartData.reduce((max, item) => item.value > max.value ? item : max, { name: 'N/A', value: 0 });
  const averageVerifications = chartData.length > 0 ? (totalVerifications / chartData.length).toFixed(1) : '0.0';
  const topStatus = chartData[0] || { name: 'N/A', value: 0 };

  // --- Export Functions ---
  const exportToCSV = () => {
    const dataForExport = filteredVerifications.flatMap(v => {
      const history = Array.isArray(v.response_data?.msg) ? v.response_data.msg : [];
      if (history.length === 0) {
        return [{
          'Verified On': formatDate(v.created_at),
          'UAN Verified': v.lookup_value,
          'Candidate Name': 'N/A',
          'Status': v.response_data?.status === 1 ? 'Found' : 'Not Found',
          'Verified By': v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
          'Establishment Name': 'N/A',
          'Member Id': 'N/A',
          'DOJ': 'N/A',
          'DOE': 'N/A',
        }];
      }
      return history.map((emp: any) => ({
        'Verified On': formatDate(v.created_at),
        'UAN Verified': v.lookup_value,
        'Candidate Name': formatValue(emp.name),
        'Status': v.response_data?.status === 1 ? 'Found' : 'Not Found',
        'Verified By': v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
        'Establishment Name': formatValue(emp['Establishment Name'] || emp.establishment_name),
        'Member Id': formatValue(emp['Establishment Id'] || emp.MemberId),
        'DOJ': formatValue(emp.Doj || emp.date_of_joining),
        'DOE': formatValue(emp.DateOfExitEpf === 'NA' ? 'Present' : emp.DateOfExitEpf || emp.date_of_exit),
      }));
    });
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `basic_uan_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Basic UAN (Full History) Report', 14, 20);
    const tableData = filteredVerifications.flatMap(v => {
      const history = Array.isArray(v.response_data?.msg) ? v.response_data.msg : [];
      if (history.length === 0) {
        return [[
          formatDate(v.created_at),
          v.lookup_value,
          'N/A',
          v.response_data?.status === 1 ? 'Found' : 'Not Found',
          v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
          'N/A', 'N/A', 'N/A', 'N/A'
        ]];
      }
      return history.map((emp: any) => [
        formatDate(v.created_at),
        v.lookup_value,
        formatValue(emp.name),
        v.response_data?.status === 1 ? 'Found' : 'Not Found',
        v.verified_by ? `${v.verified_by.first_name} ${v.verified_by.last_name}` : 'System',
        formatValue(emp['Establishment Name'] || emp.establishment_name),
        formatValue(emp['Establishment Id'] || emp.MemberId),
        formatValue(emp.Doj || emp.date_of_joining),
        formatValue(emp.DateOfExitEpf === 'NA' ? 'Present' : emp.DateOfExitEpf || emp.date_of_exit),
      ]);
    });
    (doc as any).autoTable({
      head: [['Verified On', 'UAN Verified', 'Candidate Name', 'Status', 'Verified By', 'Establishment Name', 'Member Id', 'DOJ', 'DOE']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`basic_uan_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(0);
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
      placeholder="Search by UAN or Name..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={(e) => { 
        setSearchTerm(e.target.value); 
        setCurrentPage(0); 
      }}
    />
  </div>

  {/* Export Buttons */}
  <div className="flex gap-2 flex-shrink-0 order-5">
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Verified On</TableHead>
                <TableHead>UAN Verified</TableHead>
                <TableHead>Candidate Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => {
                  const history = item.response_data?.msg;
                  const candidateName = Array.isArray(history) && history.length > 0 ? history[0].name : 'N/A';
                  const status = item.response_data?.status;
                  const isOpen = openCollapsibles[item.id] || false;

                  return (
                    <Collapsible
                      asChild
                      key={item.id}
                      open={isOpen}
                      onOpenChange={(open) => setOpenCollapsibles((prev) => ({ ...prev, [item.id]: open }))}
                    >
                      <>
                        <TableRow>
                          <TableCell>
                            {Array.isArray(history) && history.length > 0 && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {isOpen ? <ChevronDown /> : <ChevronRight />}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy p')}</TableCell>
                          <TableCell>{item.lookup_value}</TableCell>
                          <TableCell>{candidateName}</TableCell>
                          <TableCell>
                            <Badge variant={status === 1 ? 'success' : 'destructive'}>
                              {status === 1 ? 'Found' : 'Not Found'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.verified_by ? `${item.verified_by.first_name} ${item.verified_by.last_name}` : 'System'}</TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr className="bg-purple-50">
                            <TableCell colSpan={6}>
                              <div className="p-4">
                                <h4 className="font-semibold mb-2">Employment History</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Establishment Name</TableHead>
                                      <TableHead>Member Id</TableHead>
                                      <TableHead>DOJ</TableHead>
                                      <TableHead>DOE</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Array.isArray(history) &&
                                      history.map((emp: any, index: number) => (
                                        <TableRow key={index}>
                                          <TableCell>{emp['Establishment Name'] || emp.establishment_name}</TableCell>
                                          <TableCell>{emp['Establishment Id'] || emp.MemberId}</TableCell>
                                          <TableCell>{emp.Doj || emp.date_of_joining}</TableCell>
                                          <TableCell>{emp.DateOfExitEpf === 'NA' ? 'Present' : emp.DateOfExitEpf || emp.date_of_exit}</TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default BasicUanReport;