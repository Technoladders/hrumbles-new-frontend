// src/components/global/SingleOrganizationDashboard.tsx

import { FC } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loader from '@/components/ui/Loader';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import {
    ArrowLeft, Users, FileText, BrainCircuit, ListChecks,
    Clock, ArrowRight, Loader2
} from 'lucide-react';

// --- Reusable Component for Stat Cards with Optional Footer ---
const StatCard = ({ title, value, icon, footer }) => (
    <Card className="shadow-md border-none h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
        {footer && <CardFooter className="pt-0 text-xs text-muted-foreground">{footer}</CardFooter>}
    </Card>
);

// --- Reusable Component for Chart Cards ---
const ChartCard = ({ title, description, children, isLoading }) => (
    <Card className={`shadow-md border-none bg-white h-full`}>
        <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-[150px]"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>
            ) : children}
        </CardContent>
    </Card>
);

const SingleOrganizationDashboard: FC = () => {
    const { organizationId } = useParams<{ organizationId: string }>();

    const roleDisplayNameMap = {
        organization_superadmin: 'Super Admin',
        admin: 'Admin',
        employee: 'Employee',
    };

    // --- DATA FETCHING HOOKS ---
    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['organizationDashboardDetails', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await supabase.rpc('get_organization_dashboard_details', { org_id: organizationId });
            if (error) throw error;
            return data;
        },
        enabled: !!organizationId,
    });

    const { data: weeklyActivity, isLoading: weeklyActivityLoading } = useQuery({
        queryKey: ['orgWeeklyActivity', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await supabase.rpc('get_weekly_activity_summary', { org_id: organizationId });
            if (error) throw error;
            return data;
        },
        enabled: !!organizationId
    });

    const { data: recentLogins, isLoading: loginsLoading } = useQuery({
        queryKey: ['orgRecentLogins', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await supabase.rpc('get_recently_logged_in_users', { org_id: organizationId });
            if (error) throw error;
            return data;
        },
        enabled: !!organizationId
    });

    const isLoading = detailsLoading || weeklyActivityLoading || loginsLoading;

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader size={60} /></div>;
    }
    if (!details) {
        return <div className="p-8 text-red-500">Error loading organization data.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 space-y-6">
            <div className="max-w-9xl mx-auto">
                <RouterLink to="/organization" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Organizations
                </RouterLink>

                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{details.name}</h1>
                
                {/* --- ROW 1: New Stat Cards --- */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
                    <StatCard 
                        title="Total Users" 
                        value={details.total_users} 
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                        footer={
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(details.user_counts_by_role).map(([role, count]) => (
                                    <Badge key={role} variant="secondary">{roleDisplayNameMap[role] || role}: {count as number}</Badge>
                                ))}
                            </div>
                        }
                    />
                    <StatCard title="Talent Pool" value={details.talent_pool_count} icon={<FileText className="h-4 w-4 text-muted-foreground" />} footer={<p>Total Candidates</p>} />
                    <StatCard title="Total EPFO Verifications" value={details.total_epfo_verifications} icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} footer={<p>All-time background checks</p>} />
                    <StatCard title="Total AI Usage" value={details.total_ai_tokens_used.toLocaleString()} icon={<BrainCircuit className="h-4 w-4 text-muted-foreground" />} footer={<p>Tokens consumed</p>} />
                </div>

                {/* --- ROW 2: Recent Logins & Detailed Views --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-1">
                        <ChartCard title="Recent Logins" description="Last 5 active users" isLoading={loginsLoading}>
                            <ul className="space-y-4">
                                {recentLogins?.length > 0 ? recentLogins.map(user => (
                                    <li key={user.email} className="flex items-center space-x-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Clock className="h-3 w-3 mr-1.5"/>
                                            {moment(user.last_login).fromNow()}
                                        </div>
                                    </li>
                                )) : <p className="text-center text-sm text-gray-500 pt-8">No recent login activity.</p>}
                            </ul>
                        </ChartCard>
                    </div>
                    <div className="lg:col-span-2">
                        <Card className="shadow-md border-none h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>Detailed Views</CardTitle>
                                <CardDescription>Drill down into specific areas for management and insights.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-center space-y-4">
                                <RouterLink to={`/organization/${organizationId}/users`} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                    <div>
                                        <h3 className="font-semibold">User Management</h3>
                                        <p className="text-sm text-gray-600">View and manage all employees in the organization.</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-500"/>
                                </RouterLink>
                                <RouterLink to={`/organization/${organizationId}/talent`} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                                    <div>
                                        <h3 className="font-semibold">Talent Pool Explorer</h3>
                                        <p className="text-sm text-gray-600">Browse and search all candidates in the talent pool.</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-gray-500"/>
                                </RouterLink>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- ROW 3: Weekly Charts --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <ChartCard title="Weekly EPFO Verifications" isLoading={weeklyActivityLoading}>
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={weeklyActivity}>
                                <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                                <Bar dataKey="epfo_verifications" name="EPFO Checks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Weekly AI Usage (Tokens)" isLoading={weeklyActivityLoading}>
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={weeklyActivity}>
                                <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                                <Tooltip cursor={{fill: 'rgba(168, 85, 247, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                                <Bar dataKey="gemini_tokens_used" name="Tokens Used" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};

export default SingleOrganizationDashboard;