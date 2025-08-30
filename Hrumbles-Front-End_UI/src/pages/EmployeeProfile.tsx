import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone, Globe, User, MoreVertical, Activity, Clock, FileText, Home, Eye, Download, Copy, Briefcase, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import {useSelector} from "react-redux";

interface PaymentEarning {
  id: string;
  payment_id: string;
  basic_salary: number;
  house_rent_allowance: number;
  conveyance_allowance: number;
  fixed_allowance: number;
  hourly_rate: number | null;
  total_hours_worked: number | null;
  is_ctc_mode: boolean;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

interface PaymentDeduction {
  id: string;
  payment_id: string;
  provident_fund: number;
  professional_tax: number;
  income_tax: number;
  loan_deduction: number;
  total_deductions: number;
  paid_days: number;
  lop_days: number;
  created_at: string;
  updated_at: string;
}

interface PaymentCustomDeduction {
  id: string;
  payment_id: string;
  name: string;
  amount: number;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  designation: string | null;
  joining_date: string | null;
  payment_date: string;
  payment_amount: number;
  payment_category: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  last_updated_by: string;
  earnings?: PaymentEarning;
  deductions?: PaymentDeduction;
  customDeductions?: PaymentCustomDeduction[];
}

interface AppraisalRecord {
  id: string;
  employee_id: string;
  payment_record_id: string;
  appraisal_date: string;
  new_payment_amount: number;
  previous_payment_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  last_updated_by: string;
  paymentRecord?: PaymentRecord;
}

interface EmployeeDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  position?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  marital_status?: string;
  employment_status?: string;
  aadhar_number?: string;
  aadhar_url?: string;
  pan_number?: string;
  pan_url?: string;
  esic_number?: string;
  esic_url?: string;
  uan_number?: string;
  uan_url?: string;
  profile_picture_url?: string;
  department_id?: string;
  department_name?: string;
  designation_name?: string;
  address?: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
  };
  permanent_address?: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
  };
  emergencyContacts?: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
  }>;
  experiences?: Array<{
    id: string;
    company: string;
    position: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    employment_type?: string;
    offerLetter?: string;
    hikeLetter?: string;
    seperationLetter?: string;
    payslip1?: string;
    payslip2?: string;
    payslip3?: string;
  }>;
  education?: Array<{
    id: string;
    type: string;
    institute?: string;
    year_completed?: string;
    document_url?: string;
  }>;
  bankDetails?: {
    account_holder_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    ifsc_code: string;
    branch_address?: string;
    city?: string;
    document_url?: string;
  };
  latestPaymentRecord?: PaymentRecord;
  appraisalHistory?: AppraisalRecord[];
}

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
    const user = useSelector((state: any) => state.auth.user);
      const organizationId = useSelector((state: any) => state.auth.organization_id);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState({ pan: false, aadhaar: false }); // Loading state for verification
  const [verifications, setVerifications] = useState<any[]>([]); // To store verification history
  const [activeTab, setActiveTab] = useState("personal");
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [paySettlementOption, setPaySettlementOption] = useState<'regular' | 'date'>('regular');
  const [exitForm, setExitForm] = useState({
    lastWorkingDay: '',
    reason: '',
    comments: '',
    finalSettlementDate: '',
    personalEmail: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails(id);
    }
  }, [id]);

  console.log("employee", employee)

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);

      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name), hr_designations(name)')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      const { data: contactsData, error: contactsError } = await supabase
        .from('hr_employee_emergency_contacts')
        .select('*')
        .eq('employee_id', employeeId);

      if (contactsError) throw contactsError;

      const { data: addressData, error: addressError } = await supabase
        .from('hr_employee_addresses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', 'present')
        .maybeSingle();

      const { data: permanentAddressData, error: permanentAddressError } = await supabase
        .from('hr_employee_addresses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', 'permanent')
        .maybeSingle();

      const { data: educationData, error: educationError } = await supabase
        .from('hr_employee_education')
        .select('*')
        .eq('employee_id', employeeId);

      if (educationError) throw educationError;

      const { data: experiencesData, error: experiencesError } = await supabase
        .from('hr_employee_experiences')
        .select('*')
        .eq('employee_id', employeeId);

      if (experiencesError) throw experiencesError;

      const { data: bankData, error: bankError } = await supabase
        .from('hr_employee_bank_details')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (bankError) throw bankError;

      // Fetch the latest payment record for the employee
      const { data: paymentRecordsData, error: paymentRecordsError } = await supabase
        .from('payment_records')
        .select('*, last_updated_by')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (paymentRecordsError) throw paymentRecordsError;

      let latestPaymentRecord: PaymentRecord | undefined;

      if (paymentRecordsData && paymentRecordsData.length > 0) {
        const paymentRecord = paymentRecordsData[0];

        const { data: earningsData, error: earningsError } = await supabase
          .from('payment_earnings')
          .select('*')
          .eq('payment_id', paymentRecord.id)
          .maybeSingle();

        if (earningsError) throw earningsError;

        const { data: deductionsData, error: deductionsError } = await supabase
          .from('payment_deductions')
          .select('*')
          .eq('payment_id', paymentRecord.id)
          .maybeSingle();

        if (deductionsError) throw deductionsError;

        const { data: customDeductionsData, error: customDeductionsError } = await supabase
          .from('payment_custom_deductions')
          .select('*')
          .eq('payment_id', paymentRecord.id);

        if (customDeductionsError) throw customDeductionsError;

        latestPaymentRecord = {
          id: paymentRecord.id,
          employee_id: paymentRecord.employee_id,
          employee_name: paymentRecord.employee_name,
          designation: paymentRecord.designation,
          joining_date: paymentRecord.joining_date,
          payment_date: paymentRecord.payment_date,
          payment_amount: paymentRecord.payment_amount,
          payment_category: paymentRecord.payment_category,
          status: paymentRecord.status,
          created_at: paymentRecord.created_at,
          updated_at: paymentRecord.updated_at,
          source: paymentRecord.source,
          last_updated_by: paymentRecord.last_updated_by,
          earnings: earningsData,
          deductions: deductionsData,
          customDeductions: customDeductionsData || [],
        };
      }

      // Fetch appraisal history
      const { data: appraisalRecordsData, error: appraisalRecordsError } = await supabase
        .from('appraisal_records')
        .select('*, paymentRecord:payment_records(*, last_updated_by)')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false });

      if (appraisalRecordsError) throw appraisalRecordsError;

      const appraisalHistory: AppraisalRecord[] = [];

      if (appraisalRecordsData && appraisalRecordsData.length > 0) {
        for (const record of appraisalRecordsData) {
          const paymentRecord = record.paymentRecord;

          const { data: earningsData, error: earningsError } = await supabase
            .from('payment_earnings')
            .select('*')
            .eq('payment_id', paymentRecord.id)
            .maybeSingle();

          if (earningsError) throw earningsError;

          const { data: deductionsData, error: deductionsError } = await supabase
            .from('payment_deductions')
            .select('*')
            .eq('payment_id', paymentRecord.id)
            .maybeSingle();

          if (deductionsError) throw deductionsError;

          const { data: customDeductionsData, error: customDeductionsError } = await supabase
            .from('payment_custom_deductions')
            .select('*')
            .eq('payment_id', paymentRecord.id);

          if (customDeductionsError) throw customDeductionsError;

          const mappedPaymentRecord: PaymentRecord = {
            id: paymentRecord.id,
            employee_id: paymentRecord.employee_id,
            employee_name: paymentRecord.employee_name,
            designation: paymentRecord.designation,
            joining_date: paymentRecord.joining_date,
            payment_date: paymentRecord.payment_date,
            payment_amount: paymentRecord.payment_amount,
            payment_category: paymentRecord.payment_category,
            status: paymentRecord.status,
            created_at: paymentRecord.created_at,
            updated_at: paymentRecord.updated_at,
            source: paymentRecord.source,
            last_updated_by: paymentRecord.last_updated_by,
            earnings: earningsData,
            deductions: deductionsData,
            customDeductions: customDeductionsData || [],
          };

          appraisalHistory.push({
            id: record.id,
            employee_id: record.employee_id,
            payment_record_id: record.payment_record_id,
            appraisal_date: record.appraisal_date,
            new_payment_amount: record.new_payment_amount,
            previous_payment_amount: record.previous_payment_amount,
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at,
            last_updated_by: record.last_updated_by,
            paymentRecord: mappedPaymentRecord,
          });
        }
      }

      const mappedExperiences = experiencesData
        ? experiencesData.map((exp: any) => ({
            id: exp.id,
            company: exp.company,
            position: exp.job_title,
            location: exp.location,
            start_date: exp.start_date,
            end_date: exp.end_date,
            employment_type: exp.employment_type,
            offerLetter: exp.offer_letter_url,
            seperationLetter: exp.separation_letter_url,
            hikeLetter: exp.hike_letter_url,
            payslip1: exp.payslip_1_url,
            payslip2: exp.payslip_2_url,
            payslip3: exp.payslip_3_url,
          }))
        : [];

      const mappedEducation = educationData
        ? educationData.map((edu: any) => ({
            id: edu.id,
            type: edu.type,
            institute: edu.institute,
            year_completed: edu.year_completed,
            document_url: edu.document_url,
          }))
        : [];

      const departmentName = employeeData?.hr_departments?.name || 'N/A';
      const designationName = employeeData?.hr_designations?.name || 'N/A';

      const completeEmployeeData: EmployeeDetail = {
        ...employeeData,
        department_name: departmentName,
        designation_name: designationName,
        emergencyContacts: contactsData || [],
        address: addressData || {},
        permanent_address: permanentAddressData || {},
        experiences: mappedExperiences,
        education: mappedEducation,
        bankDetails: bankData || undefined,
        latestPaymentRecord,
        appraisalHistory,
      };

      // ADD THIS: Fetch verification history
      const { data: verificationsData, error: verificationsError } = await supabase
        .from('hr_identity_verifications')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (verificationsError) throw verificationsError;
      setVerifications(verificationsData || []);

      setEmployee(completeEmployeeData);
    } catch (error: any) {
      console.error("Error fetching employee details:", error);
      toast.error(`Error loading employee details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

   // NEW FUNCTION: Handle Identity Verification
  const handleVerifyIdentity = async (type: 'pan' | 'aadhaar') => {
    if (!employee || !user || !organizationId) return;

    const docNumber = type === 'pan' ? employee.pan_number : employee.aadhar_number;
    if (!docNumber) {
      toast.error(`${type.toUpperCase()} number is not available.`);
      return;
    }

    setIsVerifying(prev => ({ ...prev, [type]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('verify-identity-document', {
        body: {
          verificationType: `${type}_verification`,
          payload: {
            employeeId: employee.id,
            organizationId: organizationId,
            userId: user.id,
            documentNumber: docNumber,
          },
        },
      });

      if (error) throw error;
      
      if (data.status === 'completed') {
        toast.success(`${type.toUpperCase()} verification completed.`);
      } else {
        toast.info(`${type.toUpperCase()} verification is pending.`);
      }

      // Refresh data to show new verification status
      fetchEmployeeDetails(employee.id);

    } catch (error: any) {
      console.error(`Error verifying ${type}:`, error);
      toast.error(`Failed to verify ${type}: ${error.message}`);
    } finally {
      setIsVerifying(prev => ({ ...prev, [type]: false }));
    }
  };

  // NEW HELPER: To render verification status
  const renderVerificationStatus = (type: 'pan' | 'aadhaar') => {
    const verification = verifications.find(v => v.verification_type === `${type}_verification`);
    if (!verification) return null;

    if (verification.status === '1' || verification.status === '0') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 ml-2">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (verification.status === '9') {
      return (
        <Badge variant="destructive" className="ml-2">
          <ShieldAlert className="h-3 w-3 mr-1" />
          Not Found
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="ml-2">
        Status: {verification.status}
      </Badge>
    );
  };


  const handleExitProcessSubmit = async () => {
    // Validate required fields
    if (!exitForm.lastWorkingDay || !exitForm.reason) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (paySettlementOption === 'date' && !exitForm.finalSettlementDate) {
      toast.error('Please select a Final Settlement Date.');
      return;
    }

    if (!exitForm.personalEmail) {
      toast.error('Please provide a personal email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(exitForm.personalEmail)) {
      toast.error('Please provide a valid email address.');
      return;
    }

    // Prepare data for submission
    const exitData = {
      employee_id: employee!.employee_id,
      employee_name: `${employee!.first_name} ${employee!.last_name}`,
      designation: employee!.designation_name,
      department: employee!.department_name,
      date_of_joining: employeejoining_date,
      last_working_day: exitForm.lastWorkingDay,
      exit_reason: exitForm.reason,
      exit_comments: exitForm.comments,
      pay_settlement_option: paySettlementOption,
      final_settlement_date: paySettlementOption === 'date' ? exitForm.finalSettlementDate : null,
      personal_email: exitForm.personalEmail,
      exit_notes: exitForm.notes,
      initiated_at: new Date().toISOString(),
      employment_status: 'Terminated',
      organization_id: organization_id,
    };

    try {
      // Insert into hr_employee_exits table
      const { error: insertError } = await supabase
        .from('hr_employee_exits')
        .insert([exitData]);

      if (insertError) throw insertError;

      // Update employee's employment status
      const { error: updateError } = await supabase
        .from('hr_employees')
        .update({
          employment_status: 'Terminated',
          last_working_day: exitForm.lastWorkingDay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee!.id);

      if (updateError) throw updateError;

      toast.success('Exit process initiated successfully.');
    } catch (error: any) {
      console.error('Error initiating exit process:', error);
      toast.error(`Failed to initiate exit process: ${error.message}`);
      return;
    }

    // Reset form and close modal
    setExitForm({
      lastWorkingDay: '',
      reason: '',
      comments: '',
      finalSettlementDate: '',
      personalEmail: '',
      notes: '',
    });
    setPaySettlementOption('regular');
    setIsExitModalOpen(false);

    // Refresh employee data
    fetchEmployeeDetails(employee!.id);
  };

  const getAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return "N/A";
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  };

  const generateActivityTimeline = () => {
    const activities: { date: string; description: string; icon: JSX.Element }[] = [];

    activities.push({
      date: employee?.created_at || new Date().toISOString(),
      description: `Profile created for ${employee?.first_name} ${employee?.last_name}`,
      icon: <User className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
    });

    employee?.education?.forEach((edu) => {
      if (edu.year_completed) {
        activities.push({
          date: edu.year_completed,
          description: `${edu.type} completed at ${edu.institute || 'Unknown Institute'}`,
          icon: <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        });
      }
    });

    employee?.experiences?.forEach((exp) => {
      if (exp.start_date) {
        activities.push({
          date: exp.start_date,
          description: `Started at ${exp.company} as ${exp.position}`,
          icon: <Briefcase className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        });
      }
      if (exp.end_date) {
        activities.push({
          date: exp.end_date,
          description: `Ended at ${exp.company} as ${exp.position}`,
          icon: <Briefcase className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        });
      }
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return activities;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const isNewAppraisal = (record: AppraisalRecord) => {
    const createdAt = new Date(record.created_at).getTime();
    const updatedAt = new Date(record.updated_at).getTime();
    const isUpdatedByDrawer = record.last_updated_by === 'EmployeesPayrollDrawer';
    return updatedAt > createdAt && isUpdatedByDrawer;
  };

  const renderSalaryDetailsModal = (record: PaymentRecord) => (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Salary Details - {formatDate(record.payment_date)}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-6">
        <div>
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Earnings</h5>
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.basic_salary || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">House Rent Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.house_rent_allowance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conveyance Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.conveyance_allowance || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fixed Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.fixed_allowance || 0)}</span>
              </div>
              {record.earnings?.hourly_rate && record.earnings?.total_hours_worked ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hourly Rate</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings.hourly_rate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Hours Worked</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{record.earnings.total_hours_worked}</span>
                  </div>
                </>
              ) : null}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Earnings</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.total_earnings || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Deductions</h5>
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.provident_fund || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Professional Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.professional_tax || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.income_tax || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Loan Deduction</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.loan_deduction || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid Days</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{record.deductions?.paid_days || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">LOP Days</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{record.deductions?.lop_days || 0}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.total_deductions || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {record.customDeductions && record.customDeductions.length > 0 && (
          <div>
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Custom Deductions</h5>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                {record.customDeductions.map((deduction, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{deduction.name}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(deduction.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );

  const renderCurrentSalarySummary = (record: PaymentRecord) => (
    <div className="flex items-center justify-between mb-4 border-b pb-4">
      <div className="flex items-center">
        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
          Current Salary - {formatDate(record.payment_date)}
        </h4>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              record.status === 'Success' ? 'bg-green-500' : record.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{record.status}</span>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Net Pay:</span>
          <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(record.payment_amount)}</span>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-purple-500 border-purple-500 hover:bg-purple-50 hover:text-black dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900 dark:hover:text-black"
            >
              View Info
            </Button>
          </DialogTrigger>
          {renderSalaryDetailsModal(record)}
        </Dialog>
      </div>
    </div>
  );

  const renderAppraisalSummary = (record: AppraisalRecord) => (
    <div className="flex items-center justify-between mb-4 border-b pb-4">
      <div className="flex items-center">
        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
          Appraisal - {formatDate(record.appraisal_date)}
        </h4>
        {isNewAppraisal(record) && (
          <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-200">
            New Appraisal
          </span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              record.status === 'Success' ? 'bg-green-500' : record.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          ></span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{record.status}</span>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Previous Pay:</span>
          <span className="font-medium text-gray-600 dark:text-gray-400">{formatCurrency(record.previous_payment_amount)}</span>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">New Pay:</span>
          <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(record.new_payment_amount)}</span>
        </div>
        {record.paymentRecord && (
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="text-purple-500 border-purple-500 hover:bg-purple-50 hover:text-black dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900 dark:hover:text-black"
              >
                View Info
              </Button>
            </DialogTrigger>
            {renderSalaryDetailsModal(record.paymentRecord)}
          </Dialog>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Loading employee details...</div>;
  }

  if (!employee) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Employee not found</div>;
  }

  return (
    <div className=" mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/employee')} className="mr-2 text-gray-600 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400">
          Employees
        </Button>
        <span className="text-gray-400 dark:text-gray-500 mx-2">/</span>
        <span className="text-gray-600 dark:text-gray-300">Employee Profile</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="relative shadow-lg rounded-xl overflow-hidden">
            <div className="h-36 w-full bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800"></div>

            <div className="flex flex-col items-center -mt-16 px-6 pb-6">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                {employee.profile_picture_url ? (
                  <AvatarImage src={employee.profile_picture_url} alt={`${employee.first_name} ${employee.last_name}`} />
                ) : (
                  <AvatarFallback className="text-2xl font-bold bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="mt-4 text-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{employee.first_name} {employee.last_name}</h1>
                <div className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm inline-block mt-2 dark:bg-purple-900 dark:text-purple-200">
                  {employee.designation_name || "No Position"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{employee.employee_id}</div>
              </div>

              <div className="w-full mt-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                      <div className="text-gray-800 dark:text-gray-200">{employee.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Mobile Phone</div>
                      <div className="text-gray-800 dark:text-gray-200">{employee.phone || "Not provided"}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Nationality</div>
                      <div className="text-gray-800 dark:text-gray-200">{employee.address?.country || "Not provided"}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Gender</div>
                      <div className="text-gray-800 dark:text-gray-200">{employee.gender || "Not provided"}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Age</div>
                      <div className="text-gray-800 dark:text-gray-200">{getAge(employee.date_of_birth)}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                      <div className="flex items-center">
                        <span
                          className={`w-2 h-2 rounded-full mr-2 ${
                            employee.employment_status === 'active' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        ></span>
                        <span className="text-gray-800 dark:text-gray-200">{employee.employment_status || "Not provided"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Type of Hire</div>
                      <div className="text-gray-800 dark:text-gray-200">{employee.experiences?.[0]?.employment_type || "Not provided"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="personal" onValueChange={setActiveTab}>
            <div className="mb-6 flex justify-between items-center w-full">
              <TabsList className="flex space-x-2">
                <TabsTrigger value="personal" className="rounded-full">Personal Details</TabsTrigger>
                <TabsTrigger value="professional" className="rounded-full">Professional Info</TabsTrigger>
                <TabsTrigger value="bank" className="rounded-full">Bank Details</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-full">Activity</TabsTrigger>
                <TabsTrigger value="salary" className="rounded-full">Salary Info</TabsTrigger>
              </TabsList>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => navigate(`/employee/${id}`)}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-full"
                >
                  Edit Profile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                      aria-label="More actions"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsExitModalOpen(true)}>
                      Initiate Exit Process
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Exit Process Modal */}
            {isExitModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
                  onClick={() => setIsExitModalOpen(false)}
                ></div>

                <div
                  className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative z-50 border border-gray-200 transform transition-all duration-300 scale-100 opacity-100"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exit-modal-title"
                >
                  <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                    onClick={() => setIsExitModalOpen(false)}
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
                      id="exit-modal-title"
                      className="text-xl font-semibold text-gray-800 mb-4"
                    >
                      Initiate Exit Process
                    </h2>

                    <div className="flex flex-col md:flex-row md:space-x-4">
                      {/* Form Fields (Left Side) */}
                      <div className="flex-1 space-y-4">
                        {/* Last Working Day Field */}
                        <div>
                          <label htmlFor="last-working-day" className="text-sm font-medium text-gray-600">
                            Last Working Day <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="last-working-day"
                            type="date"
                            value={exitForm.lastWorkingDay}
                            onChange={(e) => setExitForm({ ...exitForm, lastWorkingDay: e.target.value })}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="2025-05-23" // Restrict to today or future dates
                            required
                          />
                        </div>

                        {/* Reason for Exit */}
                        <div>
                          <label htmlFor="exit-reason" className="text-sm font-medium text-gray-600">
                            Reason for Exit <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="exit-reason"
                            value={exitForm.reason}
                            onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a reason</option>
                            <option value="Resignation">Resignation</option>
                            <option value="Termination">Termination</option>
                            <option value="Retirement">Retirement</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Comments */}
                        <div>
                          <label htmlFor="exit-comments" className="text-sm font-medium text-gray-600">
                            Comments
                          </label>
                          <textarea
                            id="exit-comments"
                            value={exitForm.comments}
                            onChange={(e) => setExitForm({ ...exitForm, comments: e.target.value })}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter any additional comments"
                          />
                        </div>

                        {/* Final Pay Settlement Options */}
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            When do you want to settle the final pay?
                          </label>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                id="regular-pay-schedule"
                                name="pay-settlement"
                                value="regular"
                                checked={paySettlementOption === 'regular'}
                                onChange={() => setPaySettlementOption('regular')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label
                                htmlFor="regular-pay-schedule"
                                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                              >
                                Pay as per the regular pay schedule
                              </label>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="radio"
                                id="pay-on-date"
                                name="pay-settlement"
                                value="date"
                                checked={paySettlementOption === 'date'}
                                onChange={() => setPaySettlementOption('date')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label
                                htmlFor="pay-on-date"
                                className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                              >
                                Pay on a given date
                              </label>
                            </div>
                          </div>

                          {/* Final Settlement Date (Conditional) */}
                          {paySettlementOption === 'date' && (
                            <div className="mt-4">
                              <label htmlFor="final-settlement-date" className="text-sm font-medium text-gray-600">
                                Final Settlement Date <span className="text-red-500">*</span>
                              </label>
                              <Input
                                id="final-settlement-date"
                                type="date"
                                value={exitForm.finalSettlementDate || ''}
                                onChange={(e) => setExitForm({ ...exitForm, finalSettlementDate: e.target.value })}
                                className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="2025-05-23" // Restrict to today or future dates
                                required
                              />
                            </div>
                          )}
                        </div>

                        {/* Personal Email Address */}
                        <div>
                          <label htmlFor="personal-email" className="text-sm font-medium text-gray-600">
                            Personal Email Address <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="personal-email"
                            type="email"
                            value={exitForm.personalEmail || ''}
                            onChange={(e) => setExitForm({ ...exitForm, personalEmail: e.target.value })}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter personal email address"
                            required
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label htmlFor="exit-notes" className="text-sm font-medium text-gray-600">
                            Notes
                          </label>
                          <textarea
                            id="exit-notes"
                            value={exitForm.notes || ''}
                            onChange={(e) => setExitForm({ ...exitForm, notes: e.target.value })}
                            className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter any additional notes"
                          />
                        </div>
                      </div>

                      {/* Employee Details (Right Side) */}
                      <div className="flex-1 mt-4 md:mt-0">
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Employee Details</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Employee Name: </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {employee.first_name} {employee.last_name}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Employee ID: </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {employee.employee_id || 'Not provided'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Designation: </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {employee.designation_name || 'Not provided'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Department: </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {employee.department_name || 'Not provided'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Date of Joining: </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {employee.joining_date ? formatDate(employee.joining_date) : 'Not provided'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4 mt-6">
                      <Button
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                        onClick={() => setIsExitModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        onClick={handleExitProcessSubmit}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <TabsContent value="personal" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Home className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Addresses</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Current Address</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.address_line1 || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address (cont.)</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.address_line2 || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.city || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">State</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.state || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            Postal Code
                            <Button
                              variant="ghost"
                              size="xs"
                              className="ml-2 text-purple-500 dark:text-purple-400"
                              onClick={() =>
                                copyToClipboard(
                                  `${employee.address?.address_line1 || ""} ${employee.address?.address_line2 || ""}, ${employee.address?.city || ""}, ${employee.address?.state || ""}, ${employee.address?.zip_code || ""}`,
                                  "Current Address"
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.zip_code || "Not provided"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Home Address</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.address_line1 || employee.address?.address_line1 || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address (cont.)</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.address_line2 || employee.address?.address_line2 || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.city || employee.address?.city || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">State</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.state || employee.address?.state || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            Postal Code
                            <Button
                              variant="ghost"
                              size="xs"
                              className="ml-2 text-purple-500 dark:text-purple-400"
                              onClick={() =>
                                copyToClipboard(
                                  `${employee.permanent_address?.address_line1 || employee.address?.address_line1 || ""} ${employee.permanent_address?.address_line2 || employee.address?.address_line2 || ""}, ${employee.permanent_address?.city || employee.address?.city || ""}, ${employee.permanent_address?.state || employee.address?.state || ""}, ${employee.permanent_address?.zip_code || employee.address?.zip_code || ""}`,
                                  "Home Address"
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.zip_code || employee.address?.zip_code || "Not provided"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Education</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employee.education && employee.education.length > 0 ? (
                      employee.education.map((edu) => (
                        <div key={edu.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                            {edu.type}
                            {edu.document_url && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  asChild
                                  className="ml-2 text-purple-500 dark:text-purple-400"
                                >
                                  <a href={edu.document_url} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  asChild
                                  className="ml-1 text-purple-500 dark:text-purple-400"
                                >
                                  <a href={edu.document_url} download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">{edu.institute || 'N/A'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {edu.year_completed ? new Date(edu.year_completed).getFullYear() : 'N/A'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 italic">No education details available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

           <Card className="shadow-md rounded-xl">
    <CardContent className="pt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Identity & Verification</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aadhar Card */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
          <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center mb-1">
            <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
            Aadhar Card
            {renderVerificationStatus('aadhaar')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Number: {employee.aadhar_number || 'Not provided'}
          </div>
          <div className="flex items-center mt-2">
            {employee.aadhar_url && (
              <>
                <Button variant="ghost" size="xs" asChild className="text-purple-500 dark:text-purple-400">
                  <a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-1"/>View</a>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="xs"
              className="ml-auto"
              onClick={() => handleVerifyIdentity('aadhaar')}
              disabled={!employee.aadhar_number || isVerifying.aadhaar}
            >
              {isVerifying.aadhaar ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Verify'}
            </Button>
          </div>
        </div>

        {/* PAN Card */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
          <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center mb-1">
            <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
            PAN Card
            {renderVerificationStatus('pan')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Number: {employee.pan_number || 'Not provided'}
          </div>
          <div className="flex items-center mt-2">
            {employee.pan_url && (
               <Button variant="ghost" size="xs" asChild className="text-purple-500 dark:text-purple-400">
                  <a href={employee.pan_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-1"/>View</a>
                </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              className="ml-auto"
              onClick={() => handleVerifyIdentity('pan')}
              disabled={!employee.pan_number || isVerifying.pan}
            >
              {isVerifying.pan ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Verify'}
            </Button>
          </div>
        </div>
        
       <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                      <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                        <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                        ESIC
                        {employee.esic_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-2 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.esic_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-1 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.esic_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Number: {employee.esic_number || 'Not provided'}
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                      <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                        <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                        UAN
                        {employee.uan_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-2 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.uan_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-1 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.uan_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Number: {employee.uan_number || 'Not provided'}
                      </div>
                    </div>
      </div>
    </CardContent>
  </Card>
            </TabsContent>

            <TabsContent value="professional" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Professional Information</h3>
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Department</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{employee.department_name || "Not provided"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Designation</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{employee.designation_name || "Not provided"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Hard Skill</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Technical</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Soft Skill</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Communication</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Work Experience</h3>
                  <div className="space-y-4">
                    {employee.experiences && employee.experiences.length > 0 ? (
                      employee.experiences.map((exp) => (
                        <div key={exp.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                          <div className="mb-4">
                            <div className="font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center">
                              {exp.position}
                              {exp.offerLetter && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    asChild
                                    className="ml-2 text-purple-500 dark:text-purple-400"
                                  >
                                    <a href={exp.offerLetter} target="_blank" rel="noopener noreferrer">
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    asChild
                                    className="ml-1 text-purple-500 dark:text-purple-400"
                                  >
                                    <a href={exp.offerLetter} download>
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </>
                              )}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">{exp.company}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {exp.location ? `${exp.location} • ` : ''}{exp.employment_type || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                            </div>
                          </div>

                          <div className="border-t pt-3 mt-3">
                            <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Documents</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Offer Letter
                                </div>
                                {exp.offerLetter && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.offerLetter} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.offerLetter} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Hike Letter
                                </div>
                                {exp.hikeLetter && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.hikeLetter} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.hikeLetter} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Separation Letter
                                </div>
                                {exp.seperationLetter && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.seperationLetter} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.seperationLetter} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Payslip 1
                                </div>
                                {exp.payslip1 && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip1} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip1} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Payslip 2
                                </div>
                                {exp.payslip2 && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip2} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip2} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="border rounded-lg p-3 bg-white dark:bg-gray-700 shadow-sm">
                                <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                                  <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                                  Payslip 3
                                </div>
                                {exp.payslip3 && (
                                  <div className="mt-2 flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip3} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      asChild
                                      className="text-purple-500 dark:text-purple-400"
                                    >
                                      <a href={exp.payslip3} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 italic">No work experience available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Bank Details</h3>
                  {employee.bankDetails ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Account Holder</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.account_holder_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Bank Name</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          Account Number
                          <Button
                            variant="ghost"
                            size="xs"
                            className="ml-2 text-purple-500 dark:text-purple-400"
                            onClick={() => setShowFullAccountNumber(!showFullAccountNumber)}
                          >
                            {showFullAccountNumber ? "Hide" : "Show"}
                          </Button>
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {showFullAccountNumber
                            ? employee.bankDetails.account_number
                            : `**** **** **** ${employee.bankDetails.account_number.slice(-4)}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">IFSC Code</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.ifsc_code}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Branch Name</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.branch_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.city || 'Not provided'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Branch Address</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.branch_address || 'Not provided'}</div>
                      </div>
                      {employee.bankDetails.document_url && (
                        <div className="col-span-2">
                          <div className="text-sm text-gray-500 dark:text-gray-400">Document</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.bankDetails.document_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.bankDetails.document_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 italic">No bank details available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Activity Timeline</h3>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                    {generateActivityTimeline().map((activity, index) => (
                      <div key={index} className="flex items-start mb-6">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center z-10">
                          {activity.icon}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(activity.date)}
                          </div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{activity.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="salary" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Salary Information</h3>
                  <div className="space-y-8">
                    {employee.latestPaymentRecord ? (
                      <div>
                        {renderCurrentSalarySummary(employee.latestPaymentRecord)}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 italic">No current salary information available</div>
                    )}

                    {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (
                      <div className="mt-8">
                        <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Appraisal History</h4>
                        {employee.appraisalHistory.map((record, index) => (
                          <div key={index} className="mb-6">
                            {renderAppraisalSummary(record)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 italic">No appraisal history available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
// Company and employee verify adding