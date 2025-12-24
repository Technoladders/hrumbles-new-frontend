import React, { useState, useEffect } from "react";
import { supabase } from "../../integrations/supabase/client";
import {
    ComposedChart, 
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,   
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
    Legend,
     LabelList   
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShieldCheck,
  FileText,
  IndianRupee,
  AlertCircle,
  Plus,
  Eye,
  Settings,
  DollarSign,
  Building2,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  
} from "lucide-react";
import { format, differenceInDays } from 'date-fns';

// ✅ Import the CreateOrganizationModal
import CreateOrganizationModal from "../global/OrganizationManagement/CreateOrganizationModal";

function HomePage() {
  const [loading, setLoading] = useState(true);
  
  // ✅ Add state for Create Organization Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    orgGrowth: 0,
    statusCounts: { active: 0, inactive: 0, suspended: 0 },
    totalUsers: 0,        
    trialCount: 0,        
    suspendedCount: 0,    
    expiredOrgs: [],      
    activeVerifications: 0,
    verificationRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
  });

  const [verificationTrendData, setVerificationTrendData] = useState([]);
  const [revenueTrendData, setRevenueTrendData] = useState([]);
  const [verificationTypeData, setVerificationTypeData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topOrganizations, setTopOrganizations] = useState([]);

  const chartData = topOrganizations.filter(org => org.revenue > 0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate date ranges
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

      // ✅ Fetch hr_organizations with user stats using RPC function
      const { data: allOrgs, error: orgsError } = await supabase.rpc('get_organizations_with_stats');

      if (orgsError) {
        console.error("Error fetching organizations:", orgsError);
      }

      // ✅ CRITICAL FIX: Fetch subscription_status separately (RPC doesn't include it)
      const { data: orgSubscriptions, error: subError } = await supabase
        .from("hr_organizations")
        .select("id, subscription_status, subscription_expires_at, created_at, status");

      if (subError) {
        console.error("Error fetching subscription status:", subError);
      }

      // Merge subscription data with org stats
      const mergedOrgs = allOrgs?.map(org => {
        const subData = orgSubscriptions?.find(s => s.id === org.id);
        return {
          ...org,
          subscription_status: subData?.subscription_status,
          subscription_expires_at: subData?.subscription_expires_at,
          created_at: subData?.created_at || org.created_at,
          status: subData?.status || org.status
        };
      }) || [];

      // Count organizations created this month
      const orgsThisMonth = mergedOrgs?.filter(
        (org) => new Date(org.created_at) >= firstDayThisMonth
      ).length || 0;

      // Calculate status breakdown
      const statusCounts = mergedOrgs?.reduce((acc, org) => {
        const s = org.status?.toLowerCase() || 'inactive';
        if (acc[s] !== undefined) acc[s]++;
        return acc;
      }, { active: 0, inactive: 0, suspended: 0 });

      // ✅ Calculate total users across all organizations (same as Global_Dashboard.tsx)
      const totalUsers = mergedOrgs?.reduce((acc, org) => {
        return acc + (org.user_counts?.employee?.total || 0);
      }, 0) || 0;

      // ✅ Fetch hr_company_verifications (company searches)
      const { data: recentVerifications, error: verError } = await supabase
        .from("hr_company_verifications")
        .select(`
          *,
          hr_organizations!hr_company_verifications_organization_id_fkey(name)
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (verError) {
        console.error("Error fetching company verifications:", verError);
      }

      // ✅ For revenue calculation, we'll use invoice data since company_verifications don't have cost
      // Calculate verification count (company searches performed)
      const verificationCount = recentVerifications?.length || 0;

      // Get verification revenue from invoices (verification credits sold)
      const { data: verificationInvoices } = await supabase
        .from("hr_invoices")
        .select("total_amount, items")
        .eq("type", "Organization")
        .gte("invoice_date", thirtyDaysAgo.toISOString());

      // Calculate revenue from verification-related invoices
      let verificationRevenue = 0;
      verificationInvoices?.forEach(inv => {
        try {
          const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
          if (Array.isArray(items)) {
            items.forEach(item => {
              if (item.description?.toLowerCase().includes('verify') || 
                  item.description?.toLowerCase().includes('credit')) {
                verificationRevenue += parseFloat(item.amount) || 0;
              }
            });
          }
        } catch (e) {
          console.error("Error parsing invoice items:", e);
        }
      });

      // Fetch hr_invoices with organization join
      const { data: invoices, error: invError } = await supabase
        .from("hr_invoices")
        .select(`
          *,
          hr_organizations!hr_invoices_organization_id_fkey(name)
        `)
        .eq("type", "Organization")
        .not("organization_client_id", "is", null)
        .order("created_at", { ascending: false });

      if (invError) {
        console.error("Error fetching invoices:", invError);
      }

      // Calculate invoice stats
      const pendingInvoices = invoices?.filter(
        (inv) => inv.status === 'Pending' || inv.status === 'Unpaid'
      ).length || 0;
      
      const overdueInvoices = invoices?.filter(
        (inv) => inv.status === 'Overdue' || 
        ((inv.status === 'Pending' || inv.status === 'Unpaid') && 
         inv.due_date && new Date(inv.due_date) < now)
      ).length || 0;

      // Calculate total revenue this month
      const totalRevenueThisMonth = invoices?.filter(
        (inv) => 
          inv.status === 'Paid' && 
          inv.invoice_date &&
          new Date(inv.invoice_date) >= firstDayThisMonth
      ).reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0;

      // Calculate revenue last month for growth
      const totalRevenueLastMonth = invoices?.filter(
        (inv) => 
          inv.status === 'Paid' && 
          inv.invoice_date &&
          new Date(inv.invoice_date) >= firstDayLastMonth &&
          new Date(inv.invoice_date) < firstDayThisMonth
      ).reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0;

      const revenueGrowth = totalRevenueLastMonth > 0
        ? ((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth * 100).toFixed(1)
        : 0;

      const trialCount = mergedOrgs?.filter(o => o.subscription_status === 'trial').length || 0;
      const suspendedCount = mergedOrgs?.filter(o => o.status === 'suspended').length || 0;

      // Filter and format expired organizations
      const expiredOrgsInfo = mergedOrgs?.filter(o => o.subscription_status === 'expired')
        .map(o => {
          const expiryDate = new Date(o.subscription_expires_at);
          return {
            name: o.name,
            daysAgo: differenceInDays(new Date(), expiryDate),
            formattedDate: format(expiryDate, 'dd MMM yyyy')
          };
        }) || [];

      // Set stats with proper totalUsers calculation
      setStats({
        totalOrganizations: mergedOrgs?.length || 0,
        orgGrowth: orgsThisMonth,
        statusCounts,
        totalUsers: totalUsers, // ✅ Now properly calculated from user_counts
        trialCount,
        suspendedCount,
        expiredOrgsInfo,
        activeVerifications: verificationCount,
        verificationRevenue,
        pendingInvoices,
        overdueInvoices,
        totalRevenue: totalRevenueThisMonth,
        revenueGrowth: parseFloat(revenueGrowth),
      });

      // Generate verification trend data (last 30 days)
      const trendData = generateVerificationTrend(recentVerifications, thirtyDaysAgo);
      setVerificationTrendData(trendData);

      // Generate revenue trend data (last 6 months)
      const revenueData = await generateRevenueTrend(sixMonthsAgo);
      setRevenueTrendData(revenueData);

      // Generate verification type breakdown
      const typeBreakdown = generateVerificationTypeBreakdown(recentVerifications);
      setVerificationTypeData(typeBreakdown);

      // Generate recent activities
      const activities = generateRecentActivities(
        mergedOrgs?.slice(0, 3) || [],
        recentVerifications?.slice(0, 3) || [],
        invoices?.slice(0, 3) || []
      );
      setRecentActivities(activities);

      // Generate top organizations by verification count
      const topOrgs = await generateTopOrganizations(mergedOrgs);
      setTopOrganizations(topOrgs);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationTrend = (verifications, startDate) => {
    const days = [];
    const now = new Date();
    
    // Create array of last 7 data points (every 4-5 days)
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startDate.getTime() + (i * 4.3 * 24 * 60 * 60 * 1000));
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const count = verifications?.filter(
        (v) => new Date(v.created_at) <= date
      ).length || 0;

      days.push({ date: dateStr, count });
    }

    return days;
  };

  const generateRevenueTrend = async (startDate) => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = monthDate.toLocaleDateString("en-US", { month: "short" });

      const { data: monthInvoices } = await supabase
        .from("hr_invoices")
        .select("total_amount")
        .eq("status", "Paid")
        .eq("type", "Organization")
        .gte("invoice_date", monthDate.toISOString().split('T')[0])
        .lt("invoice_date", nextMonthDate.toISOString().split('T')[0]);

      const revenue = monthInvoices?.reduce(
        (sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 
        0
      ) || 0;

      months.push({ month: monthStr, revenue });
    }

    return months;
  };

  const generateVerificationTypeBreakdown = (verifications) => {
    // Since hr_company_verifications stores company searches, we'll categorize by success/failure
    const successCount = verifications?.filter(v => {
      try {
        const response = typeof v.gridlines_response === 'string' 
          ? JSON.parse(v.gridlines_response) 
          : v.gridlines_response;
        return response?.data?.code !== '1005'; // 1005 means not found
      } catch {
        return false;
      }
    }).length || 0;

    const notFoundCount = verifications?.filter(v => {
      try {
        const response = typeof v.gridlines_response === 'string' 
          ? JSON.parse(v.gridlines_response) 
          : v.gridlines_response;
        return response?.data?.code === '1005';
      } catch {
        return false;
      }
    }).length || 0;

    const total = successCount + notFoundCount;

    if (total === 0) {
      return [
        { name: "Company Found", value: 60, color: "#10B981" },
        { name: "Not Found", value: 40, color: "#EF4444" },
      ];
    }

    return [
      {
        name: "Company Found",
        value: Math.round((successCount / total) * 100),
        color: "#10B981",
      },
      {
        name: "Not Found",
        value: Math.round((notFoundCount / total) * 100),
        color: "#EF4444",
      },
    ];
  };

  const generateRecentActivities = (orgs, verifications, invoices) => {
    const activities = [];

    // Add recent organizations
    orgs.forEach((org) => {
      activities.push({
        id: `org-${org.id}`,
        type: "organization",
        title: org.name,
        description: "New organization registered",
        time: getTimeAgo(org.created_at),
        timestamp: new Date(org.created_at).getTime(),
        icon: Building2,
        color: "text-purple-600 bg-purple-100",
      });
    });

    // Add recent company verifications
    verifications.forEach((v) => {
      const orgName = v.hr_organizations?.name || "Unknown Organization";
      let status = "Company Search";
      try {
        const response = typeof v.gridlines_response === 'string' 
          ? JSON.parse(v.gridlines_response) 
          : v.gridlines_response;
        status = response?.data?.code === '1005' ? "Not Found" : "Found";
      } catch {}

      activities.push({
        id: `ver-${v.id}`,
        type: "verification",
        title: `Company Verification: ${v.search_term}`,
        description: `${status} - ${orgName}`,
        time: getTimeAgo(v.created_at),
        timestamp: new Date(v.created_at).getTime(),
        icon: ShieldCheck,
        color: status === "Found"
          ? "text-green-600 bg-green-100" 
          : "text-yellow-600 bg-yellow-100",
      });
    });

    // Add recent invoices
    invoices.forEach((inv) => {
      const orgName = inv.hr_organizations?.name || "Unknown Organization";
      const isOverdue = inv.status === "Overdue" || 
        ((inv.status === "Pending" || inv.status === "Unpaid") && 
         inv.due_date && new Date(inv.due_date) < new Date());
      
      activities.push({
        id: `inv-${inv.id}`,
        type: "invoice",
        title: `Invoice #${inv.invoice_number}`,
        description: `₹${parseFloat(inv.total_amount || 0).toLocaleString()} - ${isOverdue ? "Overdue" : inv.status} for ${orgName}`,
        time: getTimeAgo(inv.created_at),
        timestamp: new Date(inv.created_at).getTime(),
        icon: FileText,
        color: isOverdue 
          ? "text-red-600 bg-red-100" 
          : inv.status === "Paid"
          ? "text-green-600 bg-green-100"
          : "text-blue-600 bg-blue-100",
      });
    });

    // Sort by timestamp and return top 5
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

