import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, User, BarChart2, SlidersHorizontal, CheckCircle } from 'lucide-react';
import { DateRangePickerField } from './DateRangePickerField';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { debounce } from 'lodash';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// Define the types for our data
interface TalentProfile {
  id: string;
  created_at: string;
  recruiter_name: string;
  created_by: string;
}

interface Recruiter {
  id: string;
  name: string;
}

interface AggregatedData {
    recruiter_name: string;
    count: number;
    lastAdded: string; // Add lastAdded date
}

const TalentProfileReport: React.FC = () => {
    const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [reportData, setReportData] = useState<TalentProfile[]>([]);
  const [allRecruiters, setAllRecruiters] = useState<Recruiter[]>([]);
  const [totalProfileCount, setTotalProfileCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  // Use a draft and an applied state for the date range to control fetching
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
    key: 'selection',
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecruiters, setSelectedRecruiters] = useState<string[]>([]);
  
  // Function to apply filters and trigger data fetch
  const handleApplyFilters = () => {
    setAppliedDateRange(draftDateRange);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch total count of all profiles (all-time)
      const { count, error: countError } = await supabase
        .from('hr_talent_pool')
        .select('*', { count: 'exact', head: true });
      if (countError) throw countError;
      setTotalProfileCount(count ?? 0);

      // Fetch all employees to use as a filter
      const { data: employeesData, error: employeesError } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organizationId)
        .order('first_name');
      if (employeesError) throw employeesError;
      setAllRecruiters(employeesData.map((emp: any) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
      })));

    } catch (err: any) {
        setError(err.message || 'Failed to fetch initial data.');
    } finally {
        setIsLoading(false);
    }
  };

  const fetchDataForRange = async (from: Date, to: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: talentData, error: talentError } = await supabase
        .from('hr_talent_pool')
        .select(`id, created_at, created_by, hr_employees!hr_talent_pool_created_by_fkey (id, first_name, last_name)`)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      if (talentError) throw talentError;

      const formattedData: TalentProfile[] = talentData.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        created_by: item.created_by,
        recruiter_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}` : 'N/A',
      }));
      setReportData(formattedData);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch initial total counts and recruiter list on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch data only when appliedDateRange changes
  useEffect(() => {
    if (appliedDateRange.startDate && appliedDateRange.endDate) {
        fetchDataForRange(appliedDateRange.startDate, appliedDateRange.endDate);
    }
  }, [appliedDateRange]);

  const filteredRawData = useMemo(() => {
    return reportData.filter(profile => {
      const matchesRecruiter = selectedRecruiters.length === 0 || selectedRecruiters.includes(profile.created_by);
      const matchesSearch = searchTerm === '' || profile.recruiter_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRecruiter && matchesSearch;
    });
  }, [reportData, searchTerm, selectedRecruiters]);

  const aggregatedData: AggregatedData[] = useMemo(() => {
    const counts = filteredRawData.reduce((acc, profile) => {
        const name = profile.recruiter_name || 'Unknown';
        if (!acc[name]) {
            acc[name] = { count: 0, lastAdded: new Date(0).toISOString() };
        }
        acc[name].count += 1;
        if (new Date(profile.created_at) > new Date(acc[name].lastAdded)) {
            acc[name].lastAdded = profile.created_at;
        }
        return acc;
    }, {} as Record<string, { count: number; lastAdded: string }>);

    return Object.entries(counts)
        .map(([recruiter_name, data]) => ({ recruiter_name, ...data }))
        .sort((a, b) => b.count - a.count);
  }, [filteredRawData]);


  const exportToCSV = () => {
    const dataForExport = aggregatedData.map(d => ({
        'Recruiter Name': d.recruiter_name,
        'Profiles Added': d.count,
        'Last Added Date': format(new Date(d.lastAdded), 'PPP')
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'talent_contribution_report.csv';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Talent Contribution Report', 14, 20);
    (doc as any).autoTable({
        head: [['Recruiter Name', 'Profiles Added', 'Last Added Date']],
        body: aggregatedData.map(d => [d.recruiter_name, d.count, format(new Date(d.lastAdded), 'yyyy-MM-dd')]),
        startY: 30
    });
    doc.save('talent_contribution_report.pdf');
  };

  if (isLoading && reportData.length === 0) return <LoadingSpinner />;
  if (error) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>Talent Contribution Report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyze talent profiles added to the pool by each recruiter.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
            <div className="flex-1">
              <Label htmlFor="search-recruiter">Search Recruiter</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-recruiter"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Filter Recruiters
                  {selectedRecruiters.length > 0 && <Badge variant="secondary">{selectedRecruiters.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                 <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRecruiters([])}>Deselect All</Button>
                    {allRecruiters.map(recruiter => (
                        <Label key={recruiter.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                            <Checkbox
                                checked={selectedRecruiters.includes(recruiter.id)}
                                onCheckedChange={() => setSelectedRecruiters(prev =>
                                    prev.includes(recruiter.id) ? prev.filter(id => id !== recruiter.id) : [...prev, recruiter.id]
                                )}
                            />
                            {recruiter.name}
                        </Label>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
            <DateRangePickerField dateRange={draftDateRange} onDateRangeChange={setDraftDateRange} />
            <Button onClick={handleApplyFilters} className="w-full md:w-auto flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Apply
            </Button>
             <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" size="sm">CSV</Button>
                <Button onClick={exportToPDF} variant="outline" size="sm">PDF</Button>
            </div>
          </div>

           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profiles in Period</CardTitle>
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{filteredRawData.length}</div>
                    <p className="text-xs text-muted-foreground">in selected period and filters</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total All-Time Profiles</CardTitle>
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalProfileCount}</div>
                    <p className="text-xs text-muted-foreground">in the entire talent pool</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Contributing Recruiters</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{aggregatedData.length}</div>
                    <p className="text-xs text-muted-foreground">in selected period</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Contributor</CardTitle>
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold">{aggregatedData[0]?.recruiter_name || 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">with {aggregatedData[0]?.count || 0} profiles added</p>
                </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Contribution by Recruiter</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="recruiter_name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{backgroundColor: 'white', border: '1px solid #e2e8f0'}}/>
                <Legend />
                <Bar dataKey="count" name="Profiles Added" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border max-h-[440px] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                            <TableHead>Recruiter Name</TableHead>
                            <TableHead>Profiles Added</TableHead>
                            <TableHead className="text-right">Last Added Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedData.length > 0 ? (
                            aggregatedData.map(item => (
                                <TableRow key={item.recruiter_name}>
                                <TableCell className="font-medium">{item.recruiter_name}</TableCell>
                                <TableCell>{item.count}</TableCell>
                                <TableCell className="text-right">{format(new Date(item.lastAdded), 'PPP')}</TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                No data found matching your criteria.
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TalentProfileReport;