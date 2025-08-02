import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, User, BarChart2, SlidersHorizontal, CheckCircle, Download, Calendar } from 'lucide-react';
import { DateRangePickerField } from './DateRangePickerField';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

// Define the types for our data
interface CompanyProfile {
  id: number;
  created_at: string;
  creator_name: string;
  created_by: string;
  company_name: string;
}

interface Creator {
  id: string;
  name: string;
}

interface AggregatedData {
  creator_name: string;
  count: number;
  lastAdded: string;
}

const CompaniesReport: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [reportData, setReportData] = useState<CompanyProfile[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [totalCompanyCount, setTotalCompanyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(),
    key: 'selection',
  });
  const [appliedDateRange, setAppliedDateRange] = useState(draftDateRange);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleApplyFilters = () => {
    setAppliedDateRange(draftDateRange);
    setCurrentPage(1);
  };

  const fetchInitialData = async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      if (countError) throw countError;
      setTotalCompanyCount(count ?? 0);

      const { data: employeesData, error: employeesError } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .eq('organization_id', organizationId)
        .order('first_name');
      if (employeesError) throw employeesError;
      setAllCreators(employeesData.map((emp: any) => ({
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
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select(`id, name, created_at, created_by, hr_employees!companies_created_by_fkey(id, first_name, last_name)`)
        .eq('organization_id', organizationId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      if (companiesError) throw companiesError;

      const formattedData: CompanyProfile[] = companiesData.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        created_by: item.created_by,
        creator_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}` : 'N/A',
        company_name: item.name,
      }));
      setReportData(formattedData);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [organizationId]);

  useEffect(() => {
    if (appliedDateRange.startDate && appliedDateRange.endDate) {
      fetchDataForRange(appliedDateRange.startDate, appliedDateRange.endDate);
    }
  }, [appliedDateRange, organizationId]);

  const filteredRawData = useMemo(() => {
    return reportData.filter(profile => {
      const matchesCreator = selectedCreators.length === 0 || selectedCreators.includes(profile.created_by);
      const matchesSearch = searchTerm === '' ||
        profile.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCreator && matchesSearch;
    });
  }, [reportData, searchTerm, selectedCreators]);

  const aggregatedData: AggregatedData[] = useMemo(() => {
    const counts = filteredRawData.reduce((acc, profile) => {
      const name = profile.creator_name || 'Unknown';
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
      .map(([creator_name, data]) => ({ creator_name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRawData]);

  const pieChartData = useMemo(() => {
    const topN = 4;
    const topContributors = aggregatedData.slice(0, topN);
    const otherCount = aggregatedData.slice(topN).reduce((acc, curr) => acc + curr.count, 0);
    const finalData = topContributors.map(d => ({ name: d.creator_name, value: d.count }));
    if (otherCount > 0) finalData.push({ name: 'Others', value: otherCount });
    return finalData;
  }, [aggregatedData]);

  // Pagination Logic
  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = aggregatedData.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    const dataForExport = aggregatedData.map(d => ({
      'Creator Name': d.creator_name,
      'Companies Added': d.count,
      'Last Added Date': format(new Date(d.lastAdded), 'PPP')
    }));
    const csv = Papa.unparse(dataForExport, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'companies_contribution_report.csv';
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Companies Contribution Report', 14, 20);
    (doc as any).autoTable({
      head: [['Creator Name', 'Companies Added', 'Last Added Date']],
      body: aggregatedData.map(d => [d.creator_name, d.count, format(new Date(d.lastAdded), 'yyyy-MM-dd')]),
      startY: 30
    });
    doc.save('companies_contribution_report.pdf');
  };

  if (isLoading && reportData.length === 0 && !error) {
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
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Companies Contribution Report</h1>
          <p className="text-sm text-gray-500 mt-2">Analyze companies added to the system by each creator.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Companies in Period</p>
                <h3 className="text-2xl font-bold text-gray-800">{filteredRawData.length}</h3>
                <p className="text-xs text-gray-500 mt-1">in selected period and filters</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
                <SlidersHorizontal size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total All-Time Companies</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalCompanyCount}</h3>
                <p className="text-xs text-gray-500 mt-1">in the entire system</p>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-full">
                <SlidersHorizontal size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Contributing Creators</p>
                <h3 className="text-2xl font-bold text-gray-800">{aggregatedData.length}</h3>
                <p className="text-xs text-gray-500 mt-1">in selected period</p>
              </div>
              <div className="bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 p-3 rounded-full">
                <User size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Top Contributor</p>
                <h3 className="text-xl font-bold text-gray-800">{aggregatedData[0]?.creator_name || 'N/A'}</h3>
                <p className="text-xs text-gray-500 mt-1">with {aggregatedData[0]?.count || 0} companies added</p>
              </div>
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                <BarChart2 size={24} className="text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="purple-gradient text-white p-6">
              <CardTitle className="text-base">Contribution by Creator</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px] w-full animate-fade-in">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : aggregatedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#4b5563' }} />
                      <YAxis dataKey="creator_name" type="category" width={120} tick={{ fontSize: 12, fill: '#4b5563' }} interval={0} />
                      <Tooltip
                        cursor={{ fill: '#f3e8ff' }}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid oklch(62.7% 0.265 303.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#4b5563' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '14px', color: '#4b5563' }} />
                      <Bar dataKey="count" name="Companies Added" fill="#7B43F1" radius={[0, 4, 4, 0]} />
                    </BarChart>
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
            <CardHeader className="purple-gradient text-white p-6">
              <CardTitle className="text-base">Contribution Share</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="h-[300px] w-full animate-fade-in">
                {isLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
                  </div>
                ) : pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#7B43F1', '#A74BC8', '#8884d8', '#a388d8', '#c3a8d8'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${value} companies`}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid oklch(62.7% 0.265 303.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#4b5563' }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '14px', color: '#4b5563' }} />
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
        </div>

        {/* Filter Bar and Table */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  placeholder="Search by company or creator..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Filter Creators
                    {selectedCreators.length > 0 && <Badge variant="secondary">{selectedCreators.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCreators([])}>Deselect All</Button>
                    {allCreators.map(creator => (
                      <Label key={creator.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                        <Checkbox
                          checked={selectedCreators.includes(creator.id)}
                          onCheckedChange={() => setSelectedCreators(prev =>
                            prev.includes(creator.id) ? prev.filter(id => id !== creator.id) : [...prev, creator.id]
                          )}
                        />
                        {creator.name}
                      </Label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <DateRangePickerField
                  dateRange={draftDateRange}
                  onDateRangeChange={setDraftDateRange}
                  className="pl-10 h-10 w-full"
                />
              </div>
              <Button
                onClick={handleApplyFilters}
                className="w-full sm:w-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <CheckCircle className="h-4 w-4" /> Apply
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
                      <TableHead className="sticky left-0 bg-gray-50 z-10 text-left font-medium text-gray-500 px-4 py-2">Creator Name</TableHead>
                      <TableHead className="text-center font-medium text-gray-500 px-4 py-2">Companies Added</TableHead>
                      <TableHead className="text-right font-medium text-gray-500 px-4 py-2">Last Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map(item => (
                        <TableRow key={item.creator_name} className="hover:bg-gray-50 transition">
                          <TableCell className="sticky left-0 bg-white z-10 font-medium text-gray-800 px-4 py-2">{item.creator_name}</TableCell>
                          <TableCell className="text-center text-gray-600 px-4 py-2">{item.count}</TableCell>
                          <TableCell className="text-right text-gray-600 px-4 py-2">{format(new Date(item.lastAdded), 'PPP')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-gray-500">
                          No data found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-gray-50">
                      <TableCell className="sticky left-0 bg-gray-50 z-10 font-bold text-gray-800 px-4 py-2">Total</TableCell>
                      <TableCell className="text-center font-bold text-gray-800 px-4 py-2">
                        {paginatedData.reduce((sum, item) => sum + item.count, 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-gray-800 px-4 py-2"></TableCell>
                    </TableRow>
                  </TableFooter>
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
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, aggregatedData.length)} of {aggregatedData.length}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompaniesReport;