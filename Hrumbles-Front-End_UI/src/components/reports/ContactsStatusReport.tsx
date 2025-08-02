import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { DateRangePickerField } from './DateRangePickerField';
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

// --- Type Definitions ---
interface Contact {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  contact_stage: string | null;
  job_title: string | null;
  creator_name: string | null;
  company_name: string | null;
  email: string | null;
  mobile: string | null;
}

interface StatusMap { [key: string]: string; }
interface GroupedData { [statusName: string]: Contact[]; }
interface TableRowData {
  type: 'header' | 'data';
  statusName?: string;
  count?: number;
  contact?: Contact;
}

// --- Chart Colors ---
const COLORS = ['#7B43F1', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}`}</p>
        <p className="text-gray-600">{`Contacts: ${payload[0].value}`}</p>
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
  return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : date;
};

// --- Main Component ---
const ContactsStatusReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [creatorOptions, setCreatorOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dataError } = await supabase
          .from('contacts')
          .select(`
            id, name, created_at, updated_at, contact_stage, job_title, email, mobile,
            hr_employees!contacts_created_by_fkey(first_name, last_name),
            companies(name)
          `)
          .eq('organization_id', organizationId)
          .gte('created_at', appliedDateRange.startDate.toISOString())
          .lte('created_at', appliedDateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (dataError) throw dataError;

        const formattedContacts: Contact[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          contact_stage: item.contact_stage,
          job_title: item.job_title || 'N/A',
          creator_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}`.trim() : 'N/A',
          company_name: item.companies?.name || 'N/A',
          email: item.email || 'N/A',
          mobile: item.mobile || 'N/A',
        }));
        setContacts(formattedContacts);

        const uniqueCreators = [...new Set(formattedContacts.map(c => c.creator_name).filter(r => r && r !== 'N/A'))].sort();
        setCreatorOptions(uniqueCreators);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, appliedDateRange]);

  // --- Memoized Data Transformations ---
  const filteredContacts = useMemo(() => {
    return contacts
      .filter(c => {
        const statusMatch = statusFilter === 'all' || c.contact_stage === statusFilter;
        const creatorMatch = creatorFilter === 'all' || c.creator_name === creatorFilter;
        return statusMatch && creatorMatch;
      })
      .filter(c => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          c.name?.toLowerCase().includes(search) ||
          c.job_title?.toLowerCase().includes(search) ||
          c.company_name?.toLowerCase().includes(search) ||
          c.creator_name?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.mobile?.toLowerCase().includes(search)
        );
      });
  }, [contacts, searchTerm, statusFilter, creatorFilter]);

  const groupedByStatus = useMemo<GroupedData>(() => {
    return filteredContacts.reduce((acc: GroupedData, contact) => {
      const statusName = contact.contact_stage || 'Uncategorized';
      if (!acc[statusName]) acc[statusName] = [];
      acc[statusName].push(contact);
      return acc;
    }, {});
  }, [filteredContacts]);

  const chartData = useMemo(() => {
    return Object.entries(groupedByStatus)
      .map(([name, group]) => ({ name, value: group.length }))
      .sort((a, b) => b.value - a.value);
  }, [groupedByStatus]);

  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) {
      return filteredContacts.map(c => ({
        type: 'data',
        contact: c,
        statusName: c.contact_stage || 'Uncategorized',
      }));
    }
    return Object.entries(groupedByStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([statusName, contactsInGroup]) => [
        {
          type: 'header',
          statusName,
          count: contactsInGroup.length,
        },
        ...expandedGroups.includes(statusName)
          ? contactsInGroup.map(c => ({
              type: 'data',
              contact: c,
              statusName,
            }))
          : [],
      ]);
  }, [isGrouped, filteredContacts, groupedByStatus, expandedGroups]);

  // --- Summary Metrics ---
  const totalContacts = filteredContacts.length;
  const peakStatus = chartData.reduce((max, item) => item.value > max.value ? item : max, { name: 'N/A', value: 0 });
  const averageContacts = chartData.length > 0 ? (totalContacts / chartData.length).toFixed(1) : '0.0';
  const topStatus = chartData[0] || { name: 'N/A', value: 0 };

  // --- Pagination Logic ---
  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = tableRows.slice(startIndex, startIndex + itemsPerPage);

  // --- Export Functions ---
  const exportToCSV = () => {
    const dataForExport = filteredContacts.map(c => ({
      'Contact Name': c.name,
      'Status': c.contact_stage || 'Uncategorized',
      'Job Title': formatValue(c.job_title),
      'Company': formatValue(c.company_name),
      'Creator': formatValue(c.creator_name),
      'Created At': formatDate(c.created_at),
      'Email': formatValue(c.email),
      'Mobile': formatValue(c.mobile),
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_status_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Contacts Status Report', 14, 20);
    const tableData = filteredContacts.map(c => [
      c.name,
      c.contact_stage || 'Uncategorized',
      formatValue(c.job_title),
      formatValue(c.company_name),
      formatValue(c.creator_name),
      formatDate(c.created_at),
      formatValue(c.email),
      formatValue(c.mobile),
    ]);
    (doc as any).autoTable({
      head: [['Contact Name', 'Status', 'Job Title', 'Company', 'Creator', 'Created At', 'Email', 'Mobile']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`contacts_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- Toggle Group Expansion ---
  const toggleGroup = (statusName: string) => {
    setExpandedGroups(prev =>
      prev.includes(statusName)
        ? prev.filter(g => g !== statusName)
        : [...prev, statusName]
    );
  };

  // --- Handle Filters ---
  const handleApplyFilters = () => {
    setAppliedDateRange(draftDateRange);
    setCurrentPage(1);
  };

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  if (isLoading && contacts.length === 0 && !error) {
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Contacts Status Report</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze contact distribution by status within the selected period.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Contacts</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalContacts}</h3>
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
                <p className="text-xs text-gray-500 mt-1">{peakStatus.value} contacts</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                <ArrowUp size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Average Contacts</p>
                <h3 className="text-2xl font-bold text-gray-800">{averageContacts}</h3>
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
                <p className="text-xs text-gray-500 mt-1">{topStatus.value} contacts</p>
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
            <CardHeader className="bg-purple-500 text-white p-3">
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </CardHeader>
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
                        formatter={(value: number) => `${value} contacts`}
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
            <CardHeader className="bg-purple-500 text-white p-3">
              <CardTitle className="text-base">Contacts per Status</CardTitle>
            </CardHeader>
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
                        formatter={(value: number) => [`${value} contacts`, 'Contacts']}
                      />
                      <Bar dataKey="value" name="Contacts" fill="#7B43F1" radius={[0, 4, 4, 0]} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-center">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <DateRangePickerField
                  dateRange={draftDateRange}
                  onDateRangeChange={setDraftDateRange}
                  className="pl-10 h-10 w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={onFilterChange(setStatusFilter)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-gray-500" />
                    <SelectValue placeholder="Filter by Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {[...new Set(contacts.map(c => c.contact_stage).filter(s => s))].sort().map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={creatorFilter} onValueChange={onFilterChange(setCreatorFilter)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-500" />
                    <SelectValue placeholder="Filter by Creator" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {creatorOptions.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <Button
                onClick={handleApplyFilters}
                className="w-full sm:w-auto flex-shrink-0 bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search name, job, company..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <Button variant="outline" onClick={() => setIsGrouped(!isGrouped)} className="w-full sm:w-auto">
                {isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />}
                {isGrouped ? 'Ungroup' : 'Group by Status'}
              </Button>
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
                      <TableHead className="sticky left-0 bg-gray-50 z-10 text-left font-medium text-gray-500 px-4 py-2 w-[200px]">
                        Contact Name
                      </TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Status</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Job Title</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Company</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Creator</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Created At</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Email</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row) => {
                        if (row.type === 'header') {
                          return (
                            <TableRow key={row.statusName} className="bg-gray-50 hover:bg-gray-100 transition">
                              <TableCell colSpan={8} className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2">
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
                        const { contact, statusName } = row;
                        return (
                          <TableRow key={contact!.id} className="hover:bg-gray-50 transition">
                            <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">
                              {contact!.name}
                            </TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{statusName}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(contact!.job_title)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(contact!.company_name)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(contact!.creator_name)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatDate(contact!.created_at)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(contact!.email)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(contact!.mobile)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-gray-500">
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ContactsStatusReport;