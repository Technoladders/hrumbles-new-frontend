import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronRight, Save } from "lucide-react";
import { motion } from "framer-motion";
import DynamicEarningsDeductions from './DynamicEarningsEmployee';
import { useSelector } from "react-redux";


interface PaymentEarning {
  id?: string;
  payment_id?: string;
  ctc?: number;
  basic_salary: number;
  house_rent_allowance: number;
  conveyance_allowance: number;
  fixed_allowance: number;
  is_ctc_mode: boolean;
  total_earnings: number;
  gross_earnings?: number;
  payslipEnabled: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaymentDeduction {
  id?: string;
  payment_id?: string;
  provident_fund: number;
  professional_tax: number;
  income_tax: number;
  loan_deduction: number;
  total_deductions: number;
  paid_days: number;
  lop_days: number;
  created_at?: string;
  updated_at?: string;
}

interface PaymentCustomDeduction {
  id?: string;
  payment_id?: string;
  name: string;
  amount: number;
  created_at?: string;
}

interface PaymentRecord {
  id?: string;
  employee_id: string;
  employee_name: string;
  designation: string | null;
  joining_date: string | null;
  payment_date: string;
  payment_amount: number;
  payslipEnabled: boolean;
  status: string;
  earnings: PaymentEarning;
  deductions: PaymentDeduction;
  customDeductions: PaymentCustomDeduction[];
}

interface EmployeesPayrollDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployee: { id: string; employee_id: string; first_name: string; last_name: string; position?: string; joining_date?: string; payment_id?: string } | null;
  month?: string;
  year?: string;
}

interface CTCFormData {
  ctc: string;
  basicPayPercentage: string;
  basicPay: string;
  hra: string;
  conveyanceAllowance: string;
  fixedAllowance: string;
}

const EmpPayrollDrawer = ({ isOpen, onOpenChange, selectedEmployee, month, year }: EmployeesPayrollDrawerProps) => {
  const [activeTab, setActiveTab] = useState("details");
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord>(() => ({
    employee_id: "",
    employee_name: "",
    designation: null,
    joining_date: null,
    payment_date: new Date().toISOString().split("T")[0],
    payment_amount: 0,
    payslipEnabled: false,
    status: "Pending",
    earnings: {
      ctc: 0,
      basic_salary: 0,
      house_rent_allowance: 0,
      conveyance_allowance: 0,
      fixed_allowance: 0,
      is_ctc_mode: true,
      total_earnings: 0,
      gross_earnings: 0,
      payslipEnabled: false,
    },
    deductions: {
      provident_fund: 0,
      professional_tax: 0,
      income_tax: 0,
      loan_deduction: 0,
      total_deductions: 0,
      paid_days: 30,
      lop_days: 0,
    },
    customDeductions: [],
  }));
  const [ctcFormData, setCtcFormData] = useState<CTCFormData>({
    ctc: '',
    basicPayPercentage: '40',
    basicPay: '',
    hra: '',
    conveyanceAllowance: '',
    fixedAllowance: '',
  });
  const [customDeductions, setCustomDeductions] = useState<PaymentCustomDeduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousPaymentAmount, setPreviousPaymentAmount] = useState<number | null>(null);

