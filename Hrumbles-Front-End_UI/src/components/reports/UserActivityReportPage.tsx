import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, Search, Download, ChevronLeft, ChevronRight, User, CheckCircle, MonitorPlay, Coffee, Clock, Sigma } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePickerField } from './DateRangePickerField'; // Assuming this component exists
import { supabase } from '@/integrations/supabase/client';
import { format as formatDateFns, differenceInDays } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  return new Date(seconds * 1000).toISOString().substr(11, 8);
};

const UserActivityReportPage: React.FC = () => {
  const [rawData, setRawData] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [draftDateRange, setDraftDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch employees for the filter dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .order('first_name');
        if (error) throw error;
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
      if (!appliedDateRange?.from || !appliedDateRange?.to) return;
      setIsLoading(true);
      setError(null);
      try {
        // We fetch raw data and aggregate on the client. For very large datasets,
        // a dedicated database function would be even better.
        let query = supabase
          .from('user_session_activity')
          .select('user_id, activity_type, duration_seconds, employee:hr_employees!user_session_activity_user_id_fkey1(id, first_name, last_name)')
          .gte('start_time', appliedDateRange.from.toISOString())
          .lte('end_time', appliedDateRange.to.toISOString());

        if (selectedEmployees.length > 0) {
          query = query.in('user_id', selectedEmployees);
        }

        const { data, error: dataError } = await query;
        if (dataError) throw dataError;
        setRawData(data.filter(d => d.employee)); // Ensure employee data exists
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred while fetching activity data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appliedDateRange, selectedEmployees]);

  // Process raw data into a structured format for the table
  const processedData = useMemo<ActivityData[]>(() => {
    const aggregation: Record<string, Omit<ActivityData, 'employeeId'>> = {};

    for (const record of rawData) {
      const { user_id, employee, activity_type, duration_seconds } = record;
      
      if (!aggregation[user_id]) {
        aggregation[user_id] = {
          employeeName: `${employee.first_name} ${employee.last_name}`,
          active: 0,
          inactive: 0,
          away: 0,
          total: 0
        };
      }

      aggregation[user_id][activity_type] = (aggregation[user_id][activity_type] || 0) + duration_seconds;
      aggregation[user_id].total += duration_seconds;
    }

    return Object.entries(aggregation).map(([employeeId, data]) => ({
      employeeId,
      ...data
    }));
  }, [rawData]);

  const filteredTableData = useMemo(() =>
    processedData.filter(row =>
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [processedData, searchTerm]);

  // Summary card calculations
  const totalActive = filteredTableData.reduce((sum, item) => sum + item.active, 0);
  const totalInactive = filteredTableData.reduce((sum, item) => sum + item.inactive, 0);
  const totalAway = filteredTableData.reduce((sum, item) => sum + item.away, 0);
  const totalOverall = totalActive + totalInactive + totalAway;

  const handleApplyFilters = () => {
    setAppliedDateRange(draftDateRange);
    setCurrentPage(1);
  };
  
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

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
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
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <DateRangePickerField dateRange={draftDateRange} onDateRangeChange={setDraftDateRange} className="h-10" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal gap-2">
                        <User className="h-4 w-4" />
                        <span>{selectedEmployees.length > 0 ? `${selectedEmployees.length} Employees Selected` : 'Filter Employees'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2"><div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmployees([])}>Deselect All</Button>
                    {allEmployees.map(e => (<Label key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                      <Checkbox checked={selectedEmployees.includes(e.id)} onCheckedChange={() => setSelectedEmployees(p => p.includes(e.id) ? p.filter(id => id !== e.id) : [...p, e.id])}/>{e.name}
                    </Label>))}
                  </div></PopoverContent>
                </Popover>
                <Button onClick={handleApplyFilters}><CheckCircle className="h-4 w-4 mr-2" />Apply Filters</Button>
                <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><Input placeholder="Search employees..." className="pl-10 h-10" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}/></div>
                <Button variant="outline" onClick={exportToCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
                <Button variant="outline" onClick={exportToPDF}><Download className="w-4 h-4 mr-2" />Export PDF</Button>
            </div>
            {isLoading ? <div className="flex justify-center p-12"><LoadingSpinner size={48} /></div> : (
              <>
                <div className="rounded-md border"><Table>
                  <TableHeader><TableRow><TableHead>Employee Name</TableHead><TableHead>Active</TableHead><TableHead>Inactive</TableHead><TableHead>Away</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? paginatedData.map(row => (
                      <TableRow key={row.employeeId}>
                        <TableCell className="font-medium">{row.employeeName}</TableCell>
                        <TableCell>{formatDuration(row.active)}</TableCell>
                        <TableCell>{formatDuration(row.inactive)}</TableCell>
                        <TableCell>{formatDuration(row.away)}</TableCell>
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
     
    </div>
  );
};

export default UserActivityReportPage;