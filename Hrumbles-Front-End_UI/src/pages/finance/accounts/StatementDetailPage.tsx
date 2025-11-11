import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Edit2, Save, X, Trash2, ArrowLeft, 
  CheckCircle, XCircle, Eye, AlertCircle, Plus
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Interfaces
interface StatementDetails {
  account_holder_name: string | null;
  account_number: string | null;
  closing_balance: number | null;
}

interface Transaction {
  id: string;
  description: string;
  transaction_date: string;
  transaction_type: 'credit' | 'debit';
  amount: number;
  running_balance: number | null;
  category: string | null;
  remarks: string | null;
  reconciliation_status: 'matched' | 'suggested' | 'unmatched';
}

interface ReconciliationMatch {
  id: string;
  expense_id: string | null;
  invoice_id: string | null;
  bank_transaction_id: string;
  match_status: 'suggested' | 'confirmed' | 'rejected';
  confidence_score: number;
  expense?: {
    id: string;
    description: string;
    amount: number;
    date: string;
    vendor: string | null;
    category: string;
  };
  invoice?: {
    id: string;
    invoice_number: string;
    client_name: string;
    total_amount: number;
    payment_date: string;
  };
}

const StatementDetailPage: React.FC = () => {
  const { statementId } = useParams<{ statementId: string }>();
  const navigate = useNavigate();
  
  // Get organization_id from Redux
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  const [statementDetails, setStatementDetails] = useState<StatementDetails | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matches, setMatches] = useState<Record<string, ReconciliationMatch>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', category: '', remarks: '' });
  const remarksInputRef = useRef<HTMLInputElement>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());

  const categories = [
    'Salary', 'Food & Dining', 'Shopping', 'Transport', 'Utilities', 'Healthcare',
    'Entertainment', 'Education', 'Investment', 'Transfer', 'ATM Withdrawal',
    'Bill Payment', 'Rent', 'Insurance', 'Other'
  ];
  
  const fetchStatementData = async () => {
    if (!statementId) return;
    setLoading(true);
    
    // Fetch statement details
    const { data: stmtData, error: stmtError } = await supabase
      .from('bank_statements')
      .select('account_holder_name, account_number, closing_balance')
      .eq('id', statementId)
      .single();

    if (stmtError) setError("Error fetching statement details.");
    else setStatementDetails(stmtData);

    // Fetch transactions
    const { data: txData, error: txError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('statement_id', statementId)
      .order('transaction_date', { ascending: true });

    if (txError) setError("Error fetching transactions.");
    else setTransactions(txData || []);

    // Fetch reconciliation matches
    if (txData && txData.length > 0) {
      const txIds = txData.map(tx => tx.id);
      
      const { data: matchData, error: matchError } = await supabase
        .from('reconciliation_matches')
        .select(`
          *,
          expense:hr_expenses(id, description, amount, date, vendor, category),
          invoice:hr_invoices(id, invoice_number, client_name, total_amount, payment_date)
        `)
        .in('bank_transaction_id', txIds)
        .in('match_status', ['suggested', 'confirmed']);

      if (!matchError && matchData) {
        const matchMap: Record<string, ReconciliationMatch> = {};
        matchData.forEach((match: any) => {
          matchMap[match.bank_transaction_id] = {
            id: match.id,
            expense_id: match.expense_id,
            invoice_id: match.invoice_id,
            bank_transaction_id: match.bank_transaction_id,
            match_status: match.match_status,
            confidence_score: match.confidence_score,
            expense: match.expense?.[0] || null,
            invoice: match.invoice?.[0] || null
          };
        });
        setMatches(matchMap);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchStatementData();
  }, [statementId]);

  useEffect(() => {
    if (editingId && remarksInputRef.current) {
      remarksInputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      description: transaction.description,
      category: transaction.category || '',
      remarks: transaction.remarks || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleKeyPress = (event: React.KeyboardEvent, transactionId: string) => {
    if (event.key === 'Enter') saveTransaction(transactionId);
  };

  const saveTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from('bank_transactions')
      .update({
        description: editForm.description,
        category: editForm.category || null,
        remarks: editForm.remarks || null,
      })
      .eq('id', transactionId);

    if (error) {
      setError(`Failed to save changes: ${error.message}`);
      return;
    }

    setTransactions(currentTransactions => 
      currentTransactions.map(tx => {
        if (tx.id === transactionId) {
          return {
            ...tx,
            description: editForm.description,
            category: editForm.category || null,
            remarks: editForm.remarks || null,
          };
        }
        return tx;
      })
    );

    setEditingId(null);
    setSuccessMessage('Transaction updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ===================================================================
  // Add as Expense Function (Using Redux organization_id)
  // ===================================================================
const handleAddAsExpense = async (transaction: Transaction) => {
  try {
    if (transaction.transaction_type !== 'debit') {
      toast.error('Only debit transactions can be added as expenses');
      return;
    }

    if (transaction.reconciliation_status === 'matched') {
      toast.error('This transaction is already matched to an expense');
      return;
    }

    if (!organization_id) {
      toast.error('Organization ID not found. Please log in again.');
      return;
    }

    toast.loading('Creating expense...', { id: 'create-expense' });

    // Create the expense with all required fields
    const { data: newExpense, error: expenseError } = await supabase
      .from('hr_expenses')
      .insert({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.transaction_date,
        category: transaction.category || 'Other',
        vendor: transaction.description,
        reconciliation_status: 'matched',
        organization_id: organization_id,
        payment_method: 'Bank Transfer', // ✅ Required field
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create reconciliation match
    const { error: matchError } = await supabase
      .from('reconciliation_matches')
      .insert({
        expense_id: newExpense.id,
        bank_transaction_id: transaction.id,
        match_status: 'confirmed',
        confidence_score: 1.0,
      });

    if (matchError) throw matchError;

    // Update bank transaction status
    const { error: txError } = await supabase
      .from('bank_transactions')
      .update({ reconciliation_status: 'matched' })
      .eq('id', transaction.id);

    if (txError) throw txError;

    // Update local state
    setTransactions(current =>
      current.map(tx =>
        tx.id === transaction.id
          ? { ...tx, reconciliation_status: 'matched' }
          : tx
      )
    );

    toast.success('Expense created and matched successfully!', { id: 'create-expense' });
    
    // Refresh data to show the new match
    await fetchStatementData();

  } catch (err: any) {
    console.error('Error creating expense:', err);
    toast.error(`Failed to create expense: ${err.message}`, { id: 'create-expense' });
  }
};

  const handleConfirmMatch = async (matchId: string, transactionId: string) => {
    try {
      // Update match status
      const { error: matchError } = await supabase
        .from('reconciliation_matches')
        .update({ match_status: 'confirmed' })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Update transaction reconciliation status
      const { error: txError } = await supabase
        .from('bank_transactions')
        .update({ reconciliation_status: 'matched' })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Update expense or invoice status
      const match = matches[transactionId];
      if (match.expense_id) {
        await supabase
          .from('hr_expenses')
          .update({ reconciliation_status: 'matched' })
          .eq('id', match.expense_id);
      } else if (match.invoice_id) {
        // Could update invoice status if needed
      }

      // Update local state
      setMatches(current => ({
        ...current,
        [transactionId]: {
          ...current[transactionId],
          match_status: 'confirmed'
        }
      }));

      setTransactions(current =>
        current.map(tx =>
          tx.id === transactionId
            ? { ...tx, reconciliation_status: 'matched' }
            : tx
        )
      );

      toast.success('Match confirmed successfully! Check the Expenses page to see the updated status.');
    } catch (err: any) {
      toast.error(`Failed to confirm match: ${err.message}`);
    }
  };

  const handleRejectMatch = async (matchId: string, transactionId: string) => {
    try {
      // Delete the match
      const { error: deleteError } = await supabase
        .from('reconciliation_matches')
        .delete()
        .eq('id', matchId);

      if (deleteError) throw deleteError;

      // Update transaction back to unmatched
      const { error: txError } = await supabase
        .from('bank_transactions')
        .update({ reconciliation_status: 'unmatched' })
        .eq('id', transactionId);

      if (txError) throw txError;

      // Update expense status back to unmatched
      const match = matches[transactionId];
      if (match.expense_id) {
        await supabase
          .from('hr_expenses')
          .update({ reconciliation_status: 'unmatched' })
          .eq('id', match.expense_id);
      }

      // Remove from local state
      setMatches(current => {
        const newMatches = { ...current };
        delete newMatches[transactionId];
        return newMatches;
      });

      setTransactions(current =>
        current.map(tx =>
          tx.id === transactionId
            ? { ...tx, reconciliation_status: 'unmatched' }
            : tx
        )
      );

      toast.warning('Match rejected');
    } catch (err: any) {
      toast.error(`Failed to reject match: ${err.message}`);
    }
  };

  const toggleMatchExpansion = (transactionId: string) => {
    setExpandedMatches(current => {
      const newSet = new Set(current);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getReconciliationBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500 text-white">Reconciled</Badge>;
      case 'suggested':
        return <Badge className="bg-yellow-500 text-white">Suggestion Available</Badge>;
      default:
        return <Badge variant="outline">Unreconciled</Badge>;
    }
  };
  
  const { credits, debits } = (() => {
    const credits = transactions
      .filter(tx => tx.transaction_type === 'credit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const debits = transactions
      .filter(tx => tx.transaction_type === 'debit')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { credits, debits };
  })();

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-8xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-600 hover:underline font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to All Statements
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Transactions for {statementDetails?.account_holder_name} - A/C: {statementDetails?.account_number}
              <span className="ml-3 px-3 py-1 bg-white text-green-700 rounded-full text-sm font-bold">
                {transactions.length} Transactions
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Credit (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Debit (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Balance (₹)</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const match = matches[tx.id];
                  const isExpanded = expandedMatches.has(tx.id);
                  
                  return (
                    <React.Fragment key={tx.id}>
                      <tr className={`border-b hover:bg-blue-50 ${match ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3 text-sm">
                          {getReconciliationBadge(tx.reconciliation_status)}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingId === tx.id ? (
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              onKeyDown={(e) => handleKeyPress(e, tx.id)}
                              className="w-full p-2 border rounded"
                            >
                              <option value="">Select</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tx.category || 'Uncategorized'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingId === tx.id ? (
                            <input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              onKeyDown={(e) => handleKeyPress(e, tx.id)}
                              className="w-full p-2 border rounded"
                            />
                          ) : (
                            <div className="max-w-md">
                              {tx.description}
                              {match && (
                                <button
                                  onClick={() => toggleMatchExpansion(tx.id)}
                                  className="ml-2 text-xs text-blue-600 hover:underline"
                                >
                                  {isExpanded ? 'Hide match' : 'Show match'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          {tx.transaction_type === 'credit' ? formatCurrency(tx.amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          {tx.transaction_type === 'debit' ? formatCurrency(tx.amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold">
                          {formatCurrency(tx.running_balance)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingId === tx.id ? (
                            <input
                              ref={remarksInputRef}
                              type="text"
                              value={editForm.remarks}
                              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                              onKeyDown={(e) => handleKeyPress(e, tx.id)}
                              className="w-full p-2 border rounded"
                              placeholder="Add remarks..."
                            />
                          ) : (
                            tx.remarks || <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === tx.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => saveTransaction(tx.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-white bg-green-600 rounded-lg text-xs font-bold"
                                title="Save"
                              >
                                <Save className="w-4 h-4" />SAVE
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => startEditing(tx)}
                                      className="h-8 w-8 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white flex items-center justify-center"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit</p></TooltipContent>
                                </Tooltip>

                                {/* Add as Expense Button (Only for unmatched debits) */}
                                {tx.transaction_type === 'debit' && tx.reconciliation_status === 'unmatched' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleAddAsExpense(tx)}
                                        className="h-8 w-8 rounded-full text-white bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Add as Expense</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>
                          )}
                        </td>
                      </tr>
                      
                      {/* Expanded Match Details Row */}
                      {match && isExpanded && (
                        <tr className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-200">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                                  <h4 className="font-bold text-gray-800">
                                    {match.expense ? 'Expense Match' : 'Invoice Match'} - {Math.round(match.confidence_score * 100)}% Confidence
                                  </h4>
                                </div>
                                
                                {match.expense && (
                                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-gray-600">Expense Description</p>
                                        <p className="font-semibold">{match.expense.description}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Amount</p>
                                        <p className="font-semibold text-red-600">{formatCurrency(match.expense.amount)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Date</p>
                                        <p className="font-semibold">{formatDate(match.expense.date)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Vendor</p>
                                        <p className="font-semibold">{match.expense.vendor || '—'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {match.invoice && (
                                  <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-gray-600">Invoice Number</p>
                                        <p className="font-semibold">{match.invoice.invoice_number}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Client</p>
                                        <p className="font-semibold">{match.invoice.client_name}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Amount</p>
                                        <p className="font-semibold text-green-600">{formatCurrency(match.invoice.total_amount)}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-600">Payment Date</p>
                                        <p className="font-semibold">{formatDate(match.invoice.payment_date)}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {match.match_status === 'suggested' && (
                                <div className="flex flex-col gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleConfirmMatch(match.id, tx.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirm Match
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectMatch(match.id, tx.id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Not a Match
                                  </Button>
                                </div>
                              )}
                              
                              {match.match_status === 'confirmed' && (
                                <div className="ml-4">
                                  <Badge className="bg-green-600 text-white">
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirmed
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                
                <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right">TOTAL:</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCurrency(credits)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{formatCurrency(debits)}</td>
                  <td className="px-4 py-3 text-right text-purple-700">
                    {formatCurrency(statementDetails?.closing_balance)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatementDetailPage;