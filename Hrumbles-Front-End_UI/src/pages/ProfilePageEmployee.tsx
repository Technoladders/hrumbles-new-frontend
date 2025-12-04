import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, Phone, Globe, User, Copy, Briefcase, Linkedin, Dribbble,
  MessageSquare, GraduationCap, ShieldCheck, Eye, Download, UserCircle,
  Users, ShieldAlert, Clock, Pencil, Home, FileText, Fingerprint, CreditCard,  Building2,
  BadgeCheck,
  Cog,
  MessageCircle, CalendarDays, Heart, Droplet, CalendarPlus, IndianRupee, Timer, Hourglass, ClipboardList, Paperclip, TrendingUp, TrendingDown, Wallet
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// --- INTERFACES (Keep existing) ---

interface PaymentEarning {
  id: string;
  payment_id: string;
  basic_salary: number;
  house_rent_allowance: number;
  conveyance_allowance: number;
  fixed_allowance: number;
  total_earnings: number;
}
 
interface PaymentDeduction {
  id: string;
  payment_id: string;
  provident_fund: number;
  professional_tax: number;
  income_tax: number;
  loan_deduction: number;
  total_deductions: number;
  paid_days?: number;
  lop_days?: number;
}
 
interface PaymentCustomDeduction {
  id: string;
  name: string;
  amount: number;
}
 
interface PaymentRecord {
  id: string;
  payment_date: string;
  payment_amount: number;
  status: string;
  earnings?: PaymentEarning;
  deductions?: PaymentDeduction;
  customDeductions?: PaymentCustomDeduction[];
}
 
interface AppraisalRecord {
  id: string;
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
    joining_date?: string;
    created_at?: string;
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
    department_name?: string;
    designation_name?: string;
    pan_url?: string;
    esic_number?: string;
    esic_url?: string;
    profile_picture_url?: string;
    department_id?: string;
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
    emergencyContacts?: Array<{ id: string; name: string; relationship: string; phone: string; }>;
    experiences?: Array<{ id: string; company: string; position: string; location?: string; start_date?: string; end_date?: string; employment_type?: string; offerLetter?: string; hikeLetter?: string; seperationLetter?: string; payslip1?: string; payslip2?: string; payslip3?: string; }>;
    education?: Array<{ id: string; type: string; institute?: string; year_completed?: string; document_url?: string; }>;
    bankDetails?: { account_holder_name: string; account_number: string; bank_name: string; branch_name: string; ifsc_code: string; branch_address?: string; city?: string; };
    latestPaymentRecord?: PaymentRecord;
    appraisalHistory?: AppraisalRecord[];
    salaryDocuments?: SalaryDocument[];
}


