export interface Document {
  documentType?: 'aadhar' | 'uan' | 'pan' | 'esic';
  documentNumber?: string;
  documentUrl?: string;
  fileName?: string;
}

export interface Address {
  addressLine1?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
}

export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface FamilyMember {
  name?: string;
  relationship?: string;
  occupation?: string;
  phone?: string;
}

export interface Experience {
  skills: any[];
  id?: string; // Add this if you're using an ID
  jobType: "Full Time" | "Part Time" | "Internship"; // Correct type
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
}

export interface Education {
  type?: string;
  institute?: string;
  yearCompleted?: string;
  ssc?: File;
  hsc?: File;
  degree?: File;
}

export interface BankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  accountType?: string;
  bankPhone?: string;
  cancelledCheque?: File | string;
  passbookCopy?: File | string;
}

export interface EmployeeBasicInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  position?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  maritalStatus?: string;
}

export interface PersonalInfo extends EmployeeBasicInfo {
  employeeId?: string;
  aadharNumber?: string;
  aadharUrl?: string;
  panNumber?: string;
  panUrl?: string;
  uanNumber?: string;
  uanUrl?: string;
  esicNumber?: string;
  esicUrl?: string;
  presentAddress?: Address;
  permanentAddress?: Address;
  emergencyContacts?: EmergencyContact[];
  familyDetails?: FamilyMember[];
  documents?: Document[];
  profilePictureUrl?: string;
}

export interface EmployeeDetailsResponse {
  id?: string;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  marital_status?: string | null;
  department?: string | null;
  position?: string | null;
  employment_status?: string | null;
  created_at?: string;
  updated_at?: string;
  present_address?: Address;
  permanent_address?: Address;
  emergency_contacts?: EmergencyContact[];
  family_details?: FamilyMember[];
  experience?: Experience[];
  documents?: Document[];
  aadhar_number?: string;
  aadhar_url?: string;
  pan_number?: string;
  pan_url?: string;
  uan_number?: string;
  uan_url?: string;
  esic_number?: string;
  esic_url?: string;
}

export interface EmployeeData {
  id?: string;
  employeeId?: string;
  personal?: PersonalInfo;
  education?: Education | null;
  experience?: Experience[];
  bank?: BankDetails | null;
  department?: string | null;
  position?: string | null;
  employmentStatus?: string | null;
  documents?: Document[];
}
