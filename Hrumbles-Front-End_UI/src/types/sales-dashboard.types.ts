// Sales Deal Types
export interface SalesDeal {
  id: string;
  name: string;
  description?: string;
  company_id?: number;
  contact_id?: string;
  deal_value?: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  stage: DealStage;
  status: DealStatus;
  deal_owner?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  organization_id: string;
  lost_reason?: string;
  notes?: string;
  deal_source?: string;
  tags?: string[];
  custom_data?: Record<string, any>;
  
  // Relations
  company?: {
    id: number;
    name: string;
    logo_url?: string;
  };
  contact?: {
    id: string;
    name: string;
    email?: string;
  };
  deal_owner_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export type DealStage = 
  | 'Prospecting'
  | 'Qualification'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type DealStatus = 'Open' | 'Won' | 'Lost';

export interface SalesActivity {
  id: string;
  activity_type: ActivityType;
  subject: string;
  description?: string;
  activity_date: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  deal_id?: string;
  company_id?: number;
  contact_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  organization_id: string;
  priority: 'low' | 'medium' | 'high';
  outcome?: string;
  duration_minutes?: number;
  
  // Relations
  deal?: {
    id: string;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
  contact?: {
    id: string;
    name: string;
  };
  assigned_to_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'task' | 'note';

export interface SalesTarget {
  id: string;
  employee_id: string;
  target_period: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  target_revenue: number;
  target_deals?: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
  
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface DealStageHistory {
  id: string;
  deal_id: string;
  from_stage?: string;
  to_stage: string;
  changed_at: string;
  changed_by?: string;
  notes?: string;
  
  changed_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface DealComment {
  id: string;
  deal_id: string;
  comment: string;
  created_at: string;
  created_by?: string;
  organization_id: string;
  
  created_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// Dashboard Metrics Types
export interface PipelineOverview {
  stage: DealStage;
  count: number;
  total_value: number;
  average_deal_size: number;
}

export interface LeadsMetrics {
  new_leads_count: number;
  active_opportunities_count: number;
  conversion_rate: number;
  qualified_leads_count: number;
}

export interface SalesPerformanceMetrics {
  total_revenue: number;
  target_revenue: number;
  achievement_percentage: number;
  won_deals: number;
  lost_deals: number;
  win_rate: number;
  average_deal_size: number;
  average_sales_cycle_days: number;
}

export interface TopPerformer {
  employee_id: string;
  employee_name: string;
  deals_won: number;
  total_revenue: number;
  achievement_percentage: number;
}

export interface RecentActivity {
  id: string;
  type: 'deal_created' | 'deal_stage_changed' | 'activity_completed' | 'comment_added';
  title: string;
  description: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
  };
  related_entity?: {
    type: 'deal' | 'company' | 'contact';
    id: string;
    name: string;
  };
}

export interface KeyAccount {
  company_id: number;
  company_name: string;
  logo_url?: string;
  total_deal_value: number;
  active_deals_count: number;
  won_deals_count: number;
  last_activity_date?: string;
  account_owner?: string;
  account_owner_name?: string;
}

export interface DashboardFilters {
  dateRange?: {
    startDate: Date | null;
    endDate: Date | null;
  };
  teamMembers?: string[];
  dealSizeRange?: {
    min?: number;
    max?: number;
  };
  stages?: DealStage[];
  status?: DealStatus[];
}