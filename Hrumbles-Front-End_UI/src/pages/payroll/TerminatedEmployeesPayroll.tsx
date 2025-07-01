import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';

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
  lop_days: number;
  income_tax: number; // Add for tax breakdown
  professional_tax: number; // Add for tax breakdown
  updated_at: string; // Add for pay day and status
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

const TerminatedEmployeesPayroll: React.FC = () => {
  const { year, month, employeeId } = useParams<{ year: string; month: string; employeeId: string }>();
  const navigate = useNavigate();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [payrollStatus, setPayrollStatus] = useState<string>('Pending');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Validate URL parameters
        if (!employeeId || !year || !month) {
          throw new Error('Missing required URL parameters: employeeId, year, or month');
        }

        const monthNumber = month.toLowerCase() === 'jan' ? '01' :
                           month.toLowerCase() === 'feb' ? '02' :
                           month.toLowerCase() === 'mar' ? '03' :
                           month.toLowerCase() === 'apr' ? '04' :
                           month.toLowerCase() === 'may' ? '05' :
                           month.toLowerCase() === 'jun' ? '06' :
                           month.toLowerCase() === 'jul' ? '07' :
                           month.toLowerCase() === 'aug' ? '08' :
                           month.toLowerCase() === 'sep' ? '09' :
                           month.toLowerCase() === 'oct' ? '10' :
                           month.toLowerCase() === 'nov' ? '11' : '12';

        const startOfMonth = `${year}-${monthNumber}-01`;
        const endOfMonth = monthNumber === '02' && parseInt(year) % 4 === 0
          ? `${year}-${monthNumber}-29T23:59:59+00`
          : monthNumber === '02'
          ? `${year}-${monthNumber}-28T23:59:59+00`
          : ['04', '06', '09', '11'].includes(monthNumber)
          ? `${year}-${monthNumber}-30T23:59:59+00`
          : `${year}-${monthNumber}-31T23:59:59+00`;

        console.log(`Fetching data for employeeId: ${employeeId}, date range: ${startOfMonth} to ${endOfMonth}`);

        // Step 1: Fetch the specific terminated employee
        const { data: employeeData, error: employeeError } = await supabase
          .from('hr_employees')
          .select('employee_id, employment_status, last_working_day, first_name, last_name, position, joining_date')
          .eq('employee_id', employeeId)
          .eq('employment_status', 'Terminated')
          .gte('last_working_day', startOfMonth)
          .lte('last_working_day', endOfMonth)
          .single();

        if (employeeError) {
          console.error('Error fetching employee data:', employeeError);
          throw new Error(`Failed to fetch employee data: ${employeeError.message}`);
        }

        if (!employeeData) {
          console.log('No terminated employee found with ID:', employeeId);
          setPayrollRecords([]);
          setLoading(false);
          return;
        }

        const employeeDetails = {
          employee_id: employeeData.employee_id,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          position: employeeData.position,
          joining_date: employeeData.joining_date,
          last_working_day: employeeData.last_working_day,
        };

        console.log('Fetched employee data:', employeeDetails);

        // Step 2: Fetch payment records for this employee
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('id, payment_amount, employee_id, updated_at, employee_name')
          .eq('employee_id', employeeId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (paymentError) {
          console.error('Error fetching payment records:', paymentError);
          throw new Error(`Failed to fetch payment records: ${paymentError.message}`);
        }

        if (!paymentRecords || paymentRecords.length === 0) {
          console.log('No payment records found for employee:', employeeId);
          setPayrollRecords([]);
          setLoading(false);
          return;
        }

        const paymentRecord = paymentRecords[0];
        console.log('Fetched payment record:', paymentRecord);

        // Step 3: Fetch earnings data (handle case where no record exists)
        const paymentId = paymentRecord.id;
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('payment_id, gross_earnings, payslipEnabled')
          .eq('payment_id', paymentId)
          .maybeSingle();

        if (earningsError) {
          console.error('Error fetching earnings data:', earningsError);
          throw new Error(`Failed to fetch earnings data: ${earningsError.message}`);
        }

        console.log('Fetched earnings data:', earningsData);

        // Step 4: Fetch deductions data (handle case where no record exists)
        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('payment_id, income_tax, professional_tax, provident_fund, loan_deduction, total_deductions, paid_days, lop_days')
          .eq('payment_id', paymentId)
          .maybeSingle();

        if (deductionsError) {
          console.error('Error fetching deductions data:', deductionsError);
          throw new Error(`Failed to fetch deductions data: ${deductionsError.message}`);
        }

        console.log('Fetched deductions data:', deductionsData);

        // Step 5: Fetch custom deductions data
        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('payment_id, amount')
          .eq('payment_id', paymentId);

        if (customDeductionsError) {
          console.error('Error fetching custom deductions data:', customDeductionsError);
          throw new Error(`Failed to fetch custom deductions data: ${customDeductionsError.message}`);
        }

        console.log('Fetched custom deductions data:', customDeductionsData);

        const customDeductionAmount = customDeductionsData?.reduce((sum, deduction) => sum + (deduction.amount || 0), 0) || 0;

        // Step 6: Calculate paid_days, lop_days, and adjust net_pay
        const daysInMonth = monthNumber === '02' && parseInt(year) % 4 === 0 ? 29 :
                           monthNumber === '02' ? 28 :
                           ['04', '06', '09', '11'].includes(monthNumber) ? 30 : 31;

        const lastWorkingDay = new Date(employeeDetails.last_working_day);
        const paidDays = lastWorkingDay.getDate();
        const remainingDays = daysInMonth - paidDays;

        // Use default values if earningsData or deductionsData is missing
        const monthlyGrossEarnings = earningsData?.gross_earnings || paymentRecord.payment_amount || 0;
        const dailyEarnings = monthlyGrossEarnings / daysInMonth;
        const proratedGrossEarnings = dailyEarnings * paidDays;

        const incomeTax = deductionsData?.income_tax || 0;
        const providentFund = deductionsData?.provident_fund || 0;
        const professionalTax = deductionsData?.professional_tax || 0;
        const loanDeduction = deductionsData?.loan_deduction || 0;
        const taxes = incomeTax + professionalTax;
        const benefits = earningsData?.payslipEnabled === true ? 1800 : 0;

        const dailyTaxes = taxes / daysInMonth;
        const proratedTaxes = dailyTaxes * paidDays;
        const dailyBenefits = benefits / daysInMonth;
        const proratedBenefits = dailyBenefits * paidDays;
        const dailyCustomDeductions = customDeductionAmount / daysInMonth;
        const proratedCustomDeductions = dailyCustomDeductions * paidDays;
        const dailyProvidentFund = providentFund / daysInMonth;
        const proratedProvidentFund = dailyProvidentFund * paidDays;
        const dailyLoanDeduction = loanDeduction / daysInMonth;
        const proratedLoanDeduction = dailyLoanDeduction * paidDays;

        const totalDeductions = proratedTaxes + proratedBenefits + proratedCustomDeductions + proratedProvidentFund + proratedLoanDeduction;
        const netPay = proratedGrossEarnings - totalDeductions;

        console.log(`Calculated for ${paymentRecord.employee_name}: paidDays=${paidDays}, lopDays=${remainingDays}, proratedGrossEarnings=${proratedGrossEarnings}, totalDeductions=${totalDeductions}, netPay=${netPay}`);

        // Step 7: Update or insert payment_deductions
        if (deductionsData) {
          const { error: updateDeductionError } = await supabase
            .from('payment_deductions')
            .update({
              paid_days: paidDays,
              lop_days: remainingDays,
              total_deductions: totalDeductions,
              updated_at: new Date().toISOString(),
            })
            .eq('payment_id', paymentId);

          if (updateDeductionError) {
            console.error('Error updating payment deductions:', updateDeductionError);
            throw new Error(`Failed to update payment deductions: ${updateDeductionError.message}`);
          }
        } else {
          // Insert a new payment_deductions record with total_deductions
          const { error: insertDeductionError } = await supabase
            .from('payment_deductions')
            .insert({
              payment_id: paymentId,
              income_tax: incomeTax,
              professional_tax: professionalTax,
              provident_fund: providentFund,
              loan_deduction: loanDeduction,
              total_deductions: totalDeductions,
              paid_days: paidDays,
              lop_days: remainingDays,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: organization_id,
            });

          if (insertDeductionError) {
            console.error('Error inserting payment deductions:', insertDeductionError);
            throw new Error(`Failed to insert payment deductions: ${insertDeductionError.message}`);
          }
        }

        const { error: updatePaymentError } = await supabase
          .from('payment_records')
          .update({
            payment_amount: netPay,
            updated_at: new Date().toISOString(),
            last_updated_by: 'TerminatedEmployeesPayroll',
          })
          .eq('id', paymentId);

        if (updatePaymentError) {
          console.error('Error updating payment records:', updatePaymentError);
          throw new Error(`Failed to update payment records: ${updatePaymentError.message}`);
        }

        const transformedRecord: PayrollRecord = {
          employee_id: paymentRecord.employee_id,
          employee_name: paymentRecord.employee_name,
          paid_days: paidDays,
          gross_earnings: proratedGrossEarnings,
          deductions: proratedCustomDeductions + proratedLoanDeduction,
          taxes: proratedTaxes,
          benefits: proratedBenefits,
          reimbursements: 0,
          net_pay: netPay,
          payment_id: paymentRecord.id,
          lop_days: remainingDays,
          income_tax: incomeTax * (paidDays / daysInMonth), // Prorated income tax
          professional_tax: professionalTax * (paidDays / daysInMonth), // Prorated professional tax
          updated_at: paymentRecord.updated_at,
        };

        setPayrollRecords([transformedRecord]);

        // Step 8: Calculate payroll summary
        const summary: PayrollSummary = {
          payroll_cost: proratedGrossEarnings,
          total_net_pay: netPay,
          pay_day: new Date(paymentRecord.updated_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          employee_count: 1, // Since this page is for a single employee
          taxes: proratedTaxes,
          income_tax: incomeTax * (paidDays / daysInMonth),
          professional_tax: professionalTax * (paidDays / daysInMonth),
          benefits: proratedBenefits,
          donations: 0, // Not available in current data
          total_deductions: totalDeductions,
        };

        setPayrollSummary(summary);

        // Determine payroll status
        const paymentDate = new Date(paymentRecord.updated_at);
        const currentDate = new Date('2025-05-22T10:42:00+05:30'); // Current date and time
        setPayrollStatus(paymentDate <= currentDate ? 'Paid' : 'Pending');
      } catch (error: any) {
        console.error('Error in fetchPayrollData:', error);
        setErrorMessage(error.message || 'An unexpected error occurred while fetching payroll data.');
        setPayrollRecords([]);
        toast.error(error.message || 'Failed to load payroll data for this employee.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, [year, month, employeeId]);

  if (loading) {
    return <p>Loading payroll details for the employee...</p>;
  }

  if (errorMessage) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Terminated Employee Payroll - {month?.toUpperCase()} {year}
          </h1>
          <Button variant="outline" onClick={() => navigate('/payroll')}>
            Back to Payroll
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Payroll Summary Section */}
      {payrollSummary && (
        <div className="flex items-center gap-6 mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col bg-gray-100 p-4 rounded-lg min-w-[280px]">
            <div className="text-sm text-gray-600 mb-1">Period: {month?.toUpperCase()} {year}</div>
            <div className="flex justify-between gap-8">
              <div>
                <div className="text-2xl font-semibold">₹{payrollSummary.payroll_cost.toLocaleString('en-IN')}</div>
                <div className="uppercase text-xs font-semibold text-gray-400 tracking-widest mt-1">Payroll Cost</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">₹{payrollSummary.total_net_pay.toLocaleString('en-IN')}</div>
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
            <div className="text-4xl font-bold leading-none">{payrollSummary.pay_day.split(' ')[0]}</div>
            <div className="text-xs font-semibold text-gray-600 tracking-wide">
              {payrollSummary.pay_day.split(' ').slice(1).join(' ')}
            </div>
            <div className="mt-2 text-sm font-semibold">{payrollSummary.employee_count} Employees</div>
          </div>

          <div className="flex flex-col p-4 min-w-[260px]">
            <div className="text-lg font-semibold mb-3">Taxes & Deductions</div>
            <div className="flex flex-col gap-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>
                  ₹{payrollSummary.taxes.toLocaleString('en-IN')}
                  {payrollSummary.taxes > 0 && (
                    <span className="text-gray-500">
                      {' '}
                      (IT: ₹{payrollSummary.income_tax.toLocaleString('en-IN')}, PT: ₹{payrollSummary.professional_tax.toLocaleString('en-IN')})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Benefits</span>
                <span>₹{payrollSummary.benefits.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Donations</span>
                <span>₹{payrollSummary.donations.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
                <span>Total Deductions</span>
                <span>₹{payrollSummary.total_deductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Payroll Details Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Terminated Employee Payroll - {payrollRecords[0]?.employee_name || 'Unknown Employee'} ({month?.toUpperCase()} {year})
        </h1>
        <Button variant="outline" onClick={() => navigate('/payroll')}>
          Back to Payroll
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Paid Days</TableHead>
                  <TableHead>LOP Days</TableHead>
                  <TableHead>Gross Earnings</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Taxes</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Reimbursements</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.map((rec, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{rec.employee_name}</TableCell>
                    <TableCell>{rec.paid_days}</TableCell>
                    <TableCell>{rec.lop_days}</TableCell>
                    <TableCell>₹{rec.gross_earnings.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.deductions.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.taxes.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.benefits.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.reimbursements.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{rec.net_pay.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No payroll data found for this employee.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TerminatedEmployeesPayroll;