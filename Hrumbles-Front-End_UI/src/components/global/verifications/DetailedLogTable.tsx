import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface Log {
  id: string;
  created_at: string;
  lookup_type: string;
  lookup_value: string;
  response_data: { status: number };
  verified_by: { first_name: string; last_name: string } | null;
  cost: number;
}

interface DetailedLogTableProps {
  data: Log[];
}

const DetailedLogTable: React.FC<DetailedLogTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const verifierName = item.verified_by ? `${item.verified_by.first_name} ${item.verified_by.last_name}`.toLowerCase() : 'system';
        return item.lookup_value.toLowerCase().includes(searchLower) || verifierName.includes(searchLower);
    });
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'PPp') : 'Invalid Date';
  }

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
      <CardHeader className="p-4 border-b flex flex-col md:flex-row justify-between items-center">
        <CardTitle className="text-xl font-semibold text-gray-800">Individual Verification Records</CardTitle>
        <div className="relative w-full md:w-64 mt-2 md:mt-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search input or verifier..."
            className="pl-10 h-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-100">
                <TableHead className="py-3 px-6 text-slate-600">Verified On</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Type</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Input</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Status</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Cost</TableHead>
                <TableHead className="py-3 px-6 text-slate-600">Verified By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map(log => (
                <TableRow key={log.id} className="hover:bg-slate-50/50 border-b">
                  <TableCell className="px-6 py-4 text-gray-600">{formatDate(log.created_at)}</TableCell>
                  <TableCell className="px-6 py-4"><Badge variant="secondary">{log.lookup_type}</Badge></TableCell>
                  <TableCell className="font-mono px-6 py-4 text-gray-700">{log.lookup_value}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={log.response_data?.status === 1 ? 'success' : 'destructive'}>
                      {log.response_data?.status === 1 ? 'Found' : 'Not Found'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">{log.cost.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                  <TableCell className="px-6 py-4 text-gray-600">{log.verified_by ? `${log.verified_by.first_name} ${log.verified_by.last_name}` : 'System'}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">No logs found for this period.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <div className="p-4 border-t flex justify-between items-center bg-slate-50">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
      )}
    </Card>
  );
};

export default DetailedLogTable;