import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  calculateVerificationStats,
  calculateWeekOverWeekChange,
  getTopVerificationTypes,
  calculateMonthlyProjection,
  exportToCSV,
  formatCurrency,
  CreditTransaction
} from './analyticsUtils';

interface InsightsPanelProps {
  transactions: CreditTransaction[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ transactions }) => {
  const stats = calculateVerificationStats(transactions);
  const weekChange = calculateWeekOverWeekChange(transactions);
  const topVerifications = getTopVerificationTypes(transactions, 3);
  const projections = calculateMonthlyProjection(transactions, 3);

  const exportTransactions = () => {
    const exportData = transactions.map(t => ({
      Date: new Date(t.created_at).toLocaleDateString(),
      Type: t.transaction_type,
      'Verification Type': t.verification_type || 'N/A',
      Source: t.source || 'N/A',
      Amount: t.amount,
      'Balance After': t.balance_after,
      Description: t.description || ''
    }));

    exportToCSV(exportData, `verification-transactions-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Determine status and alerts
  const balanceStatus = stats.currentBalance > stats.avgTransactionSize * 20
    ? { type: 'healthy', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' }
    : stats.currentBalance > stats.avgTransactionSize * 10
    ? { type: 'warning', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' }
    : { type: 'critical', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };

  const trendStatus = weekChange.isIncrease
    ? { icon: TrendingUp, color: 'text-red-600', message: 'Spending increased' }
    : { icon: TrendingDown, color: 'text-green-600', message: 'Spending decreased' };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={exportTransactions}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Transactions
        </Button>
      </div>

      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Balance Health */}
        <Card className={`shadow-md border-none ${balanceStatus.bg}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <balanceStatus.icon className={`h-5 w-5 ${balanceStatus.color}`} />
                  <p className="text-sm font-semibold text-gray-700">Balance Health</p>
                </div>
                <p className={`text-2xl font-bold ${balanceStatus.color} mb-1`}>
                  {balanceStatus.type.charAt(0).toUpperCase() + balanceStatus.type.slice(1)}
                </p>
                <p className="text-xs text-gray-600">
                  {stats.daysRemaining !== Infinity
                    ? `~${stats.daysRemaining} days remaining at current rate`
                    : 'Sufficient balance'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spending Trend */}
        <Card className="shadow-md border-none bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <trendStatus.icon className={`h-5 w-5 ${trendStatus.color}`} />
                  <p className="text-sm font-semibold text-gray-700">Weekly Trend</p>
                </div>
                <p className={`text-2xl font-bold ${trendStatus.color} mb-1`}>
                  {Math.abs(weekChange.changePercent).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600">{trendStatus.message} vs last week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Burn Rate */}
        <Card className="shadow-md border-none bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-semibold text-gray-700">Daily Burn Rate</p>
                </div>
                <p className="text-2xl font-bold text-purple-600 mb-1">
                  {formatCurrency(stats.burnRate)}
                </p>
                <p className="text-xs text-gray-600">Average daily credit usage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Verification Types */}
      {topVerifications.length > 0 && (
        <Card className="shadow-md border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Verification Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVerifications.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {item.name.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.count} verifications • Avg: {formatCurrency(item.avgCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-600">
                      {formatCurrency(item.totalCost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Projections */}
      <Card className="shadow-md border-none bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            3-Month Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projections.map((proj, index) => (
              <div key={index} className="flex items-center justify-between p-3 border-l-4 border-purple-600 bg-slate-50 rounded-r-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">
                    Month {proj.month}
                  </p>
                  <p className="text-xs text-gray-600">
                    Projected spend: {formatCurrency(proj.projectedSpend)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${proj.needsTopup ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(proj.projectedBalance)}
                  </p>
                  {proj.needsTopup && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      Top-up needed
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <Card className="shadow-md border-none bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Quick Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-gray-600 mb-1">Total Transactions</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.totalUsageCount + stats.totalTopupCount}
              </p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-gray-600 mb-1">Usage Count</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalUsageCount}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-gray-600 mb-1">Top-up Count</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalTopupCount}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
              <p className="text-xs text-gray-600 mb-1">Net Flow</p>
              <p className={`text-xl font-bold ${
                stats.totalTopups - stats.totalSpent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.totalTopups - stats.totalSpent)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {(balanceStatus.type === 'warning' || balanceStatus.type === 'critical' || projections.some(p => p.needsTopup)) && (
        <Card className="shadow-md border-none bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-500">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              {balanceStatus.type === 'critical' && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Urgent:</strong> Your balance is critically low. Consider adding credits immediately to avoid service interruption.
                  </span>
                </li>
              )}
              {balanceStatus.type === 'warning' && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>
                    <strong>Action needed:</strong> Your balance is running low. Plan a top-up within the next few days.
                  </span>
                </li>
              )}
              {weekChange.isIncrease && Math.abs(weekChange.changePercent) > 20 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>
                    Your spending increased by {Math.abs(weekChange.changePercent).toFixed(1)}% this week. Review usage patterns to identify the cause.
                  </span>
                </li>
              )}
              {projections.filter(p => p.needsTopup).length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>
                    Based on current usage, you'll need a credit top-up within {projections.findIndex(p => p.needsTopup) + 1} month(s).
                  </span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold mt-0.5">•</span>
                <span>
                  Consider setting up automatic alerts when balance drops below {formatCurrency(stats.avgTransactionSize * 15)}.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsPanel;