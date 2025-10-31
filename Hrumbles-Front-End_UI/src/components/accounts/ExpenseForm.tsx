import React, { useState, useEffect } from 'react';
import { useAccountsStore, ExpenseCategory, PaymentMethod } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IndianRupee, Upload, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  category: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  rawText: string | null;
}

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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setIsAuthenticated(!!userData?.user);
    };
    checkAuth();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) { toast.error('Please upload a valid image (JPEG, PNG).'); return; }
      
      setExpenseData(prev => ({ ...prev, fileToUpload: file, receiptUrl: '' }));
      processReceiptForOcr(file);
    }
  };
  
  const processReceiptForOcr = async (file: File) => {
    setIsProcessingReceipt(true);
    toast.info("🤖 Analyzing receipt with AI...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result?.toString().split(',')[1];
      if (!base64String) { setIsProcessingReceipt(false); return; }

      try {
        const { data, error } = await supabase.functions.invoke<ExtractedData>('process-receipt', { 
            body: { 
                image: base64String,
                organizationName: organizationName 
            } 
        });
        if (error) throw error;
        
        // --- THIS IS THE MOST IMPORTANT SPY ---
        console.log("FINAL PROOF: Data received from backend:", data);
        
        setExpenseData(prevData => {
            const updatedData = { ...prevData };
            
            if (data.vendor) updatedData.vendor = data.vendor;
            if (data.description) updatedData.description = data.description;
            if (data.category) updatedData.category = data.category;
            if (data.paymentMethod) updatedData.paymentMethod = data.paymentMethod;
            if (data.rawText) updatedData.notes = data.rawText;

            if (data.amount != null && typeof data.amount === 'number') {
              updatedData.amount = data.amount.toString();
              updatedData.displayAmount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(data.amount);
            }
            if (data.date) {
              try {
                const parts = data.date.match(/(\d+)/g);
                if (parts && parts.length === 3) {
                  const [day, month, year] = parts;
                  const fullYear = year.length === 4 ? year : `20${year}`;
                  const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  if (!isNaN(new Date(isoDate).getTime())) {
                    updatedData.date = isoDate;
                  }
                }
              } catch (e) { console.error("Could not parse date:", data.date); }
            }
            return updatedData;
        });

        toast.success("✅ Receipt analyzed! Please review.");

      } catch (err: any) {
        toast.error(`Could not read receipt: ${err.message}`);
      } finally {
        setIsProcessingReceipt(false);
      }
    };
  };
  
  // No changes below this line are needed. I am including the full code for completeness.
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    let display = '';
    if (rawValue) {
      const num = parseFloat(rawValue);
      display = !isNaN(num) ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num) : rawValue;
    }
    setExpenseData(prev => ({ ...prev, amount: rawValue, displayAmount: display }));
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, file);
      if (uploadError) { throw new Error(uploadError.message); }
      const { data, error: signedUrlError } = await supabase.storage.from('receipts').createSignedUrl(filePath, 365 * 24 * 60 * 60);
      if (signedUrlError || !data?.signedUrl) { throw new Error('Failed to generate signed URL.'); }
      return data.signedUrl;
    } catch (error: any) {
      toast.error(`Receipt upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated === false) { toast.error('Authentication required.'); return; }
    if (!expenseData.description.trim()) { toast.error('Description is required.'); return; }
    if (!expenseData.date) { toast.error('Date is required.'); return; }
    if (!expenseData.amount || isNaN(parseFloat(expenseData.amount)) || parseFloat(expenseData.amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    let finalReceiptUrl: string | undefined = expenseData.receiptUrl;
    if (expenseData.fileToUpload) {
      const uploadedUrl = await uploadReceipt(expenseData.fileToUpload);
      if (!uploadedUrl) { return; }
      finalReceiptUrl = uploadedUrl;
    }

    const dataToSave = {
      category: expenseData.category,
      description: expenseData.description,
      date: expenseData.date,
      amount: parseFloat(expenseData.amount),
      paymentMethod: expenseData.paymentMethod,
      vendor: expenseData.vendor || undefined,
      notes: expenseData.notes || undefined,
      receiptUrl: finalReceiptUrl,
    };

    try {
      if (expense) {
        await updateExpense(expense.id, dataToSave);
        toast.success('Expense updated successfully.');
      } else {
        await addExpense(dataToSave);
        toast.success('Expense added successfully.');
      }
      onClose();
    } catch (error: any) {
      toast.error(`Failed to save expense: ${error.message}`);
    }
  };

  if (isAuthenticated === null) { return <div>Loading...</div>; }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={expenseData.category} 
              onValueChange={(value) => setExpenseData(prev => ({ ...prev, category: value as ExpenseCategory }))}
            >
              <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description"
              placeholder="Expense description"
              value={expenseData.description}
              onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="vendor">Vendor/Supplier</Label>
            <Input 
              id="vendor"
              placeholder="Vendor name"
              value={expenseData.vendor}
              onChange={(e) => setExpenseData(prev => ({ ...prev, vendor: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date"
              type="date"
              className="w-full"
              value={expenseData.date}
              onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="amount"
                type="text"
                placeholder="0.00"
                className="pl-10"
                value={expenseData.displayAmount}
                onChange={handleAmountChange}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select 
              value={expenseData.paymentMethod} 
              onValueChange={(value) => setExpenseData(prev => ({ ...prev, paymentMethod: value as PaymentMethod }))}
            >
              <SelectTrigger id="paymentMethod"><SelectValue placeholder="Select payment method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Debit Card">Debit Card</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes"
          rows={3}
          value={expenseData.notes}
          onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="receipt">Upload Receipt</Label>
        <div className="mt-1 flex items-center">
          <label 
            htmlFor="receipt" 
            className={`flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-muted ${isProcessingReceipt || isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isProcessingReceipt ? ( <RefreshCw className="h-4 w-4 animate-spin" /> ) : ( <Upload className="h-4 w-4 text-muted-foreground" /> )}
            <span className="text-sm">Choose file</span>
          </label>
          <Input 
            id="receipt"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading || isProcessingReceipt}
          />
          <span className="ml-3 text-sm text-muted-foreground">
            {isProcessingReceipt ? 'Scanning...' : isUploading ? 'Uploading...' : expenseData.fileToUpload ? expenseData.fileToUpload.name : expenseData.receiptUrl ? 'Receipt uploaded' : 'No file selected'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: JPEG, PNG, PDF. Max size: 5MB
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isProcessingReceipt || isUploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isProcessingReceipt || isUploading}>
          {isProcessingReceipt ? 'Processing...' : (expense ? 'Update Expense' : 'Save Expense')}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;