const ProfilePageEmployee = () => {
 
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id;
  
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  // --- HELPER FUNCTIONS (Keep all existing) ---
 
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  };
   const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
 
  const isNewAppraisal = (record: AppraisalRecord) => {
    const createdAt = new Date(record.created_at).getTime();
    const updatedAt = new Date(record.updated_at).getTime();
    const isUpdatedByDrawer = record.last_updated_by === 'EmployeesPayrollDrawer';
    return updatedAt > createdAt && isUpdatedByDrawer;
  };

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

  const getUploadedDocument = (docType: string) => {
    return employee?.salaryDocuments?.find(doc => doc.document_type === docType);
  };

  const getUploadedPayslips = () => {
    return employee?.salaryDocuments?.filter(doc => doc.document_type === 'Payslips') || [];
  };
  
  // All data fetching logic (Keep existing)
  useEffect(() => {
    if (userId) {
      fetchEmployeeDetails(userId);
    }
  }, [userId]);

  const getFullPaymentRecordDetails = async (record: any): Promise<PaymentRecord> => {
    if (!record) return Promise.reject("No record provided");
 
    const { data: earningsData } = await supabase.from('payment_earnings').select('*').eq('payment_id', record.id).maybeSingle();
    const { data: deductionsData } = await supabase.from('payment_deductions').select('*').eq('payment_id', record.id).maybeSingle();
    const { data: customDeductionsData } = await supabase.from('payment_custom_deductions').select('*').eq('payment_id', record.id);
 
    return {
      ...record,
      earnings: earningsData || undefined,
      deductions: deductionsData || undefined,
      customDeductions: customDeductionsData || [],
    };
  };

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);
     
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select(`*, hr_departments(name), hr_designations(name), personal_email, hire_type, internship_duration, contract_duration, payment_basis, hours_per_week, salary, salary_type, employment_status, joining_date`)
        .eq('id', employeeId)
        .single();
      if (employeeError) throw employeeError;
     
      const { data: contactsData } = await supabase.from('hr_employee_emergency_contacts').select('*').eq('employee_id', employeeId);
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
      const { data: educationData } = await supabase.from('hr_employee_education').select('*').eq('employee_id', employeeId);
      const { data: experiencesData } = await supabase.from('hr_employee_experiences').select('*').eq('employee_id', employeeId);
      const { data: bankData } = await supabase.from('hr_employee_bank_details').select('*').eq('employee_id', employeeId).maybeSingle();
 
      const { data: latestPaymentRecordData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (paymentError) throw paymentError;
 
      let latestPaymentRecord: PaymentRecord | undefined;
      if (latestPaymentRecordData && latestPaymentRecordData.length > 0) {
        latestPaymentRecord = await getFullPaymentRecordDetails(latestPaymentRecordData[0]);
      }
 
      const { data: appraisalRecordsData, error: appraisalError } = await supabase
        .from('appraisal_records')
        .select('*, paymentRecord:payment_records(*)')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false });
      if (appraisalError) throw appraisalError;
 
      const enrichedAppraisalHistory = appraisalRecordsData ? await Promise.all(
        appraisalRecordsData.map(async (appraisal) => {
          if (appraisal.paymentRecord) {
            const fullPaymentDetails = await getFullPaymentRecordDetails(appraisal.paymentRecord);
            return { ...appraisal, paymentRecord: fullPaymentDetails };
          }
          return appraisal;
        })
      ) : [];

      const { data: salaryDocsData, error: salaryDocsError } = await supabase
        .from('hr_salary_details_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (salaryDocsError) console.error("Error fetching salary docs:", salaryDocsError);
     
      const mappedExperiences = experiencesData ? experiencesData.map(exp => ({
        id: exp.id, company: exp.company, position: exp.job_title, location: exp.location, start_date: exp.start_date, end_date: exp.end_date, employment_type: exp.employment_type, offerLetter: exp.offer_letter_url, seperationLetter: exp.separation_letter_url, hikeLetter: exp.hike_letter_url, payslip1: exp.payslip_1_url, payslip2: exp.payslip_2_url, payslip3: exp.payslip_3_url,
      })) : [];
     
      const mappedEducation = educationData ? educationData.map(edu => ({
        id: edu.id, type: edu.type, institute: edu.institute, year_completed: edu.year_completed, document_url: edu.document_url,
      })) : [];
 
      const normalizedPresentAddress = normalizeAddress(presentAddressData);
      const normalizedPermanentAddress = normalizeAddress(permanentAddressData);
 
      const completeEmployeeData: EmployeeDetail = {
        ...employeeData,
        department_name: employeeData?.hr_departments?.name || 'N/A',
        designation_name: employeeData?.hr_designations?.name || 'N/A',
        emergencyContacts: contactsData || [],
        address: normalizedPresentAddress,
        permanent_address: normalizedPermanentAddress,
        experiences: mappedExperiences,
        education: mappedEducation,
        bankDetails: bankData || undefined,
        latestPaymentRecord,
        appraisalHistory: enrichedAppraisalHistory,
        salaryDocuments: salaryDocsData || [],
      };
     
      setEmployee(completeEmployeeData);
 
    } catch (error: any) {
      console.error("Error fetching employee details:", error);
      toast.error(`Error loading employee details: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  const handleViewDocument = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (officeExtensions.includes(extension || '')) {
      window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`, '_blank');
    } else {
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
 
        {/* --- LEFT COLUMN (Keep existing) --- */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-2xl shadow-lg border-none relative">
            <div className="absolute top-4 right-4">
            <Button 
onClick={() => navigate(`/profile/edit/${userId}`)} variant="outline" size="icon" className="bg-gray-100 dark:bg-gray-700 rounded-full h-8 w-8 hover:bg-gray-200">
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
                    {employee.first_name} {employee.last_name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {employee.designation_name || "Test account"} ({employee.employee_id || "Test001"})
                  </p>
     <div className="mt-2 flex items-center gap-3">
  {/* Update 1: Check lowercase status for the container background/text color */}
  <span 
    className={`font-semibold rounded-full px-2 py-1 text-xs flex items-center gap-2 ${
      employee.employment_status?.toLowerCase() === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
    }`}
  >
    {/* Update 2: Check lowercase status for the dot color */}
    <span 
      className={`w-2 h-2 rounded-full ${
        employee.employment_status?.toLowerCase() === 'active' 
        ? 'bg-green-500' 
        : 'bg-red-500'
      }`}
    ></span>
    
    {/* This displays the actual text exactly as it comes from the database */}
    {employee.employment_status || "Not provided"}
  </span>
  <p className="font-medium text-gray-500 dark:text-gray-400 text-xs">
    {employee.hire_type || "Not provided"}
  </p>
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
           <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Activity Timeline</h3>
                  <div className="relative space-y-6 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                    {generateActivityTimeline().map((activity, index) => (
                      <div key={index} className="relative flex items-start pl-8">
                        <div className="absolute -left-[9px] top-1 flex items-center justify-center w-4 h-4 bg-purple-500 rounded-full ring-4 ring-white dark:ring-gray-800"></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(activity.date)}</p>{activity.icon}</div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mt-1">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
        </div>
 
        {/* --- RIGHT COLUMN --- */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            {/* Pill-Style Tabs */}
            <div className="flex justify-start mb-6">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1.5 shadow-inner">
                <TabsTrigger
                  value="personal"
                  className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Personal
                </TabsTrigger>
                <TabsTrigger
                  value="professional"
                  className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Professional
                </TabsTrigger>
                <TabsTrigger
                  value="salary"
                  className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Salary
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ✅ PERSONAL TAB - UPDATED UI */}
            <TabsContent value="personal" className="mt-6 space-y-6">
              {/* ✅ RESPONSIVE IDENTITY DOCUMENTS */}
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Identity Documents</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Official identification documents</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Aadhar Card */}
                    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-h-[100px]">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t-xl"></div>
                      
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 min-w-[40px] rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center flex-shrink-0">
                            <Fingerprint className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-0.5 line-clamp-1">
                              Aadhar Card
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono line-clamp-1">
                              {employee.aadhar_number || (
                                <span className="text-gray-400 dark:text-gray-500 italic font-sans">Not provided</span>
                              )}
                            </p>
                            {employee.aadhar_number && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Verified</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {employee.aadhar_url && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                              onClick={() => window.open(employee.aadhar_url, '_blank')}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <a href={`${employee.aadhar_url}?download=`} download>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PAN Card */}
                    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-h-[100px]">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl"></div>
                      
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 min-w-[40px] rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center flex-shrink-0">
                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-0.5 line-clamp-1">
                              PAN Card
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono uppercase line-clamp-1">
                              {employee.pan_number || (
                                <span className="text-gray-400 dark:text-gray-500 italic font-sans normal-case">Not provided</span>
                              )}
                            </p>
                            {employee.pan_number && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Verified</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {employee.pan_url && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              onClick={() => window.open(employee.pan_url, '_blank')}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <a href={`${employee.pan_url}?download=`} download>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ESIC */}
                    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-h-[100px]">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl"></div>
                      
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 min-w-[40px] rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-0.5 line-clamp-1">
                              ESIC
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono line-clamp-1">
                              {employee.esic_number || (
                                <span className="text-gray-400 dark:text-gray-500 italic font-sans">Not provided</span>
                              )}
                            </p>
                            {employee.esic_number && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Verified</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {employee.esic_url && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                              onClick={() => window.open(employee.esic_url, '_blank')}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <a href={`${employee.esic_url}?download=`} download>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 min-w-[28px] rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ✅ ADDRESSES */}
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Addresses</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Residential information</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Address */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40 flex items-center justify-center">
                          <Home className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">Current Address</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-[100px] text-sm text-gray-500 dark:text-gray-400 font-medium">Address</div>
                          <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 text-right break-words">
                            {employee.address?.address_line1 || <span className="text-gray-400 italic">Not provided</span>}
                          </div>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">City</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.city || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">State</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.state || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Postal Code</span>
                          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                            {employee.address?.zip_code || <span className="text-gray-400 italic font-sans">Not provided</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Permanent Address */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-800/40 flex items-center justify-center">
                          <Home className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100">Permanent Address</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-[100px] text-sm text-gray-500 dark:text-gray-400 font-medium">Address</div>
                          <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 text-right break-words">
                            {employee.permanent_address?.address_line1 || <span className="text-gray-400 italic">Not provided</span>}
                          </div>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">City</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.city || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">State</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.state || <span className="text-gray-400 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Postal Code</span>
                          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                            {employee.permanent_address?.zip_code || <span className="text-gray-400 italic font-sans">Not provided</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ✅ EDUCATION - RESPONSIVE */}
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Education</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Academic qualifications</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {['SSC', 'HSC/Diploma', 'Degree'].map((type, index) => {
                      const edu = employee.education?.find(e => e.type === type);
                      const fileName = edu?.document_url ? edu.document_url.split('/').pop().split('?')[0] : '';
                      
                      let iconBg = "bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40";
                      let iconColor = "text-purple-600 dark:text-purple-400";
                      let hoverBg = "hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400";
                      let borderGradient = "from-purple-500 to-purple-600";
                      let yearBadgeBg = "bg-purple-500";
                      
                      if (index === 1) {
                        iconBg = "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40";
                        iconColor = "text-blue-600 dark:text-blue-400";
                        hoverBg = "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400";
                        borderGradient = "from-blue-500 to-blue-600";
                        yearBadgeBg = "bg-blue-500";
                      } else if (index === 2) {
                        iconBg = "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40";
                        iconColor = "text-green-600 dark:text-green-400";
                        hoverBg = "hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400";
                        borderGradient = "from-green-500 to-green-600";
                        yearBadgeBg = "bg-green-500";
                      }

                      return (
                        <div 
                          key={type} 
                          className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 min-h-[110px]"
                        >
                          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${borderGradient} rounded-t-xl`}></div>
                          
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`h-10 w-10 min-w-[40px] rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                <BadgeCheck className={`h-5 w-5 ${iconColor}`} />
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-0.5 line-clamp-1">
                                  {type}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight mb-1.5">
                                  {edu?.institute || <span className="italic">Not provided</span>}
                                </p>
                                
                                {edu?.year_completed ? (
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${yearBadgeBg}`}>
                                    <CalendarDays className="h-2.5 w-2.5 text-white" />
                                    <span className="text-[10px] font-semibold text-white">
                                      {new Date(edu.year_completed).getFullYear()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">Year: N/A</span>
                                )}
                              </div>
                            </div>

                            {edu?.document_url && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 min-w-[28px] rounded-lg text-gray-600 dark:text-gray-400 ${hoverBg}`}
                                  onClick={() => window.open(edu.document_url, '_blank')}
                                  title="View"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <a href={`${edu.document_url}?download=`} download={fileName}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 min-w-[28px] rounded-lg text-gray-600 dark:text-gray-400 ${hoverBg}`}
                                    title="Download"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* ✅ BANK DETAILS - ENHANCED */}
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Bank Details</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payment information</p>
                  </div>

                  {employee.bankDetails ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-2xl shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <User className="h-4 w-4" />
                            Account Holder
                          </div>
                          <p className="text-base font-bold text-gray-800 dark:text-gray-100 pl-6">
                            {employee.bankDetails.account_holder_name}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <Building2 className="h-4 w-4" />
                            Bank Name
                          </div>
                          <p className="text-base font-bold text-gray-800 dark:text-gray-100 pl-6">
                            {employee.bankDetails.bank_name}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <CreditCard className="h-4 w-4" />
                            Account Number
                          </div>
                          <div className="flex items-center gap-3 pl-6">
                            <p className="text-base font-mono font-bold text-gray-800 dark:text-gray-100">
                              {showFullAccountNumber 
                                ? employee.bankDetails.account_number 
                                : `•••• •••• ${employee.bankDetails.account_number.slice(-4)}`
                              }
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setShowFullAccountNumber(!showFullAccountNumber)}
                            >
                              <Eye className={`h-4 w-4 transition-colors ${
                                showFullAccountNumber 
                                  ? 'text-purple-600 dark:text-purple-400' 
                                  : 'text-gray-400 dark:text-gray-500'
                              }`} />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <BadgeCheck className="h-4 w-4" />
                            IFSC Code
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <p className="text-base font-mono font-bold text-gray-800 dark:text-gray-100">
                              {employee.bankDetails.ifsc_code}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => copyToClipboard(employee.bankDetails.ifsc_code, 'IFSC Code')}
                            >
                              <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-purple-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                            <Home className="h-4 w-4" />
                            Branch Name
                          </div>
                          <p className="text-base font-bold text-gray-800 dark:text-gray-100 pl-6">
                            {employee.bankDetails.branch_name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="h-20 w-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <CreditCard className="h-10 w-10 text-gray-400 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center">
                        No bank details have been provided yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ✅ PROFESSIONAL TAB - ENHANCED */}
            <TabsContent value="professional" className="mt-6 space-y-6">
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Work Experience</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Professional background and employment history</p>
                  </div>

                  <div className="space-y-5">
                    {employee.experiences && employee.experiences.length > 0 ? (
                      employee.experiences.map((exp, index) => {
                        const documents = [
                          { label: 'Offer Letter', url: exp.offerLetter, icon: FileText },
                          { label: 'Separation Letter', url: exp.seperationLetter, icon: FileText },
                          { label: 'Hike Letter', url: exp.hikeLetter, icon: FileText },
                          { label: 'Payslip 1', url: exp.payslip1, icon: FileText },
                          { label: 'Payslip 2', url: exp.payslip2, icon: FileText },
                          { label: 'Payslip 3', url: exp.payslip3, icon: FileText },
                        ];
                        const availableDocuments = documents.filter(doc => doc.url);

                        const colorSchemes = [
                          {
                            gradient: 'from-purple-500 to-purple-600',
                            iconBg: 'from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40',
                            iconColor: 'text-purple-600 dark:text-purple-400',
                            badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
                            badgeText: 'text-purple-700 dark:text-purple-300',
                          },
                          {
                            gradient: 'from-blue-500 to-blue-600',
                            iconBg: 'from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40',
                            iconColor: 'text-blue-600 dark:text-blue-400',
                            badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
                            badgeText: 'text-blue-700 dark:text-blue-300',
                          },
                          {
                            gradient: 'from-green-500 to-green-600',
                            iconBg: 'from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40',
                            iconColor: 'text-green-600 dark:text-green-400',
                            badgeBg: 'bg-green-100 dark:bg-green-900/30',
                            badgeText: 'text-green-700 dark:text-green-300',
                          },
                        ];

                        const colorScheme = colorSchemes[index % colorSchemes.length];

                        return (
                          <div 
                            key={exp.id} 
                            className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                          >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorScheme.gradient}`}></div>

                            <div className="p-6">
                              <div className="flex items-start gap-4 mb-4">
                                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${colorScheme.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                  <Briefcase className={`h-7 w-7 ${colorScheme.iconColor}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">
                                    {exp.position}
                                  </h4>
                                  <p className="text-base text-purple-600 dark:text-purple-400 font-semibold mb-2">
                                    {exp.company}
                                  </p>
                                  
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                      <CalendarDays className="h-4 w-4" />
                                      <span>
                                        {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : (
                                          <span className={`font-semibold ${colorScheme.badgeText}`}>Present</span>
                                        )}
                                      </span>
                                    </div>
                                    
                                    {exp.location && (
                                      <div className="flex items-center gap-1.5">
                                        <Globe className="h-4 w-4" />
                                        <span>{exp.location}</span>
                                      </div>
                                    )}

                                    {exp.employment_type && (
                                      <div className={`px-3 py-1 rounded-full ${colorScheme.badgeBg}`}>
                                        <span className={`text-xs font-semibold ${colorScheme.badgeText}`}>
                                          {exp.employment_type}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {availableDocuments.length > 0 && (
                                <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Paperclip className={`h-4 w-4 ${colorScheme.iconColor}`} />
                                    <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                      Attached Documents ({availableDocuments.length})
                                    </h5>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {availableDocuments.map(doc => {
                                      const fileName = doc.url.split('/').pop().split('?')[0];
                                      return (
                                        <div 
                                          key={doc.label} 
                                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all group/doc"
                                        >
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorScheme.iconBg} flex items-center justify-center flex-shrink-0`}>
                                              <FileText className={`h-5 w-5 ${colorScheme.iconColor}`} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                {doc.label}
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {fileName}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-gray-600" 
                                              asChild
                                            >
                                              <a href={doc.url} target="_blank" rel="noopener noreferrer" title="View">
                                                <Eye className="h-4 w-4" />
                                              </a>
                                            </Button>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-gray-600" 
                                              asChild
                                            >
                                              <a href={`${doc.url}?download=`} download={fileName} title="Download">
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
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                          <Briefcase className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                        </div>
                        <p className="text-base font-medium text-gray-500 dark:text-gray-400 text-center">
                          No work experience available
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-1">
                          Employment history will appear here once added
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ✅ SALARY TAB - ENHANCED */}
            <TabsContent value="salary" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-lg border-none bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
                <CardContent className="p-6">
                  {currentSalaryRecord && currentSalaryRecord.earnings ? (
                    <>
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                        <div>
                          <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Salary Details</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(currentSalaryRecord.payment_date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            currentSalaryRecord.status === 'Success' || currentSalaryRecord.status === 'Paid'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                              : currentSalaryRecord.status === 'Pending' 
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${
                              currentSalaryRecord.status === 'Success' || currentSalaryRecord.status === 'Paid'
                                ? 'bg-green-500' 
                                : currentSalaryRecord.status === 'Pending' 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            }`}></div>
                            {currentSalaryRecord.status}
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-sm">
                            <IndianRupee className="h-3 w-3 text-white" />
                            <span className="text-sm font-bold text-white">
                              {formatCurrency(currentSalaryRecord.payment_amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                        {/* Earnings */}
                        <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                          
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100">Earnings</h5>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Basic Salary</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.earnings?.basic_salary || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">HRA</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.earnings?.house_rent_allowance || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Conveyance</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.earnings?.conveyance_allowance || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Fixed Allowance</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.earnings?.fixed_allowance || 0)}
                                </span>
                              </div>

                              <div className="pt-2 mt-2 border-t-2 border-green-200 dark:border-green-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Total</span>
                                  <span className="text-base font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(currentSalaryRecord.earnings?.total_earnings || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600"></div>
                          
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </div>
                              <h5 className="text-sm font-bold text-gray-800 dark:text-gray-100">Deductions</h5>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Provident Fund</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.deductions?.provident_fund || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Professional Tax</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.deductions?.professional_tax || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Income Tax</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.deductions?.income_tax || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Loan Deduction</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatCurrency(currentSalaryRecord.deductions?.loan_deduction || 0)}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Paid Days</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {currentSalaryRecord.deductions?.paid_days || 0}
                                </span>
                              </div>
                              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">LOP Days</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {currentSalaryRecord.deductions?.lop_days || 0}
                                </span>
                              </div>

                              <div className="pt-2 mt-2 border-t-2 border-red-200 dark:border-red-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Total</span>
                                  <span className="text-base font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(currentSalaryRecord.deductions?.total_deductions || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Net Salary Banner */}
                      <div className="relative bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Wallet className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-purple-100 font-medium">Net Salary (Take Home)</p>
                                <p className="text-xl font-bold text-white">
                                  {formatCurrency(currentSalaryRecord.payment_amount)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-white text-sm">
                              <div>
                                <p className="text-xs text-purple-100">Gross</p>
                                <p className="font-bold">
                                  {formatCurrency(currentSalaryRecord.earnings?.total_earnings || 0)}
                                </p>
                              </div>
                              <div className="h-8 w-px bg-white/30"></div>
                              <div>
                                <p className="text-xs text-purple-100">Deductions</p>
                                <p className="font-bold">
                                  {formatCurrency(currentSalaryRecord.deductions?.total_deductions || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                      <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <IndianRupee className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                        No salary information available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ✅ SALARY DOCUMENTS */}
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Salary Documents</h3>

                  <div className="space-y-6">
                    {['Offer Letter', 'Increase/Hike Letter', 'Separation Letter'].map((docType) => {
                      const uploadedDoc = getUploadedDocument(docType);

                      return (
                        <div key={docType} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">{docType}</h4>

                          {uploadedDoc ? (
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#7731E8] border-[#7731E8] hover:bg-purple-50 rounded-full px-4"
                                  onClick={() => handleViewDocument(uploadedDoc.document_url)}
                                >
                                  <Eye className="h-4 w-4 mr-1" /> View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#7731E8] border-[#7731E8] hover:bg-purple-50 rounded-full px-4"
                                  asChild
                                >
                                  <a href={`${uploadedDoc.document_url}?download=`} download={uploadedDoc.document_name}>
                                    <Download className="h-4 w-4 mr-1" /> Download
                                  </a>
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No document uploaded</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Payslips */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Payslips</h4>

                      {getUploadedPayslips().length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
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
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                              {getUploadedPayslips().map((payslip) => (
                                <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    Payslip
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    {payslip.month}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                    {payslip.year}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-[#7731E8] hover:text-[#6220C7] p-0"
                                      onClick={() => handleViewDocument(payslip.document_url)}
                                    >
                                      <Eye className="h-4 w-4 mr-1" /> View
                                    </Button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-[#7731E8] hover:text-[#6220C7] p-0"
                                      asChild
                                    >
                                      <a href={`${payslip.document_url}?download=`} download={payslip.document_name}>
                                        <Download className="h-4 w-4 mr-1" /> Download
                                      </a>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No payslips uploaded</p>
                      )}
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
 
export default ProfilePageEmployee;