// src/components/global/SingleOrganizationDashboard.tsx

import { FC,useState, useEffect } from 'react';
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
    Clock, ArrowRight, Loader2, BriefcaseBusiness, Building2
} from 'lucide-react';
import TrialSubscriptionCard from "./OrganizationManagement/TrialSubscriptionCard";
import ManualSubscriptionForm from "./OrganizationManagement/ManualSubscriptionForm";
import { Button } from "@/components/ui/button"; // Make sure Button is imported if you use it for the trigger
import { Pencil } from 'lucide-react';



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


// --- NEW Interface for Organization Details (from DB) ---
interface OrganizationDetails {
  id: string;
  name: string;
  superadmin_email: string | null;
  // Add ALL new subscription fields here
  subscription_status: 'trial' | 'active' | 'inactive' | 'expired' | 'canceled';
  trial_start_date: string | null; // ISO string from DB
  trial_end_date: string | null;   // ISO string from DB
  subscription_plan: string | null;
  trial_extended: boolean;
  // Add existing fields that 'get_organization_dashboard_details' RPC returns
  total_users: number;
  user_counts_by_role: Record<string, number>;
  talent_pool_count: number;
  total_jobs: number;
  total_clients: number;
  total_epfo_verifications: number;
  total_ai_tokens_used: number;
  // ... any other fields fetched by get_organization_dashboard_details ...
}
// --- END NEW Interface ---


