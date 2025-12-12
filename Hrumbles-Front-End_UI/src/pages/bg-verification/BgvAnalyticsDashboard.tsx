// src/pages/jobs/ai/analytics/BgvAnalyticsDashboard.tsx

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Loader from '@/components/ui/Loader';
import { BarChart, Activity, Wallet, Users, SearchCheck } from 'lucide-react';

const BgvAnalyticsDashboard = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // 1. Fetch Lookups
  const { data: lookups = [], isLoading: isLoadingLookups } = useQuery({
    queryKey: ['analytics-lookups', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uanlookups')
        .select(`
            *,
            verifier:verified_by (
                id, first_name, last_name, email, profile_picture_url
            )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // 2. Fetch Transaction History (For Accurate Credits Calculation)
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['analytics-transactions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('transaction_type', 'usage'); 
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  // --- PROCESSING LOGIC ---
  const stats = useMemo(() => {
    // A. Aggregate by Verification Type
    const typeStats: { [key: string]: { count: number; credits: number; success: number } } = {};
    
    // B. Aggregate by User (Verified By)
    const userStats: { [key: string]: { name: string; email: string; avatar: string; count: number; credits: number } } = {};

    // Helper to find credits used for a specific lookup
    const findCredits = (lookupId: number) => {
        const tx = transactions.find((t: any) => t.reference_id === lookupId);
        return tx ? Math.abs(Number(tx.amount)) : 0;
    };

    lookups.forEach((lookup: any) => {
        const type = lookup.lookup_type;
        const credits = findCredits(lookup.id);
        
        // Update Type Stats
        if (!typeStats[type]) typeStats[type] = { count: 0, credits: 0, success: 0 };
        typeStats[type].count += 1;
        typeStats[type].credits += credits;
        
        if (lookup.status && lookup.status !== '9' && lookup.status !== '1015') {
             typeStats[type].success += 1;
        }

        // Update User Stats
        if (lookup.verifier) {
            const uid = lookup.verifier.id;
            const name = `${lookup.verifier.first_name} ${lookup.verifier.last_name}`;
            if (!userStats[uid]) {
                userStats[uid] = { 
                    name, 
                    email: lookup.verifier.email, 
                    avatar: lookup.verifier.profile_picture_url, 
                    count: 0, 
                    credits: 0 
                };
            }
            userStats[uid].count += 1;
            userStats[uid].credits += credits;
        }
    });

    return { 
        typeStats, 
        userStats, 
        totalLookups: lookups.length, 
        totalCreditsUsed: Object.values(typeStats).reduce((acc, curr) => acc + curr.credits, 0) 
    };
  }, [lookups, transactions]);


  if (isLoadingLookups || isLoadingTransactions) return <div className="h-64 flex items-center justify-center"><Loader /></div>;

  return (
    <div className="space-y-6">
      
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-indigo-50 border-indigo-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-800">Credits Used</CardTitle>
                <Wallet className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-indigo-700">{stats.totalCreditsUsed.toFixed(0)}</div>
                <p className="text-xs text-indigo-600/70">Total credits consumed</p>
            </CardContent>
        </Card>

        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Lookups</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-800">{stats.totalLookups}</div>
                <p className="text-xs text-gray-500">Total API calls made</p>
            </CardContent>
        </Card>

        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Verifiers</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-800">{Object.keys(stats.userStats).length}</div>
                <p className="text-xs text-gray-500">Employees running checks</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Usage & Credits Breakup by Type */}
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart size={18}/> Usage & Credits Breakup</CardTitle>
                <CardDescription>Breakdown of verifications by type.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Verification Type</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Credits Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(stats.typeStats).map(([type, data]) => (
                            <TableRow key={type}>
                                <TableCell className="font-medium capitalize text-sm">
                                    {type.replace(/_/g, ' ').replace('gl', '')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="secondary">{data.count}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-gray-700">
                                    {data.credits.toFixed(0)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(stats.typeStats).length === 0 && (
                            <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No data available.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* 3. Verified By User Table */}
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><SearchCheck size={18}/> Verification Activity by User</CardTitle>
                <CardDescription>See which team members are verifying candidates.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead className="text-right">Lookups</TableHead>
                            <TableHead className="text-right">Credits Consumed</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(stats.userStats).map(([id, user]) => (
                            <TableRow key={id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.name}</span>
                                        <span className="text-xs text-gray-500">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                     {user.count}
                                </TableCell>
                                <TableCell className="text-right font-medium text-red-600">
                                    {user.credits.toFixed(0)}
                                </TableCell>
                            </TableRow>
                        ))}
                         {Object.keys(stats.userStats).length === 0 && (
                            <TableRow><TableCell colSpan={3} className="text-center text-gray-500">No active verifiers found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BgvAnalyticsDashboard;
// Enhanced price not found with new features