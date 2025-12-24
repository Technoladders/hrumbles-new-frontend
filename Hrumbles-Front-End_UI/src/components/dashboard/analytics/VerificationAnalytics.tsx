import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Activity, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreditBalanceChart from './CreditBalanceChart';

const COLORS = ['#7731E8', '#A855F7', '#C084FC', '#E9D5FF', '#F3E8FF'];

const formatVerificationType = (type: string): string => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const VerificationAnalytics: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0, totalTopups: 0, currentBalance: 0, avgTransactionSize: 0, changePercent: 0
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const { data: transactionsData, error } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (transactionsData && transactionsData.length > 0) {
          const totalSpent = transactionsData.filter(t => t.transaction_type === 'usage').reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const totalTopups = transactionsData.filter(t => t.transaction_type === 'topup').reduce((sum, t) => sum + Number(t.amount), 0);
          const currentBalance = Number(transactionsData[transactionsData.length - 1]?.balance_after || 0);
          const usageCount = transactionsData.filter(t => t.transaction_type === 'usage').length;
          const avgTransactionSize = usageCount > 0 ? totalSpent / usageCount : 0;

          const now = new Date();
          const last7DaysSpent = transactionsData.filter(t => t.transaction_type === 'usage' && (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const prev7DaysSpent = transactionsData.filter(t => t.transaction_type === 'usage' && (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24) > 7 && (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 14).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          const changePercent = prev7DaysSpent > 0 ? ((last7DaysSpent - prev7DaysSpent) / prev7DaysSpent) * 100 : 0;

          setStats({ totalSpent, totalTopups, currentBalance, avgTransactionSize, changePercent });
          setTransactions(transactionsData);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAnalyticsData();
  }, [organizationId]);

  const transactionTypeData = [
    { name: 'Usage', value: transactions.filter(t => t.transaction_type === 'usage').length },
    { name: 'Top-ups', value: transactions.filter(t => t.transaction_type === 'topup').length }
  ];

  const verificationUsageMap = new Map<string, { name: string; count: number; totalCost: number }>();
  transactions.filter(t => t.verification_type && t.transaction_type === 'usage').forEach(t => {
    const type = t.verification_type!;
    if (!verificationUsageMap.has(type)) verificationUsageMap.set(type, { name: type, count: 0, totalCost: 0 });
    const entry = verificationUsageMap.get(type)!;
    entry.count += 1;
    entry.totalCost += Math.abs(Number(t.amount));
  });
  const verificationUsageArray = Array.from(verificationUsageMap.values()).sort((a, b) => b.totalCost - a.totalCost);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SECTION 1: TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Credit Balance</p>
            {/* HIGHLIGHT: Changed .toFixed(2) to Math.round() */}
            <h3 className="text-2xl font-black text-purple-600 mt-1">{Math.round(stats.currentBalance)} Credits</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Credits Spent</p>
            {/* HIGHLIGHT: Changed .toFixed(2) to Math.round() */}
            <h3 className="text-2xl font-black text-gray-800 mt-1">{Math.round(stats.totalSpent)}</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Credit Top-ups</p>
            {/* HIGHLIGHT: Changed .toFixed(2) to Math.round() */}
            <h3 className="text-2xl font-black text-gray-800 mt-1">{Math.round(stats.totalTopups)}</h3>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Credit Usage</p>
            {/* HIGHLIGHT: Changed .toFixed(2) to Math.round() */}
            <h3 className="text-2xl font-black text-gray-800 mt-1">{Math.round(stats.avgTransactionSize)}</h3>
            <div className="flex items-center mt-1">
              {stats.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" /> : <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />}
              <span className={`text-[10px] font-bold ${stats.changePercent >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                {Math.abs(stats.changePercent).toFixed(1)}% usage vs last week
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreditBalanceChart organizationId={organizationId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader><CardTitle className="text-base font-bold">Transaction Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={transactionTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {transactionTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} transactions`]} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none bg-white">
          <CardHeader><CardTitle className="text-base font-bold">Verification Usage by Type</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationUsageArray} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={formatVerificationType} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} label={{ value: 'Credits', angle: 90, position: 'insideRight' }} />
                  {/* HIGHLIGHT: Tooltip now shows whole numbers */}
                  <Tooltip labelFormatter={formatVerificationType} formatter={(v: any) => [Math.round(v)]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#7731E8" name="Usage Count" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar yAxisId="right" dataKey="totalCost" fill="#A855F7" name="Credits Used" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificationAnalytics;