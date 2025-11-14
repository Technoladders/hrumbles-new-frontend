import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, Download, ChevronLeft, ChevronRight, User, CheckCircle } from 'lucide-react';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { supabase } from '@/integrations/supabase/client';
import { format as formatDateFns, startOfDay, endOfDay } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// Type definitions
interface Employee {
  id: string;
  name: string;
}
interface ActivityData {
  employeeId: string;
  employeeName: string;
  active: number;
  inactive: number;
  away: number;
  total: number;
}

// Helper to format seconds into HH:MM:SS
const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  return new Date(Number(seconds) * 1000).toISOString().substr(11, 8);
};

const UserActivityReportPage: React.FC = () => {
  const navigate = useNavigate();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [processedData, setProcessedData] = useState<ActivityData[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfDay(new Date(new Date().setDate(new Date().getDate() - 7))),
    endDate: endOfDay(new Date()),
  });
 
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployees, searchTerm]);

  // Fetch employees for the filter dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error: empError } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .eq('organization_id', organization_id)
          .order('first_name');
        if (empError) throw empError;
        setAllEmployees(data.map(emp => ({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch employees.');
      }
    };
    fetchEmployees();
  }, []);

  // Main data fetching logic
  useEffect(() => {
    const fetchData = async () => {
      // Use dateRange for fetching
      if (!dateRange.startDate || !dateRange.endDate) return;
     
      setIsLoading(true);
      setError(null);
      setCurrentPage(1);
     
      try {
        const { data, error: rpcError } = await supabase
          .rpc('get_user_activity_summary', {
            start_date: dateRange.startDate.toISOString(),
            end_date: dateRange.endDate.toISOString()
          });
        if (rpcError) throw rpcError;
        const transformedData: ActivityData[] = data.map((d: any) => ({
          employeeId: d.employee_id,
          employeeName: d.employee_name,
          active: d.active_seconds,
          inactive: d.inactive_seconds,
          away: d.away_seconds,
          total: d.total_seconds
        }));
        setProcessedData(transformedData);
      
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        setProcessedData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]); // <-- Trigger fetch only when dateRange changes

  const filteredTableData = useMemo(() => {
    return processedData.filter(row => {
        const searchMatch = row.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
        const employeeMatch = selectedEmployees.length === 0 || selectedEmployees.includes(row.employeeId);
        return searchMatch && employeeMatch;
    });
  }, [processedData, searchTerm, selectedEmployees]);

  // Summary card calculations
  const totalActive = filteredTableData.reduce((sum, item) => sum + item.active, 0);
  const totalInactive = filteredTableData.reduce((sum, item) => sum + item.inactive, 0);
  const totalAway = filteredTableData.reduce((sum, item) => sum + item.away, 0);
  const totalOverall = totalActive + totalInactive + totalAway;
 
  // Pagination
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
  const paginatedData = filteredTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Export functions
  const exportToCSV = () => {
    const csvData = paginatedData.map(d => ({
      'Employee Name': d.employeeName,
      'Active Time': formatDuration(d.active),
      'Inactive Time': formatDuration(d.inactive),
      'Away Time': formatDuration(d.away),
      'Total Time': formatDuration(d.total)
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user_activity_report_${formatDateFns(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('User Activity Report', 14, 20);
    (doc as any).autoTable({
        head: [['Employee Name', 'Active Time', 'Inactive Time', 'Away Time', 'Total Time']],
        body: paginatedData.map(d => [d.employeeName, formatDuration(d.active), formatDuration(d.inactive), formatDuration(d.away), formatDuration(d.total)]),
        startY: 30,
    });
    doc.save(`user_activity_report_${formatDateFns(new Date(), 'yyyy-MM-dd')}.pdf`);
  };
 
  const handleEmployeeClick = (employeeId: string) => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    const from = formatDateFns(dateRange.startDate, 'yyyy-MM-dd');
    const to = formatDateFns(dateRange.endDate, 'yyyy-MM-dd');
    navigate(`/user-activity-details/${employeeId}?from=${from}&to=${to}`);
  };

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="w-full h-full animate-fade-in overflow-x-hidden">
        <main className="w-full space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">User Activity Report</h1>
            <p className="text-sm text-gray-500 mt-1">Analyze user presence and engagement within the application.</p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader><CardTitle>Total Active Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatDuration(totalActive)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Total Inactive Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-500">{formatDuration(totalInactive)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Total Away Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-gray-500">{formatDuration(totalAway)}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Overall Tracked Time</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatDuration(totalOverall)}</div></CardContent></Card>
          </div>

          {/* Filter Bar and Table */}
          <Card>
            <CardContent className="p-6">
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Date Range */}
  <div className="flex-shrink-0 order-1 w-full sm:w-auto">
    <EnhancedDateRangeSelector
      value={dateRange}
      onChange={setDateRange}
    />
  </div>

  {/* Filter Employees */}
  <div className="flex-shrink-0 order-2 w-full sm:w-auto">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm justify-start text-left font-normal gap-2">
          <User className="h-4 w-4" />
          <span>{selectedEmployees.length > 0 ? `${selectedEmployees.length} Employees Selected` : 'Filter Employees'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployees([])}>Deselect All</Button>
          {allEmployees.map(e => (
            <Label key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
              <Checkbox 
                checked={selectedEmployees.includes(e.id)} 
                onCheckedChange={() => setSelectedEmployees(p => p.includes(e.id) ? p.filter(id => id !== e.id) : [...p, e.id])}
              />
              {e.name}
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  </div>

  {/* Search Bar */}
  <div className="relative flex-grow order-3 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search
      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      size={18}
    />
    <Input
      placeholder="Search employees..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={e => { setSearchTerm(e.target.value); }}
    />
  </div>

  {/* Export Buttons */}
  <div className="flex gap-2 flex-shrink-0 order-4">
    <Button variant="outline" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      CSV
    </Button>
    <Button variant="outline" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      PDF
    </Button>
  </div>
</div>
              {isLoading ? <div className="flex justify-center p-12"><LoadingSpinner size={48} /></div> : (
                <>
                  <div className="rounded-md border"><Table>
                    <TableHeader><TableRow><TableHead>Employee Name</TableHead><TableHead>Active</TableHead><TableHead>Inactive</TableHead><TableHead>Away</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {paginatedData.length > 0 ? paginatedData.map(row => (
                        <TableRow key={row.employeeId}>
                          <TableCell className="font-medium">
                            <span
                              className="cursor-pointer text-blue-600 hover:underline"
                              onClick={() => handleEmployeeClick(row.employeeId)}
                            >
                              {row.employeeName}
                            </span>
                          </TableCell>
                          <TableCell className="text-green-700">{formatDuration(row.active)}</TableCell>
                          <TableCell className="text-gray-600">{formatDuration(row.inactive)}</TableCell>
                          <TableCell className="text-orange-600">{formatDuration(row.away)}</TableCell>
                          <TableCell className="font-bold">{formatDuration(row.total)}</TableCell>
                        </TableRow>
                      )) : (<TableRow><TableCell colSpan={5} className="h-24 text-center">No data found for the selected filters.</TableCell></TableRow>)}
                    </TableBody>
                  </Table></div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
    </div>
  );
};

export default UserActivityReportPage;