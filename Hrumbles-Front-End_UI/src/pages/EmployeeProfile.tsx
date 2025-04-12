
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Mail, Phone, Globe, User, Activity, Clock, FileText, Home, Pencil } from "lucide-react";


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
    offerLetter?:string;
    hikeLetter?:string;
    seperationLetter?:string;
    payslip1?:string;
    payslip2?:string;
    payslip3?:string;
  }>;
  education?: Array<{
    id: string;
    type: string;
    institute?: string;
    year_completed?: string;
    document_url?:string;
  }>;
  bankDetails?: {
    account_holder_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    ifsc_code: string;
    branch_address?: string;
    city?:string;
  };
}

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  console.log("employeeProfiledata", employee)

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails(id);
    }
  }, [id]);

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
        document_url: edu.document_url

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

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading employee details...</div>;
  }

  if (!employee) {
    return <div className="flex items-center justify-center h-screen">Employee not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/employee')} className="mr-2">
          Employees
        </Button>
        <span className="text-gray-500 mx-2">/</span>
        <span>Employee Profile</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="md:col-span-1">
          <Card className="relative">
            <div className="h-36 w-full bg-gradient-custom "></div>
          
            <div className="flex flex-col items-center -mt-16 px-6 pb-6">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                {employee.profile_picture_url ? (
                  <AvatarImage src={employee.profile_picture_url} alt={`${employee.first_name} ${employee.last_name}`} />
                ) : (
                  <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-600">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="mt-4 text-center">
                <h1 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm inline-block mt-2">
                  {employee.position || "No Position"}
                </div>
                <div className="text-sm text-gray-500 mt-1">{employee.employee_id}</div>
              </div>
              
              <div className="w-full mt-6">
                <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div>{employee.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Mobile Phone</div>
                      <div>{employee.phone || "Not provided"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Nationality</div>
                      <div>{employee.address?.country || "Not provided"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Gender</div>
                      <div>{employee.gender || "Not provided"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Age</div>
                      <div>{getAge(employee.date_of_birth)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          employee.employment_status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        {employee.employment_status || "Not provided"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-3 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-500">Type of Hire</div>
                      <div>{employee.experiences?.[0]?.employment_type || "Not provided"}</div>
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
      <TabsTrigger value="personal" className="rounded-full">Personal Information</TabsTrigger>
      <TabsTrigger value="job" className="rounded-full">Professional Information</TabsTrigger>
      <TabsTrigger value="salary" className="rounded-full">Salary Information</TabsTrigger>
      <TabsTrigger value="documents" className="rounded-full">Documents</TabsTrigger>
    </TabsList>
    <Button onClick={() => navigate(`/employee/${id}`)}>Edit Profile</Button>
  </div>
            
            
            <TabsContent value="personal" className="space-y-6">
              {/* Professional Information */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="text-lg font-semibold">Professional Information</h3>
                    </div>
                    {/* <Button variant="ghost" size="icon" className="rounded-full">
                      <Pencil className="h-4 w-4" />
                    </Button> */}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <div className="text-sm text-gray-500">Level of Education</div>
                      <div className="font-medium">
                        {employee.education?.find(e => e.type === "Degree")?.type || "Not provided"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Higher Education</div>
                      <div className="font-medium">
                        {employee.education?.find(e => e.type === "Degree")?.institute || "Not provided"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Degree</div>
                      <div className="font-medium">
                        {employee.education?.find(e => e.type === "Degree")?.institute || "Not provided"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Department</div>
                      <div className="font-medium">{employee.department_name || "Not provided"}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500">Designation</div>
                      <div className="font-medium">{employee.designation_name || "Not provided"}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Hard Skill</div>
                      <div className="font-medium">Technical</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Soft Skill</div>
                      <div className="font-medium">Communication</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* ID Proof */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Identity Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">Aadhar Card</div>
                      <div className="text-sm text-gray-500 mt-1">
                       Aadhar Number: {employee.aadhar_number || 'Not provided'}
                      </div>
                      {employee.aadhar_url ? (
                        
                        <div className="mt-2">
                          <a 
                            href={employee.aadhar_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">PAN Card</div>
                      {employee.pan_url ? (
                        <div className="mt-2">
                          <a 
                            href={employee.pan_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Number: {employee.pan_number || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">ESIC</div>
                      {employee.esic_url ? (
                        <div className="mt-2">
                          <a 
                            href={employee.esic_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Number: {employee.esic_number || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Home Address */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <Home className="h-5 w-5 text-orange-500 mr-2" />
                      <h3 className="text-lg font-semibold">Home Address</h3>
                    </div>
                    {/* <Button variant="ghost" size="icon" className="rounded-full">
                      <Pencil className="h-4 w-4" />
                    </Button> */}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-6">
                    <div>
                      <div className="text-sm text-gray-500">Address</div>
                      <div className="font-medium">{employee.address?.address_line1 || "Not provided"}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Address (cont.)</div>
                      <div className="font-medium">-</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">City</div>
                      <div className="font-medium">{employee.address?.city || "Not provided"}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Postal code</div>
                      <div className="font-medium">{employee.address?.zip_code || "Not provided"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tax Information */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-500 mr-2" />
                      <h3 className="text-lg font-semibold">Bank Information</h3>
                    </div>
                    {/* <Button variant="ghost" size="icon" className="rounded-full">
                      <Pencil className="h-4 w-4" />
                    </Button> */}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6">
                  {employee.bankDetails ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Account Holder</div>
                        <div className="font-medium">{employee.bankDetails.account_holder_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Bank Name</div>
                        <div className="font-medium">{employee.bankDetails.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Account Number</div>
                        <div className="font-medium">
                          {employee.bankDetails.account_number.replace(/\d(?=\d{4})/g, "*")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">IFSC Code</div>
                        <div className="font-medium">{employee.bankDetails.ifsc_code}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Branch</div>
                        <div className="font-medium">{employee.bankDetails.branch_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">City</div>
                        <div className="font-medium">{employee.bankDetails.city}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No bank details available</div>
                  )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="job" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Work Experience</h3>
                  
                  <div className="space-y-4">
  {employee.experiences && employee.experiences.length > 0 ? (
    employee.experiences.map((exp) => (
      <div key={exp.id} className="border rounded-lg p-4">
        {/* Work Experience Details */}
        <div className="mb-4">
          <div className="font-semibold text-lg">{exp.position}</div>
          <div className="text-gray-700">{exp.company}</div>
          <div className="text-sm text-gray-500 mt-1">
            {exp.location ? `${exp.location} • ` : ''}{exp.employment_type || 'N/A'}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}
          </div>
        </div>

        {/* Documents Section (Displayed Horizontally) */}
        <div className="border-t pt-3 mt-3">
          <div className="font-semibold text-sm mb-2">Documents</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Offer Letter: {exp.offerLetter ? (
              <a href={exp.offerLetter} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>

            <span>Hike Letter: {exp.hikeLetter ? (
              <a href={exp.hikeLetter} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>

            <span>Payslip 1: {exp.payslip1 ? (
              <a href={exp.payslip1} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>

            <span>Payslip 2: {exp.payslip2 ? (
              <a href={exp.payslip2} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>

            <span>Payslip 3: {exp.payslip3 ? (
              <a href={exp.payslip3} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>

            <span>Separation Letter: {exp.seperationLetter ? (
              <a href={exp.seperationLetter} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="text-gray-500 italic">No work experience available</div>
  )}
</div>

                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Education</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employee.education && employee.education.length > 0 ? (
                      employee.education.map((edu) => (
                        <div key={edu.id} className="border rounded-lg p-4">
                          <div className="font-semibold">{edu.type}</div>
                          <div className="text-gray-700">{edu.institute || 'N/A'}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {edu.year_completed ? (
                              new Date(edu.year_completed).getFullYear()
                            ) : 'N/A'}
                          </div>
                          <span>Certificate: {edu.document_url ? (
              <a href={edu.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">View</a>
            ) : 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 italic">No education details available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="salary" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                  
                  {employee.bankDetails ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Account Holder</div>
                        <div className="font-medium">{employee.bankDetails.account_holder_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Bank Name</div>
                        <div className="font-medium">{employee.bankDetails.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Account Number</div>
                        <div className="font-medium">
                          {employee.bankDetails.account_number.replace(/\d(?=\d{4})/g, "*")}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">IFSC Code</div>
                        <div className="font-medium">{employee.bankDetails.ifsc_code}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Branch</div>
                        <div className="font-medium">{employee.bankDetails.branch_name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No bank details available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Identity Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">Aadhar Card</div>
                      {employee.aadhar_url ? (
                        <div className="mt-2">
                          <a 
                            href={employee.aadhar_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Number: {employee.aadhar_number || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">PAN Card</div>
                      {employee.pan_url ? (
                        <div className="mt-2">
                          <a 
                            href={employee.pan_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Number: {employee.pan_number || 'Not provided'}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="font-medium">ESIC</div>
                      {employee.esic_url ? (
                        <div className="mt-2">
                          <a 
                            href={employee.esic_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-gray-500 italic mt-2">No document uploaded</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Number: {employee.esic_number || 'Not provided'}
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
