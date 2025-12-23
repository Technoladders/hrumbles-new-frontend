// src/components/global/SingleOrganizationDashboard.tsx

import { FC, useState, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import Loader from '@/components/ui/Loader';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import moment from 'moment';
import {
    ArrowLeft, Users, FileText, BrainCircuit, ListChecks,
    Clock, Loader2, BriefcaseBusiness, Building2, Coins,
    MapPin, Globe, Mail, Phone, Building, AlertCircle
} from 'lucide-react';

import { ManageVerificationPricingModal } from "./OrganizationManagement/ManageVerificationPricingModal";
import TrialSubscriptionCard from "./OrganizationManagement/TrialSubscriptionCard";
import SubscriptionBillingModal from "./OrganizationManagement/SubscriptionBillingModal";

// --- Types ---
interface OrganizationDetails {
  id: string;
  name: string;
  superadmin_email: string | null;
  subscription_status: 'trial' | 'active' | 'inactive' | 'expired' | 'canceled';
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_plan: string | null;
  trial_extended: boolean;
  role_credit_limits: any; // Added to view current limits
  total_users: number;
  user_counts_by_role: Record<string, any>;
  talent_pool_count: number;
  total_jobs: number;
  total_clients: number;
  total_epfo_verifications: number;
  total_ai_tokens_used: number;
}

interface OrganizationProfile {
  company_name: string;
  logo_url: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  tax_id: string | null;
}

// --- Reusable Components ---
const StatCard = ({ title, value, icon, footer }: any) => (
    <Card className="shadow-sm border-gray-200 h-full flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
        </CardContent>
        {footer && <CardFooter className="pt-0 text-xs text-muted-foreground">{footer}</CardFooter>}
    </Card>
);

const ChartCard = ({ title, description, children, isLoading }: any) => (
    <Card className="shadow-sm border-gray-200 bg-white h-full">
        <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-[150px]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600"/>
                </div>
            ) : children}
        </CardContent>
    </Card>
);

