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
import { Edit, Mail, Phone, Globe, User, MoreVertical, Activity, Clock, FileText, Home, Eye,Pencil,Users,UserCircle , Building2,BadgeCheck,Cog,MessageCircle, Fingerprint, CreditCard , Download, Copy, Briefcase, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
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
 
    const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
 
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
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
 
        {/* --- LEFT COLUMN: Basic Information & Activity Timeline --- */}
        <div className="lg:col-span-1 space-y-8">
         
          {/* Basic Information Card */}
          <Card className="rounded-2xl shadow-lg border-none relative">
            <div className="absolute top-4 right-4">
              <Button onClick={() => navigate(`/employee/${userId}`)} variant="outline" size="icon" className="bg-gray-100 dark:bg-gray-700 rounded-full h-8 w-8 hover:bg-gray-200">
                <Pencil className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </Button>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-2 border-gray-200">
                  <AvatarImage src={employee.profile_picture_url} alt={`${employee.first_name} ${employee.last_name}`} />
                  <AvatarFallback className="text-3xl font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{employee.first_name?.[0]}{employee.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold text-purple-800 dark:text-purple-400">{employee.first_name} {employee.last_name}</h1>
                <span className="mt-1 inline-block text-sm font-semibold bg-purple-100 text-purple-800 px-3 py-1 rounded-full">{employee.designation_name || "Test account"}</span>
                <p className="text-xs text-purple-700 dark:text-purple-500 mt-2">{employee.employee_id || "Test001"}</p>
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">Basic Information</h2>
                <div className="space-y-5 text-sm">
                  <div className="flex items-center gap-4"><Mail className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.email}</p></div></div>
                  <div className="flex items-center gap-4"><Phone className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.phone || "Not provided"}</p></div></div>
                  <div className="flex items-center gap-4"><Globe className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.address?.country || "Not provided"}</p></div></div>
                  <div className="flex items-center gap-4"><Users className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.gender || "Not provided"}</p></div></div>
                  <div className="flex items-center gap-4"><UserCircle className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{getAge(employee.date_of_birth)}</p></div></div>
                  <div className="flex items-start gap-4 pt-2 border-t dark:border-gray-700"><Building2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Department</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.department_name || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4"><BadgeCheck className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Designation</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.designation_name || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4"><Cog className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Hard Skill</p><p className="font-medium text-gray-800 dark:text-gray-200">Technical</p></div></div>
                  <div className="flex items-start gap-4"><MessageCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Soft Skill</p><p className="font-medium text-gray-800 dark:text-gray-200">Communication</p></div></div>
                  <div className="flex items-center gap-4 pt-2 border-t dark:border-gray-700"><ShieldAlert className="h-5 w-5 text-gray-400" /><div><span className={`font-semibold rounded-full px-2 py-1 text-xs flex items-center gap-2 ${employee.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><span className={`w-2 h-2 rounded-full ${employee.employment_status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>{employee.employment_status || "Not provided"}</span></div></div>
                  <div className="flex items-center gap-4"><Clock className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.type_of_hire || "Not provided"}</p></div></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
 
        {/* --- RIGHT COLUMN: Tabbed Content Area --- */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 justify-start">
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="professional">Professional Information</TabsTrigger>
              <TabsTrigger value="salary">Salary Information</TabsTrigger>
             
            </TabsList>
 
            {/* --- Personal Information Tab --- */}
            <TabsContent value="personal" className="mt-6 space-y-8">
              {/* Identity Documents Card */}
                       {/* Identity Documents Card - FINAL CORRECTED LAYOUT */}
          <Card className="rounded-2xl shadow-lg border-none">
            <CardContent className="p-6">
               <h3 className="font-bold text-lg mb-4">Identity Documents</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 
                  {/* Aadhar Card */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                     <div className="flex items-start justify-between">
                        {/* Left Side: Icon and Text */}
                        <div className="flex items-center gap-4">
                           <Fingerprint className="h-6 w-6 text-purple-600 flex-shrink-0"/>
                           <div>
                              <h4 className="font-semibold text-sm">Aadhar Card</h4>
                              <p className="text-xs text-gray-500">Number: {employee.aadhar_number || 'Not provided'}</p>
                           </div>
                        </div>
                        {/* Right Side: Action Buttons */}
                        {employee.aadhar_url && (
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.aadhar_url} download><Download className="h-4 w-4"/></a></Button>
                           </div>
                        )}
                     </div>
                  </div>
 
                  {/* PAN Card */}
                   <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                     <div className="flex items-start justify-between">
                        {/* Left Side: Icon and Text */}
                        <div className="flex items-center gap-4">
                           <CreditCard className="h-6 w-6 text-purple-600 flex-shrink-0"/>
                           <div>
                              <h4 className="font-semibold text-sm">PAN Card</h4>
                              <p className="text-xs text-gray-500">Number: {employee.pan_number || 'Not provided'}</p>
                           </div>
                        </div>
                        {/* Right Side: Action Buttons */}
                        {employee.pan_url && (
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.pan_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.pan_url} download><Download className="h-4 w-4"/></a></Button>
                           </div>
                        )}
                     </div>
                  </div>
 
                  {/* ESIC Card */}
                   <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                     <div className="flex items-start justify-between">
                        {/* Left Side: Icon and Text */}
                        <div className="flex items-center gap-4">
                           <CreditCard className="h-6 w-6 text-purple-600 flex-shrink-0"/>
                           <div>
                              <h4 className="font-semibold text-sm">ESIC</h4>
                              <p className="text-xs text-gray-500">Number: {employee.esic_number || 'Not provided'}</p>
                           </div>
                        </div>
                        {/* Right Side: Action Buttons */}
                        {employee.esic_url && (
                           <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.esic_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.esic_url} download><Download className="h-4 w-4"/></a></Button>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
              {/* Addresses Card */}
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Addresses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Current Address</h4>{employee.address?.address_line1 && (<Copy className="h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-500" onClick={() => copyToClipboard(`${employee.address.address_line1}, ${employee.address.city}, ${employee.address.zip_code}`,'Current Address')}/>)}</div>
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm"><span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span><span className="text-gray-500">Address (cont.)</span><span className="font-medium text-right">-</span><span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span><span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center"><h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Home Address</h4>{employee.address?.address_line1 && (<Copy className="h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-500" onClick={() => copyToClipboard(`${employee.address.address_line1}, ${employee.address.city}, ${employee.address.zip_code}`,'Home Address')}/>)}</div>
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm"><span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span><span className="text-gray-500">Address (cont.)</span><span className="font-medium text-right">-</span><span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span><span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Education Card */}
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Education</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="text-center mb-2"><h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">SSC</h4><p className="font-bold mt-1 break-words">{employee.education?.find(e => e.type === 'SSC')?.institute || 'N/A'}</p><p className="text-xs text-gray-500">{formatDate(employee.education?.find(e => e.type === 'SSC')?.year_completed)}</p></div>{employee.education?.find(e => e.type === 'SSC')?.document_url && (<div className="flex items-center justify-center gap-1 border-t dark:border-gray-700 pt-2"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'SSC').document_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'SSC').document_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="text-center mb-2"><h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">HSC/Diploma</h4><p className="font-bold mt-1 break-words">{employee.education?.find(e => e.type === 'HSC/Diploma')?.institute || 'N/A'}</p><p className="text-xs text-gray-500">{formatDate(employee.education?.find(e => e.type === 'HSC/Diploma')?.year_completed)}</p></div>{employee.education?.find(e => e.type === 'HSC/Diploma')?.document_url && (<div className="flex items-center justify-center gap-1 border-t dark:border-gray-700 pt-2"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'HSC/Diploma').document_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'HSC/Diploma').document_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="text-center mb-2"><h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Degree</h4><p className="font-bold mt-1 break-words">{employee.education?.find(e => e.type === 'Degree')?.institute || 'N/A'}</p><p className="text-xs text-gray-500">{formatDate(employee.education?.find(e => e.type === 'Degree')?.year_completed)}</p></div>{employee.education?.find(e => e.type === 'Degree')?.document_url && (<div className="flex items-center justify-center gap-1 border-t dark:border-gray-700 pt-2"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'Degree').document_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.education.find(e => e.type === 'Degree').document_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
           
            {/* --- Professional Information Tab --- */}
            <TabsContent value="professional" className="mt-6 space-y-8">
              {/* Professional Information & Work Experience Card */}
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  {/* <h3 className="font-bold text-lg mb-4">Professional Information</h3> */}
                 
                  <hr className="dark:border-gray-700"/>
                  <h3 className="font-bold text-lg mt-6 mb-4">Work Experience</h3>
                  <div className="space-y-4">
                    {employee.experiences && employee.experiences.length > 0 ? (employee.experiences.map(exp => (<div key={exp.id}><p className="font-semibold text-gray-800 dark:text-gray-200">{exp.position} at {exp.company}</p><p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}</p></div>))) : (<p className="text-sm text-gray-500 dark:text-gray-400">No work experience available</p>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
 
            {/* --- Salary Information Tab --- */}
            <TabsContent value="salary" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-6">Salary Information</h3>
                  <div className="space-y-8">
                    {employee.latestPaymentRecord ? (<div>{renderCurrentSalarySummary(employee.latestPaymentRecord)}</div>) : (<p className="text-sm text-gray-500">No current salary information available.</p>)}
                    {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (<div className="mt-6"><h4 className="font-bold text-lg mb-4">Appraisal History</h4>{employee.appraisalHistory.map((record) => (<div key={record.id} className="mb-6">{renderAppraisalSummary(record)}</div>))}</div>) : (<div className="pt-4 mt-4 border-t dark:border-gray-700"><p className="text-sm text-gray-500">No appraisal history available.</p></div>)}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Bank Details</h3>
                  {employee.bankDetails ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm"><div><h4 className="text-gray-500 mb-1">Account Holder</h4><p className="font-medium">{employee.bankDetails.account_holder_name}</p></div><div><h4 className="text-gray-500 mb-1">Bank Name</h4><p className="font-medium">{employee.bankDetails.bank_name}</p></div><div><h4 className="text-gray-500 mb-1">Account Number</h4><div className="flex items-center"><p className="font-medium mr-2">{showFullAccountNumber ? employee.bankDetails.account_number : `**** **** ${employee.bankDetails.account_number.slice(-4)}`}</p><span onClick={() => setShowFullAccountNumber(!showFullAccountNumber)} className="text-purple-600 cursor-pointer hover:underline text-xs">View</span></div></div><div><h4 className="text-gray-500 mb-1">IFSC Code</h4><p className="font-medium">{employee.bankDetails.ifsc_code}</p></div><div><h4 className="text-gray-500 mb-1">Branch</h4><p className="font-medium">{employee.bankDetails.branch_name}</p></div><div><h4 className="text-gray-500 mb-1">City</h4><p className="font-medium">{employee.bankDetails.city || 'N/A'}</p></div></div>) : (<p className="text-sm text-gray-500 dark:text-gray-400">No bank details available.</p>)}
                </CardContent>
              </Card>
            </TabsContent>
 
            {/* --- Documents Tab --- */}
            <TabsContent value="documents" className="mt-6 space-y-8">
         
            </TabsContent>
          </Tabs>
        </div>
      </div>
 
      {/* --- Dialog for the Payslip Viewer --- */}
      <Dialog open={isPayslipOpen} onOpenChange={setIsPayslipOpen}>
        <DialogContent className="max-w-3xl p-0">
          {selectedPayslip && (
            <PayslipViewer payslipData={selectedPayslip} paymentId={selectedPayslip.employeeId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
 
export default EmployeeProfile;