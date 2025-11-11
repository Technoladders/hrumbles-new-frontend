import { create } from 'zustand';
import { toast } from 'sonner';
import { formatINR } from '@/utils/currency';
import { generateCSV, formatDateForFilename } from '@/utils/export-utils';
import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue' | 'Draft';
export type ExpenseCategory = 'Professional Services' | 'Food' | 'Travel' | 'Office Supplies' | 'Software' | 'Hardware' | 'Utilities' | 'Marketing' | 'Rent' | 'Salary' | 'Other';
export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'UPI' | 'Check' | 'Other';

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  clientName: string;
  currency: 'USD' | 'INR';
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  totalAmount: number;
  notes?: string;
  terms?: string;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  adjustments?: number;
  paidAmount?: number;
  paymentDate?: string;
  organizationId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
  organizationId?: string;
}

export interface Client {
  id: string;
  client_name: string;
  display_name: string;
  currency: 'USD' | 'INR';
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  notes?: string;
  vendor?: string;
  vendorAddress?: string;
  invoiceNumber?: string;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  hsn?: string;
  sac?: string;
  gstin?: string; 
  organizationId?: string;
  createdBy?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  reconciliation_status: 'matched' | 'suggested' | 'unmatched';
}

export interface AccountsStats {
  totalInvoiced: number;
  totalPaid: number;
  totalOverdue: number;
  totalDraft: number;
  totalExpenses: number;
  netProfit: number;
  invoiceCount: {
    all: number;
    paid: number;
    unpaid: number;
    overdue: number;
    draft: number;
  };
}

interface AccountsState {
  invoices: Invoice[];
  expenses: Expense[];
  clients: Client[];
  stats: AccountsStats;
  selectedInvoice: Invoice | null;
  selectedExpense: Expense | null;

  // Invoice actions
  fetchInvoices: (timeFilter?: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  selectInvoice: (id: string | null) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  exportInvoice: (id: string, format: 'pdf' | 'csv') => void;
  fetchClients: () => Promise<void>;

  // Expense actions
  fetchExpenses: (timeFilter?: string) => Promise<void>;
  addExpense: (expense: Partial<Omit<Expense, 'id'>>) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>, receiptFile?: File) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  selectExpense: (id: string | null) => void;
  uploadReceipt: (id: string, receiptFile: File) => Promise<void>;

  // Report actions
  generateReport: (type: 'invoices' | 'expenses', dateRange: { start: string; end: string }) => void;
  exportData: (type: 'invoices' | 'expenses', format: 'csv') => void;
}

// Helper function to format USD amounts
const formatUSD = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to convert "DD-MM-YYYY" to "YYYY-MM-DD" for Supabase
const parseDate = (dateString: string): string => {
  // Expect date in YYYY-MM-DD format from the form
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (!dateRegex.test(dateString)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date.');
  }

  return dateObj.toISOString().split('T')[0]; // Ensure YYYY-MM-DD
};

// Helper function to convert "YYYY-MM-DD" from Supabase to "DD-MM-YYYY"
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const USD_TO_INR_RATE = 84;

