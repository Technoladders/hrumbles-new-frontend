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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, User, BarChart2, SlidersHorizontal, CheckCircle, Download, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { supabase } from '@/integrations/supabase/client'; // Assuming this client exists
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// --- TYPE DEFINITIONS ---
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
  lastAdded: string;
}

// --- MAIN COMPONENT ---
const TalentProfileReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [reportData, setReportData] = useState<TalentProfile[]>([]);
  const [allRecruiters, setAllRecruiters] = useState<Recruiter[]>([]);
  const [totalProfileCount, setTotalProfileCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- FILTERS STATE ---
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: new Date(new Date().getFullYear(), 0, 1), endDate: new Date() });
  const [selectedRecruiters, setSelectedRecruiters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(''); // For table search

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!organizationId) return;
      try {
        const { count, error: countError } = await supabase.from('hr_talent_pool').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);
        if (countError) throw countError;
        setTotalProfileCount(count ?? 0);

        const { data: employeesData, error: employeesError } = await supabase.from('hr_employees').select('id, first_name, last_name').eq('organization_id', organizationId).order('first_name');
        if (employeesError) throw employeesError;
        setAllRecruiters(employeesData.map((emp: any) => ({ id: emp.id, name: `${emp.first_name} ${emp.last_name}` })));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial data.');
      }
    };
    fetchInitialData();
  }, [organizationId]);

  useEffect(() => {
    const fetchDataForRange = async () => {
      if (!dateRange.startDate || !dateRange.endDate || !organizationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.from('hr_talent_pool').select(`id, created_at, created_by, hr_employees!hr_talent_pool_created_by_fkey (id, first_name, last_name)`).eq('organization_id', organizationId).gte('created_at', dateRange.startDate.toISOString()).lte('created_at', dateRange.endDate.toISOString());
        if (error) throw error;

        const formattedData: TalentProfile[] = data.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          created_by: item.created_by,
          recruiter_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}` : 'External Sources',
        }));
        setReportData(formattedData);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataForRange();
  }, [dateRange, organizationId]);

  console.log("reportData", reportData);``

  // --- DATA PROCESSING & MEMOIZATION ---
  const aggregatedData: AggregatedData[] = useMemo(() => {
    const globallyFilteredData = reportData.filter(profile => (selectedRecruiters.length === 0 || selectedRecruiters.includes(profile.created_by)));
    const counts = globallyFilteredData.reduce((acc, profile) => {
      const name = profile.recruiter_name || 'Unknown';
      if (!acc[name]) acc[name] = { count: 0, lastAdded: new Date(0).toISOString() };
      acc[name].count++;
      if (new Date(profile.created_at) > new Date(acc[name].lastAdded)) acc[name].lastAdded = profile.created_at;
      return acc;
    }, {} as Record<string, { count: number; lastAdded: string }>);
    return Object.entries(counts).map(([recruiter_name, data]) => ({ recruiter_name, ...data })).sort((a, b) => b.count - a.count);
  }, [reportData, selectedRecruiters]);

  const filteredTableData = useMemo(() =>
    aggregatedData.filter(item =>
      item.recruiter_name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [aggregatedData, searchTerm]);

  const pieChartData = useMemo(() => {
    const topN = 4;
    const topContributors = aggregatedData.slice(0, topN);
    const otherCount = aggregatedData.slice(topN).reduce((acc, curr) => acc + curr.count, 0);
    const finalData = topContributors.map(d => ({ name: d.recruiter_name, value: d.count }));
    if (otherCount > 0) finalData.push({ name: 'Others', value: otherCount });
    return finalData;
  }, [aggregatedData]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredTableData.slice(startIndex, startIndex + itemsPerPage);

  // --- EXPORT FUNCTIONS ---
  const exportToCSV = () => {
    const csv = Papa.unparse(filteredTableData.map(d => ({ 'Recruiter': d.recruiter_name, 'Profiles Added': d.count, 'Last Added': format(new Date(d.lastAdded), 'PPP') })));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'talent_contribution_report.csv';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Talent Contribution Report', 14, 20);
    (doc as any).autoTable({
      head: [['Recruiter', 'Profiles Added', 'Last Added']],
      body: filteredTableData.map(d => [d.recruiter_name, d.count, format(new Date(d.lastAdded), 'yyyy-MM-dd')]),
      startY: 30,
    });
    doc.save('talent_contribution_report.pdf');
  };

  if (isLoading && reportData.length === 0 && !error) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>;
  }
  if (error) {
    return <div className="p-8"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <main className="max-w-screen-8xl mx-auto space-y-8">
        {/* === HEADER === */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">Talent Contribution Report</h1>
          <p className="text-gray-500 mt-1">Analyze talent profiles added by each recruiter.</p>
        </div>

        {/* === KPI CARDS GRID === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={SlidersHorizontal} title="Profiles in Period" value={aggregatedData.reduce((sum, item) => sum + item.count, 0)} subtitle="Based on filters" iconBg="from-blue-400 to-blue-600" />
          <StatCard icon={BarChart2} title="Total All-Time Profiles" value={totalProfileCount} subtitle="In the entire talent pool" iconBg="from-purple-400 to-purple-600" />
          <StatCard icon={User} title="Contributing Recruiters" value={aggregatedData.length} subtitle="In selected period" iconBg="from-fuchsia-400 to-fuchsia-600" />
          <StatCard icon={TrendingUp} title="Top Contributor" value={aggregatedData[0]?.recruiter_name || 'N/A'} subtitle={`${aggregatedData[0]?.count || 0} profiles added`} iconBg="from-green-400 to-green-600" />
        </div>



        {/* === CHARTS GRID === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCard title="Contribution by Recruiter">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="recruiter_name" type="category" width={120} tick={{ fontSize: 12 }} interval={0} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" name="Profiles Added" fill="#7B43F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Contribution Share">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={80} outerRadius={130} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#7B43F1', '#A74BC8', '#8884d8', '#a388d8', '#c3a8d8'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} profiles`} />
                <Legend wrapperStyle={{fontSize: "14px"}}/>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* === ADVANCED TABLE SECTION === */}
        <div className="space-y-4">
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Filter Recruiters */}
  <div className="flex-shrink-0 order-2 w-full sm:w-auto">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm flex-grow justify-start text-left font-normal gap-2">
          <User className="h-4 w-4" />
          <span>{selectedRecruiters.length > 0 ? `${selectedRecruiters.length} Recruiters Selected` : 'Filter Recruiters'}</span>
          {selectedRecruiters.length > 0 && <Badge variant="secondary" className="ml-auto">{selectedRecruiters.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
          <Button variant="ghost" size="sm" onClick={() => setSelectedRecruiters([])}>Deselect All</Button>
          {allRecruiters.map(r => (
            <Label key={r.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
              <Checkbox 
                checked={selectedRecruiters.includes(r.id)} 
                onCheckedChange={() => setSelectedRecruiters(p => p.includes(r.id) ? p.filter(id => id !== r.id) : [...p, r.id])}
              /> 
              {r.name}
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  </div>

  {/* Date Range Picker */}
  <div className="flex-shrink-0 order-3 w-full sm:w-auto">
    <EnhancedDateRangeSelector
      value={dateRange}
      onChange={setDateRange}
    />
  </div>

  {/* Search Bar */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search
      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      size={18}
    />
    <Input
      placeholder="Search recruiters in table..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={(e) => { 
        setSearchTerm(e.target.value); 
        setCurrentPage(1); 
      }}
    />
  </div>

  {/* Export Buttons */}
  <div className="flex gap-2 flex-shrink-0 order-4">
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
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="px-4 py-2 text-left text-sm font-medium text-gray-500">Recruiter Name</TableHead>
                                <TableHead className="px-4 py-2 text-center text-sm font-medium text-gray-500">Profiles Added</TableHead>
                                <TableHead className="px-4 py-2 text-right text-sm font-medium text-gray-500">Last Added Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white divide-y divide-gray-200">
                            {paginatedData.length > 0 ? paginatedData.map(item => (
                                <TableRow key={item.recruiter_name} className="hover:bg-gray-50 transition">
                                    <TableCell className="px-4 py-3 font-medium text-gray-800">{item.recruiter_name}</TableCell>
                                    <TableCell className="px-4 py-3 text-center">{item.count}</TableCell>
                                    <TableCell className="px-4 py-3 text-right">{format(new Date(item.lastAdded), 'PPP')}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-gray-500">No data found matching your criteria.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
             {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Rows per page:</span>
                        <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <span className="text-sm text-gray-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTableData.length)} of {filteredTableData.length}
                    </span>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon: React.ElementType; iconBg: string; }> = ({ title, value, subtitle, icon: Icon, iconBg }) => (
  <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <CardContent className="p-5 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 truncate" title={String(value)}>{value}</h3>
        <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>
      </div>
      <div className={`bg-gradient-to-br ${iconBg} p-3 rounded-full flex-shrink-0 ml-4`}>
        <Icon size={22} className="text-white" />
      </div>
    </CardContent>
  </Card>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="shadow-lg border-none bg-white overflow-hidden">
    <CardHeader><CardTitle className="text-lg font-semibold text-gray-700">{title}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default TalentProfileReport;