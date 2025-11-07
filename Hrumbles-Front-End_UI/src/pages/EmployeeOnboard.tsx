import { useState, useEffect, useRef  } from "react";
import { Form, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client"; // Corrected import
import { toast } from "sonner";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { useSelector } from "react-redux";
import { Country, State, City } from 'country-state-city'; 
import { ArrowLeft, Save, ArrowRight, Upload, Plus, X, ChevronRight, User, CalendarIcon, File, Loader2, FileText, CheckCircle2, Briefcase, Clock, Building2, MapPin, Eye, Edit  } from "lucide-react";
// Add this line near the top of EmployeeOnboard.tsx
import { Calendar } from "@/components/ui/calendar"; // Make sure this path is correct
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { uploadDocument } from "@/utils/uploadDocument";
import { format } from "date-fns";
import { Experience } from "@/services/types/employee.types";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Switch } from "@/components/ui/switch"; 
import { calculateProfileCompletion } from "@/utils/profileCompletion";


// Utility functions for INR formatting
const formatINR = (value: string): string => {
  if (!value) return "";
  const num = parseFloat(value.replace(/,/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

// Add this helper function inside your EmployeeOnboard component

const getInitials = (firstName: string, lastName: string): string => {
  if (!firstName && !lastName) return "U";
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return `${first}${last}`.toUpperCase();
};

const parseINR = (value: string): string => {
  return value.replace(/,/g, "");
};

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  position: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  employmentStatus: string;
  hire_type: string;
  // Identity Documents
  aadharNumber: string;
  panNumber: string;
  voterIdNumber: string;
  drivingLicenseNumber: string;
  passportNumber: string;
  otherIdName: string; // New field for "Other" document name
  otherIdNumber: string; // New field for "Other" document number
  // Statutory Documents
  esicNumber: string;
  uanNumber: string;
  // Document URLs
  aadharUrl: string;
  panUrl: string;
  voterIdUrl: string;
  drivingLicenseUrl: string;
  passportUrl: string;
  otherIdUrl: string; // New field for "Other" document URL
  esicUrl: string;
  uanUrl: string;
  profilePictureUrl: string;
  // Employment Details
  contractDuration?: string;
  paymentBasis?: string;
  hoursPerWeek?: string;
  internshipDuration?: string;
  salary: string;
  salary_type: string;
  joining_date: string;
  // Addresses and Contacts
  presentAddress: {
    addressLine1: string;
    addressLine2?: string;
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  permanentAddress: {
    addressLine1: string;
    addressLine2?: string;
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  emergencyContacts: Array<{
    relationship: string;
    name: string;
    phone: string;
  }>;
  familyMembers: Array<{
    relationship: string;
    name: string;
    occupation: string;
    phone: string;
  }>;
  // Education, Experience, Bank
  education: Array<{
    type: string;
    institute?: string;
    year_completed?: string;
    documentUrl?: string;
  }>;
  experiences: Array<{
    jobType: "Full Time" | "Part Time" | "Internship";
    company: string;
    position: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    offerLetterUrl?: string;
    separationLetterUrl?: string;
    payslip_1_url?: string;
    payslip_2_url?: string;
    payslip_3_url?: string;
    hikeLetterUrl?: string;
    noSeparationLetterReason?: string;
    noPayslipReason?: string;
  }>;
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
    branchAddress?: string;
    accountType: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    documentUrl?: string;
  };
}



const initialFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  email: "",
  personalEmail: "",
  phone: "",
  employeeId: "",
  department: "",
  designation: "",
  position: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  bloodGroup: "",
  employmentStatus: "",
  hire_type: "",
  // Identity Documents
  aadharNumber: "",
  panNumber: "",
  voterIdNumber: "",
  drivingLicenseNumber: "",
  passportNumber: "",
  otherIdName: "", // New
  otherIdNumber: "", // New
  // Statutory Documents
  esicNumber: "",
  uanNumber: "",
  // Document URLs
  aadharUrl: "",
  panUrl: "",
  voterIdUrl: "",
  drivingLicenseUrl: "",
  passportUrl: "",
  otherIdUrl: "", // New
  esicUrl: "",
  uanUrl: "",
  profilePictureUrl: "",
  // ... (rest of the initialFormData object remains the same)
  contractDuration: "",
  paymentBasis: "",
  hoursPerWeek: "",
  internshipDuration: "",
  salary: "",
  salary_type: "",
  joining_date: "",
  presentAddress: {
    addressLine1: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  },
  permanentAddress: {
    addressLine1: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  },
  emergencyContacts: [
    { relationship: "", name: "", phone: "" }
  ],
  familyMembers: [
    { relationship: "", name: "", occupation: "", phone: "" }
  ],
  education: [
    { type: "SSC", institute: "", year_completed: "",documentUrl: ""  },
    { type: "HSC/Diploma", institute: "", year_completed: "",documentUrl: ""  },
    { type: "Degree", institute: "", year_completed: "",documentUrl: ""  }
  ],
  experiences: [
    {
      jobType: "Full Time",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      payslip_1_url: "",
      payslip_2_url: "",
      payslip_3_url: "",
    }
  ],
  bankDetails: {
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
    accountType: "Savings",
    branchAddress: "",
    country: "India",
    state: "",
    city: "",
    zipCode: ""
  }
};

//validation function

const VALIDATIONS = {
  phone: /^\+\d{10,15}$/, // Starts with +, followed by 10-15 digits
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email format
  aadhar: /^\d{12}$/, // Exactly 12 digits
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, // Standard PAN format (e.g., ABCDE1234F)
  voterId: /^[A-Z]{3}[0-9]{7}$/, // Standard Voter ID (e.g., ABC1234567)
  // Simplified Driving License to accept 10-20 alphanumeric characters, allowing for state variations
  drivingLicense: /^[A-Z0-9\s-]{10,20}$/, 
  // Standard Indian Passport: 1 Uppercase Letter followed by 7 Digits (e.g., A1234567)
  passport: /^[A-Z][0-9]{7}$/, 
  uan: /^\d{12}$/, // Exactly 12 digits
  esic: /^\d{10,17}$/, // 10 to 17 digits
  salary: /^\d+$/, // Digits only
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/, // Standard IFSC format
};

// Add error state type
interface FormErrors {
  phone?: string;
  email?: string;
  personalEmail?: string; // New error state
  aadharNumber?: string;
  panNumber?: string;
  uanNumber?: string;
  esicNumber?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  designation?: string;
  hire_type?: string;
  salary?: string;
  salary_type?: string;
}

const EmployeeOnboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState<EmployeeFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
const [isSameAsPresent, setIsSameAsPresent] = useState(false);
  const [presentStates, setPresentStates] = useState<any[]>([]);
  const [presentCities, setPresentCities] = useState<any[]>([]);
  const [permanentStates, setPermanentStates] = useState<any[]>([]);
  const [permanentCities, setPermanentCities] = useState<any[]>([]);
  const [bankStates, setBankStates] = useState<any[]>([]);
  const [bankCities, setBankCities] = useState<any[]>([]);

  const [countries, setCountries] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
    const isInitialMount = useRef(true);
    const isLoadingBankData = useRef(false);
  const [isVerifyingIfsc, setIsVerifyingIfsc] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [noAadhar, setNoAadhar] = useState(false); // ✅ ADD THIS


 const isAlternativeDocValid = (type: string, number: string): boolean => {
    if (!type || !number) return false;
    switch (type) {
      case "Voter ID":
        return VALIDATIONS.voterId.test(number);
      case "Driving License":
        return VALIDATIONS.drivingLicense.test(number);
      case "Passport":
        return VALIDATIONS.passport.test(number);
      default:
        return false;
    }
  };

  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
  const [currentExperience, setCurrentExperience] = useState<Experience>({
    id: Date.now(),
    jobType: "Full Time",
    company: "",
    position: "",
    location: "",
    startDate: "",
    endDate: "",
    offerLetterUrl: "",
    separationLetterUrl: "",
    payslip_1_url: "",
    payslip_2_url: "",
    payslip_3_url: "",
    hikeLetterUrl: "",
    noSeparationLetterReason: "",
    noPayslipReason: "",
  });


  const [noSeparationLetter, setNoSeparationLetter] = useState(false);
  const [noPayslip, setNoPayslip] = useState(false);

  // Add state for departments and designations
  const [departments, setDepartments] = useState<Array<{id: string, name: string}>>([]);
  const [designations, setDesignations] = useState<Array<{id: string, name: string}>>([]);

  const organizationId = useSelector((state: any) => state.auth.organization_id);

const educationColors = ["bg-blue-50", "bg-indigo-50", "bg-violet-50"];

  // Load countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
  }, []);

  // Fetch departments and designations from database
  useEffect(() => {
    const fetchDepartmentsAndDesignations = async () => {
      try {
        // Fetch departments
        const { data: deptData, error: deptError } = await supabase
          .from('hr_departments')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (deptError) {
          console.error('Error fetching departments:', deptError);
        } else if (deptData) {
          setDepartments(deptData);
        }

        // Fetch designations
        const { data: desigData, error: desigError } = await supabase
          .from('hr_designations')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (desigError) {
          console.error('Error fetching designations:', desigError);
        } else if (desigData) {
          setDesignations(desigData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (organizationId) {
      fetchDepartmentsAndDesignations();
    }
  }, [organizationId]);

  // Load states when country changes for Present Address
  useEffect(() => {
    if (formData.presentAddress.country) {
      const country = countries.find(c => c.name === formData.presentAddress.country);
      if (country) {
        const states = State.getStatesOfCountry(country.isoCode);
        setPresentStates(states);
      }
    }
  }, [formData.presentAddress.country, countries]);

  // Load cities when state changes for Present Address
  useEffect(() => {
    if (formData.presentAddress.state && formData.presentAddress.country) {
      const country = countries.find(c => c.name === formData.presentAddress.country);
      const state = presentStates.find(s => s.name === formData.presentAddress.state);
      if (country && state) {
        const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
        setPresentCities(cities);
      }
    }
  }, [formData.presentAddress.state, formData.presentAddress.country, countries, presentStates]);

  // Load states when country changes for Permanent Address
  useEffect(() => {
    if (formData.permanentAddress.country) {
      const country = countries.find(c => c.name === formData.permanentAddress.country);
      if (country) {
        const states = State.getStatesOfCountry(country.isoCode);
        setPermanentStates(states);
      }
    }
  }, [formData.permanentAddress.country, countries]);

  // Load cities when state changes for Permanent Address
  useEffect(() => {
    if (formData.permanentAddress.state && formData.permanentAddress.country) {
      const country = countries.find(c => c.name === formData.permanentAddress.country);
      const state = permanentStates.find(s => s.name === formData.permanentAddress.state);
      if (country && state) {
        const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
        setPermanentCities(cities);
      }
    }
  }, [formData.permanentAddress.state, formData.permanentAddress.country, countries, permanentStates]);

  // Load states when country changes for Bank Details
useEffect(() => {
  if (isInitialMount.current) return;

    if (isLoadingBankData.current) return;
  if (formData.bankDetails.country) {
    const country = countries.find(c => c.name === formData.bankDetails.country);
    if (country) {
      const states = State.getStatesOfCountry(country.isoCode);
      setBankStates(states);
      
      // ✅ FIX: Only reset state/city if they don't already have values
      // This prevents clearing them when data is first loaded
      if (!formData.bankDetails.state) {
        handleBankDetailsChange("state", "");
      }
      if (!formData.bankDetails.city) {
        handleBankDetailsChange("city", "");
      }
    }
  }
}, [formData.bankDetails.country, countries]);

  // Load cities when state changes for Bank Details
useEffect(() => {
  if (isInitialMount.current) return;
  
   if (isLoadingBankData.current) return;

  if (formData.bankDetails.state && formData.bankDetails.country) {
    const country = countries.find(c => c.name === formData.bankDetails.country);
    const state = bankStates.find(s => s.name === formData.bankDetails.state);
    if (country && state) {
      const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
      setBankCities(cities);
      
      // ✅ FIX: Only reset city if it doesn't already have a value
      if (!formData.bankDetails.city) {
        handleBankDetailsChange("city", "");
      }
    }
  }
}, [formData.bankDetails.state]);


  // Copy permanent address to present address when checkbox is toggled
// Handles the "Same as Present" checkbox logic
  const handleSameAsPresentChange = (checked: boolean) => {
    setIsSameAsPresent(checked);
    if (checked) {
      // If checked, copy the present address to the permanent address
      setFormData((prevData) => ({
        ...prevData,
        permanentAddress: { ...prevData.presentAddress },
      }));
    }
  };

// Auto-fill bank details from IFSC code
  useEffect(() => {
    const verifyIfsc = async () => {
      // Clear previous bank details if the IFSC is not a valid format
      if (!VALIDATIONS.ifsc.test(formData.bankDetails.ifscCode)) {
        if (formData.bankDetails.bankName) { // Only clear if there was a value before
          handleBankDetailsChange("bankName", "");
          handleBankDetailsChange("branchName", "");
          handleBankDetailsChange("branchAddress", "");
          handleBankDetailsChange("state", "");
          handleBankDetailsChange("city", "");
          handleBankDetailsChange("zipCode", "");
        }
        return; // Stop execution if format is invalid
      }

      setIsVerifyingIfsc(true);
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${formData.bankDetails.ifscCode}`);
        
        if (!response.ok) {
          throw new Error("Invalid IFSC Code");
        }

        const data = await response.json();

        // --- Start of New Autofill Logic ---

        // Auto-fill Bank Name, Branch, and Full Address
        handleBankDetailsChange("bankName", data.BANK);
        handleBankDetailsChange("branchName", data.BRANCH);
        handleBankDetailsChange("branchAddress", data.ADDRESS);

        // Auto-fill State and City directly from API data
        // handleBankDetailsChange("state", data.STATE);
        // handleBankDetailsChange("city", data.CITY);

        // Extract the ZIP Code (PIN Code) from the full address string
        const addressString = data.ADDRESS || "";
        const zipMatch = addressString.match(/\d{6}$/); // Regex to find 6 digits at the end of the string
        if (zipMatch) {
          handleBankDetailsChange("zipCode", zipMatch[0]); // zipMatch[0] contains the matched 6-digit code
        }
        
        // --- End of New Autofill Logic ---

        toast.success("IFSC verified and details auto-filled!");

      } catch (error) {
        console.error("IFSC lookup failed:", error);
        toast.error("Could not re-verify IFSC Code. Please check the code or your network connection.");
        // Clear all related fields if the code is wrong
        handleBankDetailsChange("bankName", "");
        handleBankDetailsChange("branchName", "");
        handleBankDetailsChange("branchAddress", "");
        handleBankDetailsChange("state", "");
        handleBankDetailsChange("city", "");
        handleBankDetailsChange("zipCode", "");
      } finally {
        setIsVerifyingIfsc(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      verifyIfsc();
    }, 500); // Add a 500ms delay to avoid API calls on every keystroke

    return () => clearTimeout(debounceTimer); // Cleanup timer on component re-render

  }, [formData.bankDetails.ifscCode]);

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    } 

  else {
    // ✅ For new employees, set to false after a short delay
    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
  }
}, [id]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
       isLoadingBankData.current = true; 
      
      // Fetch employee data from hr_employees table
      const { data: employeeData, error: employeeError } = await supabase
        .from("hr_employees")
        .select(`
          *,
          department:hr_departments(name),
          designation:hr_designations(name)
        `)
        .eq("id", id)
        .single();

      if (employeeError) throw employeeError;

      console.log("Fetched employee data:", employeeData);

      // Parse JSONB fields
      const presentAddress = employeeData.present_address || {};
      const permanentAddress = employeeData.permanent_address || {};
      const emergencyContacts = employeeData.emergency_contacts || [];
      const familyDetails = employeeData.family_details || [];

      // Fetch education data (check if hr_employee_education table exists)
      let educationData = [];
      try {
        const { data: eduData } = await supabase
          .from("hr_employee_education")
          .select("*")
          .eq("employee_id", id);
        educationData = eduData || [];
      } catch (e) {
        console.log("No hr_employee_education table, using default");
      }

      // Fetch experience data (check if hr_employee_experience table exists)
      let experienceData = [];
      try {
        const { data: expData } = await supabase
          .from("hr_employee_experiences")
          .select("*")
          .eq("employee_id", id);
        experienceData = expData || [];
      } catch (e) {
        console.log("No hr_employee_experience table, using default");
      }

      // Fetch bank details (check if hr_employee_bank_details table exists)
      let bankData = null;
      try {
        const { data: bankResult } = await supabase
          .from("hr_employee_bank_details")  // ✅ Correct table name!
          .select("*")
          .eq("employee_id", id)
          .single();
        bankData = bankResult;
      } catch (e) {
        console.log("No hr_employee_bank_details table, using default");
      }

       
       // Proactively populate the bank state and city lists to prevent a race condition.
      if (bankData?.country && bankData?.state) {
        const allCountries = Country.getAllCountries();
        const selectedCountry = allCountries.find(c => c.name === bankData.country);
        
        if (selectedCountry) {
          const statesOfCountry = State.getStatesOfCountry(selectedCountry.isoCode);
          setBankStates(statesOfCountry); // Set the list of states immediately

          const selectedState = statesOfCountry.find(s => s.name === bankData.state);
          if (selectedState) {
            const citiesOfState = City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode);
            setBankCities(citiesOfState); // Set the list of cities immediately
          }
        }
      }
      // *** END OF THE FIX ***

      // Map education data to match the form structure
    const mappedEducation = educationData && educationData.length > 0
        ? educationData.map((edu: any) => ({
            type: edu.type || "",
            institute: edu.institute || "",
            // *** START OF THE FIX ***
            // Extract only the year from the full date string
            year_completed: edu.year_completed ? new Date(edu.year_completed).getFullYear().toString() : "",
            // *** END OF THE FIX ***
            documentUrl: edu.document_url || "",
          }))
        : initialFormData.education;
      // Map experience data to match the form structure
     const mappedExperience = experienceData && experienceData.length > 0
        ? experienceData.map((exp: any) => ({
            id: exp.id,
            // Use 'employment_type' from the DB for 'jobType' in the form
            jobType: (exp.employment_type || exp.jobType || "Full Time") as "Full Time" | "Part Time" | "Internship",
            company: exp.company || "",
            
            // =================================================================
            // START: CRITICAL FIX HERE
            // =================================================================
            // The database column is 'job_title', but the form state uses 'position'.
            // We must map it correctly when fetching.
            position: exp.job_title || "", // ✅ CHANGE THIS LINE
            // =================================================================
            // END: CRITICAL FIX HERE
            // =================================================================
            
            location: exp.location || "",
            startDate: exp.start_date || "",
            endDate: exp.end_date || "",
            offerLetterUrl: exp.offer_letter_url || "",
            separationLetterUrl: exp.separation_letter_url || "",
            payslip_1_url: exp.payslip_1_url || "",
            payslip_2_url: exp.payslip_2_url || "",
            payslip_3_url: exp.payslip_3_url || "",
            hikeLetterUrl: exp.hike_letter_url || "",
            noSeparationLetterReason: exp.no_separation_letter_reason || "",
            noPayslipReason: exp.no_payslip_reason || "",
          }))
        : initialFormData.experiences;

      // Set form data
      setFormData({
        firstName: employeeData.first_name || "",
        lastName: employeeData.last_name || "",
        email: employeeData.email || "",
        personalEmail: employeeData.personal_email || "",
        phone: employeeData.phone || "",
        employeeId: employeeData.employee_id || "",
        department: employeeData.department_id || "",
        designation: employeeData.designation_id || "",
        position: employeeData.position || "",
        dateOfBirth: employeeData.date_of_birth || "",
        gender: employeeData.gender || "",
        maritalStatus: employeeData.marital_status || "",
        bloodGroup: employeeData.blood_group || "",
        employmentStatus: employeeData.employment_status || employeeData.status || "",
        hire_type: employeeData.hire_type || null,
        contractDuration: employeeData.contract_duration || "",
        paymentBasis: employeeData.payment_basis || "",
        hoursPerWeek: employeeData.hours_per_week || "",
        internshipDuration: employeeData.internship_duration || "",
        salary: employeeData.salary ? employeeData.salary.toString() : "",
        salary_type: employeeData.salary_type || "",
        joining_date: employeeData.joining_date || employeeData.employment_start_date || "",
        aadharNumber: employeeData.aadhar_number || "",
        panNumber: employeeData.pan_number || "",
        voterIdNumber: employeeData.voter_id_number || "",
         drivingLicenseNumber: employeeData.driving_license_number || "", // New
        passportNumber: employeeData.passport_number || "",             // New
        esicNumber: employeeData.esic_number || "",
        uanNumber: employeeData.uan_number || "",
        aadharUrl: employeeData.aadhar_url || "",
        panUrl: employeeData.pan_url || "",
        voterIdUrl: employeeData.voter_id_url || "",
        drivingLicenseUrl: employeeData.driving_license_url || "",      // New
        passportUrl: employeeData.passport_url || "",                   // New
        esicUrl: employeeData.esic_url || "",
        uanUrl: employeeData.uan_url || "",
        profilePictureUrl: employeeData.profile_picture_url || "",
        presentAddress: {
          addressLine1: presentAddress.addressLine1 || presentAddress.address_line_1 || "",
          addressLine2: presentAddress.addressLine2 || presentAddress.address_line_2 || "",
          country: presentAddress.country || "India",
          state: presentAddress.state || "",
          city: presentAddress.city || "",
          zipCode: presentAddress.zipCode || presentAddress.zip_code || ""
        },
        permanentAddress: {
          addressLine1: permanentAddress.addressLine1 || permanentAddress.address_line_1 || "",
          addressLine2: permanentAddress.addressLine2 || permanentAddress.address_line_2 || "",
          country: permanentAddress.country || "India",
          state: permanentAddress.state || "",
          city: permanentAddress.city || "",
          zipCode: permanentAddress.zipCode || permanentAddress.zip_code || ""
        },
        emergencyContacts: emergencyContacts && emergencyContacts.length > 0
          ? emergencyContacts.map((contact: any) => ({
              relationship: contact.relationship || "",
              name: contact.name || contact.contact_name || "",
              phone: contact.phone || contact.phone_number || ""
            }))
          : initialFormData.emergencyContacts,
        familyMembers: familyDetails && familyDetails.length > 0
          ? familyDetails.map((member: any) => ({
              relationship: member.relationship || "",
              name: member.name || "",
              occupation: member.occupation || "",
              phone: member.phone || member.phone_number || ""
            }))
          : initialFormData.familyMembers,
        education: mappedEducation,
        experiences: mappedExperience,
        bankDetails: bankData
          ? {
              accountHolderName: bankData.account_holder_name || "",
              accountNumber: bankData.account_number || "",
              bankName: bankData.bank_name || "",
              branchName: bankData.branch_name || "",
              ifscCode: bankData.ifsc_code || "",
              accountType: bankData.account_type || "Savings",
              branchAddress: bankData.branch_address || "",
              country: bankData.country || "India",
              state: bankData.state || "",
              city: bankData.city || "",
              zipCode: bankData.zip_code || "",
              documentUrl: bankData.document_url || ""
            }
          : initialFormData.bankDetails
      });
    } catch (error: any) {
      console.error("Error fetching employee data:", error);
      toast.error("Failed to load employee data: " + error.message);
    } finally {
      setLoading(false);
      isInitialMount.current = false;
       isLoadingBankData.current = false; 
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Automatically set salary_type based on hire_type
      if (field === "hire_type") {
        if (value === "Internship") {
          newData.salary_type = "Stipend";
        } else if (value === "Full Time" || value === "Part Time" || value === "Contract") {
          newData.salary_type = "LPA";
        }
      }

      return newData;
    });

    // Clear specific field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

// --- CORRECTED ---
  const handleAddressChange = (
    type: "presentAddress" | "permanentAddress",
    field: string,
    value: string
  ) => {
    setFormData(prev => {
      const newAddress = { ...prev[type], [field]: value };

      // When country changes, reset state and city
      if (field === "country") {
        newAddress.state = "";
        newAddress.city = "";
      }
      // When state changes, reset city
      if (field === "state") {
        newAddress.city = "";
      }

      return {
        ...prev,
        [type]: newAddress
      };
    });
  };
  const handleEmergencyContactChange = (index: number, field: string, value: string) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      emergencyContacts: updatedContacts
    }));
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { relationship: "", name: "", phone: "" }
      ]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
    }));
  };

  const handleFamilyMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...formData.familyMembers];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      familyMembers: updatedMembers
    }));
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [
        ...prev.familyMembers,
        { relationship: "", name: "", occupation: "", phone: "" }
      ]
    }));
  };

  const removeFamilyMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index)
    }));
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const updatedEducation = [...formData.education];
    updatedEducation[index] = {
      ...updatedEducation[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      education: updatedEducation
    }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const openExperienceModal = (index?: number) => {
    if (index !== undefined && formData.experiences[index]) {
      setEditingExperienceIndex(index);
      setCurrentExperience({
        ...formData.experiences[index],
        id: formData.experiences[index].id || Date.now()
      });
    } else {
      setEditingExperienceIndex(null);
      setCurrentExperience({
        id: Date.now(),
        jobType: "Full Time",
        company: "",
        position: "",
        location: "",
        startDate: "",
        endDate: "",
        offerLetterUrl: "",
        separationLetterUrl: "",
        payslip_1_url: "",
        payslip_2_url: "",
        payslip_3_url: "",
        hikeLetterUrl: "",
        noSeparationLetterReason: "",
        noPayslipReason: "",
      });
    }
    setShowExperienceModal(true);
  };

  const handleExperienceChange = (field: string, value: any) => {
    setCurrentExperience(prev => ({
      ...prev,
      [field]: value
    }));
  };

const saveExperience = async () => {
    // 1. Validate that essential fields are filled
    if (!currentExperience.company || !currentExperience.position) {
      toast.error("Please provide both a Company and a Position.");
      return;
    }

    // CASE 1: EDITING an existing employee (the 'id' from the URL exists)
    // We will save directly to the database.
    if (id) {
      // This object uses the CORRECT column names for your database
      const experienceData = {
        employee_id: id,
        organization_id: organizationId,
        company: currentExperience.company,                 // Corrected name
        job_title: currentExperience.position,              // Corrected name
        employment_type: currentExperience.jobType,         // Corrected name
        location: currentExperience.location || null,
        start_date: currentExperience.startDate || null,
        end_date: currentExperience.endDate || null,
        offer_letter_url: currentExperience.offerLetterUrl || null,
        separation_letter_url: currentExperience.separationLetterUrl || null,
        payslip_1_url: currentExperience.payslip_1_url || null,
        payslip_2_url: currentExperience.payslip_2_url || null,
        payslip_3_url: currentExperience.payslip_3_url || null,
        hike_letter_url: currentExperience.hikeLetterUrl || null,
        no_separation_letter_reason: currentExperience.noSeparationLetterReason || null,
        no_payslip_reason: currentExperience.noPayslipReason || null,
      };

      try {
        let response;
        // If the experience has a real database ID (a string), we update it.
        // If it's a new experience for this employee, its ID will be a number, so we insert it.
        if (editingExperienceIndex !== null && typeof currentExperience.id === 'string') {
          response = await supabase
            .from('hr_employee_experiences')
            .update(experienceData)
            .eq('id', currentExperience.id);
        } else {
          response = await supabase
            .from('hr_employee_experiences')
            .insert(experienceData);
        }

        if (response.error) throw response.error;

        toast.success("Experience has been saved to the database!");
        setShowExperienceModal(false);
        await fetchEmployeeData(); // This is KEY: It reloads the data to show the change

      } catch (error: any) {
        console.error("Error saving experience directly:", error);
        toast.error(`Failed to save experience: ${error.message}`);
      }

    } else {
      // CASE 2: ADDING a new employee (no 'id' from the URL yet)
      // We only save to the temporary form state.
      let updatedExperiences;
      if (editingExperienceIndex !== null) {
        updatedExperiences = [...formData.experiences];
        updatedExperiences[editingExperienceIndex] = currentExperience;
      } else {
        const isFirstItemEmpty = formData.experiences.length === 1 && !formData.experiences[0].company;
        if (isFirstItemEmpty) {
          updatedExperiences = [currentExperience];
        } else {
          updatedExperiences = [...formData.experiences, currentExperience];
        }
      }

      setFormData(prev => ({
        ...prev,
        experiences: updatedExperiences
      }));
      setShowExperienceModal(false);
      toast.info("Experience captured. It will be saved permanently when you create the employee.");
    }
  };


  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

 const handleGenericFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setField: (url: string) => void,
    uploadKey: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // This check prevents the "user details not available" error
    if (!organizationId) {
      toast.error("User details not available. Please log in again.");
      return;
    }

    try {
      setUploadingFile(uploadKey);
      // Use the correct 'organizationId' variable here
      const url = await uploadDocument(file, organizationId);
      setField(url);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingFile(null);
    }
  };
// --- START: COMPLETE AND CORRECTED UPLOAD FUNCTIONS BLOCK ---

const handleFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  options: {
    category: 'identity' | 'bank' | 'education' | 'experience';
    fieldSetter: (url: string) => void;
    uploadKey: string;
    subfolder?: string | number;
  }
) => {
  const { category, fieldSetter, uploadKey, subfolder } = options;
  const file = event.target.files?.[0];

  if (!file) {
    console.log("No file was selected.");
    return;
  }

  if (!organizationId) {
    toast.error("Organization ID not found. Please ensure you are logged in.");
    return;
  }

  try {
    setUploadingFile(uploadKey);

    const bucketName = 'employee-documents';
    const sanitizedFileName = sanitizeFileName(file.name);
    
    // Use the employee's database ID if editing, otherwise use a placeholder.
    const employeeIdentifier = id || 'new-employee';

    const pathParts = [`${category}-documents`, employeeIdentifier];
    if (subfolder !== undefined) {
      pathParts.push(String(subfolder));
    }
    pathParts.push(sanitizedFileName);
    const filePath = pathParts.join('/');

    // CRITICAL DEBUGGING STEP: Check your browser's developer console for this log.
    console.log("Attempting to upload with parameters:", {
      bucketName,
      filePath,
      file,
    });

    // Final check before sending
    if (!filePath || !bucketName) {
        throw new Error("Generated filePath or bucketName is empty.");
    }

    const url = await uploadDocument(file, bucketName, filePath);
    
    fieldSetter(url);
    toast.success("Document uploaded successfully!");

  } catch (error) {
    console.error(`Upload error for key [${uploadKey}]:`, error);
    toast.error(`Upload failed: ${(error as Error).message}`);
  } finally {
    setUploadingFile(null);
  }
};

// --- ADD THIS HELPER FUNCTION ---

const sanitizeFileName = (fileName: string): string => {
  // Extract the file name and extension
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const name = fileName.substring(0, fileName.length - (extension.length + 1));

  // Replace special characters, spaces, and non-ASCII characters
  let sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .substring(0, 100);          // Limit length to 100 characters

  // Ensure the name is not empty
  if (!sanitized) {
    sanitized = 'file';
  }

  // Add timestamp and short random string for uniqueness
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8); // 6-char random string
  const uniqueName = `${sanitized}-${timestamp}-${randomStr}`;

  return `${uniqueName}.${extension}`;
};



const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
  handleFileUpload(event, {
    category: 'identity',
    fieldSetter: (url) => handleInputChange(fieldName, url),
    uploadKey: fieldName
  });
};

const handleEducationUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
  handleFileUpload(event, {
    category: 'education',
    fieldSetter: (url) => handleEducationChange(index, "documentUrl", url),
    uploadKey: `education-${index}`,
    subfolder: index
  });
};

const handleBankDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  handleFileUpload(event, {
    category: 'bank',
    fieldSetter: (url) => handleBankDetailsChange("documentUrl", url),
    uploadKey: "bankDocument"
  });
};

const handleExpUpload = (event: React.ChangeEvent<HTMLInputElement>, field: string, experienceId: number) => {
  let urlField: string;
  switch (field) {
    case "offerLetter": urlField = "offerLetterUrl"; break;
    case "separationLetter": urlField = "separationLetterUrl"; break;
    case "payslip1": urlField = "payslip_1_url"; break;
    case "payslip2": urlField = "payslip_2_url"; break;
    case "payslip3": urlField = "payslip_3_url"; break;
    case "hikeLetter": urlField = "hikeLetterUrl"; break;
    default: urlField = field;
  }

  handleFileUpload(event, {
    category: 'experience',
    fieldSetter: (url) => handleExperienceChange(urlField, url),
    uploadKey: field,
    subfolder: experienceId
  });
};

// --- END: COMPLETE AND CORRECTED UPLOAD FUNCTIONS BLOCK ---
  
const validateTab = (tab: string): boolean => {
    const newErrors: FormErrors = {};
    
    switch (tab) {
        case 'personal':
            if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
            if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
            if (!formData.email.trim() || !VALIDATIONS.email.test(formData.email)) newErrors.email = "A valid official email is required.";
            if (formData.personalEmail && !VALIDATIONS.email.test(formData.personalEmail)) newErrors.personalEmail = "Please enter a valid personal email.";
            if (!formData.phone || !VALIDATIONS.phone.test(formData.phone)) newErrors.phone = "A valid phone number (e.g., +919876543210) is required.";
            // Note: Department, Designation, etc. are admin fields and not validated for the employee here.
            break;
            
        case 'address':
            if (!formData.presentAddress.addressLine1.trim()) { toast.error("Present Address: Address Line 1 is required."); return false; }
            if (!formData.presentAddress.country.trim()) { toast.error("Present Address: Country is required."); return false; }
            if (!formData.presentAddress.state.trim()) { toast.error("Present Address: State is required."); return false; }
            if (!formData.presentAddress.city.trim()) { toast.error("Present Address: City is required."); return false; }
            if (!formData.presentAddress.zipCode.trim()) { toast.error("Present Address: ZIP Code is required."); return false; }
            
            if (!isSameAsPresent) {
                if (!formData.permanentAddress.addressLine1.trim()) { toast.error("Permanent Address: Address Line 1 is required."); return false; }
                if (!formData.permanentAddress.country.trim()) { toast.error("Permanent Address: Country is required."); return false; }
                if (!formData.permanentAddress.state.trim()) { toast.error("Permanent Address: State is required."); return false; }
                if (!formData.permanentAddress.city.trim()) { toast.error("Permanent Address: City is required."); return false; }
                if (!formData.permanentAddress.zipCode.trim()) { toast.error("Permanent Address: ZIP Code is required."); return false; }
            }
            break;
// Inside your validateTab function, REPLACE the 'contact' case block with this new "AND" logic

case 'contact':
    // Helper function to check if an emergency contact is fully filled
    const isEmergencyContactComplete = (c: any) => 
        c.name && c.name.trim() !== '' && 
        c.relationship && c.relationship.trim() !== '' && 
        c.phone && c.phone.trim() !== '';

    // Helper function to check if a family member is fully filled (occupation is optional)
    const isFamilyMemberComplete = (m: any) =>
        m.name && m.name.trim() !== '' && 
        m.relationship && m.relationship.trim() !== '' && 
        m.phone && m.phone.trim() !== '';

    // Check if at least one entry in each array is complete
    const hasValidEmergencyContact = formData.emergencyContacts.some(isEmergencyContactComplete);
    const hasValidFamilyMember = formData.familyMembers.some(isFamilyMemberComplete);

    // ✅ FIX: The logic is changed here.
    // If EITHER section is incomplete, show an error and stop.
    if (!hasValidEmergencyContact || !hasValidFamilyMember) {
        toast.error("Please add at least one complete Emergency Contact AND at least one complete Family Member.");
        return false;
    }
    break;
        
        // Inside your validateTab function, REPLACE the 'education' case block

case 'education':
    // A helper function to check if a single education entry is complete and valid
    const isEducationEntryComplete = (edu: any) => {
        const isInstituteFilled = edu.institute && edu.institute.trim() !== '';
        const isYearValid = edu.year_completed && /^\d{4}$/.test(edu.year_completed.trim());
        return isInstituteFilled && isYearValid;
    };

    // Check if at least one of the education entries is fully completed.
    // If it is, the validation passes immediately.
    if (formData.education.some(isEducationEntryComplete)) {
        break; // Validation successful, proceed to the next step.
    }

    // If we reach here, it means NO entries are complete.
    // Now, we check if the user has started typing in any of the fields.
    const hasAnyInput = formData.education.some(edu => 
        (edu.institute && edu.institute.trim() !== '') || 
        (edu.year_completed && edu.year_completed.trim() !== '')
    );

    // If the user started filling out a row but didn't complete it, give a more specific error.
    if (hasAnyInput) {
        toast.error("Please complete at least one entry. Both Institute Name and a valid 4-digit Year are required.");
        return false;
    }

    // If all fields are completely empty, give the primary error message.
    toast.error("Please fill out at least one complete education entry (e.g., SSC, HSC, or Degree).");
    return false;

case 'bank-details':
    // All fields in this section are now mandatory.
    if (!formData.bankDetails.accountHolderName.trim()) {
        toast.error("Bank Details: Account holder name is required.");
        return false;
    }
    if (!formData.bankDetails.accountNumber.trim()) {
        toast.error("Bank Details: Account number is required.");
        return false;
    }
    if (!formData.bankDetails.bankName.trim()) {
        toast.error("Bank Details: Bank name is required.");
        return false;
    }
    if (!formData.bankDetails.branchName.trim()) {
        toast.error("Bank Details: Branch name is required.");
        return false;
    }
    if (!formData.bankDetails.ifscCode.trim() || !VALIDATIONS.ifsc.test(formData.bankDetails.ifscCode)) {
        toast.error("Bank Details: A valid IFSC code is required.");
        return false;
    }
    if (!formData.bankDetails.branchAddress?.trim()) {
        toast.error("Bank Details: Branch address is required.");
        return false;
    }
    if (!formData.bankDetails.country?.trim()) {
        toast.error("Bank Details: Country is required.");
        return false;
    }
    if (!formData.bankDetails.state?.trim()) {
        toast.error("Bank Details: State is required.");
        return false;
    }
    if (!formData.bankDetails.city?.trim()) {
        toast.error("Bank Details: City is required.");
        return false;
    }
    if (!formData.bankDetails.zipCode?.trim()) {
        toast.error("Bank Details: ZIP code is required.");
        return false;
    }
    if (!formData.bankDetails.documentUrl?.trim()) {
        toast.error("Bank Details: Please upload a bank document (Passbook/Cancelled Cheque).");
        return false;
    }
    break;

// Find the `validateTab` function and REPLACE the `case 'documents':` block with this

case 'documents':
    // --- VALIDATE AADHAR ONLY IF THE TOGGLE IS OFF ---
    if (!noAadhar) {
        if (!formData.aadharNumber.trim() || !VALIDATIONS.aadhar.test(formData.aadharNumber)) {
            newErrors.aadharNumber = "A valid 12-digit Aadhar number is required.";
        }
        if (!formData.aadharUrl.trim()) {
            toast.error("Please upload your Aadhar document.");
        }
    }
    // If noAadhar is true, we simply skip the validation for Aadhar and alternatives.

    // --- ALWAYS VALIDATE PAN (MANDATORY) ---
    if (!formData.panNumber.trim() || !VALIDATIONS.pan.test(formData.panNumber)) {
        newErrors.panNumber = "A valid PAN number is required.";
    }
    if (!formData.panUrl.trim()) {
        toast.error("Please upload your PAN document.");
    }
    
    // Validate optional statutory docs only if user has entered text
    if (formData.esicNumber.trim() && !VALIDATIONS.esic.test(formData.esicNumber)) {
        newErrors.esicNumber = "The ESIC number format is incorrect.";
    }
    if (formData.uanNumber.trim() && !VALIDATIONS.uan.test(formData.uanNumber)) {
        newErrors.uanNumber = "A valid 12-digit UAN number is required.";
    }
    
    break;
    }
    
    setFormErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
        toast.error("Please fix the errors on the page.");
        return false;
    }
    
    return true;
};



const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  
if (!validateTab(activeTab)) {
    return;
  }
  if (!id) {
    toast.error("Cannot save profile. User ID is missing.");
    return;
  }

    try {
      setLoading(true);

      // Prepare employee data for hr_employees table
// Prepare employee data for hr_employees table
      const employeeData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        personal_email: formData.personalEmail,
        phone: formData.phone,
        employee_id: formData.employeeId,
        department_id: formData.department,
        designation_id: formData.designation,
        position: formData.position,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender,
        marital_status: formData.maritalStatus,
        blood_group: formData.bloodGroup,
        employment_status: formData.employmentStatus,
        hire_type: formData.hire_type,
        contract_duration: formData.contractDuration || null,
        payment_basis: formData.paymentBasis || null,
        hours_per_week: formData.hoursPerWeek || null,
        internship_duration: formData.internshipDuration || null,
        salary: formData.salary ? parseFloat(parseINR(formData.salary)) : null,
        salary_type: formData.salary_type,
        joining_date: formData.joining_date || null,
        
        // =============================================
        // START: CORRECTED DOCUMENT FIELDS
        // =============================================
        
        // Aadhar fields are saved only if the "I don't have this" toggle is OFF
        aadhar_number: !noAadhar ? formData.aadharNumber || null : null,
        aadhar_url: !noAadhar ? formData.aadharUrl || null : null,

        // PAN is always saved
        pan_number: formData.panNumber || null,
        pan_url: formData.panUrl || null,
        
        // Save alternative documents directly to their specific database columns
        voter_id_number: formData.voterIdNumber || null,
        voter_id_url: formData.voterIdUrl || null,
        driving_license_number: formData.drivingLicenseNumber || null,
        driving_license_url: formData.drivingLicenseUrl || null,
        passport_number: formData.passportNumber || null,
        passport_url: formData.passportUrl || null,
        
        // Use the database's 'aadhar_alternative_*' fields to store the "Other" document details
        aadhar_alternative_type: formData.otherIdName || null,
        aadhar_alternative_number: formData.otherIdNumber || null,
        aadhar_alternative_url: formData.otherIdUrl || null,

        // Statutory documents
        esic_number: formData.esicNumber || null,
        uan_number: formData.uanNumber || null,
        esic_url: formData.esicUrl || null,
        uan_url: formData.uanUrl || null,
        
        // =============================================
        // END: CORRECTED DOCUMENT FIELDS
        // =============================================

        profile_picture_url: formData.profilePictureUrl,
        organization_id: organizationId,

        // JSONB fields
        present_address: {
          addressLine1: formData.presentAddress.addressLine1,
          addressLine2: formData.presentAddress.addressLine2,
          country: formData.presentAddress.country,
          state: formData.presentAddress.state,
          city: formData.presentAddress.city,
          zipCode: formData.presentAddress.zipCode
        },
        permanent_address: {
          addressLine1: formData.permanentAddress.addressLine1,
          addressLine2: formData.permanentAddress.addressLine2,
          country: formData.permanentAddress.country,
          state: formData.permanentAddress.state,
          city: formData.permanentAddress.city,
          zipCode: formData.permanentAddress.zipCode
        },
        emergency_contacts: formData.emergencyContacts.map(contact => ({
          relationship: contact.relationship,
          name: contact.name,
          phone: contact.phone
        })),
        family_details: formData.familyMembers.map(member => ({
          relationship: member.relationship,
          name: member.name,
          occupation: member.occupation,
          phone: member.phone
        })),
        
        updated_at: new Date().toISOString()
      };

      let employeeId: string;

      if (id) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from("hr_employees")
          .update(employeeData)
          .eq("id", id);

        if (updateError) throw updateError;
        employeeId = id;
      } else {
        // Insert new employee
        const { data: newEmployee, error: insertError } = await supabase
          .from("hr_employees")
          .insert([employeeData])
          .select()
          .single();

        if (insertError) throw insertError;
        employeeId = newEmployee.id;
      }

      // Save education (if hr_employee_education table exists)
      try {
        await saveEducation(employeeId);
      } catch (e) {
        console.log("Skipping education save:", e);
      }

      // Save experience (if hr_employee_experience table exists)
      try {
        await saveExperience_DB(employeeId);
      } catch (e) {
        console.log("Skipping experience save:", e);
      }

      // Save bank details (if hr_bank_details table exists)
      try {
        await saveBankDetails(employeeId);
      } catch (e) {
        console.log("Skipping bank details save:", e);
      }

      toast.success(id ? "Employee updated successfully" : "Employee created successfully");

        const tabs = ["personal", "address", "contact", "education", "bank-details", "documents"];
      const currentIndex = tabs.indexOf(activeTab);

      if (currentIndex < tabs.length - 1) {
          // If we are NOT on the last tab, simply move to the next one.
          setActiveTab(tabs[currentIndex + 1]);
      } else {
          // If we ARE on the last tab ("documents"), the flow is complete.
          // Navigate back to the overview page to see the updated percentage.
          toast.success("Profile updated! Returning to overview.");
          navigate('/complete-profile');
      }
      
    } catch (error: any) {
      console.error("Error saving employee:", error);
      toast.error(error.message || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  // Addresses, emergency contacts, and family members are now saved as JSONB in hr_employees table
  // No separate save functions needed

  const saveEducation = async (employeeId: string) => {
    try {
      // Delete existing education to prevent duplicates
      await supabase
        .from("hr_employee_education")
        .delete()
        .eq("employee_id", employeeId);

      // Filter out any empty education records
      const educationToSave = formData.education
        .filter(edu => edu.institute && edu.institute.trim() !== '')
        .map(edu => {
          // Convert the year string (e.g., "2020") to a valid date format ("2020-01-01")
          const yearCompletedDate = edu.year_completed && /^\d{4}$/.test(edu.year_completed)
            ? `${edu.year_completed}-01-01`
            : null;
          
          // *** CORRECTION: Use the exact column names from your schema ***
          return {
            employee_id: employeeId,
            organization_id: organizationId,
            type: edu.type,
            institute: edu.institute,
            year_completed: yearCompletedDate, // This now correctly maps to your 'date' column
            document_url: edu.documentUrl || null
          };
        });

      // Only insert if there are valid records to save
      if (educationToSave.length > 0) {
        const { error } = await supabase
          .from("hr_employee_education")
          .insert(educationToSave);

        if (error) {
          console.error("Error saving education:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to save education:", error);
      throw error;
    }
  };


  // Add this new function inside your EmployeeOnboard component
 const handleProfilePictureUpdate = async (url: string) => {
    // 1. Update the form's state immediately so the UI shows the new image
    handleInputChange("profilePictureUrl", url);

    try {
      // 2. Save the new URL directly to the database for this employee
      const { error } = await supabase
        .from("hr_employees")
        .update({ profile_picture_url: url })
        .eq("id", id); // 'id' is the employee's ID from the URL params

      if (error) {
        throw error; // If there's an error, jump to the catch block
      }

      // 3. Only show the success message AFTER the database has been updated
      toast.success("Profile image updated successfully!");

    } catch (error: any) {
      console.error("Error saving profile picture URL:", error);
      toast.error("Failed to save profile picture. Please try again.");
    }
  };

 const saveExperience_DB = async (employeeId: string) => {
    try {
      await supabase
        .from("hr_employee_experiences")
        .delete()
        .eq("employee_id", employeeId);

      // Filter out any empty experiences and map with the CORRECT column names
 const experiencesToSave = formData.experiences
        .filter(exp => exp.company && exp.position)
        .map(exp => ({
          employee_id: employeeId,
          organization_id: organizationId,
          company: exp.company,
          // ✅ CORRECT: component 'position' -> database 'job_title'
          job_title: exp.position,
          // ✅ CORRECT: component 'jobType' -> database 'employment_type'
          employment_type: exp.jobType,
          location: exp.location || null,
          // ✅ CORRECT: component 'startDate' -> database 'start_date'
          start_date: exp.startDate || null,
          // ✅ CORRECT: component 'endDate' -> database 'end_date'
          end_date: exp.endDate || null,
          offer_letter_url: exp.offerLetterUrl || null,
          separation_letter_url: exp.separationLetterUrl || null,
          payslip_1_url: exp.payslip_1_url || null,
          payslip_2_url: exp.payslip_2_url || null,
          payslip_3_url: exp.payslip_3_url || null,
          hike_letter_url: exp.hikeLetterUrl || null,
          no_separation_letter_reason: exp.noSeparationLetterReason || null,
          no_payslip_reason: exp.noPayslipReason || null
        }));

      if (experiencesToSave.length > 0) {
        const { error } = await supabase
          .from("hr_employee_experiences")
          .insert(experiencesToSave);
        if (error) throw error;
      }

    } catch (error) {
      console.log("Experience table may not exist or failed to save, skipping.", error);
    }
  };
  const saveBankDetails = async (employeeId: string) => {
    try {
      // ✅ FIX: Only save if required fields are filled!
      // Check if at least account number and bank name are provided
      if (!formData.bankDetails.accountNumber || !formData.bankDetails.bankName) {
        console.log("Bank details not provided, skipping save");
        return; // Don't save empty bank details
      }

      // Check if bank details exist
      const { data: existingBank } = await supabase
        .from("hr_employee_bank_details")  // ✅ Correct table name!
        .select("id")
        .eq("employee_id", employeeId)
        .single();

      const bankData = {
        employee_id: employeeId,
        organization_id: organizationId,  // ✅ Added required field!
        account_holder_name: formData.bankDetails.accountHolderName,
        account_number: formData.bankDetails.accountNumber,
        bank_name: formData.bankDetails.bankName,
        branch_name: formData.bankDetails.branchName,
        ifsc_code: formData.bankDetails.ifscCode,
        account_type: formData.bankDetails.accountType,
        branch_address: formData.bankDetails.branchAddress || null,
        country: formData.bankDetails.country,
        state: formData.bankDetails.state,
        city: formData.bankDetails.city,
        zip_code: formData.bankDetails.zipCode,
        document_url: formData.bankDetails.documentUrl || null
      };

      if (existingBank) {
        // Update existing bank details
        const { error } = await supabase
          .from("hr_employee_bank_details")
          .update(bankData)
          .eq("id", existingBank.id);

        if (error) {
          console.error("Error updating bank details:", error);
          throw error;
        }
      } else {
        // Insert new bank details
        const { error } = await supabase
          .from("hr_employee_bank_details")
          .insert([bankData]);

        if (error) {
          console.error("Error inserting bank details:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to save bank details:", error);
      // Don't throw, just log - bank details are optional
    }
  };

// ADD this constant inside your EmployeeOnboard component, before the 'return' statement

// Update this constant at the top of your component if you are using the "Other" input logic
const bloodGroupOptions = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-",
  "A1+", "A1-", "A2+", "A2-", "A1B+", "A1B-", "A2B+", "A2B-",
  "Bombay (hh)", "Unknown", ""
];

  return (
    <div className="container mx-auto p-6 max-w-8xl">
      <style>{`
        /* Clean Input Styles - No 3D Effects */
        .form-3d-input {
          position: relative;
          transition: all 0.2s ease;
        }

        .form-3d-input input,
        .form-3d-input textarea,
        .form-3d-input select,
        .form-3d-input [role="combobox"] {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          padding: 12px 16px;
          font-size: 14px;
          min-height: 44px;
        }

        .form-3d-input input:hover,
        .form-3d-input textarea:hover,
        .form-3d-input select:hover,
        .form-3d-input [role="combobox"]:hover {
          border-color: #d1d5db;
        }

        .form-3d-input input:focus,
        .form-3d-input textarea:focus,
        .form-3d-input select:focus,
        .form-3d-input [role="combobox"]:focus {
          border-color: #9ca3af;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
          outline: none;
        }

        /* Simple Label */
        .form-3d-label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Simple Pill-shaped Tabs */
        .animated-tabs-list {
          background: #f3f4f6;
          padding: 4px;
          border-radius: 50px;
          display: inline-flex;
          gap: 2px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          position: relative;
        }

        .animated-tab-trigger {
          padding: 4px 12px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 12px;
          color: #6b7280;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .animated-tab-trigger:hover {
          color: #374151;
          background: #e5e7eb;
        }

        .animated-tab-trigger[data-state="active"] {
          color: #ffffff;
          background: #8b5cf6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Simple Tab Content Animation */
        .animated-tab-content {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Simple Card Style */
        .card-3d {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        /* Simple Button Style */
        .button-3d {
          background: #8b5cf6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .button-3d:hover {
          background: #7c3aed;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .button-3d:active {
          transform: scale(0.98);
        }

        /* Select and Combobox Styles */
        .form-3d-input [role="combobox"],
        .form-3d-input button[type="button"] {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-height: 44px;
        }

        /* Radio and Checkbox Styles */
        .form-3d-radio,
        .form-3d-checkbox {
          transition: all 0.2s ease;
        }

        /* Simple Profile Image Upload */
        .profile-upload-3d {
          transition: all 0.2s ease;
        }

        .profile-upload-3d:hover {
          opacity: 0.8;
        }

        /* Simple Section Headers */
        .section-header-3d {
          color: #111827;
          font-weight: 700;
          font-size: 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Simple Separator */
        .separator-3d {
          height: 1px;
          background: #e5e7eb;
          margin: 24px 0;
        }

        @keyframes pulse-gradient {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        /* Error State Animation */
        .form-error {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          animation: shake 0.3s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .form-3d-input.error input,
        .form-3d-input.error textarea,
        .form-3d-input.error select {
          border-color: #ef4444;
          background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
          animation: shake 0.3s ease;
        }
      `}</style>

      <Card className="card-3d">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-8">
        <Button
  variant="ghost"
  // ✅ FIX: Always navigate back to the completion overview page
  onClick={() => navigate(-1)}
  className="hover:bg-purple-50 transition-colors"
>
  <ArrowLeft className="h-5 w-5" />
</Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {id ? "Complete Your Profile" : "Add New Employee"}
            </h1>
          </div>

          {loading && !formData.firstName ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex justify-center">
              <TabsList className="animated-tabs-list mb-8">
                <TabsTrigger value="personal" className="animated-tab-trigger">
                  {/* <User className="h-3.5 w-3.5 mr-1.5" /> */}
                  Personal
                </TabsTrigger>
                <TabsTrigger value="address" className="animated-tab-trigger">
                  Address
                </TabsTrigger>
                <TabsTrigger value="contact" className="animated-tab-trigger">
                  Contact
                </TabsTrigger>
                <TabsTrigger value="education" className="animated-tab-trigger">
                  Education
                </TabsTrigger>
                <TabsTrigger value="bank-details" className="animated-tab-trigger">
                  Bank Details
                </TabsTrigger>
                <TabsTrigger value="documents" className="animated-tab-trigger">
                  Documents
                </TabsTrigger>
              </TabsList>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Personal Tab */}
                <TabsContent value="personal" className="animated-tab-content space-y-6">
                  <h2 className="section-header-3d">
                    <User className="h-5 w-5" />
                    Personal Information
                  </h2>
                  
             

                <div className="profile-upload-3d">
  <ProfileImageUpload
    // ✅ FIX #1: Change 'imageUrl' prop to 'value'
    value={formData.profilePictureUrl}
    
    // This prop is already correct from our previous fix
    onChange={handleProfilePictureUpdate}
    
    // ✅ FIX #2: Change 'employeeName' prop to 'initialLetter' and use the new helper
    initialLetter={getInitials(formData.firstName, formData.lastName)}
  />
</div>

                  <Separator className="separator-3d" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={cn("form-3d-input", formErrors.firstName && "error")}>
                      <Label className="form-3d-label">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Enter first name"
                      />
                      {formErrors.firstName && (
                        <span className="form-error">{formErrors.firstName}</span>
                      )}
                    </div>

                    <div className={cn("form-3d-input", formErrors.lastName && "error")}>
                      <Label className="form-3d-label">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Enter last name"
                      />
                      {formErrors.lastName && (
                        <span className="form-error">{formErrors.lastName}</span>
                      )}
                    </div>

                    <div className={cn("form-3d-input", formErrors.email && "error")}>
                      <Label className="form-3d-label">
                        Official Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="official@example.com"
                      />
                      {formErrors.email && (
                        <span className="form-error">{formErrors.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={cn("form-3d-input", formErrors.personalEmail && "error")}>
                      <Label className="form-3d-label">Personal Email</Label>
                      <Input
                        type="email"
                        value={formData.personalEmail}
                        onChange={(e) => handleInputChange("personalEmail", e.target.value)}
                        placeholder="personal@example.com"
                      />
                      {formErrors.personalEmail && (
                        <span className="form-error">{formErrors.personalEmail}</span>
                      )}
                    </div>

                  <div className={cn("form-3d-input", formErrors.phone && "error")}>
  <Label className="form-3d-label">
    Phone <span className="text-red-500">*</span>
  </Label>
  <PhoneInput
    international
    defaultCountry="IN"
    value={formData.phone}
    onChange={(value) => handleInputChange("phone", value)}
    className="phone-input-3d"
  />
  {formErrors.phone && (
    <span className="form-error">{formErrors.phone}</span>
  )}
</div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Employee ID</Label>
                      <Input
                        value={formData.employeeId}
                        onChange={(e) => handleInputChange("employeeId", e.target.value)}
                        placeholder="Enter employee ID"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn("form-3d-input", formErrors.department && "error")}>
                    <Label className="form-3d-label">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => handleInputChange("department", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}> {/* CORRECT: Use dept.id here */}
                              {dept.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            Loading departments...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.department && (
                      <span className="form-error">{formErrors.department}</span>
                    )}
                  </div>

            {/* THIS IS THE NEW, CORRECTED CODE */}
<div className={cn("form-3d-input", formErrors.designation && "error")}>
  <Label className="form-3d-label">
    Designation <span className="text-red-500">*</span>
  </Label>
  <Select
    value={formData.designation}
    onValueChange={(value) => handleInputChange("designation", value)}
  >
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select designation" />
    </SelectTrigger>
    <SelectContent>
      {designations.length > 0 ? (
        designations.map((desig) => (
          <SelectItem key={desig.id} value={desig.id}>
            {desig.name}
          </SelectItem>
        ))
      ) : (
        <SelectItem value="loading" disabled>
          Loading designations...
        </SelectItem>
      )}
    </SelectContent>
  </Select>
  {formErrors.designation && (
    <span className="form-error">{formErrors.designation}</span>
  )}
</div>

                    <div className="form-3d-input">
  <Label className="form-3d-label">Date of Birth</Label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !formData.dateOfBirth && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {formData.dateOfBirth
          // This fix prevents timezone bugs and "Invalid Date" errors
          ? format(new Date(formData.dateOfBirth + 'T00:00:00'), "PPP")
          : <span>Pick a date</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0">
      <Calendar
        mode="single"
        selected={
          formData.dateOfBirth ? new Date(formData.dateOfBirth + 'T00:00:00') : undefined
        }
        onSelect={(date) =>
          handleInputChange("dateOfBirth", date?.toISOString().split("T")[0])
        }
        initialFocus
      />
    </PopoverContent>
  </Popover>
</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="form-3d-input">
  <Label className="form-3d-label">Gender</Label>
  <div className="flex gap-2">
    {['Male', 'Female', 'Prefer not to say'].map((genderOption) => (
      <Button
        key={genderOption}
        type="button"
        variant={formData.gender === genderOption ? "default" : "outline"}
        onClick={() => handleInputChange("gender", genderOption)}
        className={cn(
          "flex-1 justify-center",
          formData.gender === genderOption && "bg-purple-600 text-green-500 hover:bg-purple-700"
        )}
      >
        {genderOption}
      </Button>
    ))}
  </div>
</div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Marital Status</Label>
                      <Select
                        value={formData.maritalStatus}
                        onValueChange={(value) => handleInputChange("maritalStatus", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem> 
                        </SelectContent>
                      </Select>
                    </div>

<div className="form-3d-input">
  <Label className="form-3d-label">Blood Group</Label>
  <Select
    value={!bloodGroupOptions.includes(formData.bloodGroup) ? "Other" : formData.bloodGroup}
    onValueChange={(value) => {
      if (value === "Other") {
        // Set to a temporary value to trigger the input field
        handleInputChange("bloodGroup", "Other");
      } else {
        handleInputChange("bloodGroup", value);
      }
    }}
  >
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select blood group" />
    </SelectTrigger>
<SelectContent>
  <SelectItem value="A+">A+</SelectItem>
  <SelectItem value="A-">A-</SelectItem>
  <SelectItem value="B+">B+</SelectItem>
  <SelectItem value="B-">B-</SelectItem>
  <SelectItem value="O+">O+</SelectItem>
  <SelectItem value="O-">O-</SelectItem>
  <SelectItem value="AB+">AB+</SelectItem>
  <SelectItem value="AB-">AB-</SelectItem>
  <SelectItem value="A1+">A1+</SelectItem>
  <SelectItem value="A1-">A1-</SelectItem>
  <SelectItem value="A2+">A2+</SelectItem>
  <SelectItem value="A2-">A2-</SelectItem>
  <SelectItem value="A1B+">A1B+</SelectItem>
  <SelectItem value="A1B-">A1B-</SelectItem>
  <SelectItem value="A2B+">A2B+</SelectItem>
  <SelectItem value="A2B-">A2B-</SelectItem>
  <SelectItem value="Bombay (hh)">Bombay Blood Group (hh)</SelectItem>
  <SelectItem value="Unknown">Unknown / Not Sure</SelectItem>
</SelectContent>
  </Select>
  
  {/* Conditionally render Input field for "Other" */}
  {(!bloodGroupOptions.includes(formData.bloodGroup) || formData.bloodGroup === 'Other') && (
    <Input
      className="mt-2"
      placeholder="Please specify your blood group"
      value={formData.bloodGroup === 'Other' ? '' : formData.bloodGroup}
      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
      autoFocus
    />
  )}
</div>
                  </div>

                  <Separator className="separator-3d" />

                  <h3 className="section-header-3d text-base">Employment Details</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="form-3d-input">

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Joining Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.joining_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.joining_date
                              ? format(new Date(formData.joining_date), "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              formData.joining_date ? new Date(formData.joining_date) : undefined
                            }
                            onSelect={(date) =>
                              handleInputChange("joining_date", date?.toISOString().split("T")[0])
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
  {/* <Label className="form-3d-label">Employment Status</Label> */}
  {/* <Select
    value={formData.employmentStatus}
    onValueChange={(value) => handleInputChange("employmentStatus", value)}
  >
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Active">Active</SelectItem>
      <SelectItem value="Inactive">Inactive</SelectItem>
    </SelectContent>
  </Select> */}
</div>

                    {/* <div className={cn("form-3d-input", formErrors.hire_type && "error")}>
                      <Label className="form-3d-label">
                        Hire Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.hire_type}
                        onValueChange={(value) => handleInputChange("hire_type", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Time">Full Time</SelectItem>
                          <SelectItem value="Part Time">Part Time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.hire_type && (
                        <span className="form-error">{formErrors.hire_type}</span>
                      )}
                    </div>

                    {formData.hire_type === "Contract" && (
                      <div className="form-3d-input">
                        <Label className="form-3d-label">Duration (months)</Label>
                        <Input
                          type="number"
                          value={formData.contractDuration}
                          onChange={(e) => handleInputChange("contractDuration", e.target.value)}
                          placeholder="e.g., 3"
                        />
                      </div>
                    )}

                    {formData.hire_type === "Internship" && (
                      <div className="form-3d-input">
                        <Label className="form-3d-label">Duration (months)</Label>
                        <Input
                          type="number"
                          value={formData.internshipDuration}
                          onChange={(e) => handleInputChange("internshipDuration", e.target.value)}
                          placeholder="e.g., 3"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={cn("form-3d-input", formErrors.salary && "error")}>
                      <Label className="form-3d-label">
                        {formData.hire_type === "Internship" ? "Stipend" : "Salary"} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.salary ? formatINR(formData.salary) : ""}
                        onChange={(e) => {
                          const parsed = parseINR(e.target.value);
                          handleInputChange("salary", parsed);
                        }}
                        placeholder="₹"
                      />
                      {formErrors.salary && (
                        <span className="form-error">{formErrors.salary}</span>
                      )}
                    </div>

                    <div className="form-3d-input">
  <Label className="form-3d-label">Salary Type</Label>
  <Select
    value={formData.salary_type}
    onValueChange={(value) => handleInputChange("salary_type", value)}
  >
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select type" />
    </SelectTrigger>
    <SelectContent>
      {formData.hire_type === "Internship" ? (
        <SelectItem value="Stipend">Stipend</SelectItem>
      ) : (
        <>
          <SelectItem value="LPA">LPA</SelectItem>
          <SelectItem value="Per Month">Per Month</SelectItem>
        </>
      )}
    </SelectContent>
  </Select>
</div> */}

                  </div>
                </TabsContent>

                {/* Other tabs content remains the same but wrapped with form-3d-input classes */}
                {/* For brevity, I'll include the Address tab as an example */}
                
                <TabsContent value="address" className="animated-tab-content space-y-6">
                  <h2 className="section-header-3d">Address Information</h2>

                  <h3 className="text-lg font-semibold text-gray-700">Present Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Address Line 1</Label>
                      <Input
                        value={formData.presentAddress.addressLine1}
                        onChange={(e) =>
                          handleAddressChange("presentAddress", "addressLine1", e.target.value)
                        }
                        placeholder="Enter address"
                      />
                    </div>

                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Address Line 2</Label>
                      <Input
                        value={formData.presentAddress.addressLine2 || ""}
                        onChange={(e) =>
                          handleAddressChange("presentAddress", "addressLine2", e.target.value)
                        }
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Country</Label>
                      <Select
                        value={formData.presentAddress.country}
                        onValueChange={(value) =>
                          handleAddressChange("presentAddress", "country", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.isoCode} value={country.name}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">State</Label>
                      <Select
                        value={formData.presentAddress.state}
                        onValueChange={(value) =>
                          handleAddressChange("presentAddress", "state", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {presentStates.map((state) => (
                            <SelectItem key={state.isoCode} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">City</Label>
                      <Select
                        value={formData.presentAddress.city}
                        onValueChange={(value) =>
                          handleAddressChange("presentAddress", "city", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {presentCities.map((city) => (
                            <SelectItem key={city.name} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">ZIP Code</Label>
                      <Input
                        value={formData.presentAddress.zipCode}
                        onChange={(e) =>
                          handleAddressChange("presentAddress", "zipCode", e.target.value)
                        }
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>

                 

                  <Separator className="separator-3d" />

                 {/* --- MODIFIED PERMANENT ADDRESS SECTION --- */}
                  <h3 className="text-lg font-semibold text-gray-700 flex justify-between items-center">
                    <span>Permanent Address</span>
                    {/* This is the new, correct location for the checkbox */}
                    <div className="flex items-center gap-2">
                       <Checkbox
                          id="sameAsPresent"
                          checked={isSameAsPresent}
                          onCheckedChange={handleSameAsPresentChange}
                          className="form-3d-checkbox"
                       />
                       <Label htmlFor="sameAsPresent" className="text-sm font-medium">
                          Same as Present Address
                       </Label>
                    </div>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Address Line 1</Label>
                      <Input
                        value={formData.permanentAddress.addressLine1}
                        onChange={(e) =>
                          handleAddressChange("permanentAddress", "addressLine1", e.target.value)
                        }
                        placeholder="Enter address"
                        disabled={isSameAsPresent} // Add this
                      />
                    </div>

                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Address Line 2</Label>
                      <Input
                        value={formData.permanentAddress.addressLine2 || ""}
                        onChange={(e) =>
                          handleAddressChange("permanentAddress", "addressLine2", e.target.value)
                        }
                        placeholder="Apartment, suite, etc. (optional)"
                        disabled={isSameAsPresent} // Add this
                      />
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Country</Label>
                      <Select
                        value={formData.permanentAddress.country}
                        onValueChange={(value) =>
                          handleAddressChange("permanentAddress", "country", value)
                        }
                        disabled={isSameAsPresent} // Add this
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.isoCode} value={country.name}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">State</Label>
                      <Select
                        value={formData.permanentAddress.state}
                        onValueChange={(value) =>
                          handleAddressChange("permanentAddress", "state", value)
                        }
                        disabled={isSameAsPresent} // Add this
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {permanentStates.map((state) => (
                            <SelectItem key={state.isoCode} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">City</Label>
                      <Select
                        value={formData.permanentAddress.city}
                        onValueChange={(value) =>
                          handleAddressChange("permanentAddress", "city", value)
                        }
                        disabled={isSameAsPresent} // Add this
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {permanentCities.map((city) => (
                            <SelectItem key={city.name} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">ZIP Code</Label>
                      <Input
                        value={formData.permanentAddress.zipCode}
                        onChange={(e) =>
                          handleAddressChange("permanentAddress", "zipCode", e.target.value)
                        }
                        placeholder="Enter ZIP code"
                        disabled={isSameAsPresent} // Add this
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Continue with other tabs... */}
                {/* I'll add Contact, Education, Bank Details, and Documents tabs with the same styling */}
                
                <TabsContent value="contact" className="animated-tab-content space-y-6">
                  <h2 className="section-header-3d">Contact Information</h2>

                  <h3 className="text-lg font-semibold text-gray-700">Emergency Contacts</h3>
                  {formData.emergencyContacts.map((contact, index) => (
                    <div key={index} className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 space-y-4 relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEmergencyContact(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-3d-input">
                          <Label className="form-3d-label">Relationship</Label>
                          <Input
                            value={contact.relationship}
                            onChange={(e) =>
                              handleEmergencyContactChange(index, "relationship", e.target.value)
                            }
                            placeholder="e.g., Father, Mother"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Name</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) =>
                              handleEmergencyContactChange(index, "name", e.target.value)
                            }
                            placeholder="Enter name"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Phone</Label>
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={contact.phone}
                            onChange={(value) =>
                              handleEmergencyContactChange(index, "phone", value || "")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                <Button
  type="button"
  onClick={addEmergencyContact}
  variant="link"
  className="text-purple-600 p-0 h-auto"
>
  <Plus className="h-4 w-4 mr-2" />
  Add Emergency Contact
</Button>

                  <Separator className="separator-3d" />

                  <h3 className="text-lg font-semibold text-gray-700">Family Members</h3>
                  {formData.familyMembers.map((member, index) => (
                    <div key={index} className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 space-y-4 relative">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFamilyMember(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="form-3d-input">
                          <Label className="form-3d-label">Relationship</Label>
                          <Input
                            value={member.relationship}
                            onChange={(e) =>
                              handleFamilyMemberChange(index, "relationship", e.target.value)
                            }
                            placeholder="e.g., Spouse, Child"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Name</Label>
                          <Input
                            value={member.name}
                            onChange={(e) =>
                              handleFamilyMemberChange(index, "name", e.target.value)
                            }
                            placeholder="Enter name"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Occupation</Label>
                          <Input
                            value={member.occupation}
                            onChange={(e) =>
                              handleFamilyMemberChange(index, "occupation", e.target.value)
                            }
                            placeholder="Enter occupation"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Phone</Label>
                          <PhoneInput
                            international
                            defaultCountry="IN"
                            value={member.phone}
                            onChange={(value) =>
                              handleFamilyMemberChange(index, "phone", value || "")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
        <Button
  type="button"
  onClick={addFamilyMember}
  variant="link"
  className="text-purple-600 p-0 h-auto"
>
  <Plus className="h-4 w-4 mr-2" />
  Add Family Member
</Button>
                </TabsContent>

                <TabsContent value="education" className="animated-tab-content space-y-6">
                  <h2 className="section-header-3d">Education Details</h2>

                  {formData.education.map((edu, index) => (
                    <div key={index} className={`p-6 rounded-xl space-y-4 ${educationColors[index]}`}>
                      <h3 className="font-semibold text-gray-700 mb-4">{edu.type}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-3d-input">
                          <Label className="form-3d-label">Institute Name</Label>
                          <Input
                            value={edu.institute || ""}
                            onChange={(e) =>
                              handleEducationChange(index, "institute", e.target.value)
                            }
                            placeholder="Enter institute name"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Year Completed</Label>
                          <Input
                            value={edu.year_completed || ""}
                            onChange={(e) =>
                              handleEducationChange(index, "year_completed", e.target.value)
                            }
                            placeholder="e.g., 2020"
                          />
                        </div>

                        <div className="form-3d-input">
                          <Label className="form-3d-label">Document</Label>
                          <div className="flex gap-3 items-center">
                            <input
                              type="file"
                              id={`education-${index}`}
                              className="sr-only"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={uploadingFile !== null}
                              onChange={(event) => handleEducationUpload(event, index)}
                            />
                            <Label
                              htmlFor={`education-${index}`}
                              className={cn(
                                "cursor-pointer text-purple-600 hover:underline",
                                uploadingFile && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {uploadingFile === `education-${index}` ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="animate-spin w-4 h-4" /> Uploading...
                                </span>
                              ) : (
                                "+ Upload File"
                              )}
                            </Label>
                            {edu.documentUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(edu.documentUrl, "_blank")}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator className="separator-3d" />

                  <h3 className="text-lg font-semibold text-gray-700">Work Experience</h3>
                  {formData.experiences.map((exp, index) => (
                    <div key={exp.id || index} className="relative border-2 border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExperience(index)}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 hover:bg-red-50 z-10"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      {/* Header Section */}
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                        <div className="flex items-start gap-3">
                          <div className="bg-white/20 rounded-lg p-2">
                            <Briefcase className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold">{exp.position || "Position Not Specified"}</h4>
                            <div className="flex items-center gap-2 mt-1 text-purple-100">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">{exp.jobType || "Not Specified"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Company & Duration */}
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-600" />
                            <div>
                              <p className="font-semibold text-gray-800">
                                {exp.company || "Company Not Specified"}
                              </p>
                              {exp.location && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {exp.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                             <CalendarIcon className="w-4 h-4" />
                              {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                              {" - "}
                              {exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Documents Section */}
                      <div className="p-4 space-y-3">
                        <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documents Status
                        </h5>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {/* Offer Letter */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.offerLetterUrl ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Offer Letter</span>
                              <span className="text-red-500 text-xs">*</span>
                            </div>
                            {exp.offerLetterUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.offerLetterUrl, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Nil</span>
                            )}
                          </div>

                          {/* Separation Letter */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.separationLetterUrl ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Separation Letter</span>
                            </div>
                            {exp.separationLetterUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.separationLetterUrl, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : exp.noSeparationLetterReason ? (
                              <span className="text-xs text-amber-600 italic">{exp.noSeparationLetterReason}</span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Nil</span>
                            )}
                          </div>

                          {/* Payslip 1 */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.payslip_1_url ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Payslip 1</span>
                              <span className="text-red-500 text-xs">*</span>
                            </div>
                            {exp.payslip_1_url ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.payslip_1_url, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : exp.noPayslipReason ? (
                              <span className="text-xs text-amber-600 italic">{exp.noPayslipReason}</span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Nil</span>
                            )}
                          </div>

                          {/* Payslip 2 */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.payslip_2_url ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Payslip 2</span>
                              <span className="text-red-500 text-xs">*</span>
                            </div>
                            {exp.payslip_2_url ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.payslip_2_url, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : exp.noPayslipReason ? (
                              <span className="text-xs text-amber-600 italic">{exp.noPayslipReason}</span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Nil</span>
                            )}
                          </div>

                          {/* Payslip 3 */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.payslip_3_url ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Payslip 3</span>
                              <span className="text-red-500 text-xs">*</span>
                            </div>
                            {exp.payslip_3_url ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.payslip_3_url, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : exp.noPayslipReason ? (
                              <span className="text-xs text-amber-600 italic">{exp.noPayslipReason}</span>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Nil</span>
                            )}
                          </div>

                          {/* Hike Letter */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                exp.hikeLetterUrl ? "bg-green-500" : "bg-gray-300"
                              )} />
                              <span className="text-sm font-medium text-gray-700">Hike Letter</span>
                            </div>
                            {exp.hikeLetterUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(exp.hikeLetterUrl, "_blank")}
                                className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500 italic">N/A</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit Button */}
                      <div className="p-4 bg-gray-50 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openExperienceModal(index)}
                          className="w-full hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Experience
                        </Button>
                      </div>
                    </div>
                  ))}

                <Button
  type="button"
  onClick={() => openExperienceModal()}
  variant="link"
  className="text-purple-600 p-0 h-auto"
>
  <Plus className="h-4 w-4 mr-2" />
  Add Work Experience
</Button>
                </TabsContent>

                <TabsContent value="bank-details" className="animated-tab-content space-y-6">
                  <h2 className="section-header-3d">Bank Details</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-3d-input">
                      <Label className="form-3d-label">Account Holder Name</Label>
                      <Input
                        value={formData.bankDetails.accountHolderName}
                        onChange={(e) =>
                          handleBankDetailsChange("accountHolderName", e.target.value)
                        }
                        placeholder="Enter account holder name"
                      />
                    </div>

                  <div className="form-3d-input">
  <Label className="form-3d-label">Account Number</Label>
  <Input
    value={formData.bankDetails.accountNumber}
    onChange={(e) =>
      handleBankDetailsChange("accountNumber", e.target.value)
    }
    placeholder="Enter account number"
  />
  {formData.bankDetails.accountNumber.length > 5 && (
    <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </div>
  )}
</div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Bank Name</Label>
                      <Input
                        value={formData.bankDetails.bankName}
                        onChange={(e) =>
                          handleBankDetailsChange("bankName", e.target.value)
                        }
                        placeholder="Enter bank name"
                      />
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Branch Name</Label>
                      <Input
                        value={formData.bankDetails.branchName}
                        onChange={(e) =>
                          handleBankDetailsChange("branchName", e.target.value)
                        }
                        placeholder="Enter branch name"
                      />
                    </div>

     <div className="form-3d-input">
  <Label className="form-3d-label">IFSC Code</Label>
  <Input
    value={formData.bankDetails.ifscCode}
    onChange={(e) =>
      handleBankDetailsChange("ifscCode", e.target.value.toUpperCase())
    }
    placeholder="Enter IFSC code"
  />
  {/* --- Start of UI Update --- */}
  {isVerifyingIfsc ? (
    <div className="flex items-center gap-1 text-blue-600 text-xs mt-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Verifying...
    </div>
  ) : (
    VALIDATIONS.ifsc.test(formData.bankDetails.ifscCode) && formData.bankDetails.bankName && (
      <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </div>
    )
  )}
  {/* --- End of UI Update --- */}
</div>
                    <div className="form-3d-input">
                      <Label className="form-3d-label">Account Type</Label>
                      <Select
                        value={formData.bankDetails.accountType}
                        onValueChange={(value) =>
                          handleBankDetailsChange("accountType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Savings">Savings</SelectItem>
                          <SelectItem value="Current">Current</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Branch Address</Label>
                      <Textarea
                        value={formData.bankDetails.branchAddress || ""}
                        onChange={(e) =>
                          handleBankDetailsChange("branchAddress", e.target.value)
                        }
                        placeholder="Enter branch address"
                        rows={3}
                      />
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">Country</Label>
                      <Select
                        value={formData.bankDetails.country}
                        onValueChange={(value) =>
                          handleBankDetailsChange("country", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.isoCode} value={country.name}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">State</Label>
                      <Select
                        value={formData.bankDetails.state}
                        onValueChange={(value) =>
                          handleBankDetailsChange("state", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankStates.map((state) => (
                            <SelectItem key={state.isoCode} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">City</Label>
                      <Select
                        value={formData.bankDetails.city}
                        onValueChange={(value) =>
                          handleBankDetailsChange("city", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankCities.map((city) => (
                            <SelectItem key={city.name} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-3d-input">
                      <Label className="form-3d-label">ZIP Code</Label>
                      <Input
                        value={formData.bankDetails.zipCode || ""}
                        onChange={(e) =>
                          handleBankDetailsChange("zipCode", e.target.value)
                        }
                        placeholder="Enter ZIP code"
                      />
                    </div>

                    <div className="form-3d-input md:col-span-2">
                      <Label className="form-3d-label">Bank Document (Passbook/Cancelled Cheque)</Label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="file"
                          id="bankDocument"
                          className="sr-only"
                          accept=".pdf,.png,.jpg,.jpeg"
                          disabled={uploadingFile !== null}
                          onChange={handleBankDocumentUpload}
                        />
                        <Label
                          htmlFor="bankDocument"
                          className={cn(
                            "cursor-pointer text-purple-600 hover:underline",
                            uploadingFile && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {uploadingFile === "bankDocument" ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="animate-spin w-4 w-4" /> Uploading...
                            </span>
                          ) : (
                            "+ Upload File"
                          )}
                        </Label>
                        {formData.bankDetails.documentUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(formData.bankDetails.documentUrl, "_blank")
                            }
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

 <TabsContent value="documents" className="animated-tab-content space-y-6">
  <h2 className="section-header-3d">Identity Documents</h2>

  {/* ==================== AADHAR SECTION ==================== */}
  <div className="p-4 border rounded-lg bg-gray-50">
    <div className="flex items-center justify-between mb-4">
      <Label className="font-semibold text-lg text-gray-800">Aadhar Details</Label>
      <div className="flex items-center gap-2">
        <Label htmlFor="noAadharSwitch" className="text-sm">I don't have this</Label>
        <Switch id="noAadharSwitch" checked={noAadhar} onCheckedChange={setNoAadhar} />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="form-3d-input">
        <Label className="form-3d-label">
          Aadhar Number
          {/* Mandatory star appears only if the toggle is OFF */}
          {!noAadhar && <span className="text-red-500">*</span>}
        </Label>
        <Input
          value={formData.aadharNumber}
          onChange={(e) => handleInputChange("aadharNumber", e.target.value)}
          placeholder="Enter 12-digit Aadhar number"
          maxLength={12}
          disabled={noAadhar} // Field is disabled when toggle is ON
        />
        {formErrors.aadharNumber && !noAadhar && <span className="form-error">{formErrors.aadharNumber}</span>}
        {VALIDATIONS.aadhar.test(formData.aadharNumber) && !noAadhar && <div className="flex items-center gap-1 text-green-600 text-xs mt-1"><CheckCircle2 className="h-3 w-3" />Verified</div>}
      </div>
      <div className="form-3d-input">
        <Label className="form-3d-label">
          Aadhar Document
          {!noAadhar && <span className="text-red-500">*</span>}
        </Label>
        <div className="flex gap-3 items-center">
          <input type="file" id="aadharUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "aadharUrl")} disabled={noAadhar} />
          <Label htmlFor="aadharUrl" className={cn("cursor-pointer text-purple-600 hover:underline", noAadhar && "opacity-50 cursor-not-allowed")}>
            {uploadingFile === "aadharUrl" ? "Uploading..." : "+ Upload File"}
          </Label>
          {formData.aadharUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.aadharUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  </div>


  {/* ==================== ALTERNATIVE DOCUMENTS (Appear if no Aadhar) ==================== */}
  {noAadhar && (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-center text-gray-600 p-2 bg-blue-50 rounded-md">You can provide any of the following documents as an alternative.</p>
      
      {/* --- Voter ID --- */}
      <div className="p-4 border rounded-lg">
        <Label className="font-semibold text-gray-800 mb-4 block">Voter ID Card</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-3d-input">
            <Label className="form-3d-label">Voter ID Number</Label>
            <Input value={formData.voterIdNumber} onChange={(e) => handleInputChange("voterIdNumber", e.target.value.toUpperCase())} />
          </div>
          <div className="form-3d-input">
            <Label className="form-3d-label">Voter ID Document</Label>
            <div className="flex gap-3 items-center">
              <input type="file" id="voterIdUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "voterIdUrl")} />
              <Label htmlFor="voterIdUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "voterIdUrl" ? "Uploading..." : "+ Upload File"}</Label>
              {formData.voterIdUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.voterIdUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>
      </div>

      {/* --- Driving License --- */}
      <div className="p-4 border rounded-lg">
        <Label className="font-semibold text-gray-800 mb-4 block">Driving License</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-3d-input">
            <Label className="form-3d-label">Driving License Number</Label>
            <Input value={formData.drivingLicenseNumber} onChange={(e) => handleInputChange("drivingLicenseNumber", e.target.value.toUpperCase())} />
          </div>
          <div className="form-3d-input">
            <Label className="form-3d-label">Driving License Document</Label>
            <div className="flex gap-3 items-center">
              <input type="file" id="drivingLicenseUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "drivingLicenseUrl")} />
              <Label htmlFor="drivingLicenseUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "drivingLicenseUrl" ? "Uploading..." : "+ Upload File"}</Label>
              {formData.drivingLicenseUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.drivingLicenseUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>
      </div>

      {/* --- Passport --- */}
      <div className="p-4 border rounded-lg">
        <Label className="font-semibold text-gray-800 mb-4 block">Passport</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-3d-input">
            <Label className="form-3d-label">Passport Number</Label>
            <Input value={formData.passportNumber} onChange={(e) => handleInputChange("passportNumber", e.target.value.toUpperCase())} />
          </div>
          <div className="form-3d-input">
            <Label className="form-3d-label">Passport Document</Label>
            <div className="flex gap-3 items-center">
              <input type="file" id="passportUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "passportUrl")} />
              <Label htmlFor="passportUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "passportUrl" ? "Uploading..." : "+ Upload File"}</Label>
              {formData.passportUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.passportUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>
      </div>

       {/* --- Other Document --- */}
       <div className="p-4 border rounded-lg">
        <Label className="font-semibold text-gray-800 mb-4 block">Other Document</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="form-3d-input">
            <Label className="form-3d-label">Document Name</Label>
            <Input value={formData.otherIdName} onChange={(e) => handleInputChange("otherIdName", e.target.value)} placeholder="e.g., Ration Card" />
          </div>
          <div className="form-3d-input">
            <Label className="form-3d-label">Document Number</Label>
            <Input value={formData.otherIdNumber} onChange={(e) => handleInputChange("otherIdNumber", e.target.value.toUpperCase())} />
          </div>
          <div className="form-3d-input">
            <Label className="form-3d-label">Upload Document</Label>
            <div className="flex gap-3 items-center">
              <input type="file" id="otherIdUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "otherIdUrl")} />
              <Label htmlFor="otherIdUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "otherIdUrl" ? "Uploading..." : "+ Upload File"}</Label>
              {formData.otherIdUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.otherIdUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
            </div>
          </div>
        </div>
      </div>
    

      {/* ==================== PAN SECTION (Always Mandatory) ==================== */}
  <div className="p-4 border rounded-lg bg-gray-50">
    <Label className="font-semibold text-lg text-gray-800 mb-4 block">PAN Details</Label>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="form-3d-input">
        <Label className="form-3d-label">PAN Number <span className="text-red-500">*</span></Label>
        <Input value={formData.panNumber} onChange={(e) => handleInputChange("panNumber", e.target.value.toUpperCase())} placeholder="Enter PAN number" maxLength={10} />
        {formErrors.panNumber ? <span className="form-error">{formErrors.panNumber}</span> : (formData.panNumber && VALIDATIONS.pan.test(formData.panNumber)) && <div className="flex items-center gap-1 text-green-600 text-xs mt-1"><CheckCircle2 className="h-3 w-3" />Verified</div>}
      </div>
      <div className="form-3d-input">
        <Label className="form-3d-label">PAN Document <span className="text-red-500">*</span></Label>
        <div className="flex gap-3 items-center">
          <input type="file" id="panUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "panUrl")} />
          <Label htmlFor="panUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "panUrl" ? "Uploading..." : "+ Upload File"}</Label>
          {formData.panUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.panUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  </div>

</div>
  )}

  {/* ==================== STATUTORY SECTION (Optional) ==================== */}
  <Separator className="my-6" />
  <h2 className="section-header-3d">Statutory Documents (Optional)</h2>

  {/* --- ESIC & UAN remain the same --- */}
  {/* --- ESIC --- */}
    <div className="p-4 border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-3d-input">
                <Label className="form-3d-label">ESIC Number</Label>
                <Input value={formData.esicNumber} onChange={(e) => handleInputChange("esicNumber", e.target.value)} placeholder="Enter ESIC number" />
                {formErrors.esicNumber ? <span className="form-error">{formErrors.esicNumber}</span> : (formData.esicNumber && VALIDATIONS.esic.test(formData.esicNumber)) && <div className="flex items-center gap-1 text-green-600 text-xs mt-1"><CheckCircle2 className="h-3 w-3" />Verified</div>}
            </div>
            <div className="form-3d-input">
                <Label className="form-3d-label">ESIC Document</Label>
                <div className="flex gap-3 items-center">
                    <input type="file" id="esicUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "esicUrl")} />
                    <Label htmlFor="esicUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "esicUrl" ? "Uploading..." : "+ Upload File"}</Label>
                    {formData.esicUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.esicUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
                </div>
            </div>
        </div>
    </div>

    {/* --- UAN --- */}
    <div className="p-4 border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-3d-input">
                <Label className="form-3d-label">UAN Number</Label>
                <Input value={formData.uanNumber} onChange={(e) => handleInputChange("uanNumber", e.target.value)} placeholder="Enter 12-digit UAN number" maxLength={12} />
                {formErrors.uanNumber ? <span className="form-error">{formErrors.uanNumber}</span> : (formData.uanNumber && VALIDATIONS.uan.test(formData.uanNumber)) && <div className="flex items-center gap-1 text-green-600 text-xs mt-1"><CheckCircle2 className="h-3 w-3" />Verified</div>}
            </div>
            <div className="form-3d-input">
                <Label className="form-3d-label">UAN Document</Label>
                <div className="flex gap-3 items-center">
                    <input type="file" id="uanUrl" className="sr-only" onChange={(e) => handleDocumentUpload(e, "uanUrl")} />
                    <Label htmlFor="uanUrl" className="cursor-pointer text-purple-600 hover:underline">{uploadingFile === "uanUrl" ? "Uploading..." : "+ Upload File"}</Label>
                    {formData.uanUrl && <Button variant="ghost" size="sm" onClick={() => window.open(formData.uanUrl, "_blank")}><FileText className="h-4 w-4" /></Button>}
                </div>
            </div>
        </div>
    </div>
</TabsContent>
                {/* Experience Modal - keeping original functionality */}
                {showExperienceModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
                      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {editingExperienceIndex !== null ? "Edit Experience" : "Add Experience"}
                      </h2>
                      
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-3d-input">
                            <Label className="form-3d-label">Job Type</Label>
                            <Select
                              value={currentExperience.jobType}
                              onValueChange={(value: "Full Time" | "Part Time" | "Internship") =>
                                handleExperienceChange("jobType", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Full Time">Full Time</SelectItem>
                                <SelectItem value="Part Time">Part Time</SelectItem>
                                <SelectItem value="Internship">Internship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="form-3d-input">
                            <Label className="form-3d-label">Company Name</Label>
                            <Input
                              value={currentExperience.company}
                              onChange={(e) =>
                                handleExperienceChange("company", e.target.value)
                              }
                              placeholder="Enter company name"
                            />
                          </div>

                          <div className="form-3d-input">
                            <Label className="form-3d-label">Position</Label>
                            <Input
                              value={currentExperience.position}
                              onChange={(e) =>
                                handleExperienceChange("position", e.target.value)
                              }
                              placeholder="Enter position"
                            />
                          </div>

                          <div className="form-3d-input">
                            <Label className="form-3d-label">Location</Label>
                            <Input
                              value={currentExperience.location || ""}
                              onChange={(e) =>
                                handleExperienceChange("location", e.target.value)
                              }
                              placeholder="Enter location"
                            />
                          </div>

                          <div className="form-3d-input">
                            <Label className="form-3d-label">Start Date</Label>
                            <Input
                              type="date"
                              value={currentExperience.startDate || ""}
                              onChange={(e) =>
                                handleExperienceChange("startDate", e.target.value)
                              }
                            />
                          </div>

                          <div className="form-3d-input">
                            <Label className="form-3d-label">End Date</Label>
                            <Input
                              type="date"
                              value={currentExperience.endDate || ""}
                              onChange={(e) =>
                                handleExperienceChange("endDate", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {/* Document uploads - MODERN UI */}
                        <div className="space-y-6">
                          {/* Offer Letter - Always shown */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Offer Letter<span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div
                              className={cn(
                                "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                currentExperience.offerLetterUrl
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                uploadingFile === "offerLetter" && "border-blue-400 bg-blue-50"
                              )}
                            >
                              <input
                                type="file"
                                id="offerLetter"
                                className="sr-only"
                                accept=".pdf,.png,.jpg,.jpeg"
                                disabled={uploadingFile !== null}
                                onChange={(event) =>
                                  handleExpUpload(event, "offerLetter", currentExperience.id)
                                }
                              />

                              {uploadingFile === "offerLetter" ? (
                                <div className="flex items-center justify-center gap-3 py-2">
                                  <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                </div>
                              ) : currentExperience.offerLetterUrl ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="bg-green-600 rounded-full p-2">
                                      <CheckCircle2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                      <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(currentExperience.offerLetterUrl, "_blank")}
                                      className="hover:bg-green-100"
                                    >
                                      <FileText className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Label
                                  htmlFor="offerLetter"
                                  className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                >
                                  <div className="bg-purple-600 rounded-full p-2">
                                    <Upload className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-gray-700">
                                      Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                  </div>
                                </Label>
                              )}
                            </div>
                          </div>

                          {/* Separation Letter Toggle */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-1">
                                <Label className="text-sm font-medium">Do you have a Separation Letter?</Label>
                                <p className="text-xs text-gray-500 mt-1">
                                  Toggle on if you have a separation letter from this company
                                </p>
                              </div>
                              <Switch
                                checked={!noSeparationLetter}
                                onCheckedChange={(checked) => {
                                  setNoSeparationLetter(!checked);
                                  if (!checked) {
                                    handleExperienceChange("separationLetterUrl", "");
                                  }
                                }}
                              />
                            </div>

                            {!noSeparationLetter ? (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Separation Letter</Label>
                                <div
                                  className={cn(
                                    "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                    currentExperience.separationLetterUrl
                                      ? "border-green-500 bg-green-50"
                                      : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                    uploadingFile === "separationLetter" && "border-blue-400 bg-blue-50"
                                  )}
                                >
                                  <input
                                    type="file"
                                    id="separationLetter"
                                    className="sr-only"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    disabled={uploadingFile !== null}
                                    onChange={(event) =>
                                      handleExpUpload(event, "separationLetter", currentExperience.id)
                                    }
                                  />

                                  {uploadingFile === "separationLetter" ? (
                                    <div className="flex items-center justify-center gap-3 py-2">
                                      <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                      <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                    </div>
                                  ) : currentExperience.separationLetterUrl ? (
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="bg-green-600 rounded-full p-2">
                                          <CheckCircle2 className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                          <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => window.open(currentExperience.separationLetterUrl, "_blank")}
                                          className="hover:bg-green-100"
                                        >
                                          <FileText className="h-4 w-4 text-green-600" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Label
                                      htmlFor="separationLetter"
                                      className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                    >
                                      <div className="bg-purple-600 rounded-full p-2">
                                        <Upload className="w-5 h-5 text-white" />
                                      </div>
                                      <div className="text-left">
                                        <p className="text-sm font-medium text-gray-700">
                                          Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                      </div>
                                    </Label>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <Label className="text-sm font-medium text-amber-800">
                                  Reason for not having Separation Letter
                                </Label>
                                <Input
                                  value={currentExperience.noSeparationLetterReason || ""}
                                  onChange={(e) =>
                                    handleExperienceChange("noSeparationLetterReason", e.target.value)
                                  }
                                  placeholder="e.g., Still employed, Letter not provided, etc."
                                  className="mt-2 border-amber-300 focus:border-amber-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Payslips Toggle */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-1">
                                <Label className="text-sm font-medium">Do you have Payslips?</Label>
                                <p className="text-xs text-gray-500 mt-1">
                                  Toggle on if you have payslips from this company (minimum 3 required)
                                </p>
                              </div>
                              <Switch
                                checked={!noPayslip}
                                onCheckedChange={(checked) => {
                                  setNoPayslip(!checked);
                                  if (!checked) {
                                    handleExperienceChange("payslip_1_url", "");
                                    handleExperienceChange("payslip_2_url", "");
                                    handleExperienceChange("payslip_3_url", "");
                                  }
                                }}
                              />
                            </div>

                            {!noPayslip ? (
                              <>
                                {/* Payslip 1 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    Payslip 1<span className="text-red-500 ml-1">*</span>
                                  </Label>
                                  <div
                                    className={cn(
                                      "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                      currentExperience.payslip_1_url
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                      uploadingFile === "payslip1" && "border-blue-400 bg-blue-50"
                                    )}
                                  >
                                    <input
                                      type="file"
                                      id="payslip1"
                                      className="sr-only"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      disabled={uploadingFile !== null}
                                      onChange={(event) =>
                                        handleExpUpload(event, "payslip1", currentExperience.id)
                                      }
                                    />

                                    {uploadingFile === "payslip1" ? (
                                      <div className="flex items-center justify-center gap-3 py-2">
                                        <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                      </div>
                                    ) : currentExperience.payslip_1_url ? (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="bg-green-600 rounded-full p-2">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                            <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(currentExperience.payslip_1_url, "_blank")}
                                            className="hover:bg-green-100"
                                          >
                                            <FileText className="h-4 w-4 text-green-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Label
                                        htmlFor="payslip1"
                                        className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                      >
                                        <div className="bg-purple-600 rounded-full p-2">
                                          <Upload className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-medium text-gray-700">
                                            Click to upload or drag and drop
                                          </p>
                                          <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                        </div>
                                      </Label>
                                    )}
                                  </div>
                                </div>

                                {/* Payslip 2 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    Payslip 2<span className="text-red-500 ml-1">*</span>
                                  </Label>
                                  <div
                                    className={cn(
                                      "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                      currentExperience.payslip_2_url
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                      uploadingFile === "payslip2" && "border-blue-400 bg-blue-50"
                                    )}
                                  >
                                    <input
                                      type="file"
                                      id="payslip2"
                                      className="sr-only"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      disabled={uploadingFile !== null}
                                      onChange={(event) =>
                                        handleExpUpload(event, "payslip2", currentExperience.id)
                                      }
                                    />

                                    {uploadingFile === "payslip2" ? (
                                      <div className="flex items-center justify-center gap-3 py-2">
                                        <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                      </div>
                                    ) : currentExperience.payslip_2_url ? (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="bg-green-600 rounded-full p-2">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                            <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(currentExperience.payslip_2_url, "_blank")}
                                            className="hover:bg-green-100"
                                          >
                                            <FileText className="h-4 w-4 text-green-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Label
                                        htmlFor="payslip2"
                                        className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                      >
                                        <div className="bg-purple-600 rounded-full p-2">
                                          <Upload className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-medium text-gray-700">
                                            Click to upload or drag and drop
                                          </p>
                                          <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                        </div>
                                      </Label>
                                    )}
                                  </div>
                                </div>

                                {/* Payslip 3 */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">
                                    Payslip 3<span className="text-red-500 ml-1">*</span>
                                  </Label>
                                  <div
                                    className={cn(
                                      "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                      currentExperience.payslip_3_url
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                      uploadingFile === "payslip3" && "border-blue-400 bg-blue-50"
                                    )}
                                  >
                                    <input
                                      type="file"
                                      id="payslip3"
                                      className="sr-only"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      disabled={uploadingFile !== null}
                                      onChange={(event) =>
                                        handleExpUpload(event, "payslip3", currentExperience.id)
                                      }
                                    />

                                    {uploadingFile === "payslip3" ? (
                                      <div className="flex items-center justify-center gap-3 py-2">
                                        <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                      </div>
                                    ) : currentExperience.payslip_3_url ? (
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="bg-green-600 rounded-full p-2">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                            <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(currentExperience.payslip_3_url, "_blank")}
                                            className="hover:bg-green-100"
                                          >
                                            <FileText className="h-4 w-4 text-green-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <Label
                                        htmlFor="payslip3"
                                        className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                      >
                                        <div className="bg-purple-600 rounded-full p-2">
                                          <Upload className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-medium text-gray-700">
                                            Click to upload or drag and drop
                                          </p>
                                          <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                        </div>
                                      </Label>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <Label className="text-sm font-medium text-amber-800">
                                  Reason for not having Payslips
                                </Label>
                                <Input
                                  value={currentExperience.noPayslipReason || ""}
                                  onChange={(e) => handleExperienceChange("noPayslipReason", e.target.value)}
                                  placeholder="e.g., Cash payment, Contractor role, etc."
                                  className="mt-2 border-amber-300 focus:border-amber-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Hike Letter - Optional */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Hike Letter (Optional)</Label>
                            <div
                              className={cn(
                                "relative border-2 border-dashed rounded-lg p-4 transition-all",
                                currentExperience.hikeLetterUrl
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50",
                                uploadingFile === "hikeLetter" && "border-blue-400 bg-blue-50"
                              )}
                            >
                              <input
                                type="file"
                                id="hikeLetter"
                                className="sr-only"
                                accept=".pdf,.png,.jpg,.jpeg"
                                disabled={uploadingFile !== null}
                                onChange={(event) =>
                                  handleExpUpload(event, "hikeLetter", currentExperience.id)
                                }
                              />

                              {uploadingFile === "hikeLetter" ? (
                                <div className="flex items-center justify-center gap-3 py-2">
                                  <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-600">Uploading...</span>
                                </div>
                              ) : currentExperience.hikeLetterUrl ? (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="bg-green-600 rounded-full p-2">
                                      <CheckCircle2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                                      <p className="text-xs text-gray-500">Click to view or upload new file</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(currentExperience.hikeLetterUrl, "_blank")}
                                      className="hover:bg-green-100"
                                    >
                                      <FileText className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Label
                                  htmlFor="hikeLetter"
                                  className="flex items-center justify-center gap-3 cursor-pointer py-2"
                                >
                                  <div className="bg-purple-600 rounded-full p-2">
                                    <Upload className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-gray-700">
                                      Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF, PNG, JPG or JPEG (Max 10MB)</p>
                                  </div>
                                </Label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowExperienceModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="button" onClick={saveExperience} className="button-3d">
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )} 

                <div className="mt-8 flex justify-end">
                  <Button type="submit" disabled={loading} className="button-3d">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin h-4 w-4" />
                        Saving...
                      </span>
                    ) : activeTab === "documents" ? (
                      "Save and Finish"
                    ) : (
                      "Save and Next"
                    )}
                  </Button>
                </div> 
              </form>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeOnboard;