import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Mail, Phone, Globe, User, Activity, Clock, FileText, Home, Eye, Download, Copy, Briefcase } from "lucide-react";
import { useSelector } from "react-redux";

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
}

const ProfilePageEmployee = () => {
  const user = useSelector((state: any) => state.auth.user);
  const userId = user?.id;
  console.log("id", userId);
 
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [showFullAccountNumber, setShowFullAccountNumber] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchEmployeeDetails(userId); // Pass only the UUID
    }
  }, [userId]);

  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      setLoading(true);
      
      // Fetch employee basic details
      const { data: employeeData, error: employeeError } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name), hr_designations(name)')
        .eq('id', employeeId)
        .single();
      
      if (employeeError) throw employeeError;
      
      // Fetch emergency contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('hr_employee_emergency_contacts')
        .select('*')
        .eq('employee_id', employeeId);
      
      if (contactsError) throw contactsError;
      
      // Fetch address
      const { data: addressData, error: addressError } = await supabase
        .from('hr_employee_addresses')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('type', 'present')
        .maybeSingle();
      
      // Fetch education
      const { data: educationData, error: educationError } = await supabase
        .from('hr_employee_education')
        .select('*')
        .eq('employee_id', employeeId);
        
      if (educationError) throw educationError;
      
      // Fetch work experiences
      const { data: experiencesData, error: experiencesError } = await supabase
        .from('hr_employee_experiences')
        .select('*')
        .eq('employee_id', employeeId);
      
      if (experiencesError) throw experiencesError;
      
      // Fetch bank details
      const { data: bankData, error: bankError } = await supabase
        .from('hr_employee_bank_details')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      // Map experiences data to match the interface
      const mappedExperiences = experiencesData ? experiencesData.map(exp => ({
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
      })) : [];
      
      // Map education data
      const mappedEducation = educationData ? educationData.map(edu => ({
        id: edu.id,
        type: edu.type,
        institute: edu.institute,
        year_completed: edu.year_completed,
        document_url: edu.document_url,
      })) : [];

      // Extract department and designation names
      const departmentName = employeeData?.hr_departments?.name || 'N/A';
      const designationName = employeeData?.hr_designations?.name || 'N/A';
      
      // Combine all data
      const completeEmployeeData: EmployeeDetail = {
        ...employeeData,
        department_name: departmentName,
        designation_name: designationName,
        emergencyContacts: contactsData || [],
        address: addressData || {},
        experiences: mappedExperiences,
        education: mappedEducation,
        bankDetails: bankData || undefined,
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
    <div className="container mx-auto py-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/profile')} className="mr-2 text-gray-600 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400">
          Profile
        </Button>
        <span className="text-gray-400 dark:text-gray-500 mx-2">/</span>
        <span className="text-gray-600 dark:text-gray-300">My Profile</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
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
                  {employee.position || "No Position"}
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
                            employee.employment_status === 'Active' ? 'bg-green-500' : 'bg-red-500'
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

        {/* Right Column - Tabs & Content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="personal" onValueChange={setActiveTab}>
            <div className="mb-6 flex justify-between items-center w-full">
              <TabsList className="flex space-x-2">
                <TabsTrigger value="personal" className="rounded-full">Personal Details</TabsTrigger>
                <TabsTrigger value="professional" className="rounded-full">Professional Info</TabsTrigger>
                <TabsTrigger value="bank" className="rounded-full">Bank Details</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-full">Activity</TabsTrigger>
              </TabsList>
              <Button
                onClick={() => navigate(`/employee/${userId}`)}
                className="bg-purple-500 hover:bg-purple-600 text-white rounded-full"
              >
                Edit Profile
              </Button>
            </div>

            {/* Personal Details Tab */}
            <TabsContent value="personal" className="space-y-6">
              {/* Home Address and Current Address */}
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Home className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Addresses</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Address */}
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
                          <div className="font-medium text-gray-800 dark:text-gray-200">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.city || "Not provided"}
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
                                  `${employee.address?.address_line1 || ""} ${employee.address?.city || ""}, ${employee.address?.zip_code || ""}`,
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

                    {/* Home Address (using permanent_address or current if null) */}
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Home Address</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.address_line1 || "Not provided"}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Address (cont.)</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">
                            {employee.address?.city || "Not provided"}
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
                                  `${employee.address?.address_line1 || ""} ${employee.address?.city || ""}, ${employee.address?.zip_code || ""}`,
                                  "Home Address"
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
                  </div>
                </CardContent>
              </Card>

              {/* Education */}
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Education</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employee.education && employee.education.length > 0 ? (
                      employee.education.map((edu) => (
                        <div key={edu.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
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

              {/* Identity Documents */}
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Identity Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                      <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                        <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                        Aadhar Card
                        {employee.aadhar_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-2 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.aadhar_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-1 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.aadhar_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Number: {employee.aadhar_number || 'Not provided'}
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                      <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                        <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                        PAN Card
                        {employee.pan_url && (
                          <>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-2 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.pan_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              asChild
                              className="ml-1 text-purple-500 dark:text-purple-400"
                            >
                              <a href={employee.pan_url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Number: {employee.pan_number || 'Not provided'}
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Professional Info Tab */}
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

            {/* Bank Details Tab */}
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
                        <div className="text-sm text-gray-500 dark:text-gray-400">Account Number</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                          {showFullAccountNumber ? (
                            employee.bankDetails.account_number
                          ) : (
                            employee.bankDetails.account_number.replace(/\d(?=\d{4})/g, "*")
                          )}
                          <Button
                            variant="link"
                            className="ml-2 text-purple-500 dark:text-purple-400 hover:underline"
                            onClick={() => setShowFullAccountNumber(!showFullAccountNumber)}
                          >
                            {showFullAccountNumber ? "Hide" : "View"}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">IFSC Code</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.ifsc_code}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Branch</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.branch_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">City</div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{employee.bankDetails.city}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 italic">No bank details available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card className="shadow-md rounded-xl">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Activity Timeline</h3>
                  <div className="relative">
                    {generateActivityTimeline().length > 0 ? (
                      <div className="space-y-6">
                        {generateActivityTimeline().map((activity, index) => (
                          <div key={index} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 dark:bg-purple-400 rounded-full"></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(activity.date)}
                                </span>
                                <div className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                {activity.icon}
                              </div>
                              <p className="mt-1 text-gray-800 dark:text-gray-200">{activity.description}</p>
                              {index < generateActivityTimeline().length - 1 && (
                                <div className="ml-1 mt-2 w-px h-full bg-gray-200 dark:bg-gray-700"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 italic">No activity available</div>
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

export default ProfilePageEmployee;