const SingleOrganizationDashboard: FC = () => {
    const { organizationId } = useParams<{ organizationId: string }>();
    const [isManageSubscriptionModalOpen, setIsManageSubscriptionModalOpen] = useState(false);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

    const roleDisplayNameMap: Record<string, string> = {
        organization_superadmin: 'Super Admin',
        admin: 'Admin',
        employee: 'Employee',
    };

    // 1. Fetch Stats & Basic Details (RPC)
    const { data: details, isLoading: detailsLoading, refetch: detailsRefetch } = useQuery({
        queryKey: ['organizationDashboardDetails', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await supabase.rpc('get_organization_dashboard_details', { org_id: organizationId });
            if (error) throw error;
            return data as OrganizationDetails;
        },
        enabled: !!organizationId,
    });

    // 2. Fetch Rich Profile Details (Table)
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['organizationProfile', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            const { data, error } = await supabase
                .from('hr_organization_profile')
                .select('*')
                .eq('organization_id', organizationId)
                .single();
            // It's okay if error (profile might not exist yet), just return null
            if (error && error.code !== 'PGRST116') console.error("Profile fetch error:", error);
            return data as OrganizationProfile;
        },
        enabled: !!organizationId,
    });

    // 3. Fetch Pending Invoices (To show "Pending Activation" state)
    const { data: pendingSubscriptionInvoice, isLoading: invoiceLoading } = useQuery({
        queryKey: ['pendingSubscriptionInvoice', organizationId],
        queryFn: async () => {
             if (!organizationId) return null;
             // Find latest invoice that has a config but is NOT paid
             const { data, error } = await supabase
                .from('hr_invoices')
                .select('*')
                .eq('organization_client_id', organizationId)
                .neq('status', 'Paid')
                .not('subscription_config', 'is', null) // Only sub invoices
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
             
             if(error) console.error("Invoice check error:", error);
             return data;
        },
        enabled: !!organizationId
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

    const isLoading = detailsLoading || profileLoading || weeklyActivityLoading || loginsLoading || invoiceLoading;

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader size={60} /></div>;
    if (!details) return <div className="p-8 text-red-500">No organization data found.</div>;

    // --- Profile Helpers ---
    const fullAddress = [
        profile?.address_line1, profile?.address_line2, 
        profile?.city, profile?.state, profile?.zip_code, profile?.country
    ].filter(Boolean).join(', ');

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8 space-y-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                
                {/* --- Header & Navigation --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <RouterLink to="/organization" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to All Organizations
                        </RouterLink>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            {profile?.company_name || details.name}
                            <Badge className={`ml-2 ${details.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} border-0`}>
                                {details.subscription_status.toUpperCase()}
                            </Badge>
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">ID: {details.id}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2 bg-white" onClick={() => setIsPricingModalOpen(true)}>
                            <Coins className="h-4 w-4 text-yellow-600" />
                            Credit Balance
                        </Button>
                        <Button className="gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => setIsManageSubscriptionModalOpen(true)}>
                            <BriefcaseBusiness className="h-4 w-4" />
                            Manage Subscription
                        </Button>
                    </div>
                </div>

                {/* --- Pending Invoice Alert --- */}
                {pendingSubscriptionInvoice && (
                    <Alert className="bg-orange-50 border-orange-200">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800 font-semibold">Pending Subscription Activation</AlertTitle>
                        <AlertDescription className="text-orange-700">
                            A plan update to <strong>{pendingSubscriptionInvoice.subscription_config?.plan_name}</strong> is pending payment. 
                            Invoice <strong>#{pendingSubscriptionInvoice.invoice_number}</strong> ({pendingSubscriptionInvoice.status}) needs to be settled for changes to apply.
                        </AlertDescription>
                    </Alert>
                )}

                {/* --- Organization Profile Card --- */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <div className="md:flex">
                        {/* Logo Section */}
                        <div className="md:w-64 bg-slate-100 flex items-center justify-center p-8 border-r border-slate-100">
                            {profile?.logo_url ? (
                                <img src={profile.logo_url} alt="Logo" className="max-h-24 w-auto object-contain" />
                            ) : (
                                <div className="h-24 w-24 bg-slate-200 rounded-full flex items-center justify-center">
                                    <Building className="h-10 w-10 text-slate-400" />
                                </div>
                            )}
                        </div>
                        
                        {/* Details Grid */}
                        <div className="flex-1 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">Organization Profile</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase">Website</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                                        {profile?.website ? (
                                            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="hover:underline text-blue-600">
                                                {profile.website}
                                            </a>
                                        ) : 'N/A'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase">Contact Email</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        {profile?.email || details.superadmin_email || 'N/A'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase">Phone</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                        {profile?.phone || 'N/A'}
                                    </div>
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-xs font-medium text-slate-400 uppercase">Headquarters Address</p>
                                    <div className="flex items-start gap-2 text-sm text-slate-700">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                                        {fullAddress || 'Address not provided'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-400 uppercase">Tax / GST ID</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                                        {profile?.tax_id || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- Subscription Status --- */}
<TrialSubscriptionCard
                    organizationId={details.id}
                    subscriptionStatus={details.subscription_status}
                    // Pass specific dates based on status logic inside the card, 
                    // or pass raw values and let card decide
                    startDate={details.subscription_status === 'trial' ? details.trial_start_date : details.subscription_start_date} // fallback to created_at if null
                    endDate={details.subscription_status === 'trial' ? details.trial_end_date : details.subscription_expires_at}
                    subscriptionPlan={details.subscription_plan}
                    trialExtended={details.trial_extended}
                    onUpgradeClick={() => setIsManageSubscriptionModalOpen(true)}
                    onExtendTrialClick={() => setIsManageSubscriptionModalOpen(true)}
                    onOpenManageSubscription={() => setIsManageSubscriptionModalOpen(true)}
                    pendingInvoice={pendingSubscriptionInvoice}
                />

                {/* --- Analytics Grid --- */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mt-2">
                    <RouterLink to={`/organization/${organizationId}/users`} className="group">
                        <StatCard
                            title="Total Users"
                            value={details.total_users}
                            icon={<Users className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />}
                            footer={
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(details.user_counts_by_role).map(([role, roleCounts]) => (
                                        <Badge key={role} variant="outline" className="text-[10px] font-normal bg-slate-50">
                                            {roleDisplayNameMap[role]?.split(' ')[0] || role}: {(roleCounts as any).total}
                                        </Badge>
                                    ))}
                                </div>
                            }
                        />
                    </RouterLink>
                    
                    <RouterLink to={`/organization/${organizationId}/talent`} className="group">
                        <StatCard 
                            title="Talent Pool" 
                            value={details.talent_pool_count} 
                            icon={<FileText className="h-4 w-4 text-slate-400 group-hover:text-purple-500 transition-colors" />} 
                            footer="Total Candidates" 
                        />
                    </RouterLink>

                    <RouterLink to={`/organization/${organizationId}/jobs`} className="group">
                        <StatCard
                            title="Active Jobs"
                            value={details.total_jobs || 0}
                            icon={<BriefcaseBusiness className="h-4 w-4 text-slate-400 group-hover:text-green-500 transition-colors" />}
                            footer="Open Postings"
                        />
                    </RouterLink>

                    <RouterLink to={`/organization/${organizationId}/clients`} className="group">
                        <StatCard
                            title="Clients"
                            value={details.total_clients || 0}
                            icon={<Building2 className="h-4 w-4 text-slate-400 group-hover:text-orange-500 transition-colors" />}
                            footer="Registered Companies"
                        />
                    </RouterLink>

                    <StatCard 
                        title="EPFO Checks" 
                        value={details.total_epfo_verifications} 
                        icon={<ListChecks className="h-4 w-4 text-slate-400" />} 
                        footer="All-time Verifications" 
                    />
                    
                    <StatCard 
                        title="AI Tokens" 
                        value={details.total_ai_tokens_used.toLocaleString()} 
                        icon={<BrainCircuit className="h-4 w-4 text-slate-400" />} 
                        footer="Usage Consumption" 
                    />
                </div>

                {/* --- Charts & Lists --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <ChartCard title="Recent Logins" description="Last 5 active users" isLoading={loginsLoading}>
                            <div className="space-y-4 pr-2">
                                {recentLogins?.length > 0 ? recentLogins.map(user => (
                                    <div key={user.email} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 whitespace-nowrap">
                                            {moment(user.last_login).fromNow(true)}
                                        </div>
                                    </div>
                                )) : <p className="text-center text-sm text-gray-500 pt-8">No recent login activity.</p>}
                            </div>
                        </ChartCard>
                    </div>

                    <div className="lg:col-span-2">
                        <ChartCard title="Weekly AI Usage (Tokens)" isLoading={weeklyActivityLoading}>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={weeklyActivity}>
                                    <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs text-gray-500" />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} 
                                        contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="gemini_tokens_used" name="Tokens Used" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            {organizationId && (
                <>
                   <SubscriptionBillingModal
                        isOpen={isManageSubscriptionModalOpen}
                        onClose={() => setIsManageSubscriptionModalOpen(false)}
                        organizationId={organizationId}
                        // Pass existing data to pre-fill the form
                        initialData={{
                            planId: details.subscription_plan, // Will try to match by name
                            limits: details.role_credit_limits,
                            expiryDate: details.subscription_status === 'trial' ? details.trial_end_date : details.subscription_expires_at
                        }}
                        onSuccess={() => {
                            detailsRefetch();
                        }}
                    />

                    <ManageVerificationPricingModal 
                        organizationId={organizationId}
                        isOpen={isPricingModalOpen}
                        onClose={() => setIsPricingModalOpen(false)}
                    />
                </>
            )}
        </div>
    );
};

export default SingleOrganizationDashboard;