
import { MainStatus, SubStatus } from "@/services/statusService";

// Progress interface defines the candidate's progress through recruitment stages
export interface Progress {
  screening: boolean;
  interview: boolean;
  offer: boolean;
  hired: boolean;
  joined: boolean;
}

// Candidate interface represents a candidate in the system
export interface Candidates {
  id: string;
  name: string;
  contact?: {
    email: string;
    phone: string;
    emailVisible: boolean;
    phoneVisible: boolean;
  };
  owner?: string;
  resume?: {
    url: string;
    filename: string;
    size: number;
    uploadDate: string;
  };
  resumeAnalysis?: {
    score: number;
    skills: { name: string; rating: number }[];
    experience: string;
    strengths: string[];
    weaknesses: string[];
  };
  status?: string;
  progress?: Progress;
  stage?: {
    current: string;
    completed: string[];
  };
  appliedDate?: string;
  appliedFrom?: string;
  matchScore?: number;
  lastActivity?: {
    type: string;
    date: string;
    description: string;
  };
  interviews?: {
    date: string;
    type: string;
    status: string;
    interviewer: string;
  }[];
  notes?: string[];
  tags?: string[];
  currentSalary?: number;
  expectedSalary?: number;
  location?: string;
  department?: string;
  position?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  main_status_id?: string;
  sub_status_id?: string;
  main_status?: Partial<MainStatus>;
  sub_status?: Partial<SubStatus>;
  currentStage?: string;
  profit?: number;
}
