// src/components/reports/ContactsReport.tsx
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
interface ContactProfile {
  id: string;
  created_at: string;
  creator_name: string;
  created_by: string;
  contact_name: string;
  company_name: string | null;
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

const ContactsReport: React.FC = () => {
    const organizationId = useSelector((state: any) => state.auth.organization_id);
    const [reportData, setReportData] = useState<ContactProfile[]>([]);
    const [allCreators, setAllCreators] = useState<Creator[]>([]);
    const [totalContactCount, setTotalContactCount] = useState<number>(0);
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
    
    const handleApplyFilters = () => {
      setAppliedDateRange(draftDateRange);
    };

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { count, error: countError } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        if (countError) throw countError;
        setTotalContactCount(count ?? 0);

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
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select(`
            id, name, created_at, created_by, 
            hr_employees!contacts_created_by_fkey(id, first_name, last_name),
            companies(name)
          `)
          .eq('organization_id', organizationId)
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString());
        if (contactsError) throw contactsError;

        const formattedData: ContactProfile[] = contactsData.map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          created_by: item.created_by,
          creator_name: item.hr_employees ? `${item.hr_employees.first_name} ${item.hr_employees.last_name}` : 'N/A',
          contact_name: item.name,
          company_name: item.companies ? item.companies.name : null,
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
          profile.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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


    const exportToCSV = () => {
      const dataForExport = aggregatedData.map(d => ({
          'Creator Name': d.creator_name,
          'Contacts Added': d.count,
          'Last Added Date': format(new Date(d.lastAdded), 'PPP')
      }));
      const csv = Papa.unparse(dataForExport, { header: true });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'contacts_contribution_report.csv';
      link.click();
    };

    const exportToPDF = () => {
      const doc = new jsPDF();
      doc.text('Contacts Contribution Report', 14, 20);
      (doc as any).autoTable({
          head: [['Creator Name', 'Contacts Added', 'Last Added Date']],
          body: aggregatedData.map(d => [d.creator_name, d.count, format(new Date(d.lastAdded), 'yyyy-MM-dd')]),
          startY: 30
      });
      doc.save('contacts_contribution_report.pdf');
    };

    if (isLoading && reportData.length === 0) return <LoadingSpinner />;
    if (error) {
      return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
    }

    return (
      <div className="space-y-6">
         <Card>
          <CardHeader>
            <CardTitle>Contacts Contribution Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              Analyze contacts added to the system by each creator.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
              <div className="flex-1">
                <Label htmlFor="search-creator">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-creator"
                    placeholder="Search by contact, company, or creator..."
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
                      <CardTitle className="text-sm font-medium">Contacts in Period</CardTitle>
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{filteredRawData.length}</div>
                      <p className="text-xs text-muted-foreground">in selected period and filters</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total All-Time Contacts</CardTitle>
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{totalContactCount}</div>
                      <p className="text-xs text-muted-foreground">in the entire system</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Contributing Creators</CardTitle>
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
                      <div className="text-xl font-bold">{aggregatedData[0]?.creator_name || 'N/A'}</div>
                      <p className="text-xs text-muted-foreground">with {aggregatedData[0]?.count || 0} contacts added</p>
                  </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Contribution by Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={aggregatedData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="creator_name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{backgroundColor: 'white', border: '1px solid #e2e8f0'}}/>
                  <Legend />
                  <Bar dataKey="count" name="Contacts Added" fill="#8884d8" />
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
                              <TableHead>Creator Name</TableHead>
                              <TableHead>Contacts Added</TableHead>
                              <TableHead className="text-right">Last Added</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {aggregatedData.length > 0 ? (
                              aggregatedData.map(item => (
                                  <TableRow key={item.creator_name}>
                                  <TableCell className="font-medium">{item.creator_name}</TableCell>
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

export default ContactsReport;