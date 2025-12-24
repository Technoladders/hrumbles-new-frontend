// types.ts - Type definitions for Verification Analytics

export interface CreditTransaction {
  id: string;
  organization_id: string;
  amount: number;
  transaction_type: 'usage' | 'topup';
  verification_type?: string;
  source?: string;
  reference_id?: number;
  description?: string;
  balance_after: number;
  created_at: string;
  created_by?: string;
}

export interface VerificationPricing {
  id: string;
  verification_type: string;
  source: string;
  organization_id?: string;
  price: number;
  price_not_found: number;
  created_at: string;
  updated_at: string;
}

export interface VerificationStats {
  totalSpent: number;
  totalTopups: number;
  currentBalance: number;
  avgTransactionSize: number;
  burnRate: number;
  daysRemaining: number;
  totalUsageCount: number;
  totalTopupCount: number;
}

export interface WeeklyChangeStats {
  last7DaysSpent: number;
  previous7DaysSpent: number;
  changePercent: number;
  isIncrease: boolean;
}

export interface VerificationUsageGroup {
  name: string;
  count: number;
  totalCost: number;
  avgCost: number;
  transactions: CreditTransaction[];
}

export interface SourceUsageGroup {
  name: string;
  count: number;
  totalCost: number;
  avgCost: number;
  transactions: CreditTransaction[];
}

export interface CostEfficiencyData {
  source: string;
  avgActualCost: number;
  avgListedPrice: number;
  efficiency: number;
  count: number;
  totalCost: number;
}

export interface MonthlyProjection {
  month: number;
  projectedSpend: number;
  projectedBalance: number;
  needsTopup: boolean;
}

export interface TimeSeriesDataPoint {
  date: string;
  usage: number;
  topup: number;
  balance: number;
  transactions: CreditTransaction[];
}

export interface ChartDataPoint {
  date: string;
  balance: number;
  amount: number;
  type: 'usage' | 'topup';
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  amount: number;
}

export interface BarChartDataPoint {
  name: string;
  count: number;
  totalCost: number;
}

export interface BalanceStatus {
  type: 'healthy' | 'warning' | 'critical';
  icon: any;
  color: string;
  bg: string;
}

export interface TrendStatus {
  icon: any;
  color: string;
  message: string;
}

// Redux Store Types (example structure)
export interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  role: string;
  organization_id: string;
}

export interface RootState {
  auth: AuthState;
}

// Component Props
export interface VerificationAnalyticsProps {
  organizationId: string;
}

export interface InsightsPanelProps {
  transactions: CreditTransaction[];
}

export interface VerificationDashboardProps {
  organizationId: string;
}

// API Response Types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
}

// Chart Configuration Types
export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  gradient: string[];
}

export const defaultChartColors: ChartColors = {
  primary: '#7731E8',
  secondary: '#A855F7',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gradient: ['#7731E8', '#A855F7', '#C084FC', '#E9D5FF', '#F3E8FF']
};

// Filter Types
export type DateRangeFilter = {
  start: Date;
  end: Date;
};

export type TransactionTypeFilter = 'all' | 'usage' | 'topup';

export type VerificationTypeFilter = string | 'all';

export type SourceFilter = string | 'all';

// Export Configuration
export interface ExportConfig {
  filename: string;
  format: 'csv' | 'json' | 'pdf';
  includeHeaders: boolean;
  dateFormat: 'iso' | 'locale' | 'custom';
}

// Alert Configuration
export interface AlertConfig {
  lowBalanceThreshold: number;
  highSpendingThreshold: number;
  emailNotifications: boolean;
  slackNotifications: boolean;
}

// Analytics Settings
export interface AnalyticsSettings {
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year';
  chartType: 'line' | 'bar' | 'area';
  groupBy: 'day' | 'week' | 'month';
  showPredictions: boolean;
}