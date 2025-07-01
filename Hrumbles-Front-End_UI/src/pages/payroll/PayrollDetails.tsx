import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { MoreVertical } from 'lucide-react';
import EmployeesPayrollDrawer from '../EmployeesPayrollDrawer';
import { toast } from 'sonner';

interface PayrollRecord {
  employee_id: string;
  employee_name: string;
  paid_days: number;
  gross_earnings: number;
  deductions: number;
  taxes: number;
  benefits: number;
  reimbursements: number;
  net_pay: number;
  payment_id: string;
  skipped?: boolean;
  skipReason?: string;
}

interface PayrollSummary {
  payroll_cost: number;
  total_net_pay: number;
  pay_day: string;
  employee_count: number;
  taxes: number;
  income_tax: number;
  professional_tax: number;
  benefits: number;
  donations: number;
  total_deductions: number;
}

interface PayrollHistory {
  year: number;
  month: string;
  total_net_pay: number;
}

const PayrollDetails: React.FC = () => {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PayrollSummary>({
    payroll_cost: 0,
    total_net_pay: 0,
    pay_day: '',
    employee_count: 0,
    taxes: 0,
    income_tax: 0,
    professional_tax: 0,
    benefits: 0,
    donations: 0,
    total_deductions: 0,
  });
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<string>('');
  const [payrollStatus, setPayrollStatus] = useState<string>('Pending');
  const [selectedSkipEmployee, setSelectedSkipEmployee] = useState<PayrollRecord | null>(null);
  const [skipReason, setSkipReason] = useState<string>('');
  const [employeePayrollHistory, setEmployeePayrollHistory] = useState<PayrollHistory[]>([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    position?: string;
    joining_date?: string;
    payment_id: string;
  } | null>(null);

  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);

        const monthNumber = month === 'jan' ? '01' :
                           month === 'feb' ? '02' :
                           month === 'mar' ? '03' :
                           month === 'apr' ? '04' :
                           month === 'may' ? '05' :
                           month === 'jun' ? '06' :
                           month === 'jul' ? '07' :
                           month === 'aug' ? '08' :
                           month === 'sep' ? '09' :
                           month === 'oct' ? '10' :
                           month === 'nov' ? '11' : '12';

        const startOfMonth = `${year}-${monthNumber}-01`;
        const endOfMonth = monthNumber === '02' && parseInt(year || '0') % 4 === 0
          ? `${year}-${monthNumber}-29T23:59:59+00`
          : monthNumber === '02'
          ? `${year}-${monthNumber}-28T23:59:59+00`
          : ['04', '06', '09', '11'].includes(monthNumber)
          ? `${year}-${monthNumber}-30T23:59:59+00`
          : `${year}-${monthNumber}-31T23:59:59+00`;

        console.log(`Date range for ${month} ${year}: ${startOfMonth} to ${endOfMonth}`);

        // Fetch payment records for the current month
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('id, payment_amount, employee_id, updated_at, employee_name')
          .gte('updated_at', startOfMonth) // Greater than or equal to start of month
          .lte('updated_at', endOfMonth)   // Less than or equal to end of month
          .order('updated_at', { ascending: false });

        if (paymentError) throw paymentError;

        console.log('Fetched payment_records:', paymentRecords);

        if (!paymentRecords || paymentRecords.length === 0) {
          console.log('No payment records found for', `${month} ${year}`);
          setSummary({
            payroll_cost: 0,
            total_net_pay: 0,
            pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
            employee_count: 0,
            taxes: 0,
            income_tax: 0,
            professional_tax: 0,
            benefits: 0,
            donations: 0,
            total_deductions: 0,
          });
          setPayrollRecords([]);
          setLoading(false);
          return;
        }

        // Fetch employee data and check employment status
        const employeeIds = [...new Set(paymentRecords.map(record => record.employee_id))];
        const { data: employeeData, error: employeeError } = await supabase
          .from('hr_employees')
          .select('employee_id, employment_status, first_name, last_name, position, joining_date')
          .in('employee_id', employeeIds);

        if (employeeError) throw employeeError;

        console.log('Fetched employeeData:', employeeData);

        // Determine active employees only (exclude terminated employees)
        const activeEmployeesMap = new Map<string, string>();
        const employeeDetailsMap = new Map<string, { first_name: string; last_name: string; position?: string; joining_date?: string }>();
        employeeData.forEach(employee => {
          if (employee.employment_status !== 'Terminated') {
            activeEmployeesMap.set(employee.employee_id, employee.employment_status);
            employeeDetailsMap.set(employee.employee_id, {
              first_name: employee.first_name,
              last_name: employee.last_name,
              position: employee.position,
              joining_date: employee.joining_date,
            });
          }
        });

        console.log('Active employees:', Array.from(activeEmployeesMap.keys()));

        // Get the latest record per employee
        const latestRecordsMap = new Map<string, any>();
        paymentRecords.forEach(record => {
          if (activeEmployeesMap.has(record.employee_id) && !latestRecordsMap.has(record.employee_id)) {
            latestRecordsMap.set(record.employee_id, record);
          }
        });

        const latestRecords = Array.from(latestRecordsMap.values());

        console.log('Latest records after filtering:', latestRecords);

        if (latestRecords.length === 0) {
          console.log('No active employee records after filtering');
          setSummary({
            payroll_cost: 0,
            total_net_pay: 0,
            pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
            employee_count: 0,
            taxes: 0,
            income_tax: 0,
            professional_tax: 0,
            benefits: 0,
            donations: 0,
            total_deductions: 0,
          });
          setPayrollRecords([]);
          setLoading(false);
          return;
        }

        // Fetch earnings and deductions data
        const paymentIds = latestRecords.map(record => record.id);
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('payment_id, gross_earnings, payslipEnabled')
          .in('payment_id', paymentIds);

        if (earningsError) throw earningsError;

        console.log('Fetched payment_earnings:', earningsData);

        const earningsMap = new Map<string, any>();
        earningsData.forEach(earning => {
          earningsMap.set(earning.payment_id, earning);
        });

        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('payment_id, income_tax, professional_tax, provident_fund, paid_days')
          .in('payment_id', paymentIds);

        if (deductionsError) throw deductionsError;

        console.log('Fetched payment_deductions:', deductionsData);

        const deductionsMap = new Map<string, any>();
        deductionsData.forEach(deduction => {
          deductionsMap.set(deduction.payment_id, deduction);
        });

        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('payment_id, amount, created_at')
          .in('payment_id', paymentIds);

        if (customDeductionsError) throw customDeductionsError;

        console.log('Fetched payment_custom_deductions:', customDeductionsData);

        const customDeductionsMap = new Map<string, number>();
        customDeductionsData.forEach(deduction => {
          const currentAmount = customDeductionsMap.get(deduction.payment_id) || 0;
          customDeductionsMap.set(deduction.payment_id, currentAmount + (deduction.amount || 0));
        });

        // Calculate payroll summary
        const payrollCost = latestRecords.reduce((sum: number, record: any) => {
          const earning = earningsMap.get(record.id) || {};
          return sum + (earning.gross_earnings || 0);
        }, 0);
        const employeeCount = latestRecords.length;

        console.log('Calculated payroll_cost:', payrollCost, 'employee_count:', employeeCount);

        const incomeTaxSum = latestRecords.reduce((sum: number, record: any) => {
          const deduction = deductionsMap.get(record.id) || {};
          return sum + (deduction.income_tax || 0);
        }, 0);
        const professionalTaxSum = latestRecords.reduce((sum: number, record: any) => {
          const deduction = deductionsMap.get(record.id) || {};
          return sum + (deduction.professional_tax || 0);
        }, 0);
        const totalTaxes = incomeTaxSum + professionalTaxSum;

        console.log('Calculated taxes:', totalTaxes, 'income_tax:', incomeTaxSum, 'professional_tax:', professionalTaxSum);

        const payslipEnabledCount = latestRecords.reduce((count: number, record: any) => {
          const earning = earningsMap.get(record.id) || {};
          return earning.payslipEnabled === true ? count + 1 : count;
        }, 0);
        const benefitsSum = payslipEnabledCount * 1800;

        console.log('Calculated benefits:', benefitsSum, 'payslipEnabledCount:', payslipEnabledCount);

        const totalDeductionsSum = Array.from(customDeductionsMap.values()).reduce((sum, amount) => sum + amount, 0);

        console.log('Custom deductions map:', Object.fromEntries(customDeductionsMap));
        console.log('Calculated total_deductions (custom only):', totalDeductionsSum);

        // Transform records for the table
        const transformedRecords: PayrollRecord[] = latestRecords.map(record => {
          const deduction = deductionsMap.get(record.id) || {};
          const earning = earningsMap.get(record.id) || {};
          const customDeductionAmount = customDeductionsMap.get(record.id) || 0;

          const incomeTax = deduction.income_tax || 0;
          const providentFund = deduction.provident_fund || 0;
          const professionalTax = deduction.professional_tax || 0;
          const taxes = incomeTax + professionalTax;
          const benefits = earning.payslipEnabled === true ? 1800 : 0;
          const totalDeductions = customDeductionAmount;
          const grossEarnings = earning.gross_earnings || 0;
          const netPay = grossEarnings - totalDeductions - (benefits + taxes) - providentFund;

          console.log(`Record for ${record.employee_name}: grossEarnings=${grossEarnings}, taxes=${taxes}, customDeductionAmount=${customDeductionAmount}, totalDeductions=${totalDeductions}, netPay=${netPay}`);

          return {
            employee_id: record.employee_id,
            employee_name: record.employee_name,
            paid_days: deduction.paid_days || 30,
            gross_earnings: grossEarnings,
            deductions: totalDeductions,
            taxes: taxes,
            benefits: benefits,
            reimbursements: 0,
            net_pay: netPay,
            payment_id: record.id,
            skipped: false,
            skipReason: '',
          };
        });

        console.log('Transformed payroll records for table:', transformedRecords);

        const totalProvidentFund = latestRecords.reduce((sum: number, record: any) => {
          const deduction = deductionsMap.get(record.id) || {};
          return sum + (deduction.provident_fund || 0);
        }, 0);

        const totalTaxesAndDeductions = totalTaxes + benefitsSum + totalProvidentFund + totalDeductionsSum;
        console.log('Total Taxes, Benefits, Provident Fund & Deductions:', totalTaxesAndDeductions);

        const totalNetPay = payrollCost - totalTaxesAndDeductions;
        console.log('Calculated total_net_pay:', totalNetPay);

        setSummary({
          payroll_cost: payrollCost,
          total_net_pay: totalNetPay,
          pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
          employee_count: employeeCount,
          taxes: totalTaxes,
          income_tax: incomeTaxSum,
          professional_tax: professionalTaxSum,
          benefits: benefitsSum,
          donations: 0,
          total_deductions: totalTaxes + totalDeductionsSum + totalProvidentFund,
        });
        setPayrollRecords(transformedRecords);

        // Fetch payroll run status
        const { data: payrollRun, error: payrollRunError } = await supabase
          .from('payroll_runs')
          .select('status')
          .eq('year', year)
          .eq('month', month)
          .single();

        if (payrollRunError && payrollRunError.code !== 'PGRST116') {
          throw payrollRunError;
        }

        if (payrollRun) {
          setPayrollStatus(payrollRun.status);
        } else {
          setPayrollStatus('Pending');
        }
      } catch (error) {
        console.error('Error fetching payroll data:', error);
        setSummary({
          payroll_cost: 0,
          total_net_pay: 0,
          pay_day: `02 ${month?.toUpperCase().slice(0, 3)}, ${year}`,
          employee_count: 0,
          taxes: 0,
          income_tax: 0,
          professional_tax: 0,
          benefits: 0,
          donations: 0,
          total_deductions: 0,
        });
        setPayrollRecords([]);
        setPayrollStatus('Pending');
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, [year, month]);

  const calculateUpdatedTotalNetPay = (records: PayrollRecord[]) => {
    const activeRecords = records.filter(record => !record.skipped);
    const activeRecordsNetPay = activeRecords.reduce((sum, record) => sum + record.net_pay, 0);
    return activeRecordsNetPay;
  };

  const calculateUpdatedPayrollCost = (records: PayrollRecord[]) => {
    const activeRecords = records.filter(record => !record.skipped);
    const activeRecordsPayrollCost = activeRecords.reduce((sum, record) => sum + record.gross_earnings, 0);
    return activeRecordsPayrollCost;
  };

  const handleSkipEmployeeClick = async (record: PayrollRecord) => {
    try {
      const { data: payrollRuns, error: payrollRunError } = await supabase
        .from('payroll_runs')
        .select('year, month, total_net_pay')
        .eq('status', 'Paid')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (payrollRunError) throw payrollRunError;

      const employeePaymentIds = (await supabase
        .from('payment_records')
        .select('id')
        .eq('employee_id', record.employee_id)).data?.map(record => record.id) || [];

      const { data: employeePayments, error: paymentsError } = await supabase
        .from('payment_earnings')
        .select('payment_id')
        .in('payment_id', employeePaymentIds);

      if (paymentsError) throw paymentsError;

      const paymentIds = employeePayments?.map(payment => payment.payment_id) || [];
      const { data: employeeRecords, error: recordsError } = await supabase
        .from('payment_records')
        .select('id, updated_at')
        .in('id', paymentIds);

      if (recordsError) throw recordsError;

      const history: PayrollHistory[] = payrollRuns?.map(run => {
        const runMonthNumber = run.month === 'jan' ? '01' :
                              run.month === 'feb' ? '02' :
                              run.month === 'mar' ? '03' :
                              run.month === 'apr' ? '04' :
                              run.month === 'may' ? '05' :
                              run.month === 'jun' ? '06' :
                              run.month === 'jul' ? '07' :
                              run.month === 'aug' ? '08' :
                              run.month === 'sep' ? '09' :
                              run.month === 'oct' ? '10' :
                              run.month === 'nov' ? '11' : '12';
        const runStartOfMonth = `${run.year}-${runMonthNumber}-01`;
        const employeeRecord = employeeRecords?.find(record => record.updated_at < runStartOfMonth);
        return {
          year: run.year,
          month: run.month,
          total_net_pay: employeeRecord ? run.total_net_pay : 0,
        };
      }).filter(run => run.total_net_pay > 0) || [];

      setEmployeePayrollHistory(history);
      setSelectedSkipEmployee(record);
      setIsSkipModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching payroll history:', error);
      toast.error(`Error opening skip modal: ${error.message}`);
    }
  };

  const handleSkipEmployeeSubmit = () => {
    if (!selectedSkipEmployee || !skipReason) {
      toast.error('Please provide a reason for skipping the employee.');
      return;
    }

    const updatedRecords = payrollRecords.map(record =>
      record.employee_id === selectedSkipEmployee.employee_id
        ? { ...record, skipped: true, skipReason }
        : record
    );

    setPayrollRecords(updatedRecords);
    setSummary(prev => ({
      ...prev,
      employee_count: updatedRecords.filter(r => !r.skipped).length,
      total_net_pay: calculateUpdatedTotalNetPay(updatedRecords),
      payroll_cost: calculateUpdatedPayrollCost(updatedRecords),
    }));

    setIsSkipModalOpen(false);
    setSelectedSkipEmployee(null);
    setSkipReason('');
    setEmployeePayrollHistory([]);
    toast.success(`${selectedSkipEmployee.employee_name} has been skipped from payroll.`);
  };

  const handleAddToPayroll = (record: PayrollRecord) => {
    const updatedRecords = payrollRecords.map(r =>
      r.employee_id === record.employee_id
        ? { ...r, skipped: false, skipReason: '' }
        : r
    );

    setPayrollRecords(updatedRecords);
    setSummary(prev => ({
      ...prev,
      employee_count: updatedRecords.filter(r => !r.skipped).length,
      total_net_pay: calculateUpdatedTotalNetPay(updatedRecords),
      payroll_cost: calculateUpdatedPayrollCost(updatedRecords),
    }));
    toast.success(`${record.employee_name} has been added back to payroll.`);
  };

  const handleSubmitAndApprove = async () => {
    const currentDateTime = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setSubmissionTime(currentDateTime);

    try {
      const activeRecords = payrollRecords.filter(record => !record.skipped);
      const finalTotalNetPay = calculateUpdatedTotalNetPay(payrollRecords);
      const finalPayrollCost = calculateUpdatedPayrollCost(payrollRecords);
      const finalEmployeeCount = activeRecords.length;

      const { error: upsertError } = await supabase
        .from('payroll_runs')
        .upsert({
          year: parseInt(year!),
          month: month!,
          payroll_cost: finalPayrollCost,
          total_net_pay: finalTotalNetPay,
          employee_count: finalEmployeeCount,
          status: 'Paid',
          submitted_at: new Date().toISOString(),
        }, { onConflict: ['year', 'month'] });

      if (upsertError) {
        throw new Error(`Failed to submit payroll: ${upsertError.message}`);
      }

      console.log('Payroll submitted and approved for', `${month} ${year}`);
      setPayrollStatus('Paid');
      setIsModalOpen(true);
      toast.success('Payroll submitted and approved successfully!');
    } catch (error: any) {
      console.error('Error submitting payroll:', error);
      toast.error(error.message || 'An error occurred while submitting the payroll. Please try again.');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    navigate('/payroll');
  };

  const handleEmployeeClick = async (record: PayrollRecord) => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select('id, employee_id, first_name, last_name, position, joining_date')
        .eq('employee_id', record.employee_id)
        .single();

      if (employeeError) throw employeeError;

      if (employeeData) {
        setSelectedEmployee({
          id: employeeData.id,
          employee_id: employeeData.employee_id,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          position: employeeData.position,
          joining_date: employeeData.joining_date,
          payment_id: record.payment_id,
        });
        setIsDrawerOpen(true);
      }
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
      toast.error(`Error opening employee details: ${error.message}`);
    }
  };

  if (loading) return <p>Loading payroll details...</p>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Regular Payroll - {month?.toUpperCase()} {year}</h1>
        <Button variant="outline" onClick={() => navigate('/payroll')}>Back to Payroll</Button>
      </div>

      {/* Summary Section */}
      <div className="flex items-center gap-6 mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col bg-gray-100 p-4 rounded-lg min-w-[280px]">
          <div className="text-sm text-gray-600 mb-1">Period: {month?.toUpperCase()} {year}</div>
          <div className="flex justify-between gap-8">
            <div>
              <div className="text-2xl font-semibold">₹{summary.payroll_cost.toLocaleString('en-IN')}</div>
              <div className="uppercase text-xs font-semibold text-gray-400 tracking-widest mt-1">Payroll Cost</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">₹{summary.total_net_pay.toLocaleString('en-IN')}</div>
              <div className="uppercase text-xs font-semibold text-gray-400 tracking-widest mt-1">Total Net Pay</div>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold text-gray-600">Status: </span>
            <span
              className={`text-sm font-semibold ${
                payrollStatus === 'Paid' ? 'text-green-600' : 'text-yellow-600'
              }`}
            >
              {payrollStatus}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-4 border-l border-r border-gray-300 min-w-[120px]">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Pay Day</div>
          <div className="text-4xl font-bold leading-none">{summary.pay_day.split(' ')[0]}</div>
          <div className="text-xs font-semibold text-gray-600 tracking-wide">
            {summary.pay_day.split(' ').slice(1).join(' ')}
          </div>
          <div className="mt-2 text-sm font-semibold">{summary.employee_count} Employees</div>
        </div>

        <div className="flex flex-col p-4 min-w-[260px]">
          <div className="text-lg font-semibold mb-3">Taxes & Deductions</div>
          <div className="flex flex-col gap-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>
                ₹{summary.taxes.toLocaleString('en-IN')}
                {summary.taxes > 0 && (
                  <span className="text-gray-500">
                    {' '}
                    (IT: ₹{summary.income_tax.toLocaleString('en-IN')}, PT: ₹{summary.professional_tax.toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Benefits</span>
              <span>₹{summary.benefits.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Donations</span>
              <span>₹{summary.donations.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
              <span>Total Deductions</span>
              <span>₹{summary.total_deductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setIsModalOpen(true)}
          disabled={payrollStatus === 'Paid'}
        >
          Submit and Approve
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Paid Days</TableHead>
                  <TableHead>Gross Earnings</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Taxes</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Reimbursements</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((rec, idx) => (
                  <TableRow
                    key={idx}
                    className={rec.skipped ? 'bg-gray-200' : ''}
                  >
                    <TableCell>
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => handleEmployeeClick(rec)}
                      >
                        {rec.employee_name}
                        {rec.skipped && <span className="text-red-500 text-xs ml-2">(Skipped)</span>}
                      </button>
                    </TableCell>
                    <TableCell>{rec.skipped ? '-' : rec.paid_days}</TableCell>
                    <TableCell>{rec.skipped ? '-' : `₹${rec.gross_earnings.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>
                      {rec.skipped
                        ? `Reason: ${rec.skipReason || 'Skipped'}`
                        : `₹${rec.deductions.toLocaleString('en-IN')}`}
                    </TableCell>
                    <TableCell>{rec.skipped ? '-' : `₹${rec.taxes.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>{rec.skipped ? '-' : `₹${rec.benefits.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>{rec.skipped ? '-' : `₹${rec.reimbursements.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell>{rec.skipped ? '-' : `₹${rec.net_pay.toLocaleString('en-IN')}`}</TableCell>
                    <TableCell className="flex items-center space-x-2">
                      {rec.skipped ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddToPayroll(rec)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          aria-label={`Add ${rec.employee_name} back to payroll`}
                        >
                          Add to Payroll
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Actions for ${rec.employee_name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEmployeeClick(rec)}>
                              View Employee Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSkipEmployeeClick(rec)}>
                              Skip from Payroll
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              Initiate Exit Process
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No payroll records found.</p>
          )}
        </CardContent>
      </Card>

      {/* EmployeesPayrollDrawer */}
      <EmployeesPayrollDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        selectedEmployee={selectedEmployee}
        month={month}
        year={year}
      />

      {/* Skip Employee Modal */}
      {isSkipModalOpen && selectedSkipEmployee && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={() => setIsSkipModalOpen(false)}
          ></div>

          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative z-50 border border-gray-200 transform transition-all duration-300 scale-100 opacity-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skip-modal-title"
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              onClick={() => setIsSkipModalOpen(false)}
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="flex flex-col">
              <h2
                id="skip-modal-title"
                className="text-xl font-semibold text-gray-800 mb-4"
              >
                Skip Employee from Payroll
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Employee Name</label>
                  <p className="text-gray-800 font-semibold">{selectedSkipEmployee.employee_name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Payroll Period</label>
                  <p className="text-gray-800 font-semibold">{month?.toUpperCase()} {year}</p>
                </div>

                <div>
                  <label htmlFor="skip-reason" className="text-sm font-medium text-gray-600">
                    Reason for Skipping <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="skip-reason"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    placeholder="Enter reason for skipping this employee from payroll"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  onClick={() => setIsSkipModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  onClick={handleSkipEmployeeSubmit}
                >
                  Skip Employee
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={handleModalClose}
          ></div>

          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl relative z-50 border border-gray-200 transform transition-all duration-300 scale-100 opacity-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
              onClick={handleModalClose}
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="flex flex-col items-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2
                id="modal-title"
                className="text-2xl font-semibold text-gray-800 mb-4"
              >
                Approve Payroll
              </h2>
              <div className="text-gray-600 text-sm text-center space-y-2 mb-6">
                <p>On approving this payroll, your employees will not be able to:</p>
                <p>
                  <span className="inline-block w-4 text-gray-500 mr-2">➔</span>
                  Raise any reimbursement claims for this month
                </p>
                <p>
                  <span className="inline-block w-4 text-gray-500 mr-2">➔</span>
                  Declare or update the IT or POI declaration for this month
                </p>
              </div>

              <div className="w-full border-t border-gray-200 mb-6"></div>

              <div className="flex space-x-4">
                <Button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  onClick={handleModalClose}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleSubmitAndApprove}
                >
                  Submit and Approve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollDetails;