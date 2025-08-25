import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { DateRangePickerField } from '@/components/ui/DateRangePickerField';
import { format, isValid } from 'date-fns';
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, Sigma, ArrowUp, Activity, TrendingUp, CheckCircle, Tag, Building, User } from 'lucide-react';
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
interface Candidate {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  main_status_id: string | null;
  sub_status_id: string | null;
  job_title: string | null;
  recruiter_name: string | null;
  client_name: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  location: string | null;
  notice_period: string | null;
  overall_score: number | null;
}

interface StatusMap { [key: string]: string; }
interface GroupedData { [statusName: string]: Candidate[]; }
interface TableRowData {
  type: 'header' | 'data';
  statusName?: string;
  count?: number;
  candidate?: Candidate;
}

// --- Chart Colors ---
const COLORS = ['#7B43F1', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}`}</p>
        <p className="text-gray-600">{`Candidates: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatValue = (value: string | number | null | undefined) => {
  return value != null ? String(value) : 'N/A';
};

const formatDate = (date: string) => {
  const parsedDate = new Date(date);
  return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : date;
};

const getScoreBadgeClass = (score: number | null | undefined): string => {
  if (score == null) {
    return 'bg-gray-100 text-gray-800'; // Default for N/A
  }
  if (score > 80) {
    return 'bg-green-100 text-green-800'; // Green
  }
  if (score > 50) {
    return 'bg-amber-100 text-amber-800'; // Orange/Amber
  }
  return 'bg-red-100 text-red-800'; // Red
};
// --- Main Component ---
const ConsolidatedStatusReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
    const { user, role } = useSelector((state: any) => state.auth);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [statuses, setStatuses] = useState<StatusMap>({});
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
  const [clientFilter, setClientFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [recruiterOptions, setRecruiterOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });

  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [isDepartmentLoading, setIsDepartmentLoading] = useState(true);
  
  // NEW: Logic to check for the restricted view
  const isRestrictedView = role === 'employee' && departmentName === 'Human Resource';

  // NEW: useEffect to fetch department name for the current user
  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!user?.id) {
        setIsDepartmentLoading(false);
        return;
      }

      setIsDepartmentLoading(true);
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", user.id)
          .single();

        if (employeeError || !employeeData?.department_id) {
          throw new Error(employeeError?.message || "No department found");
        }

        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;

        setDepartmentName(departmentData.name || null);
      } catch (error: any) {
        console.error("Error fetching department:", error.message);
        setDepartmentName(null); // Fallback to non-restricted view
      } finally {
        setIsDepartmentLoading(false);
      }
    };

    fetchDepartmentName();
  }, [user?.id]);



  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || isDepartmentLoading) return;
      
      setIsLoading(true);
      setError(null);
       try {
        // MODIFIED: Build query dynamically based on user role/department
        let candidatesQuery = supabase
          .from('hr_job_candidates')
          .select(
            `
            id, name, created_at, updated_at, main_status_id, sub_status_id,
            current_salary, expected_salary, location, notice_period, overall_score,
            job_id,
            job:hr_jobs!hr_job_candidates_job_id_fkey(title, client_details),
            recruiter:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name)
          `
          )
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        // MODIFIED: If it's the restricted view, add a filter for the current user's ID
        if (isRestrictedView && user?.id) {
            candidatesQuery = candidatesQuery.eq('created_by', user.id);
        }

        const [candidatesResponse, statusesResponse] = await Promise.all([
          candidatesQuery,
          supabase.from('job_statuses').select('id, name').eq('organization_id', organizationId),
        ]);

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
        const formattedCandidates: Candidate[] = candidatesResponse.data.map((c: any) => ({
          id: c.id,
          job_id: c.job_id,
          name: c.name,
          created_at: c.created_at,
          updated_at: c.updated_at,
          main_status_id: c.main_status_id,
          sub_status_id: c.sub_status_id,
          job_title: c.job?.title || 'N/A',
          recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A',
          client_name: c.job?.client_details?.clientName || 'N/A',
          current_salary: c.current_salary,
          expected_salary: c.expected_salary,
          location: c.location,
          notice_period: c.notice_period,
          overall_score: c.overall_score,
        }));
        setCandidates(formattedCandidates);

        const statusMap = statusesResponse.data.reduce((acc: StatusMap, status) => {
          acc[status.id] = status.name;
          return acc;
        }, {});
        setStatuses(statusMap);

        const uniqueClients = [...new Set(formattedCandidates.map(c => c.client_name).filter(c => c && c !== 'N/A'))].sort();
        const uniqueRecruiters = [...new Set(formattedCandidates.map(c => c.recruiter_name).filter(r => r && r !== 'N/A'))].sort();
        setClientOptions(uniqueClients);
        setRecruiterOptions(uniqueRecruiters);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  // MODIFIED: Added dependencies to re-run fetch when user context changes
  }, [organizationId, dateRange, user?.id, isDepartmentLoading, isRestrictedView]); 

  // --- Memoized Data Transformations ---
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(c => {
        const statusName = statuses[c.sub_status_id || ''] || 'Uncategorized';
        const statusMatch = statusFilter === 'all' || statusName === statusFilter;
        const clientMatch = clientFilter === 'all' || c.client_name === clientFilter;
        // MODIFIED: Recruiter filter logic now considers the restricted view
        const recruiterMatch = isRestrictedView || recruiterFilter === 'all' || c.recruiter_name === recruiterFilter;
        return statusMatch && clientMatch && recruiterMatch;
      })
      .filter(c => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          c.name?.toLowerCase().includes(search) ||
          c.job_title?.toLowerCase().includes(search) ||
          c.client_name?.toLowerCase().includes(search) ||
          c.recruiter_name?.toLowerCase().includes(search) ||
          c.location?.toLowerCase().includes(search)
        );
      });
  }, [candidates, searchTerm, statuses, statusFilter, clientFilter, recruiterFilter, isRestrictedView]);

  const groupedBySubStatus = useMemo<GroupedData>(() => {
    return filteredCandidates.reduce((acc: GroupedData, candidate) => {
      const statusName = statuses[candidate.sub_status_id || ''] || 'Uncategorized';
      if (!acc[statusName]) acc[statusName] = [];
      acc[statusName].push(candidate);
      return acc;
    }, {});
  }, [filteredCandidates, statuses]);

  const chartData = useMemo(() => {
    return Object.entries(groupedBySubStatus)
      .map(([name, group]) => ({ name, value: group.length }))
      .sort((a, b) => b.value - a.value);
  }, [groupedBySubStatus]);

  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) {
      return filteredCandidates.map(c => ({
        type: 'data',
        candidate: c,
        statusName: statuses[c.sub_status_id || ''] || 'Uncategorized',
      }));
    }
    return Object.entries(groupedBySubStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([statusName, candidatesInGroup]) => [
        {
          type: 'header',
          statusName,
          count: candidatesInGroup.length,
        },
        ...expandedGroups.includes(statusName)
          ? candidatesInGroup.map(c => ({
              type: 'data',
              candidate: c,
              statusName,
            }))
          : [],
      ]);
  }, [isGrouped, filteredCandidates, groupedBySubStatus, expandedGroups, statuses]);

  // --- Summary Metrics ---
  const totalCandidates = filteredCandidates.length;
  const peakStatus = chartData.reduce((max, item) => item.value > max.value ? item : max, { name: 'N/A', value: 0 });
  const averageCandidates = chartData.length > 0 ? (totalCandidates / chartData.length).toFixed(1) : '0.0';
  const topStatus = chartData[0] || { name: 'N/A', value: 0 };

  // --- Pagination Logic ---
  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = tableRows.slice(startIndex, startIndex + itemsPerPage);

  console.log(paginatedData)

  // --- Export Functions ---
  const exportToCSV = () => {
    const dataForExport = filteredCandidates.map(c => ({
      'Candidate Name': c.name,
      'Status': statuses[c.sub_status_id || ''] || 'Uncategorized',
      'AI Score': formatValue(c.overall_score),
      'Job Title': formatValue(c.job_title),
      'Client': formatValue(c.client_name),
      'Recruiter': formatValue(c.recruiter_name),
      'Applied': formatDate(c.created_at),
      'CCTC (INR)': formatCurrency(c.current_salary),
      'ECTC (INR)': formatCurrency(c.expected_salary),
      'Notice Period': formatValue(c.notice_period),
      'Location': formatValue(c.location),
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consolidated_status_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Consolidated Status Report', 14, 20);
    const tableData = filteredCandidates.map(c => [
      c.name,
      statuses[c.sub_status_id || ''] || 'Uncategorized',
      formatValue(c.overall_score),
      formatValue(c.job_title),
      formatValue(c.client_name),
      formatValue(c.recruiter_name),
      formatDate(c.created_at),
      formatCurrency(c.current_salary),
      formatCurrency(c.expected_salary),
      formatValue(c.notice_period),
      formatValue(c.location),
    ]);
    (doc as any).autoTable({
      head: [['Candidate Name', 'Status', 'AI Score', 'Job Title', 'Client', 'Recruiter', 'Applied', 'CCTC (INR)', 'ECTC (INR)', 'Notice Period', 'Location']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`consolidated_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
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

 if ((isLoading && candidates.length === 0 && !error) || isDepartmentLoading) {
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Consolidated Candidate Status Report</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze candidate distribution by status within the selected period.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Candidates</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalCandidates}</h3>
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
                <p className="text-xs text-gray-500.mount mt-1">{peakStatus.value} candidates</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                <ArrowUp size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Average Candidates</p>
                <h3 className="text-2xl font-bold text-gray-800">{averageCandidates}</h3>
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
                <p className="text-xs text-gray-500 mt-1">{topStatus.value} candidates</p>
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
                        formatter={(value: number) => `${value} candidates`}
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
              <CardTitle className="text-base">Candidates per Status</CardTitle>
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
                        formatter={(value: number) => [`${value} candidates`, 'Candidates']}
                      />
                      <Bar dataKey="value" name="Candidates" fill="#7B43F1" radius={[0, 4, 4, 0]} />
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
                <DateRangePickerField
                dateRange={dateRange as any} // Pass the single dateRange state
                onDateRangeChange={setDateRange} // This updates the state when "Apply" is clicked
                onApply={() => setCurrentPage(1)} // Reset page on apply
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
                  {Object.values(statuses).sort().map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={onFilterChange(setClientFilter)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Building size={16} className="text-gray-500" />
                    <SelectValue placeholder="Filter by Client" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clientOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isRestrictedView && (
                <Select value={recruiterFilter} onValueChange={onFilterChange(setRecruiterFilter)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      <SelectValue placeholder="Filter by Recruiter" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recruiters</SelectItem>
                    {recruiterOptions.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              {/* <Button
                onClick={handleApplyFilters}
                className="w-full sm:w-auto flex-shrink-0 bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Filters
              </Button> */}
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search name, job, client..."
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
                        Candidate
                      </TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Status</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">AI Score</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Job Title</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Client</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Recruiter</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Applied</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">CCTC</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">ECTC</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Notice</TableHead>
                      <TableHead className="text-left font-medium text-gray-500 px-4 py-2">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row) => {
                        if (row.type === 'header') {
                          return (
                            <TableRow key={row.statusName} className="bg-gray-50 hover:bg-gray-100 transition">
                              <TableCell colSpan={11} className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2">
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
                        const { candidate, statusName } = row;
                        return (
                          <TableRow key={candidate!.id} className="hover:bg-gray-50 transition">
                            <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">
                               <Link
              to={`/employee/${candidate!.id}/${candidate!.job_id}`}
              className="text-indigo-600 hover:underline hover:text-indigo-800"
            >
              {candidate!.name}
            </Link>
                            </TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{statusName}</TableCell>
                          <TableCell className="text-gray-600 px-4 py-2">
            {/* CHANGE: Updated Badge to use the color helper function */}
            <Badge className={getScoreBadgeClass(candidate!.overall_score)}>
              {formatValue(candidate!.overall_score)}
            </Badge>
          </TableCell>
                            <TableCell className="text-gray-600 px-4 py-2"><Link
              to={`/jobs/${candidate!.job_id}`}
              className="text-indigo-600 hover:underline hover:text-indigo-800"
            >
              {formatValue(candidate!.job_title)}
            </Link></TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.client_name)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.recruiter_name)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatDate(candidate!.created_at)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatCurrency(candidate!.current_salary)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatCurrency(candidate!.expected_salary)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.notice_period)}</TableCell>
                            <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.location)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center text-gray-500">
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

export default ConsolidatedStatusReport;