const SingleOrganizationDashboard: FC = () => {
    const { organizationId } = useParams<{ organizationId: string }>();

    const roleDisplayNameMap = {
        organization_superadmin: 'Super Admin',
        admin: 'Admin',
        employee: 'Employee',
    };


     // --- NEW STATE FOR MODAL ---
    const [isManageSubscriptionModalOpen, setIsManageSubscriptionModalOpen] = useState(false);
    // --- END NEW STATE ---


    // --- DATA FETCHING HOOKS ---
    // This query now fetches all the main details, including total_jobs and total_clients
  const { data: details, isLoading: detailsLoading, error: detailsError, refetch: detailsRefetch } = useQuery({// Added detailsError for overall debugging
        queryKey: ['organizationDashboardDetails', organizationId],
        queryFn: async () => {
            if (!organizationId) return null;
            // console.log("Fetching organization details for:", organizationId); // Optional debug
            const { data, error } = await supabase.rpc('get_organization_dashboard_details', { org_id: organizationId });
            if (error) {
                console.error("Error fetching organization details:", error.message); // Debug log
                throw error;
            }
            // console.log("Organization details fetched:", data); // Optional debug
            return data;
        },
        enabled: !!organizationId,
    });

    // --- REMOVED: Separate useQuery hooks for totalJobsCount and totalClientsCount ---
    // These are now handled by the 'details' query

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

    // --- Reverted isLoading to depend only on the main data fetches ---
    const isLoading = detailsLoading || weeklyActivityLoading || loginsLoading;

    // --- Optional Error Display (for the main details fetch) ---
    if (detailsError) {
        return <div className="p-8 text-red-500">Error loading organization data: {detailsError.message}</div>;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader size={60} /></div>;
    }
    // Check if details is null even after loading, which could indicate no data found for the org_id
    if (!details) {
        return <div className="p-8 text-red-500">No organization data found for ID: {organizationId}.</div>;
    }

    // ... (inside SingleOrganizationDashboard component, after useQuery hooks) ...

// --- NEW: Handlers for TrialSubscriptionCard buttons ---
const handleUpgradeClick = async (orgId: string) => {
    // You can integrate Chakra UI's useToast here if you want
    // const toast = useToast();
    // toast({
    //   title: "Upgrade functionality not implemented",
    //   description: `Initiating upgrade for organization ${orgId}. (This would open a payment portal)`,
    //   status: "info",
    //   duration: 5000,
    //   isClosable: true,
    // });
    alert(`Upgrade for organization ${orgId}. (This would open a payment portal)`);
};

const handleExtendTrialClick = async (orgId: string) => {
    // const toast = useToast(); // If using Chakra UI toasts
    try {
        alert("Extending Trial..."); // Placeholder alert for now, replace with toast

        const { data, error } = await supabase.rpc('extend_organization_trial', {
            p_org_id: orgId,
            p_duration_days: 21 // Extend by 21 days
        });

        if (error) throw error;

        alert(`Trial Extended for organization ${orgId} by 21 days!`); // Placeholder alert
        detailsRefetch(); // <-- THIS IS IMPORTANT: Re-fetch the data to update the UI
    } catch (err: any) {
        console.error("Error extending trial:", err.message);
        alert(`Error extending trial: ${err.message}`); // Placeholder alert
    }
};
// --- END NEW Handlers ---

// ... (rest of loading/error checks and return statement) ...

 // --- NEW: Function to open the form directly (e.g., from an 'Edit' button) ---
  const handleOpenManageSubscription = () => {
    setIsManageSubscriptionModalOpen(true);
  };
  // --- END NEW ---

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 space-y-6">
            <div className="max-w-9xl mx-auto">
                <RouterLink to="/organization" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Organizations
                </RouterLink>

                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{details.name}</h1>
                {/* --- NEW: Trial/Subscription Status Card --- */}
            <TrialSubscriptionCard
                organizationId={details.id}
                subscriptionStatus={details.subscription_status}
                trialStartDate={details.trial_start_date || undefined}
                trialEndDate={details.trial_end_date || undefined}
                subscriptionPlan={details.subscription_plan || undefined}
                trialExtended={details.trial_extended}
                onUpgradeClick={handleUpgradeClick}
                onExtendTrialClick={handleExtendTrialClick}
                onOpenManageSubscription={handleOpenManageSubscription} 
            />
            {/* --- END NEW --- */}

                 


                {/* --- ROW 1: Stat Cards --- */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 mt-6">
                    <RouterLink to={`/organization/${organizationId}/users`} className=" hover:bg-slate-100 rounded-lg transition-colors">
                    <StatCard
                        title="Total Users"
                        value={details.total_users}
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                        footer={
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(details.user_counts_by_role).map(([role, roleCounts]) => (
                                  <Badge key={role} variant="secondary">{roleDisplayNameMap[role] || role}: {(roleCounts as any).total}</Badge>
                                ))}

                            </div>

                        }
                    />
                    </RouterLink>
                      <RouterLink to={`/organization/${organizationId}/talent`} className="hover:bg-slate-100 rounded-lg transition-colors">
                    <StatCard title="Talent Pool" value={details.talent_pool_count} icon={<FileText className="h-4 w-4 text-muted-foreground" />} footer={<p>Total Candidates</p>} /></RouterLink>
                   

                    {/* --- NOW READING total_jobs and total_clients DIRECTLY FROM 'details' --- */}
                    <RouterLink to={`/organization/${organizationId}/jobs`} className="hover:bg-slate-100 rounded-lg transition-colors">
                    <StatCard
                        title="Total Jobs"
                        value={details.total_jobs || 0} // Using the value from the 'details' object
                        icon={<BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />}
                        footer={<p>Active job postings</p>}
                    />
                    </RouterLink>
                    <RouterLink to={`/organization/${organizationId}/clients`} className="hover:bg-slate-100 rounded-lg transition-colors">
                    <StatCard
                        title="Total Clients"
                        value={details.total_clients || 0} // Using the value from the 'details' object
                        icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                        footer={<p>Registered client organizations</p>}
                    />
                    </RouterLink>

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
                          <ChartCard title="Weekly AI Usage (Tokens)" isLoading={weeklyActivityLoading}>
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={weeklyActivity}>
                                <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                                <Tooltip cursor={{fill: 'rgba(168, 85, 247, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                                <Bar dataKey="gemini_tokens_used" name="Tokens Used" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                        {/* <Card className="shadow-md border-none h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>Detailed Views</CardTitle>
                                <CardDescription>Drill down into specific areas for management and insights.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-center space-y-4">
                              <RouterLink to={`/organization/${organizationId}/jobs`} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                           <div>
                             <h3 className="font-semibold">Job Postings</h3>
                             <p className="text-sm text-gray-600">Manage all job advertisements and applications.</p>
                          </div>
                           <ArrowRight className="h-5 w-5 text-gray-500"/>
                          </RouterLink>
                        <RouterLink to={`/organization/${organizationId}/clients`} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                        <div>
                         <h3 className="font-semibold">Client Overview</h3>
                          <p className="text-sm text-gray-600">View and manage all registered clients.</p>
                        </div>
                          <ArrowRight className="h-5 w-5 text-gray-500"/>
                           </RouterLink>
                            
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
                        </Card> */}
                    </div>
                </div>

                {/* --- ROW 3: Weekly Charts --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* <ChartCard title="Weekly EPFO Verifications" isLoading={weeklyActivityLoading}>
                        <ResponsiveContainer width="100%" height={150}>
                            <BarChart data={weeklyActivity}>
                                <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                                <Bar dataKey="epfo_verifications" name="EPFO Checks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard> */}
                  
                </div>

            </div>

     {/* --- NEW: Manual Subscription Management Modal (rendered conditionally) --- */}
     {organizationId && ( // Only render if organizationId is available
       <ManualSubscriptionForm
         organizationId={organizationId}
         onUpdateSuccess={detailsRefetch}
         isOpen={isManageSubscriptionModalOpen}
         onClose={() => setIsManageSubscriptionModalOpen(false)}
       />
     )}
     {/* --- END NEW MODAL --- */}

        </div>
    );
};

export default SingleOrganizationDashboard;