import { UUID } from "crypto";

export type ReportType = 'client' | 'individual' | 'recruiter';

export interface ReportData {
  name: string;
  totalCandidates: number;
  statusBreakdown: {
    statusName: string;
    count: number;
  }[];
  dailyData?: any[];
}

export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  type: ReportType;
}

export const PREDEFINED_DATE_RANGES = [
  { 
    label: 'Today', 
    value: 'today' 
  },
  { 
    label: 'This Week', 
    value: 'this_week' 
  },
  { 
    label: 'This Month', 
    value: 'this_month' 
  },
  { 
    label: 'This Year', 
    value: 'this_year' 
  }
];

export interface RecruiterPerformanceData {
  recruiter: string;
  jobs_assigned: number;
  profiles_submitted: number;
  internal_reject: number;
  internal_hold: number;
  sent_to_client: number;
  client_reject: number;
  client_hold: number;
  client_duplicate: number;
  interviews: {
    l1: number;
    l1_reject: number;
    l2: number;
    l2_reject: number;
    end_client: number;
    end_client_reject: number;
  };
  offers: {
    made: number;
    accepted: number;
    rejected: number;
  };
  joining: {
    joined: number;
    no_show: number;
  };
}

export interface DerivedMetric {
  name: string;
  formula: string;
  value: number;
  description: string;
}
