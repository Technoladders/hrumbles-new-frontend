import React, { useState, useEffect } from 'react';
import { useAccountsStore, ExpenseCategory, PaymentMethod } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IndianRupee, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExpenseFormProps {
  expense?: {
    id: string;
    category: ExpenseCategory;
    description: string;
    date: string;
    amount: number;
    paymentMethod: PaymentMethod;
    receiptUrl?: string;
    notes?: string;
    vendor?: string;
    organizationId?: string;
    createdBy?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onClose }) => {
  const { addExpense, updateExpense } = useAccountsStore();

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || 'Office Supplies');
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState<string>(
    expense?.date || new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<string>(expense?.amount?.toString() || '');
  const [displayAmount, setDisplayAmount] = useState<string>(
    expense?.amount
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(expense.amount)
      : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod || 'Cash');
  const [vendor, setVendor] = useState(expense?.vendor || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [receiptUrl, setReceiptUrl] = useState(expense?.receiptUrl || '');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        setIsAuthenticated(false);
        toast.error('You must be signed in to add or update expenses.');
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  // Handle file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (!validTypes.includes(file.type)) {
        toast.error('Unsupported file type. Please upload JPEG, PNG, or PDF.');
        return;
      }
      if (file.size > maxSize) {
        toast.error('File size exceeds 5MB limit.');
        return;
      }
      setFileToUpload(file);
      setReceiptUrl(''); // Clear previous receipt URL until upload is complete
    } else {
      setFileToUpload(null);
      setReceiptUrl(expense?.receiptUrl || '');
    }
  };

  // Handle amount input (remove INR formatting for raw number)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove non-numeric characters except decimal point
    const rawValue = value.replace(/[^0-9.]/g, '');
    setAmount(rawValue);
    // Format for display
    if (rawValue) {
      const num = parseFloat(rawValue);
      if (!isNaN(num)) {
        setDisplayAmount(
          new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num)
        );
      } else {
        setDisplayAmount(value);
      }
    } else {
      setDisplayAmount('');
    }
  };

  // Upload file to Supabase storage and get signed URL
  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      console.log('Uploading file:', fileName, 'to path:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError.message);
        toast.error(`Failed to upload receipt: ${uploadError.message}`);
        return null;
      }

      console.log('Upload successful:', uploadData);

      let retries = 3;
      let listData: any[] = [];
      let listError: any = null;

      while (retries > 0) {
        const result = await supabase.storage
          .from('receipts')
          .list('receipts', { search: fileName });

        listData = result.data || [];
        listError = result.error;

        if (listError) {
          console.error('Error listing files in bucket:', listError);
          retries--;
          if (retries === 0) {
            toast.error('Failed to verify the uploaded file in the bucket.');
            return null;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        console.log('Files found in bucket:', listData.map(file => file.name));

        if (listData.some(f => f.name === fileName)) {
          break;
        }

        retries--;
        if (retries === 0) {
          console.error('File not found in bucket after upload:', fileName);
          toast.error('File upload succeeded, but the file was not found in the bucket.');
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('File verified in bucket:', fileName);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1-year expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('Failed to generate signed URL:', signedUrlError?.message);
        toast.error('Failed to generate signed URL for the receipt.');
        return null;
      }

      console.log('Signed URL:', signedUrlData.signedUrl);
      return signedUrlData.signedUrl;
    } catch (error: any) {
      console.error('Error uploading receipt:', error.message);
      toast.error(`An error occurred while uploading the receipt: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAuthenticated === false) {
      toast.error('Authentication required. Please sign in to continue.');
      return;
    }

    if (!description.trim()) {
      toast.error('Description is required.');
      return;
    }

    if (!date) {
      toast.error('Date is required.');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0.');
      return;
    }

    let finalReceiptUrl: string | undefined = receiptUrl;

    if (fileToUpload) {
      console.log('New file selected for upload:', fileToUpload.name);
      const uploadedUrl = await uploadReceipt(fileToUpload);
      if (!uploadedUrl) {
        toast.error('Failed to upload receipt. Please try again.');
        return;
      }
      finalReceiptUrl = uploadedUrl;
    } else if (!fileToUpload && !receiptUrl && expense?.receiptUrl) {
      finalReceiptUrl = expense.receiptUrl;
    } else if (!fileToUpload && !receiptUrl) {
      finalReceiptUrl = undefined;
    }

    const expenseData = {
      category,
      description,
      date, // Already in YYYY-MM-DD format
      amount: parseFloat(amount), // Send raw number
      paymentMethod,
      vendor: vendor || undefined,
      notes: notes || undefined,
      receiptUrl: finalReceiptUrl,
    };

    try {
      if (expense) {
        await updateExpense(expense.id, expenseData);
        toast.success('Expense updated successfully.');
      } else {
        await addExpense(expenseData);
        toast.success('Expense added successfully.');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving expense:', error.message);
      toast.error(`Failed to save expense: ${error.message}`);
    }
  };

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={category} 
              onValueChange={(value) => setCategory(value as ExpenseCategory)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="vendor">Vendor/Supplier</Label>
            <Input 
              id="vendor"
              placeholder="Vendor name"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Input 
                id="date"
                type="date"
                className="w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
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
                value={displayAmount}
                onChange={handleAmountChange}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="receipt">Upload Receipt</Label>
        <div className="mt-1 flex items-center">
          <label 
            htmlFor="receipt" 
            className="flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-muted"
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Choose file</span>
          </label>
          <Input 
            id="receipt"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <span className="ml-3 text-sm text-muted-foreground">
            {isUploading ? 'Uploading...' : fileToUpload ? fileToUpload.name : receiptUrl ? 'Receipt uploaded' : 'No file selected'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: JPEG, PNG, PDF. Max size: 5MB
        </p>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isUploading}>
          {expense ? 'Update Expense' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
// 