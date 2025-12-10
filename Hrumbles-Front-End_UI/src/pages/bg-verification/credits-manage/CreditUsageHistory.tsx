// src/pages/settings/CreditUsageHistory.tsx

import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import Loader from '@/components/ui/Loader';

export const CreditUsageHistory = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['credit-history', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  if (isLoading) return <Loader />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx: any) => (
              <TableRow key={tx.id}>
                <TableCell>{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span>{tx.description}</span>
                        {tx.verification_type && <span className="text-xs text-gray-500">{tx.verification_type}</span>}
                    </div>
                </TableCell>
                <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </TableCell>
                <TableCell className="text-right text-gray-600">{tx.balance_after}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};