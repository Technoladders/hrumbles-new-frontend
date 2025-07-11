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
  ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react';
import { formatINR } from '@/utils/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpenseForm from '@/components/accounts/ExpenseForm';
import ExpenseDetails from '@/components/accounts/ExpenseDetails';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { PayrollDrawer } from '@/components/financial/PayrollDrawer';
import PayslipViewer from '@/components/financial/PayslipViewer'
import { PayslipData } from '@/utils/payslip-extractor';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  joining_date: string | null;
}

interface EmployeePaymentAmount {
  employee_id: string;
  payment_amount: number;
  updated_at: string;
}

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
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('all');
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

  // Pagination State
  const [expenseCurrentPage, setExpenseCurrentPage] = useState(1);
  const [expenseItemsPerPage, setExpenseItemsPerPage] = useState(10);
  const [salaryCurrentPage, setSalaryCurrentPage] = useState(1);
  const [salaryItemsPerPage, setSalaryItemsPerPage] = useState(10);


  const navigate = useNavigate();

  const selectedExpense = selectedExpenseId
    ? expenses.find(exp => exp.id === selectedExpenseId)
    : null;

  // Check authentication status
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

  // Fetch expenses on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchExpenses();
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
      const { data, error } = await supabase
        .from('payment_records')
        .select('*');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        setPayments([]);
        toast.warning('No payment records found');
        return [];
      }

      const fetchPaymentDetails = async (record: any) => {
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('*')
          .eq('payment_id', record.id);

        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('*')
          .eq('payment_id', record.id);

        const { data: customEarnings, error: customEarningsError } = await supabase
          .from('payment_custom_earnings')
          .select('*')
          .eq('payment_id', record.id);

        const { data: customDeductions, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('*')
          .eq('payment_id', record.id);

        if (earningsError || deductionsError || customEarningsError || customDeductionsError) {
          console.error('Error fetching payment details:', {
            earningsError,
            deductionsError,
            customEarningsError,
            customDeductionsError,
          });
          return null;
        }

        const paymentDate = record.payment_date ? new Date(record.payment_date) : new Date();
        if (isNaN(paymentDate.getTime())) {
          console.warn(`Invalid payment_date for record ${record.id}, using current date as fallback`);
          paymentDate.setTime(new Date().getTime());
        }

        const payPeriod = paymentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        const employeeName = record.employee_name || `Employee ${record.employee_id}`;
        const earnings = earningsData?.[0] || {};
        const deductions = deductionsData?.[0] || {};

        const payslipData = {
          employeeId: record.employee_id || 'N/A',
          employeeName: employeeName,
          designation: record.designation || 'N/A',
          payPeriod: payPeriod,
          payDate: paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
          dateOfJoining: record.joining_date || null,
          paidDays: deductions.paid_days || 30,
          lopDays: deductions.lop_days || 0,
          ctc: (earnings.total_earnings || 0) * 12,
          basicSalary: earnings.basic_salary || 0,
          houseRentAllowance: earnings.house_rent_allowance || 0,
          conveyanceAllowance: earnings.conveyance_allowance || 0,
          medicalAllowance: 0,
          specialAllowance: earnings.fixed_allowance || 0,
          customEarnings: customEarnings?.map((e: any) => ({ name: e.name, amount: e.amount })) || [],
          totalEarnings: earnings.total_earnings || 0,
          providentFund: deductions.provident_fund || 0,
          professionalTax: deductions.professional_tax || 0,
          incomeTax: deductions.income_tax || 0,
          customDeductions: customDeductions?.map((d: any) => ({ name: d.name, amount: d.amount })) || [],
          loanDeduction: deductions.loan_deduction || 0,
          totalDeductions: deductions.total_deductions || 0,
          netPayable: record.payment_amount || 0,
        };

        let updatedRecord = { ...record, payslipData, employee_name: employeeName, designation: record.designation || 'N/A' };

        updatedRecord = await updatePaymentStatus(updatedRecord);

        return {
          id: updatedRecord.id,
          employeeId: updatedRecord.employee_id,
          employeeName: updatedRecord.employee_name,
          paymentDate: paymentDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          paymentAmount: updatedRecord.payment_amount || 0,
          paymentCategory: updatedRecord.payment_category || 'Staff',
          status: updatedRecord.status,
          avatar: updatedRecord.avatar || '',
          designation: updatedRecord.designation,
          payslipData,
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
      const { data, error } = await supabase
        .from('payment_records')
        .select('employee_id, employee_name, designation, joining_date')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast.warning('No employees found in payment records');
        return [];
      }

      const uniqueEmployees = Array.from(
        new Map(data.map(emp => [emp.employee_id, {
          employee_id: emp.employee_id,
          full_name: emp.employee_name || `Employee ${emp.employee_id}`,
          designation: emp.designation || 'N/A',
          joining_date: emp.joining_date || null,
        }])).values()
      );

      return uniqueEmployees;
    } catch (error) {
      console.error('Error fetching employees from payment records:', error);
      toast.error('Failed to fetch employee data from payment records');
      return [];
    }
  };

  const fetchEmployeePaymentAmount = async (employeeId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('payment_amount')
        .eq('employee_id', employeeId)
        .neq('payment_amount', 0)
        .order('payment_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error(`Error fetching payment amount for employee ${employeeId}:`, error);
        return 0;
      }

      if (!data || data.length === 0) {
        console.log(`No payment records found for employee ${employeeId} with non-zero payment_amount`);
        return 0;
      }

      return data[0]?.payment_amount || 0;
    } catch (error) {
      console.error(`Unexpected error fetching payment amount for employee ${employeeId}:`, error);
      return 0;
    }
  };

  const updatePaymentRecordsForEmployee = async (employeeId: string, updatedData: any) => {
    try {
      const { employee_name, designation, payment_amount, payment_category, joining_date } = updatedData;

      const { data: existingRecords, error: fetchError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('employee_id', employeeId);

      if (fetchError) {
        throw fetchError;
      }

      if (!existingRecords || existingRecords.length === 0) {
        return;
      }

      const updatePromises = existingRecords.map(async (record) => {
        if (record.status === 'Success') {
          return record;
        }

        const joiningDate = joining_date ? new Date(joining_date) : null;
        if (joining_date && (!joiningDate || isNaN(joiningDate.getTime()))) {
          console.warn(`Invalid joining_date for employee ${employeeId}, setting to null`);
        }

        const { error: updateError } = await supabase
          .from('payment_records')
          .update({
            employee_name: employee_name || record.employee_name,
            designation: designation || record.designation,
            payment_amount: payment_amount !== undefined ? payment_amount : record.payment_amount,
            payment_category: payment_category || record.payment_category,
            joining_date: joiningDate && !isNaN(joiningDate.getTime()) ? joiningDate.toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) {
          throw updateError;
        }

        return { ...record, employee_name, designation, payment_amount, payment_category, joining_date };
      });

      await Promise.all(updatePromises);

      await fetchPayments();
      toast.success(`Updated payment records for employee ${employeeId}`);
    } catch (error) {
      console.error(`Error updating payment records for employee ${employeeId}:`, error);
      toast.error(`Failed to update payment records for employee ${employeeId}`);
    }
  };

  const handlePendingPaymentsForAllMonths = async () => {
    const today = new Date();
    const employees = await fetchEmployeesFromPayments();

    if (!employees || employees.length === 0) {
      toast.warning('No employees found to create payments');
      return;
    }

    const newPayments: any[] = [];

    for (const employee of employees) {
      const { data: employeePayments, error: paymentsError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('employee_id', employee.employee_id)
        .order('payment_date', { ascending: true });

      if (paymentsError) {
        console.error(`Error fetching payments for employee ${employee.employee_id}:`, paymentsError);
        continue;
      }

      if (!employeePayments || employeePayments.length === 0) {
        continue;
      }

      const firstPayment = employeePayments[0];
      let paymentAmount = await fetchEmployeePaymentAmount(employee.employee_id);

      if (paymentAmount === 0 && firstPayment.payment_amount > 0) {
        paymentAmount = firstPayment.payment_amount;
      }

      if (paymentAmount === 0) {
        console.warn(`No valid payment amount found for employee ${employee.employee_id}`);
        continue;
      }

      const firstPaymentDate = firstPayment.payment_date ? new Date(firstPayment.payment_date) : new Date();
      if (isNaN(firstPaymentDate.getTime())) {
        console.warn(`Invalid first payment_date for employee ${employee.employee_id}, using current date as fallback`);
        firstPaymentDate.setTime(new Date().getTime());
      }

      let currentDate = new Date(firstPaymentDate);

      while (currentDate <= today) {
        const targetMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const targetMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data: existingPayments, error: existingPaymentsError } = await supabase
          .from('payment_records')
          .select('*')
          .eq('employee_id', employee.employee_id)
          .gte('payment_date', targetMonthStart.toISOString())
          .lte('payment_date', targetMonthEnd.toISOString());

        if (existingPaymentsError) {
          console.error(`Error checking existing payments for ${employee.full_name}:`, existingPaymentsError);
          continue;
        }

        if (existingPayments && existingPayments.length > 0) {
          for (const payment of existingPayments) {
            await updatePaymentStatus(payment);
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
          continue;
        }

        const paymentDate = targetMonthEnd.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        const joiningDate = employee.joining_date ? new Date(employee.joining_date) : null;
        if (employee.joining_date && (!joiningDate || isNaN(joiningDate.getTime()))) {
          console.warn(`Invalid joining_date for employee ${employee.employee_id}, setting to null`);
        }

        const newPaymentRecord = {
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          designation: employee.designation,
          joining_date: joiningDate && !isNaN(joiningDate.getTime()) ? joiningDate.toISOString() : null,
          payment_date: targetMonthEnd.toISOString(),
          payment_amount: paymentAmount,
          payment_category: 'Staff',
          status: 'Pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: organization_id,
        };

        const { data, error } = await supabase
          .from('payment_records')
          .insert(newPaymentRecord)
          .select()
          .single();

        if (error) {
          console.error(`Error creating pending payment for ${employee.full_name}:`, error);
          toast.error(`Failed to create pending payment for ${employee.full_name}`);
          continue;
        }

        await updatePaymentRecordsForEmployee(employee.employee_id, {
          employee_name: employee.full_name,
          designation: employee.designation,
          payment_amount: paymentAmount,
          payment_category: 'Staff',
          joining_date: employee.joining_date || null,
        });

        let updatedPayment = await updatePaymentStatus(data);

        const payslipData = {
          employeeId: employee.employee_id || 'N/A',
          employeeName: employee.full_name || 'N/A',
          designation: employee.designation || 'N/A',
          payPeriod: targetMonthEnd.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          payDate: paymentDate,
          dateOfJoining: employee.joining_date || null,
          paidDays: 30,
          lopDays: 0,
          ctc: 0,
          basicSalary: 0,
          houseRentAllowance: 0,
          conveyanceAllowance: 0,
          medicalAllowance: 0,
          specialAllowance: 0,
          customEarnings: [],
          totalEarnings: 0,
          providentFund: 0,
          professionalTax: 0,
          incomeTax: 0,
          customDeductions: [],
          loanDeduction: 0,
          netPayable: paymentAmount,
        };

        newPayments.push({
          id: data.id,
          employeeId: employee.employee_id,
          employeeName: employee.full_name,
          paymentDate: paymentDate,
          paymentAmount: paymentAmount,
          paymentCategory: 'Staff',
          status: updatedPayment.status,
          avatar: '',
          designation: employee.designation,
          payslipData,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    if (newPayments.length > 0) {
      setPayments([...payments, ...newPayments]);
      toast.success(`Added ${newPayments.length} pending payments for employees`);
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
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    months.push({ label: 'Last Month Salary Status', value: 'last-month' });

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const value = `${monthName}-${year}`;
      months.push({ label: `${monthName} ${year}`, value });
    }

    return months;
  };

  const monthOptions = generateMonthOptions();

  const getPaymentMonthYear = (paymentDate: string) => {
    const date = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(date.getTime())) {
      const today = new Date();
      return `${today.toLocaleString('en-US', { month: 'long' })}-${today.getFullYear()}`;
    }

    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month}-${year}`;
  };

  const filteredExpenses = expenses.filter(expense => {
    if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        expense.description.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query) ||
        expense.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const filteredPayments = payments.filter(payment => {
    if (!payment) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (payment.employeeName && payment.employeeName.toLowerCase().includes(query)) ||
        (payment.employeeId && payment.employeeId.toLowerCase().includes(query)) ||
        (payment.paymentCategory && payment.paymentCategory.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const filterPaymentsByMonth = (paymentsToFilter: any[]) => {
    if (!paymentsToFilter) return [];

    if (selectedMonth === 'last-month') {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthName = lastMonth.toLocaleString('en-US', { month: 'long' });
      const lastMonthYear = lastMonth.getFullYear();
      const lastMonthValue = `${lastMonthName}-${lastMonthYear}`;

      return paymentsToFilter.filter(payment => {
        if (!payment.paymentDate) return false;
        const paymentMonthYear = getPaymentMonthYear(payment.paymentDate);
        return paymentMonthYear === lastMonthValue;
      });
    }

    return paymentsToFilter.filter(payment => {
      if (!payment.paymentDate) return false;
      const paymentMonthYear = getPaymentMonthYear(payment.paymentDate);
      return paymentMonthYear === selectedMonth;
    });
  };

  const paidPayments = filterPaymentsByMonth(
    filteredPayments.filter(payment =>
      payment.status && payment.status.toLowerCase() === 'success'
    )
  );

  const unpaidPayments = filterPaymentsByMonth(
    filteredPayments.filter(payment =>
      payment.status && ['pending', 'unpaid'].includes(payment.status.toLowerCase())
    )
  );

  const totalPaidAmount = paidPayments.reduce((sum, payment) => sum + (payment.paymentAmount || 0), 0);
  const totalPendingAmount = unpaidPayments.reduce((sum, payment) => sum + (payment.paymentAmount || 0), 0);

  const uniqueCategories = Array.from(
    new Set(expenses.map(expense => expense.category))
  );

  const handleViewExpense = (id: string) => {
    setSelectedExpenseId(id);
    setIsViewDialogOpen(true);
  };

  const handleEditExpense = (id: string) => {
    setSelectedExpenseId(id);
    setIsEditDialogOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
        toast.success('Expense deleted successfully.');
        await fetchExpenses();
      } catch (error: any) {
        console.error('Error deleting expense:', error.message);
        toast.error(`Failed to delete expense: ${error.message}`);
      }
    }
  };

  const handleExportExpenses = () => {
    exportData('expenses', 'csv');
  };

  const generateAvatarFallback = (name: string) => {
    const initials = name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
    return initials;
  };

  const mapPaymentToPayslipData = (payment: any): PayslipData => {
    return payment.payslipData || {
      employeeId: payment.employeeId || 'N/A',
      employeeName: payment.employeeName || 'N/A',
      designation: payment.designation || 'N/A',
      payPeriod: '',
      payDate: payment.paymentDate,
      dateOfJoining: payment.payslipData?.dateOfJoining || null,
      paidDays: 30,
      lopDays: 0,
      ctc: 0,
      basicSalary: 0,
      houseRentAllowance: 0,
      conveyanceAllowance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      customEarnings: [],
      totalEarnings: 0,
      providentFund: 0,
      professionalTax: 0,
      incomeTax: 0,
      customDeductions: [],
      loanDeduction: 0,
      totalDeductions: 0,
      netPayable: payment.paymentAmount || 0,
    };
  };

  const handleViewPayment = (payment: any) => {
    const payslip = mapPaymentToPayslipData(payment);
    setPayslipData(payslip);
    setIsPayslipDialogOpen(true);
  };

  const handleDownloadPayment = (payment: any) => {
    const payslip = mapPaymentToPayslipData(payment);
    setPayslipData(payslip);
    setIsPayslipDialogOpen(true);
  };

  const handleDeletePayment = async (payment: any) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        const { error } = await supabase
          .from('payment_records')
          .delete()
          .eq('id', payment.id);

        if (error) {
          throw error;
        }

        const updatedPayments = payments.filter(p => p.id !== payment.id);
        setPayments(updatedPayments);
        toast.success(`Payment for ${payment.employeeName} deleted successfully`);
        await handlePendingPaymentsForAllMonths();
      } catch (error) {
        console.error('Error deleting payment:', error);
        toast.error('Failed to delete payment');
      }
    }
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
        const updatedPayments = payments.map(p =>
          p.id === updatedPayment.id ? { ...p, ...updatedPayment } : p
        );
        let finalPayments = updatedPayments;

        const updatedPaymentWithStatus = await updatePaymentStatus(updatedPayment);
        finalPayments = finalPayments.map(p =>
          p.id === updatedPaymentWithStatus.id ? updatedPaymentWithStatus : p
        );

        setPayments(finalPayments);

        await updatePaymentRecordsForEmployee(updatedPayment.employeeId, {
          employee_name: updatedPayment.employeeName,
          designation: updatedPayment.designation,
          payment_amount: updatedPayment.paymentAmount,
          payment_category: updatedPayment.paymentCategory,
          joining_date: updatedPayment.payslipData?.dateOfJoining || null,
        });

        await handlePendingPaymentsForAllMonths();
      }
      setIsEditMode(false);
      setSelectedPayment(null);
      const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  };

  const handleViewDialogClose = (open: boolean) => {
    setIsViewDialogOpen(open);
    if (!open) {
      setSelectedPaymentId(null);
      setSelectedPayment(null);
      const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  };

  const handlePayslipDialogClose = (open: boolean) => {
    setIsPayslipDialogOpen(open);
    if (!open) {
      setPayslipData(null);
      const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  };
  
    // Pagination Logic for Expenses Table
    const expenseTotalPages = Math.ceil(filteredExpenses.length / expenseItemsPerPage);
    const expenseStartIndex = (expenseCurrentPage - 1) * expenseItemsPerPage;
    const paginatedExpenses = filteredExpenses.slice(expenseStartIndex, expenseStartIndex + expenseItemsPerPage);
  
    const handleExpenseItemsPerPageChange = (value: string) => {
      setExpenseItemsPerPage(Number(value));
      setExpenseCurrentPage(1);
    };
  
    // Pagination Logic for Salary Table
    const displayedPayments = activeSalaryCategory === 'Paid Salary' ? paidPayments : unpaidPayments;
    const salaryTotalPages = Math.ceil(displayedPayments.length / salaryItemsPerPage);
    const salaryStartIndex = (salaryCurrentPage - 1) * salaryItemsPerPage;
    const paginatedSalaryPayments = displayedPayments.slice(salaryStartIndex, salaryStartIndex + salaryItemsPerPage);
  
    const handleSalaryItemsPerPageChange = (value: string) => {
      setSalaryItemsPerPage(Number(value));
      setSalaryCurrentPage(1);
    };
  
    const handleActiveSalaryCategoryChange = (category: string) => {
      setActiveSalaryCategory(category);
      setSalaryCurrentPage(1);
    };

  const statusClasses = {
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
        <p className="text-red-500">You must be signed in to access this page.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  const renderPagination = (
    currentPage: number,
    setCurrentPage: (page: number) => void,
    totalPages: number,
    itemsPerPage: number,
    handleItemsPerPageChange: (value: string) => void,
    totalItems: number,
    startIndex: number,
    itemType: string
  ) => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2 py-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
  
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          </div>
  
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
  
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} {itemType}
        </span>
      </div>
    );
  };

  return (
    <AccountsLayout title="Expenses">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(stats.totalExpenses)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of expenses: {expenses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(totalPaidAmount)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of payments: {paidPayments.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                  <h3 className="text-2xl font-bold financial-amount">{formatINR(totalPendingAmount)}</h3>
                  <p className="text-xs text-muted-foreground mt-1">No. of payments: {unpaidPayments.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportExpenses}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              Add Expense
            </Button>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-start gap-2 overflow-x-auto pb-2 mb-4 border-b">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('expense')}
              className={`text-sm font-medium rounded-none ${activeTab === 'expense' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-muted-foreground'}`}
            >
              Expense
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('salary-expense')}
              className={`text-sm font-medium rounded-none ${activeTab === 'salary-expense' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-muted-foreground'}`}
            >
              Salary Expense
            </Button>
          </div>

          {activeTab === 'expense' && (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-gray-200">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="table-header-cell">Date</TableHead>
                          <TableHead className="table-header-cell">Category</TableHead>
                          <TableHead className="table-header-cell">Description</TableHead>
                          <TableHead className="table-header-cell">Vendor</TableHead>
                          <TableHead className="table-header-cell">Amount</TableHead>
                          <TableHead className="table-header-cell">Payment Method</TableHead>
                          <TableHead className="table-header-cell">Receipt</TableHead>
                          <TableHead className="table-header-cell">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white divide-y divide-gray-200">
                        {paginatedExpenses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                              No expenses found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedExpenses.map((expense) => (
                            <TableRow key={expense.id} className="hover:bg-gray-50 transition">
                              <TableCell className="table-cell">{expense.date}</TableCell>
                              <TableCell className="table-cell">{expense.category}</TableCell>
                              <TableCell className="table-cell">{expense.description}</TableCell>
                              <TableCell className="table-cell">{expense.vendor || '-'}</TableCell>
                              <TableCell className="table-cell financial-amount">
                                <div className="flex items-center">
                                  <IndianRupee className="h-3 w-3 mr-1" />
                                  {expense.amount.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell className="table-cell">{expense.paymentMethod}</TableCell>
                              <TableCell className="table-cell">
                                {expense.receiptUrl ? (
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                                      <Receipt className="h-4 w-4" />
                                    </a>
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="table-cell">
                                <div className="flex items-center space-x-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleViewExpense(expense.id)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense.id)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                </div>
                {filteredExpenses.length > 0 && renderPagination(expenseCurrentPage, setExpenseCurrentPage, expenseTotalPages, expenseItemsPerPage, handleExpenseItemsPerPageChange, filteredExpenses.length, expenseStartIndex, "expenses")}
            </div>
          )}

          {activeTab === 'salary-expense' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                  <div className="flex justify-start gap-2 border border-gray-200 rounded-lg p-1">
                     
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSalaryCategory('Paid Salary')}
                    className={`text-sm font-medium h-8 px-4 py-1 rounded-md ${activeSalaryCategory === 'Paid Salary' ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                  >
                    Paid Salary
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setActiveSalaryCategory('Unpaid Salary')}
                    className={`text-sm font-medium h-8 px-4 py-1 rounded-md ${activeSalaryCategory === 'Unpaid Salary' ? 'bg-purple-600 text-white border-purple-600' : ''}`}
                  >
                    Unpaid Salary
                  </Button>
               
                  </div>
                  <div className="flex justify-end">
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                              {monthOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="overflow-x-auto">
                      <Table className="min-w-full divide-y divide-gray-200">
                          <TableHeader className="bg-gray-50">
                              <TableRow>
                                  <TableHead className="table-header-cell">Profile</TableHead>
                                  <TableHead className="table-header-cell">Payday</TableHead>
                                  <TableHead className="table-header-cell">Payment Amount</TableHead>
                                  <TableHead className="table-header-cell">Payment Category</TableHead>
                                  <TableHead className="table-header-cell">Status</TableHead>
                                  <TableHead className="table-header-cell text-right">Action</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody className="bg-white divide-y divide-gray-200">
                              {loading ? (
                                  <TableRow>
                                      <TableCell colSpan={6} className="text-center py-8">
                                          <div className="flex flex-col items-center justify-center">
                                              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                                              <p className="text-sm text-muted-foreground">Loading payment data...</p>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              ) : paginatedSalaryPayments.length === 0 ? (
                                  <TableRow>
                                      <TableCell colSpan={6} className="text-center py-8">
                                          <p className="text-muted-foreground">
                                              No {activeSalaryCategory.toLowerCase()} records found for the selected month
                                          </p>
                                      </TableCell>
                                  </TableRow>
                              ) : (
                                  paginatedSalaryPayments.map((payment) => (
                                      <TableRow key={payment.id} className="hover:bg-gray-50 transition">
                                          <TableCell className="table-cell">
                                              <div className="flex items-center space-x-3">
                                                  <Avatar className="h-10 w-10 border">
                                                      <AvatarImage src={payment.avatar} alt={payment.employeeName} />
                                                      <AvatarFallback>{generateAvatarFallback(payment.employeeName)}</AvatarFallback>
                                                  </Avatar>
                                                  <div>
                                                      <div className="font-medium">{payment.employeeName}</div>
                                                      <div className="text-xs text-gray-500">{payment.employeeId}</div>
                                                  </div>
                                              </div>
                                          </TableCell>
                                          <TableCell className="table-cell">{payment.paymentDate}</TableCell>
                                          <TableCell className="table-cell font-medium financial-amount">{formatINR(payment.paymentAmount)}</TableCell>
                                          <TableCell className="table-cell">{payment.paymentCategory} Payday</TableCell>
                                          <TableCell className="table-cell">
                                              <span className={statusClasses[payment.status as keyof typeof statusClasses] || 'text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium'}>
                                                  {payment.status}
                                              </span>
                                          </TableCell>
                                          <TableCell className="table-cell text-right">
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                                          <MoreVertical className="h-4 w-4" />
                                                      </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                      <DropdownMenuItem onClick={() => handleViewPayment(payment)} className="cursor-pointer"><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => handleEditPayment(payment)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => handleDownloadPayment(payment)} className="cursor-pointer"><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => handleDeletePayment(payment)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              )}
                          </TableBody>
                      </Table>
                  </div>
                  {displayedPayments.length > 0 && renderPagination(salaryCurrentPage, setSalaryCurrentPage, salaryTotalPages, salaryItemsPerPage, handleSalaryItemsPerPageChange, displayedPayments.length, salaryStartIndex, "payments")}
              </div>
          </div>
          )}
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm 
            onClose={() => setIsAddDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={handleViewDialogClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {activeTab === 'expense' && selectedExpense && (
            <ExpenseDetails 
              expense={selectedExpense} 
              onClose={() => handleViewDialogClose(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPayslipDialogOpen} onOpenChange={handlePayslipDialogClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {payslipData && (
            <PayslipViewer payslipData={payslipData} paymentId={payslipData.employeeId} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseForm 
              expense={selectedExpense}
              onClose={() => setIsEditDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <PayrollDrawer
        open={isPayrollDrawerOpen}
        onOpenChange={handlePayrollDrawerClose}
        payment={selectedPayment}
        editMode={isEditMode}
        onPaymentCreated={async (newPayment: any) => {
          await updatePaymentRecordsForEmployee(newPayment.employeeId, {
            employee_name: newPayment.employeeName,
            designation: newPayment.designation,
            payment_amount: newPayment.paymentAmount,
            payment_category: newPayment.paymentCategory,
            joining_date: newPayment.payslipData?.dateOfJoining || null,
          });
          await handlePendingPaymentsForAllMonths();
        }}
      />
    </AccountsLayout>
  );
};

export default ExpensesPage;