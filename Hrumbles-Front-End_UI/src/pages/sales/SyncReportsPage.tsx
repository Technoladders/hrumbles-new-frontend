import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SyncReportsPage() {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const[selectedReport, setSelectedReport] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey:['background_sync_reports', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('background_sync_reports')
        .select('*')
        .eq('organization_id', organization_id)
        .order('run_date', { ascending: false });
      if (error) throw error;
      return data ||[];
    },
    enabled: !!organization_id
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Completed</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><AlertCircle className="w-3 h-3 mr-1"/> {status}</Badge>;
    }
  };

  const viewDetails = (report: any) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading reports...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Data Sync Reports</h1>
        <p className="text-sm text-slate-500 mt-1">View the history and results of your automated background data extractions.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[180px]">Run Date</TableHead>
              <TableHead>Keyword Snippet</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Processed</TableHead>
              <TableHead className="text-right">New Inserts</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400">No reports found.</TableCell>
              </TableRow>
            ) : (
              reports?.map((report) => (
                <TableRow key={report.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-xs text-slate-600">
                    {format(new Date(report.run_date), 'MMM d, yyyy • h:mm a')}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono truncate max-w-[200px]">
                    {report.filters?.q_keywords || 'Advanced Filters Only'}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500">{report.total_expected.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-blue-600">{report.total_processed.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-emerald-600">{report.total_inserted.toLocaleString()}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" onClick={() => viewDetails(report)} className="h-8 text-indigo-600 hover:bg-indigo-50">
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Extraction Details</DialogTitle>
            <DialogDescription>
              Ran on {selectedReport && format(new Date(selectedReport.run_date), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100 flex-shrink-0">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">Processed</p>
              <p className="text-xl font-black text-blue-600 mt-1">{selectedReport?.total_processed}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">New Inserts (DB)</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{selectedReport?.total_inserted}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] uppercase font-bold text-slate-500">Duplicates Skipped</p>
              <p className="text-xl font-black text-amber-600 mt-1">
                {selectedReport && (selectedReport.total_processed - selectedReport.total_inserted)}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col gap-2 mt-4">
            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Search Filters Used:</h4>
            <ScrollArea className="flex-1 bg-slate-900 rounded-lg p-4 border shadow-inner">
              <pre className="text-xs text-green-400 font-mono">
                {selectedReport && JSON.stringify(selectedReport.filters, null, 2)}
              </pre>
            </ScrollArea>
          </div>
          
          {selectedReport?.error_log && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              <span className="font-bold">Error Log:</span> {selectedReport.error_log}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}