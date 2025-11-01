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
  MessageCircle
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// --- INTERFACES REMAIN UNCHANGED ---

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
 
interface EmployeeDetail {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
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
    type_of_hire?: string;
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
    emergencyContacts?: Array<{ id: string; name: string; relationship: string; phone: string; }>;
    experiences?: Array<{ id: string; company: string; position: string; location?: string; start_date?: string; end_date?: string; employment_type?: string; offerLetter?: string; hikeLetter?: string; seperationLetter?: string; payslip1?: string; payslip2?: string; payslip3?: string; }>;
    education?: Array<{ id: string; type: string; institute?: string; year_completed?: string; document_url?: string; }>;
    bankDetails?: { account_holder_name: string; account_number: string; bank_name: string; branch_name: string; ifsc_code: string; branch_address?: string; city?: string; };
    latestPaymentRecord?: PaymentRecord;
    appraisalHistory?: AppraisalRecord[];
}


const ProfilePageEmployee = () => {
 
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id;
  
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // --- REMOVED `showSalaryDetails` state ---
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  // --- HELPER FUNCTIONS (Unchanged) ---
 
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
  
  // --- Component to display salary details (retained from previous step) ---
  const SalaryDetailsDisplay = ({ record }: { record: PaymentRecord }) => {
    const earnings = record.earnings || {};
    const deductions = record.deductions || {};

    return (
        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {/* Earnings */}
                <div>
                    <h5 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">Earnings</h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between items-center"><span>Basic Salary</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(earnings.basic_salary)}</span></div>
                        <div className="flex justify-between items-center"><span>House Rent Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(earnings.house_rent_allowance)}</span></div>
                        <div className="flex justify-between items-center"><span>Conveyance Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(earnings.conveyance_allowance)}</span></div>
                        <div className="flex justify-between items-center"><span>Fixed Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(earnings.fixed_allowance)}</span></div>
                        <div className="border-t dark:border-gray-600 pt-2 mt-2 flex justify-between items-center font-bold"><span className="text-gray-800 dark:text-gray-200">Total Earnings</span><span className="text-gray-800 dark:text-gray-200">{formatCurrency(earnings.total_earnings)}</span></div>
                    </div>
                </div>
                {/* Deductions */}
                <div>
                    <h5 className="font-semibold mb-3 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-600">Deductions</h5>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between items-center"><span>Provident Fund</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(deductions.provident_fund)}</span></div>
                        <div className="flex justify-between items-center"><span>Professional Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(deductions.professional_tax)}</span></div>
                        <div className="flex justify-between items-center"><span>Income Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(deductions.income_tax)}</span></div>
                        <div className="flex justify-between items-center"><span>Loan Deduction</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(deductions.loan_deduction)}</span></div>
                        <div className="flex justify-between items-center"><span>Paid Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{deductions.paid_days || 30}</span></div>
                        <div className="flex justify-between items-center"><span>LOP Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{deductions.lop_days || 0}</span></div>
                        <div className="border-t dark:border-gray-600 pt-2 mt-2 flex justify-between items-center font-bold"><span className="text-gray-800 dark:text-gray-200">Total Deductions</span><span className="text-gray-800 dark:text-gray-200">{formatCurrency(deductions.total_deductions)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
  };
 
  // --- MODIFIED to remove the button ---
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
        {/* Button is removed from here */}
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
      </div>
    </div>
  );
 
   // All data fetching logic remains the same.
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
     
      const { data: employeeData, error: employeeError } = await supabase.from('hr_employees').select('*, hr_departments(name), hr_designations(name)').eq('id', employeeId).single();
      if (employeeError) throw employeeError;
     
      const { data: contactsData } = await supabase.from('hr_employee_emergency_contacts').select('*').eq('employee_id', employeeId);
      const { data: addressData } = await supabase.from('hr_employee_addresses').select('*').eq('employee_id', employeeId).eq('type', 'present').maybeSingle();
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
     
      const mappedExperiences = experiencesData ? experiencesData.map(exp => ({
        id: exp.id, company: exp.company, position: exp.job_title, location: exp.location, start_date: exp.start_date, end_date: exp.end_date, employment_type: exp.employment_type, offerLetter: exp.offer_letter_url, seperationLetter: exp.separation_letter_url, hikeLetter: exp.hike_letter_url, payslip1: exp.payslip_1_url, payslip2: exp.payslip_2_url, payslip3: exp.payslip_3_url,
      })) : [];
     
      const mappedEducation = educationData ? educationData.map(edu => ({
        id: edu.id, type: edu.type, institute: edu.institute, year_completed: edu.year_completed, document_url: edu.document_url,
      })) : [];
 
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
        appraisalHistory: enrichedAppraisalHistory,
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
 
  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Loading employee details...</div>;
  }
 
  if (!employee) {
    return <div className="flex items-center justify-center h-screen text-gray-600 dark:text-gray-400">Employee not found</div>;
  }
 
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
 
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-1 space-y-8">
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
                  {/* Basic Info Items */}
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
          <Tabs defaultValue="salary" className="w-full">
            <TabsList className="bg-transparent p-0 border-b border-gray-200 dark:border-gray-700 justify-start">
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="job">Professional Information</TabsTrigger>
              <TabsTrigger value="salary">Salary Information</TabsTrigger>
            </TabsList>
 
            <TabsContent value="personal" className="mt-6 space-y-8">{/* ... */}</TabsContent>
            <TabsContent value="job" className="mt-6 space-y-8">{/* ... */}</TabsContent>
 
            {/* --- MODIFIED Salary Information Tab --- */}
            <TabsContent value="salary" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">Salary Information</h3>
                  
                  {/* Current Salary Section */}
                  {employee.latestPaymentRecord ? (
                    <div>
                      {renderCurrentSalarySummary(employee.latestPaymentRecord)}
                      {/* Details are now always displayed below the summary */}
                      <SalaryDetailsDisplay record={employee.latestPaymentRecord} />
                    </div>
                  ) : (
                    <p className="py-4 text-sm text-gray-500">No current salary information available.</p>
                  )}

                  {/* Appraisal History Section */}
                  {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (
                    <div className="mt-6">
                      <h4 className="font-bold text-lg mb-4 pt-4 border-t dark:border-gray-700">Appraisal History</h4>
                      {employee.appraisalHistory.map((record) => (
                        <div key={record.id} className="mb-2">
                          {renderAppraisalSummary(record)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 mt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-500">No appraisal history available.</p>
                    </div>
                  )}
                </CardContent> 
              </Card>
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Bank Details</h3>
                  {employee.bankDetails ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm"><div><h4 className="text-gray-500 mb-1">Account Holder</h4><p className="font-medium">{employee.bankDetails.account_holder_name}</p></div><div><h4 className="text-gray-500 mb-1">Bank Name</h4><p className="font-medium">{employee.bankDetails.bank_name}</p></div><div><h4 className="text-gray-500 mb-1">Account Number</h4><div className="flex items-center"><p className="font-medium mr-2">{showFullAccountNumber ? employee.bankDetails.account_number : `**** **** ${employee.bankDetails.account_number.slice(-4)}`}</p><span onClick={() => setShowFullAccountNumber(!showFullAccountNumber)} className="text-purple-600 cursor-pointer hover:underline text-xs">View</span></div></div><div><h4 className="text-gray-500 mb-1">IFSC Code</h4><p className="font-medium">{employee.bankDetails.ifsc_code}</p></div><div><h4 className="text-gray-500 mb-1">Branch</h4><p className="font-medium">{employee.bankDetails.branch_name}</p></div><div><h4 className="text-gray-500 mb-1">City</h4><p className="font-medium">{employee.bankDetails.city || 'N/A'}</p></div></div>) : (<p className="text-sm text-gray-500 dark:text-gray-400">No bank details available.</p>)}
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