// src/components/dashboard/GlobalSuperadminDashboard.jsx
// Completely redesigned — matches app theme (#7B43F1 accent, bg-[#F7F7F8], white cards)

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, ShieldCheck, FileText,
  IndianRupee, AlertCircle, Plus, Eye, Settings, Building2,
  Activity, Clock, CheckCircle, XCircle, RefreshCw, Search,
  ChevronRight, Coins, Zap, CreditCard, BarChart2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import CreateOrganizationModal from "../global/OrganizationManagement/CreateOrganizationModal";

// ─── Palette aligned with app theme ─────────────────────────────────────────
const P = "#7B43F1";   // primary purple
const PL = "#EDE9FE";  // purple light bg
const PM = "#C4B5FD";  // purple mid

// ─── Tiny reusable pieces ────────────────────────────────────────────────────
const StatBadge = ({ up, value }) =>
  value === 0 ? null : (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{value}
    </span>
  );

const DotRow = ({ label, count, dot, text }) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${dot} group-hover:scale-125 transition-transform`} />
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <span className={`text-xs font-black ${text}`}>{count}</span>
  </div>
);

export default function GlobalSuperadminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");

  const [stats, setStats] = useState({
    totalOrganizations: 0,
    orgGrowth: 0,
    statusCounts: { active: 0, inactive: 0, suspended: 0 },
    totalUsers: 0,
    trialCount: 0,
    activeSubscriptionCount: 0,
    suspendedCount: 0,
    expiredCount: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    totalCreditBalance: 0,
  });

  const [revenueTrendData, setRevenueTrendData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topOrganizations, setTopOrganizations] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 1. Organizations with stats
      const { data: orgsRpc } = await supabase.rpc("get_organizations_with_stats");
      const { data: orgSubs } = await supabase
        .from("hr_organizations")
        .select("id, subscription_status, subscription_expires_at, created_at, status, credit_balance, name, subdomain");

      const merged = (orgsRpc || []).map((org) => {
        const s = orgSubs?.find((x) => x.id === org.id) || {};
        return { ...org, ...s };
      });
      setAllOrgs(merged);

      // 2. Status counts
      const statusCounts = merged.reduce(
        (acc, o) => { const s = o.status?.toLowerCase() || "inactive"; if (acc[s] !== undefined) acc[s]++; return acc; },
        { active: 0, inactive: 0, suspended: 0 }
      );

      const totalUsers = merged.reduce((a, o) => a + (o.user_counts?.employee?.total || 0), 0);
      const orgsThisMonth = merged.filter((o) => new Date(o.created_at) >= firstDayThisMonth).length;
      const trialCount = merged.filter((o) => o.subscription_status === "trial").length;
      const activeSubscriptionCount = merged.filter((o) => o.subscription_status === "active").length;
      const expiredCount = merged.filter((o) => o.subscription_status === "expired").length;
      const totalCreditBalance = merged.reduce((a, o) => a + parseFloat(o.credit_balance || 0), 0);

      // 3. Invoices
      const { data: invoices } = await supabase
        .from("hr_invoices")
        .select("id, status, total_amount, invoice_date, due_date, organization_client_id, invoice_number, created_at")
        .eq("type", "Organization")
        .not("organization_client_id", "is", null)
        .order("created_at", { ascending: false });

      const pendingInvoices = (invoices || []).filter((i) => i.status === "Pending" || i.status === "Unpaid").length;
      const overdueInvoices = (invoices || []).filter(
        (i) => i.status === "Overdue" || (["Pending", "Unpaid"].includes(i.status) && i.due_date && new Date(i.due_date) < now)
      ).length;

      const totalRevenueThisMonth = (invoices || [])
        .filter((i) => i.status === "Paid" && i.invoice_date && new Date(i.invoice_date) >= firstDayThisMonth)
        .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

      const totalRevenueLastMonth = (invoices || [])
        .filter((i) => i.status === "Paid" && i.invoice_date && new Date(i.invoice_date) >= firstDayLastMonth && new Date(i.invoice_date) < firstDayThisMonth)
        .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

      const revenueGrowth = totalRevenueLastMonth > 0
        ? parseFloat(((totalRevenueThisMonth - totalRevenueLastMonth) / totalRevenueLastMonth * 100).toFixed(1))
        : 0;

      setStats({
        totalOrganizations: merged.length,
        orgGrowth: orgsThisMonth,
        statusCounts,
        totalUsers,
        trialCount,
        activeSubscriptionCount,
        suspendedCount: statusCounts.suspended,
        expiredCount,
        pendingInvoices,
        overdueInvoices,
        totalRevenue: totalRevenueThisMonth,
        revenueGrowth,
        totalCreditBalance,
      });

      // 4. Revenue trend (6 months)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const rev = (invoices || [])
          .filter((inv) => inv.status === "Paid" && inv.invoice_date && new Date(inv.invoice_date) >= mDate && new Date(inv.invoice_date) < nDate)
          .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
        months.push({ month: mDate.toLocaleDateString("en-US", { month: "short" }), revenue: rev });
      }
      setRevenueTrendData(months);

      // 5. Top orgs by credit balance (fast, no N+1)
      const top = [...merged]
        .sort((a, b) => parseFloat(b.credit_balance || 0) - parseFloat(a.credit_balance || 0))
        .slice(0, 8)
        .map((o) => ({ id: o.id, name: o.name, creditBalance: parseFloat(o.credit_balance || 0), status: o.subscription_status, subdomain: o.subdomain }));
      setTopOrganizations(top);

      // 6. Recent activities from invoices + orgs
      const acts = [
        ...merged.slice(0, 3).map((o) => ({
          id: `org-${o.id}`,
          title: o.name,
          desc: "New organization registered",
          time: getTimeAgo(o.created_at),
          ts: new Date(o.created_at).getTime(),
          icon: Building2,
          color: "text-purple-600 bg-purple-50",
        })),
        ...(invoices || []).slice(0, 3).map((inv) => ({
          id: `inv-${inv.id}`,
          title: `Invoice #${inv.invoice_number}`,
          desc: `₹${parseFloat(inv.total_amount || 0).toLocaleString()} — ${inv.status}`,
          time: getTimeAgo(inv.created_at),
          ts: new Date(inv.created_at).getTime(),
          icon: FileText,
          color: inv.status === "Paid" ? "text-green-600 bg-green-50" : inv.status === "Overdue" ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50",
        })),
      ]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 6);
      setRecentActivities(acts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTimeAgo = (d) => {
    const s = Math.floor((new Date() - new Date(d)) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const filteredOrgs = allOrgs.filter((o) =>
    o.name?.toLowerCase().includes(orgSearch.toLowerCase()) ||
    o.subdomain?.toLowerCase().includes(orgSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F7F8]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#7B43F1] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const subStatusData = [
    { name: "Active", value: stats.activeSubscriptionCount, color: "#10B981" },
    { name: "Trial", value: stats.trialCount, color: "#F59E0B" },
    { name: "Expired", value: stats.expiredCount, color: "#EF4444" },
    { name: "Suspended", value: stats.suspendedCount, color: "#8B5CF6" },
  ].filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Global SuperAdmin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide overview · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ background: P }}
          >
            <Plus size={15} />
            New Organization
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Orgs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full min-h-[148px]">
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl" style={{ background: PL }}>
                    <Building2 size={16} style={{ color: P }} />
                  </div>
                  <StatBadge up value={stats.orgGrowth} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Organizations</p>
                <p className="text-3xl font-black text-gray-900 mt-0.5">{stats.totalOrganizations}</p>
              </div>
              <p className="text-[10px] text-gray-400">{stats.orgGrowth > 0 ? `+${stats.orgGrowth} this month` : "No new this month"}</p>
            </div>
            <div className="w-px bg-gray-100 my-4" />
            <div className="flex-1 bg-slate-50/60 px-4 py-5 flex flex-col justify-center gap-2.5">
              <DotRow label="Active" count={stats.statusCounts.active} dot="bg-emerald-500" text="text-emerald-700" />
              <DotRow label="Inactive" count={stats.statusCounts.inactive} dot="bg-slate-400" text="text-slate-600" />
              <DotRow label="Suspended" count={stats.statusCounts.suspended} dot="bg-amber-500" text="text-amber-700" />
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="flex h-full min-h-[148px]">
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="p-2 rounded-xl bg-blue-50 mb-2 w-fit">
                  <Users size={16} className="text-blue-600" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Users</p>
                <p className="text-3xl font-black text-gray-900 mt-0.5">{stats.totalUsers}</p>
              </div>
              <p className="text-[10px] text-gray-400">Across all organizations</p>
            </div>
            <div className="w-px bg-gray-100 my-4" />
            <div className="flex-1 bg-blue-50/40 px-4 py-5 flex flex-col justify-center gap-2.5">
              <DotRow label="Trial" count={stats.trialCount} dot="bg-yellow-400" text="text-yellow-700" />
              <DotRow label="Active" count={stats.activeSubscriptionCount} dot="bg-emerald-500" text="text-emerald-700" />
              <DotRow label="Expired" count={stats.expiredCount} dot="bg-red-400" text="text-red-600" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50"><IndianRupee size={16} className="text-emerald-600" /></div>
            <StatBadge up={stats.revenueGrowth >= 0} value={Math.abs(stats.revenueGrowth) > 0 ? `${stats.revenueGrowth}%` : 0} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Revenue This Month</p>
            <p className="text-3xl font-black text-gray-900 mt-0.5">
              ₹{stats.totalRevenue >= 1000 ? `${(stats.totalRevenue / 1000).toFixed(1)}K` : stats.totalRevenue.toLocaleString()}
            </p>
          </div>
          <p className="text-[10px] text-gray-400">From paid invoices</p>
        </div>

        {/* Credits */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[148px]">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl" style={{ background: PL }}>
              <Coins size={16} style={{ color: P }} />
            </div>
            {stats.pendingInvoices > 0 && (
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <AlertCircle size={9} />{stats.overdueInvoices} overdue
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Platform Credits</p>
            <p className="text-3xl font-black text-gray-900 mt-0.5">{stats.totalCreditBalance.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-gray-400">{stats.pendingInvoices} pending invoices</p>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "New Organization", icon: Plus, action: () => setIsCreateModalOpen(true), bg: PL, color: P },
            { label: "View Verifications", icon: ShieldCheck, action: () => navigate("/verifications"), bg: "#DBEAFE", color: "#2563EB" },
            { label: "Manage Invoices", icon: FileText, action: () => navigate("/organization/invoices"), bg: "#D1FAE5", color: "#059669" },
            { label: "Credit Reports", icon: BarChart2, action: () => navigate("/reports/credit-usage"), bg: "#FEF3C7", color: "#D97706" },
          ].map(({ label, icon: Icon, action, bg, color }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-gray-100 transition-all group hover:-translate-y-0.5"
              style={{ background: `${bg}80` }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = bg}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
            >
              <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Revenue Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months · paid invoices</p>
            </div>
            {stats.revenueGrowth !== 0 && (
              <span className={`text-xs font-bold ${stats.revenueGrowth > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {stats.revenueGrowth > 0 ? "↑" : "↓"} {Math.abs(stats.revenueGrowth)}% MoM
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueTrendData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={(v) => v === 0 ? "₹0" : `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                formatter={(v) => [`₹${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill={P} radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="revenue" position="top" formatter={(v) => v > 0 ? `₹${(v / 1000).toFixed(0)}k` : ""} style={{ fill: P, fontSize: 9, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Subscription Status</h2>
          <p className="text-xs text-gray-400 mb-4">Breakdown of {stats.totalOrganizations} orgs</p>
          {subStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={subStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                    {subStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} orgs`, n]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {subStatusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{item.value}</span>
                      <span className="text-[10px] text-gray-400">({Math.round((item.value / stats.totalOrganizations) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-gray-300">
              <Building2 size={32} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row — All Orgs + Activity ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* All Organizations list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">All Organizations</h2>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Search…"
                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#7B43F1] w-40"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-sm">
                <tr>
                  {["Organization", "Status", "Sub Status", "Credits", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrgs.map((org) => {
                  const statusColor = { active: "text-emerald-600 bg-emerald-50", inactive: "text-gray-500 bg-gray-100", suspended: "text-amber-600 bg-amber-50" }[org.status?.toLowerCase()] || "text-gray-500 bg-gray-100";
                  const subColor = { active: "text-emerald-600 bg-emerald-50", trial: "text-yellow-600 bg-yellow-50", expired: "text-red-500 bg-red-50", canceled: "text-gray-500 bg-gray-100" }[org.subscription_status] || "text-gray-500 bg-gray-100";
                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-purple-50/30 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/organization/${org.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 group-hover:text-[#7B43F1] transition-colors truncate max-w-[160px]">{org.name}</div>
                        {org.subdomain && <div className="text-[10px] text-gray-400">{org.subdomain}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>{org.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${subColor}`}>{org.subscription_status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900">{parseFloat(org.credit_balance || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[#7B43F1] transition-colors inline" />
                      </td>
                    </tr>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">No organizations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivities.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className={`p-1.5 rounded-lg ${a.color} shrink-0`}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{a.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{a.desc}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={9} />{a.time}
                    </p>
                  </div>
                </div>
              );
            })}
            {recentActivities.length === 0 && (
              <div className="text-center py-8 text-gray-300"><Activity size={24} className="mx-auto mb-2" /><p className="text-xs">No recent activity</p></div>
            )}
          </div>
        </div>
      </div>

      {/* ── System Health ────────────────────────────────────────────────────── */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">All Systems Operational</p>
            <p className="text-xs text-emerald-600">Database connected · {stats.totalOrganizations} organizations · {stats.totalUsers} users</p>
          </div>
        </div>
        <button onClick={() => navigate("/system-status")} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold">
          View Status →
        </button>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => { setIsCreateModalOpen(false); fetchDashboardData(true); }}
      />
    </div>
  );
}