const calculateStats = (invoices: Invoice[], expenses: Expense[]): AccountsStats => {
  const totalInvoiced = invoices.reduce((total, inv) => {
    return total + (inv.currency === 'USD' ? inv.totalAmount * USD_TO_INR_RATE : inv.totalAmount);
  }, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((total, inv) => {
      return total + (inv.currency === 'USD' ? (inv.paidAmount || inv.totalAmount) * USD_TO_INR_RATE : (inv.paidAmount || inv.totalAmount));
    }, 0);
  const totalOverdue = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((total, inv) => {
      return total + (inv.currency === 'USD' ? inv.totalAmount * USD_TO_INR_RATE : inv.totalAmount);
    }, 0);
  const totalDraft = invoices
    .filter((inv) => inv.status === 'Draft')
    .reduce((total, inv) => {
      return total + (inv.currency === 'USD' ? inv.totalAmount * USD_TO_INR_RATE : inv.totalAmount);
    }, 0);
  const totalExpenses = expenses.reduce((total, exp) => total + exp.amount, 0);

  return {
    totalInvoiced,
    totalPaid,
    totalOverdue,
    totalDraft,
    totalExpenses,
    netProfit: totalPaid - totalExpenses,
    invoiceCount: {
      all: invoices.length,
      paid: invoices.filter((inv) => inv.status === 'Paid').length,
      unpaid: invoices.filter((inv) => inv.status === 'Unpaid').length,
      overdue: invoices.filter((inv) => inv.status === 'Overdue').length,
      draft: invoices.filter((inv) => inv.status === 'Draft').length,
    },
  };
};

export const useAccountsStore = create<AccountsState>((set, get) => ({
  invoices: [],
  expenses: [],
  clients: [],
  stats: {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOverdue: 0,
    totalDraft: 0,
    totalExpenses: 0,
    netProfit: 0,
    invoiceCount: { all: 0, paid: 0, unpaid: 0, overdue: 0, draft: 0 },
  },
  selectedInvoice: null,
  selectedExpense: null,

  fetchClients: async () => {
    try {
      console.log('Fetching clients from hr_clients...');
      const { data, error } = await supabase
        .from('hr_clients')
        .select('id, client_name, display_name, currency')
        .eq('status', 'active')
        .order('client_name', { ascending: true });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Error fetching clients: ${error.message}`);
      }

      console.log('Raw data from Supabase:', data);
      const clients: Client[] = data.map((client: any) => ({
        id: client.id,
        client_name: client.client_name,
        display_name: client.display_name,
        currency: client.currency,
      }));

      console.log('Mapped clients:', clients);
      set({ clients });
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to fetch clients. Please try again.');
    }
  },

  fetchInvoices: async (timeFilter = 'all') => {
    try {
      let query = supabase
        .from('hr_invoices')
        .select('*, hr_clients!hr_invoices_client_id_fkey(client_name, display_name, currency)')
        .order('created_at', { ascending: false });

      // Apply time filter
      const now = new Date();
      if (timeFilter === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.gte('invoice_date', today).lte('invoice_date', today);
      } else if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('invoice_date', oneWeekAgo);
      } else if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('invoice_date', oneMonthAgo);
      } else if (timeFilter === 'year') {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('invoice_date', oneYearAgo);
      }

      const { data: invoicesData, error: invoicesError } = await query;

      if (invoicesError) {
        throw new Error(`Error fetching invoices: ${invoicesError.message}`);
      }

      if (!invoicesData || invoicesData.length === 0) {
        set({
          invoices: [],
          stats: calculateStats([], get().expenses),
        });
        return;
      }

      // Fetch items for all invoices
      const invoiceIds = invoicesData.map((invoice: any) => invoice.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('hr_invoice_items')
        .select('*')
        .in('invoice_id', invoiceIds);

      if (itemsError) {
        throw new Error(`Error fetching invoice items: ${itemsError.message}`);
      }

      // Map Supabase data to Invoice type
      const invoices: Invoice[] = invoicesData.map((invoice: any) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.hr_clients?.client_name || invoice.client_name,
        clientId: invoice.client_id,
        currency: invoice.currency || 'INR', // Default to INR if not set
        invoiceDate: formatDate(invoice.invoice_date),
        dueDate: formatDate(invoice.due_date),
        status: invoice.status as InvoiceStatus,
        totalAmount: invoice.total_amount,
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        taxRate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        subtotal: invoice.subtotal,
        paidAmount: invoice.paid_amount,
        paymentDate: invoice.payment_date ? formatDate(invoice.payment_date) : undefined,
        items: itemsData
          .filter((item: any) => item.invoice_id === invoice.id)
          .map((item: any) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            taxable: item.taxable || false,
            organizationId: item.organization_id,
          })),
        organizationId: invoice.organization_id || undefined,
        createdBy: invoice.created_by || undefined,
        createdAt: invoice.created_at || undefined,
        updatedAt: invoice.updated_at || undefined,
      }));

      set({
        invoices,
        stats: calculateStats(invoices, get().expenses),
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices. Please try again.');
    }
  },

  addInvoice: async (invoice) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.warn('User not authenticated, setting created_by to null');
      }

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id, userId } = authData;

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('hr_invoices')
        .insert({
          invoice_number: invoice.invoiceNumber,
          client_name: invoice.clientName,
          client_id: invoice.clientId,
          currency: invoice.currency,
          invoice_date: parseDate(invoice.invoiceDate),
          due_date: parseDate(invoice.dueDate),
          subtotal: invoice.subtotal || 0,
          tax_rate: invoice.taxRate || 0,
          tax_amount: invoice.taxAmount || 0,
          total_amount: invoice.totalAmount || 0,
          status: invoice.status || 'Draft',
          notes: invoice.notes,
          terms: invoice.terms,
          created_by: userData?.user?.id || null,
          paid_amount: invoice.status === 'Paid' ? invoice.totalAmount : 0,
          payment_date: invoice.status === 'Paid' ? new Date().toISOString().split('T')[0] : null,
          organization_id: organization_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Error adding invoice: ${invoiceError.message}`);
      }

      const itemsToInsert = invoice.items.map((item) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        taxable: item.taxable || false,
        organization_id: organization_id,
      }));

      const { error: itemsError } = await supabase
        .from('hr_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        await supabase.from('hr_invoices').delete().eq('id', newInvoice.id);
        throw new Error(`Error adding invoice items: ${itemsError.message}`);
      }

      await get().fetchInvoices();
      toast.success(`Invoice ${invoice.invoiceNumber} added successfully`);
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast.error('Failed to add invoice. Please try again.');
    }
  },

  updateInvoice: async (id, data) => {
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;

      const updateData: any = {};
      if (data.invoiceNumber) updateData.invoice_number = data.invoiceNumber;
      if (data.clientName) updateData.client_name = data.clientName;
      if (data.clientId) updateData.client_id = data.clientId;
      if (data.currency) updateData.currency = data.currency;
      if (data.invoiceDate) updateData.invoice_date = parseDate(data.invoiceDate);
      if (data.dueDate) updateData.due_date = parseDate(data.dueDate);
      if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
      if (data.taxRate !== undefined) updateData.tax_rate = data.taxRate;
      if (data.taxAmount !== undefined) updateData.tax_amount = data.taxAmount;
      if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.terms !== undefined) updateData.terms = data.terms;
      if (data.organizationId !== undefined) updateData.organization_id = data.organizationId;
      if (data.status === 'Paid') {
        updateData.paid_amount = data.totalAmount || get().invoices.find((inv) => inv.id === id)?.totalAmount || 0;
        updateData.payment_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_amount = 0;
        updateData.payment_date = null;
      }
      updateData.updated_at = new Date().toISOString();

      const { error: invoiceError } = await supabase
        .from('hr_invoices')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organization_id);

      if (invoiceError) {
        throw new Error(`Error updating invoice: ${invoiceError.message}`);
      }

      if (data.items) {
        const { error: deleteItemsError } = await supabase
          .from('hr_invoice_items')
          .delete()
          .eq('invoice_id', id)
          .eq('organization_id', organization_id);

        if (deleteItemsError) {
          throw new Error(`Error deleting existing items: ${deleteItemsError.message}`);
        }

        const itemsToInsert = data.items.map((item) => ({
          invoice_id: id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          taxable: item.taxable || false,
          organization_id: organization_id,
        }));

        const { error: itemsError } = await supabase
          .from('hr_invoice_items')
          .insert(itemsToInsert);

        if (itemsError) {
          throw new Error(`Error updating invoice items: ${itemsError.message}`);
        }
      }

      await get().fetchInvoices();
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice. Please try again.');
    }
  },

  deleteInvoice: async (id) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('You must be signed in to delete an invoice.');
      }

      console.log('Authenticated User ID:', userData.user.id);
      console.log('Attempting to delete invoice with ID:', id);

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id, userId } = authData;

      const { data: invoiceData, error: fetchInvoiceError } = await supabase
        .from('hr_invoices')
        .select('*')
        .eq('id', id)
        // .eq('created_by', userData.user.id)
        .eq('organization_id', organization_id)
        .single();

      if (fetchInvoiceError) {
        if (fetchInvoiceError.code === 'PGRST116') {
          throw new Error('Invoice not found or you do not have permission to delete it.');
        }
        throw new Error(`Error fetching invoice: ${fetchInvoiceError.message}`);
      }

      if (!invoiceData) {
        throw new Error('Invoice not found or you do not have permission to delete it.');
      }

      const { data: itemsData, error: fetchItemsError } = await supabase
        .from('hr_invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .eq('organization_id', organization_id);

      if (fetchItemsError) {
        throw new Error(`Error fetching invoice items: ${fetchItemsError.message}`);
      }

      const { error: backupInvoiceError } = await supabase
        .from('backup_invoices')
        .insert({
          id: invoiceData.id,
          invoice_number: invoiceData.invoice_number,
          client_name: invoiceData.client_name,
          client_id: invoiceData.client_id,
          currency: invoiceData.currency,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          subtotal: invoiceData.subtotal,
          tax_rate: invoiceData.tax_rate,
          tax_amount: invoiceData.tax_amount,
          total_amount: invoiceData.total_amount,
          status: invoiceData.status,
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          created_at: invoiceData.created_at,
          updated_at: invoiceData.updated_at,
          organization_id: organization_id,
          created_by: invoiceData.created_by,
          paid_amount: invoiceData.paid_amount,
          payment_date: invoiceData.payment_date,
          deleted_at: new Date().toISOString(),
        });

      if (backupInvoiceError) {
        throw new Error(`Error backing up invoice: ${backupInvoiceError.message}`);
      }

      if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map((item: any) => ({
          id: item.id,
          invoice_id: item.invoice_id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          taxable: item.taxable,
          created_at: item.created_at,
          deleted_at: new Date().toISOString(),
          organization_id: organization_id,
        }));

        const { error: backupItemsError } = await supabase
          .from('backup_invoice_items')
          .insert(itemsToInsert);

        if (backupItemsError) {
          await supabase
            .from('backup_invoices')
            .delete()
            .eq('id', id);
          throw new Error(`Error backing up invoice items: ${backupItemsError.message}`);
        }
      }

      const { error: deleteError } = await supabase
        .from('hr_invoices')
        .delete()
        .eq('id', id)
        // .eq('created_by', userData.user.id)
        .eq('organization_id', organization_id);

      if (deleteError) {
        await supabase
          .from('backup_invoices')
          .delete()
          .eq('id', id);
        await supabase
          .from('backup_invoice_items')
          .delete()
          .eq('invoice_id', id);
        throw new Error(`Error deleting invoice: ${deleteError.message}`);
      }

      await get().fetchInvoices();
      set((state) => ({
        selectedInvoice: state.selectedInvoice?.id === id ? null : state.selectedInvoice,
      }));

      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice. Please try again.');
    }
  },

  selectInvoice: (id) => {
    set((state) => ({
      selectedInvoice: id ? state.invoices.find((inv) => inv.id === id) || null : null,
    }));
  },

  updateInvoiceStatus: async (id, status) => {
    try {
      const invoice = get().invoices.find((inv) => inv.id === id);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;

      const updateData: any = { status };
      if (status === 'Paid') {
        updateData.paid_amount = invoice.totalAmount;
        updateData.payment_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.paid_amount = 0;
        updateData.payment_date = null;
      }
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('hr_invoices')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organization_id);

      if (error) {
        throw new Error(`Error updating invoice status: ${error.message}`);
      }

      await get().fetchInvoices();
      set((state) => ({
        selectedInvoice: state.selectedInvoice?.id === id
          ? { ...state.selectedInvoice, status, paidAmount: status === 'Paid' ? invoice.totalAmount : 0 }
          : state.selectedInvoice,
      }));
      toast.success(`Invoice status updated to ${status}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status. Please try again.');
    }
  },

  exportInvoice: (id, format) => {
    try {
      const invoice = get().invoices.find((inv) => inv.id === id);
      if (!invoice) {
        toast.error('Invoice not found');
        return;
      }

      if (format === 'csv') {
        const invoiceData = [
          ['Invoice Number', 'Client Name', 'Currency', 'Invoice Date', 'Due Date', 'Status', 'Total Amount'],
          [
            invoice.invoiceNumber,
            invoice.clientName,
            invoice.currency,
            invoice.invoiceDate,
            invoice.dueDate,
            invoice.status,
            invoice.currency === 'USD' ? formatUSD(invoice.totalAmount) : formatINR(invoice.totalAmount),
          ],
          ['Item Description', 'Quantity', 'Rate', 'Amount'],
          ...invoice.items.map((item) => [
            item.description,
            item.quantity,
            invoice.currency === 'USD' ? formatUSD(item.rate) : formatINR(item.rate),
            invoice.currency === 'USD' ? formatUSD(item.amount) : formatINR(item.amount),
          ]),
        ];

        generateCSV(invoiceData, `invoice_${invoice.invoiceNumber}_${formatDateForFilename()}`);
        toast.success('Invoice exported as CSV');
      } else {
        toast.info('PDF export will be handled by the component');
      }
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast.error('Failed to export invoice. Please try again.');
    }
  },

  fetchExpenses: async (timeFilter = 'all') => {
    try {
      let query = supabase
        .from('hr_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      const now = new Date();
      if (timeFilter === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.gte('date', today).lte('date', today);
      } else if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('date', oneWeekAgo);
      } else if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('date', oneMonthAgo);
      } else if (timeFilter === 'year') {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        query = query.gte('date', oneYearAgo);
      }

      const { data: expensesData, error: expensesError } = await query;

      if (expensesError) {
        throw new Error(`Error fetching expenses: ${expensesError.message}`);
      }

      if (!expensesData || expensesData.length === 0) {
        set({
          expenses: [],
          stats: calculateStats(get().invoices, []),
        });
        return;
      }

      // --- FIX: THIS IS THE CORRECTED MAPPING ---
      const expenses: Expense[] = expensesData.map((expense: any) => ({
        id: expense.id,
        category: expense.category as ExpenseCategory,
        description: expense.description,
        date: expense.date,
        amount: expense.amount,
        paymentMethod: expense.payment_method as PaymentMethod,
        receiptUrl: expense.receipt_url || undefined,
        notes: expense.notes || undefined,
        vendor: expense.vendor || undefined,
        
        // --- Map all missing fields from snake_case to camelCase ---
        vendorAddress: expense.vendor_address || undefined,
        invoiceNumber: expense.invoice_number || undefined,
        taxableAmount: expense.taxable_amount,
        cgst: expense.cgst,
        sgst: expense.sgst,
        hsn: expense.hsn || undefined,
        sac: expense.sac || undefined,
        gstin: expense.gstin || undefined,

        organizationId: expense.organization_id || undefined,
        createdBy: expense.created_by || undefined,
        status: expense.status || undefined,
        createdAt: expense.created_at || undefined,
        updatedAt: expense.updated_at || undefined,

         reconciliation_status: expense.reconciliation_status || 'unmatched',
      }));
      // --- END OF FIX ---
        


      set({
        expenses,
        stats: calculateStats(get().invoices, expenses),
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses. Please try again.');
    }
  },

  addExpense: async (expense: Partial<Omit<Expense, 'id'>>) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('You must be signed in to add an expense.');
      }

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;
      
      // --- FIX: THIS IS THE CORRECTED DATA OBJECT FOR INSERTION ---
      const expenseData = {
        category: expense.category,
        description: expense.description,
        date: expense.date ? parseDate(expense.date) : new Date().toISOString().split('T')[0],
        amount: expense.amount,
        payment_method: expense.paymentMethod,
        receipt_url: expense.receiptUrl || null,
        notes: expense.notes || null,
        vendor: expense.vendor || null,
        created_by: userData.user.id,
        status: 'Pending',
        organization_id: organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        // --- Map all missing fields from camelCase to snake_case ---
        vendor_address: expense.vendorAddress || null,
        invoice_number: expense.invoiceNumber || null,
        taxable_amount: expense.taxableAmount || null,
        cgst: expense.cgst || null,
        sgst: expense.sgst || null,
        hsn: expense.hsn || null,
        sac: expense.sac || null,
        gstin: expense.gstin || null,

      };
      // --- END OF FIX ---

      const { error: expenseError } = await supabase
        .from('hr_expenses')
        .insert(expenseData);

      if (expenseError) {
        throw new Error(`Error adding expense: ${expenseError.message}`);
      }

      await get().fetchExpenses();
      toast.success(`Expense for ${expense.description} added successfully`);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense. Please try again.');
    }
  },
  
  updateExpense: async (id, data, receiptFile) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('You must be signed in to update an expense.');
      }

      let receiptUrl = data.receiptUrl;
      if (receiptFile) {
        const fileName = `${Date.now()}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Error uploading receipt: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData.publicUrl;
      }

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;

      // --- FIX: THIS IS THE CORRECTED DATA OBJECT FOR UPDATING ---
      const updateData: any = {};
      if (data.category) updateData.category = data.category;
      if (data.description) updateData.description = data.description;
      if (data.date) updateData.date = parseDate(data.date);
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.paymentMethod) updateData.payment_method = data.paymentMethod;
      if (receiptUrl !== undefined) updateData.receipt_url = receiptUrl || null;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.status !== undefined) updateData.status = data.status;

      // --- Map all missing fields from camelCase to snake_case for update ---
      if (data.vendorAddress !== undefined) updateData.vendor_address = data.vendorAddress;
      if (data.invoiceNumber !== undefined) updateData.invoice_number = data.invoiceNumber;
      if (data.taxableAmount !== undefined) updateData.taxable_amount = data.taxableAmount;
      if (data.cgst !== undefined) updateData.cgst = data.cgst;
      if (data.sgst !== undefined) updateData.sgst = data.sgst;
      if (data.hsn !== undefined) updateData.hsn = data.hsn;
      if (data.sac !== undefined) updateData.sac = data.sac;
      if (data.gstin !== undefined) updateData.gstin = data.gstin; 
      
      updateData.updated_at = new Date().toISOString();
      // --- END OF FIX ---

      const { error } = await supabase
        .from('hr_expenses')
        .update(updateData)
        .eq('id', id)
        .eq('created_by', userData.user.id)
        .eq('organization_id', organization_id);

      if (error) {
        throw new Error(`Error updating expense: ${error.message}`);
      }

      await get().fetchExpenses();
      set((state) => ({
        selectedExpense: state.selectedExpense?.id === id
          ? { ...state.selectedExpense, ...data, receiptUrl }
          : state.selectedExpense,
      }));
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(error.message || 'Failed to update expense. Please try again.');
    }
  },