const employeeTabs = [
  { id: 'details', label: 'Employee Details' },
  { id: 'earnings_deductions', label: 'Earnings & Deductions' },
];

  useEffect(() => {
    if (isOpen && selectedEmployee) {
      setPaymentRecord({
        employee_id: selectedEmployee.employee_id,
        employee_name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
        designation: selectedEmployee.position || null,
        joining_date: selectedEmployee.joining_date || null,
        payment_date: new Date().toISOString().split("T")[0],
        payment_amount: 0,
        payslipEnabled: false,
        status: "Pending",
        earnings: {
          ctc: 0,
          basic_salary: 0,
          house_rent_allowance: 0,
          conveyance_allowance: 0,
          fixed_allowance: 0,
          is_ctc_mode: true,
          total_earnings: 0,
          gross_earnings: 0,
          payslipEnabled: false,
        },
        deductions: {
          provident_fund: 0,
          professional_tax: 0,
          income_tax: 0,
          loan_deduction: 0,
          total_deductions: 0,
          paid_days: 30,
          lop_days: 0,
        },
        customDeductions: [],
      });
      setCtcFormData({
        ctc: '',
        basicPayPercentage: '40',
        basicPay: '',
        hra: '',
        conveyanceAllowance: '',
        fixedAllowance: '',
      });
      setPreviousPaymentAmount(null);
      fetchPaymentRecord();
    }
  }, [isOpen, selectedEmployee]);

  const fetchPaymentRecord = async () => {
    if (!selectedEmployee || !selectedEmployee.payment_id) return;

    setLoading(true);
    try {
      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_records")
        .select("*")
        .eq("id", selectedEmployee.payment_id)
        .single();

      if (paymentError) throw paymentError;

      if (paymentData) {
        const { data: earningsData, error: earningsError } = await supabase
          .from("payment_earnings")
          .select("*")
          .eq("payment_id", paymentData.id)
          .maybeSingle();

        if (earningsError) throw earningsError;

        const { data: deductionsData, error: deductionsError } = await supabase
          .from("payment_deductions")
          .select("*")
          .eq("payment_id", paymentData.id)
          .maybeSingle();

        if (deductionsError) throw deductionsError;

        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from("payment_custom_deductions")
          .select("*")
          .eq("payment_id", paymentData.id);

        if (customDeductionsError) throw customDeductionsError;

        const record: PaymentRecord = {
          id: paymentData.id,
          employee_id: paymentData.employee_id,
          employee_name: paymentData.employee_name,
          designation: paymentData.designation,
          joining_date: paymentData.joining_date,
          payment_date: paymentData.payment_date,
          payment_amount: paymentData.payment_amount,
          payslipEnabled: earningsData?.payslipEnabled || false,
          status: paymentData.status,
          earnings: earningsData || {
            ctc: 0,
            basic_salary: 0,
            house_rent_allowance: 0,
            conveyance_allowance: 0,
            fixed_allowance: 0,
            is_ctc_mode: true,
            total_earnings: 0,
            gross_earnings: 0,
            payslipEnabled: false,
          },
          deductions: deductionsData || {
            provident_fund: 0,
            professional_tax: 0,
            income_tax: 0,
            loan_deduction: 0,
            total_deductions: 0,
            paid_days: 30,
            lop_days: 0,
          },
          customDeductions: customDeductionsData || [],
        };

        setPaymentRecord(record);
        setCustomDeductions(customDeductionsData || []);
        setPreviousPaymentAmount(paymentData.payment_amount || 0);

        if (earningsData) {
          const monthlyCTC = (earningsData.total_earnings || 0) * 12;
          const inferredBasicPayPercentage = earningsData.total_earnings
            ? ((earningsData.basic_salary / earningsData.total_earnings) * 100).toFixed(2)
            : '40';
          setCtcFormData({
            ctc: monthlyCTC.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            basicPayPercentage: inferredBasicPayPercentage,
            basicPay: Number(earningsData.basic_salary).toFixed(2),
            hra: Number(earningsData.house_rent_allowance).toFixed(2),
            conveyanceAllowance: Number(earningsData.conveyance_allowance).toFixed(2),
            fixedAllowance: Number(earningsData.fixed_allowance).toFixed(2),
          });
        }
      } else {
        toast.error("No payment record found for this month.");
        setPaymentRecord({
          employee_id: selectedEmployee.employee_id,
          employee_name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
          designation: selectedEmployee.position || null,
          joining_date: selectedEmployee.joining_date || null,
          payment_date: new Date().toISOString().split("T")[0],
          payment_amount: 0,
          payslipEnabled: false,
          status: "Pending",
          earnings: {
            ctc: 0,
            basic_salary: 0,
            house_rent_allowance: 0,
            conveyance_allowance: 0,
            fixed_allowance: 0,
            is_ctc_mode: true,
            total_earnings: 0,
            gross_earnings: 0,
            payslipEnabled: false,
          },
          deductions: {
            provident_fund: 0,
            professional_tax: 0,
            income_tax: 0,
            loan_deduction: 0,
            total_deductions: 0,
            paid_days: 30,
            lop_days: 0,
          },
          customDeductions: [],
        });
      }

      const { data: previousPaymentData, error: previousPaymentError } = await supabase
        .from("payment_records")
        .select("payment_amount")
        .eq("employee_id", selectedEmployee.employee_id)
        .lt("created_at", `${year}-${month === 'jan' ? '01' : month === 'feb' ? '02' : month === 'mar' ? '03' : month === 'apr' ? '04' : month === 'may' ? '05' : month === 'jun' ? '06' : month === 'jul' ? '07' : month === 'aug' ? '08' : month === 'sep' ? '09' : month === 'oct' ? '10' : month === 'nov' ? '11' : '12'}-01`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousPaymentError) {
        console.error("Error fetching previous payment record:", previousPaymentError);
      } else {
        setPreviousPaymentAmount(previousPaymentData?.payment_amount || null);
      }
    } catch (error: any) {
      console.error("Error fetching payment record:", error);
      toast.error(`Error fetching payment data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseCurrencyToNumber = (value: string): number => {
    if (!value) return 0;
    const cleanedValue = value.replace(/[^0-9.-]+/g, '');
    return parseFloat(cleanedValue) || 0;
  };

  const calculateBasicPayFromCTC = (ctcValue: string, basicPayPercentage: string) => {
    const ctc = parseCurrencyToNumber(ctcValue);
    if (!ctc) return 0;

    const percentage = parseFloat(basicPayPercentage) / 100;
    if (isNaN(percentage)) return 0;

    const monthlySalary = ctc / 12;
    const basicPay = monthlySalary * percentage;
    return Number(basicPay.toFixed(2));
  };

  const calculateAllowances = (basicPay: number, payslipEnabled: boolean) => {
    const hra = Number((basicPay * 0.5).toFixed(2));
    const conveyanceAllowance = Number((basicPay * 0.1).toFixed(2));
    let fixedAllowance = Number((basicPay * 0.4).toFixed(2));
    if (payslipEnabled) {
      fixedAllowance = Math.max(0, fixedAllowance - 1800);
    }
    return { hra, conveyanceAllowance, fixedAllowance };
  };

  const handleCTCChange = (value: string) => {
    const newBasicPay = calculateBasicPayFromCTC(value, ctcFormData.basicPayPercentage);
    const { hra, conveyanceAllowance, fixedAllowance } = calculateAllowances(newBasicPay, paymentRecord.payslipEnabled);

    setCtcFormData(prev => ({
      ...prev,
      ctc: value,
      basicPay: newBasicPay.toFixed(2),
      hra: hra.toFixed(2),
      conveyanceAllowance: conveyanceAllowance.toFixed(2),
      fixedAllowance: fixedAllowance.toFixed(2),
    }));

    setPaymentRecord(prev => {
      const updatedRecord = {
        ...prev,
        earnings: {
          ...prev.earnings,
          ctc: parseCurrencyToNumber(value),
          basic_salary: newBasicPay,
          house_rent_allowance: hra,
          conveyance_allowance: conveyanceAllowance,
          fixed_allowance: fixedAllowance,
          payslipEnabled: prev.payslipEnabled,
        },
      };
      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions);
      return newRecord;
    });
  };

  const handleBasicPayPercentageChange = (value: string) => {
    const newBasicPay = calculateBasicPayFromCTC(ctcFormData.ctc, value);
    const { hra, conveyanceAllowance, fixedAllowance } = calculateAllowances(newBasicPay, paymentRecord.payslipEnabled);

    setCtcFormData(prev => ({
      ...prev,
      basicPayPercentage: value,
      basicPay: newBasicPay.toFixed(2),
      hra: hra.toFixed(2),
      conveyanceAllowance: conveyanceAllowance.toFixed(2),
      fixedAllowance: fixedAllowance.toFixed(2),
    }));

    setPaymentRecord(prev => {
      const updatedRecord = {
        ...prev,
        earnings: {
          ...prev.earnings,
          ctc: parseCurrencyToNumber(ctcFormData.ctc),
          basic_salary: newBasicPay,
          house_rent_allowance: hra,
          conveyance_allowance: conveyanceAllowance,
          fixed_allowance: fixedAllowance,
          payslipEnabled: prev.payslipEnabled,
        },
      };
      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions);
      return newRecord;
    });
  };

  const calculateTotals = (currentRecord: PaymentRecord, currentCustomDeductions: PaymentCustomDeduction[]) => {
    const earnings = { ...currentRecord.earnings };
    const deductions = { ...currentRecord.deductions };

    let fixedAllowance = Number((earnings.basic_salary * 0.4).toFixed(2));
    if (currentRecord.payslipEnabled) {
      fixedAllowance = Math.max(0, fixedAllowance - 1800);
    }

    const totalEarnings = Number((
      (earnings.basic_salary || 0) +
      (earnings.house_rent_allowance || 0) +
      (earnings.conveyance_allowance || 0) +
      fixedAllowance
    ).toFixed(2));

    const totalCustomDeductions = Number(currentCustomDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0).toFixed(2));
    const totalDeductions = Number((
      (deductions.provident_fund || 0) +
      (deductions.professional_tax || 0) +
      (deductions.income_tax || 0) +
      (deductions.loan_deduction || 0) +
      totalCustomDeductions
    ).toFixed(2));

    const netPay = Number((totalEarnings - totalDeductions).toFixed(2));

    return {
      updatedRecord: {
        ...currentRecord,
        payment_amount: netPay,
        earnings: {
          ...earnings,
          total_earnings: totalEarnings,
          gross_earnings: totalEarnings,
          fixed_allowance: fixedAllowance,
        },
        deductions: { ...deductions, total_deductions: totalDeductions },
      },
      formattedGrossEarnings: totalEarnings.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      formattedTotalDeductions: totalDeductions.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      formattedNetPay: netPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  };

  const handleInputChange = (field: string, value: any, section?: "earnings" | "deductions") => {
    setPaymentRecord((prev) => {
      let updatedRecord = { ...prev };
      if (section) {
        const roundedValue = typeof value === 'number' ? Number(value.toFixed(2)) : value;
        updatedRecord = {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: roundedValue,
          },
        };
      } else {
        updatedRecord = {
          ...prev,
          [field]: value,
        };
      }

      if (field === "payslipEnabled") {
        const basicPay = updatedRecord.earnings.basic_salary;
        const { hra, conveyanceAllowance, fixedAllowance } = calculateAllowances(basicPay, value);
        updatedRecord.earnings = {
          ...updatedRecord.earnings,
          house_rent_allowance: hra,
          conveyance_allowance: conveyanceAllowance,
          fixed_allowance: fixedAllowance,
          payslipEnabled: value,
        };
        updatedRecord.payslipEnabled = value;
        setCtcFormData(prevCtc => ({
          ...prevCtc,
          hra: hra.toFixed(2),
          conveyanceAllowance: conveyanceAllowance.toFixed(2),
          fixedAllowance: fixedAllowance.toFixed(2),
        }));
      }

      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions);
      return newRecord;
    });
  };

  const handleCustomDeductionChange = (updatedDeductions: PaymentCustomDeduction[]) => {
    const roundedDeductions = updatedDeductions.map(ded => ({
      ...ded,
      amount: Number(ded.amount.toFixed(2)),
    }));
    setCustomDeductions(roundedDeductions);
    setPaymentRecord((prev) => {
      const { updatedRecord } = calculateTotals(prev, roundedDeductions);
      return updatedRecord;
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const isUpdate = !!paymentRecord.id;
      const currentTimestamp = new Date().toISOString();
      let paymentId = paymentRecord.id;

      const isAppraisal = previousPaymentAmount !== null && paymentRecord.payment_amount !== previousPaymentAmount;

      if (isUpdate) {
        const { error: paymentError } = await supabase
          .from("payment_records")
          .update({
            payment_date: paymentRecord.payment_date,
            payment_amount: paymentRecord.payment_amount,
            status: paymentRecord.status,
            updated_at: currentTimestamp,
            last_updated_by: "EmployeesPayrollDrawer",
          })
          .eq("id", paymentId);

        if (paymentError) {
          console.error("Payment Records Update Error:", paymentError);
          throw new Error(`Failed to update payment_records: ${paymentError.message}`);
        }

        const { data: existingEarnings, error: fetchEarningsError } = await supabase
          .from("payment_earnings")
          .select("id")
          .eq("payment_id", paymentId)
          .maybeSingle();

        if (fetchEarningsError) {
          console.error("Fetch Earnings Error:", fetchEarningsError);
          throw new Error(`Failed to fetch payment_earnings: ${fetchEarningsError.message}`);
        }

        const earningsData = {
          payment_id: paymentId,
          ctc: paymentRecord.earnings.ctc || 0,
          basic_salary: paymentRecord.earnings.basic_salary || 0,
          house_rent_allowance: paymentRecord.earnings.house_rent_allowance || 0,
          conveyance_allowance: paymentRecord.earnings.conveyance_allowance || 0,
          fixed_allowance: paymentRecord.earnings.fixed_allowance || 0,
          is_ctc_mode: paymentRecord.earnings.is_ctc_mode ?? true,
          total_earnings: paymentRecord.earnings.total_earnings || 0,
          gross_earnings: paymentRecord.earnings.gross_earnings || 0,
          payslipEnabled: paymentRecord.payslipEnabled,
          updated_at: currentTimestamp,
          created_at: paymentRecord.earnings.created_at || currentTimestamp,
          organization_id: organization_id,
        };

        if (existingEarnings) {
          const { error: earningsError } = await supabase
            .from("payment_earnings")
            .update({
              ctc: earningsData.ctc,
              basic_salary: earningsData.basic_salary,
              house_rent_allowance: earningsData.house_rent_allowance,
              conveyance_allowance: earningsData.conveyance_allowance,
              fixed_allowance: earningsData.fixed_allowance,
              is_ctc_mode: earningsData.is_ctc_mode,
              total_earnings: earningsData.total_earnings,
              gross_earnings: earningsData.gross_earnings,
              payslipEnabled: earningsData.payslipEnabled,
              updated_at: earningsData.updated_at,
            })
            .eq("payment_id", paymentId);

          if (earningsError) {
            console.error("Payment Earnings Update Error:", earningsError);
            throw new Error(`Failed to update payment_earnings: ${earningsError.message}`);
          }
        } else {
          const { error: earningsError } = await supabase
            .from("payment_earnings")
            .insert(earningsData);

          if (earningsError) {
            console.error("Payment Earnings Insert Error:", earningsError);
            throw new Error(`Failed to insert payment_earnings: ${earningsError.message}`);
          }
        }

        const { data: existingDeductions, error: fetchDeductionsError } = await supabase
          .from("payment_deductions")
          .select("id")
          .eq("payment_id", paymentId)
          .maybeSingle();

        if (fetchDeductionsError) {
          console.error("Fetch Deductions Error:", fetchDeductionsError);
          throw new Error(`Failed to fetch payment_deductions: ${fetchDeductionsError.message}`);
        }

        const deductionsData = {
          payment_id: paymentId,
          provident_fund: paymentRecord.deductions.provident_fund || 0,
          professional_tax: paymentRecord.deductions.professional_tax || 0,
          income_tax: paymentRecord.deductions.income_tax || 0,
          loan_deduction: paymentRecord.deductions.loan_deduction || 0,
          total_deductions: paymentRecord.deductions.total_deductions || 0,
          paid_days: paymentRecord.deductions.paid_days || 30,
          lop_days: paymentRecord.deductions.lop_days || 0,
          updated_at: currentTimestamp,
          created_at: paymentRecord.deductions.created_at || currentTimestamp,
          organization_id: organization_id,
        };

        if (existingDeductions) {
          const { error: deductionsError } = await supabase
            .from("payment_deductions")
            .update({
              provident_fund: deductionsData.provident_fund,
              professional_tax: deductionsData.professional_tax,
              income_tax: deductionsData.income_tax,
              loan_deduction: deductionsData.loan_deduction,
              total_deductions: deductionsData.total_deductions,
              paid_days: deductionsData.paid_days,
              lop_days: deductionsData.lop_days,
              updated_at: deductionsData.updated_at,
            })
            .eq("payment_id", paymentId);

          if (deductionsError) {
            console.error("Payment Deductions Update Error:", deductionsError);
            throw new Error(`Failed to update payment_deductions: ${deductionsError.message}`);
          }
        } else {
          const { error: deductionsError } = await supabase
            .from("payment_deductions")
            .insert(deductionsData);

          if (deductionsError) {
            console.error("Payment Deductions Insert Error:", deductionsError);
            throw new Error(`Failed to insert payment_deductions: ${deductionsError.message}`);
          }
        }

        const { error: deleteCustomDeductionsError } = await supabase
          .from("payment_custom_deductions")
          .delete()
          .eq("payment_id", paymentId);

        if (deleteCustomDeductionsError) {
          console.error("Custom Deductions Delete Error:", deleteCustomDeductionsError);
          throw new Error(`Failed to delete payment_custom_deductions: ${deleteCustomDeductionsError.message}`);
        }

        if (customDeductions.length > 0) {
          const customDeductionsToInsert = customDeductions.map((ded) => ({
            payment_id: paymentId,
            name: ded.name,
            amount: ded.amount || 0,
            created_at: ded.created_at || currentTimestamp,
            organization_id: organization_id,
          }));

          const { error: customDeductionsError } = await supabase
            .from("payment_custom_deductions")
            .insert(customDeductionsToInsert);

          if (customDeductionsError) {
            console.error("Custom Deductions Insert Error:", customDeductionsError);
            throw new Error(`Failed to insert payment_custom_deductions: ${customDeductionsError.message}`);
          }
        }

        if (isAppraisal && previousPaymentAmount !== null && paymentId) {
          const { error: appraisalError } = await supabase
            .from("appraisal_records")
            .insert({
              employee_id: selectedEmployee.employee_id,
              payment_record_id: paymentId,
              appraisal_date: paymentRecord.payment_date,
              new_payment_amount: paymentRecord.payment_amount,
              previous_payment_amount: previousPaymentAmount,
              status: paymentRecord.status,
              created_at: currentTimestamp,
              updated_at: currentTimestamp,
              last_updated_by: "EmployeesPayrollDrawer",
              organization_id: organization_id,
            });

          if (appraisalError) {
            console.error("Appraisal Records Insert Error:", appraisalError);
            throw new Error(`Failed to insert appraisal_records: ${appraisalError.message}`);
          }
        }

        toast.success("Payment record updated successfully");
      } else {
        const { data: newPayment, error: paymentError } = await supabase
          .from("payment_records")
          .insert({
            employee_id: paymentRecord.employee_id,
            employee_name: paymentRecord.employee_name,
            designation: paymentRecord.designation,
            joining_date: paymentRecord.joining_date,
            payment_date: paymentRecord.payment_date,
            payment_amount: paymentRecord.payment_amount,
            status: paymentRecord.status,
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            last_updated_by: "EmployeesPayrollDrawer",
            source: "EmployeesPayrollDrawer",
            orangization_id: organization_id,
          })
          .select()
          .single();

        if (paymentError) {
          console.error("Payment Records Insert Error:", paymentError);
          throw new Error(`Failed to insert payment_records: ${paymentError.message}`);
        }

        paymentId = newPayment.id;

        if (!paymentId) {
          throw new Error("Failed to retrieve paymentId after inserting payment_records");
        }

        const { error: earningsError } = await supabase
          .from("payment_earnings")
          .insert({
            payment_id: paymentId,
            ctc: paymentRecord.earnings.ctc || 0,
            basic_salary: paymentRecord.earnings.basic_salary || 0,
            house_rent_allowance: paymentRecord.earnings.house_rent_allowance || 0,
            conveyance_allowance: paymentRecord.earnings.conveyance_allowance || 0,
            fixed_allowance: paymentRecord.earnings.fixed_allowance || 0,
            is_ctc_mode: paymentRecord.earnings.is_ctc_mode ?? true,
            total_earnings: paymentRecord.earnings.total_earnings || 0,
            gross_earnings: paymentRecord.earnings.gross_earnings || 0,
            payslipEnabled: paymentRecord.payslipEnabled,
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            organization_id: organization_id,
          });

        if (earningsError) {
          console.error("Payment Earnings Insert Error:", earningsError);
          throw new Error(`Failed to insert payment_earnings: ${earningsError.message}`);
        }

        const { error: deductionsError } = await supabase
          .from("payment_deductions")
          .insert({
            payment_id: paymentId,
            provident_fund: paymentRecord.deductions.provident_fund || 0,
            professional_tax: paymentRecord.deductions.professional_tax || 0,
            income_tax: paymentRecord.deductions.income_tax || 0,
            loan_deduction: paymentRecord.deductions.loan_deduction || 0,
            total_deductions: paymentRecord.deductions.total_deductions || 0,
            paid_days: paymentRecord.deductions.paid_days || 30,
            lop_days: paymentRecord.deductions.lop_days || 0,
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            organization_id: organization_id,
          });

        if (deductionsError) {
          console.error("Payment Deductions Insert Error:", deductionsError);
          throw new Error(`Failed to insert payment_deductions: ${deductionsError.message}`);
        }

        if (customDeductions.length > 0) {
          const customDeductionsToInsert = customDeductions.map((ded) => ({
            payment_id: paymentId,
            name: ded.name,
            amount: ded.amount || 0,
            created_at: ded.created_at || currentTimestamp,
            organization_id: organization_id,
          }));

          const { error: customDeductionsError } = await supabase
            .from("payment_custom_deductions")
            .insert(customDeductionsToInsert);

          if (customDeductionsError) {
            console.error("Custom Deductions Insert Error:", customDeductionsError);
            throw new Error(`Failed to insert payment_custom_deductions: ${customDeductionsError.message}`);
          }
        }

        if (isAppraisal && previousPaymentAmount !== null && paymentId) {
          const { error: appraisalError } = await supabase
            .from("appraisal_records")
            .insert({
              employee_id: selectedEmployee.employee_id,
              payment_record_id: paymentId,
              appraisal_date: paymentRecord.payment_date,
              new_payment_amount: paymentRecord.payment_amount,
              previous_payment_amount: previousPaymentAmount,
              status: paymentRecord.status,
              created_at: currentTimestamp,
              updated_at: currentTimestamp,
              last_updated_by: "EmployeesPayrollDrawer",
              organization_id: organization_id,
            });

          if (appraisalError) {
            console.error("Appraisal Records Insert Error:", appraisalError);
            throw new Error(`Failed to insert appraisal_records: ${appraisalError.message}`);
          }
        }

        toast.success("Payment record created successfully");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving payment record:", error);
      toast.error(`Error saving payment data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const moveToNextTab = () => {
    if (activeTab === 'details') {
      if (!paymentRecord.employee_id || !paymentRecord.employee_name || !paymentRecord.payment_date) {
        toast.error('Please fill in all required fields');
        return;
      }
      setActiveTab('earnings_deductions');
    }
  };

  const moveToPreviousTab = () => {
    if (activeTab === 'earnings_deductions') {
      setActiveTab('details');
    }
  };

  const { formattedGrossEarnings, formattedTotalDeductions, formattedNetPay } = calculateTotals(paymentRecord, customDeductions);

  if (!selectedEmployee) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto focus-visible:outline-none">
        <SheetHeader className="mb-6">
          <div className="flex items-center space-x-4">
            <SheetTitle>
              {paymentRecord.id ? "Update Payment for" : "Add Payment for"} {selectedEmployee.first_name} {selectedEmployee.last_name}
            </SheetTitle>
            {paymentRecord.id && (
              <Select
                value={paymentRecord.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger
                  className="w-[140px] h-9 text-sm font-semibold rounded-lg border-2 border-transparent bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:shadow-lg transition-shadow focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                  <SelectItem value="Pending" className="text-yellow-600 hover:bg-yellow-50">Pending</SelectItem>
                  <SelectItem value="Success" className="text-green-600 hover:bg-green-50">Success</SelectItem>
                  <SelectItem value="Failed" className="text-red-600 hover:bg-red-50">Failed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2">
            <TabsTrigger value="details" className={activeTab === "details" ? "ring-0 focus:ring-0" : ""}>
              Employee Details
            </TabsTrigger>
            <TabsTrigger value="earnings_deductions" className={activeTab === "earnings_deductions" ? "ring-0 focus:ring-0" : ""}>
              Earnings & Deductions
            </TabsTrigger>
          </TabsList>
ew
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Employee Name *</Label>
                  <Input
                    id="employeeName"
                    value={paymentRecord.employee_name}
                    readOnly
                    className="bg-gray-100 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Pay Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentRecord.payment_date}
                    onChange={(e) => handleInputChange("payment_date", e.target.value)}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payslipEnabled">PF (Provident Fund)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="payslipEnabled"
                      checked={paymentRecord.payslipEnabled}
                      onCheckedChange={(checked) => handleInputChange("payslipEnabled", checked)}
                    />
                    <Label htmlFor="payslipEnabled" className="text-sm">
                      Yes / No
                    </Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidDays">Paid Days</Label>
                  <Input
                    id="paidDays"
                    type="number"
                    min="0"
                    max="31"
                    value={paymentRecord.deductions.paid_days}
                    onChange={(e) => handleInputChange("paid_days", Number(e.target.value), "deductions")}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lopDays">LOP Days</Label>
                  <Input
                    id="lopDays"
                    type="number"
                    min="0"
                    max={paymentRecord.deductions.paid_days}
                    value={paymentRecord.deductions.lop_days}
                    onChange={(e) => {
                      const lopDays = Number(e.target.value);
                      if (lopDays > paymentRecord.deductions.paid_days) {
                        toast.error("LOP days cannot exceed paid days");
                        return;
                      }
                      handleInputChange("lop_days", lopDays, "deductions");
                    }}
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="earnings_deductions" className="space-y-6">
              <Card className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">CTC & Earnings</h3>
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
                      onChange={(e) => handleBasicPayPercentageChange(e.target.value)}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">Basic Salary</Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      value={ctcFormData.basicPay}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hra">House Rent Allowance</Label>
                    <Input
                      id="hra"
                      type="number"
                      value={ctcFormData.hra}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conveyanceAllowance">Conveyance Allowance</Label>
                    <Input
                      id="conveyanceAllowance"
                      type="number"
                      value={ctcFormData.conveyanceAllowance}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixedAllowance">Fixed Allowance</Label>
                    <Input
                      id="fixedAllowance"
                      type="number"
                      value={ctcFormData.fixedAllowance}
                      readOnly
                      className="bg-gray-100 font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Deductions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="providentFund">Provident Fund</Label>
                    <Input
                      id="providentFund"
                      type="number"
                      value={Number(paymentRecord.deductions.provident_fund).toFixed(2)}
                      onChange={(e) => handleInputChange("provident_fund", Number(e.target.value), "deductions")}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professionalTax">Professional Tax</Label>
                    <Input
                      id="professionalTax"
                      type="number"
                      value={Number(paymentRecord.deductions.professional_tax).toFixed(2)}
                      onChange={(e) => handleInputChange("professional_tax", Number(e.target.value), "deductions")}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incomeTax">Income Tax</Label>
                    <Input
                      id="incomeTax"
                      type="number"
                      value={Number(paymentRecord.deductions.income_tax).toFixed(2)}
                      onChange={(e) => handleInputChange("income_tax", Number(e.target.value), "deductions")}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loanDeduction">Loan Deduction</Label>
                    <Input
                      id="loanDeduction"
                      type="number"
                      value={Number(paymentRecord.deductions.loan_deduction).toFixed(2)}
                      onChange={(e) => handleInputChange("loan_deduction", Number(e.target.value), "deductions")}
                      className="font-mono focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <DynamicEarningsDeductions
                    title="Custom Deductions"
                    items={customDeductions}
                    onChange={handleCustomDeductionChange}
                    type="deductions"
                  />
                </div>
              </Card>
              
              <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Gross Earnings:</span>
                    <span className="font-mono font-medium">{formattedGrossEarnings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Deductions:</span>
                    <span className="font-mono font-medium">{formattedTotalDeductions}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Net Pay:</span>
                    <span className="font-mono font-semibold">{formattedNetPay}</span>
                  </div>
                </div>

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
          {activeTab !== "earnings_deductions" ? (
            <Button onClick={moveToNextTab}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={loading}
            >
              <Save className="mr-1 h-4 w-4" />
              {loading ? 'Saving...' : paymentRecord.id ? 'Update Payment' : 'Save Payment'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EmpPayrollDrawer;