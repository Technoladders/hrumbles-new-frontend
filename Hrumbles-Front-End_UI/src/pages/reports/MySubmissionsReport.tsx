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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { format, isValid, formatDistanceToNow } from 'date-fns';
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, Sigma, ArrowUp, Activity, TrendingUp, CheckCircle, Tag, Building, User } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Candidate as OriginalCandidate } from '@/lib/types';


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
   job_id: string; // Made non-nullable for Link
   job_type: string | null; 
  display_job_id: string | null; 
  // --- ADDED FIELDS ---
  schedule_date_time?: string;
  rejection_reason?: string;
}

interface StatusMap { [key: string]: string; }
interface GroupedData { [statusName: string]: Candidate[]; }
interface TableRowData {
  type: 'header' | 'data';
  statusName?: string;
  count?: number;
  candidate?: Candidate;
}


interface GroupedStatusOption {
    mainStatus: string;
    subStatuses: string[];
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// --- Color map ---
const statusColorMap: { [key: string]: string } = {
  'New Applicants': '#F87171',       // Red
  'Client Reject': '#F472B6',       // Pink
  'Internal Reject': '#F472B6',       // Pink
  'Duplicate (Internal)': '#A3E635',  // Lime Green
  'Sourced': '#A3E635',              // Lime Green
  'Internal Hold': '#60A5FA',       // Blue
  'Processed (Internal)': '#60A5FA',       // Blue
  'Processed (Client)': '#2DD4BF',    // Teal
  'L1 Interview': '#60A5FA',       // Blue
  'L2 Interview': '#818CF8',       // Indigo
  'HR Round': '#F472B6',       // Pink
  'Offered': '#FBBF24',             // Amber
  'Joined': '#A78BFA',              // Purple
  'End Client Round': '#F97316',   // Orange
  'L1': '#F97316',                 // Orange
  'L2': '#F97316',                 // Orange
  'Technical Assessment': '#FBBF24', // Amber/Yellow
};
const defaultColor = '#9CA3AF'; // Default gray for any unmapped status


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


const formatScheduleDateTime = (dateTime: string | null | undefined): string | null => {
    if (!dateTime) return null;
    const parsedDate = new Date(dateTime);
    return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy | h:mm a') : null;
};


const getScoreBadgeClass = (score: number | null | undefined): string => {
  if (score == null) {
    return 'bg-gray-100 text-gray-800';
  }
  if (score > 80) {
    return 'bg-green-100 text-green-800';
  }
  if (score > 50) {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-red-100 text-red-800';
};


// This is the correct location, right after imports and before the component.
const getScoreStyles = (score: number | null | undefined): React.CSSProperties => {
  if (score == null) {
    return {
      backgroundColor: 'rgb(156 163 175)', // gray-400
      boxShadow: '0px 4px 15px rgba(156, 163, 175, 0.2)',
    };
  }
  if (score > 80) {
    return {
      backgroundColor: 'rgb(34 197 94)', // green-500
      boxShadow: '0px 4px 15px rgba(34, 197, 94, 0.4)',
    };
  }
  if (score > 50) {
    return {
      backgroundColor: 'rgb(245 158 11)', // amber-500
      boxShadow: '0px 4px 15px rgba(245, 158, 11, 0.4)',
    };
  }
  return {
    backgroundColor: 'rgb(239 68 68)', // red-500
    boxShadow: '0px 4px 15px rgba(239, 68, 68, 0.4)',
  };
};

// --- Main Component ---
const MySubmissionsReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
    const { user, role } = useSelector((state: any) => state.auth);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [mainStatuses, setMainStatuses] = useState<{ id: string; name: string; display_order: number }[]>([]);
  const [subStatuses, setSubStatuses] = useState<{ id: string; name: string; parent_id: string; color: string }[]>([]);
  const [statusNameMap, setStatusNameMap] = useState<StatusMap>({});

   const [groupedStatusOptions, setGroupedStatusOptions] = useState<GroupedStatusOption[]>([]);

   const [orderedStatusOptions, setOrderedStatusOptions] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState<string[]>([]);
const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);
const [clientFilter, setClientFilter] = useState<string[]>([]);
const [tempClientFilter, setTempClientFilter] = useState<string[]>([]);
const [tempRecruiterFilter, setTempRecruiterFilter] = useState<string[]>([]);
const [recruiterFilter, setRecruiterFilter] = useState<string[]>([]);
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [recruiterOptions, setRecruiterOptions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), endDate: new Date() });

  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [isDepartmentLoading, setIsDepartmentLoading] = useState(true);
  
  const isRestrictedView = role === 'employee' && departmentName === 'Human Resource';

  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!user?.id) {
        setIsDepartmentLoading(false);
        return;
      }
      setIsDepartmentLoading(true);
      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees").select("department_id").eq("id", user.id).single();
        if (employeeError || !employeeData?.department_id) {
          throw new Error(employeeError?.message || "No department found");
        }
        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments").select("name").eq("id", employeeData.department_id).single();
        if (departmentError) throw departmentError;
        setDepartmentName(departmentData.name || null);
      } catch (error: any) {
        console.error("Error fetching department:", error.message);
        setDepartmentName(null); 
      } finally {
        setIsDepartmentLoading(false);
      }
    };
    fetchDepartmentName();
  }, [user?.id]);



  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || isDepartmentLoading || !dateRange.startDate || !dateRange.endDate) return;
      
      setIsLoading(true);
      setError(null);
     try {
   const selectFields = `
    id, name, created_at, updated_at, main_status_id, sub_status_id, 
    current_salary, expected_salary, location, notice_period, overall_score, 
    job_id, interview_date, interview_time, interview_feedback, metadata,
    job:hr_jobs!hr_job_candidates_job_id_fkey(title, client_details, job_type, job_id),
    recruiter:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name),
    candidate_resume_analysis(overall_score) 
`;
        let candidatesQuery = supabase
          .from('hr_job_candidates')
          .select(selectFields)
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (user?.id) {
            candidatesQuery = candidatesQuery.eq('created_by', user.id);
        }

        const [candidatesResponse, statusesResponse] = await Promise.all([
          candidatesQuery,
          supabase.from('job_statuses').select('id, name, type, parent_id, color, display_order').eq('organization_id', organizationId),
        ]);

        console.log("Candidates response", candidatesResponse)

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
const formattedCandidates: Candidate[] = candidatesResponse.data.map((c: any) => {
    const combineDateTime = (dateStr: string, timeStr: string): string | null => {
        if (!dateStr || !timeStr) return null;
        const combined = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(combined.getTime())) return null;
        return combined.toISOString();
    };

    const scheduleDateTime = combineDateTime(c.interview_date, c.interview_time);
    const metadata = c.metadata || {};

                const analysisRecord = c.candidate_resume_analysis && c.candidate_resume_analysis.length > 0
                ? c.candidate_resume_analysis[0]
                : null;
            
            const overallScore = analysisRecord ? analysisRecord.overall_score : null;

    return {
        id: c.id,
        job_id: c.job_id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at,
        main_status_id: c.main_status_id,
        sub_status_id: c.sub_status_id,
        job_title: c.job?.title || 'N/A',
          job_type: c.job?.job_type || 'N/A',
           display_job_id: c.job?.job_id || 'N/A',
        recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A',
        client_name: c.job?.client_details?.clientName || 'N/A',
        current_salary: c.current_salary ?? metadata.currentSalary,
        expected_salary: c.expected_salary ?? metadata.expectedSalary,
        location: c.location ?? metadata.currentLocation,
        notice_period: c.notice_period ?? metadata.noticePeriod,
        overall_score: overallScore, // <-- FIX APPLIED HERE
        schedule_date_time: scheduleDateTime,
        rejection_reason: c.interview_feedback,
    };
});

        setCandidates(formattedCandidates);
        const allStatuses = statusesResponse.data || [];
        const nameMap = allStatuses.reduce((acc: StatusMap, status) => { acc[status.id] = status.name; return acc; }, {});
        setStatusNameMap(nameMap);
        const mains = allStatuses.filter(s => s.type === 'main').sort((a, b) => a.display_order - b.display_order);
        const subs = allStatuses.filter(s => s.type === 'sub');
        setMainStatuses(mains);
        setSubStatuses(subs);

        const groupedOptions: GroupedStatusOption[] = mains.map(mainStatus => {
            const children = subs
                .filter(sub => sub.parent_id === mainStatus.id)
                .sort((a, b) => a.display_order - b.display_order)
                .map(child => child.name);
            return { mainStatus: mainStatus.name, subStatuses: children };
        }).filter(group => group.subStatuses.length > 0);
        setGroupedStatusOptions(groupedOptions);

        const sortedSubStatusNames: string[] = [];
        mains.forEach(mainStatus => {
            const children = subs
                .filter(sub => sub.parent_id === mainStatus.id)
                .sort((a, b) => a.display_order - b.display_order);
            
            children.forEach(child => {
                sortedSubStatusNames.push(child.name);
            });
        });
        setOrderedStatusOptions(sortedSubStatusNames);

        const uniqueClients = [...new Set(formattedCandidates.map(c => c.client_name).filter(Boolean))].sort();
        const uniqueRecruiters = [...new Set(formattedCandidates.map(c => c.recruiter_name).filter(Boolean))].sort();
        setClientOptions(uniqueClients);
        setRecruiterOptions(uniqueRecruiters);

      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, dateRange, user?.id, isDepartmentLoading, isRestrictedView]);
  

