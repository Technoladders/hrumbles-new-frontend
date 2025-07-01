// lib/types.ts

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience?: string;
  matchScore?: number;
  appliedDate?: string;
  first_name?: string;
  last_name?: string;
  skills?: Array<string | { name: string; rating: number }>; // Can be string[] or array of objects
  skill_ratings?: Array<{
    name: string;
    rating: number;
    experienceYears?: number;
    experienceMonths?: number;
  }>;
  resume?: string;
  currentSalary?: string;
  expectedSalary?: string;
  status?: string;
  metadata?: {
    uan?: string;
    pan?: string;
    pf?: string;
    esicNumber?: string;
    role?: string;
    department?: string;
    tags?: string[];
    profileImage?: string;
    currentLocation?: string;
    relevantExperience?: string;
    relevantExperienceMonths?: string;
    preferredLocations?: string[];
    resume_url?: string;
    linkedInId?: string;
    noticePeriod?: string;
    hasOffers?: string;
    offerDetails?: string;
  };
}

export interface DocumentState {
  value: string;
  isVerifying: boolean;
  isVerified: boolean;
  verificationDate: string | null;
  error: string | null;
  isEditing: boolean;
  isUANResultsOpen?: boolean;
  results?: Array<{
    DateOfExitEpf: string;
    Doj: string;
    EstablishmentName: string;
    MemberId: string;
    fatherOrHusbandName: string;
    name: string;
    uan: string;
    Overlapping: string;
  }>;
}

export interface ResumeAnalysis {
  overall_score: number;
  matched_skills: Array<{
    requirement: string;
    matched: "yes" | "no" | "partial";
    details: string;
  }>;
  summary: string;
  missing_or_weak_areas: string[];
  top_skills: string[];
  development_gaps: string[];
  additional_certifications: string[];
  section_wise_scoring: Array<{
    section: string;
    weightage: number;
    submenus: Array<{
      submenu: string;
      score: number;
      remarks: string;
      weightage: number;
      weighted_score: number;
    }>;
  }>;
}

export interface WorkHistory {
  company_id: number;
  company_name: string;
  designation: string;
  years: string;
  overlapping?: string;
  isVerifying?: boolean;
  isVerified?: boolean;
  verifiedCompanyName?: string;
  establishmentId?: string;
  secretToken?: string;
  tsTransactionId?: string;
  verificationError?: string;
  isEmployeeVerifying?: boolean;
  isEmployeeVerified?: boolean;
  employeeVerificationError?: string;
}

export interface EmployeeVerificationResponse {
  msg?: {
    emp_search_month?: string;
    emp_search_year?: string;
    employee_names?: string[];
    employees_count?: number;
    employer_name?: string;
    establishment_id?: string;
    status?: boolean;
    status_code?: number;
    message?: string;
  };
  status: number;
  tsTransId?: string;
}

export interface CompanyVerificationResponse {
  CompanyName: { [key: string]: string };
  secretToken: string;
  status: number;
  status_code: number;
  tsTransactionID: string;
  msg?: string; // Add msg for potential error messages
}

export interface TimelineEvent {
  id: string;
  candidate_id: string;
  event_type: string;
  event_data: {
    action: string;
    timestamp: string;
    round?: string;
    interview_date?: string;
    interview_time?: string;
    interview_type?: string;
    interviewer_name?: string;
    interview_location?: string;
    interview_result?: string;
    interview_feedback?: string;
    ctc?: string;
    joining_date?: string;
  };
  previous_state: {
    subStatusId: string;
    mainStatusId: string;
    subStatusName: string;
    mainStatusName: string;
  };
  new_state: {
    subStatusId: string;
    mainStatusId: string;
    mainStatusName: string;
    subStatusName: string;
  };
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface TruthScreenResponse {
  requestData?: string;
  responseData?: string;
  error?: string;
  msg?: Array<{
    DateOfExitEpf: string;
    Doj: string;
    EstablishmentName: string;
    MemberId: string;
    fatherOrHusbandName: string;
    name: string;
    uan: string;
    Overlapping: string;
  }>;
  status?: number;
  transId?: string;
  tsTransId?: string;
}

export interface DataSharingOptions {
  personalInfo: boolean;
  contactInfo: boolean;
  documentsInfo: boolean;
  workInfo: boolean;
  skillinfo: boolean;
}