import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface LeaveLedgerViewerProps {
  employeeId: string;
  leaveTypeId?: string; // Optional: filter by specific leave type
}

interface LedgerEntry {
  id: string;
  event_type: string;
  credit: number;
  debit: number;
  transaction_date: string;
  reason: string;
  leave_type: {
    name: string;
    color: string;
  };
}

export function LeaveLedgerViewer({ employeeId, leaveTypeId }: LeaveLedgerViewerProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['leaveLedger', employeeId, leaveTypeId],
    queryFn: async () => {
      let query = supabase
        .from('leave_ledger')
        .select(`
          *,
          leave_type:leave_types(name, color)
        `)
        .eq('employee_id', employeeId)
        .order('transaction_date', { ascending: false });

      if (leaveTypeId) {
        query = query.eq('leave_type_id', leaveTypeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LedgerEntry[];
    }
  });

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'accrual': return 'default'; // Blue
      case 'usage': return 'destructive'; // Red
      case 'adjustment': return 'secondary'; // Gray
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            {!leaveTypeId && <TableHead>Leave Policy</TableHead>}
            <TableHead className="text-right">Credit (+)</TableHead>
            <TableHead className="text-right">Debit (-)</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No history found.
              </TableCell>
            </TableRow>
          ) : (
            transactions?.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(new Date(entry.transaction_date), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(entry.event_type)}>
                    {entry.event_type.toUpperCase()}
                  </Badge>
                </TableCell>
                {!leaveTypeId && (
                   <TableCell>
                     <span style={{ color: entry.leave_type.color }} className="font-medium">
                       {entry.leave_type.name}
                     </span>
                   </TableCell>
                )}
                <TableCell className="text-right font-medium text-green-600">
                  {entry.credit > 0 ? `+${entry.credit}` : '-'}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {entry.debit > 0 ? `-${entry.debit}` : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {entry.reason}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}