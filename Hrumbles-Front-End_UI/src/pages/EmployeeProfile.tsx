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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Mail, Phone, Globe, User, MoreVertical, Activity, Clock, FileText, Home, Eye, Pencil, Users, UserCircle, Building2, BadgeCheck, Cog, MessageCircle, Fingerprint, CreditCard, Download, Copy, Briefcase, ShieldCheck, ShieldAlert, Loader2, CalendarDays, Heart, Droplet, CalendarPlus, IndianRupee, Timer, Hourglass, ClipboardList, Upload, Trash2, Paperclip, X } from "lucide-react";
import { useSelector } from "react-redux";

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

interface SalaryDocument {
  id: string;
  employee_id: string;
  organization_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  month: string;
  year: number;
  created_at: string;
  updated_at: string;
}

interface EmployeeDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone: string;
  employee_id: string;
  position?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  marital_status?: string;
  employment_status?: string;
  hire_type?: string;
  internship_duration?: string;
  contract_duration?: string;
  payment_basis?: string;
  hours_per_week?: string;
  salary?: number;
  salary_type?: string;
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
  salaryDocuments?: SalaryDocument[];
}

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ STATE FOR ALL DOCUMENT UPLOADS
  const [offerLetterMonth, setOfferLetterMonth] = useState<string>('');
  const [offerLetterYear, setOfferLetterYear] = useState<string>('');
  const [offerLetterUploading, setOfferLetterUploading] = useState(false);

  const [payslipsMonth, setPayslipsMonth] = useState<string>('');
  const [payslipsYear, setPayslipsYear] = useState<string>('');
  const [payslipsUploading, setPayslipsUploading] = useState(false);

  const [hikeLetterMonth, setHikeLetterMonth] = useState<string>('');
  const [hikeLetterYear, setHikeLetterYear] = useState<string>('');
  const [hikeLetterUploading, setHikeLetterUploading] = useState(false);

  const [separationLetterMonth, setSeparationLetterMonth] = useState<string>('');
  const [separationLetterYear, setSeparationLetterYear] = useState<string>('');
  const [separationLetterUploading, setSeparationLetterUploading] = useState(false);

  const [isVerifying, setIsVerifying] = useState({ pan: false, aadhaar: false });
  const [verifications, setVerifications] = useState<any[]>([]);
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
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails(id);
    }
  }, [id]);

  console.log("employee", employee);

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name), hr_designations(name), personal_email, hire_type, internship_duration, contract_duration, payment_basis, hours_per_week, salary, salary_type, employment_status, joining_date')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      let contactsData = employeeData.emergency_contacts || [];
      if (contactsData.length === 0) {
        const { data: tableContacts } = await supabase
          .from('hr_employee_emergency_contacts')
          .select('*')
          .eq('employee_id', employeeId);
        if (tableContacts) contactsData = tableContacts;
      }

      let presentAddressData = employeeData.present_address || null;
      let permanentAddressData = employeeData.permanent_address || null;

      if (!presentAddressData || Object.keys(presentAddressData).length === 0) {
        const { data } = await supabase
          .from('hr_employee_addresses')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('type', 'present')
          .maybeSingle();
        presentAddressData = data;
      }

      if (!permanentAddressData || Object.keys(permanentAddressData).length === 0) {
        const { data } = await supabase
          .from('hr_employee_addresses')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('type', 'permanent')
          .maybeSingle();
        permanentAddressData = data;
      }

      let educationData = [];
      try {
        const { data, error } = await supabase
          .from('hr_employee_education')
          .select('*')
          .eq('employee_id', employeeId);
        if (error) throw error;
        educationData = data || [];
      } catch (error) {
        console.log('Education table may not exist or query failed:', error);
      }

      let experiencesData = [];
      try {
        const { data, error } = await supabase
          .from('hr_employee_experiences')
          .select('*')
          .eq('employee_id', employeeId);

        console.log("RAW Experience Data from Supabase:", data);
        if (error) throw error;
        experiencesData = data || [];
      } catch (error) {
        console.log('Experiences table may not exist or query failed:', error);
      }

      let bankData = null;
      try {
        const { data, error } = await supabase
          .from('hr_employee_bank_details')
          .select('*')
          .eq('employee_id', employeeId)
          .maybeSingle();
        if (error) throw error;
        bankData = data;
      } catch (error) {
        console.log('Bank details table may not exist or query failed:', error);
      }

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

      const { data: salaryDocsData, error: salaryDocsError } = await supabase
        .from('hr_salary_details_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (salaryDocsError) console.error("Error fetching salary docs:", salaryDocsError);

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

      const normalizeAddress = (addr: any) => {
        if (!addr) return {};
        return {
          address_line1: addr.address_line1 || addr.addressLine1 || addr.address || '',
          address_line2: addr.address_line2 || addr.addressLine2 || '',
          city: addr.city || '',
          state: addr.state || '',
          country: addr.country || '',
          zip_code: addr.zip_code || addr.zipCode || '',
        };
      };

      const normalizedPresentAddress = normalizeAddress(presentAddressData);
      const normalizedPermanentAddress = normalizeAddress(permanentAddressData);

      const completeEmployeeData: EmployeeDetail = {
        ...employeeData,
        department_name: departmentName,
        designation_name: designationName,
        emergencyContacts: contactsData || [],
        address: normalizedPresentAddress,
        permanent_address: normalizedPermanentAddress,
        experiences: mappedExperiences,
        education: mappedEducation,
        bankDetails: bankData || undefined,
        latestPaymentRecord,
        appraisalHistory,
        salaryDocuments: salaryDocsData || [],
      };

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
      fetchEmployeeDetails(employee.id);
    } catch (error: any) {
      console.error(`Error verifying ${type}:`, error);
      toast.error(`Failed to verify ${type}: ${error.message}`);
    } finally {
      setIsVerifying(prev => ({ ...prev, [type]: false }));
    }
  };

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
    const exitData = {
      employee_id: employee!.employee_id,
      employee_name: `${employee!.first_name} ${employee!.last_name}`,
      designation: employee!.designation_name,
      department: employee!.department_name,
      date_of_joining: employee!.joining_date,
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
      const { error: insertError } = await supabase
        .from('hr_employee_exits')
        .insert([exitData]);
      if (insertError) throw insertError;

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
    fetchEmployeeDetails(employee!.id);
  };

  // ✅ FIXED: NO PAGE REFRESH - Updates state directly
  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    month: string,
    year: string,
    setUploading: (val: boolean) => void
  ) => {
    if (!event.target.files || event.target.files.length === 0 || !employee) return;

    if (!month || !year) {
      toast.error('Please select Month and Year before uploading.');
      return;
    }

    const file = event.target.files[0];

    // ✅ FIX: Allow multiple Payslips per month/year, but prevent duplicates for other documents
    if (docType !== 'Payslips') {
      const isDuplicate = employee.salaryDocuments?.some(
        doc => doc.document_type === docType && doc.month === month && doc.year === parseInt(year)
      );

      if (isDuplicate) {
        toast.error('This document already exists for this employee. Please check and upload again.');
        event.target.value = '';
        return;
      }
    }

    const fileExt = file.name.split('.').pop();
    const employeeName = `${employee.first_name}_${employee.last_name}`.replace(/\s+/g, '_');
    
    // ✅ For Payslips, add timestamp to filename to allow multiple uploads
    const timestamp = docType === 'Payslips' ? `_${Date.now()}` : '';
    const fileName = `${employeeName}_${month}_${year}${timestamp}.${fileExt}`;
    const filePath = `${organizationId}/${employee.id}/salary_docs/${fileName}`;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('salary_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('salary_documents')
        .getPublicUrl(filePath);

      const { data: insertedDoc, error: dbError } = await supabase
        .from('hr_salary_details_documents')
        .insert({
          employee_id: employee.id,
          organization_id: organizationId,
          document_type: docType,
          document_name: fileName,
          document_url: publicUrl,
          month: month,
          year: parseInt(year),
          created_by: employee.id,
          updated_by: employee.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully.');

      // ✅ CRITICAL FIX: Update state directly instead of refetching everything
      setEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          salaryDocuments: [insertedDoc, ...(prev.salaryDocuments || [])]
        };
      });

      event.target.value = '';
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!employee) return;

    try {
      const { error } = await supabase
        .from('hr_salary_details_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast.success('Document deleted successfully.');

      setEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          salaryDocuments: prev.salaryDocuments?.filter(doc => doc.id !== docId) || []
        };
      });
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const getUploadedDocument = (docType: string) => {
    return employee?.salaryDocuments?.find(doc => doc.document_type === docType);
  };

  const getUploadedPayslips = () => {
    return employee?.salaryDocuments?.filter(doc => doc.document_type === 'Payslips') || [];
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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₹0.00';
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
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.basic_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">House Rent Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.house_rent_allowance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conveyance Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.conveyance_allowance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fixed Allowance</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.fixed_allowance)}</span>
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
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(record.earnings?.total_earnings)}</span>
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
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.provident_fund)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Professional Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.professional_tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.income_tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Loan Deduction</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.loan_deduction)}</span>
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
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(record.deductions?.total_deductions)}</span>
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
            className={`w-2 h-2 rounded-full mr-2 ${record.status === 'Success' ? 'bg-green-500' : record.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
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
            className={`w-2 h-2 rounded-full mr-2 ${record.status === 'Success' ? 'bg-green-500' : record.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
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

// Helper to handle viewing documents based on file type
  const handleViewDocument = (url: string) => {
    // Get file extension
    const extension = url.split('.').pop()?.toLowerCase();
    
    // List of files browsers CANNOT open natively
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (officeExtensions.includes(extension || '')) {
      // Use Google Docs Viewer for Office files
      // encodeURIComponent is important to handle special characters in the URL
      window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`, '_blank');
    } else {
      // For PDF, PNG, JPG - Open natively
      window.open(url, '_blank');
    }
  };

  const currentSalaryRecord = (() => {
    if (employee?.appraisalHistory && employee.appraisalHistory.length > 0) {
      const latestApp = employee.appraisalHistory[0];
      return {
        ...latestApp.paymentRecord,
        payment_date: latestApp.appraisal_date,
        payment_amount: latestApp.new_payment_amount,
        status: latestApp.status,
      };
    }
    return employee?.latestPaymentRecord;
  })();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Loading employee details...</div>;
  }

  if (!employee) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Employee not found</div>;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-2xl shadow-lg border-none relative">
            <div className="absolute top-4 right-4">
              <Button onClick={() => navigate(`/profile/edit/${employee.id}`)} variant="outline" size="icon" className="bg-gray-100 dark:bg-gray-700 rounded-full h-8 w-8 hover:bg-gray-200">
                <Pencil className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              </Button>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-24 h-24 border-2 border-gray-200 flex-shrink-0">
                  <AvatarImage src={employee.profile_picture_url} alt={`${employee.first_name} ${employee.last_name}`} />
                  <AvatarFallback className="text-3xl font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{employee.first_name?.[0]}{employee.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <h1 className="text-xl font-bold text-purple-800 dark:text-purple-400 capitalize">
                    {employee.first_name?.toLowerCase()} {employee.last_name?.toLowerCase()}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {employee.designation_name || "Test account"} ({employee.employee_id || "Test001"})
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`font-semibold rounded-full px-2 py-1 text-xs flex items-center gap-2 ${employee.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <span className={`w-2 h-2 rounded-full ${employee.employment_status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {employee.employment_status || "Not provided"}
                    </span>
                    <p className="font-medium text-gray-500 dark:text-gray-400 text-xs">{employee.hire_type || "Not provided"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">Basic Information</h2>
                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-4">
                    <Mail className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Official Email</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Personal Email</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.personal_email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4"><Phone className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.phone || "Not provided"}</p></div></div>
                  <div className="flex items-center gap-4 pt-2 border-t dark:border-gray-700"><Globe className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.address?.country || "Not provided"}</p></div></div>
                  <div className="flex items-center gap-4"><Users className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.gender || "Not provided"}</p></div></div>
                  <div className="flex items-start gap-4"><CalendarDays className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Date of Birth</p><p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(employee.date_of_birth)} (Age: {getAge(employee.date_of_birth)})</p></div></div>
                  <div className="flex items-start gap-4"><Heart className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Marital Status</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.marital_status || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4"><Droplet className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Blood Group</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.blood_group || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4 pt-2 border-t dark:border-gray-700">
                    <Clock className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Hire Type</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.hire_type || "Not provided"}</p>
                    </div>
                  </div>
                  {employee.hire_type === 'Internship' && employee.internship_duration && (
                    <div className="flex items-start gap-4">
                      <Timer className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-xs text-gray-500">Internship Duration</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{employee.internship_duration}</p>
                      </div>
                    </div>
                  )}
                  {employee.hire_type === 'Contract' && (
                    <>
                      {employee.contract_duration && (
                        <div className="flex items-start gap-4">
                          <Timer className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          <div><p className="text-xs text-gray-500">Contract Duration</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.contract_duration}</p></div>
                        </div>
                      )}
                      {employee.payment_basis && (
                        <div className="flex items-start gap-4">
                          <ClipboardList className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          <div><p className="text-xs text-gray-500">Payment Basis</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.payment_basis}</p></div>
                        </div>
                      )}
                    </>
                  )}
                  {employee.hire_type === 'Part Time' && (
                    <>
                      {employee.hours_per_week && (
                        <div className="flex items-start gap-4">
                          <Hourglass className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          <div><p className="text-xs text-gray-500">Hours per Week</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.hours_per_week}</p></div>
                        </div>
                      )}
                      {employee.payment_basis && (
                        <div className="flex items-start gap-4">
                          <ClipboardList className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          <div><p className="text-xs text-gray-500">Payment Basis</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.payment_basis}</p></div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-start gap-4">
                    <IndianRupee className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">{employee.hire_type === 'Internship' ? 'Stipend' : 'Salary'}</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {(() => {
                          if (currentSalaryRecord?.payment_amount && currentSalaryRecord.payment_amount > 0) {
                            return formatCurrency(currentSalaryRecord.payment_amount);
                          }
                          if (employee.salary) {
                            const suffix = (employee.hire_type === 'Internship' || employee.salary_type === 'Monthly') ? ' /mo' : '';
                            return `${formatCurrency(employee.salary)}${suffix}`;
                          }
                          return 'Not provided';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pt-2 border-t dark:border-gray-700"><Building2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Department</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.department_name || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4"><BadgeCheck className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Designation</p><p className="font-medium text-gray-800 dark:text-gray-200">{employee.designation_name || 'Not provided'}</p></div></div>
                  <div className="flex items-start gap-4"><CalendarPlus className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Joining Date</p><p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(employee.joining_date)}</p></div></div>
                  <div className="flex items-start gap-4 pt-2 border-t dark:border-gray-700"><Cog className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Hard Skill</p><p className="font-medium text-gray-800 dark:text-gray-200">Technical</p></div></div>
                  <div className="flex items-start gap-4"><MessageCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" /><div><p className="text-xs text-gray-500">Soft Skill</p><p className="font-medium text-gray-800 dark:text-gray-200">Communication</p></div></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <div className="flex justify-start mb-6">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1.5 shadow-inner">
                <TabsTrigger value="personal" className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  Personal
                </TabsTrigger>
                <TabsTrigger value="professional" className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  Professional
                </TabsTrigger>
                <TabsTrigger value="salary" className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  Salary
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ✅ COMPLETE PERSONAL TAB */}
            <TabsContent value="personal" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Identity Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-8 w-8 text-purple-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">Aadhar Card</h4>
                          <p className="text-sm text-gray-500">{employee.aadhar_number || 'Not provided'}</p>
                        </div>
                      </div>
                      {employee.aadhar_url && (
                        <div className="flex items-center gap-1 mt-3">
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />View
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={`${employee.aadhar_url}?download=`} download>
                              <Download className="h-4 w-4 mr-2" />Download
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-purple-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">PAN Card</h4>
                          <p className="text-sm text-gray-500">{employee.pan_number || 'Not provided'}</p>
                        </div>
                      </div>
                      {employee.pan_url && (
                        <div className="flex items-center gap-1 mt-3">
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={employee.pan_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />View
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={`${employee.pan_url}?download=`} download>
                              <Download className="h-4 w-4 mr-2" />Download
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-purple-600 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold">ESIC</h4>
                          <p className="text-sm text-gray-500">{employee.esic_number || 'Not provided'}</p>
                        </div>
                      </div>
                      {employee.esic_url && (
                        <div className="flex items-center gap-1 mt-3">
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={employee.esic_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2" />View
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={`${employee.esic_url}?download=`} download>
                              <Download className="h-4 w-4 mr-2" />Download
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Addresses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Current Address</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">State</span><span className="font-medium text-right">{employee.address?.state || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Permanent Address</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.permanent_address?.address_line1 || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">City</span><span className="font-medium text-right">{employee.permanent_address?.city || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">State</span><span className="font-medium text-right">{employee.permanent_address?.state || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.permanent_address?.zip_code || 'Not provided'}</span></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Education</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['SSC', 'HSC/Diploma', 'Degree'].map(type => {
                      const edu = employee.education?.find(e => e.type === type);
                      const fileName = edu?.document_url ? edu.document_url.split('/').pop().split('?')[0] : '';
                      return (
                        <div key={type} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg text-center flex flex-col">
                          <div className="flex-grow">
                            <h4 className="font-semibold text-gray-600 dark:text-gray-400">{type}</h4>
                            <p className="font-bold mt-1 break-words text-gray-800 dark:text-gray-200">{edu?.institute || 'N/A'}</p>
                            <p className="text-xs text-gray-500">
                              {edu?.year_completed
                                ? new Date(edu.year_completed).getFullYear()
                                : 'N/A'}
                            </p>
                          </div>
                          {edu?.document_url && (
                            <div className="flex items-center justify-center gap-1 border-t dark:border-gray-600 pt-2 mt-2">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={edu.document_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-2" />View
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={`${edu.document_url}?download=`}
                                  download={fileName}
                                >
                                  <Download className="h-4 w-4 mr-2" />Download
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Bank Details</h3>
                  {employee.bankDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                      <div><h4 className="text-gray-500 mb-1">Account Holder</h4><p className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.account_holder_name}</p></div>
                      <div><h4 className="text-gray-500 mb-1">Bank Name</h4><p className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.bank_name}</p></div>
                      <div>
                        <h4 className="text-gray-500 mb-1">Account Number</h4>
                        <div className="flex items-center">
                          <p className="font-medium mr-2 text-gray-800 dark:text-gray-200">{showFullAccountNumber ? employee.bankDetails.account_number : `**** **** ${employee.bankDetails.account_number.slice(-4)}`}</p>
                          <Eye className="h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-500" onClick={() => setShowFullAccountNumber(!showFullAccountNumber)} />
                        </div>
                      </div>
                      <div><h4 className="text-gray-500 mb-1">IFSC Code</h4><p className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.ifsc_code}</p></div>
                      <div><h4 className="text-gray-500 mb-1">Branch Name</h4><p className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.branch_name}</p></div>
                    </div>
                  ) : (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No bank details have been provided.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ✅ COMPLETE PROFESSIONAL TAB */}
            <TabsContent value="professional" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Work Experience</h3>
                  <div className="space-y-6">
                    {employee.experiences && employee.experiences.length > 0 ? (
                      employee.experiences.map(exp => {
                        const documents = [
                          { label: 'Offer Letter', url: exp.offerLetter },
                          { label: 'Separation Letter', url: exp.seperationLetter },
                          { label: 'Hike Letter', url: exp.hikeLetter },
                          { label: 'Payslip 1', url: exp.payslip1 },
                          { label: 'Payslip 2', url: exp.payslip2 },
                          { label: 'Payslip 3', url: exp.payslip3 },
                        ];
                        const availableDocuments = documents.filter(doc => doc.url);
                        return (
                          <div key={exp.id} className="p-4 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{exp.position}</h4>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">{exp.company}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                            </p>
                            {availableDocuments.length > 0 && (
                              <div className="mt-4 border-t dark:border-gray-600 pt-3">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Attached Documents
                                </h5>
                                <div className="space-y-1">
                                  {availableDocuments.map(doc => {
                                    const fileName = doc.url.split('/').pop().split('?')[0];
                                    return (
                                      <div key={doc.label} className="flex items-center justify-between p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                          {doc.label}
                                        </p>
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="View">
                                              <Eye className="h-4 w-4" />
                                            </a>
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                            <a
                                              href={`${doc.url}?download=`}
                                              download={fileName}
                                              title="Download"
                                            >
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">No work experience available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ✅ COMPLETE SALARY TAB WITH INSTANT UPLOAD */}
            <TabsContent value="salary" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  {currentSalaryRecord ? (
                    <>
                      <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                        <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">
                          Salary Details - {formatDate(currentSalaryRecord.payment_date)}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
                            <span className={`w-2 h-2 rounded-full mr-2 ${currentSalaryRecord.status === 'Success' ? 'bg-green-500' : currentSalaryRecord.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.status}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Net Pay:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(currentSalaryRecord.payment_amount)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Earnings</h5>
                          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings?.basic_salary || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">House Rent Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings?.house_rent_allowance || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Conveyance Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings?.conveyance_allowance || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Fixed Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings?.fixed_allowance || 0)}</span></div>
                            <div className="border-t pt-2 mt-2 flex justify-between"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Earnings</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings?.total_earnings || 0)}</span></div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Deductions</h5>
                          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.provident_fund || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Professional Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.professional_tax || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.income_tax || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Loan Deduction</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.loan_deduction || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Paid Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.deductions?.paid_days || 0}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">LOP Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.deductions?.lop_days || 0}</span></div>
                            <div className="border-t pt-2 mt-2 flex justify-between"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.total_deductions || 0)}</span></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-center text-gray-500 py-4">No salary information available.</p>
                  )}
                </CardContent>
              </Card>

              {/* ✅ SALARY DOCUMENTS WITH INSTANT UPLOAD */}
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Salary Documents</h3>

                  <div className="space-y-6">
                    {/* OFFER LETTER, HIKE LETTER, SEPARATION LETTER */}
                    {['Offer Letter', 'Increase/Hike Letter', 'Separation Letter'].map((docType) => {
                      const uploadedDoc = getUploadedDocument(docType);
                      const isOfferLetter = docType === 'Offer Letter';
                      const isHikeLetter = docType === 'Increase/Hike Letter';
                      const isSeparationLetter = docType === 'Separation Letter';

                      const currentMonth = isOfferLetter ? offerLetterMonth 
                        : isHikeLetter ? hikeLetterMonth 
                        : separationLetterMonth;
                        
                      const currentYear = isOfferLetter ? offerLetterYear 
                        : isHikeLetter ? hikeLetterYear 
                        : separationLetterYear;
                        
                      const isUploading = isOfferLetter ? offerLetterUploading 
                        : isHikeLetter ? hikeLetterUploading 
                        : separationLetterUploading;
                        
                      const setCurrentMonth = isOfferLetter ? setOfferLetterMonth 
                        : isHikeLetter ? setHikeLetterMonth 
                        : setSeparationLetterMonth;
                        
                      const setCurrentYear = isOfferLetter ? setOfferLetterYear 
                        : isHikeLetter ? setHikeLetterYear 
                        : setSeparationLetterYear;
                        
                      const setUploading = isOfferLetter ? setOfferLetterUploading 
                        : isHikeLetter ? setHikeLetterUploading 
                        : setSeparationLetterUploading;

                      return (
                        <div key={docType} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">{docType}</h4>

                          {!uploadedDoc ? (
                            <div className="flex flex-wrap items-end gap-4">
                              <div className="flex-shrink-0">
                                <input
                                  type="file"
                                  id={`upload-${docType}`}
                                  className="hidden"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => handleDocumentUpload(e, docType, currentMonth, currentYear, setUploading)}
                                  disabled={isUploading}
                                />
<Button
  onClick={() => document.getElementById(`upload-${docType}`)?.click()}
  disabled={isUploading}
  className="bg-[#7731E8] text-white hover:bg-[#6220C7] rounded-full px-4 py-2"
>
  {isUploading ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
    </>
  ) : (
    <>
      <Upload className="h-4 w-4 mr-2" /> Upload
    </>
  )}
</Button>

                              </div>

                              <div className="w-40">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
                                <Select value={currentMonth} onValueChange={setCurrentMonth}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Month" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {months.map(month => (
                                      <SelectItem key={month} value={month}>{month}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="w-32">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
                                <Select value={currentYear} onValueChange={setCurrentYear}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Year" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {years.map(year => (
                                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center gap-3">
                                <Paperclip className="h-5 w-5 text-[#7731E8] flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {uploadedDoc.document_name.length > 30
                                      ? uploadedDoc.document_name.substring(0, 30) + '...'
                                      : uploadedDoc.document_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {uploadedDoc.month} {uploadedDoc.year}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Preview: Opens in New Tab */}
                        {/* Preview Button */}
<Button
  variant="outline"
  size="sm"
  className="text-[#7731E8] border-[#7731E8] hover:text-[#7731E8] hover:bg-purple-100 rounded-full px-4"
  onClick={() => handleViewDocument(uploadedDoc.document_url)}
>
  <Eye className="h-4 w-4 mr-1" /> Preview
</Button>



                                {/* Download: Forces Download */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#7731E8] border-[#7731E8] hover:text-[#7731E8] hover:bg-purple-100 rounded-full px-4"
                                  asChild
                                >
                                  <a href={`${uploadedDoc.document_url}?download=`} download={uploadedDoc.document_name}>
                                    <Download className="h-4 w-4 mr-1" /> Download
                                  </a>
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDocument(uploadedDoc.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
   
                        </div>
                      );
                    })}

                    {/* ✅ PAYSLIPS - ALLOWS MULTIPLE UPLOADS WITH INSTANT DISPLAY */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Payslips</h4>

                      {/* TABLE OF UPLOADED PAYSLIPS */}
                      {getUploadedPayslips().length > 0 && (
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <table className="w-full">
<thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Employee Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Document Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Month
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Year
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  View
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Download
                                </th>
                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Delete
                                </th>
                              </tr>
                            </thead>
         <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                              {getUploadedPayslips().map((payslip) => (
                                <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    {employee.first_name} {employee.last_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    Payslip
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    {payslip.month}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    {payslip.year}
                                  </td>
                                  
                                  {/* View (New Tab) */}
                              {/* View Button Column */}
<td className="px-4 py-3">
  <Button
    variant="link"
    size="sm"
    className="text-[#7731E8] hover:text-[#6220C7] p-0"
    onClick={() => handleViewDocument(payslip.document_url)} // <--- CHANGED THIS
  >
    <Eye className="h-4 w-4 mr-1" /> View
  </Button>
</td>

                                  {/* Download (Force Download) */}
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-[#7731E8] hover:text-[#6220C7] p-0"
                                      asChild
                                    >
                                      <a href={`${payslip.document_url}?download=`} download={payslip.document_name}>
                                        <Download className="h-4 w-4 mr-1"/> Download
                                      </a>
                                    </Button>
                                  </td>
                                     <td className="px-4 py-3">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteDocument(payslip.id)}
                                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* UPLOAD NEW PAYSLIP */}
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-shrink-0">
                          <input
                            type="file"
                            id="upload-Payslips"
                            className="hidden"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleDocumentUpload(e, 'Payslips', payslipsMonth, payslipsYear, setPayslipsUploading)}
                            disabled={payslipsUploading}
                          />
                  <Button
  onClick={() => document.getElementById('upload-Payslips')?.click()}
  disabled={payslipsUploading}
  className="bg-[#7731E8] text-white hover:bg-[#6220C7] rounded-lg"
>
                            {payslipsUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" /> Upload
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="w-40">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
                          <Select value={payslipsMonth} onValueChange={setPayslipsMonth}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {months.map(month => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-32">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
                          <Select value={payslipsYear} onValueChange={setPayslipsYear}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
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