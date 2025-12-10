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
import { ChevronRight, Save, RefreshCcw, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import DynamicEarningsDeductions from './DynamicEarningsEmployee';
import { useSelector } from "react-redux";

// --- Interfaces ---

interface PaymentEarning {
  id?: string;
  payment_id?: string;
  ctc?: number;
  basic_salary: number;
  house_rent_allowance: number;
  conveyance_allowance: number; // Used for LTA
  fixed_allowance: number;
  is_ctc_mode: boolean;
  total_earnings: number;
  gross_earnings?: number;
  payslipEnabled: boolean;
  gratuity_enabled: boolean;
  gratuity_percentage: number;
  gratuity_amount: number;
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

interface PaymentCustomItem {
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
  customDeductions: PaymentCustomItem[];
  customEarnings: PaymentCustomItem[];
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
  lta: string; // Changed from conveyanceAllowance
  fixedAllowance: string;
  gratuityPercentage: string;
}

const EmpPayrollDrawer = ({ isOpen, onOpenChange, selectedEmployee, month, year }: EmployeesPayrollDrawerProps) => {
  const [activeTab, setActiveTab] = useState("details");
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  // Toggle for Calculation Mode
  const [calculationMode, setCalculationMode] = useState<'auto' | 'manual'>('auto');

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
      conveyance_allowance: 0, // LTA
      fixed_allowance: 0,
      is_ctc_mode: true,
      total_earnings: 0,
      gross_earnings: 0,
      payslipEnabled: false,
      gratuity_enabled: false,
      gratuity_percentage: 0,
      gratuity_amount: 0,
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
    customEarnings: [],
  }));

  const [ctcFormData, setCtcFormData] = useState<CTCFormData>({
    ctc: '',
    basicPayPercentage: '40',
    basicPay: '',
    hra: '',
    lta: '',
    fixedAllowance: '',
    gratuityPercentage: '4.81', // Standard Gratuity %
  });

  const [customDeductions, setCustomDeductions] = useState<PaymentCustomItem[]>([]);
  const [customEarnings, setCustomEarnings] = useState<PaymentCustomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousPaymentAmount, setPreviousPaymentAmount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && selectedEmployee) {
      // Reset State
      const initialRecord = {
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
          gratuity_enabled: false,
          gratuity_percentage: 0,
          gratuity_amount: 0,
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
        customEarnings: [],
      };
      
      setPaymentRecord(initialRecord);
      setCtcFormData({
        ctc: '',
        basicPayPercentage: '40',
        basicPay: '',
        hra: '',
        lta: '',
        fixedAllowance: '',
        gratuityPercentage: '4.81',
      });
      setCalculationMode('auto');
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

        // Fetch Custom Earnings
        const { data: customEarningsData, error: customEarningsError } = await supabase
          .from("payment_custom_earnings")
          .select("*")
          .eq("payment_id", paymentData.id);
        
        // If table doesn't exist yet, ignore error
        if (customEarningsError && customEarningsError.code !== '42P01') { 
             console.error("Custom Earnings Error", customEarningsError);
        }

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
          earnings: earningsData || paymentRecord.earnings,
          deductions: deductionsData || paymentRecord.deductions,
          customDeductions: customDeductionsData || [],
          customEarnings: customEarningsData || [],
        };

        setPaymentRecord(record);
        setCustomDeductions(customDeductionsData || []);
        setCustomEarnings(customEarningsData || []);
        setPreviousPaymentAmount(paymentData.payment_amount || 0);

        if (earningsData) {
          const monthlyCTC = (earningsData.total_earnings || 0) * 12; // Rough estimate if not stored
          const inferredBasicPayPercentage = earningsData.total_earnings && earningsData.basic_salary
            ? ((earningsData.basic_salary / (earningsData.ctc ? earningsData.ctc/12 : earningsData.total_earnings)) * 100).toFixed(2)
            : '40';
            
          setCtcFormData({
            ctc: (earningsData.ctc || monthlyCTC).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
            basicPayPercentage: '40', // Default visual
            basicPay: Number(earningsData.basic_salary).toFixed(2),
            hra: Number(earningsData.house_rent_allowance).toFixed(2),
            lta: Number(earningsData.conveyance_allowance).toFixed(2),
            fixedAllowance: Number(earningsData.fixed_allowance).toFixed(2),
            gratuityPercentage: earningsData.gratuity_percentage ? Number(earningsData.gratuity_percentage).toFixed(2) : '4.81',
          });
          
          // Determine if we should be in manual mode based on is_ctc_mode flag
          if (earningsData.is_ctc_mode === false) {
            setCalculationMode('manual');
          }
        }
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

  // --- Auto Calculation Logic ---

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
    const lta = Number((basicPay * 0.1).toFixed(2)); // Previously conveyance
    let fixedAllowance = Number((basicPay * 0.4).toFixed(2));
    if (payslipEnabled) {
      fixedAllowance = Math.max(0, fixedAllowance - 1800);
    }
    return { hra, lta, fixedAllowance };
  };

  const handleCTCChange = (value: string) => {
    if (calculationMode === 'manual') return; // Should not happen in UI, but safeguard

    const newBasicPay = calculateBasicPayFromCTC(value, ctcFormData.basicPayPercentage);
    const { hra, lta, fixedAllowance } = calculateAllowances(newBasicPay, paymentRecord.payslipEnabled);

    // Calculate Gratuity if enabled
    let gratuityAmount = 0;
    if (paymentRecord.earnings.gratuity_enabled) {
      const gPerc = parseFloat(ctcFormData.gratuityPercentage) || 0;
      gratuityAmount = Number((newBasicPay * (gPerc / 100)).toFixed(2));
    }

    setCtcFormData(prev => ({
      ...prev,
      ctc: value,
      basicPay: newBasicPay.toFixed(2),
      hra: hra.toFixed(2),
      lta: lta.toFixed(2),
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
          conveyance_allowance: lta,
          fixed_allowance: fixedAllowance,
          gratuity_amount: gratuityAmount,
          is_ctc_mode: true,
        },
      };
      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
      return newRecord;
    });
  };

  const handleBasicPayPercentageChange = (value: string) => {
    if (calculationMode === 'manual') return;

    const newBasicPay = calculateBasicPayFromCTC(ctcFormData.ctc, value);
    const { hra, lta, fixedAllowance } = calculateAllowances(newBasicPay, paymentRecord.payslipEnabled);

    // Gratuity recalc
    let gratuityAmount = 0;
    if (paymentRecord.earnings.gratuity_enabled) {
      const gPerc = parseFloat(ctcFormData.gratuityPercentage) || 0;
      gratuityAmount = Number((newBasicPay * (gPerc / 100)).toFixed(2));
    }

    setCtcFormData(prev => ({
      ...prev,
      basicPayPercentage: value,
      basicPay: newBasicPay.toFixed(2),
      hra: hra.toFixed(2),
      lta: lta.toFixed(2),
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
          conveyance_allowance: lta,
          fixed_allowance: fixedAllowance,
          gratuity_amount: gratuityAmount,
          is_ctc_mode: true,
        },
      };
      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
      return newRecord;
    });
  };

  // --- Manual & Generic Input Handlers ---

  const handleManualEarningChange = (field: keyof PaymentEarning, value: string) => {
    const numericValue = parseFloat(value) || 0;
    
    setCtcFormData(prev => ({ ...prev, [field === 'conveyance_allowance' ? 'lta' : field === 'basic_salary' ? 'basicPay' : field === 'house_rent_allowance' ? 'hra' : 'fixedAllowance']: value }));

    setPaymentRecord(prev => {
      const updatedRecord = {
        ...prev,
        earnings: {
          ...prev.earnings,
          [field]: numericValue,
          is_ctc_mode: false // Ensure we flag this as manually edited
        }
      };
      
      // If Basic changed and Gratuity enabled, recalc Gratuity Amount
      if (field === 'basic_salary' && prev.earnings.gratuity_enabled) {
         const gPerc = parseFloat(ctcFormData.gratuityPercentage) || 0;
         updatedRecord.earnings.gratuity_amount = Number((numericValue * (gPerc / 100)).toFixed(2));
      }

      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
      return newRecord;
    });
  };
  
  const handleGratuityToggle = (checked: boolean) => {
    setPaymentRecord(prev => {
        let updatedRecord = {
            ...prev,
            earnings: {
                ...prev.earnings,
                gratuity_enabled: checked,
                gratuity_amount: 0 // Reset initially
            }
        };

        if (checked) {
            const basic = updatedRecord.earnings.basic_salary || 0;
            const perc = parseFloat(ctcFormData.gratuityPercentage) || 0;
            updatedRecord.earnings.gratuity_amount = Number((basic * (perc/100)).toFixed(2));
        }

        const { updatedRecord: finalRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
        return finalRecord;
    });
  };

  const handleGratuityPercentageChange = (value: string) => {
    const perc = parseFloat(value) || 0;
    setCtcFormData(prev => ({ ...prev, gratuityPercentage: value }));

    setPaymentRecord(prev => {
        const basic = prev.earnings.basic_salary || 0;
        const amt = Number((basic * (perc/100)).toFixed(2));
        
        const updatedRecord = {
            ...prev,
            earnings: {
                ...prev.earnings,
                gratuity_percentage: perc,
                gratuity_amount: amt
            }
        };
        const { updatedRecord: finalRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
        return finalRecord;
    });
  };

  const calculateTotals = (
    currentRecord: PaymentRecord, 
    currentCustomDeductions: PaymentCustomItem[],
    currentCustomEarnings: PaymentCustomItem[]
  ) => {
    const earnings = { ...currentRecord.earnings };
    const deductions = { ...currentRecord.deductions };

    // Auto Calculation of Fixed Allowance if in Auto Mode + Payslip Enabled Logic
    // (Preserving original logic, but respecting Manual override)
    let fixedAllowance = earnings.fixed_allowance;
    if (calculationMode === 'auto') {
        // Recalculate fixed based on basic in auto mode
        // Note: The previous logic subtracted 1800 if payslip enabled.
        // We ensure consistency here.
        // If Manual, we trust the input.
    }

    const totalCustomEarnings = Number(currentCustomEarnings.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2));
    
    // Total Earnings (Gross) = Basic + HRA + LTA + Fixed + Custom Earnings
    // Note: Gratuity is typically CTC component but often not part of Monthly Gross Earnings (Take Home). 
    // If user wants it in earnings, it adds to CTC, but usually not Gross.
    // However, if requested as a field "Gratuity" inside earnings, we track it.
    // For this calculation, I am adding it to CTC sum, but NOT Gross Earnings unless specified.
    // Usually Gross Earnings = Pay before deductions.
    
    const grossEarnings = Number((
      (earnings.basic_salary || 0) +
      (earnings.house_rent_allowance || 0) +
      (earnings.conveyance_allowance || 0) + // LTA
      (earnings.fixed_allowance || 0) +
      totalCustomEarnings
    ).toFixed(2));

    const totalCustomDeductions = Number(currentCustomDeductions.reduce((sum, ded) => sum + (ded.amount || 0), 0).toFixed(2));
    const totalDeductions = Number((
      (deductions.provident_fund || 0) +
      (deductions.professional_tax || 0) +
      (deductions.income_tax || 0) +
      (deductions.loan_deduction || 0) +
      totalCustomDeductions
    ).toFixed(2));

    const netPay = Number((grossEarnings - totalDeductions).toFixed(2));
    
    // Recalculate CTC based on actual components
    // CTC = Gross Earnings + Gratuity + Employer PF (if any, not tracked here)
    const calculatedCTC = grossEarnings + (earnings.gratuity_amount || 0);

    return {
      updatedRecord: {
        ...currentRecord,
        payment_amount: netPay,
        earnings: {
          ...earnings,
          total_earnings: calculatedCTC, // Storing CTC as total_earnings or strictly monthly? 
          // Previous code: monthlyCTC = total_earnings * 12. 
          // So total_earnings here implies Monthly Gross + benefits.
          gross_earnings: grossEarnings,
          ctc: calculationMode === 'manual' ? calculatedCTC * 12 : earnings.ctc, // Update Annual CTC if manual
        },
        deductions: { ...deductions, total_deductions: totalDeductions },
      },
      formattedGrossEarnings: grossEarnings.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
        // If auto mode, recalc fixed allowance
        if (calculationMode === 'auto') {
            const basicPay = updatedRecord.earnings.basic_salary;
            const { hra, lta, fixedAllowance } = calculateAllowances(basicPay, value);
            updatedRecord.earnings = {
            ...updatedRecord.earnings,
            house_rent_allowance: hra,
            conveyance_allowance: lta,
            fixed_allowance: fixedAllowance,
            payslipEnabled: value,
            };
            setCtcFormData(prevCtc => ({
            ...prevCtc,
            hra: hra.toFixed(2),
            lta: lta.toFixed(2),
            fixedAllowance: fixedAllowance.toFixed(2),
            }));
        }
        updatedRecord.payslipEnabled = value;
      }

      const { updatedRecord: newRecord } = calculateTotals(updatedRecord, customDeductions, customEarnings);
      return newRecord;
    });
  };

  const handleCustomDeductionChange = (updatedDeductions: PaymentCustomItem[]) => {
    const rounded = updatedDeductions.map(ded => ({...ded, amount: Number(ded.amount.toFixed(2))}));
    setCustomDeductions(rounded);
    setPaymentRecord((prev) => {
      const { updatedRecord } = calculateTotals(prev, rounded, customEarnings);
      return updatedRecord;
    });
  };

  const handleCustomEarningsChange = (updatedEarnings: PaymentCustomItem[]) => {
    const rounded = updatedEarnings.map(item => ({...item, amount: Number(item.amount.toFixed(2))}));
    setCustomEarnings(rounded);
    setPaymentRecord((prev) => {
        const { updatedRecord } = calculateTotals(prev, customDeductions, rounded);
        return updatedRecord;
    });
  };

  // --- Save Handler ---

  const handleSave = async () => {
    if (!selectedEmployee) return;

    // Validation
    if (!paymentRecord.earnings.basic_salary) {
        toast.error("Basic Salary is mandatory");
        return;
    }

    setLoading(true);
    try {
      const isUpdate = !!paymentRecord.id;
      const currentTimestamp = new Date().toISOString();
      let paymentId = paymentRecord.id;

      // Upsert Payment Record
      let paymentData;
      if (isUpdate) {
        const { error } = await supabase.from("payment_records").update({
            payment_date: paymentRecord.payment_date,
            payment_amount: paymentRecord.payment_amount,
            status: paymentRecord.status,
            updated_at: currentTimestamp,
            last_updated_by: "EmployeesPayrollDrawer",
        }).eq("id", paymentId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("payment_records").insert({
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
            organization_id: organization_id,
        }).select().single();
        if (error) throw error;
        paymentData = data;
        paymentId = data.id;
      }

      if (!paymentId) throw new Error("Payment ID missing");

      // Upsert Earnings
      const earningsPayload = {
          payment_id: paymentId,
          ctc: paymentRecord.earnings.ctc || 0,
          basic_salary: paymentRecord.earnings.basic_salary || 0,
          house_rent_allowance: paymentRecord.earnings.house_rent_allowance || 0,
          conveyance_allowance: paymentRecord.earnings.conveyance_allowance || 0, // LTA
          fixed_allowance: paymentRecord.earnings.fixed_allowance || 0,
          is_ctc_mode: calculationMode === 'auto',
          total_earnings: paymentRecord.earnings.total_earnings || 0,
          gross_earnings: paymentRecord.earnings.gross_earnings || 0,
          payslipEnabled: paymentRecord.payslipEnabled,
          gratuity_enabled: paymentRecord.earnings.gratuity_enabled,
          gratuity_percentage: paymentRecord.earnings.gratuity_percentage,
          gratuity_amount: paymentRecord.earnings.gratuity_amount,
          organization_id: organization_id,
          updated_at: currentTimestamp
      };

      // Check if exists to determine update/insert (using upsert logic manually or native upsert if unique constraint exists)
      // Assuming unique constraint on payment_id
      const { error: earnError } = await supabase.from("payment_earnings")
        .upsert(earningsPayload, { onConflict: 'payment_id' });
      if (earnError) throw earnError;

      // Upsert Deductions
      const deductionsPayload = {
          payment_id: paymentId,
          provident_fund: paymentRecord.deductions.provident_fund || 0,
          professional_tax: paymentRecord.deductions.professional_tax || 0,
          income_tax: paymentRecord.deductions.income_tax || 0,
          loan_deduction: paymentRecord.deductions.loan_deduction || 0,
          total_deductions: paymentRecord.deductions.total_deductions || 0,
          paid_days: paymentRecord.deductions.paid_days || 30,
          lop_days: paymentRecord.deductions.lop_days || 0,
          organization_id: organization_id,
          updated_at: currentTimestamp
      };
      const { error: dedError } = await supabase.from("payment_deductions")
        .upsert(deductionsPayload, { onConflict: 'payment_id' });
      if (dedError) throw dedError;

      // Handle Custom Deductions (Delete all and re-insert)
      await supabase.from("payment_custom_deductions").delete().eq("payment_id", paymentId);
      if (customDeductions.length > 0) {
        const cdInsert = customDeductions.map(d => ({
            payment_id: paymentId,
            name: d.name,
            amount: d.amount,
            organization_id: organization_id
        }));
        const { error: cdError } = await supabase.from("payment_custom_deductions").insert(cdInsert);
        if (cdError) throw cdError;
      }

      // Handle Custom Earnings (Delete all and re-insert)
      // Note: Try/Catch wrapper in case table doesn't exist yet
      try {
        await supabase.from("payment_custom_earnings").delete().eq("payment_id", paymentId);
        if (customEarnings.length > 0) {
            const ceInsert = customEarnings.map(e => ({
                payment_id: paymentId,
                name: e.name,
                amount: e.amount,
                organization_id: organization_id
            }));
            const { error: ceError } = await supabase.from("payment_custom_earnings").insert(ceInsert);
            if (ceError) throw ceError;
        }
      } catch (e) {
        console.warn("Custom Earnings table might not exist", e);
      }

      // Appraisal Record
      if (previousPaymentAmount !== null && paymentRecord.payment_amount !== previousPaymentAmount && isUpdate) {
         await supabase.from("appraisal_records").insert({
             employee_id: selectedEmployee.employee_id,
             payment_record_id: paymentId,
             appraisal_date: paymentRecord.payment_date,
             new_payment_amount: paymentRecord.payment_amount,
             previous_payment_amount: previousPaymentAmount,
             status: paymentRecord.status,
             last_updated_by: "EmployeesPayrollDrawer",
             organization_id: organization_id
         });
      }

      toast.success("Payment record saved successfully");
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const moveToNextTab = () => {
    if (activeTab === 'details') setActiveTab('earnings_deductions');
  };

  const moveToPreviousTab = () => {
    if (activeTab === 'earnings_deductions') setActiveTab('details');
  };

  const { formattedGrossEarnings, formattedTotalDeductions, formattedNetPay } = calculateTotals(paymentRecord, customDeductions, customEarnings);

  if (!selectedEmployee) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto focus-visible:outline-none">
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
                <SelectTrigger className="w-[140px] h-9 text-sm font-semibold rounded-lg border-2 border-transparent bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Success">Success</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full grid grid-cols-2">
            <TabsTrigger value="details">Employee Details</TabsTrigger>
            <TabsTrigger value="earnings_deductions">Earnings & Deductions</TabsTrigger>
          </TabsList>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Name *</Label>
                  <Input value={paymentRecord.employee_name} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label>Pay Date *</Label>
                  <Input
                    type="date"
                    value={paymentRecord.payment_date}
                    onChange={(e) => handleInputChange("payment_date", e.target.value)}
                  />
                </div>
                
                {/* PF Checkbox */}
                <div className="space-y-2">
                  <Label>PF (Provident Fund)</Label>
                  <div className="flex items-center space-x-2 border p-2 rounded-md">
                    <Checkbox
                      id="payslipEnabled"
                      checked={paymentRecord.payslipEnabled}
                      onCheckedChange={(checked) => handleInputChange("payslipEnabled", checked)}
                    />
                    <Label htmlFor="payslipEnabled" className="cursor-pointer">Yes / No</Label>
                  </div>
                </div>

                 {/* Gratuity Checkbox (New) */}
                 <div className="space-y-2">
                  <Label>Gratuity</Label>
                  <div className="flex items-center space-x-2 border p-2 rounded-md">
                    <Checkbox
                      id="gratuityEnabled"
                      checked={paymentRecord.earnings.gratuity_enabled}
                      onCheckedChange={(checked) => handleGratuityToggle(checked as boolean)}
                    />
                    <Label htmlFor="gratuityEnabled" className="cursor-pointer">Yes / No</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Paid Days *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={paymentRecord.deductions.paid_days}
                    onChange={(e) => handleInputChange("paid_days", Number(e.target.value), "deductions")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LOP Days *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={paymentRecord.deductions.lop_days}
                    onChange={(e) => handleInputChange("lop_days", Number(e.target.value), "deductions")}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="earnings_deductions" className="space-y-6">
              <Card className="p-4 relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">CTC & Earnings</h3>
                  
                  {/* Auto/Manual Toggle */}
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <Button 
                        type="button"
                        variant={calculationMode === 'auto' ? "white" : "ghost"}
                        size="sm"
                        className={`text-xs ${calculationMode === 'auto' ? 'bg-white shadow-sm' : ''}`}
                        onClick={() => setCalculationMode('auto')}
                    >
                        <RefreshCcw className="w-3 h-3 mr-1" /> Auto
                    </Button>
                    <Button 
                        type="button"
                        variant={calculationMode === 'manual' ? "white" : "ghost"}
                        size="sm"
                        className={`text-xs ${calculationMode === 'manual' ? 'bg-white shadow-sm' : ''}`}
                        onClick={() => setCalculationMode('manual')}
                    >
                        <Edit3 className="w-3 h-3 mr-1" /> Manual
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ctc">CTC (Annual)</Label>
                    <Input
                      id="ctc"
                      value={ctcFormData.ctc}
                      onChange={(e) => handleCTCChange(e.target.value)}
                      readOnly={calculationMode === 'manual'}
                      className={`font-mono ${calculationMode === 'manual' ? 'bg-gray-100' : ''}`}
                      placeholder={calculationMode === 'manual' ? "Calculated from Sum" : "Enter CTC"}
                    />
                  </div>

                  {/* Hide Basic Pay % in Manual Mode */}
                  {calculationMode === 'auto' && (
                    <div className="space-y-2">
                        <Label htmlFor="basicPayPercentage">Basic Pay (%)</Label>
                        <Input
                        id="basicPayPercentage"
                        value={ctcFormData.basicPayPercentage}
                        onChange={(e) => handleBasicPayPercentageChange(e.target.value)}
                        className="font-mono"
                        />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">Basic Salary *</Label>
                    <Input
                      id="basicSalary"
                      type="number"
                      value={ctcFormData.basicPay}
                      onChange={(e) => calculationMode === 'manual' && handleManualEarningChange('basic_salary', e.target.value)}
                      readOnly={calculationMode === 'auto'}
                      className={`${calculationMode === 'auto' ? 'bg-gray-100' : 'bg-white'} font-mono`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hra">House Rent Allowance *</Label>
                    <Input
                      id="hra"
                      type="number"
                      value={ctcFormData.hra}
                      onChange={(e) => calculationMode === 'manual' && handleManualEarningChange('house_rent_allowance', e.target.value)}
                      readOnly={calculationMode === 'auto'}
                      className={`${calculationMode === 'auto' ? 'bg-gray-100' : 'bg-white'} font-mono`}
                    />
                  </div>
                  <div className="space-y-2">
                    {/* Renamed Conveyance to LTA */}
                    <Label htmlFor="lta">Leave Travel Allowance (LTA) *</Label>
                    <Input
                      id="lta"
                      type="number"
                      value={ctcFormData.lta}
                      onChange={(e) => calculationMode === 'manual' && handleManualEarningChange('conveyance_allowance', e.target.value)}
                      readOnly={calculationMode === 'auto'}
                      className={`${calculationMode === 'auto' ? 'bg-gray-100' : 'bg-white'} font-mono`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fixedAllowance">Fixed Allowance *</Label>
                    <Input
                      id="fixedAllowance"
                      type="number"
                      value={ctcFormData.fixedAllowance}
                      onChange={(e) => calculationMode === 'manual' && handleManualEarningChange('fixed_allowance', e.target.value)}
                      readOnly={calculationMode === 'auto'}
                      className={`${calculationMode === 'auto' ? 'bg-gray-100' : 'bg-white'} font-mono`}
                    />
                  </div>

                  {/* Gratuity Field (Conditional) */}
                  {paymentRecord.earnings.gratuity_enabled && (
                    <div className="space-y-2">
                        <Label htmlFor="gratuityPerc">Gratuity (%) *</Label>
                        <div className="flex gap-2">
                            <Input
                                id="gratuityPerc"
                                value={ctcFormData.gratuityPercentage}
                                onChange={(e) => handleGratuityPercentageChange(e.target.value)}
                                className="w-1/3"
                                placeholder="%"
                            />
                            <Input
                                value={Number(paymentRecord.earnings.gratuity_amount).toFixed(2)}
                                readOnly
                                className="w-2/3 bg-gray-100 font-mono"
                            />
                        </div>
                    </div>
                  )}
                </div>

                {/* Custom Earnings Section */}
                <div className="mt-6">
                  <DynamicEarningsDeductions
                    title="Custom Earnings"
                    items={customEarnings}
                    onChange={handleCustomEarningsChange}
                    type="earnings"
                  />
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Deductions</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provident Fund *</Label>
                    <Input
                      type="number"
                      value={Number(paymentRecord.deductions.provident_fund).toFixed(2)}
                      onChange={(e) => handleInputChange("provident_fund", Number(e.target.value), "deductions")}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Professional Tax *</Label>
                    <Input
                      type="number"
                      value={Number(paymentRecord.deductions.professional_tax).toFixed(2)}
                      onChange={(e) => handleInputChange("professional_tax", Number(e.target.value), "deductions")}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Income Tax *</Label>
                    <Input
                      type="number"
                      value={Number(paymentRecord.deductions.income_tax).toFixed(2)}
                      onChange={(e) => handleInputChange("income_tax", Number(e.target.value), "deductions")}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Deduction *</Label>
                    <Input
                      type="number"
                      value={Number(paymentRecord.deductions.loan_deduction).toFixed(2)}
                      onChange={(e) => handleInputChange("loan_deduction", Number(e.target.value), "deductions")}
                      className="font-mono"
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
                    <span className="font-medium text-gray-600">Gross Earnings:</span>
                    <span className="font-mono font-medium">{formattedGrossEarnings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-red-600">Total Deductions:</span>
                    <span className="font-mono font-medium text-red-600">{formattedTotalDeductions}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg bg-green-50 p-2 rounded-md">
                    <span className="font-bold text-green-800">Net Pay:</span>
                    <span className="font-mono font-bold text-green-800">{formattedNetPay}</span>
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
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading}>
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