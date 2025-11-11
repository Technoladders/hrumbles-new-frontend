import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import AccountsLayout from '@/components/accounts/AccountsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Link as LinkIcon, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// ==================================================================
// 1. TYPE DEFINITIONS FOR OUR DATA
// ==================================================================
interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
}

interface InvoicePaymentData {
  id: string;
  amount_paid: number;
  payment_date: string;
}

interface BankTransactionData {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
}

interface ReconciliationSuggestion {
  match_id: string;
  confidence_score: number;
  expense: ExpenseData | null;
  invoice_payment: InvoicePaymentData | null;
  bank_transaction: BankTransactionData;
}


// ==================================================================
// 2. THE MAIN REACT COMPONENT
// ==================================================================
const ReconciliationPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ==================================================================
  // 3. DATA FETCHING LOGIC
  // ==================================================================
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_reconciliation_suggestions');
      if (rpcError) throw rpcError;
      setSuggestions((data as ReconciliationSuggestion[]) || []);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to fetch suggestions.");
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);


  // ==================================================================
  // 4. USER ACTION HANDLERS
  // ==================================================================
  const handleConfirm = async (matchId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('confirm_reconciliation', {
        match_id_to_confirm: matchId,
      });
      if (rpcError) throw rpcError;
      
      // Update UI instantly for a smooth experience
      setSuggestions(currentSuggestions => 
        currentSuggestions.filter(s => s.match_id !== matchId)
      );
      toast.success("Match confirmed successfully!");
    } catch (err: any) {
      toast.error(`Failed to confirm match: ${err.message}`);
      console.error("Confirm Error:", err);
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('reject_reconciliation', {
        match_id_to_reject: matchId,
      });
      if (rpcError) throw rpcError;

      // Update UI instantly
      setSuggestions(currentSuggestions => 
        currentSuggestions.filter(s => s.match_id !== matchId)
      );
      toast.warning("Suggestion has been rejected.");
    } catch (err: any) {
      toast.error(`Failed to reject match: ${err.message}`);
      console.error("Reject Error:", err);
    }
  };

  // ==================================================================
  // 5. RENDER LOGIC AND JSX
  // ==================================================================
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      );
    }
    if (error) {
        return <p className="text-center text-red-500 py-8">Error: {error}</p>
    }
    if (suggestions.length === 0) {
      return (
        <div className="text-center text-gray-500 py-12">
            <h3 className="text-lg font-semibold">All Caught Up!</h3>
            <p>No new suggestions found.</p>
            <p className="text-sm mt-1">Upload a new bank statement to get AI-powered matches.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.match_id} className="border rounded-lg p-4 bg-slate-50 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* === LEFT CARD: Expense or Invoice === */}
              <div className="w-full md:w-5/12 p-3 bg-white rounded-md shadow-sm border">
                <p className="font-bold text-sm text-gray-700">
                  {suggestion.expense ? 'EXPENSE' : 'INVOICE PAYMENT'}
                </p>
                <p className="text-xl font-semibold text-purple-700">
                  ₹ {(suggestion.expense?.amount ?? suggestion.invoice_payment?.amount_paid)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {suggestion.expense?.description ?? 'Payment Received'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Date: {new Date(suggestion.expense?.date ?? suggestion.invoice_payment?.payment_date!).toLocaleDateString()}
                </p>
              </div>

              {/* === MIDDLE CONNECTOR === */}
              <div className="flex-1 flex flex-col items-center px-2">
                <LinkIcon className="h-8 w-8 text-gray-400" />
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mt-2">
                  {Math.round(suggestion.confidence_score * 100)}% Match
                </span>
              </div>

              {/* === RIGHT CARD: Bank Transaction === */}
              <div className="w-full md:w-5/12 p-3 bg-white rounded-md shadow-sm border">
                <p className="font-bold text-sm text-gray-700">BANK TRANSACTION</p>
                <p className={`text-xl font-semibold`}>
                  ₹ {suggestion.bank_transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-600 truncate">{suggestion.bank_transaction.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Date: {new Date(suggestion.bank_transaction.transaction_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* === ACTION BUTTONS === */}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={() => handleReject(suggestion.match_id)}>
                <XCircle className="mr-2 h-4 w-4" /> Not a Match
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleConfirm(suggestion.match_id)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Confirm
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AccountsLayout title="AI Reconciliation">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Suggested Matches</CardTitle>
                <p className="text-sm text-muted-foreground">
                Review the AI's suggestions to match your records with bank transactions.
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </AccountsLayout>
  );
};

export default ReconciliationPage;