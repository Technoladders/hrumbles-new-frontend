import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import { useFinancialStore, Payment, PaymentCategory } from '@/lib/financial-data';
import { MoreVertical, Eye, Edit, Trash, Download, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import PayslipViewer from './PayslipViewer';
import { supabase } from '@/integrations/supabase/client';

const generateAvatarFallback = (name: string): string => {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`;
  }
  return name.substring(0, 2).toUpperCase();
};

const statusClasses = {
  Success: 'status-badge-success',
  Pending: 'status-badge-pending',
  'On Hold': 'status-badge-warning',
  Failed: 'status-badge-danger',
};

const PayrollTable: React.FC = () => {
  const { payments, setPayments, deletePayment } = useFinancialStore();
  const [activeCategory, setActiveCategory] = useState<PaymentCategory | 'All'>('All');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const filteredPayments = useMemo(() => {
    return activeCategory === 'All'
      ? payments
      : payments.filter(payment => payment.paymentCategory === activeCategory);
  }, [payments, activeCategory]);

  // Fetch payments from Supabase
  const fetchPayments = async () => {
    try {
      setLoading(true);

      // Fetch payment records
      const { data: paymentRecords, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .order('payment_date', { ascending: false });

      if (paymentError) {
        throw new Error(`Error fetching payments: ${paymentError.message}`);
      }

      if (!paymentRecords || paymentRecords.length === 0) {
        setPayments([]);
        toast.warning('No payment records found');
        setLoading(false);
        return;
      }

      // Create a function to fetch all details for a payment
      const fetchPaymentDetails = async (record: any) => {
        // Verify that the payment_records row still exists
        const { data: paymentRecord, error: paymentRecordError } = await supabase
          .from('payment_records')
          .select('id')
          .eq('id', record.id)
          .single();

        if (paymentRecordError || !paymentRecord) {
          console.warn(`Payment record with id ${record.id} no longer exists, skipping related data fetch.`);
          return null; // Skip this record since it no longer exists
        }

        // Get earnings (expect an array, handle empty result)
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('*')
          .eq('payment_id', record.id);

        // Get deductions (expect an array, handle empty result)
        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('*')
          .eq('payment_id', record.id);

        // Get custom earnings
        const { data: customEarnings, error: customEarningsError } = await supabase
          .from('payment_custom_earnings')
          .select('*')
          .eq('payment_id', record.id);

        // Get custom deductions
        const { data: customDeductions, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('*')
          .eq('payment_id', record.id);

        // Check for errors in fetching related data
        if (earningsError || deductionsError || customEarningsError || customDeductionsError) {
          console.error('Error fetching payment details:', {
            earningsError,
            deductionsError,
            customEarningsError,
            customDeductionsError,
          });
          return null; // Skip this record if there's an error
        }

        // Use the first row if it exists, otherwise provide defaults
        const earnings = earningsData && earningsData.length > 0 ? earningsData[0] : {};
        const deductions = deductionsData && deductionsData.length > 0 ? deductionsData[0] : {};

        // Create payslipData
        const payslipData = {
          employeeId: record.employee_id || 'N/A',
          employeeName: record.employee_name || 'Unknown Employee',
          designation: record.designation || '',
          payPeriod: record.payment_date
            ? new Date(record.payment_date).toLocaleString('en-US', { month: 'long', year: 'numeric' })
            : '',
          basicSalary: earnings.basic_salary || 0,
          houseRentAllowance: earnings.house_rent_allowance || 0,
          conveyanceAllowance: earnings.conveyance_allowance || 0,
          fixedAllowance: earnings.fixed_allowance || 0,
          totalEarnings: earnings.total_earnings || 0,
          providentFund: deductions.provident_fund || 0,
          professionalTax: deductions.professional_tax || 0,
          incomeTax: deductions.income_tax || 0,
          loanDeduction: deductions.loan_deduction || 0,
          totalDeductions: deductions.total_deductions || 0,
          netPayable: record.payment_amount || 0,
          paidDays: deductions.paid_days || 30,
          lopDays: deductions.lop_days || 0,
          customEarnings: customEarnings?.map((e: any) => ({ name: e.name, amount: e.amount })) || [],
          customDeductions: customDeductions?.map((d: any) => ({ name: d.name, amount: d.amount })) || [],
        };

        // Format payment date for display
        const paymentDate = new Date(record.payment_date);
        const formattedPaymentDate = paymentDate.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        // Return formatted payment data
        return {
          id: record.id,
          employeeId: record.employee_id,
          employeeName: record.employee_name,
          paymentDate: formattedPaymentDate,
          paymentAmount: record.payment_amount || 0,
          paymentCategory: record.payment_category || 'Staff',
          status: record.status || 'Pending',
          payslipData,
        };
      };

      // Process all payments
      const paymentPromises = paymentRecords.map(fetchPaymentDetails);
      const formattedPayments = await Promise.all(paymentPromises);

      // Filter out null results (e.g., from deleted records or errors)
      const validPayments = formattedPayments.filter((payment): payment is Payment => payment !== null);

      // Update local state
      setPayments(validPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleView = (payment: Payment) => {
    setSelectedPayment(payment);
    setViewDialogOpen(true);
  };

  const handleEdit = (payment: Payment) => {
    navigate(`/payroll/${payment.id}/edit`);
  };

  const handleDelete = async (payment: Payment) => {
    const confirmed = window.confirm(`Are you sure you want to delete the payment for ${payment.employeeName}?`);
    if (confirmed) {
      try {
        // Delete from Supabase
        const { error } = await supabase
          .from('payment_records')
          .delete()
          .eq('id', payment.id);

        if (error) {
          throw new Error(`Error deleting payment: ${error.message}`);
        }

        // Delete from local state
        deletePayment(payment.id);

        // Refresh the payment list to avoid stale data
        await fetchPayments();

        // Show success toast
        toast.success(`Payment for ${payment.employeeName} deleted successfully`);
      } catch (error) {
        console.error('Error deleting payment:', error);
        toast.error('Failed to delete payment');
      }
    }
  };

  const handleDownload = (payment: Payment) => {
    toast.info(`Downloading payslip for ${payment.employeeName}...`);
    // In a real app, this would trigger a download
    setTimeout(() => {
      toast.success(`Payslip for ${payment.employeeName} downloaded successfully`);
    }, 1500);
  };

  const handleViewDialogClose = () => {
    setViewDialogOpen(false);
    // Clear the selected payment after a short delay to allow for transition
    setTimeout(() => {
      setSelectedPayment(null);
    }, 300);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <CategoryButton 
            active={activeCategory === 'All'}
            onClick={() => setActiveCategory('All')}
          >
            All Payment
          </CategoryButton>
          <CategoryButton 
            active={activeCategory === 'Member'}
            onClick={() => setActiveCategory('Member')}
          >
            Member
          </CategoryButton>
          <CategoryButton 
            active={activeCategory === 'Staff'}
            onClick={() => setActiveCategory('Staff')}
          >
            Staff
          </CategoryButton>
          <CategoryButton 
            active={activeCategory === 'Freelance'}
            onClick={() => setActiveCategory('Freelance')}
          >
            Freelance
          </CategoryButton>
          <CategoryButton 
            active={activeCategory === 'Part-Time'}
            onClick={() => setActiveCategory('Part-Time')}
          >
            Part-Time
          </CategoryButton>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchPayments} 
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table className="w-full financial-table">
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Payday</TableHead>
                <TableHead>Payment Amount</TableHead>
                <TableHead>Payment Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Loading payment data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No payment records found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="group">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage 
                            src={payment.avatar} 
                            alt={payment.employeeName} 
                          />
                          <AvatarFallback>
                            {generateAvatarFallback(payment.employeeName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{payment.employeeName}</div>
                          <div className="text-xs text-gray-500">{payment.employeeId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.paymentDate}</TableCell>
                    <TableCell className="financial-amount font-medium">
                      {formatINR(payment.paymentAmount)}
                    </TableCell>
                    <TableCell>{payment.paymentCategory} Payday</TableCell>
                    <TableCell>
                      <span className={statusClasses[payment.status as keyof typeof statusClasses]}>
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuItem 
                            onClick={() => handleView(payment)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            <span>View</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEdit(payment)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownload(payment)}
                            className="cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(payment)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Payslip Viewer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={handleViewDialogClose}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          <DialogDescription className="sr-only">
            Payslip details for {selectedPayment?.employeeName}
          </DialogDescription>
          {selectedPayment && (
            <PayslipViewer 
              paymentId={selectedPayment.id} 
              payslipData={selectedPayment.payslipData || {
                employeeId: selectedPayment.employeeId,
                employeeName: selectedPayment.employeeName,
                designation: '',
                payPeriod: '',
                basicSalary: 0,
                houseRentAllowance: 0,
                conveyanceAllowance: 0,
                fixedAllowance: 0,
                medicalAllowance: 0,
                specialAllowance: 0,
                totalEarnings: 0,
                providentFund: 0,
                professionalTax: 0,
                incomeTax: 0,
                loanDeduction: 0,
                totalDeductions: 0,
                netPayable: selectedPayment.paymentAmount,
                paidDays: 30,
                lopDays: 0,
                customEarnings: [],
                customDeductions: [],
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface CategoryButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ children, active, onClick }) => {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default PayrollTable;