const generateTopOrganizations = async (allOrgs) => {
  if (!allOrgs || allOrgs.length === 0) return [];

  const orgStats = await Promise.all(
    allOrgs.map(async (org) => {
      // Fetch "Paid" invoices linked to THIS specific organization
      const { data: orgInvoices } = await supabase
        .from("hr_invoices")
        .select("total_amount")
        .eq("organization_client_id", org.id)
        .eq("status", "Paid")
        .eq("type", "Organization");

      // Calculate total revenue from paid invoices
      const revenue = orgInvoices?.reduce(
        (sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 
        0
      ) || 0;

      return {
        id: org.id,
        name: org.name,
        revenue,
      };
    })
  );

  // Sort by highest revenue first
  return orgStats
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Global SuperAdmin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here's what's happening across all organizations.
        </p>
      </div>

      {/* Key Metrics - 4 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Organizations - Split Stunning View */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="flex h-full min-h-[160px]">
            
            {/* Left Half: Main Stats */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-purple-50 rounded-xl">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  {stats.orgGrowth > 0 && (
                    <div className="flex items-center px-2 py-1 bg-green-50 rounded-full">
                      <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                      <span className="text-[10px] font-bold text-green-600">+{stats.orgGrowth}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  Total Organizations
                </h3>
                <p className="text-4xl font-black text-gray-900 mt-1">
                  {stats.totalOrganizations}
                </p>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                {stats.orgGrowth > 0 ? `+${stats.orgGrowth} new this month` : "No recent growth"}
              </p>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] bg-gray-100 my-4" />

            {/* Right Half: Status Breakdown */}
            <div className="flex-1 bg-slate-50/50 p-6 flex flex-col justify-center gap-3">
              {[
                { label: 'Active', count: stats.statusCounts.active, color: 'bg-green-500', text: 'text-green-700' },
                { label: 'Suspended', count: stats.statusCounts.suspended, color: 'bg-amber-500', text: 'text-amber-700' },
                { label: 'Inactive', count: stats.statusCounts.inactive, color: 'bg-slate-400', text: 'text-slate-600' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color} shadow-sm group-hover:scale-125 transition-transform`} />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-xs font-black ${item.text}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Active Users Card - Changed from "Total Users" */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="flex h-full min-h-[160px]">
            
            {/* Left Half: Active Users Count */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  Active Users
                </h3>
                <p className="text-4xl font-black text-gray-900 mt-1">
                  {stats.totalUsers}
                </p>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Across all organizations
              </p>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] bg-gray-100 my-4" />

            {/* ✅ UPDATED: Right Half - Shows Active/Inactive/Suspended organization statuses */}
            <div className="flex-1 bg-blue-50/50 p-6 flex flex-col justify-center gap-3">
              {[
                { label: 'Active', count: stats.statusCounts.active, color: 'bg-green-500', text: 'text-green-700' },
                { label: 'Inactive', count: stats.statusCounts.inactive, color: 'bg-gray-500', text: 'text-gray-700' },
                { label: 'Suspended', count: stats.statusCounts.suspended, color: 'bg-red-500', text: 'text-red-700' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color} shadow-sm group-hover:scale-125 transition-transform`} />
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-xs font-black ${item.text}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
            {stats.revenueGrowth !== 0 && (
              <span className={`flex items-center text-sm font-medium ${stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueGrowth > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}%
              </span>
            )}
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">
            Total Revenue
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            ₹{(stats.totalRevenue / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            {stats.overdueInvoices > 0 && (
              <span className="flex items-center text-sm font-medium text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {stats.overdueInvoices} overdue
              </span>
            )}
          </div>
          <h3 className="text-gray-600 text-sm font-medium mb-1">
            Pending Invoices
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.pendingInvoices}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {stats.overdueInvoices > 0 ? "Requires attention" : "All current"}
          </p>
        </div>
      </div>
               

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ✅ Create Organization - Opens Modal */}
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all group"
          >
            <div className="p-3 bg-purple-600 rounded-lg mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              Create Organization
            </span>
          </button>

          <button 
            onClick={() => window.location.href = '/verifications'}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all group"
          >
            <div className="p-3 bg-blue-600 rounded-lg mb-3 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              View Verifications
            </span>
          </button>

          <button 
            onClick={() => window.location.href = '/pricing'}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all group"
          >
            <div className="p-3 bg-green-600 rounded-lg mb-3 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              Manage Pricing
            </span>
          </button>

          <button 
            onClick={() => window.location.href = '/settings'}
            className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all group"
          >
            <div className="p-3 bg-gray-600 rounded-lg mb-3 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              System Settings
            </span>
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Analytics Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
              <h2 className="text-lg font-bold text-gray-900">Revenue Analytics</h2>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 20, left: 0, bottom: 100 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                    angle={0}
                    textAnchor="middle"
                    height={90}
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    tickFormatter={(value) => {
                      if (value.length > 30) {
                        return `${value.substring(0, 30)}...`;
                      }
                      return value;
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B5CF6', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    width={60}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    formatter={(value, name, props) => {
                      return [
                        `₹${value.toLocaleString()}`,
                        "Revenue"
                      ];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#8B5CF6" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={80}
                  >
                    <LabelList 
                      dataKey="revenue" 
                      position="top" 
                      formatter={(val) => val > 0 ? `₹${val.toLocaleString()}` : ''}
                      style={{ 
                        fill: '#8B5CF6', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                      }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <Activity className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No revenue data available</p>
              <p className="text-sm mt-1">Organizations with paid invoices will appear here</p>
            </div>
          )}
        </div>

        {/* Organization Status Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Organization Status
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Trial', value: stats.trialCount, color: '#EAB308' },
                  { name: 'Active', value: stats.activeSubscriptionCount, color: '#10B981' },
                  { name: 'Expired', value: stats.expiredOrgsInfo?.length || 0, color: '#EF4444' },
                  { name: 'Suspended', value: stats.suspendedCount, color: '#F59E0B' }
                ].filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ value }) => value}
              >
                {[
                  { name: 'Trial', value: stats.trialCount, color: '#EAB308' },
                  { name: 'Active', value: stats.activeSubscriptionCount, color: '#10B981' },
                  { name: 'Expired', value: stats.expiredOrgsInfo?.length || 0, color: '#EF4444' },
                  { name: 'Suspended', value: stats.suspendedCount, color: '#F59E0B' }
                ].filter(item => item.value > 0).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} orgs`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Trial', count: stats.trialCount, color: '#EAB308', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
              { label: 'Active', count: stats.activeSubscriptionCount, color: '#10B981', bgColor: 'bg-green-50', textColor: 'text-green-700' },
              { label: 'Expired', count: stats.expiredOrgsInfo?.length || 0, color: '#EF4444', bgColor: 'bg-red-50', textColor: 'text-red-700' },
              { label: 'Suspended', count: stats.suspendedCount, color: '#F59E0B', bgColor: 'bg-amber-50', textColor: 'text-amber-700' }
            ].filter(item => item.count > 0).map((item, index) => (
              <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${item.bgColor}`}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={`text-sm font-medium ${item.textColor}`}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${item.textColor}`}>
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({stats.totalOrganizations > 0 ? Math.round((item.count / stats.totalOrganizations) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Last Updated */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Last Updated</span>
              <span className="font-medium">{new Date().toLocaleString('en-IN', { 
                day: '2-digit',
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Revenue Growth
            </h2>
            <p className="text-sm text-gray-600 mt-1">Last 6 months</p>
          </div>
          {stats.revenueGrowth !== 0 && (
            <div className="flex items-center gap-2">
              {stats.revenueGrowth > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm font-medium ${stats.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth}% growth
              </span>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={revenueTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value) => `₹${value.toLocaleString()}`}
            />
            <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Section - Activity Feed & Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <button 
              onClick={() => window.location.href = '/activities'}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All
            </button>
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${activity.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>

        {/* Top Organizations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Organizations
            </h2>
            <button 
              onClick={() => window.location.href = '/organizations'}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View All
            </button>
          </div>
          {topOrganizations.length > 0 ? (
            <div className="space-y-3">
              {topOrganizations.map((org, index) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all cursor-pointer mb-3"
                  onClick={() => window.location.href = `/organization/${org.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl font-bold text-purple-600 text-sm shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none mb-1">
                        {org.name}
                      </p>
                      <p className="text-xs text-gray-500">Active Organization</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{org.revenue.toLocaleString()}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No organizations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* System Health Status */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">
              All Systems Operational
            </p>
            <p className="text-xs text-green-700">
              Database connected • {stats.totalOrganizations} orgs active
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.href = '/system-status'}
          className="text-sm text-green-700 hover:text-green-800 font-medium"
        >
          View Status →
        </button>
      </div>

      {/* ✅ Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchDashboardData(); // Refresh data after creating
        }}
      />
    </div>
  );
}

export default HomePage;