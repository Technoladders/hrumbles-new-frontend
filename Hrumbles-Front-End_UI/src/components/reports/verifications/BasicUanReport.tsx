import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DateRangePickerField } from '../DateRangePickerField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

const BasicUanReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<number, boolean>>({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });

  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: fetchError } = await supabase
          .from('uanlookups')
          .select('*, verified_by:hr_employees(first_name, last_name)')
          .eq('lookup_type', 'uan_full_history')
          .gte('created_at', dateRange.startDate.toISOString())
          .lte('created_at', dateRange.endDate.toISOString())
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const lowerSearch = searchTerm.toLowerCase();
      const history = item.response_data?.msg?.[0];
      return (
        item.lookup_value?.toLowerCase().includes(lowerSearch) ||
        history?.name?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    return filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredData, page]);

  const pageCount = Math.ceil(filteredData.length / PAGE_SIZE);

  console.log("paginatedddddd", paginatedData)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by UAN or Name..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          className="max-w-sm"
        />
        <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Verified On</TableHead>
            <TableHead>UAN Verified</TableHead>
            <TableHead>Candidate Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified By</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><LoadingSpinner/></TableCell></TableRow> :
             paginatedData.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center">No records found.</TableCell></TableRow> :
             paginatedData.map(item => {
               const history = item.response_data?.msg;
               const candidateName = Array.isArray(history) && history.length > 0 ? history[0].name : 'N/A';
               const status = item.response_data?.status;
               const isOpen = openCollapsibles[item.id] || false;
               
               return (
                 <Collapsible asChild key={item.id} open={isOpen} onOpenChange={(open) => setOpenCollapsibles(prev => ({...prev, [item.id]: open}))}>
                   <>
                     <TableRow>
                       <TableCell>
                         {Array.isArray(history) && history.length > 0 && (
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">{isOpen ? <ChevronDown/> : <ChevronRight/>}</Button>
                            </CollapsibleTrigger>
                         )}
                       </TableCell>
                       <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy p')}</TableCell>
                       <TableCell>{item.lookup_value}</TableCell>
                       <TableCell>{candidateName}</TableCell>
                       <TableCell>
                         <Badge variant={status === 1 ? 'success' : 'destructive'}>
                           {status === 1 ? 'Found' : 'Not Found'}
                         </Badge>
                       </TableCell>
                       <TableCell>{item.verified_by ? `${item.verified_by.first_name} ${item.verified_by.last_name}` : 'System'}</TableCell>
                     </TableRow>
                     <CollapsibleContent asChild>
                       <tr className="bg-purple-50">
                         <TableCell colSpan={6}>
                           <div className="p-4">
                             <h4 className="font-semibold mb-2">Employment History</h4>
                             <Table>
                               <TableHeader><TableRow><TableHead>Establishment Name</TableHead><TableHead>Member Id</TableHead><TableHead>DOJ</TableHead><TableHead>DOE</TableHead></TableRow></TableHeader>
                               <TableBody>
                                 {Array.isArray(history) && history.map((emp: any, index: number) => (
                                   <TableRow key={index}>
                                     <TableCell>{emp['Establishment Name'] || emp.establishment_name}</TableCell>
                                     <TableCell>{emp['Establishment Id'] || emp.MemberId}</TableCell>
                                     <TableCell>{emp.Doj || emp.date_of_joining}</TableCell>
                                     <TableCell>{emp.DateOfExitEpf === 'NA' ? 'Present' : emp.DateOfExitEpf || emp.date_of_exit}</TableCell>
                                   </TableRow>
                                 ))}
                               </TableBody>
                             </Table>
                           </div>
                         </TableCell>
                       </tr>
                     </CollapsibleContent>
                   </>
                 </Collapsible>
               );
             })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pageCount}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</Button>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    </div>
  );
};

export default BasicUanReport;