import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface PayrollSummary {
  totalSalary: number;
  employeeCount: number;
}

interface PayrollRun {
  year: number;
  month: string;
  payroll_cost: number;
  total_net_pay: number;
  employee_count: number;
  status: string;
  submitted_at: string;
}

interface ExitEmployee {
  employee_id: string;
  employee_name: string;
  final_settlement_date: string;
  last_working_day: string;
  net_pay: number;
}

const Payroll: React.FC = () => {
  const navigate = useNavigate();
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [exitEmployees, setExitEmployees] = useState<ExitEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Run Payroll' | 'Payroll History'>('Run Payroll');
  const [currentMonthStatus, setCurrentMonthStatus] = useState<string>('Projected');

  const today = new Date(); // Today’s date: May 21, 2025
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1); // May 1, 2025
  const currentMonth = format(currentMonthDate, 'MMM'); // "May"
  const currentYear = currentMonthDate.getFullYear(); // 2025
  const currentMonthNumber = format(currentMonthDate, 'MM'); // "05" for May
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // June 1, 2025 (for date range)

  // Fetch payroll summary, status, and exit employees for the current month
  useEffect(() => {
    const fetchPayrollSummary = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch the payroll run status for the current month
        const { data: payrollRun, error: payrollRunError } = await supabase
          .from('payroll_runs')
          .select('status')
          .eq('year', currentYear)
          .eq('month', currentMonth.toLowerCase())
          .single();

        if (payrollRunError && payrollRunError.code !== 'PGRST116') {
          console.error('Error fetching payroll run status:', payrollRunError);
          throw payrollRunError;
        }

        setCurrentMonthStatus(payrollRun?.status || 'Projected');

        // Step 2: Fetch payment records for the current month
        const { data: paymentRecords, error: paymentError } = await supabase
          .from('payment_records')
          .select('payment_amount, employee_id, updated_at')
          .gte('updated_at', `${currentYear}-${currentMonthNumber}-01`)
          .lt('updated_at', `${nextMonthDate.getFullYear()}-${format(nextMonthDate, 'MM')}-01`)
          .order('updated_at', { ascending: false });

        if (paymentError) throw paymentError;

        if (!paymentRecords || paymentRecords.length === 0) {
          setPayrollSummary({ totalSalary: 0, employeeCount: 0 });
        } else {
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

          // Step 5: Calculate total salary and employee count
          const totalSalary = latestRecords.reduce((sum: number, record: any) => sum + record.payment_amount, 0);
          const employeeCount = latestRecords.length;

          setPayrollSummary({ totalSalary, employeeCount });
        }

        // Step 6: Fetch employees with last_working_day in the current month from hr_employee_exits
        const { data: exitData, error: exitError } = await supabase
          .from('hr_employee_exits')
          .select('employee_id, employee_name, final_settlement_date, last_working_day')
          .gte('last_working_day', `${currentYear}-${currentMonthNumber}-01`)
          .lt('last_working_day', `${nextMonthDate.getFullYear()}-${format(nextMonthDate, 'MM')}-01`);

        if (exitError) throw exitError;

        if (exitData && exitData.length > 0) {
          // Step 7: Fetch net pay for these employees for the current month
          const exitEmployeeIds = exitData.map(employee => employee.employee_id);
          const { data: exitPaymentRecords, error: exitPaymentError } = await supabase
            .from('payment_records')
            .select('employee_id, payment_amount')
            .in('employee_id', exitEmployeeIds)
            .gte('updated_at', `${currentYear}-${currentMonthNumber}-01`)
            .lt('updated_at', `${nextMonthDate.getFullYear()}-${format(nextMonthDate, 'MM')}-01`)
            .order('updated_at', { ascending: false });

          if (exitPaymentError) throw exitPaymentError;

          // Step 8: Map the data to include net pay
          const exitEmployeesWithPay: ExitEmployee[] = exitData.map(employee => {
            const paymentRecord = exitPaymentRecords?.find(record => record.employee_id === employee.employee_id);
            return {
              employee_id: employee.employee_id,
              employee_name: employee.employee_name,
              final_settlement_date: employee.final_settlement_date,
              last_working_day: employee.last_working_day,
              net_pay: paymentRecord?.payment_amount || 0,
            };
          });

          setExitEmployees(exitEmployeesWithPay);
        } else {
          setExitEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching payroll summary:', error);
        setPayrollSummary({ totalSalary: 0, employeeCount: 0 });
        setCurrentMonthStatus('Projected');
        setExitEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch payroll history
    const fetchPayrollHistory = async () => {
      try {
        const { data: payrollRuns, error } = await supabase
          .from('payroll_runs')
          .select('*')
          .eq('status', 'Paid')
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (error) throw error;

        setPayrollHistory(payrollRuns || []);
      } catch (error) {
        console.error('Error fetching payroll history:', error);
        setPayrollHistory([]);
      }
    };

    fetchPayrollSummary();
    fetchPayrollHistory();
  }, [currentMonth, currentYear]);

  const handleViewDetails = () => {
    navigate(`/payroll/${currentYear}/${currentMonth.toLowerCase()}`);
  };

  const handleMonthClick = (year: number, month: string) => {
    navigate(`/payroll/history/${year}/${month.toLowerCase()}`);
  };

  // Navigate to TerminatedEmployeesPayroll with employee_id
  const handleEmployeeCardClick = (employeeId: string) => {
    navigate(`/payroll/terminated/${currentYear}/${currentMonth.toLowerCase()}/${employeeId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payroll</h1>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'Run Payroll'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('Run Payroll')}
        >
          Run Payroll
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'Payroll History'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('Payroll History')}
        >
          Payroll History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'Run Payroll' && (
        <div>
          {loading ? (
            <p>Loading payroll data...</p>
          ) : (
            <>
              {payrollSummary ? (
                <Card className="max-w-md mb-6">
                  <CardHeader>
                    <CardTitle>
                      Pay Run {currentMonth} {currentYear} (
                      <span
                        className={`${
                          currentMonthStatus === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                        } font-semibold`}
                      >
                        {currentMonthStatus}
                      </span>
                      )
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Salary:</span>
                        <span className="font-semibold">
                          ₹{payrollSummary.totalSalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">No. of Employees:</span>
                        <span className="font-semibold">{payrollSummary.employeeCount}</span>
                      </div>
                      <Button onClick={handleViewDetails} className="w-full">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p>No payroll data available for the current month.</p>
              )}

              {/* Individual Cards for Each Terminated Employee */}
              {exitEmployees.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4">Terminated Employees - {currentMonth} {currentYear}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exitEmployees.map(employee => (
                      <Card
                        key={employee.employee_id}
                        className="max-w-md cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleEmployeeCardClick(employee.employee_id)}
                      >
                        <CardHeader>
                          <CardTitle>{employee.employee_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Working Day:</span>
                              <span className="font-semibold">
                                {new Date(employee.last_working_day).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Final Settlement Date:</span>
                              <span className="font-semibold">
                                {new Date(employee.final_settlement_date).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Net Pay ({currentMonth} {currentYear}):</span>
                              <span className="font-semibold">
                                ₹{employee.net_pay.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'Payroll History' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Payroll History</h2>
          {payrollHistory.length > 0 ? (
            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Payroll Cost</TableHead>
                      <TableHead>Total Net Pay</TableHead>
                      <TableHead>Employee Count</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollHistory.map((run, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <button
                            className="text-blue-500 hover:underline"
                            onClick={() => handleMonthClick(run.year, run.month)}
                          >
                            {run.month.toUpperCase()}
                          </button>
                        </TableCell>
                        <TableCell>{run.year}</TableCell>
                        <TableCell>₹{run.payroll_cost.toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{run.total_net_pay.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{run.employee_count}</TableCell>
                        <TableCell>
                          <span
                            className={`${
                              run.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'
                            } font-semibold`}
                          >
                            {run.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(run.submitted_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p>No payroll history available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Payroll;