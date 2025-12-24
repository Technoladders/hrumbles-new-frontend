import { CreditTransaction, VerificationPricing } from './types';

/**
 * Calculate verification statistics from transaction data
 */
export const calculateVerificationStats = (transactions: CreditTransaction[]) => {
  const usageTransactions = transactions.filter(t => t.transaction_type === 'usage');
  const topupTransactions = transactions.filter(t => t.transaction_type === 'topup');

  const totalSpent = usageTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount)), 
    0
  );

  const totalTopups = topupTransactions.reduce(
    (sum, t) => sum + Number(t.amount), 
    0
  );

  const currentBalance = transactions.length > 0 
    ? Number(transactions[transactions.length - 1].balance_after) 
    : 0;

  const avgTransactionSize = usageTransactions.length > 0
    ? totalSpent / usageTransactions.length
    : 0;

  // Calculate burn rate (credits per day)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let burnRate = 0;
  if (sortedTransactions.length > 1) {
    const firstDate = new Date(sortedTransactions[0].created_at);
    const lastDate = new Date(sortedTransactions[sortedTransactions.length - 1].created_at);
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 0) {
      burnRate = totalSpent / daysDiff;
    }
  }

  // Estimated days until balance runs out
  const daysRemaining = burnRate > 0 ? currentBalance / burnRate : Infinity;

  return {
    totalSpent,
    totalTopups,
    currentBalance,
    avgTransactionSize,
    burnRate,
    daysRemaining: Math.round(daysRemaining),
    totalUsageCount: usageTransactions.length,
    totalTopupCount: topupTransactions.length,
  };
};

/**
 * Calculate week-over-week change percentage
 */
export const calculateWeekOverWeekChange = (transactions: CreditTransaction[]) => {
  const now = new Date();
  
  const last7Days = transactions.filter(t => {
    const transDate = new Date(t.created_at);
    const daysDiff = (now.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });
  
  const previous7Days = transactions.filter(t => {
    const transDate = new Date(t.created_at);
    const daysDiff = (now.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 7 && daysDiff <= 14;
  });

  const last7DaysSpent = last7Days
    .filter(t => t.transaction_type === 'usage')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const previous7DaysSpent = previous7Days
    .filter(t => t.transaction_type === 'usage')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const changePercent = previous7DaysSpent > 0 
    ? ((last7DaysSpent - previous7DaysSpent) / previous7DaysSpent) * 100 
    : 0;

  return {
    last7DaysSpent,
    previous7DaysSpent,
    changePercent,
    isIncrease: changePercent >= 0
  };
};

/**
 * Group transactions by verification type
 */
export const groupByVerificationType = (transactions: CreditTransaction[]) => {
  return transactions
    .filter(t => t.verification_type && t.transaction_type === 'usage')
    .reduce((acc, t) => {
      const type = t.verification_type!;
      if (!acc[type]) {
        acc[type] = {
          name: type,
          count: 0,
          totalCost: 0,
          avgCost: 0,
          transactions: []
        };
      }
      acc[type].count += 1;
      acc[type].totalCost += Math.abs(Number(t.amount));
      acc[type].transactions.push(t);
      return acc;
    }, {} as Record<string, {
      name: string;
      count: number;
      totalCost: number;
      avgCost: number;
      transactions: CreditTransaction[];
    }>);
};

/**
 * Group transactions by source
 */
export const groupBySource = (transactions: CreditTransaction[]) => {
  return transactions
    .filter(t => t.source && t.transaction_type === 'usage')
    .reduce((acc, t) => {
      const source = t.source!;
      if (!acc[source]) {
        acc[source] = {
          name: source,
          count: 0,
          totalCost: 0,
          avgCost: 0,
          transactions: []
        };
      }
      acc[source].count += 1;
      acc[source].totalCost += Math.abs(Number(t.amount));
      acc[source].transactions.push(t);
      return acc;
    }, {} as Record<string, {
      name: string;
      count: number;
      totalCost: number;
      avgCost: number;
      transactions: CreditTransaction[];
    }>);
};

/**
 * Calculate cost efficiency comparison across sources
 */
export const calculateCostEfficiency = (
  transactions: CreditTransaction[],
  pricing: VerificationPricing[]
) => {
  const sourceData = groupBySource(transactions);
  
  return Object.entries(sourceData).map(([source, data]) => {
    const avgCost = data.totalCost / data.count;
    
    // Find pricing for this source
    const sourcePricing = pricing.filter(p => p.source === source);
    const avgListedPrice = sourcePricing.length > 0
      ? sourcePricing.reduce((sum, p) => sum + Number(p.price), 0) / sourcePricing.length
      : 0;

    return {
      source,
      avgActualCost: avgCost,
      avgListedPrice,
      efficiency: avgListedPrice > 0 ? (avgActualCost / avgListedPrice) * 100 : 0,
      count: data.count,
      totalCost: data.totalCost
    };
  });
};

/**
 * Export analytics data to CSV
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  return `${currency}${Math.abs(amount).toFixed(2)}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string, format: 'short' | 'long' = 'short'): string => {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get time-based data for charts
 */
export const getTimeSeriesData = (
  transactions: CreditTransaction[],
  groupBy: 'day' | 'week' | 'month' = 'day'
) => {
  const grouped = transactions.reduce((acc, t) => {
    const date = new Date(t.created_at);
    let key: string;

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!acc[key]) {
      acc[key] = {
        date: key,
        usage: 0,
        topup: 0,
        balance: 0,
        transactions: []
      };
    }

    if (t.transaction_type === 'usage') {
      acc[key].usage += Math.abs(Number(t.amount));
    } else {
      acc[key].topup += Number(t.amount);
    }
    
    acc[key].balance = Number(t.balance_after);
    acc[key].transactions.push(t);

    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).sort((a: any, b: any) => 
    a.date.localeCompare(b.date)
  );
};

/**
 * Find top N verification types by usage
 */
export const getTopVerificationTypes = (
  transactions: CreditTransaction[],
  n: number = 5
) => {
  const grouped = groupByVerificationType(transactions);
  
  return Object.values(grouped)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, n)
    .map(item => ({
      ...item,
      avgCost: item.totalCost / item.count
    }));
};

/**
 * Calculate monthly projections based on current burn rate
 */
export const calculateMonthlyProjection = (
  transactions: CreditTransaction[],
  months: number = 3
) => {
  const stats = calculateVerificationStats(transactions);
  const projections = [];

  for (let i = 1; i <= months; i++) {
    const projectedSpend = stats.burnRate * 30 * i;
    const projectedBalance = Math.max(0, stats.currentBalance - projectedSpend);
    
    projections.push({
      month: i,
      projectedSpend: projectedSpend,
      projectedBalance: projectedBalance,
      needsTopup: projectedBalance < (stats.avgTransactionSize * 10) // Buffer for 10 transactions
    });
  }

  return projections;
};

// Type definitions
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
}

export interface VerificationPricing {
  id: string;
  verification_type: string;
  source: string;
  organization_id?: string;
  price: number;
  price_not_found: number;
  created_at: string;
}

