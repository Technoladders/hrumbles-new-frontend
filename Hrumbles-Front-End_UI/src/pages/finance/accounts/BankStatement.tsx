import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Trash2,
  AlertTriangle,
  BarChart,
  X // <-- Add this comma and the 'X'
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// --- ADDITION 1: Import Recharts components ---
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart as RechartsBarChart
} from 'recharts';


// Simplified interface for the list page
interface BankStatement {
  id: string;
  account_holder_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  statement_start_date: string | null;
  statement_end_date: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  processing_status: 'pending' | 'completed' | 'failed';
  file_path: string | null; // <-- ADD THIS LINE
}

const BankStatement: React.FC = () => {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; id: string | null; name: string | null; }>({ show: false, id: null, name: null });

  const fetchStatements = async () => {
    const { data, error } = await supabase.from('bank_statements').select('*').order('uploaded_at', { ascending: false });
    if (error) setError('Failed to load bank statements');
    else setStatements(data || []);
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  // In BankStatement.tsx

// In BankStatement.tsx

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setError(null);
  setSuccessMessage(null);

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Please log in to upload statements');
    }

    // Step 1: Upload the file and process the statement
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/statement-processor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    setSuccessMessage(`Statement uploaded! ${data.transactions_count || 0} transactions extracted.`);
    fetchStatements(); // Refresh the list of statements on the page
    event.target.value = ''; // Clear the file input

    // --- THIS IS THE CORRECTED PART ---
    // Step 2: After successful upload, trigger the reconciliation function
    console.log('Triggering reconciliation process...');
    const reconciliationResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/reconciliation-engine`, { // <-- Correct function name is used here
      method: 'POST', // The function is set up to handle POST requests
      headers: { 
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json' 
      },
    });

    if (!reconciliationResponse.ok) {
      const errorText = await reconciliationResponse.text();
      console.error('Reconciliation function failed to start.', errorText);
    } else {
      const result = await reconciliationResponse.json();
      console.log('Reconciliation completed:', result);
      // Optionally, update the success message to include new suggestions
      if (result.total_suggestions && result.total_suggestions > 0) {
         setSuccessMessage(prev => `${prev} Found ${result.total_suggestions} new match suggestions!`);
      } else {
         console.log("No new reconciliation suggestions were found.");
      }
    }
    // --- END OF CORRECTION ---

  } catch (err: any) {
    setError(err.message || 'Failed to process the statement.');
  } finally {
    setUploading(false);
  }
};

  const confirmDelete = async () => {
    if (!deleteConfirmation.id) return;
    const { error } = await supabase.from('bank_statements').delete().eq('id', deleteConfirmation.id);
    if (error) {
      setError(`Failed to delete statement: ${error.message}`);
    } else {
      setSuccessMessage('Statement deleted successfully!');
      fetchStatements();
    }
    setDeleteConfirmation({ show: false, id: null, name: null });
  };
  
  const formatDate = (date: string | null) => !date ? '—' : new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (num: number | null) => num === null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);

  // --- ADDITION 2: Prepare data for the chart ---
  // We filter for completed statements and format them for the bar chart
  const chartData = statements
    .filter(stmt => stmt.processing_status === 'completed' && stmt.closing_balance !== null)
    .map(stmt => ({
      name: stmt.account_holder_name || 'Unnamed Account',
      'Closing Balance': stmt.closing_balance,
    }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header and Upload Section - No Changes */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">Bank Statements</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
              <Upload className="w-5 h-5" />
              <span>{uploading ? 'Processing...' : 'Upload Statement'}</span>
              <input type="file" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
            </label>
            {uploading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
          </div>
          {successMessage && <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-2"><CheckCircle className="w-5 h-5"/>{successMessage}</div>}
          {error && <div className="mt-4 p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}
        </div>

        {/* Statement Information Table - No Changes */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Statement Information</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Account Holder</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Account Number</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Bank Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Statement Period</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Opening Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Closing Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
           <tbody>
  {statements.map((statement) => (
    <tr key={statement.id} className="border-b hover:bg-blue-50">
      <td className="px-4 py-4 text-sm font-medium text-blue-600 hover:underline">
        {/* This link to the detail page still works */}
        <Link to={`/finance/accounts/${statement.id}`}>{statement.account_holder_name || '—'}</Link>
      </td>
      <td className="px-4 py-4 text-sm font-mono">{statement.account_number || '—'}</td>
      <td className="px-4 py-4 text-sm">{statement.bank_name || '—'}</td>
      <td className="px-4 py-4 text-sm">{formatDate(statement.statement_start_date)} to {formatDate(statement.statement_end_date)}</td>
      <td className="px-4 py-4 text-sm text-right font-bold text-blue-700">{formatCurrency(statement.opening_balance)}</td>
      <td className="px-4 py-4 text-sm text-right font-bold text-purple-700">{formatCurrency(statement.closing_balance)}</td>
      <td className="px-4 py-4 text-sm text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statement.processing_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{statement.processing_status}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* --- THIS IS THE KEY CHANGE --- */}
               <button
  onClick={async () => {
    if (statement.file_path) {
      // Create a temporary, secure "signed" URL that expires in 60 seconds
      const { data, error } = await supabase.storage
        .from('bank-statements')
        .createSignedUrl(statement.file_path, 60); // 60 is the expiry time in seconds

      if (error) {
        console.error("Error creating signed URL:", error);
        alert("Could not retrieve file. Check permissions."); 
        return;
      }

      // Open the signed URL in a new tab
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    }
  }}
  className="h-8 w-8 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white flex items-center justify-center"
  disabled={!statement.file_path} 
>
                  <Eye className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {/* The tooltip now says "View Uploaded File" */}
                <p>View Uploaded File</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setDeleteConfirmation({ show: true, id: statement.id, name: statement.account_holder_name })} className="h-8 w-8 rounded-full text-slate-500 hover:bg-red-600 hover:text-white flex items-center justify-center">
                  <Trash2 className="w-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Delete Statement</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
        </div>

        {/* --- ADDITION 3: NEW CHART SECTION --- */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <BarChart className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">Account Balance Overview</h2>
              </div>
            </div>
            <div className="p-6" style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <RechartsBarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  <RechartsTooltip formatter={(value: number) => [formatCurrency(value), 'Closing Balance']} />
                  <Bar dataKey="Closing Balance" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

       {deleteConfirmation.show && (
  <>
    {/* This is the faded background overlay */}
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" 
      onClick={() => setDeleteConfirmation({ show: false, id: null, name: null })}
    ></div>
    
    {/* This is the actual confirmation dialog that slides in */}
    <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
      <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-white" />
          <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
        </div>
        <button 
          onClick={() => setDeleteConfirmation({ show: false, id: null, name: null })} 
          className="text-white hover:bg-red-700 rounded-lg p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-6">
        <p className="text-gray-700 mb-4">
          Are you sure you want to permanently delete this bank statement? All associated transactions will also be removed.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-700">Account Holder:</p>
          <p className="text-sm text-gray-900 truncate">{deleteConfirmation.name || 'N/A'}</p>
        </div>
        <p className="text-xs text-gray-500 mt-4">This action cannot be undone.</p>
      </div>

      <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50">
        <button 
          onClick={() => setDeleteConfirmation({ show: false, id: null, name: null })} 
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
        >
          Cancel
        </button>
        <button 
          onClick={confirmDelete} 
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
        >
          Delete
        </button>
      </div>
    </div>
  </>
)}
      </div>
    </div>
  );
};

export default BankStatement;