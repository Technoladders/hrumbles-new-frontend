import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
// --- ADD THIS IMPORT ---
import PayslipViewer from '@/components/financial/PayslipViewer';
import { toast } from "sonner";
// This is CORRECT
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Mail, Phone, Globe, User, Copy, Briefcase, Linkedin, Dribbble,
  MessageSquare, GraduationCap, ShieldCheck, Eye, Download, UserCircle,
  Users, ShieldAlert, Clock, Pencil, Home, FileText, Fingerprint, CreditCard,  Building2,    // For Department
  BadgeCheck,   // For Designation
  Cog,          // For Hard Skill
  MessageCircle // For Soft Skill
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
 
 
 
// --- ADD THIS NEW INTERFACE ---
 
interface PayslipData {
  employeeId: string;
  employeeName: string;
  designation: string;
  payPeriod: string;
  payDate: string;
  dateOfJoining: string | null;
  paidDays: number;
  lopDays: number;
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  specialAllowance: number; // Mapped from fixed_allowance
  totalEarnings: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  loanDeduction: number;
  customDeductions: { name: string; amount: number }[];
  totalDeductions: number;
  netPayable: number;
}
 
// --- ADD THESE NEW INTERFACES ---
 
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
  type_of_hire?: string; // <--- ADD THIS LINE
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
  };
 
   latestPaymentRecord?: PaymentRecord;
  appraisalHistory?: AppraisalRecord[];
}
 
 
const ProfilePageEmployee = () => {
 
   const aboutMe = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
  const skills = ["User Research", "Prototyping", "Figma", "Adobe Nocsale"];
  const certifications = [
    "Google UX Design Professional Certificate",
    "Certified ScrumMaster, CSM",
  ];
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id;
  console.log("id", userId);
 
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
 
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  // const [activeTab, setActiveTab] = useState("personal");
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);
 
 
    // --- ADD THESE HELPER FUNCTIONS ---
 
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  };
 
  const isNewAppraisal = (record: AppraisalRecord) => {
    const createdAt = new Date(record.created_at).getTime();
    const updatedAt = new Date(record.updated_at).getTime();
    const isUpdatedByDrawer = record.last_updated_by === 'EmployeesPayrollDrawer';
    return updatedAt > createdAt && isUpdatedByDrawer;
  };
 
 
   // --- REPLACE your old handleViewPayslip function with this complete version ---
 
  const handleViewPayslip = (record: PaymentRecord) => {
    if (!employee) return;
 
    // This function now includes ALL fields the PayslipViewer needs, including grossEarnings
    const payslipData: PayslipData = {
      employeeId: employee.employee_id,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      designation: employee.designation_name || 'N/A',
      payPeriod: new Date(record.payment_date).toLocaleString('default', { month: 'long', year: 'numeric' }),
      payDate: formatDate(record.payment_date),
      dateOfJoining: employee.joining_date ? formatDate(employee.joining_date) : null,
     
      // Data from the record
      paidDays: record.deductions?.paid_days || 30,
      lopDays: record.deductions?.lop_days || 0,
     
      // Earnings
      basicSalary: record.earnings?.basic_salary || 0,
      houseRentAllowance: record.earnings?.house_rent_allowance || 0,
      conveyanceAllowance: record.earnings?.conveyance_allowance || 0,
      specialAllowance: record.earnings?.fixed_allowance || 0, // Mapped from fixed_allowance
      totalEarnings: record.earnings?.total_earnings || 0,
      grossEarnings: record.earnings?.total_earnings || 0, // CRUCIAL: Add this field for the viewer
     
      // Deductions
      providentFund: record.deductions?.provident_fund || 0,
      professionalTax: record.deductions?.professional_tax || 0,
      incomeTax: record.deductions?.income_tax || 0,
      loanDeduction: record.deductions?.loan_deduction || 0,
      customDeductions: record.customDeductions?.map(d => ({ name: d.name, amount: d.amount })) || [],
      totalDeductions: record.deductions?.total_deductions || 0,
     
      // Final Pay
      netPayable: record.payment_amount,
    };
 
    setSelectedPayslip(payslipData);
    setIsPayslipOpen(true);
  };
   const renderCurrentSalarySummary = (record: PaymentRecord) => (
    <div className="flex items-center justify-between py-4 border-b dark:border-gray-700">
      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
        Current Salary - {formatDate(record.payment_date)}
      </h4>
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <span className="text-gray-500 mr-2">Status:</span>
          <span className={`w-2 h-2 rounded-full mr-2 ${record.status === 'Paid' || record.status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span className="font-medium">{record.status}</span>
        </div>
        <div>
          <span className="text-gray-500 mr-2">Net Pay:</span>
          <span className="font-medium text-green-600">{formatCurrency(record.payment_amount)}</span>
        </div>
        <Button variant="outline" onClick={() => handleViewPayslip(record)}>View Info</Button>
      </div>
    </div>
  );
 
 
  const renderAppraisalSummary = (record: AppraisalRecord) => (
    <div className="flex items-center justify-between py-4 border-b dark:border-gray-700">
      <div className="flex items-center">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
          Appraisal - {formatDate(record.appraisal_date)}
        </h4>
        {isNewAppraisal(record) && <Badge variant="secondary" className="ml-2">New</Badge>}
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center">
          <span className="text-gray-500 mr-2">Status:</span>
          <span className={`w-2 h-2 rounded-full mr-2 ${record.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="font-medium">{record.status}</span>
        </div>
        <div>
          <span className="text-gray-500 mr-2">Previous Pay:</span>
          <span className="font-medium">{formatCurrency(record.previous_payment_amount)}</span>
        </div>
        <div>
          <span className="text-gray-500 mr-2">New Pay:</span>
          <span className="font-medium text-green-600">{formatCurrency(record.new_payment_amount)}</span>
        </div>
        {record.paymentRecord && <Button variant="outline" onClick={() => handleViewPayslip(record.paymentRecord!)}>View Info</Button>}
      </div>
    </div>
  );
 
  useEffect(() => {
    if (userId) {
      fetchEmployeeDetails(userId); // Pass only the UUID
    }
  }, [userId]);
 
 
 
    // --- ADD THIS NEW HELPER FUNCTION ---
 
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
 
      // REPLACE THE OLD FUNCTION WITH THIS NEW VERSION
 
  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);
     
      // Fetch employee basic details
      const { data: employeeData, error: employeeError } = await supabase.from('hr_employees').select('*, hr_departments(name), hr_designations(name)').eq('id', employeeId).single();
      if (employeeError) throw employeeError;
     
      // Fetch other related data (no changes here)
      const { data: contactsData } = await supabase.from('hr_employee_emergency_contacts').select('*').eq('employee_id', employeeId);
      const { data: addressData } = await supabase.from('hr_employee_addresses').select('*').eq('employee_id', employeeId).eq('type', 'present').maybeSingle();
      const { data: educationData } = await supabase.from('hr_employee_education').select('*').eq('employee_id', employeeId);
      const { data: experiencesData } = await supabase.from('hr_employee_experiences').select('*').eq('employee_id', employeeId);
      const { data: bankData } = await supabase.from('hr_employee_bank_details').select('*').eq('employee_id', employeeId).maybeSingle();
 
      // --- START: UPDATED SALARY & APPRAISAL FETCHING ---
 
      // 1. Fetch the LATEST payment record's base info
      const { data: latestPaymentRecordData, error: paymentError } = await supabase
        .from('payment_records')
        .select('*')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (paymentError) throw paymentError;
 
      let latestPaymentRecord: PaymentRecord | undefined;
      if (latestPaymentRecordData && latestPaymentRecordData.length > 0) {
        // Use our helper to get the full financial details
        latestPaymentRecord = await getFullPaymentRecordDetails(latestPaymentRecordData[0]);
      }
 
      // 2. Fetch APPRAISAL history with their base payment records
      const { data: appraisalRecordsData, error: appraisalError } = await supabase
        .from('appraisal_records')
        .select('*, paymentRecord:payment_records(*)')
        .eq('employee_id', employeeData.employee_id)
        .order('created_at', { ascending: false });
      if (appraisalError) throw appraisalError;
 
      // 3. ENRICH each appraisal record with its full payment details using the helper
      const enrichedAppraisalHistory = appraisalRecordsData ? await Promise.all(
        appraisalRecordsData.map(async (appraisal) => {
          if (appraisal.paymentRecord) {
            const fullPaymentDetails = await getFullPaymentRecordDetails(appraisal.paymentRecord);
            return { ...appraisal, paymentRecord: fullPaymentDetails };
          }
          return appraisal;
        })
      ) : [];
     
      // --- END: UPDATED SALARY & APPRAISAL FETCHING ---
 
      // Map experiences data
      const mappedExperiences = experiencesData ? experiencesData.map(exp => ({
        id: exp.id, company: exp.company, position: exp.job_title, location: exp.location, start_date: exp.start_date, end_date: exp.end_date, employment_type: exp.employment_type, offerLetter: exp.offer_letter_url, seperationLetter: exp.separation_letter_url, hikeLetter: exp.hike_letter_url, payslip1: exp.payslip_1_url, payslip2: exp.payslip_2_url, payslip3: exp.payslip_3_url,
      })) : [];
     
      // Map education data
      const mappedEducation = educationData ? educationData.map(edu => ({
        id: edu.id, type: edu.type, institute: edu.institute, year_completed: edu.year_completed, document_url: edu.document_url,
      })) : [];
 
      // Combine all data
      const completeEmployeeData: EmployeeDetail = {
        ...employeeData,
        department_name: employeeData?.hr_departments?.name || 'N/A',
        designation_name: employeeData?.hr_designations?.name || 'N/A',
        emergencyContacts: contactsData || [],
        address: addressData || {},
        experiences: mappedExperiences,
        education: mappedEducation,
        bankDetails: bankData || undefined,
        latestPaymentRecord,
        appraisalHistory: enrichedAppraisalHistory, // Use the new enriched data
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
 
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
 
  const generateActivityTimeline = () => {
    const activities: { date: string; description: string; icon: JSX.Element }[] = [];
 
    // Profile creation
    activities.push({
      date: employee?.created_at || new Date().toISOString(),
      description: `Profile created for ${employee?.first_name} ${employee?.last_name}`,
      icon: <User className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
    });
 
    // Education completion dates
    employee?.education?.forEach((edu) => {
      if (edu.year_completed) {
        activities.push({
          date: edu.year_completed,
          description: `${edu.type} completed at ${edu.institute || 'Unknown Institute'}`,
          icon: <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400" />,
        });
      }
    });
 
    // Experience dates
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
 
    // Sort activities by date (most recent first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
 
    return activities;
  };
 
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };
 
 
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
                   <div className="flex items-start gap-4 pt-2 border-t dark:border-gray-700">
                    <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Department</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.department_name || 'Not provided'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-4">
                    <BadgeCheck className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Designation</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{employee.designation_name || 'Not provided'}</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-4">
                    <Cog className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Hard Skill</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">Technical</p> {/* Placeholder */}
                    </div>
                  </div>
                   <div className="flex items-start gap-4">
                    <MessageCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Soft Skill</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">Communication</p> {/* Placeholder */}
                    </div>
                  </div>
                  <div className="flex items-center gap-4"><ShieldAlert className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className={`font-semibold rounded-full px-2 py-1 text-xs flex items-center gap-2 ${employee.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <span className={`w-2 h-2 rounded-full ${employee.employment_status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {employee.employment_status || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4"><Clock className="h-5 w-5 text-gray-400" /><div><p className="font-medium text-gray-800 dark:text-gray-200">{employee.type_of_hire || "Not provided"}</p></div></div>
                </div>
              </div>
            </CardContent>
          </Card>
 
          {/* Activity Timeline Card */}
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
 
        {/* --- RIGHT COLUMN: Tabbed Content Area --- */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 justify-start">
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="job">Professional Information</TabsTrigger>
              <TabsTrigger value="salary">Salary Information</TabsTrigger>
             
            </TabsList>
 
            {/* --- Personal Information Tab --- */}
            <TabsContent value="personal" className="mt-6 space-y-8">
 
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Identity Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><Fingerprint className="h-6 w-6 text-purple-600 flex-shrink-0"/><div><h4 className="font-semibold text-sm">Aadhar Card</h4><p className="text-xs text-gray-500">Number: {employee.aadhar_number || 'Not provided'}</p></div></div>{employee.aadhar_url && (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.aadhar_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div></div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><CreditCard className="h-6 w-6 text-purple-600 flex-shrink-0"/><div><h4 className="font-semibold text-sm">PAN Card</h4><p className="text-xs text-gray-500">Number: {employee.pan_number || 'Not provided'}</p></div></div>{employee.pan_url && (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.pan_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.pan_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div></div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><CreditCard className="h-6 w-6 text-purple-600 flex-shrink-0"/><div><h4 className="font-semibold text-sm">ESIC</h4><p className="text-xs text-gray-500">Number: {employee.esic_number || 'Not provided'}</p></div></div>{employee.esic_url && (<div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.esic_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4"/></a></Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={employee.esic_url} download><Download className="h-4 w-4"/></a></Button></div>)}</div></div>
                  </div>
                </CardContent>
              </Card>
 
              {/* Addresses Card */}
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Addresses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Current Address</h4>
                        {employee.address?.address_line1 && (<Copy className="h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-500" onClick={() => copyToClipboard(`${employee.address.address_line1}, ${employee.address.city}, ${employee.address.zip_code}`,'Current Address')}/>)}
                      </div>
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm">
                        <span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span>
                        <span className="text-gray-500">Address (cont.)</span><span className="font-medium text-right">-</span>
                        <span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span>
                        <span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-600 dark:text-gray-400 text-sm">Home Address</h4>
                        {employee.address?.address_line1 && (<Copy className="h-4 w-4 text-gray-400 cursor-pointer hover:text-purple-500" onClick={() => copyToClipboard(`${employee.address.address_line1}, ${employee.address.city}, ${employee.address.zip_code}`,'Home Address')}/>)}
                      </div>
                      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-sm">
                        <span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span>
                        <span className="text-gray-500">Address (cont.)</span><span className="font-medium text-right">-</span>
                        <span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span>
                        <span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span>
                      </div>
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
           
            {/* --- Job Information Tab --- */}
            <TabsContent value="job" className="mt-6 space-y-8">
              {/* Professional Information & Work Experience Card */}
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Professional Information</h3>
                 
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
 
      {/* --- ADD THIS DIALOG FOR THE PAYSLIP VIEWER --- */}
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
 
export default ProfilePageEmployee;