const filteredCandidates = useMemo(() => {
  return candidates.filter(c => {
    const statusName = (statusNameMap[c.sub_status_id || ''] || 'New Applicants').trim();
    const clientName = (c.client_name || 'N/A').trim();
    const recruiterName = (c.recruiter_name || 'N/A').trim();

    const statusMatch = statusFilter.length === 0 || statusFilter.includes(statusName);
    const clientMatch = clientFilter.length === 0 || clientFilter.includes(clientName);
    const recruiterMatch = isRestrictedView || recruiterFilter.length === 0 || recruiterFilter.includes(recruiterName);
    
    const searchLower = searchTerm.toLowerCase();
    const searchMatch = !searchTerm || 
      c.name.toLowerCase().includes(searchLower) ||
      (c.job_title || '').toLowerCase().includes(searchLower) ||
      (c.client_name || '').toLowerCase().includes(searchLower) ||
      (c.recruiter_name || '').toLowerCase().includes(searchLower);
    
    return statusMatch && clientMatch && recruiterMatch && searchMatch;
  });
}, [candidates, searchTerm, statusNameMap, statusFilter, clientFilter, recruiterFilter, isRestrictedView]);

  const groupedBySubStatus = useMemo<GroupedData>(() => {
    return filteredCandidates.reduce((acc: GroupedData, candidate) => {
      const statusName = statusNameMap[candidate.sub_status_id || ''] || 'New Applicant';
      if (!acc[statusName]) acc[statusName] = [];
      acc[statusName].push(candidate);
      return acc;
    }, {});
  }, [filteredCandidates, statusNameMap]);

  const chartData = useMemo(() => {
    return Object.entries(groupedBySubStatus)
      .map(([name, group]) => ({ name, value: group.length }))
      .sort((a, b) => b.value - a.value);
  }, [groupedBySubStatus]);


  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) {
      return filteredCandidates.map(c => ({ type: 'data', candidate: c, statusName: statusNameMap[c.sub_status_id || ''] || 'New Applicant' }));
    }
    return Object.entries(groupedBySubStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([statusName, candidatesInGroup]) => [
        { type: 'header', statusName, count: candidatesInGroup.length },
        ...expandedGroups.includes(statusName) ? candidatesInGroup.map(c => ({ type: 'data', candidate: c, statusName })) : [],
      ]);
  }, [isGrouped, filteredCandidates, groupedBySubStatus, expandedGroups, statusNameMap]);



  const totalCandidates = filteredCandidates.length;
  const peakStatus = chartData.reduce((max, item) => item.value > max.value ? item : max, { name: 'N/A', value: 0 });
  const averageCandidates = chartData.length > 0 ? (totalCandidates / chartData.length).toFixed(1) : '0.0';
  const topStatus = chartData[0] || { name: 'N/A', value: 0 };

  const totalPages = Math.ceil(tableRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = tableRows.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    const dataForExport = filteredCandidates.map(c => ({
        'AI Score': formatValue(c.overall_score),
        'Candidate Name': c.name,
        'Status': statusNameMap[c.sub_status_id || ''] || 'New Applicant',
        'Job Title': formatValue(c.job_title),
        'Client': formatValue(c.client_name),
        'Applied': formatDate(c.created_at),
        'CCTC (INR)': formatCurrency(c.current_salary),
        'ECTC (INR)': formatCurrency(c.expected_salary),
        'Notice Period': formatValue(c.notice_period),
        'Location': formatValue(c.location)
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `my_submissions_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('My Submissions Report', 14, 20);
    const tableData = filteredCandidates.map(c => [
        formatValue(c.overall_score),
        c.name,
        statusNameMap[c.sub_status_id || ''] || 'New Applicant',
        formatValue(c.job_title),
        formatValue(c.client_name),
        formatDate(c.created_at),
        formatCurrency(c.current_salary),
        formatCurrency(c.expected_salary),
        formatValue(c.notice_period),
        formatValue(c.location)
    ]);
    (doc as any).autoTable({
        head: [['AI Score', 'Candidate Name', 'Status', 'Job Title', 'Client', 'Applied', 'CCTC (INR)', 'ECTC (INR)', 'Notice Period', 'Location']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [123, 67, 241] }
    });
    doc.save(`my_submissions_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleGroup = (statusName: string) => {
    setExpandedGroups(prev => prev.includes(statusName) ? prev.filter(g => g !== statusName) : [...prev, statusName]);
  };

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

const handleStatusFilterChange = (statusName: string, checked: boolean) => {
  setTempStatusFilter(prev => {
    if (checked) {
      return [...prev, statusName];
    } else {
      return prev.filter(s => s !== statusName);
    }
  });
};
 const handleClientFilterChange = (clientName: string, checked: boolean) => {
  setTempClientFilter(prev => checked ? [...prev, clientName] : prev.filter(c => c !== clientName));
};
const handleRecruiterFilterChange = (recruiterName: string, checked: boolean) => {
  setTempRecruiterFilter(prev => checked ? [...prev, recruiterName] : prev.filter(r => r !== recruiterName));
};
 if ((isLoading && candidates.length === 0 && !error) || isDepartmentLoading) {
    return ( <div className="flex h-screen items-center justify-center"> <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" /> </div> );
  }
  if (error) {
    return ( <div className="p-8"> <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /> <AlertDescription>{error}</AlertDescription> </Alert> </div> );
  }

const getStatusBadgeClass = (statusName: string | null | undefined): string => {
  if (!statusName) {
    return 'bg-gray-100 text-gray-800';
  }

  const colorToClassMap: { [key: string]: string } = {
    '#F87171': 'bg-red-100 text-red-800',
    '#F472B6': 'bg-pink-100 text-pink-800',
    '#A3E635': 'bg-lime-100 text-lime-800',
    '#60A5FA': 'bg-blue-100 text-blue-800',
    '#2DD4BF': 'bg-teal-100 text-teal-800',
    '#818CF8': 'bg-indigo-100 text-indigo-800',
    '#FBBF24': 'bg-amber-100 text-amber-800',
    '#A78BFA': 'bg-purple-100 text-purple-800',
    '#F97316': 'bg-orange-100 text-orange-800',
  };
  
  const hexColor = statusColorMap[statusName];
  return colorToClassMap[hexColor] || 'bg-gray-100 text-gray-800';
};

return (
      <TooltipProvider>
        <div className="w-full h-full animate-fade-in overflow-x-hidden">
          <main className="w-full space-y-8">
            {/* Header and KPI Cards - No changes needed here */}
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">My Submissions</h1>
              <p className="text-sm text-gray-500 mt-1">Track the status and progress of all candidates you have submitted.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-xl"> <CardContent className="p-5"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-1">Total Candidates</p> <h3 className="text-2xl font-bold text-gray-800">{totalCandidates}</h3> </div> <div className="bg-purple-100 p-3 rounded-full"> <Sigma size={20} className="text-purple-600" /> </div> </div> </CardContent> </Card>
              <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-xl"> <CardContent className="p-5"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-1">Peak Status</p> <h3 className="text-2xl font-bold text-gray-800 truncate" title={peakStatus.name}>{peakStatus.name}</h3> </div> <div className="bg-green-100 p-3 rounded-full"> <ArrowUp size={20} className="text-green-600" /> </div> </div> </CardContent> </Card>
              <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-xl"> <CardContent className="p-5"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-1">Average / Status</p> <h3 className="text-2xl font-bold text-gray-800">{averageCandidates}</h3> </div> <div className="bg-blue-100 p-3 rounded-full"> <Activity size={20} className="text-blue-600" /> </div> </div> </CardContent> </Card>
              <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-xl"> <CardContent className="p-5"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-1">Top Status</p> <h3 className="text-2xl font-bold text-gray-800 truncate" title={topStatus.name}>{topStatus.name}</h3> </div> <div className="bg-teal-100 p-3 rounded-full"> <TrendingUp size={20} className="text-teal-600" /> </div> </div> </CardContent> </Card>
            </div>

            <Card className="shadow-xl border-none bg-white transition-all duration-300 hover:shadow-2xl">
    <CardContent className="p-6">
<div className="relative z-10">
  <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
    {/* Date Range */}
    <div className="flex-shrink-0 order-5 w-full sm:w-auto min-w-0 overflow-hidden">
      <EnhancedDateRangeSelector 
        value={dateRange} 
        onChange={setDateRange} 
      />
    </div>

    {/* Status Filter */}
    <div className="flex-shrink-0 order-2 w-full sm:w-[150px] min-w-0 overflow-hidden">
      <DropdownMenu
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setTempStatusFilter(statusFilter);
          }
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className="group w-full rounded-full justify-start h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500 shadow-inner text-sm relative z-0">
                <Tag size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                <div className="truncate min-w-0">
                  {statusFilter.length === 0
                    ? "All Statuses"
                    : statusFilter.length === 1
                    ? statusFilter[0]
                    : `${statusFilter.length} statuses selected`}
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {statusFilter.length > 1 && (
            <TooltipContent side="bottom" align="start" className="z-[70]">
              <div className="p-1">
                <h4 className="font-semibold mb-2 text-center">Selected Statuses</h4>
                <ul className="list-disc list-inside space-y-1 max-w-48">
                  {statusFilter.map((status) => (
                    <li key={status}>{status}</li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent className="w-60 max-h-96 z-[60] flex flex-col origin-top">
          <div className="overflow-y-auto">
            <DropdownMenuCheckboxItem
              checked={tempStatusFilter.length === 0}
              onCheckedChange={() => setTempStatusFilter([])}
              onSelect={(e) => e.preventDefault()}
            >
              All Statuses
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {groupedStatusOptions.map((group) => (
              <React.Fragment key={group.mainStatus}>
                <DropdownMenuLabel>{group.mainStatus}</DropdownMenuLabel>
                {group.subStatuses.map((subStatus) => (
                  <DropdownMenuCheckboxItem
                    key={subStatus}
                    checked={tempStatusFilter.includes(subStatus)}
                    onCheckedChange={(checked) => handleStatusFilterChange(subStatus, checked)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {subStatus}
                  </DropdownMenuCheckboxItem>
                ))}
              </React.Fragment>
            ))}
          </div>
          <DropdownMenuSeparator />
          <div className="p-2 border-t">
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => {
                setStatusFilter(tempStatusFilter);
              }}
            >
              Apply Filter
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {/* Client Filter */}
    <div className="flex-shrink-0 order-3 w-full sm:w-[150px] min-w-0 overflow-hidden">
      <DropdownMenu onOpenChange={(isOpen) => { if (isOpen) { setTempClientFilter(clientFilter); } }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className="group w-full rounded-full justify-start font-normal h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500 shadow-inner text-sm relative z-0">
                <Building size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                <div className="truncate min-w-0">
                  {clientFilter.length === 0 ? "All Clients" : `${clientFilter.length} clients selected`}
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {clientFilter.length > 1 && (
            <TooltipContent side="bottom" align="start" className="z-[70]">
              <p className="max-w-48">Selected: {clientFilter.join(', ')}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent className="w-64 max-h-96 z-[60] flex flex-col origin-top">
          <div className="overflow-y-auto">
            <DropdownMenuCheckboxItem
              checked={tempClientFilter.length === 0}
              onCheckedChange={() => setTempClientFilter([])}
              onSelect={(e) => e.preventDefault()}
            >
              All Clients
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {clientOptions.map(client => (
              <DropdownMenuCheckboxItem
                key={client}
                checked={tempClientFilter.includes(client)}
                onCheckedChange={(checked) => handleClientFilterChange(client, !!checked)}
                onSelect={(e) => e.preventDefault()}
              >
                {client}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <div className="p-2 border-t">
            <Button className="w-full" size="sm" onClick={() => setClientFilter(tempClientFilter)}>
              Apply Filter
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {/* Search Bar */}
    <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
      <Input 
        placeholder="Search name, job, client..." 
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
      className="flex-shrink-0 order-6 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500"
    >
      {isGrouped ? <List className="mr-2 h-4 w-4" /> : <Layers className="mr-2 h-4 w-4" />} 
      {isGrouped ? 'Ungroup' : 'Group by Status'}
    </Button>

    {/* Export Buttons */}
    <div className="flex gap-2 flex-shrink-0 order-7">
      <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500">
        <Download className="w-4 h-4 mr-2" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500">
        <Download className="w-4 h-4 mr-2" /> Export PDF
      </Button>
    </div>
  </div>
</div>



            {/* NEW ANIMATED LIST CONTAINER */}
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
                {/* MODIFIED HEADER */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50/70 border-b border-gray-200">
                    <div className="col-span-1 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">AI Score</div>
                    <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Applied On</div>
                    <div className="col-span-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate</div>
                    <div className="col-span-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Job Title</div>
                    <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</div>
                </div>

                {/* List of Animated Rows */}
                <div className="divide-y divide-gray-200">
                    {paginatedData.length > 0 ? (
                        paginatedData.map((row) => {
                            if (row.type === 'header') {
                                return (
                                    <div key={row.statusName} className="flex items-center gap-2 p-3 bg-gray-100 sticky top-0 z-10">
                                      <Button variant="ghost" size="sm" onClick={() => toggleGroup(row.statusName!)} className="p-0 h-6 w-6">
                                        {expandedGroups.includes(row.statusName!) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                      </Button>
                                      <h3 className="font-bold text-gray-700">{row.statusName}</h3>
                                      <Badge variant="secondary">{row.count}</Badge>
                                    </div>
                                );
                            }
                            
                            const { candidate, statusName } = row;
                            if (!candidate) return null;

                            

                            const createdAtDate = new Date(candidate.created_at);
                            const formattedDate = isValid(createdAtDate) ? format(createdAtDate, 'dd MMM yyyy') : 'N/A';
                            const relativeDate = isValid(createdAtDate) ? `(${formatDistanceToNow(createdAtDate, { addSuffix: true })})` : '';

                            return (
                                <div key={candidate.id} className="grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-3 p-4 items-center transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-px hover:bg-gray-50/50">
                                    
                                    {/* AI Score */}
                                    <div className="col-span-1 flex lg:justify-center items-center">
                                        <div style={getScoreStyles(candidate.overall_score)} className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                                            {formatValue(candidate.overall_score)}
                                        </div>
                                    </div>

                                    {/* NEW Applied On Column */}
                                 <div className="col-span-full lg:col-span-2">
    <div className="flex items-center gap-2 text-sm text-gray-700">
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0"/>
        <span>{formattedDate}</span>
        <span className="text-xs text-gray-500">{relativeDate}</span>
    </div>
</div>
                                    
                                    {/* Candidate */}
<div className="col-span-full lg:col-span-3">
    <Link to={ candidate!.job_id ? `/employee/${candidate!.id}/${candidate!.job_id}` : `/jobs/unassigned/candidate/${candidate!.id}/bgv` } className="font-semibold text-indigo-600 hover:underline truncate" title={candidate.name}>
        {candidate.name}
    </Link>
    {/* MODIFIED: Added min-w-0 to the flex container to allow shrinking */}
    <div className="flex items-center gap-2 mt-2 flex-nowrap min-w-0">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 whitespace-nowrap truncate">
            <span className="text-purple-800 font-semibold mr-1">CCTC:</span>
            <span className="text-gray-800">{formatCurrency(candidate.current_salary)}</span>
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 whitespace-nowrap truncate">
            <span className="text-purple-800 font-semibold mr-1">ECTC:</span>
            <span className="text-gray-800">{formatCurrency(candidate.expected_salary)}</span>
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 whitespace-nowrap truncate">
            <span className="text-purple-800 font-semibold mr-1">Notice:</span>
            <span className="text-gray-800">{formatValue(candidate.notice_period)}</span>
        </span>
    </div>
</div>                         {/* Job Title - MODIFIED */}
                                 {/* Job Title - MODIFIED WITH CLIENT NAME */}
<div className="col-span-full lg:col-span-4">
  <Link to={`/jobs/${candidate!.job_id}`} className="text-indigo-600 hover:underline hover:text-indigo-800" >
    <p className="font-semibold text-gray-800">{candidate.job_title}</p>
    </Link>
    <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* This span displays the Client Name */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">{candidate.client_name}</span>
        
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ">{candidate.display_job_id}</span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{candidate.job_type}</span>
    </div>
</div>

                                    {/* Status */}
                                    <div className="col-span-full lg:col-span-2">
                                        <Badge className={`rounded-full px-3 py-1 text-xs ${getStatusBadgeClass(statusName)}`}>{statusName}</Badge>
                                    </div>

                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-gray-500">
                            No data found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
            
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="w-[70px] h-10 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
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
      </TooltipProvider>
  );
};
  
export default MySubmissionsReport;