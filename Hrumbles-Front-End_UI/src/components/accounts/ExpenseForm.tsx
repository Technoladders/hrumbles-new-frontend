import React, { useState, useEffect, useRef } from 'react';
import { useAccountsStore, ExpenseCategory, PaymentMethod } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IndianRupee, RefreshCw, UploadCloud, FileText, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Interface for all data extracted by the AI
interface ExtractedData {
  vendor: string | null;
  vendorAddress: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  category: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  rawText: string | null;
  invoiceNumber: string | null;
  hsn: string | null;
  sac: string | null;
  cgst: number | null;
  sgst: number | null;
  taxableAmount: number | null;
}

// Props for the ExpenseForm component
interface ExpenseFormProps {
  expense?: any;
  onClose: () => void;
  expenseData: any;
  setExpenseData: (updater: (prevState: any) => any) => void;
  organizationName: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onClose, expenseData, setExpenseData, organizationName }) => {
  const { addExpense, updateExpense } = useAccountsStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use a ref to track the initial render, preventing the total amount from being overwritten on edit.
  const isInitialRender = useRef(true);

  // Check user authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setIsAuthenticated(!!userData?.user);
    };
    checkAuth();
  }, []);

  // Effect to auto-calculate the Total Amount whenever sub-fields change
  useEffect(() => {
    if (!expenseData) return;

    // If this is the first render AND we are in edit mode, do not recalculate.
    // This preserves the total amount passed from the parent component.
    if (expense && isInitialRender.current) {
      isInitialRender.current = false; // Mark that the initial render has passed
      return;
    }

    // For new expenses or subsequent changes in edit mode, perform the calculation.
    const taxable = parseFloat(expenseData.taxableAmount) || 0;
    const cgst = parseFloat(expenseData.cgst) || 0;
    const sgst = parseFloat(expenseData.sgst) || 0;
    
    // Only calculate if at least one of the tax fields has a value.
    // Otherwise, the total is just the taxable amount.
    const total = (taxable > 0 || cgst > 0 || sgst > 0) ? taxable + cgst + sgst : parseFloat(expenseData.amount) || 0;

    setExpenseData((prev: any) => ({
      ...prev,
      amount: total.toFixed(2),
      displayAmount: new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(total)
    }));
  }, [expenseData?.taxableAmount, expenseData?.cgst, expenseData?.sgst]);

  // Effect to handle file previews for images and PDFs
  useEffect(() => {
    if (expenseData?.receiptUrl && !expenseData?.fileToUpload) {
      if (/\.(jpeg|jpg|png|gif)$/i.test(expenseData.receiptUrl)) {
        setFilePreview(expenseData.receiptUrl);
      } else {
        setFilePreview(null);
      }
    } else if (expenseData?.fileToUpload) {
      if (expenseData.fileToUpload.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(expenseData.fileToUpload);
        setFilePreview(previewUrl);
        return () => URL.revokeObjectURL(previewUrl);
      } else {
        setFilePreview(null);
      }
    } else {
      setFilePreview(null);
    }
  }, [expenseData?.fileToUpload, expenseData?.receiptUrl]);

  // Function to open the uploaded bill in a new tab
  const handleViewBill = () => {
    let urlToOpen = '';
    if (expenseData.fileToUpload) {
      urlToOpen = URL.createObjectURL(expenseData.fileToUpload);
    } else if (expenseData.receiptUrl) {
      urlToOpen = expenseData.receiptUrl;
    }
    if (urlToOpen) {
      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    } else {
      toast.info("No bill is available to view yet.");
    }
  };

  // Function to handle file selection from browse or drag-and-drop
  const handleFileSelect = (file: File | null) => {
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPEG, PNG) or a PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File is too large. Max size is 5MB.');
        return;
      }
      setExpenseData((prev: any) => ({ ...prev, fileToUpload: file, receiptUrl: '' }));
      processReceiptForOcr(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { handleFileSelect(e.target.files?.[0] || null); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileSelect(e.dataTransfer.files?.[0] || null); };

  // Function to send file to the backend for AI processing
  const processReceiptForOcr = async (file: File) => {
    setIsProcessingReceipt(true);
    toast.info("🤖 Analyzing receipt with AI... Please wait.");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result?.toString().split(',')[1];
      if (!base64String) { setIsProcessingReceipt(false); toast.error("Could not read the file."); return; }
      try {
        const { data, error } = await supabase.functions.invoke<ExtractedData>('process-receipt', { body: { image: base64String, mimeType: file.type, organizationName } });
        if (error) throw error;
        setExpenseData((prevData: any) => {
          const updatedData = { ...prevData };
          if (data.vendor) updatedData.vendor = data.vendor;
          if (data.vendorAddress) updatedData.vendorAddress = data.vendorAddress;
          if (data.description) updatedData.description = data.description;
          if (data.category) updatedData.category = data.category;
          if (data.paymentMethod) updatedData.paymentMethod = data.paymentMethod;
          if (data.notes || data.rawText) updatedData.notes = data.notes || data.rawText;
          if (data.date) {
            try {
              const parts = data.date.split('-');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                if (!isNaN(new Date(isoDate).getTime())) updatedData.date = isoDate;
              }
            } catch (e) { console.error("Could not parse date:", data.date); }
          }
          if (data.invoiceNumber) updatedData.invoiceNumber = data.invoiceNumber;
          if (data.hsn) updatedData.hsn = data.hsn;
          if (data.sac) updatedData.sac = data.sac;
          if (data.cgst) updatedData.cgst = data.cgst.toString();
          if (data.sgst) updatedData.sgst = data.sgst.toString();
          if (data.taxableAmount) updatedData.taxableAmount = data.taxableAmount.toString();
          return updatedData;
        });
        toast.success("✅ Receipt analyzed! Please review and save.");
      } catch (err: any) {
        toast.error(`AI could not read receipt: ${err.message}`);
      } finally {
        setIsProcessingReceipt(false);
      }
    };
  };

  // Function to upload the receipt file to Supabase Storage
  const uploadReceipt = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadError) throw new Error(uploadError.message);
      const { data } = await supabase.storage.from('receipts').createSignedUrl(filePath, 365 * 24 * 60 * 60);
      return data?.signedUrl || null;
    } catch (error: any) {
      toast.error(`Receipt upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle the final form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated === false) { toast.error('Authentication required.'); return; }
    if (!expenseData.description.trim()) { toast.error('Description is required.'); return; }
    if (!expenseData.date) { toast.error('Invoice date is required.'); return; }
    if (!expenseData.amount || isNaN(parseFloat(expenseData.amount)) || parseFloat(expenseData.amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }
    let finalReceiptUrl: string | undefined = expenseData.receiptUrl;
    if (expenseData.fileToUpload) {
      const uploadedUrl = await uploadReceipt(expenseData.fileToUpload);
      if (!uploadedUrl) return;
      finalReceiptUrl = uploadedUrl;
    }
 
     const dataToSave = {
      category: expenseData.category,
      description: expenseData.description,
      date: expenseData.date,
      amount: parseFloat(expenseData.amount),
      paymentMethod: expenseData.paymentMethod, // This will be mapped to payment_method in the store
      vendor: expenseData.vendor || undefined,
      notes: expenseData.notes || undefined,
      receiptUrl: finalReceiptUrl,

      // Add all the missing fields here
      vendorAddress: expenseData.vendorAddress || undefined,
      invoiceNumber: expenseData.invoiceNumber || undefined,
      taxableAmount: expenseData.taxableAmount ? parseFloat(expenseData.taxableAmount) : undefined,
      cgst: expenseData.cgst ? parseFloat(expenseData.cgst) : undefined,
      sgst: expenseData.sgst ? parseFloat(expenseData.sgst) : undefined,
      hsn: expenseData.hsn || undefined,
      sac: expenseData.sac || undefined,
    };
    // --- END: CORRECTED DATA OBJECT ---

  try {
      if (expense) {
        // Pass the corrected object to the update function
        await updateExpense(expense.id, dataToSave);
        toast.success('Expense updated successfully.');
      } else {
        // Pass the corrected object to the add function
        await addExpense(dataToSave);
        toast.success('Expense added successfully.');
      }
      onClose();
    } catch (error: any) {
      toast.error(`Failed to save expense: ${error.message}`);
    }
  };
  const isFormDisabled = isProcessingReceipt || isUploading;

  // This check prevents rendering if the data is not ready, avoiding the crash.
  if (!expenseData) {
    return <div className="p-4">Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 sm:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-300 ${isDragging ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`} onDragEnter={() => setIsDragging(true)} onDragLeave={() => setIsDragging(false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
            <div className="text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm font-semibold text-gray-600">Drag & drop your receipt here</p>
              <p className="text-xs text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG, PDF up to 5MB</p>
            </div>
            <Input ref={fileInputRef} id="receipt-upload" type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isFormDisabled} />
          </div>
          {(expenseData.fileToUpload || expenseData.receiptUrl) && (
            <div className="p-3 border rounded-lg bg-white space-y-3">
              <div className="flex items-center gap-3">
                {filePreview ? (<img src={filePreview} alt="Receipt Preview" className="h-16 w-16 object-cover rounded-md border" />) : (<div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-md border"><FileText className="h-8 w-8 text-gray-500" /></div>)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{expenseData.fileToUpload?.name || 'Uploaded Receipt'}</p>
                  {expenseData.fileToUpload?.size && <p className="text-xs text-gray-500">{(expenseData.fileToUpload.size / 1024).toFixed(1)} KB</p>}
                </div>
              </div>
              <div className="pt-3 border-t">
                <Button type="button" variant="link" className="text-purple-600 p-0 h-auto flex items-center gap-1.5 text-sm font-semibold" onClick={handleViewBill}>
                  <ExternalLink className="h-4 w-4" /> View Bill
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 border-b pb-2">{expense ? 'Edit Expense' : 'New Expense Submission'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div><Label htmlFor="vendor">Vendor / Merchant</Label><Input id="vendor" placeholder="e.g., Amazon, Zomato" value={expenseData.vendor || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, vendor: e.target.value }))} disabled={isFormDisabled} /></div>
            <div><Label htmlFor="vendorAddress">Address</Label><Input id="vendorAddress" placeholder="Vendor's address" value={expenseData.vendorAddress || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, vendorAddress: e.target.value }))} disabled={isFormDisabled} /></div>
          </div>
          <div><Label htmlFor="category">Category</Label><Select value={expenseData.category} onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value as ExpenseCategory }))} disabled={isFormDisabled}><SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent><SelectItem value="Professional Services">Professional Services</SelectItem><SelectItem value="Food">Food</SelectItem><SelectItem value="Travel">Travel</SelectItem><SelectItem value="Office Supplies">Office Supplies</SelectItem><SelectItem value="Software">Software</SelectItem><SelectItem value="Hardware">Hardware</SelectItem><SelectItem value="Utilities">Utilities</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Rent">Rent</SelectItem><SelectItem value="Salary">Salary</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          <div><Label htmlFor="description">Description</Label><Textarea id="description" placeholder="What was this expense for?" value={expenseData.description || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))} disabled={isFormDisabled} /></div>
          <div className="space-y-4 pt-4 mt-4 border-t">
            <h3 className="text-md font-semibold text-gray-700">Billing & Tax Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div><Label htmlFor="invoiceNumber">Invoice Number</Label><Input id="invoiceNumber" placeholder="INV-001" value={expenseData.invoiceNumber || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, invoiceNumber: e.target.value }))} disabled={isFormDisabled} /></div>
                 <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input 
                  id="gstin" 
                  placeholder="e.g., 29ABCDE1234F1Z5" 
                  value={expenseData.gstin || ''} 
                  onChange={(e) => setExpenseData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))} 
                  disabled={isFormDisabled} 
                  maxLength={15}
                />
              </div>

              <div><Label htmlFor="date">Invoice Date</Label><Input id="date" type="date" value={expenseData.date || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))} disabled={isFormDisabled} /></div>
              {expenseData.hsn && (<div><Label htmlFor="hsn">HSN Code</Label><Input id="hsn" value={expenseData.hsn || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, hsn: e.target.value }))} disabled={isFormDisabled} /></div>)}
              {expenseData.sac && (<div><Label htmlFor="sac">SAC Code</Label><Input id="sac" value={expenseData.sac || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, sac: e.target.value }))} disabled={isFormDisabled} /></div>)}
              <div><Label htmlFor="paymentMethod">Payment Method</Label><Select value={expenseData.paymentMethod} onValueChange={(value) => setExpenseData(prev => ({ ...prev, paymentMethod: value as PaymentMethod }))} disabled={isFormDisabled}><SelectTrigger id="paymentMethod"><SelectValue placeholder="Select a payment method" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit Card">Credit Card</SelectItem><SelectItem value="Debit Card">Debit Card</SelectItem><SelectItem value="UPI">UPI</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Check">Check</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 items-end">
              <div><Label htmlFor="taxableAmount">Taxable Amount</Label><Input id="taxableAmount" type="number" placeholder="0.00" value={expenseData.taxableAmount || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, taxableAmount: e.target.value }))} disabled={isFormDisabled} className="bg-yellow-50" /></div>
              <div className="grid grid-cols-2 gap-x-2">
                <div><Label htmlFor="cgst">CGST</Label><Input id="cgst" type="number" placeholder="0.00" value={expenseData.cgst || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, cgst: e.target.value }))} disabled={isFormDisabled} /></div>
                <div><Label htmlFor="sgst">SGST</Label><Input id="sgst" type="number" placeholder="0.00" value={expenseData.sgst || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, sgst: e.target.value }))} disabled={isFormDisabled} /></div>
              </div>
            </div>
            <div className="!mt-6">
              <Label htmlFor="totalAmount">Total Amount (Auto-Calculated)</Label>
              <div className="relative"><IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="totalAmount" type="text" className="pl-9 bg-gray-100 font-bold border-gray-300" value={expenseData.displayAmount || '0.00'} disabled /></div>
            </div>
          </div>
          <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" placeholder="Any additional notes..." value={expenseData.notes || ''} onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))} disabled={isFormDisabled} rows={3} /></div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={isFormDisabled}>Cancel</Button>
        <Button type="submit" disabled={isFormDisabled} className="bg-purple-600 hover:bg-purple-700">
          {isProcessingReceipt ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> :
            isUploading ? 'Uploading...' :
              expense ? 'Update Expense' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;