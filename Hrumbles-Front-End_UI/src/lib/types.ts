
import { ReactNode } from "react";
import { MainStatus, SubStatus } from "@/services/statusService";

// Define the progress mapping for candidate statuses
export const PROGRESS_MAPPING: Record<string, { screening: boolean; interview: boolean; offer: boolean; hired: boolean; joined: boolean }> = {
  'New': { screening: true, interview: false, offer: false, hired: false, joined: false },
  'Screening': { screening: true, interview: false, offer: false, hired: false, joined: false },
  'Interview': { screening: true, interview: true, offer: false, hired: false, joined: false },
  'Shortlisted': { screening: true, interview: true, offer: false, hired: false, joined: false },
  'Offered': { screening: true, interview: true, offer: true, hired: false, joined: false },
  'Hired': { screening: true, interview: true, offer: true, hired: true, joined: false },
  'Joined': { screening: true, interview: true, offer: true, hired: true, joined: true },
  'Rejected': { screening: true, interview: false, offer: false, hired: false, joined: false },
  'On Hold': { screening: true, interview: false, offer: false, hired: false, joined: false },
  'Withdrawn': { screening: true, interview: false, offer: false, hired: false, joined: false }
};

// Define the candidate status for display in the UI
export const CANDIDATE_STATUSES = [
  'New',
  'Screening',
  'Interview',
  'Shortlisted',
  'Offered',
  'Hired',
  'Joined',
  'Rejected',
  'On Hold',
  'Withdrawn'
];

// Define the candidate status stages for the status management system
export const CANDIDATE_STAGES = [
  {
    name: 'Screening',
    color: '#f59e0b',
    info: false,
    options: [
      { label: 'Initial Screening', value: 'initial_screening' },
      { label: 'Resume Review', value: 'resume_review' },
      { label: 'Phone Screening', value: 'phone_screening' },
      { label: 'Shortlisted', value: 'shortlisted' }
    ]
  },
  {
    name: 'Interview',
    color: '#3b82f6',
    info: false,
    options: [
      { label: 'Interview Scheduled', value: 'interview_scheduled' },
      { label: 'First Round', value: 'first_round' },
      { label: 'Technical Round', value: 'technical_round' },
      { label: 'HR Round', value: 'hr_round' },
      { label: 'Final Round', value: 'final_round' }
    ]
  },
  {
    name: 'Offer',
    color: '#10b981',
    info: false,
    options: [
      { label: 'Offer Preparation', value: 'offer_preparation' },
      { label: 'Offer Extended', value: 'offer_extended' },
      { label: 'Negotiation', value: 'negotiation' },
      { label: 'Offer Accepted', value: 'offer_accepted' },
      { label: 'Offer Declined', value: 'offer_declined' }
    ]
  },
  {
    name: 'Onboarding',
    color: '#6366f1',
    info: true,
    options: [
      { label: 'Background Check', value: 'background_check' },
      { label: 'Documentation', value: 'documentation' },
      { label: 'Onboarding', value: 'onboarding' },
      { label: 'Joined', value: 'joined' }
    ]
  },
  {
    name: 'Rejected',
    color: '#ef4444',
    info: false,
    options: [
      { label: 'Skills Mismatch', value: 'skills_mismatch' },
      { label: 'Cultural Fit', value: 'cultural_fit' },
      { label: 'Salary Expectations', value: 'salary_expectations' },
      { label: 'Better Candidate Selected', value: 'better_candidate' }
    ]
  }
];

// Progress type for type safety
export interface Progress {
  screening: boolean;
  interview: boolean;
  offer: boolean;
  hired: boolean;
  joined: boolean;
}


export interface JobData {
  id: string;  // Changed from number to string since we're using UUIDs
  jobId: string;
  title: string;
  department: string;
  location: string[];
  type: string;
  status: "Active" | "Pending" | "Completed" | "OPEN" | "HOLD" | "CLOSE";
  postedDate: string;
  applications: number;
  dueDate: string;
  clientOwner: string;
  hiringMode: string;
  submissionType: "Internal" | "Client";
  jobType: "Internal" | "External"; // Added jobType field
  experience?: {
    min?: { years: number; months: number };
    max?: { years: number; months: number };
  };
  skills?: string[];
  description?: string;
  descriptionBullets?: string[];
  clientDetails?: {
    clientName?: string;
    clientBudget?: string;
    endClient?: string;
    pointOfContact?: string;
  };
  jobCategory?: string;
  primarySkills?: string[];
  secondarySkills?: string[];
  staffingManager?: string;
  interviewProcess?: string[];
  payRate?: string;
  billRate?: string;
  startDate?: string;
  assignedTo?: {
    type: "individual" | "team" | "vendor";
    name: string;
    id: string;
  };
  assigned_to?: {
    id: string;
    name: string;
    type: string;
  } | null;
  budgets?: {
    clientBudget?: string;
    hrBudget?: string;
    vendorBudget?: string;
  };
  customUrl?: string;
  noticePeriod?: string;
  budgetType?: string;
  clientProjectId?: string; 
  numberOfCandidates?: number;
  organization?: string;
  createdBy?:{
    first_name?: string;
    last_name?: string;
  };
  candidate_count?: { count: number } | null;
}

export interface Candidate {
  id: string;
  name: string;
  status: CandidateStatus | "New" | "InReview" | "Engaged" | "Available" | "Offered" | "Hired" | "Rejected";
  
  contact?: {
    email: string;
    phone: string;
    emailVisible: boolean;
    phoneVisible: boolean;
  };
  
  resume?: {
    url: string;
    filename: string;
    size: number;
    uploadDate: string;
  } | null;
  
  resumeAnalysis?: {
    score: number;
    status?: 'analyzed' | 'pending' | 'failed' | 'not_uploaded' | 'processing';
    details?: any;
  };
  
  progress?: Progress;
  
  main_status_id?: string;
  sub_status_id?: string;
  main_status?: Partial<MainStatus> | null;
  sub_status?: Partial<SubStatus> | null;

  totalExperience?: { years: number; months: number };
  relevantExperience?: { years: number; months: number };
  
  currentSalary?: number | string;
  expectedSalary?: number | string;
  noticePeriod?: string;

  skills: Array<{ name: string; rating: number }> | string[];
  
  appliedDate: string;
  appliedFrom?: string;
  location?: string;

  metadata?: {
    currentLocation?: string;
    preferredLocations?: string[];
    totalExperience?: string | number;
    relevantExperience?: string | number;
    currentSalary?: string | number;
    expectedSalary?: string | number;
    resume_url?: string;
  };

  skill_ratings?: Array<{ name: string; rating: number }>;
  currentStage?: string;
  completedStages?: string[];
  hasValidatedResume?: boolean;
  email?: string
  phone?: string
  profit?: ReactNode;
  organization?: string;
  updatedBy?: string;
}


export enum CandidateStatus {
  Screening = "Screening",
  Interviewing = "Interviewing",
  Selected = "Selected",
  Rejected = "Rejected",
  New = "New",
  InReview = "InReview",
  Engaged = "Engaged",
  Available = "Available",
  Offered = "Offered",
  Hired = "Hired"
}


