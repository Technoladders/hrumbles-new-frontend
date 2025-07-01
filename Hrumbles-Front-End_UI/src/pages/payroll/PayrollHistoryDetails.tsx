import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input'; // Import Input component
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import PayslipViewer from '@/components/financial/PayslipViewer';
import { PayslipData } from '@/utils/payslip-extractor';

interface EmployeePayment {
  employee_name: string;
  paid_days: number;
  net_pay: number;
  payslipData: PayslipData | null;
  tds_sheet: string;
  payment_mode: string;
  payment_status: string;
}

const PayrollHistoryDetails: React.FC = () => {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeePayment[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeePayment[]>([]); // State for filtered employees
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [selectedPayslipData, setSelectedPayslipData] = useState<PayslipData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployeePayslip, setSelectedEmployeePayslip] = useState<PayslipData | null>(null);

  useEffect(() => {
    const fetchEmployeePayments = async () => {
      try {
        setLoading(true);

        // Convert month to two-digit number for the query (e.g., "jun" -> "06")
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

        // Step 1: Fetch submitted_at from payroll_runs for the given year and month
        const { data: payrollRun, error: payrollRunError } = await supabase
          .from('payroll_runs')
          .select('submitted_at')
          .eq('year', parseInt(year || '0'))
          .eq('month', month)
          .single();

        if (payrollRunError) {
          console.error('Error fetching payroll run:', payrollRunError);
          throw payrollRunError;
        }

        // Determine payment_status based on submitted_at
        let paymentStatus = 'Pending';
        if (payrollRun && payrollRun.submitted_at) {
          const submittedAt = new Date(payrollRun.submitted_at);
          paymentStatus = `Paid on ${submittedAt.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`;
        }

        // Step 2: Fetch payment records before the start of the specified month
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('id, payment_amount, employee_id, updated_at, employee_name, designation, joining_date')
          .lt('updated_at', startOfMonth)
          .order('updated_at', { ascending: false });

        if (paymentError) throw paymentError;

        if (!paymentRecords || paymentRecords.length === 0) {
          setEmployees([]);
          setFilteredEmployees([]); // Initialize filtered employees
          setLoading(false);
          return;
        }

        // Step 3: Fetch employment status from hr_employees for the employee_ids
        const employeeIds = [...new Set(paymentRecords.map(record => record.employee_id))];
        const { data: employeeData, error: employeeError } = await supabase
          .from('hr_employees')
          .select('employee_id, employment_status')
          .in('employee_id', employeeIds);

        if (employeeError) throw employeeError;

        // Step 4: Filter out terminated employees and get the latest record per employee
        const activeEmployeesMap = new Map<string, string>();
        employeeData.forEach(employee => {
          if (employee.employment_status !== 'Terminated') {
            activeEmployeesMap.set(employee.employee_id, employee.employment_status);
          }
        });

        const latestRecordsMap = new Map<string, any>();
        paymentRecords.forEach(record => {
          if (activeEmployeesMap.has(record.employee_id) && !latestRecordsMap.has(record.employee_id)) {
            latestRecordsMap.set(record.employee_id, record);
          }
        });

        const latestRecords = Array.from(latestRecordsMap.values());

        if (latestRecords.length === 0) {
          setEmployees([]);
          setFilteredEmployees([]); // Initialize filtered employees
          setLoading(false);
          return;
        }

        // Step 5: Fetch payment_earnings for the latest records
        const paymentIds = latestRecords.map(record => record.id);
        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('payment_id, gross_earnings, payslipEnabled, basic_salary, house_rent_allowance, conveyance_allowance, fixed_allowance, total_earnings')
          .in('payment_id', paymentIds);

        if (earningsError) throw earningsError;

        const earningsMap = new Map<string, any>();
        earningsData.forEach(earning => {
          earningsMap.set(earning.payment_id, earning);
        });

        // Step 6: Fetch payment_deductions for the latest records
        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('payment_id, income_tax, professional_tax, provident_fund, paid_days, lop_days, loan_deduction, total_deductions')
          .in('payment_id', paymentIds);

        if (deductionsError) throw deductionsError;

        const deductionsMap = new Map<string, any>();
        deductionsData.forEach(deduction => {
          deductionsMap.set(deduction.payment_id, deduction);
        });

        // Step 7: Fetch payment_custom_earnings for the specified payment IDs
        const { data: customEarningsData, error: customEarningsError } = await supabase
          .from('payment_custom_earnings')
          .select('payment_id, name, amount')
          .in('payment_id', paymentIds);

        if (customEarningsError) throw customEarningsError;

        const customEarningsMap = new Map<string, any[]>();
        customEarningsData.forEach(earning => {
          const currentEarnings = customEarningsMap.get(earning.payment_id) || [];
          customEarningsMap.set(earning.payment_id, [...currentEarnings, { name: earning.name, amount: earning.amount }]);
        });

        // Step 8: Fetch payment_custom_deductions for the specified payment IDs
        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('payment_id, name, amount')
          .in('payment_id', paymentIds);

        if (customDeductionsError) throw customDeductionsError;

        const customDeductionsMap = new Map<string, any[]>();
        customDeductionsData.forEach(deduction => {
          const currentDeductions = customDeductionsMap.get(deduction.payment_id) || [];
          customDeductionsMap.set(deduction.payment_id, [...currentDeductions, { name: deduction.name, amount: deduction.amount }]);
        });

        // Step 9: Transform records into EmployeePayment objects
        const employeePayments: EmployeePayment[] = latestRecords.map(record => {
          const deduction = deductionsMap.get(record.id) || {};
          const earning = earningsMap.get(record.id) || {};
          const customEarnings = customEarningsMap.get(record.id) || [];
          const customDeductions = customDeductionsMap.get(record.id) || [];

          const incomeTax = deduction.income_tax || 0;
          const providentFund = deduction.provident_fund || 0;
          const professionalTax = deduction.professional_tax || 0;
          const taxes = incomeTax + professionalTax;
          const benefits = earning.payslipEnabled === true ? 1800 : 0;
          const grossEarnings = earning.gross_earnings || 0;

          // Calculate the total custom deductions
          const totalCustomDeductions = customDeductions.reduce((sum: number, deduction: { amount: number }) => sum + (deduction.amount || 0), 0);

          // Update netPay calculation to include custom deductions
          const netPay = grossEarnings - (benefits + taxes + providentFund + totalCustomDeductions);

          // Construct payslipData
          const paymentDate = new Date(record.updated_at);
          const payPeriod = paymentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

          const payslipData: PayslipData = {
            employeeId: record.employee_id || 'N/A',
            employeeName: record.employee_name || 'N/A',
            designation: record.designation || 'N/A',
            payPeriod: payPeriod,
            payDate: paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            dateOfJoining: record.joining_date || null,
            paidDays: deduction.paid_days || 30,
            lopDays: deduction.lop_days || 0,
            ctc: (earning.total_earnings || 0) * 12,
            basicSalary: earning.basic_salary || 0,
            houseRentAllowance: earning.house_rent_allowance || 0,
            conveyanceAllowance: earning.conveyance_allowance || 0,
            medicalAllowance: 0,
            specialAllowance: earning.fixed_allowance || 0,
            customEarnings: customEarnings,
            totalEarnings: earning.total_earnings || 0,
            providentFund: deduction.provident_fund || 0,
            professionalTax: deduction.professional_tax || 0,
            incomeTax: deduction.income_tax || 0,
            customDeductions: customDeductions,
            loanDeduction: deduction.loan_deduction || 0,
            totalDeductions: deduction.total_deductions || 0,
            netPayable: netPay, // Update netPayable with the corrected netPay
          };

          return {
            employee_name: record.employee_name,
            paid_days: deduction.paid_days || 30,
            net_pay: netPay,
            payslipData: payslipData,
            tds_sheet: incomeTax > 0 ? 'Yes' : 'No',
            payment_mode: 'Bank Transfer',
            payment_status: paymentStatus,
          };
        });

        setEmployees(employeePayments);
        setFilteredEmployees(employeePayments); // Initialize filtered employees
      } catch (error) {
        console.error('Error fetching employee payments:', error);
        setEmployees([]);
        setFilteredEmployees([]); // Initialize filtered employees
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeePayments();
  }, [year, month]);

  // Handle search input change and filter employees
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = employees.filter(employee =>
      employee.employee_name.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
  };

  const handleViewPayment = (payslipData: PayslipData | null) => {
    if (payslipData) {
      console.log('Opening payslip dialog for employee:', payslipData.employeeName);
      setSelectedPayslipData(payslipData);
      setIsPayslipDialogOpen(true);
    } else {
      console.warn('No payslip data available for this employee');
    }
  };

  const handlePayslipDialogClose = (open: boolean) => {
    console.log('Payslip dialog close triggered, open:', open);
    setIsPayslipDialogOpen(open);
    if (!open) {
      setSelectedPayslipData(null);
    }
  };

  const handleEmployeeClick = (payslipData: PayslipData | null) => {
    console.log('Employee clicked, payslipData:', payslipData);
    if (payslipData) {
      setSelectedEmployeePayslip(payslipData);
      setIsDrawerOpen(true);
    } else {
      console.warn('No payslip data available for this employee');
    }
  };

  const handleDrawerClose = (open: boolean) => {
    console.log('Drawer close triggered, open:', open);
    setIsDrawerOpen(open);
    if (!open) {
      setSelectedEmployeePayslip(null);
    }
  };

  const handleBackToPayroll = () => {
    console.log('Back to Payroll button clicked');
    navigate(-1);
  };

  // Utility function to format numbers as INR
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) return <p>Loading employee payments...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Payroll History - {month?.toUpperCase()} {year}
        </h1>
        <Button variant="outline" onClick={handleBackToPayroll}>
          Back to Payroll
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employees Paid for {month?.toUpperCase()} {year}</CardTitle>
          <div className="w-64">
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Paid Days</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Payslip</TableHead>
                  <TableHead>TDS Sheet</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => handleEmployeeClick(employee.payslipData)}
                      >
                        {employee.employee_name}
                      </button>
                    </TableCell>
                    <TableCell>{employee.paid_days}</TableCell>
                    <TableCell>₹{employee.net_pay.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      {employee.payslipData ? (
                        <Button
                          variant="link"
                          onClick={() => handleViewPayment(employee.payslipData)}
                        >
                          View
                        </Button>
                      ) : (
                        'No Payslip'
                      )}
                    </TableCell>
                    <TableCell>{employee.tds_sheet}</TableCell>
                    <TableCell>{employee.payment_mode}</TableCell>
                    <TableCell className="text-green-600">{employee.payment_status}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No employees found for this month.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog for displaying the payslip */}
      <Dialog open={isPayslipDialogOpen} onOpenChange={handlePayslipDialogClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payslip</DialogTitle>
          </DialogHeader>
          {selectedPayslipData && (
            <PayslipViewer payslipData={selectedPayslipData} paymentId={selectedPayslipData.employeeId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Drawer for displaying the employee payslip */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerClose} direction="right">
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => handleDrawerClose(false)}
          >
            <motion.div
              className="w-[450px] h-full fixed right-0 top-0 bg-gray-50 shadow-2xl z-50"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <DrawerHeader className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 z-30">
                <DrawerTitle className="text-2xl font-bold">
                  {selectedEmployeePayslip ? selectedEmployeePayslip.employeeName : "Employee Payslip"}
                </DrawerTitle>
                <DrawerClose className="absolute top-4 right-4 p-2 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </DrawerClose>
              </DrawerHeader>

              {selectedEmployeePayslip && (
                <div className="p-6 overflow-y-auto h-[calc(100%-80px)] bg-gray-50">
                  <motion.div
                    className="mb-3 bg-white p-5 rounded-lg shadow-sm border border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Employee Details</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-gray-500 font-medium">Employee ID:</span>
                        <p className="text-gray-800 font-medium">{selectedEmployeePayslip.employeeId}</p>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-gray-500 font-medium">Pay Date:</span>
                        <p className="text-gray-800 font-medium">{selectedEmployeePayslip.payDate}</p>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-500 font-medium">Paid Days:</span>
                        <p className="text-gray-800 font-medium">{selectedEmployeePayslip.paidDays}</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-3 bg-white p-5 rounded-lg shadow-sm border border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Earnings</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Basic Salary</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.basicSalary)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">House Rent Allowance</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.houseRentAllowance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Conveyance Allowance</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.conveyanceAllowance)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Special Allowance</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.specialAllowance)}</span>
                      </div>
                      {selectedEmployeePayslip.customEarnings.map((earning, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-2 hover:bg-gray-50 transition-colors duration-150"
                        >
                          <span className="text-gray-600">{earning.name}</span>
                          <span className="text-gray-800 font-medium">{formatINR(earning.amount)}</span>
                        </div>
                      ))}
                      <div classfilteredEmployees className="flex justify-between items-center py-2 border-t border-gray-200">
                        <span className="text-gray-700 font-semibold">Total Earnings</span>
                        <span className="text-blue-600 font-semibold">{formatINR(selectedEmployeePayslip.totalEarnings)}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-3 bg-white p-5 rounded-lg shadow-sm border border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Deductions</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between items-center py-2 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Provident Fund</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.providentFund)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Income Tax</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.incomeTax)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                        <span className="text-gray-600">Professional Tax</span>
                        <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.professionalTax)}</span>
                      </div>
                      {selectedEmployeePayslip.loanDeduction > 0 && (
                        <div className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150">
                          <span className="text-gray-600">Loan Deduction</span>
                          <span className="text-gray-800 font-medium">{formatINR(selectedEmployeePayslip.loanDeduction)}</span>
                        </div>
                      )}
                      {selectedEmployeePayslip.customDeductions.map((deduction, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-1 hover:bg-gray-50 transition-colors duration-150"
                        >
                          <span className="text-gray-600">{deduction.name}</span>
                          <span className="text-gray-800 font-medium">{formatINR(deduction.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-1 border-t border-gray-200">
                        <span className="text-gray-700 font-semibold">Total Deductions</span>
                        <span className="text-red-600 font-semibold">{formatINR(selectedEmployeePayslip.totalDeductions)}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="mb-3 bg-white p-5 rounded-lg shadow-sm border border-gray-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Net Pay</h3>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Total Net Payable</p>
                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {formatINR(selectedEmployeePayslip.netPayable)}
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PayrollHistoryDetails;