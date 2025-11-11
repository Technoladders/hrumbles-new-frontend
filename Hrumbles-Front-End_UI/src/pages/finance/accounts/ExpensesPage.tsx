import React, { useState, useEffect } from 'react';
import { useAccountsStore } from '@/lib/accounts-data';
import { useFinancialStore } from '@/lib/financial-data';
import AccountsLayout from '@/components/accounts/AccountsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Search, IndianRupee, Eye, Edit,
  Trash2, Download, Receipt, MoreVertical, RefreshCw, CheckCircle, Clock,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatINR } from '@/utils/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpenseForm from '@/components/accounts/ExpenseForm';
import ExpenseDetails from '@/components/accounts/ExpenseDetails';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { PayrollDrawer } from '@/components/financial/PayrollDrawer';
import PayslipViewer from '@/components/financial/PayslipViewer'
import { PayslipData } from '@/utils/payslip-extractor';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

type ReconciliationStatus = 'matched' | 'suggested' | 'unmatched';

const ExpensesPage: React.FC = () => {
  const {
    expenses,
    stats,
    fetchExpenses,
    deleteExpense,
    exportData
  } = useAccountsStore();

  const { payments, setPayments } = useFinancialStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('expense');
  const [activeSalaryCategory, setActiveSalaryCategory] = useState('Paid Salary');
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('last-month');
  const [isPayrollDrawerOpen, setIsPayrollDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);
  const [expenseItemsPerPage, setExpenseItemsPerPage] = useState(10);
  const [salaryCurrentPage, setSalaryCurrentPage] = useState(1);
  const [salaryItemsPerPage, setSalaryItemsPerPage] = useState(10);

  const navigate = useNavigate();

  const initialExpenseState = {
    category: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    displayAmount: '',
    paymentMethod: 'UPI',
    vendor: '',
    vendorAddress: '',
    notes: '',
    receiptUrl: '',
    fileToUpload: null,
    invoiceNumber: '',
    taxableAmount: '',
    cgst: '',
    sgst: '',
    hsn: '',
    sac: '',
    gstin: '',
  };

  // ===================================================================
  // RECONCILIATION STATUS BADGE FUNCTION
  // ===================================================================
  const getReconciliationStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'matched':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-green-700">Matched</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">✅ Reconciled</p>
                <p className="text-xs">Confirmed match with bank transaction</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'suggested':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 flex-shrink-0 animate-pulse" />
                  <span className="text-xs font-medium text-yellow-700">Pending</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">⚠️ Suggestion Available</p>
                <p className="text-xs">AI found a potential match - review in bank statement</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-600">Unmatched</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">⚪ Unmatched</p>
                <p className="text-xs">No bank transaction match found yet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  const [newExpenseData, setNewExpenseData] = useState(initialExpenseState);
  const [editExpenseData, setEditExpenseData] = useState<any>(initialExpenseState);

  const selectedExpense = selectedExpenseId
    ? expenses.find(exp => exp.id === selectedExpenseId)
    : null;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: userData, error } = await supabase.auth.getUser();
      if (error || !userData?.user) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  // ===================================================================
  // REALTIME LISTENER - Automatically refreshes when expenses change
  // ===================================================================
  useEffect(() => {
    if (isAuthenticated) {
      fetchExpenses();
      
      // Setup realtime subscription
      const channel = supabase
        .channel('expenses-realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'hr_expenses'
          },
          (payload) => {
            console.log('Expense changed:', payload);
            // Refetch expenses when any change occurs
            fetchExpenses();
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, fetchExpenses]);

  const updatePaymentStatus = async (payment: any) => {
    if (!payment?.payment_date) {
      return { ...payment, status: 'Pending' };
    }
    const paymentDate = new Date(payment.payment_date);
    if (isNaN(paymentDate.getTime())) {
      return { ...payment, status: 'Pending' };
    }
    const today = new Date();
    const isFutureMonth = paymentDate > today;
    if (payment.status === 'Success') {
      return payment;
    }
    if (isFutureMonth) {
      return { ...payment, status: 'Pending' };
    }
    return payment;
  };
 
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('payment_records').select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        setPayments([]);
        return [];
      }
      const fetchPaymentDetails = async (record: any) => {
        const { data: earningsData, error: earningsError } = await supabase.from('payment_earnings').select('*').eq('payment_id', record.id);
        const { data: deductionsData, error: deductionsError } = await supabase.from('payment_deductions').select('*').eq('payment_id', record.id);
        const { data: customEarnings, error: customEarningsError } = await supabase.from('payment_custom_earnings').select('*').eq('payment_id', record.id);
        const { data: customDeductions, error: customDeductionsError } = await supabase.from('payment_custom_deductions').select('*').eq('payment_id', record.id);
        if (earningsError || deductionsError || customEarningsError || customDeductionsError) {
          console.error('Error fetching payment details:', { earningsError, deductionsError, customEarningsError, customDeductionsError });
          return null;
        }
        const paymentDate = record.payment_date ? new Date(record.payment_date) : new Date();
        if (isNaN(paymentDate.getTime())) {
          paymentDate.setTime(new Date().getTime());
        }
        const payPeriod = paymentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const employeeName = record.employee_name || `Employee ${record.employee_id}`;
        const earnings = earningsData?.[0] || {};
        const deductions = deductionsData?.[0] || {};
        const payslipData = {
          employeeId: record.employee_id || 'N/A', employeeName: employeeName, designation: record.designation || 'N/A', payPeriod: payPeriod, payDate: paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), dateOfJoining: record.joining_date || null, paidDays: deductions.paid_days || 30, lopDays: deductions.lop_days || 0, ctc: (earnings.total_earnings || 0) * 12, basicSalary: earnings.basic_salary || 0, houseRentAllowance: earnings.house_rent_allowance || 0, conveyanceAllowance: earnings.conveyance_allowance || 0, medicalAllowance: 0, specialAllowance: earnings.fixed_allowance || 0, customEarnings: customEarnings?.map((e: any) => ({ name: e.name, amount: e.amount })) || [], totalEarnings: earnings.total_earnings || 0, providentFund: deductions.provident_fund || 0, professionalTax: deductions.professional_tax || 0, incomeTax: deductions.income_tax || 0, customDeductions: customDeductions?.map((d: any) => ({ name: d.name, amount: d.amount })) || [], loanDeduction: deductions.loan_deduction || 0, totalDeductions: deductions.total_deductions || 0, netPayable: record.payment_amount || 0,
        };
        let updatedRecord = { ...record, payslipData, employee_name: employeeName, designation: record.designation || 'N/A' };
        updatedRecord = await updatePaymentStatus(updatedRecord);
        return {
          id: updatedRecord.id, employeeId: updatedRecord.employee_id, employeeName: updatedRecord.employee_name, paymentDate: paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), paymentAmount: updatedRecord.payment_amount || 0, paymentCategory: updatedRecord.payment_category || 'Staff', status: updatedRecord.status, avatar: updatedRecord.avatar || '', designation: updatedRecord.designation, payslipData,
        };
      };
      const paymentPromises = data.map(fetchPaymentDetails);
      const paymentData = await Promise.all(paymentPromises);
      const validPaymentData = paymentData.filter((payment): payment is any => payment !== null);
      setPayments(validPaymentData);
      return validPaymentData;
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payment data');
      return [];
    } finally {
      setLoading(false);
    }
  };
 
  const fetchEmployeesFromPayments = async () => {
    try {
      const { data, error } = await supabase.from('payment_records').select('employee_id, employee_name, designation, joining_date').order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        return [];
      }
      const uniqueEmployees = Array.from(new Map(data.map(emp => [emp.employee_id, { employee_id: emp.employee_id, full_name: emp.employee_name || `Employee ${emp.employee_id}`, designation: emp.designation || 'N/A', joining_date: emp.joining_date || null, }])).values());
      return uniqueEmployees;
    } catch (error) {
      console.error('Error fetching employees from payment records:', error);
      toast.error('Failed to fetch employee data');
      return [];
    }
  };
 
  const fetchEmployeePaymentAmount = async (employeeId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.from('payment_records').select('payment_amount').eq('employee_id', employeeId).neq('payment_amount', 0).order('payment_date', { ascending: false }).limit(1);
      if (error) {
        return 0;
      }
      if (!data || data.length === 0) {
        return 0;
      }
      return data[0]?.payment_amount || 0;
    } catch (error) {
      return 0;
    }
  };
 
  const updatePaymentRecordsForEmployee = async (employeeId: string, updatedData: any) => {
    try {
      const { employee_name, designation, payment_amount, payment_category, joining_date } = updatedData;
      const { data: existingRecords, error: fetchError } = await supabase.from('payment_records').select('*').eq('employee_id', employeeId);
      if (fetchError) throw fetchError;
      if (!existingRecords || existingRecords.length === 0) return;
      const updatePromises = existingRecords.map(async (record) => {
        if (record.status === 'Success') return record;
        const joiningDate = joining_date ? new Date(joining_date) : null;
        const { error: updateError } = await supabase.from('payment_records').update({ employee_name: employee_name || record.employee_name, designation: designation || record.designation, payment_amount: payment_amount !== undefined ? payment_amount : record.payment_amount, payment_category: payment_category || record.payment_category, joining_date: joiningDate && !isNaN(joiningDate.getTime()) ? joiningDate.toISOString() : null, updated_at: new Date().toISOString(), }).eq('id', record.id);
        if (updateError) throw updateError;
      });
      await Promise.all(updatePromises);
      await fetchPayments();
      toast.success(`Updated payment records for ${employeeId}`);
    } catch (error) {
      console.error(`Error updating payment records for ${employeeId}:`, error);
      toast.error(`Failed to update records for ${employeeId}`);
    }
  };
 
  const handlePendingPaymentsForAllMonths = async () => {
    const today = new Date();
    const employees = await fetchEmployeesFromPayments();
    if (!employees || employees.length === 0) return;
    
    const newPayments: any[] = [];
    for (const employee of employees) {
      const { data: employeePayments, error: paymentsError } = await supabase.from('payment_records').select('*').eq('employee_id', employee.employee_id).order('payment_date', { ascending: true });
      if (paymentsError) continue;
      if (!employeePayments || employeePayments.length === 0) continue;
      
      const firstPayment = employeePayments[0];
      let paymentAmount = await fetchEmployeePaymentAmount(employee.employee_id);
      if (paymentAmount === 0 && firstPayment.payment_amount > 0) {
        paymentAmount = firstPayment.payment_amount;
      }
      if (paymentAmount === 0) continue;
      
      const firstPaymentDate = firstPayment.payment_date ? new Date(firstPayment.payment_date) : new Date();
      if (isNaN(firstPaymentDate.getTime())) firstPaymentDate.setTime(new Date().getTime());
      
      let currentDate = new Date(firstPaymentDate);
      while (currentDate <= today) {
        const targetMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const targetMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const { data: existingPayments, error: existingPaymentsError } = await supabase.from('payment_records').select('*').eq('employee_id', employee.employee_id).gte('payment_date', targetMonthStart.toISOString()).lte('payment_date', targetMonthEnd.toISOString());
        
        if (existingPaymentsError) continue;
        if (existingPayments && existingPayments.length > 0) {
          for (const payment of existingPayments) {
            await updatePaymentStatus(payment);
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
          continue;
        }

        const joiningDate = employee.joining_date ? new Date(employee.joining_date) : null;
        const newPaymentRecord = {
          employee_id: employee.employee_id, employee_name: employee.full_name, designation: employee.designation, joining_date: joiningDate && !isNaN(joiningDate.getTime()) ? joiningDate.toISOString() : null, payment_date: targetMonthEnd.toISOString(), payment_amount: paymentAmount, payment_category: 'Staff', status: 'Pending', organization_id: organization_id,
        };
        const { data, error } = await supabase.from('payment_records').insert(newPaymentRecord).select().single();
        if (error) continue;
        
        await updatePaymentRecordsForEmployee(employee.employee_id, { employee_name: employee.full_name, designation: employee.designation, payment_amount: paymentAmount, payment_category: 'Staff', joining_date: employee.joining_date || null });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    await fetchPayments();
  };
 
  useEffect(() => {
    const initializeData = async () => {
      await fetchPayments();
      await handlePendingPaymentsForAllMonths();
    };
    initializeData();
  }, [selectedMonth]);
 
  const generateMonthOptions = () => {
    const today = new Date();
    const months = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    months.push({ label: 'Last Month Salary Status', value: 'last-month' });
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`, value: `${monthNames[date.getMonth()]}-${date.getFullYear()}` });
    }
    return months;
  };
 
  const getPaymentMonthYear = (paymentDate: string) => {
    const date = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(date.getTime())) {
      const today = new Date();
      return `${today.toLocaleString('en-US', { month: 'long' })}-${today.getFullYear()}`;
    }
    return `${date.toLocaleString('en-US', { month: 'long' })}-${date.getFullYear()}`;
  };

  const filteredExpenses = expenses.filter(expense => {
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (expense.description.toLowerCase().includes(query) || expense.vendor?.toLowerCase().includes(query) || expense.category.toLowerCase().includes(query));
    }
    return true;
  });

  const filteredPayments = payments.filter(payment => {
    if (!payment) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return ((payment.employeeName && payment.employeeName.toLowerCase().includes(query)) || (payment.employeeId && payment.employeeId.toLowerCase().includes(query)) || (payment.paymentCategory && payment.paymentCategory.toLowerCase().includes(query)));
    }
    return true;
  });

  const filterPaymentsByMonth = (paymentsToFilter: any[]) => {
    if (!paymentsToFilter) return [];
    if (selectedMonth === 'last-month') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthValue = `${lastMonth.toLocaleString('en-US', { month: 'long' })}-${lastMonth.getFullYear()}`;
      return paymentsToFilter.filter(p => getPaymentMonthYear(p.paymentDate) === lastMonthValue);
    }
    return paymentsToFilter.filter(p => getPaymentMonthYear(p.paymentDate) === selectedMonth);
  };

  const paidPayments = filterPaymentsByMonth(filteredPayments.filter(payment => payment.status && payment.status.toLowerCase() === 'success'));
  const unpaidPayments = filterPaymentsByMonth(filteredPayments.filter(payment => payment.status && ['pending', 'unpaid'].includes(payment.status.toLowerCase())));
  const totalPaidAmount = paidPayments.reduce((sum, payment) => sum + (payment.paymentAmount || 0), 0);
  const totalPendingAmount = unpaidPayments.reduce((sum, payment) => sum + (payment.paymentAmount || 0), 0);
  const uniqueCategories = Array.from(new Set(expenses.map(expense => expense.category)));

  const handleViewExpense = (id: string) => {
    setSelectedExpenseId(id);
    setIsViewDialogOpen(true);
  };

  const handleEditExpense = (id: string) => {
    const expenseToEdit = expenses.find(exp => exp.id === id);
    if (expenseToEdit) {
      setEditExpenseData({
        ...expenseToEdit,
        amount: expenseToEdit.amount?.toString() || '',
        displayAmount: expenseToEdit.amount ? new Intl.NumberFormat('en-IN').format(expenseToEdit.amount) : '',
        fileToUpload: null,
      });
      setSelectedExpenseId(id);
      setIsEditDialogOpen(true);
    }
  };

  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const handleDeleteExpense = (id: string) => {
    toast.warning("Are you sure you want to delete this expense?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteExpense(id);
            toast.success('Expense deleted successfully.');
          } catch (error: any) {
            console.error('Error deleting expense:', error.message);
            toast.error(`Failed to delete expense: ${error.message}`);
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };

  const handleExportExpenses = () => {
    exportData('expenses', 'csv');
  };

  const generateAvatarFallback = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const mapPaymentToPayslipData = (payment: any): PayslipData => {
    return payment.payslipData || {
      employeeId: payment.employeeId || 'N/A', employeeName: payment.employeeName || 'N/A', designation: payment.designation || 'N/A', payPeriod: '', payDate: payment.paymentDate, dateOfJoining: null, paidDays: 30, lopDays: 0, ctc: 0, basicSalary: 0, houseRentAllowance: 0, conveyanceAllowance: 0, medicalAllowance: 0, specialAllowance: 0, customEarnings: [], totalEarnings: 0, providentFund: 0, professionalTax: 0, incomeTax: 0, customDeductions: [], loanDeduction: 0, totalDeductions: 0, netPayable: payment.paymentAmount || 0,
    };
  };
 
  const handleViewPayment = (payment: any) => {
    setPayslipData(mapPaymentToPayslipData(payment));
    setIsPayslipDialogOpen(true);
  };
 
  const handleDownloadPayment = (payment: any) => {
    setPayslipData(mapPaymentToPayslipData(payment));
    setIsPayslipDialogOpen(true);
  };
 
  const handleDeletePayment = (payment: any) => {
    toast.warning(`Delete payment for ${payment.employeeName}?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const { error } = await supabase.from('payment_records').delete().eq('id', payment.id);
            if (error) throw error;
            setPayments(payments.filter(p => p.id !== payment.id));
            toast.success(`Payment for ${payment.employeeName} deleted`);
          } catch (error) {
            toast.error('Failed to delete payment');
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };
 
  const handleEditPayment = async (payment: any) => {
    setSelectedPayment(payment);
    setIsEditMode(true);
    setIsPayrollDrawerOpen(true);
  };
 
  const handlePayrollDrawerClose = async (open: boolean, updatedPayment?: any) => {
    setIsPayrollDrawerOpen(open);
    if (!open) {
      if (updatedPayment) {
        await fetchPayments();
      }
      setIsEditMode(false);
      setSelectedPayment(null);
    }
  };
 
  const handleViewDialogClose = (open: boolean) => setIsViewDialogOpen(open);
  const handlePayslipDialogClose = (open: boolean) => setIsPayslipDialogOpen(open);

  const expenseTotalPages = Math.ceil(filteredExpenses.length / expenseItemsPerPage);
  const expenseStartIndex = (expenseCurrentPage - 1) * expenseItemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(expenseStartIndex, expenseStartIndex + expenseItemsPerPage);
  const handleExpenseItemsPerPageChange = (value: string) => { setExpenseItemsPerPage(Number(value)); setExpenseCurrentPage(1); };

  const displayedPayments = activeSalaryCategory === 'Paid Salary' ? paidPayments : unpaidPayments;
  const salaryTotalPages = Math.ceil(displayedPayments.length / salaryItemsPerPage);
  const salaryStartIndex = (salaryCurrentPage - 1) * salaryItemsPerPage;
  const paginatedSalaryPayments = displayedPayments.slice(salaryStartIndex, salaryStartIndex + salaryItemsPerPage);
  const handleSalaryItemsPerPageChange = (value: string) => { setSalaryItemsPerPage(Number(value)); setSalaryCurrentPage(1); };
  const handleActiveSalaryCategoryChange = (category: string) => { setActiveSalaryCategory(category); setSalaryCurrentPage(1); };

  const statusClasses : {[key: string]: string} = {
    Success: 'text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium',
    Pending: 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium',
    Unpaid: 'text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium',
  };

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <p>You must be signed in to access this page.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  const renderPagination = (currentPage: number, setCurrentPage: (page: number) => void, totalPages: number, itemsPerPage: number, handleItemsPerPageChange: (value: string) => void, totalItems: number, startIndex: number, itemType: string) => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2 py-2 border-t">
      <div className="flex items-center gap-2">
        <span className="text-sm">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm">per page</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span>Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} {itemType}</span>
    </div>
  );

  return (
    <AccountsLayout title="Expenses">
      <div className="space-y-6 animate-fade-in">
        {/* KPI Cards and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Expenses</p>
                  <h3 className="text-2xl font-bold">{formatINR(stats.totalExpenses)}</h3>
                  <p className="text-xs mt-1">No. of expenses: {expenses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center"><Receipt className="h-6 w-6 text-orange-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Paid</p>
                  <h3 className="text-2xl font-bold">{formatINR(totalPaidAmount)}</h3>
                  <p className="text-xs mt-1">No. of payments: {paidPayments.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-green-600" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Pending</p>
                  <h3 className="text-2xl font-bold">{formatINR(totalPendingAmount)}</h3>
                  <p className="text-xs mt-1">No. of payments: {unpaidPayments.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center"><Clock className="h-6 w-6 text-yellow-600" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4" />
            <Input placeholder="Search by description, vendor, or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportExpenses}><Download className="mr-2 h-4 w-4" /> Export</Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>Add Expense</Button>
          </div>     
        </div>
                              
        <div className="w-full">
          <div className="inline-flex h-auto items-center justify-center rounded-full bg-gray-100 p-1.5">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('expense')}
              className={`h-auto rounded-full px-4 py-1.5 text-sm font-medium ${activeTab === 'expense' ? 'bg-purple-600 text-white shadow-sm' : ''}`}>
              Expense
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs text-purple-800">
                {filteredExpenses.length}
              </span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => setActiveTab('salary-expense')}
              className={`h-auto rounded-full px-4 py-1.5 text-sm font-medium ${activeTab === 'salary-expense' ? 'bg-purple-600 text-white shadow-sm' : ''}`}>
              Salary Expense
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs text-purple-800">
                {filteredPayments.length}
              </span>
            </Button>
          </div>
 
          {activeTab === 'expense' && (
            <div className="mt-4 bg-white rounded-xl border shadow-sm">
      <div className="hidden lg:grid grid-cols-12 gap-x-4 px-6 py-3 bg-purple-600 text-white">
  <div className="col-span-1">Date</div>
  <div className="col-span-3">Description</div>
  <div className="col-span-2">Vendor</div>
  <div className="col-span-2">Amount</div>
  <div className="col-span-1">Method</div>
  <div className="col-span-1">Status</div>
  <div className="col-span-2 text-center">Actions</div>
</div>
              <div>
                {paginatedExpenses.length === 0 ? (
                  <div className="text-center py-10">No expenses found.</div>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <div key={expense.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4 items-center border-b hover:bg-gray-50">
  <div className="lg:col-span-1">{formatDateForDisplay(expense.date)}</div>
  <div className="lg:col-span-3">
    <p className="font-semibold">{expense.description}</p>
    <Badge variant="outline">{expense.category}</Badge>
  </div>
  <div className="lg:col-span-2">{expense.vendor || '-'}</div>
  <div className="lg:col-span-2 font-semibold">{formatINR(expense.amount)}</div>
  <div className="lg:col-span-1">{expense.paymentMethod}</div>
  <div className="lg:col-span-1">
    {getReconciliationStatusBadge(expense.reconciliation_status)}
  </div>
                      <div className="lg:col-span-2 flex justify-center">
                        <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1">
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild><a href={expense.receiptUrl || '#'} target="_blank" rel="noopener noreferrer" className={`h-7 w-7 flex items-center justify-center ${!expense.receiptUrl && 'opacity-50'}`}><Receipt className="h-4 w-4" /></a></TooltipTrigger><TooltipContent>View Receipt</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewExpense(expense.id)}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View Details</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditExpense(expense.id)}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit Expense</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete Expense</TooltipContent></Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredExpenses.length > 0 && renderPagination(expenseCurrentPage, setExpenseCurrentPage, expenseTotalPages, expenseItemsPerPage, handleExpenseItemsPerPageChange, filteredExpenses.length, expenseStartIndex, "expenses")}
            </div>
          )}
 
          {activeTab === 'salary-expense' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 border rounded-lg p-1">
                    <Button variant={activeSalaryCategory === 'Paid Salary' ? 'default' : 'outline'} onClick={() => handleActiveSalaryCategoryChange('Paid Salary')}>Paid Salary</Button>
                    <Button variant={activeSalaryCategory === 'Unpaid Salary' ? 'default' : 'outline'} onClick={() => handleActiveSalaryCategoryChange('Unpaid Salary')}>Unpaid Salary</Button>
                  </div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{generateMonthOptions().map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
              <div className="bg-white rounded-xl border shadow-sm">
                  <Table>
                      <TableHeader>
                          <TableRow><TableHead>Profile</TableHead><TableHead>Payday</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                          {loading ? (
                              <TableRow><TableCell colSpan={6} className="text-center"><RefreshCw className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                          ) : paginatedSalaryPayments.length === 0 ? (
                              <TableRow><TableCell colSpan={6} className="text-center">No records found</TableCell></TableRow>
                          ) : (
                              paginatedSalaryPayments.map((payment) => (
                                  <TableRow key={payment.id}>
                                      <TableCell><div className="flex items-center gap-3"><Avatar><AvatarImage src={payment.avatar} /><AvatarFallback>{generateAvatarFallback(payment.employeeName)}</AvatarFallback></Avatar><div><div>{payment.employeeName}</div><div className="text-xs">{payment.employeeId}</div></div></div></TableCell>
                                      <TableCell>{payment.paymentDate}</TableCell><TableCell>{formatINR(payment.paymentAmount)}</TableCell><TableCell>{payment.paymentCategory}</TableCell>
                                      <TableCell><span className={statusClasses[payment.status as keyof typeof statusClasses]}>{payment.status}</span></TableCell>
                                      <TableCell className="text-right">
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={() => handleViewPayment(payment)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleEditPayment(payment)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleDownloadPayment(payment)}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
                  {displayedPayments.length > 0 && renderPagination(salaryCurrentPage, setSalaryCurrentPage, salaryTotalPages, salaryItemsPerPage, handleSalaryItemsPerPageChange, displayedPayments.length, salaryStartIndex, "payments")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs and Drawers */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Add New Expense</DialogTitle></DialogHeader><ExpenseForm onClose={() => setIsAddDialogOpen(false)} expenseData={newExpenseData} setExpenseData={setNewExpenseData} organizationName={"Your Company Name"} /></DialogContent>
      </Dialog>
      <Dialog open={isViewDialogOpen} onOpenChange={handleViewDialogClose}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Expense Details</DialogTitle></DialogHeader>{selectedExpense && <ExpenseDetails expense={selectedExpense} onClose={() => handleViewDialogClose(false)} />}</DialogContent>
      </Dialog>
      <Dialog open={isPayslipDialogOpen} onOpenChange={handlePayslipDialogClose}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Payslip</DialogTitle></DialogHeader>{payslipData && <PayslipViewer payslipData={payslipData} paymentId={payslipData.employeeId} />}</DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>{selectedExpense && <ExpenseForm expense={selectedExpense} onClose={() => setIsEditDialogOpen(false)} expenseData={editExpenseData} setExpenseData={setEditExpenseData} organizationName={"Your Company Name"} />}</DialogContent>
      </Dialog>
      <PayrollDrawer open={isPayrollDrawerOpen} onOpenChange={handlePayrollDrawerClose} payment={selectedPayment} editMode={isEditMode} onPaymentCreated={async (p: any) => await fetchPayments()} />
    </AccountsLayout>
  );
};

export default ExpensesPage;