deleteExpense: async (id: string) => {
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) throw new Error('Authentication data not found.');
      const { organization_id } = authData;

      // Step 1: Fetch the expense to backup WITHOUT using .single()
      const { data: expenseDataArray, error: fetchError } = await supabase
        .from('hr_expenses')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization_id);

      if (fetchError) {
        // This is a real database error
        throw new Error(`Database error: ${fetchError.message}`);
      }

      // If no expense is found, it's likely already deleted. Exit gracefully.
      if (!expenseDataArray || expenseDataArray.length === 0) {
        console.warn(`Expense with ID ${id} not found for deletion. It might already be deleted.`);
        await get().fetchExpenses(); // Refresh state just in case
        return; 
      }
      const expenseData = expenseDataArray[0];

      // Step 2: Backup the expense
      const { error: backupError } = await supabase.from('backup_expenses').insert({
        ...expenseData, // Use spread operator for cleaner backup
        deleted_at: new Date().toISOString(),
      });

      if (backupError) {
        throw new Error(`Backup failed: ${backupError.message}`);
      }

      // Step 3: Delete the original expense from the database
      const { error: deleteError } = await supabase
        .from('hr_expenses')
        .delete()
        .match({ id: id, organization_id: organization_id }); // Use .match for safety

      if (deleteError) {
        // Attempt to roll back the backup if the deletion fails
        await supabase.from('backup_expenses').delete().eq('id', id);
        throw new Error(`Deletion failed: ${deleteError.message}`);
      }
      
      // Step 4: Update local state and show success message
      await get().fetchExpenses();
      toast.success('Expense deleted successfully');

    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast.error(error.message || 'Failed to delete expense.');
      // Rethrow the error so it can be caught by the calling UI component if needed
      throw error;
    }
  },

  selectExpense: (id) => {
    set((state) => ({
      selectedExpense: id ? state.expenses.find((exp) => exp.id === id) || null : null,
    }));
  },

  uploadReceipt: async (id, receiptFile) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('You must be signed in to upload a receipt.');
      }

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;

      const fileName = `${Date.now()}-${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, { upsert: true });

      if (uploadError) {
        throw new Error(`Error uploading receipt: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const receiptUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('hr_expenses')
        .update({ receipt_url: receiptUrl, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('created_by', userData.user.id)
        .eq('organization_id', organization_id);

      if (updateError) {
        throw new Error(`Error updating receipt: ${updateError.message}`);
      }

      await get().fetchExpenses();
      set((state) => ({
        selectedExpense: state.selectedExpense?.id === id
          ? { ...state.selectedExpense, receiptUrl }
          : state.selectedExpense,
      }));
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error(error.message || 'Failed to upload receipt. Please try again.');
    }
  },

  generateReport: (type, dateRange) => {
    try {
      toast.info(`Report for ${type} from ${dateRange.start} to ${dateRange.end} would be generated here`);
      console.log(`Report requested for ${type} from ${dateRange.start} to ${dateRange.end}`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    }
  },

  exportData: (type, format) => {
    try {
      if (format === 'csv') {
        if (type === 'invoices') {
          const invoicesData = [
            ['Invoice Number', 'Client Name', 'Currency', 'Invoice Date', 'Due Date', 'Status', 'Total Amount'],
            ...get().invoices.map((inv) => [
              inv.invoiceNumber,
              inv.clientName,
              inv.currency,
              inv.invoiceDate,
              inv.dueDate,
              inv.status,
              inv.currency === 'USD' ? formatUSD(inv.totalAmount) : formatINR(inv.totalAmount),
            ]),
          ];

          generateCSV(invoicesData, `invoices_export_${formatDateForFilename()}`);
        } else {
          const expensesData = [
            ['Category', 'Description', 'Date', 'Amount', 'Payment Method', 'Vendor'],
            ...get().expenses.map((exp) => [
              exp.category,
              exp.description,
              exp.date,
              formatINR(exp.amount),
              exp.paymentMethod,
              exp.vendor || '',
            ]),
          ];

          generateCSV(expensesData, `expenses_export_${formatDateForFilename()}`);
        }

        toast.success(`${type} exported as CSV`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data. Please try again.');
    }
  },
}));