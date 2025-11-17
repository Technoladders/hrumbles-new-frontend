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
import { format, isValid } from 'date-fns';
import { AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight, Sigma, ArrowUp, Activity, TrendingUp, CheckCircle, Tag, Building, User } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList,
} from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Candidate as OriginalCandidate } from '@/lib/types';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

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

// --- Color map from previous request ---
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
  // Adding colors from the latest screenshot to ensure coverage
  'End Client Round': '#F97316',   // Orange
  'L1': '#F97316',                 // Orange
  'L2': '#F97316',                 // Orange
  'Technical Assessment': '#FBBF24', // Amber/Yellow
};
const defaultColor = '#9CA3AF'; // Default gray for any unmapped status


// --- Helper Functions (No changes here) ---
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


// --- Tooltip (No changes here) ---
const CustomFunnelTooltip = (props: any) => {
  const { active, payload, label, barDefinitions } = props;

  if (active && payload && payload.length) {
    const currentRowData = payload[0].payload;
    const activeBars = barDefinitions.filter((bar: any) => (currentRowData[bar.key] || 0) > 0);

    return (
      <div className="p-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg animate-fade-in">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1.5">
          {activeBars.map((bar: any, index: number) => {
            const value = currentRowData[bar.key];
            const displayName = (label === 'Joined') ? 'Joined' : bar.name;

            return (
              <div key={index} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-sm mr-2"
                  style={{ backgroundColor: bar.color }}
                />
                <span className="text-gray-600">{`${displayName}: `}</span>
                <span className="font-semibold text-gray-800">{value}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between font-bold text-gray-900">
          <span>Total:</span>
          <span>{currentRowData.total}</span>
        </div>
      </div>
    );
  }
  return null;
};


// --- Main Component ---
const ConsolidatedStatusReport: React.FC = () => {
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
            job:hr_jobs!hr_job_candidates_job_id_fkey(title, client_details), 
            recruiter:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name)
        `;
        let candidatesQuery = supabase
          .from('hr_job_candidates')
          .select(selectFields)
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (isRestrictedView && user?.id) {
            candidatesQuery = candidatesQuery.eq('created_by', user.id);
        }

        const [candidatesResponse, statusesResponse] = await Promise.all([
          candidatesQuery,
          supabase.from('job_statuses').select('id, name, type, parent_id, color, display_order').eq('organization_id', organizationId),
        ]);

        if (candidatesResponse.error) throw candidatesResponse.error;
        if (statusesResponse.error) throw statusesResponse.error;
        
const formattedCandidates: Candidate[] = candidatesResponse.data.map((c: any) => {
    // Helper function to safely combine date and time strings
    const combineDateTime = (dateStr: string, timeStr: string): string | null => {
        if (!dateStr || !timeStr) return null;
        const combined = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(combined.getTime())) return null;
        return combined.toISOString();
    };

    const scheduleDateTime = combineDateTime(c.interview_date, c.interview_time);

    // --- NEW: Safely access metadata from the JSONB field ---
    const metadata = c.metadata || {};

    return {
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
        
        // --- UPDATED LOGIC: Use top-level value OR fallback to metadata value ---
        current_salary: c.current_salary ?? metadata.currentSalary,
        expected_salary: c.expected_salary ?? metadata.expectedSalary,
        location: c.location ?? metadata.currentLocation,
        notice_period: c.notice_period ?? metadata.noticePeriod,

        overall_score: c.overall_score,
        schedule_date_time: scheduleDateTime,
        rejection_reason: c.interview_feedback,
    };
});


        setCandidates(formattedCandidates);

        // ... rest of the logic is unchanged ...
        const allStatuses = statusesResponse.data || [];
        const nameMap = allStatuses.reduce((acc: StatusMap, status) => { acc[status.id] = status.name; return acc; }, {});
        setStatusNameMap(nameMap);
        const mains = allStatuses.filter(s => s.type === 'main').sort((a, b) => a.display_order - b.display_order);
        const subs = allStatuses.filter(s => s.type === 'sub');
        setMainStatuses(mains);
        setSubStatuses(subs);


        // --- NEW LOGIC: Create grouped and ordered structure for the filter ---
        const groupedOptions: GroupedStatusOption[] = mains.map(mainStatus => {
            const children = subs
                .filter(sub => sub.parent_id === mainStatus.id)
                .sort((a, b) => a.display_order - b.display_order)
                .map(child => child.name);
            return { mainStatus: mainStatus.name, subStatuses: children };
        }).filter(group => group.subStatuses.length > 0); // Only include groups that have sub-statuses
        setGroupedStatusOptions(groupedOptions);
        // --- END OF NEW LOGIC ---

                // --- NEW LOGIC TO CREATE ORDERED STATUS LIST FOR FILTER ---
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
        // --- END OF NEW LOGIC ---



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
    
    // ADD THIS SEARCH LOGIC
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

  const dynamicChartConfig = useMemo(() => {
    if (mainStatuses.length === 0) {
      return { barDefinitions: [], funnelData: [] };
    }

    const barDefinitions = subStatuses.map(sub => ({
      key: sub.name.replace(/\s+/g, ''),
      name: sub.name,
      color: statusColorMap[sub.name] || sub.color || defaultColor, 
      parent_id: sub.parent_id,
    }));

    const subToMainIdMap = new Map(subStatuses.map(s => [s.id, s.parent_id]));
    
    const dataTemplate = new Map(mainStatuses.map(main => [main.id, {
        name: main.name,
        total: 0,
        ...barDefinitions.reduce((acc, bar) => ({ ...acc, [bar.key]: 0 }), {})
    }]));

    filteredCandidates.forEach(candidate => {
        const subStatusId = candidate.sub_status_id;
        const mainStatusId = candidate.main_status_id || (subStatusId ? subToMainIdMap.get(subStatusId) : null);
        if (mainStatusId && dataTemplate.has(mainStatusId)) {
            const entry = dataTemplate.get(mainStatusId)!;
            const subStatusName = statusNameMap[subStatusId || ''] || 'New Applicant';
            const subStatusKey = subStatusName.replace(/\s+/g, '');
            if (entry.hasOwnProperty(subStatusKey)) {
                entry[subStatusKey]++;
                entry.total++;
            }
        }
    });

    const funnelData = Array.from(dataTemplate.values());
    
    funnelData.forEach((row: any) => {
        const orderedKeys = barDefinitions.map(b => b.key);
        const lastVisibleKey = [...orderedKeys].reverse().find(key => row[key] > 0);
        if (lastVisibleKey) {
            row.lastKey = lastVisibleKey;
        }
    });

    return { barDefinitions, funnelData };
  }, [mainStatuses, subStatuses, filteredCandidates, statusNameMap]);


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
    const dataForExport = filteredCandidates.map(c => ({ 'Candidate Name': c.name, 'Status': statusNameMap[c.sub_status_id || ''] || 'New Applicant', 'AI Score': formatValue(c.overall_score), 'Job Title': formatValue(c.job_title), 'Client': formatValue(c.client_name), 'Recruiter': formatValue(c.recruiter_name), 'Applied': formatDate(c.created_at), 'CCTC (INR)': formatCurrency(c.current_salary), 'ECTC (INR)': formatCurrency(c.expected_salary), 'Notice Period': formatValue(c.notice_period), 'Location': formatValue(c.location) }));
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
    const tableData = filteredCandidates.map(c => [ c.name, statusNameMap[c.sub_status_id || ''] || 'New Applicant', formatValue(c.overall_score), formatValue(c.job_title), formatValue(c.client_name), formatValue(c.recruiter_name), formatDate(c.created_at), formatCurrency(c.current_salary), formatCurrency(c.expected_salary), formatValue(c.notice_period), formatValue(c.location) ]);
    (doc as any).autoTable({ head: [['Candidate Name', 'Status', 'AI Score', 'Job Title', 'Client', 'Recruiter', 'Applied', 'CCTC (INR)', 'ECTC (INR)', 'Notice Period', 'Location']], body: tableData, startY: 30, theme: 'grid', styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [123, 67, 241] } });
    doc.save(`consolidated_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleGroup = (statusName: string) => {
    setExpandedGroups(prev => prev.includes(statusName) ? prev.filter(g => g !== statusName) : [...prev, statusName]);
  };

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

// --- After (Modified Code) ---

// This function now dynamically calculates the axis based on the data.
const generateAxisTicks = (data: any[], step: number) => {
  const maxTotalInData = Math.max(...data.map(d => d.total), 0);
  
  // If there's no data, default to a small range.
  if (maxTotalInData === 0) {
    const defaultMax = 40;
    const defaultTicks = [];
    for (let i = 0; i <= defaultMax; i += 10) {
      defaultTicks.push(i);
    }
    return { domain: [0, defaultMax], ticks: defaultTicks };
  }

  // Add a small buffer to the max value to prevent the bar from touching the edge,
  // then round up to the nearest 'step' to keep the axis clean.
  const axisTopValue = Math.ceil((maxTotalInData + (step / 4)) / step) * step;
  
  const ticks = [];
  for (let i = 0; i <= axisTopValue; i += step) {
    ticks.push(i);
  }
  return { domain: [0, axisTopValue], ticks };
};


  // // --- NEW: Handler for the multi-select dropdown ---
  // const handleStatusFilterChange = (statusName: string, checked: boolean) => {
  //   setStatusFilter(prev => {
  //       if (checked) {
  //           // Add status to the filter array if it's not already there
  //           return [...prev, statusName];
  //       } else {
  //           // Remove status from the filter array
  //           return prev.filter(s => s !== statusName);
  //       }
  //   });
  // };

// Updated the function call to remove the hardcoded '200'
const { domain: axisDomain, ticks: axisTicks } = generateAxisTicks(dynamicChartConfig.funnelData, 20);


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
    return 'bg-gray-100 text-gray-800'; // Default for undefined status
  }

  // A map to convert your hex colors to Tailwind background/text color classes
  const colorToClassMap: { [key: string]: string } = {
    '#F87171': 'bg-red-100 text-red-800',         // New Applicants
    '#F472B6': 'bg-pink-100 text-pink-800',       // Client Reject, Internal Reject, HR Round
    '#A3E635': 'bg-lime-100 text-lime-800',       // Duplicate (Internal), Sourced
    '#60A5FA': 'bg-blue-100 text-blue-800',       // Internal Hold, Processed (Internal), L1 Interview
    '#2DD4BF': 'bg-teal-100 text-teal-800',       // Processed (Client)
    '#818CF8': 'bg-indigo-100 text-indigo-800',   // L2 Interview
    '#FBBF24': 'bg-amber-100 text-amber-800',     // Offered, Technical Assessment
    '#A78BFA': 'bg-purple-100 text-purple-800',   // Joined
    '#F97316': 'bg-orange-100 text-orange-800',   // End Client Round, L1, L2
  };
  
  const hexColor = statusColorMap[statusName];
  return colorToClassMap[hexColor] || 'bg-gray-100 text-gray-800'; // Default gray
};

console.log("return data", paginatedData)

  return (
      <TooltipProvider>
    {/* 1. Changed w-screen/min-h-screen to w-full and h-full */}
{/* 2. Removed padding (p-6 md:p-10) because MainLayout already has p={6} */}
{/* 3. Removed bg-gradient because MainLayout handles background */}
<div className="w-full h-full animate-fade-in overflow-x-hidden">
      <main className="w-full space-y-8">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Consolidated Candidate Status Report</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze candidate distribution by status within the selected period.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl"> <CardContent className="p-6 flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-2">Total Candidates</p> <h3 className="text-2xl font-bold text-gray-800">{totalCandidates}</h3> <p className="text-xs text-gray-500 mt-1">in selected period</p> </div> <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-full"> <Sigma size={24} className="text-white" /> </div> </CardContent> </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl"> <CardContent className="p-6 flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-2">Peak Status</p> <h3 className="text-2xl font-bold text-gray-800 truncate" title={peakStatus.name}>{peakStatus.name}</h3> <p className="text-xs text-gray-500.mount mt-1">{peakStatus.value} candidates</p> </div> <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full"> <ArrowUp size={24} className="text-white" /> </div> </CardContent> </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl"> <CardContent className="p-6 flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-2">Average Candidates</p> <h3 className="text-2xl font-bold text-gray-800">{averageCandidates}</h3> <p className="text-xs text-gray-500 mt-1">per status</p> </div> <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full"> <Activity size={24} className="text-white" /> </div> </CardContent> </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl"> <CardContent className="p-6 flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500 mb-2">Top Status</p> <h3 className="text-2xl font-bold text-gray-800 truncate" title={topStatus.name}>{topStatus.name}</h3> <p className="text-xs text-gray-500 mt-1">{topStatus.value} candidates</p> </div> <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full"> <TrendingUp size={24} className="text-white" /> </div> </CardContent> </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl lg:col-span-2">
            <CardHeader className="bg-gray-50 border-b p-4"> <CardTitle className="text-lg text-gray-800">Candidate per Status</CardTitle> </CardHeader>
            <CardContent className="p-6">
                <div className="h-[450px] w-full animate-fade-in">
                {isLoading ? ( <div className="flex h-full w-full items-center justify-center"> <LoadingSpinner size={60} /> </div>
                ) : dynamicChartConfig.funnelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicChartConfig.funnelData} layout="vertical" margin={{ top: 20, right: 50, left: 20, bottom: 20 }} >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={axisDomain} ticks={axisTicks} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#374151', fontWeight: 'bold' }} interval={0} />
                       <RechartsTooltip 
    cursor={{ fill: 'rgba(239, 246, 255, 0.7)' }} 
    content={<CustomFunnelTooltip barDefinitions={dynamicChartConfig.barDefinitions} />} 
/>
                         {dynamicChartConfig.barDefinitions.map(bar => (
      <Bar 
        key={bar.key} 
        dataKey={bar.key} 
        stackId="a" 
        name={bar.name} 
        fill={bar.color} 
        stroke="#fff" 
        strokeWidth={2} 
        radius={[0, 8, 8, 0]} 
      >
                            {/* --- THIS IS THE FIX --- */}
                            <LabelList dataKey={bar.key} position="center" fill="#fff" fontSize={12} fontWeight="bold" formatter={(value: number) => (value > 0 ? value : '')} />
                            
                            <LabelList dataKey="total" content={(props) => {
                                const { x, y, width, height, index, value } = props;
                                const currentRow = dynamicChartConfig.funnelData[index];
                                if (currentRow && currentRow.lastKey === bar.key && value > 0) {
                                    return ( <text x={Number(x) + Number(width) + 8} y={Number(y) + Number(height) / 2} dy={5} textAnchor="start" fill="#111827" fontSize={14} fontWeight="bold" > {value} </text> );
                                }
                                return null;
                                }}
                            />
                        </Bar>
                        ))}
                    </BarChart>
                    </ResponsiveContainer>
                ) : ( <div className="flex h-full w-full items-center justify-center"> <Alert className="w-auto bg-gray-50 border-gray-200"> <AlertCircle className="h-4 w-4 text-gray-500" /> <AlertDescription className="text-gray-600">No data for this period.</AlertDescription> </Alert> </div> )}
                </div>
            </CardContent>
            </Card>
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

    {/* Recruiter Filter */}
    {!isRestrictedView && (
      <div className="flex-shrink-0 order-4 w-full sm:w-[150px] min-w-0 overflow-hidden">
        <DropdownMenu onOpenChange={(isOpen) => { if (isOpen) { setTempRecruiterFilter(recruiterFilter); } }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className="group w-full rounded-full justify-start font-normal h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500 shadow-inner text-sm relative z-0">
                  <User size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                  <div className="truncate min-w-0">
                    {recruiterFilter.length === 0 ? "All Recruiters" : `${recruiterFilter.length} recruiters selected`}
                  </div>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {recruiterFilter.length > 1 && (
              <TooltipContent side="bottom" align="start" className="z-[70]">
                <p className="max-w-48">Selected: {recruiterFilter.join(', ')}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <DropdownMenuContent className="w-64 max-h-96 z-[60] flex flex-col origin-top">
            <div className="overflow-y-auto">
              <DropdownMenuCheckboxItem
                checked={tempRecruiterFilter.length === 0}
                onCheckedChange={() => setTempRecruiterFilter([])}
                onSelect={(e) => e.preventDefault()}
              >
                All Recruiters
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {recruiterOptions.map(recruiter => (
                <DropdownMenuCheckboxItem
                  key={recruiter}
                  checked={tempRecruiterFilter.includes(recruiter)}
                  onCheckedChange={(checked) => handleRecruiterFilterChange(recruiter, !!checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {recruiter}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <div className="p-2 border-t">
              <Button className="w-full" size="sm" onClick={() => setRecruiterFilter(tempRecruiterFilter)}>
                Apply Filter
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}

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
<div className="relative w-full rounded-lg border overflow-x-auto">
    <Table style={{ minWidth: '1600px' }}>
        <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="sticky left-0 bg-gray-50 z-20 font-medium text-gray-800 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[250px]">Candidate</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[220px]">Status</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[100px]">AI Score</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[250px]">Job Title</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[200px]">Client</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[200px]">Recruiter</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[120px]">Applied</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[120px]">CCTC</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[120px]">ECTC</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[100px]">Notice</TableHead>
                <TableHead className="text-left font-medium text-gray-500 px-4 py-3 min-w-[150px]">Location</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {paginatedData.length > 0 ? ( paginatedData.map((row) => {
                if (row.type === 'header') {
                    return ( 
                        <TableRow key={row.statusName} className="bg-gray-50 hover:bg-gray-100 transition"> 
                            {/* CHANGE: Added shadow to sticky header cell */}
                            <TableCell colSpan={11} className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"> 
                                <div className="flex items-center gap-2"> 
                                    <Button variant="ghost" size="sm" onClick={() => toggleGroup(row.statusName!)} className="p-0 h-6 w-6" > 
                                        {expandedGroups.includes(row.statusName!) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} 
                                    </Button> 
                                    {row.statusName} 
                                    <Badge variant="secondary">{row.count}</Badge> 
                                </div> 
                            </TableCell> 
                        </TableRow> 
                    );
                }
                const { candidate, statusName } = row;
                if (!candidate) return null;

                const scheduledTime = formatScheduleDateTime(candidate.schedule_date_time);
                const statusNameLower = statusName?.toLowerCase() || '';
                const showSchedule = scheduledTime && (statusNameLower.includes('interview') || statusNameLower.includes('round') || statusNameLower.includes('l1') || statusNameLower.includes('l2') || statusNameLower.includes('l3') || statusNameLower.includes('assessment') || statusNameLower.includes('reschedule')) && !statusNameLower.includes('rejected') && !statusNameLower.includes('selected') && !statusNameLower.includes('no show') && !statusNameLower.includes('hold');
                const showReason = candidate.rejection_reason && statusNameLower.includes('reject');

                return (
                    <TableRow key={candidate!.id} className="hover:bg-gray-50 transition group">
                        {/* CHANGE: Added group-hover:bg-gray-50 and shadow */}
                        <TableCell className="sticky left-0 bg-white group-hover:bg-gray-50 z-10 font-medium text-gray-800 px-4 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <Link to={ candidate!.job_id ? `/employee/${candidate!.id}/${candidate!.job_id}` : `/jobs/unassigned/candidate/${candidate!.id}/bgv` } className="text-indigo-600 hover:underline hover:text-indigo-800" >
                                {candidate!.name}
                            </Link>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                            <div>
                                <Badge className={getStatusBadgeClass(statusName)}>
                                    {statusName}
                                </Badge>
                                {showReason && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <p className="text-xs text-gray-500 mt-1 cursor-help truncate w-48">
                                                {candidate.rejection_reason}
                                            </p>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p>{candidate.rejection_reason}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {showSchedule && (
                                    <p className="text-xs text-gray-500 mt-1">{scheduledTime}</p>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">
                            <Badge className={getScoreBadgeClass(candidate!.overall_score)}>
                                {formatValue(candidate!.overall_score)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">
                            <Link to={`/jobs/${candidate!.job_id}`} className="text-indigo-600 hover:underline hover:text-indigo-800" >
                                {formatValue(candidate!.job_title)}
                            </Link>
                        </TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.client_name)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.recruiter_name)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatDate(candidate!.created_at)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatCurrency(candidate!.current_salary)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatCurrency(candidate!.expected_salary)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.notice_period)}</TableCell>
                        <TableCell className="text-gray-600 px-4 py-2">{formatValue(candidate!.location)}</TableCell>
                    </TableRow>
                );
            }) ) : ( <TableRow> <TableCell colSpan={11} className="h-24 text-center text-gray-500"> No data found matching your criteria. </TableCell> </TableRow> )}
        </TableBody>
    </Table>
</div>

      
        {totalPages > 1 && ( <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4"> <div className="flex items-center gap-2"> <span className="text-sm text-gray-600">Rows per page:</span> <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="w-[70px] h-10 border border-gray-200 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" > <option value="10">10</option> <option value="20">20</option> <option value="50">50</option> <option value="100">100</option> </select> </div> <div className="flex items-center gap-2"> <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} > <ChevronLeft className="h-4 w-4" /> </Button> <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span> <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} > <ChevronRight className="h-4 w-4" /> </Button> </div> <span className="text-sm text-gray-600"> Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, tableRows.length)} of {tableRows.length} </span> </div> )}
    </CardContent>
</Card>
      </main>
    </div>
    </TooltipProvider>
  );
};
  


export default ConsolidatedStatusReport;