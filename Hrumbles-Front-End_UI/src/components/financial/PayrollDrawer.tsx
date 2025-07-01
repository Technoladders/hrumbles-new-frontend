import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useFinancialStore, Payment } from '@/lib/financial-data';
import { formatINR, parseCurrencyToNumber } from '@/utils/currency';
import { ChevronRight, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import DynamicEarningsDeductions from './DynamicEarningsDeductions';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";

type PaymentCategory = 'Staff' | 'Member' | 'Freelance' | 'Part-Time';
type PaymentStatus = 'Success' | 'Pending' | 'Unpaid';

interface PayrollDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment;
  editMode?: boolean;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  employment_start_date: string;
}

interface CTCFormData {
  ctc: string;
  basicPayPercentage: string;
  basicPay: string;
  hra: string;
  conveyanceAllowance: string;
  fixedAllowance: string;
}

interface HourlyFormData {
  hourlyRate: string;
  totalHoursWorked: string;
  basicPay: string;
  hra: string;
  conveyanceAllowance: string;
  fixedAllowance: string;
}

export const PayrollDrawer: React.FC<PayrollDrawerProps> = ({ open, onOpenChange, payment, editMode = false }) => {
  const { addPayment, updatePayment } = useFinancialStore();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [activeTab, setActiveTab] = useState("details");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    designation: '',
    joiningDate: '',
    payPeriod: '',
    payDate: new Date().toISOString().split('T')[0],
    bankAccount: '',
    uan: '',
    paidDays: '30',
    lopDays: '0',
    epf: '',
    incomeTax: '',
    professionalTax: '',
    loanDeduction: '',
    paymentStatus: 'Pending' as PaymentStatus,
  });
  const [ctcFormData, setCtcFormData] = useState<CTCFormData>({
    ctc: '',
    basicPayPercentage: '40',
    basicPay: '',
    hra: '',
    conveyanceAllowance: '',
    fixedAllowance: '',
  });
  const [hourlyFormData, setHourlyFormData] = useState<HourlyFormData>({
    hourlyRate: '',
    totalHoursWorked: '',
    basicPay: '',
    hra: '',
    conveyanceAllowance: '',
    fixedAllowance: '',
  });
  const [customEarnings, setCustomEarnings] = useState<{ name: string; amount: number }[]>([]);
  const [customDeductions, setCustomDeductions] = useState<{ name: string; amount: number }[]>([]);
  const [isCTCMode, setIsCTCMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, employee_id, first_name, last_name, position, employment_start_date')
        .or('employment_status.eq.active,employment_status.eq.Active');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast.warning('No employee records found, showing sample data');
        return [];
      }

      const employeeData: Employee[] = data.map((emp: any) => ({
        id: emp.id,
        employee_id: emp.employee_id || emp.id,
        full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        designation: emp.position || 'N/A',
        employment_start_date: emp.employment_start_date || '',
      }));

      setEmployees(employeeData);
      return employeeData;
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employee data');
      return [];
    }
  };

  useEffect(() => {
    if (editMode && payment) {
      const payDate = new Date(payment.paymentDate).toISOString().split('T')[0];
      setFormData({
        employeeId: payment.employeeId,
        employeeName: payment.employeeName,
        designation: payment.payslipData?.designation || '',
        joiningDate: payment.payslipData?.joiningDate || '',
        payPeriod: payment.payslipData?.payPeriod || '',
        payDate: payDate,
        bankAccount: '',
        uan: '',
        paidDays: payment.payslipData?.paidDays?.toString() || '30',
        lopDays: payment.payslipData?.lopDays?.toString() || '0',
        epf: payment.payslipData?.providentFund?.toString() || '',
        incomeTax: payment.payslipData?.incomeTax?.toString() || '',
        professionalTax: payment.payslipData?.professionalTax?.toString() || '',
        loanDeduction: payment.payslipData?.loanDeduction?.toString() || '',
        paymentStatus: payment.status as PaymentStatus,
      });

      const fetchRelatedData = async () => {
        const { data: earningsData } = await supabase
          .from('payment_earnings')
          .select('*')
          .eq('payment_id', payment.id)
          .single();

        const { data: deductionsData } = await supabase
          .from('payment_deductions')
          .select('*')
          .eq('payment_id', payment.id)
          .single();

        const { data: customEarningsData } = await supabase
          .from('payment_custom_earnings')
          .select('*')
          .eq('payment_id', payment.id);

        const { data: customDeductionsData } = await supabase
          .from('payment_custom_deductions')
          .select('*')
          .eq('payment_id', payment.id);

        if (earningsData) {
          const isCTCMode = earningsData.is_ctc_mode;
          setIsCTCMode(isCTCMode);
          if (isCTCMode) {
            const monthlyCTC = (payment.payslipData?.totalEarnings || 0) * 12;
            setCtcFormData({
              ctc: formatINR(monthlyCTC, { decimals: 0, showSymbol: false }),
              basicPayPercentage: '40',
              basicPay: formatINR(earningsData.basic_salary, { decimals: 0, showSymbol: false }),
              hra: formatINR(earningsData.house_rent_allowance, { decimals: 0, showSymbol: false }),
              conveyanceAllowance: formatINR(earningsData.conveyance_allowance, { decimals: 0, showSymbol: false }),
              fixedAllowance: formatINR(earningsData.fixed_allowance, { decimals: 0, showSymbol: false }),
            });
          } else {
            setHourlyFormData({
              hourlyRate: formatINR(earningsData.hourly_rate || 0, { decimals: 0, showSymbol: false }),
              totalHoursWorked: earningsData.total_hours_worked?.toString() || '',
              basicPay: formatINR(earningsData.basic_salary, { decimals: 0, showSymbol: false }),
              hra: formatINR(earningsData.house_rent_allowance, { decimals: 0, showSymbol: false }),
              conveyanceAllowance: formatINR(earningsData.conveyance_allowance, { decimals: 0, showSymbol: false }),
              fixedAllowance: formatINR(earningsData.fixed_allowance, { decimals: 0, showSymbol: false }),
            });
          }
        }

        if (customEarningsData) {
          setCustomEarnings(
            customEarningsData.map((item: any) => ({
              name: item.name,
              amount: item.amount,
            }))
          );
        }

        if (customDeductionsData) {
          setCustomDeductions(
            customDeductionsData.map((item: any) => ({
              name: item.name,
              amount: item.amount,
            }))
          );
        }
      };

      fetchRelatedData();
    } else {
      setFormData({
        employeeId: '',
        employeeName: '',
        designation: '',
        joiningDate: '',
        payPeriod: '',
        payDate: new Date().toISOString().split('T')[0],
        bankAccount: '',
        uan: '',
        paidDays: '30',
        lopDays: '0',
        epf: '',
        incomeTax: '',
        professionalTax: '',
        loanDeduction: '',
        paymentStatus: 'Pending' as PaymentStatus,
      });
      setCtcFormData({
        ctc: '',
        basicPayPercentage: '40',
        basicPay: '',
        hra: '',
        conveyanceAllowance: '',
        fixedAllowance: '',
      });
      setHourlyFormData({
        hourlyRate: '',
        totalHoursWorked: '',
        basicPay: '',
        hra: '',
        conveyanceAllowance: '',
        fixedAllowance: '',
      });
      setCustomEarnings([]);
      setCustomDeductions([]);
      setIsCTCMode(true);
    }
    fetchEmployees();
  }, [editMode, payment, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const employeeNameSelect = document.getElementById('employeeName');
        if (employeeNameSelect) {
          employeeNameSelect.focus();
        }
      }, 100);
    }
  }, [open]);

  const handleEmployeeSelect = (employeeName: string) => {
    const selectedEmployee = employees.find(emp => emp.full_name === employeeName);
    if (selectedEmployee) {
      setFormData(prev => ({
        ...prev,
        employeeId: selectedEmployee.employee_id,
        employeeName: selectedEmployee.full_name,
        designation: selectedEmployee.designation,
        joiningDate: selectedEmployee.employment_start_date,
      }));
    }
  };

  const calculateBasicPayFromCTC = (ctcValue: string, basicPayPercentage: string) => {
    const ctc = parseCurrencyToNumber(ctcValue);
    if (!ctc) return '';

    const percentage = parseFloat(basicPayPercentage) / 100;
    if (isNaN(percentage)) return '';

    const monthlySalary = ctc / 12;
    const basicPay = monthlySalary * percentage;
    return formatINR(basicPay, { decimals: 2, showSymbol: false });
  };

  const calculateBasicPayFromHourly = (hourlyRate: string, totalHoursWorked: string) => {
    const rate = parseCurrencyToNumber(hourlyRate);
    const hours = parseInt(totalHoursWorked);

    if (!rate || !hours) return '';
    const basicPay = rate * hours;
    return formatINR(basicPay, { decimals: 2, showSymbol: false });
  };

  const handleCTCChange = (value: string) => {
    const newBasicPay = calculateBasicPayFromCTC(value, ctcFormData.basicPayPercentage);
    setCtcFormData(prev => ({
      ...prev,
      ctc: value,
      basicPay: newBasicPay,
    }));
    if (newBasicPay) {
      handleBasicPayChange(newBasicPay, true);
    }
  };

  const handleHourlyRateChange = (value: string) => {
    const newBasicPay = calculateBasicPayFromHourly(value, hourlyFormData.totalHoursWorked);
    setHourlyFormData(prev => ({
      ...prev,
      hourlyRate: value,
      basicPay: newBasicPay,
    }));
    if (newBasicPay) {
      handleBasicPayChange(newBasicPay, false);
    }
  };

  const handleTotalHoursWorkedChange = (value: string) => {
    const newBasicPay = calculateBasicPayFromHourly(hourlyFormData.hourlyRate, value);
    setHourlyFormData(prev => ({
      ...prev,
      totalHoursWorked: value,
      basicPay: newBasicPay,
    }));
    if (newBasicPay) {
      handleBasicPayChange(newBasicPay, false);
    }
  };

  const handleBasicPayChange = (value: string, isCTC: boolean) => {
    const basicPay = parseCurrencyToNumber(value);
    const { hra, conveyanceAllowance, fixedAllowance } = calculateAllowances(basicPay);
    if (isCTC) {
      setCtcFormData(prev => ({
        ...prev,
        basicPay: value,
        hra: formatINR(hra, { decimals: 2, showSymbol: false }),
        conveyanceAllowance: formatINR(conveyanceAllowance, { decimals: 2, showSymbol: false }),
        fixedAllowance: formatINR(fixedAllowance, { decimals: 2, showSymbol: false }),
      }));
    } else {
      setHourlyFormData(prev => ({
        ...prev,
        basicPay: value,
        hra: formatINR(hra, { decimals: 2, showSymbol: false }),
        conveyanceAllowance: formatINR(conveyanceAllowance, { decimals: 2, showSymbol: false }),
        fixedAllowance: formatINR(fixedAllowance, { decimals: 2, showSymbol: false }),
      }));
    }
  };

  const calculateAllowances = (basicPay: number) => {
    const hra = basicPay * 0.5;
    const conveyanceAllowance = basicPay * 0.1;
    const fixedAllowance = basicPay - (hra + conveyanceAllowance);
    return { hra, conveyanceAllowance, fixedAllowance };
  };

  const calculateTotals = () => {
    const activeFormData = isCTCMode ? ctcFormData : hourlyFormData;
    const basicPay = parseCurrencyToNumber(activeFormData.basicPay);
    const hra = parseCurrencyToNumber(activeFormData.hra);
    const conveyanceAllowance = parseCurrencyToNumber(activeFormData.conveyanceAllowance);
    const fixedAllowance = parseCurrencyToNumber(activeFormData.fixedAllowance);
    const epf = parseCurrencyToNumber(formData.epf);
    const incomeTax = parseCurrencyToNumber(formData.incomeTax);
    const professionalTax = parseCurrencyToNumber(formData.professionalTax);
    const loanDeduction = parseCurrencyToNumber(formData.loanDeduction || '0');

    const totalCustomEarnings = customEarnings.reduce((sum, item) => sum + item.amount, 0);
    const totalCustomDeductions = customDeductions.reduce((sum, item) => sum + item.amount, 0);

    const paidDays = parseInt(formData.paidDays) || 30;
    const lopDays = parseInt(formData.lopDays) || 0;

    const originalStandardEarnings = basicPay + hra + conveyanceAllowance + fixedAllowance;
    let adjustedBasicPay = basicPay;
    let adjustedHra = hra;
    let adjustedConveyance = conveyanceAllowance;
    let adjustedFixedAllowance = fixedAllowance;
    let lopDeduction = 0;

    if (lopDays > 0 && paidDays > 0 && originalStandardEarnings > 0) {
      const totalWorkingDays = paidDays + lopDays;
      const perDaySalary = originalStandardEarnings / totalWorkingDays;
      lopDeduction = perDaySalary * lopDays;
      const basicProportion = basicPay / originalStandardEarnings;
      const hraProportion = hra / originalStandardEarnings;
      const conveyanceProportion = conveyanceAllowance / originalStandardEarnings;
      const fixedAllowanceProportion = fixedAllowance / originalStandardEarnings;

      adjustedBasicPay = basicPay - (lopDeduction * basicProportion);
      adjustedHra = hra - (lopDeduction * hraProportion);
      adjustedConveyance = conveyanceAllowance - (lopDeduction * conveyanceProportion);
      adjustedFixedAllowance = fixedAllowance - (lopDeduction * fixedAllowanceProportion);
    }

    const grossEarnings = adjustedBasicPay + adjustedHra + adjustedConveyance + adjustedFixedAllowance + totalCustomEarnings;
    const totalDeductions = epf + incomeTax + professionalTax + loanDeduction + totalCustomDeductions;
    const netPay = grossEarnings - totalDeductions;

    return {
      grossEarnings,
      totalDeductions,
      totalCustomEarnings,
      totalCustomDeductions,
      lopDeduction,
      netPay,
      formattedGrossEarnings: formatINR(grossEarnings),
      formattedTotalDeductions: formatINR(totalDeductions),
      formattedLopDeduction: formatINR(lopDeduction),
      formattedNetPay: formatINR(netPay),
      adjustedBasicPay,
      adjustedHra,
      adjustedConveyance,
      adjustedFixedAllowance
    };
  };

  const moveToNextTab = () => {
    if (activeTab === 'details') {
      if (!formData.employeeId || !formData.employeeName || !formData.payDate) {
        toast.error('Please fill in all required fields');
        return;
      }
      setActiveTab('earnings');
    } else if (activeTab === 'earnings') {
      const activeFormData = isCTCMode ? ctcFormData : hourlyFormData;
      if (!activeFormData.basicPay) {
        toast.error('Please enter the Basic Pay');
        return;
      }
      setActiveTab('deductions');
    }
  };

  const moveToPreviousTab = () => {
    if (activeTab === 'earnings') {
      setActiveTab('details');
    } else if (activeTab === 'deductions') {
      setActiveTab('earnings');
    }
  };

  const validateForm = () => {
    if (!formData.employeeId || !formData.employeeName || !formData.payDate) {
      toast.error('Please fill in all required fields');
      return false;
    }

    const activeFormData = isCTCMode ? ctcFormData : hourlyFormData;
    if (!activeFormData.basicPay) {
      toast.error('Please enter the Basic Pay');
      return false;
    }

    const paidDays = parseInt(formData.paidDays) || 30;
    const lopDays = parseInt(formData.lopDays) || 0;

    if (lopDays > paidDays) {
      toast.error('LOP days cannot exceed paid days');
      return false;
    }

    return true;
  };

  const handleSavePayment = async () => {
    try {
      if (!validateForm()) return;
      setIsSaving(true);

      const { netPay, grossEarnings, totalDeductions, adjustedBasicPay, adjustedHra, adjustedConveyance, adjustedFixedAllowance } = calculateTotals();

      const paymentDate = new Date(formData.payDate);
      const formattedPaymentDate = paymentDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const payslipData = {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        designation: formData.designation,
        payPeriod: formData.payPeriod || `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        basicSalary: adjustedBasicPay,
        houseRentAllowance: adjustedHra,
        conveyanceAllowance: adjustedConveyance,
        fixedAllowance: adjustedFixedAllowance,
        totalEarnings: grossEarnings,
        providentFund: parseCurrencyToNumber(formData.epf),
        professionalTax: parseCurrencyToNumber(formData.professionalTax),
        incomeTax: parseCurrencyToNumber(formData.incomeTax),
        loanDeduction: parseCurrencyToNumber(formData.loanDeduction || '0'),
        totalDeductions: totalDeductions,
        netPayable: netPay,
        paidDays: parseInt(formData.paidDays) || 30,
        lopDays: parseInt(formData.lopDays) || 0,
        customEarnings: customEarnings,
        customDeductions: customDeductions,
      };

      if (editMode && payment) {
        const { error: paymentError } = await supabase
          .from('payment_records')
          .update({
            employee_id: formData.employeeId,
            employee_name: formData.employeeName,
            designation: formData.designation,
            joining_date: formData.joiningDate ? new Date(formData.joiningDate) : null,
            payment_date: new Date(formData.payDate),
            payment_amount: netPay,
            payment_category: 'Staff' as PaymentCategory,
            status: formData.paymentStatus,
          })
          .eq('id', payment.id);

        if (paymentError) {
          throw new Error(`Error updating payment: ${paymentError.message}`);
        }

        const { error: earningsError } = await supabase
          .from('payment_earnings')
          .update({
            basic_salary: adjustedBasicPay,
            house_rent_allowance: adjustedHra,
            conveyance_allowance: adjustedConveyance,
            fixed_allowance: adjustedFixedAllowance,
            total_earnings: grossEarnings,
            gross_earnings: grossEarnings, // Add gross_earnings field
            is_ctc_mode: isCTCMode,
            hourly_rate: isCTCMode ? null : parseCurrencyToNumber(hourlyFormData.hourlyRate),
            total_hours_worked: isCTCMode ? null : parseCurrencyToNumber(hourlyFormData.totalHoursWorked),
          })
          .eq('payment_id', payment.id);

        if (earningsError) {
          throw new Error(`Error updating earnings: ${earningsError.message}`);
        }

        const { error: deductionsError } = await supabase
          .from('payment_deductions')
          .update({
            provident_fund: parseCurrencyToNumber(formData.epf) || 0,
            professional_tax: parseCurrencyToNumber(formData.professionalTax) || 0,
            income_tax: parseCurrencyToNumber(formData.incomeTax) || 0,
            loan_deduction: parseCurrencyToNumber(formData.loanDeduction || '0') || 0,
            total_deductions: totalDeductions,
            paid_days: parseInt(formData.paidDays) || 30,
            lop_days: parseInt(formData.lopDays) || 0,
          })
          .eq('payment_id', payment.id);

        if (deductionsError) {
          throw new Error(`Error updating deductions: ${deductionsError.message}`);
        }

        await supabase
          .from('payment_custom_earnings')
          .delete()
          .eq('payment_id', payment.id);

        await supabase
          .from('payment_custom_deductions')
          .delete()
          .eq('payment_id', payment.id);

        if (customEarnings.length > 0) {
          const customEarningsData = customEarnings.map(item => ({
            payment_id: payment.id,
            name: item.name,
            amount: item.amount,
            organization_id
          }));

          const { error: customEarningsError } = await supabase
            .from('payment_custom_earnings')
            .insert(customEarningsData);

          if (customEarningsError) {
            throw new Error(`Error saving custom earnings: ${customEarningsError.message}`);
          }
        }

        if (customDeductions.length > 0) {
          const customDeductionsData = customDeductions.map(item => ({
            payment_id: payment.id,
            name: item.name,
            amount: item.amount,
            organization_id
          }));

          const { error: customDeductionsError } = await supabase
            .from('payment_custom_deductions')
            .insert(customDeductionsData);

          if (customDeductionsError) {
            throw new Error(`Error saving custom deductions: ${customDeductionsError.message}`);
          }
        }

        const updatedPayment: Payment = {
          ...payment,
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          paymentDate: formattedPaymentDate,
          paymentAmount: netPay,
          paymentCategory: 'Staff' as PaymentCategory,
          status: formData.paymentStatus,
          payslipData: payslipData,
        };
        updatePayment(payment.id, updatedPayment);

        toast.success(`Payment for ${formData.employeeName} updated successfully`);
      } else {
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payment_records')
          .insert({
            employee_id: formData.employeeId,
            employee_name: formData.employeeName,
            designation: formData.designation,
            joining_date: formData.joiningDate ? new Date(formData.joiningDate) : null,
            payment_date: new Date(formData.payDate),
            payment_amount: netPay,
            payment_category: 'Staff' as PaymentCategory,
            status: formData.paymentStatus,
            organization_id,
          })
          .select()
          .single();

        if (paymentError) {
          throw new Error(`Error saving payment: ${paymentError.message}`);
        }

        const paymentId = paymentRecord.id;

        const { error: earningsError } = await supabase
          .from('payment_earnings')
          .insert({
            payment_id: paymentId,
            basic_salary: adjustedBasicPay,
            house_rent_allowance: adjustedHra,
            conveyance_allowance: adjustedConveyance,
            fixed_allowance: adjustedFixedAllowance,
            total_earnings: grossEarnings,
            gross_earnings: grossEarnings, // Add gross_earnings field
            is_ctc_mode: isCTCMode,
            hourly_rate: isCTCMode ? null : parseCurrencyToNumber(hourlyFormData.hourlyRate),
            total_hours_worked: isCTCMode ? null : parseCurrencyToNumber(hourlyFormData.totalHoursWorked),
            organization_id,
          });

        if (earningsError) {
          throw new Error(`Error saving earnings: ${earningsError.message}`);
        }

        const { error: deductionsError } = await supabase
          .from('payment_deductions')
          .insert({
            payment_id: paymentId,
            provident_fund: parseCurrencyToNumber(formData.epf) || 0,
            professional_tax: parseCurrencyToNumber(formData.professionalTax) || 0,
            income_tax: parseCurrencyToNumber(formData.incomeTax) || 0,
            loan_deduction: parseCurrencyToNumber(formData.loanDeduction || '0') || 0,
            total_deductions: totalDeductions,
            paid_days: parseInt(formData.paidDays) || 30,
            lop_days: parseInt(formData.lopDays) || 0,
            organization_id,
          });

        if (deductionsError) {
          throw new Error(`Error saving deductions: ${deductionsError.message}`);
        }

        if (customEarnings.length > 0) {
          const customEarningsData = customEarnings.map(item => ({
            payment_id: paymentId,
            name: item.name,
            amount: item.amount,
            organization_id
          }));

          const { error: customEarningsError } = await supabase
            .from('payment_custom_earnings')
            .insert(customEarningsData);

          if (customEarningsError) {
            throw new Error(`Error saving custom earnings: ${customEarningsError.message}`);
          }
        }

        if (customDeductions.length > 0) {
          const customDeductionsData = customDeductions.map(item => ({
            payment_id: paymentId,
            name: item.name,
            amount: item.amount,
            organization_id
          }));

          const { error: customDeductionsError } = await supabase
            .from('payment_custom_deductions')
            .insert(customDeductionsData);

          if (customDeductionsError) {
            throw new Error(`Error saving custom deductions: ${customDeductionsError.message}`);
          }
        }

        const newPayment: Omit<Payment, 'id'> = {
          employeeId: formData.employeeId,
          employeeName: formData.employeeName,
          paymentDate: formattedPaymentDate,
          paymentAmount: netPay,
          paymentCategory: 'Staff' as PaymentCategory,
          status: formData.paymentStatus,
          payslipData: payslipData,
        };

        addPayment(newPayment);
        toast.success(`Payment for ${formData.employeeName} added successfully`);
      }

      setFormData({
        employeeId: '',
        employeeName: '',
        designation: '',
        joiningDate: '',
        payPeriod: '',
        payDate: new Date().toISOString().split('T')[0],
        bankAccount: '',
        uan: '',
        paidDays: '30',
        lopDays: '0',
        epf: '',
        incomeTax: '',
        professionalTax: '',
        loanDeduction: '',
        paymentStatus: 'Pending' as PaymentStatus,
      });
      setCtcFormData({
        ctc: '',
        basicPayPercentage: '40',
        basicPay: '',
        hra: '',
        conveyanceAllowance: '',
        fixedAllowance: '',
      });
      setHourlyFormData({
        hourlyRate: '',
        totalHoursWorked: '',
        basicPay: '',
        hra: '',
        conveyanceAllowance: '',
        fixedAllowance: '',
      });
      setCustomEarnings([]);
      setCustomDeductions([]);
      setActiveTab('details');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const { formattedGrossEarnings, formattedTotalDeductions, formattedLopDeduction, formattedNetPay } = calculateTotals();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto focus-visible:outline-none">
        <SheetHeader className="mb-6">
          <div className="flex items-center space-x-4">
            <SheetTitle>{editMode ? 'Edit Payment' : 'Add New Payment'}</SheetTitle>
            {editMode && (
              <Select
                value={formData.paymentStatus}
                onValueChange={(value: PaymentStatus) => setFormData(prev => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger
                  id="paymentStatus"
                  className="w-[140px] h-9 text-sm font-semibold rounded-lg border-2 border-transparent bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:shadow-lg transition-shadow focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="Success" className="text-green-600 hover:bg-green-50">Success</SelectItem>
                  <SelectItem value="Pending" className="text-yellow-600 hover:bg-yellow-50">Pending</SelectItem>
                  <SelectItem value="Unpaid" className="text-red-600 hover:bg-red-50">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="details" className={activeTab === "details" ? "ring-0 focus:ring-0" : ""}>
              Employee Details
            </TabsTrigger>
            <TabsTrigger value="earnings" className={activeTab === "earnings" ? "ring-0 focus:ring-0" : ""}>
              Earnings
            </TabsTrigger>
            <TabsTrigger value="deductions" className={activeTab === "deductions" ? "ring-0 focus:ring-0" : ""}>
              Deductions
            </TabsTrigger>
          </TabsList>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Select onValueChange={handleEmployeeSelect} value={formData.employeeName}>
                    <SelectTrigger id="employeeName">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.full_name}>
                          {employee.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payPeriod">Pay Period</Label>
                  <Input
                    id="payPeriod"
                    type="month"
                    value={formData.payPeriod}
                    onChange={(e) => setFormData(prev => ({ ...prev, payPeriod: e.target.value }))}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payDate">Pay Date *</Label>
                  <Input
                    id="payDate"
                    type="date"
                    value={formData.payDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, payDate: e.target.value }))}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidDays">Paid Days</Label>
                  <Input
                    id="paidDays"
                    type="number"
                    min="0"
                    max="31"
                    value={formData.paidDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidDays: e.target.value }))}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lopDays">LOP Days</Label>
                  <Input
                    id="lopDays"
                    type="number"
                    min="0"
                    max={formData.paidDays}
                    value={formData.lopDays}
                    onChange={(e) => {
                      const lopDays = parseInt(e.target.value);
                      const paidDays = parseInt(formData.paidDays);
                      if (lopDays > paidDays) {
                        toast.error("LOP days cannot exceed paid days");
                        return;
                      }
                      setFormData(prev => ({ ...prev, lopDays: e.target.value }));
                    }}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="earnings" className="space-y-4">
              <Card className="p-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">CTC Calculations</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ctc">CTC (Annual)</Label>
                    <Input
                      id="ctc"
                      value={ctcFormData.ctc}
                      onChange={(e) => handleCTCChange(e.target.value)}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basicPayPercentage">Basic Pay (%)</Label>
                    <Input
                      id="basicPayPercentage"
                      value={ctcFormData.basicPayPercentage}
                      onChange={(e) => setCtcFormData(prev => ({ ...prev, basicPayPercentage: e.target.value }))}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basicPay">Basic Pay</Label>
                    <Input
                      id="basicPay"
                      value={ctcFormData.basicPay}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hra">HRA</Label>
                    <Input
                      id="hra"
                      value={ctcFormData.hra}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conveyanceAllowance">Conveyance Allowance</Label>
                    <Input
                      id="conveyanceAllowance"
                      value={ctcFormData.conveyanceAllowance}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixedAllowance">Fixed Allowance</Label>
                    <Input
                      id="fixedAllowance"
                      value={ctcFormData.fixedAllowance}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <DynamicEarningsDeductions
                    title="Custom Earnings"
                    items={customEarnings}
                    onChange={setCustomEarnings}
                    type="earnings"
                  />
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Gross Earnings:</span>
                    <span className="font-mono font-medium">{formattedGrossEarnings}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="epf">EPF Contribution</Label>
                    <Input
                      id="epf"
                      value={formData.epf}
                      onChange={(e) => setFormData(prev => ({ ...prev, epf: e.target.value }))}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incomeTax">Income Tax</Label>
                    <Input
                      id="incomeTax"
                      value={formData.incomeTax}
                      onChange={(e) => setFormData(prev => ({ ...prev, incomeTax: e.target.value }))}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professionalTax">Professional Tax</Label>
                    <Input
                      id="professionalTax"
                      value={formData.professionalTax}
                      onChange={(e) => setFormData(prev => ({ ...prev, professionalTax: e.target.value }))}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanDeduction">Loan Deduction</Label>
                    <Input
                      id="loanDeduction"
                      value={formData.loanDeduction}
                      onChange={(e) => setFormData(prev => ({ ...prev, loanDeduction: e.target.value }))}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <DynamicEarningsDeductions
                    title="Custom Deductions"
                    items={customDeductions}
                    onChange={setCustomDeductions}
                    type="deductions"
                  />
                </div>

                {parseInt(formData.lopDays) > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center text-amber-800">
                      <span className="font-medium">LOP Information ({formData.lopDays} days):</span>
                      <span className="font-mono font-medium">{formattedLopDeduction}</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      LOP deduction is proportionally distributed across all earning components
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Deductions:</span>
                    <span className="font-mono font-medium">{formattedTotalDeductions}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Net Pay:</span>
                    <span className="font-mono font-semibold">{formattedNetPay}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>

        <div className="mt-6 flex justify-between gap-3">
          {activeTab !== "details" && (
            <Button variant="outline" onClick={moveToPreviousTab}>
              Back
            </Button>
          )}
          <div className="flex-1"></div>
          {activeTab !== "deductions" ? (
            <Button onClick={moveToNextTab}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSavePayment} 
              disabled={isSaving}
            >
              <Save className="mr-1 h-4 w-4" />
              {isSaving ? 'Saving...' : editMode ? 'Update Payment' : 'Save Payment'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};