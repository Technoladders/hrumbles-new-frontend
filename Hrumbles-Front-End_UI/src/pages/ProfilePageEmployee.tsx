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
  MessageCircle, CalendarDays, Heart, Droplet, CalendarPlus, IndianRupee, Timer, Hourglass, ClipboardList
} from "lucide-react";
import { useSelector } from "react-redux";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

// --- UPDATED INTERFACES ---

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
}


const ProfilePageEmployee = () => {
 
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id;
  
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  // --- HELPER FUNCTIONS (Updated) ---
 
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
  
  // All data fetching logic updated to match EmployeeProfile.
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

  // Compute current salary record using latest appraisal if available
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
 
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-2xl shadow-lg border-none relative">
            <div className="absolute top-4 right-4">
              <Button onClick={() => navigate(`/employee/${userId}`)} variant="outline" size="icon" className="bg-gray-100 dark:bg-gray-700 rounded-full h-8 w-8 hover:bg-gray-200">
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
            {/* --- Pill-Style Tabs --- */}
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

            {/* --- Personal Information Tab --- */}
            <TabsContent value="personal" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-md border-none bg-white dark:bg-gray-800">
                <CardContent className="p-8">
                  <h3 className="font-bold text-xl mb-6 text-gray-800 dark:text-gray-200">Identity Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Aadhar Card */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-8 w-8 text-purple-600 flex-shrink-0"/>
                        <div>
                          <h4 className="font-semibold">Aadhar Card</h4>
                          <p className="text-sm text-gray-500">{employee.aadhar_number || 'Not provided'}</p>
                        </div>
                      </div>
                      {employee.aadhar_url && (
                        <div className="flex items-center gap-1 mt-3">
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-2"/>View
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                            <a href={`${employee.aadhar_url}?download=`} download>
                              <Download className="h-4 w-4 mr-2"/>Download
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* PAN Card */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                       <div className="flex items-center gap-3">
                         <CreditCard className="h-8 w-8 text-purple-600 flex-shrink-0"/>
                         <div>
                           <h4 className="font-semibold">PAN Card</h4>
                           <p className="text-sm text-gray-500">{employee.pan_number || 'Not provided'}</p>
                         </div>
                       </div>
                       {employee.pan_url && (
                         <div className="flex items-center gap-1 mt-3">
                           <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                             <a href={employee.pan_url} target="_blank" rel="noopener noreferrer">
                               <Eye className="h-4 w-4 mr-2"/>View
                             </a>
                           </Button>
                           <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                             <a href={`${employee.pan_url}?download=`} download>
                               <Download className="h-4 w-4 mr-2"/>Download
                             </a>
                           </Button>
                         </div>
                       )}
                    </div>
                    {/* ESIC Card */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col justify-between">
                       <div className="flex items-center gap-3">
                         <Briefcase className="h-8 w-8 text-purple-600 flex-shrink-0"/>
                         <div>
                           <h4 className="font-semibold">ESIC</h4>
                           <p className="text-sm text-gray-500">{employee.esic_number || 'Not provided'}</p>
                         </div>
                       </div>
                       {employee.esic_url && (
                         <div className="flex items-center gap-1 mt-3">
                           <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                             <a href={employee.esic_url} target="_blank" rel="noopener noreferrer">
                               <Eye className="h-4 w-4 mr-2"/>View
                             </a>
                           </Button>
                           <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                             <a href={`${employee.esic_url}?download=`} download>
                               <Download className="h-4 w-4 mr-2"/>Download
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
                    {/* Current Address */}
                    <div>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Current Address</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-gray-500">Address</span><span className="font-medium text-right">{employee.address?.address_line1 || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">City</span><span className="font-medium text-right">{employee.address?.city || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">State</span><span className="font-medium text-right">{employee.address?.state || 'Not provided'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500">Postal Code</span><span className="font-medium text-right">{employee.address?.zip_code || 'Not provided'}</span></div>
                      </div>
                    </div>
                    {/* Permanent Address */}
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
                                  <Eye className="h-4 w-4 mr-2"/>View
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={`${edu.document_url}?download=`}
                                  download={fileName}
                                >
                                  <Download className="h-4 w-4 mr-2"/>Download
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
                  {employee.bankDetails ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm"><div><h4 className="text-gray-500 mb-1">Account Holder</h4><p className="font-medium">{employee.bankDetails.account_holder_name}</p></div><div><h4 className="text-gray-500 mb-1">Bank Name</h4><p className="font-medium">{employee.bankDetails.bank_name}</p></div><div><h4 className="text-gray-500 mb-1">Account Number</h4><div className="flex items-center"><p className="font-medium mr-2">{showFullAccountNumber ? employee.bankDetails.account_number : `**** **** ${employee.bankDetails.account_number.slice(-4)}`}</p><span onClick={() => setShowFullAccountNumber(!showFullAccountNumber)} className="text-purple-600 cursor-pointer hover:underline text-xs">View</span></div></div><div><h4 className="text-gray-500 mb-1">IFSC Code</h4><p className="font-medium">{employee.bankDetails.ifsc_code}</p></div><div><h4 className="text-gray-500 mb-1">Branch</h4><p className="font-medium">{employee.bankDetails.branch_name}</p></div><div><h4 className="text-gray-500 mb-1">City</h4><p className="font-medium">{employee.bankDetails.city || 'N/A'}</p></div></div>) : (<p className="text-sm text-gray-500 dark:text-gray-400">No bank details available.</p>)}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Professional Information Tab --- */}
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

            {/* --- Salary Information Tab --- */}
            <TabsContent value="salary" className="mt-6 space-y-8">
              <Card className="rounded-2xl shadow-lg border-none">
                <CardContent className="p-8">
                  {currentSalaryRecord && currentSalaryRecord.earnings ? (
                    <>
                      {/* --- Header Section --- */}
                      <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
                        <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">
                          Salary Details - {formatDate(currentSalaryRecord.payment_date)}
                        </h3>
                        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Status:</span>
                            <span
                              className={`w-2 h-2 rounded-full mr-2 ${
                                currentSalaryRecord.status === 'Paid' || currentSalaryRecord.status === 'Success' ? 'bg-green-500' : 'bg-yellow-500'
                              }`}
                            ></span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.status}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Net Pay:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(currentSalaryRecord.payment_amount)}</span>
                          </div>
                        </div>
                      </div>
                      {/* --- Detailed Breakdown Grid --- */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Earnings */}
                        <div>
                          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Earnings</h5>
                          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Basic Salary</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings.basic_salary)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">House Rent Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings.house_rent_allowance)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Conveyance Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings.conveyance_allowance)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Fixed Allowance</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings.fixed_allowance)}</span></div>
                            <div className="border-t pt-2 mt-2 flex justify-between"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Earnings</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.earnings.total_earnings)}</span></div>
                          </div>
                        </div>
                        {/* Deductions */}
                        <div>
                          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Deductions</h5>
                          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.provident_fund)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Professional Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.professional_tax)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Income Tax</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.income_tax)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Loan Deduction</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.loan_deduction)}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">Paid Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.deductions?.paid_days || 30}</span></div>
                            <div className="flex justify-between"><span className="text-sm text-gray-600 dark:text-gray-400">LOP Days</span><span className="font-medium text-gray-800 dark:text-gray-200">{currentSalaryRecord.deductions?.lop_days || 0}</span></div>
                            <div className="border-t pt-2 mt-2 flex justify-between"><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span><span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(currentSalaryRecord.deductions?.total_deductions)}</span></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-center text-gray-500 py-4">
                      No salary information available.
                    </p>
                  )}

                  {/* Appraisal History Section */}
                  {/* {employee.appraisalHistory && employee.appraisalHistory.length > 0 ? (
                    <div className="mt-6">
                      <h4 className="font-bold text-lg mb-4 pt-4 border-t dark:border-gray-700">Appraisal History</h4>
                      {employee.appraisalHistory.map((record) => (
                        <div key={record.id} className="mb-4 border-b pb-4">
                          <div className="flex items-center justify-between">
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
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-4 mt-4 border-t dark:border-gray-700">
                      <p className="text-sm text-gray-500">No appraisal history available.</p>
                    </div>
                  )} */}
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