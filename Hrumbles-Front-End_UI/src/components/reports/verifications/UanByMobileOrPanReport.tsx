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

const UanByMobileOrPanReport: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });

  const PAGE_SIZE = 15;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: fetchError } = await supabase
          .from('uanlookups')
          .select('*, verified_by:hr_employees(first_name, last_name)')
          .in('lookup_type', ['mobile', 'pan'])
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
      const uanDetails = item.response_data?.msg?.uan_details?.[0];
      return (
        item.lookup_value?.toLowerCase().includes(lowerSearch) ||
        uanDetails?.name?.toLowerCase().includes(lowerSearch) ||
        uanDetails?.uan?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [data, searchTerm]);
  
  const paginatedData = useMemo(() => {
    return filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filteredData, page]);

  const pageCount = Math.ceil(filteredData.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by Input, Name, or UAN..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
          className="max-w-sm"
        />
        <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Verified On</TableHead>
            <TableHead>Input</TableHead>
            <TableHead>Candidate Name</TableHead>
            <TableHead>UAN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verified By</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><LoadingSpinner/></TableCell></TableRow> :
             paginatedData.length === 0 ? <TableRow><TableCell colSpan={6} className="h-24 text-center">No records found.</TableCell></TableRow> :
             paginatedData.map(item => {
               const uanDetails = item.response_data?.msg?.uan_details?.[0];
               const status = item.response_data?.status;
               return (
                 <TableRow key={item.id}>
                   <TableCell>{format(new Date(item.created_at), 'MMM d, yyyy p')}</TableCell>
                   <TableCell><Badge variant="outline">{item.lookup_type}</Badge> {item.lookup_value}</TableCell>
                   <TableCell>{uanDetails?.name || 'N/A'}</TableCell>
                   <TableCell>{uanDetails?.uan || 'N/A'}</TableCell>
                   <TableCell>
                     <Badge variant={status === 1 ? 'success' : 'destructive'}>
                       {status === 1 ? 'Found' : 'Not Found'}
                     </Badge>
                   </TableCell>
                   <TableCell>{item.verified_by ? `${item.verified_by.first_name} ${item.verified_by.last_name}` : 'System'}</TableCell>
                 </TableRow>
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

export default UanByMobileOrPanReport;