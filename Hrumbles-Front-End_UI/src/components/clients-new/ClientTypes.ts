// src/components/clients-new/ClientTypes.ts

// --- Core Client & Contact Interfaces ---
export interface Client {
  id: string;
  client_name: string;
  service_type: string[];
  billing_address: Address;
  shipping_address: Address;
  currency: string;
  commission_type?: string;
  commission_value?: number;
}

export interface ClientContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// --- Data & Calculation Interfaces ---
export interface ClientMetrics {
  candidateRevenue: number;
  candidateProfit: number;
  employeeRevenueINR: number;
  employeeProfitINR: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  job_id: string;
  job_title?: string;
  main_status_id?: string;
  sub_status_id?: string;
  ctc?: string;
  accrual_ctc?: string;
  joining_date?: string;
  profit?: number; // Calculated field
}

export interface Employee {
  id: string;
  employee_name: string;
  project_id: string;
  project_name?: string;
  salary: number;
  salary_type: string;
  salary_currency: string;
  client_billing: number;
  billing_type: string;
  currency: string;
  actual_revenue_inr: number; // Calculated field
  actual_profit_inr: number;  // Calculated field
}

export interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
}

export interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: {
    projects: { hours: number; projectId: string }[];
  };
}

export type SortConfig<T> = {
  key: keyof T;
  direction: 'ascending' | 'descending';
} | null;

export interface HiresByMonth {
  month: string;
  hires: number;
}

export interface RecruiterPerformance {
  name: string;
  hires: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
}