// src/components/global/SingleOrganizationDashboard.tsx
// Complete file — all sub-components + main component

import { FC, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { toast } from 'sonner';
import moment from 'moment';
import {
  ArrowLeft, Users, FileText, BrainCircuit, ListChecks,
  Loader2, BriefcaseBusiness, Building2, Coins,
  Building, X, Check, Settings, RefreshCw, Shield,
  CreditCard, Eye, EyeOff, Pencil, ExternalLink, AlertTriangle,
  BarChart2, Activity, Monitor, Smartphone, LogOut,
  MapPin as MapPinIcon, Search, KeyRound, Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { ManageVerificationPricingModal } from "./OrganizationManagement/ManageVerificationPricingModal";
import TrialSubscriptionCard from "./OrganizationManagement/TrialSubscriptionCard";
import EditSubscriptionModal from "./OrganizationManagement/EditSubscriptionModal";
import SubscriptionBillingModal from "./OrganizationManagement/SubscriptionBillingModal";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrgDetails {
  id: string; name: string; superadmin_email: string | null;
  subscription_status: string; subscription_plan: string | null;
  trial_start_date: string | null; trial_end_date: string | null;
  total_users: number; user_counts_by_role: Record<string, any>;
  talent_pool_count: number; total_jobs: number; total_clients: number;
  total_epfo_verifications: number; total_ai_tokens_used: number;
  linked_company?: any;
  subscription_start_date: string | null;
  subscription_expires_at: string | null;
  trial_extended: boolean;
  role_credit_limits: any;
  credit_balance: string;
  status: string;
  verification_check: string;
  is_recruitment_firm: boolean;
  is_verification_firm: boolean;
  subscription_features: any;
  is_job_id_auto: boolean;
  job_id_prefix: string | null;
  is_skill_matrix_mandatory: boolean;
  invoice_prefix: string | null;
  subdomain: string | null;
  complete_profile: boolean;
  notification_recipients: any;
}

interface OrgProfile {
  company_name: string; logo_url: string | null; website: string | null;
  email: string | null; phone: string | null; address_line1: string | null;
  address_line2: string | null; city: string | null; state: string | null;
  zip_code: string | null; country: string | null; tax_id: string | null;
  pan_number: string | null; gstin: string | null;
}

// ─── EditField ────────────────────────────────────────────────────────────────
const EditField = ({
  label, value, onSave, type = "text", options = null, disabled = false,
}: {
  label: string; value: string | null;
  onSave: (v: string) => Promise<void>;
  type?: string;
  options?: { value: string; label: string }[] | null;
  disabled?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft === (value || "")) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); toast.success(`${label} updated`); }
    catch { toast.error(`Failed to update ${label}`); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <div className="group flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
          <p className="text-sm text-gray-800 font-medium truncate">
            {value ? value : <span className="text-gray-300 italic text-xs">Not set</span>}
          </p>
        </div>
        {!disabled && (
          <button onClick={() => { setDraft(value || ""); setEditing(true); }}
            className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all mt-1">
            <Pencil size={12} className="text-gray-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      {options ? (
        <select value={draft} onChange={(e) => setDraft(e.target.value)}
          className="w-full text-sm border border-[#7B43F1] rounded-lg px-2 py-1.5 bg-white focus:outline-none">
          <option value="">— Select —</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          type={type} autoFocus
          className="w-full text-sm border border-[#7B43F1] rounded-lg px-2 py-1.5 focus:outline-none" />
      )}
      <div className="flex gap-1.5 mt-1.5">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1 px-2 py-1 bg-[#7B43F1] text-white text-xs rounded-lg font-medium hover:bg-[#6930D4] disabled:opacity-50">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Save
        </button>
        <button onClick={() => setEditing(false)}
          className="px-2 py-1 text-gray-500 text-xs rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
};

// ─── ToggleField ──────────────────────────────────────────────────────────────
const ToggleField = ({ label, value, onToggle, description = "" }: {
  label: string; value: boolean; onToggle: () => Promise<void>; description?: string;
}) => {
  const [saving, setSaving] = useState(false);
  const handle = async () => { setSaving(true); try { await onToggle(); } finally { setSaving(false); } };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={handle} disabled={saving}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-[#7B43F1]" : "bg-gray-200"} disabled:opacity-50`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
};

// ─── CreditAdjustPanel ────────────────────────────────────────────────────────
const CreditAdjustPanel = ({ orgId, currentBalance, onSuccess }: {
  orgId: string; currentBalance: number; onSuccess: () => void;
}) => {
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const newBalance = mode === "add" ? currentBalance + amt : currentBalance - amt;
      if (newBalance < 0) { toast.error("Insufficient balance"); setSaving(false); return; }
      const { error } = await supabase.from("hr_organizations").update({ credit_balance: newBalance }).eq("id", orgId);
      if (error) throw error;
      await supabase.from("credit_transactions").insert({
        organization_id: orgId,
        transaction_type: mode === "add" ? "manual_add" : "manual_deduct",
        amount: mode === "add" ? amt : -amt,
        balance_after: newBalance,
        description: desc || `Manual ${mode} by superadmin`,
        verification_type: "manual",
        source: "superadmin",
      });
      toast.success(`Credits ${mode === "add" ? "added" : "deducted"}`);
      setAmount(""); setDesc(""); onSuccess();
    } catch { toast.error("Credit adjustment failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Coins size={15} className="text-[#7B43F1]" /> Credit Management
      </h3>
      <div className="mb-3 flex items-center justify-between p-3 bg-[#EDE9FE] rounded-xl">
        <span className="text-xs font-bold text-[#7B43F1] uppercase tracking-wider">Balance</span>
        <span className="text-2xl font-black text-[#7B43F1]">{currentBalance.toLocaleString()}</span>
      </div>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
        {(["add", "deduct"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 text-xs font-bold uppercase transition-colors ${mode === m ? "bg-[#7B43F1] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
            {m === "add" ? "+ Add" : "– Deduct"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount" min="0"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7B43F1]" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Reason (optional)"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#7B43F1]" />
        <button onClick={handleSubmit} disabled={saving || !amount}
          className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 hover:shadow-md"
          style={{ background: mode === "add" ? "#059669" : "#DC2626" }}>
          {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : `${mode === "add" ? "Add" : "Deduct"} Credits`}
        </button>
      </div>
    </div>
  );
};

// ─── UsersPanel ───────────────────────────────────────────────────────────────
const UsersPanel = ({ orgId }: { orgId: string }) => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [passwordEmpId, setPasswordEmpId] = useState<string | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["org-users-detail", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select(`id, first_name, last_name, email, status, employment_status,
          last_login, created_at, user_id, employee_id, joining_date, hire_type,
          hr_roles ( id, name ),
          hr_departments ( id, name ),
          hr_designations ( id, name )`)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_roles").select("id, name").order("name");
      return data || [];
    },
  });

  const filtered = (users || []).filter((u: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [u.first_name, u.last_name, u.email, u.employee_id].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.hr_roles?.name === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleStatus = async (empId: string, cur: string) => {
    const next = cur === "active" ? "inactive" : "active";
    const { error } = await supabase.from("hr_employees").update({ status: next }).eq("id", empId);
    if (error) { toast.error("Failed"); return; }
    toast.success(`User ${next}`); refetch();
  };

  const saveEmail = async (empId: string, userId: string | null, newEmail: string) => {
    if (!newEmail.includes("@")) { toast.error("Invalid email"); return; }
    setEmailSaving(true);
    try {
      const { error } = await supabase.from("hr_employees").update({ email: newEmail }).eq("id", empId);
      if (error) throw error;
      if (userId) {
        const { error: authErr } = await supabase.rpc("superadmin_update_user_email", { p_user_id: userId, p_new_email: newEmail });
        if (authErr) toast.warning("Employee updated. Auth sync failed.");
        else toast.success("Email updated in employee & auth");
      } else {
        toast.success("Email updated (no linked auth user)");
      }
      setEditingEmailId(null); refetch();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setEmailSaving(false); }
  };

  const setPassword = async () => {
    if (!passwordDraft || passwordDraft.length < 6) { toast.error("Min 6 characters"); return; }
    if (!passwordUserId) { toast.error("No linked auth user"); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.rpc("superadmin_set_user_password", { p_user_id: passwordUserId, p_new_password: passwordDraft });
      if (error) throw error;
      toast.success("Password updated");
      setPasswordEmpId(null); setPasswordUserId(null); setPasswordDraft("");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setPasswordSaving(false); }
  };

  const roleColor: Record<string, string> = {
    "Organization Superadmin": "text-purple-700 bg-purple-50",
    "Admin": "text-blue-700 bg-blue-50",
    "Employee": "text-gray-600 bg-gray-100",
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[#7B43F1]" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, email, ID…"
            className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B43F1]" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
          <option value="all">All Roles</option>
          {(roles as any[]).map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
        <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} users</span>
        <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={12} className="text-gray-400" /></button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {["Employee", "Email", "Role / Dept", "Status", "Last Login", "Joined", "Actions"].map((h) => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((u: any) => {
              const roleName = u.hr_roles?.name || "—";
              const isEditingEmail = editingEmailId === u.id;
              return (
                <tr key={u.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7B43F1] font-bold text-[10px] shrink-0">
                        {(u.first_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</p>
                        <p className="text-[9px] text-gray-400">{u.employee_id || "No ID"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {isEditingEmail ? (
                      <div className="flex items-center gap-1">
                        <input value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEmail(u.id, u.user_id, emailDraft); if (e.key === "Escape") setEditingEmailId(null); }}
                          autoFocus className="text-xs border border-[#7B43F1] rounded px-1.5 py-1 w-36 focus:outline-none" />
                        <button onClick={() => saveEmail(u.id, u.user_id, emailDraft)} disabled={emailSaving}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          {emailSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                        </button>
                        <button onClick={() => setEditingEmailId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={10} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/email">
                        <span className="text-gray-600 truncate">{u.email}</span>
                        <button onClick={() => { setEditingEmailId(u.id); setEmailDraft(u.email); }}
                          className="opacity-0 group-hover/email:opacity-100 p-0.5 rounded hover:bg-gray-100 shrink-0">
                          <Pencil size={9} className="text-gray-400" />
                        </button>
                      </div>
                    )}
                    {!u.user_id && <span className="text-[9px] text-amber-500 font-bold block">No auth user</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColor[roleName] || "text-gray-500 bg-gray-100"}`}>{roleName}</span>
                    {(u.hr_designations?.name || u.hr_departments?.name) && (
                      <p className="text-[9px] text-gray-400 mt-0.5">{u.hr_designations?.name || u.hr_departments?.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === "active" ? "text-emerald-600 bg-emerald-50" : u.status === "terminated" ? "text-red-500 bg-red-50" : "text-gray-500 bg-gray-100"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {u.last_login ? (
                      <div>
                        <p className="text-gray-600">{moment(u.last_login).format("D MMM, HH:mm")}</p>
                        <p className="text-[9px]">{moment(u.last_login).fromNow()}</p>
                      </div>
                    ) : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.joining_date ? moment(u.joining_date).format("D MMM YYYY") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleStatus(u.id, u.status)} disabled={u.status === "terminated"}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-30 ${u.status === "active" ? "text-red-600 bg-red-50 hover:bg-red-100" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}>
                        {u.status === "active" ? "Deactivate" : u.status === "terminated" ? "Terminated" : "Activate"}
                      </button>
                      <button onClick={() => { setPasswordUserId(u.user_id); setPasswordEmpId(u.id); setPasswordDraft(""); setShowPassword(false); }}
                        title="Set password" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#7B43F1] transition-colors">
                        <KeyRound size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No users match filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-gray-400">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}

      {passwordEmpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPasswordEmpId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><KeyRound size={15} className="text-[#7B43F1]" /> Set Password</h3>
              <button onClick={() => setPasswordEmpId(null)} className="p-1 rounded hover:bg-gray-100"><X size={14} /></button>
            </div>
            {!passwordUserId ? (
              <div className="text-center py-4">
                <AlertTriangle size={24} className="text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No linked auth account. Password cannot be set.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">Set a new password. User will need this on next login.</p>
                <div className="relative mb-4">
                  <input type={showPassword ? "text" : "password"} value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setPassword()}
                    placeholder="New password (min 6 chars)"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-1 focus:ring-[#7B43F1]" />
                  <button onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPasswordEmpId(null)} className="flex-1 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                  <button onClick={setPassword} disabled={passwordSaving || passwordDraft.length < 6}
                    className="flex-1 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-1"
                    style={{ background: "#7B43F1" }}>
                    {passwordSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Set Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ActivitySessionsPanel ────────────────────────────────────────────────────
const ActivitySessionsPanel = ({ orgId }: { orgId: string }) => {
  const [section, setSection] = useState<"logs" | "sessions">("logs");
  const [logSearch, setLogSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 20;
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState("");

  const parseUA = (ua: string | null) => {
    if (!ua) return "Unknown";
    const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)[\s/]([\d.]+)/);
    const os = ua.match(/\(([^)]+)\)/)?.[1]?.split(";")[0] || "";
    return browser ? `${browser[1]} · ${os}` : os || "Unknown";
  };
  const getDeviceIcon = (ua: string | null) => /mobile|android|iphone|ipad/i.test(ua || "") ? Smartphone : Monitor;

  const eventCfg: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    login:              { label: "Login",          color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
    logout:             { label: "Logout",         color: "text-gray-600",    bg: "bg-gray-100",   dot: "bg-gray-400" },
    failed_login:       { label: "Failed Login",   color: "text-red-600",     bg: "bg-red-50",     dot: "bg-red-500" },
    session_terminated: { label: "Session Revoked",color: "text-orange-600",  bg: "bg-orange-50",  dot: "bg-orange-500" },
    password_reset:     { label: "Pwd Reset",      color: "text-blue-600",    bg: "bg-blue-50",    dot: "bg-blue-500" },
  };

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["activity-logs", orgId, eventFilter, userFilter],
    queryFn: async () => {
      let q = supabase
        .from("user_activity_logs")
        .select(`id, user_id, event_type, timestamp, ip_address, city, country, device_info, details,
          hr_employees!user_activity_logs_user_id_fkey ( first_name, last_name, email, hr_roles ( name ) )`)
        .eq("organization_id", orgId)
        .order("timestamp", { ascending: false })
        .limit(500);
      if (eventFilter !== "all") q = q.eq("event_type", eventFilter);
      if (userFilter !== "all") q = q.eq("user_id", userFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["org-emp-minimal", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("hr_employees").select("id, first_name, last_name").eq("organization_id", orgId).eq("status", "active").order("first_name");
      return data || [];
    },
  });

  const filteredLogs = (logs || []).filter((l: any) => {
    if (!logSearch) return true;
    const q = logSearch.toLowerCase();
    const emp = l.hr_employees;
    const name = emp ? `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase() : "";
    return name.includes(q) || (l.ip_address || "").includes(q) || (l.city || "").toLowerCase().includes(q);
  });
  const logTotalPages = Math.ceil(filteredLogs.length / LOG_PAGE_SIZE);
  const paginatedLogs = filteredLogs.slice(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE);
  const uniqueEvents = ["all", ...Array.from(new Set((logs || []).map((l: any) => l.event_type)))];

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["org-sessions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_organization_active_sessions", { p_org_id: orgId });
      if (error) throw error;
      return data || [];
    },
    enabled: section === "sessions",
  });

  const filteredSessions = (sessions || []).filter((s: any) => {
    if (!sessionSearch) return true;
    const q = sessionSearch.toLowerCase();
    return `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(q);
  });

  const terminateSession = async (sessionId: string) => {
    setTerminatingId(sessionId);
    try {
      const { error } = await supabase.rpc("superadmin_terminate_session", { p_session_id: sessionId });
      if (error) throw error;
      toast.success("Session revoked — user will be logged out");
      refetchSessions();
    } catch { toast.error("Failed to terminate session"); }
    finally { setTerminatingId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 w-fit shadow-sm">
        {(["logs", "sessions"] as const).map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${section === s ? "bg-[#7B43F1] text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
            {s === "logs" ? "Activity Logs" : "Active Sessions"}
          </button>
        ))}
      </div>

      {section === "logs" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-50 bg-gray-50/40">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={logSearch} onChange={(e) => { setLogSearch(e.target.value); setLogPage(0); }}
                placeholder="Search name, email, IP, city…"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B43F1] bg-white" />
            </div>
            <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setLogPage(0); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
              {uniqueEvents.map((e: any) => <option key={e} value={e}>{e === "all" ? "All Events" : (eventCfg[e]?.label || e)}</option>)}
            </select>
            <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setLogPage(0); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
              <option value="all">All Users</option>
              {(employees || []).map((e: any) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <button onClick={() => { setEventFilter("all"); setUserFilter("all"); setLogSearch(""); setLogPage(0); refetchLogs(); }}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={11} className="text-gray-400" /></button>
            <span className="text-[10px] text-gray-400 ml-auto">{filteredLogs.length} events</span>
          </div>
          {logsLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[#7B43F1]" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50 bg-white">
                      {["Event", "User", "Time", "Location", "Device", "Details"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedLogs.map((log: any) => {
                      const cfg = eventCfg[log.event_type] || { label: log.event_type, color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
                      const emp = log.hr_employees;
                      const DevIcon = getDeviceIcon(log.device_info);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />{cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {emp ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7B43F1] font-bold text-[9px] shrink-0">
                                  {(emp.first_name?.[0] || "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                                  <p className="text-[9px] text-gray-400">{emp.hr_roles?.name || "—"}</p>
                                </div>
                              </div>
                            ) : <span className="text-gray-300 italic text-[10px]">Unknown</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            <p>{moment(log.timestamp).format("D MMM, HH:mm")}</p>
                            <p className="text-[9px] text-gray-400">{moment(log.timestamp).fromNow()}</p>
                          </td>
                          <td className="px-4 py-3">
                            {log.city || log.country ? (
                              <div className="flex items-center gap-1 text-gray-500">
                                <MapPinIcon size={10} className="shrink-0" />
                                <span>{[log.city, log.country].filter(Boolean).join(", ")}</span>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                            {log.ip_address && <p className="text-[9px] text-gray-400 font-mono mt-0.5">{log.ip_address}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-500">
                              <DevIcon size={11} className="shrink-0" />
                              <span className="truncate max-w-[120px]">{parseUA(log.device_info)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {log.details?.errorMessage ? (
                              <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-lg font-medium max-w-[160px] truncate block">
                                {log.details.errorMessage}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedLogs.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                        <Activity size={24} className="mx-auto mb-2 opacity-30" />No activity found
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {logTotalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400">Page {logPage + 1} of {logTotalPages} · {filteredLogs.length} events</span>
                  <div className="flex gap-1">
                    <button onClick={() => setLogPage((p) => Math.max(0, p - 1))} disabled={logPage === 0}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <button onClick={() => setLogPage((p) => Math.min(logTotalPages - 1, p + 1))} disabled={logPage >= logTotalPages - 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {section === "sessions" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-50 bg-gray-50/40">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Search user…"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B43F1] bg-white" />
            </div>
            <button onClick={() => refetchSessions()} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw size={11} className="text-gray-400" /></button>
            <span className="text-[10px] text-gray-400 ml-auto">{filteredSessions.length} active sessions</span>
          </div>
          {sessionsLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[#7B43F1]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-50">
                    {["User", "Started", "Last Active", "Expires", "Device / IP", "Action"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSessions.map((s: any) => {
                    const isExpiringSoon = s.not_after && new Date(s.not_after) < new Date(Date.now() + 3600000);
                    return (
                      <tr key={s.session_id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7B43F1] font-bold text-[9px] shrink-0">
                              {(s.first_name?.[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                              <p className="text-[9px] text-gray-400 truncate max-w-[120px]">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          <p>{s.created_at ? moment(s.created_at).format("D MMM, HH:mm") : "—"}</p>
                          <p className="text-[9px] text-gray-400">{s.created_at ? moment(s.created_at).fromNow() : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{s.refreshed_at ? moment(s.refreshed_at).fromNow() : "—"}</td>
                        <td className="px-4 py-3">
                          {s.not_after ? (
                            <span className={`text-[10px] font-bold ${isExpiringSoon ? "text-amber-600" : "text-gray-500"}`}>
                              {moment(s.not_after).fromNow()}
                            </span>
                          ) : <span className="text-gray-300 text-[10px]">No expiry</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-500">
                            {/mobile|android|iphone/i.test(s.user_agent || "") ? <Smartphone size={10} /> : <Monitor size={10} />}
                            <span className="truncate max-w-[120px]">{parseUA(s.user_agent)}</span>
                          </div>
                          {s.ip && <p className="text-[9px] font-mono text-gray-400 mt-0.5">{String(s.ip)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => terminateSession(s.session_id)} disabled={terminatingId === s.session_id}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-40">
                            {terminatingId === s.session_id ? <Loader2 size={10} className="animate-spin" /> : <LogOut size={10} />} Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSessions.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                      <Shield size={24} className="mx-auto mb-2 opacity-30" />No active sessions
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── InvoicesList ─────────────────────────────────────────────────────────────
const InvoicesList = ({ orgId }: { orgId: string }) => {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["orgInvoices", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("hr_invoices")
        .select("id, invoice_number, status, total_amount, invoice_date, due_date")
        .eq("organization_client_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    },
  });
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[#7B43F1]" /></div>;
  const statusColor: Record<string, string> = {
    Paid: "text-emerald-600 bg-emerald-50", Pending: "text-blue-600 bg-blue-50",
    Unpaid: "text-orange-600 bg-orange-50", Overdue: "text-red-500 bg-red-50",
  };
  return (
    <div className="space-y-2">
      {(invoices || []).map((inv: any) => (
        <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div>
            <p className="text-sm font-semibold text-gray-900">#{inv.invoice_number}</p>
            <p className="text-[10px] text-gray-400">{inv.invoice_date ? moment(inv.invoice_date).format("D MMM YYYY") : "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[inv.status] || "text-gray-500 bg-gray-100"}`}>{inv.status}</span>
            <span className="text-sm font-bold text-gray-900">₹{parseFloat(inv.total_amount || 0).toLocaleString()}</span>
          </div>
        </div>
      ))}
      {!(invoices || []).length && <p className="text-center py-6 text-sm text-gray-400">No invoices yet</p>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SingleOrganizationDashboard: FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "settings" | "users" | "activity" | "billing">("overview");
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);     // EditSubscriptionModal — TrialSubscriptionCard buttons (Modify/Upgrade/Extend)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false); // SubscriptionBillingModal — header button, creates invoice
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const { data: details, isLoading: detailsLoading, refetch: refetchDetails } = useQuery({
    queryKey: ["orgDashDetails", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_organization_dashboard_details_v2", { org_id: organizationId });
      if (error) throw error;
      return data as OrgDetails;
    },
    enabled: !!organizationId,
  });

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["orgProfile", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_organization_profile").select("*").eq("organization_id", organizationId!).single();
      if (error && error.code !== "PGRST116") console.error(error);
      return data as OrgProfile | null;
    },
    enabled: !!organizationId,
  });

  const { data: pendingInvoice } = useQuery({
    queryKey: ["pendingSubInvoice", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("hr_invoices").select("*")
        .eq("organization_client_id", organizationId!)
        .neq("status", "Paid")
        .not("subscription_config", "is", null)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: weeklyActivity } = useQuery({
    queryKey: ["orgWeeklyActivity", organizationId],
    queryFn: async () => { const { data } = await supabase.rpc("get_weekly_activity_summary", { org_id: organizationId }); return data; },
    enabled: !!organizationId,
  });

  const { data: recentLogins } = useQuery({
    queryKey: ["orgRecentLogins", organizationId],
    queryFn: async () => { const { data } = await supabase.rpc("get_recently_logged_in_users", { org_id: organizationId }); return data; },
    enabled: !!organizationId,
  });

  const refetchAll = () => { refetchDetails(); refetchProfile(); };

  const saveOrgField = async (field: string, value: any) => {
    const { error } = await supabase.from("hr_organizations").update({ [field]: value }).eq("id", organizationId!);
    if (error) throw error;
    refetchDetails();
  };

  const saveProfileField = async (field: string, value: any) => {
    if (profile) {
      const { error } = await supabase.from("hr_organization_profile").update({ [field]: value, updated_at: new Date().toISOString() }).eq("organization_id", organizationId!);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("hr_organization_profile").insert({ organization_id: organizationId!, company_name: details?.name || "", [field]: value });
      if (error) throw error;
    }
    refetchProfile();
  };

  const setOrgStatus = async (status: string) => {
    await saveOrgField("status", status);
    toast.success(`Organization ${status}`);
  };

  if (detailsLoading || !details) {
    return <div className="flex items-center justify-center min-h-screen bg-[#F7F7F8]"><Loader2 size={28} className="animate-spin text-[#7B43F1]" /></div>;
  }

  const tabs = [
    { id: "overview",  label: "Overview",             icon: BarChart2 },
    { id: "profile",   label: "Profile",               icon: Building },
    { id: "settings",  label: "Settings",              icon: Settings },
    { id: "users",     label: `Users (${details.total_users})`, icon: Users },
    { id: "activity",  label: "Activity & Sessions",   icon: Activity },
    { id: "billing",   label: "Billing",               icon: CreditCard },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <RouterLink to="/organization" className="inline-flex items-center text-xs font-medium text-gray-400 hover:text-gray-700 mb-3">
            <ArrowLeft size={13} className="mr-1.5" /> All Organizations
          </RouterLink>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] flex items-center justify-center">
                <Building2 size={22} className="text-[#7B43F1]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{profile?.company_name || details.name}</h1>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${details.status === "active" ? "bg-emerald-50 text-emerald-600" : details.status === "suspended" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>
                    {details.status}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${details.subscription_status === "active" ? "bg-blue-50 text-blue-600" : details.subscription_status === "trial" ? "bg-yellow-50 text-yellow-600" : details.subscription_status === "expired" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"}`}>
                    {details.subscription_status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{details.subdomain && `${details.subdomain} · `}ID: {details.id.slice(0, 8)}…</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {details.status === "active" ? (
                <button onClick={() => setOrgStatus("suspended")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100">
                  <Shield size={12} /> Suspend
                </button>
              ) : details.status === "suspended" ? (
                <button onClick={() => setOrgStatus("active")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100">
                  <Check size={12} /> Reactivate
                </button>
              ) : null}
              <button onClick={() => setIsPricingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50">
                <Coins size={12} /> Credits & Pricing
              </button>
              <button onClick={() => setIsBillingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white hover:shadow-md"
                style={{ background: "#7B43F1" }}>
                <Zap size={12} /> Edit Subscription
              </button>
            </div>
          </div>
          <div className="flex gap-1 mt-5 border-b border-gray-100 -mb-px overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === id ? "border-[#7B43F1] text-[#7B43F1]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        {pendingInvoice && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <AlertTriangle size={16} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">Pending Subscription Activation</p>
              <p className="text-xs text-orange-600 mt-0.5">
                Plan update to <strong>{pendingInvoice.subscription_config?.plan_name}</strong> · Invoice #{pendingInvoice.invoice_number} is {pendingInvoice.status}
              </p>
            </div>
            <RouterLink to="/organization/invoices" className="text-xs font-bold text-orange-700 underline shrink-0">View Invoice</RouterLink>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <TrialSubscriptionCard
              organizationId={details.id}
              subscriptionStatus={details.subscription_status as any}
              startDate={details.subscription_status === "trial" ? details.trial_start_date : details.subscription_start_date}
              endDate={details.subscription_status === "trial" ? details.trial_end_date : details.subscription_expires_at}
              subscriptionPlan={details.subscription_plan}
              trialExtended={details.trial_extended}
              onUpgradeClick={() => setIsSubModalOpen(true)}
              onExtendTrialClick={() => setIsSubModalOpen(true)}
              onOpenManageSubscription={() => setIsSubModalOpen(true)}
              pendingInvoice={pendingInvoice}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Users",  value: details.total_users,             icon: Users,          link: `/organization/${organizationId}/users`,    color: "text-blue-600 bg-blue-50" },
                { label: "Talent Pool",  value: details.talent_pool_count,        icon: FileText,       link: `/organization/${organizationId}/talent`,   color: "text-purple-600 bg-purple-50" },
                { label: "Active Jobs",  value: details.total_jobs || 0,          icon: BriefcaseBusiness, link: `/organization/${organizationId}/jobs`, color: "text-green-600 bg-green-50" },
                { label: "Clients",      value: details.total_clients || 0,       icon: Building2,      link: `/organization/${organizationId}/clients`,  color: "text-orange-600 bg-orange-50" },
                { label: "EPFO Checks",  value: details.total_epfo_verifications, icon: ListChecks,     link: null,                                      color: "text-indigo-600 bg-indigo-50" },
                { label: "AI Tokens",    value: (details.total_ai_tokens_used || 0).toLocaleString(), icon: BrainCircuit, link: null, color: "text-pink-600 bg-pink-50" },
              ].map(({ label, value, icon: Icon, link, color }) => {
                const card = (
                  <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow cursor-pointer">
                    <div className={`p-2 rounded-lg ${color} w-fit mb-3`}><Icon size={14} /></div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
                  </div>
                );
                return link ? <RouterLink key={label} to={link}>{card}</RouterLink> : <div key={label}>{card}</div>;
              })}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Weekly AI Token Usage</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyActivity || []}>
                    <XAxis dataKey="day_name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="gemini_tokens_used" name="Tokens" fill="#7B43F1" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Logins</h3>
                <div className="space-y-3">
                  {(recentLogins || []).slice(0, 5).map((u: any) => (
                    <div key={u.email} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#EDE9FE] flex items-center justify-center text-[#7B43F1] font-bold text-[10px] shrink-0">
                        {(u.name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{u.last_login ? moment(u.last_login).fromNow(true) : "Never"}</span>
                    </div>
                  ))}
                  {!(recentLogins || []).length && <p className="text-xs text-gray-400 text-center py-4">No recent logins</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField label="Company Name" value={profile?.company_name || details.name || ""} onSave={(v) => saveProfileField("company_name", v)} />
                <EditField label="Website" value={profile?.website} onSave={(v) => saveProfileField("website", v)} />
                <EditField label="Contact Email" value={profile?.email} onSave={(v) => saveProfileField("email", v)} type="email" />
                <EditField label="Phone" value={profile?.phone} onSave={(v) => saveProfileField("phone", v)} />
                <EditField label="PAN Number" value={profile?.pan_number} onSave={(v) => saveProfileField("pan_number", v)} />
                <EditField label="GSTIN" value={profile?.gstin} onSave={(v) => saveProfileField("gstin", v)} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3">Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><EditField label="Address Line 1" value={profile?.address_line1} onSave={(v) => saveProfileField("address_line1", v)} /></div>
                <div className="sm:col-span-2"><EditField label="Address Line 2" value={profile?.address_line2} onSave={(v) => saveProfileField("address_line2", v)} /></div>
                <EditField label="City" value={profile?.city} onSave={(v) => saveProfileField("city", v)} />
                <EditField label="State" value={profile?.state} onSave={(v) => saveProfileField("state", v)} />
                <EditField label="ZIP Code" value={profile?.zip_code} onSave={(v) => saveProfileField("zip_code", v)} />
                <EditField label="Country" value={profile?.country} onSave={(v) => saveProfileField("country", v)} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-50 pb-3">Organization Fields</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField label="Subdomain" value={details.subdomain} onSave={(v) => saveOrgField("subdomain", v)} />
                <EditField label="Invoice Prefix" value={details.invoice_prefix} onSave={(v) => saveOrgField("invoice_prefix", v)} />
                <EditField label="Job ID Prefix" value={details.job_id_prefix} onSave={(v) => saveOrgField("job_id_prefix", v)} />
                <EditField label="Verification Provider" value={details.verification_check} onSave={(v) => saveOrgField("verification_check", v)}
                  options={[{ value: "gridlines", label: "Gridlines" }, { value: "truthscreen", label: "Truthscreen" }]} />
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Feature Suites</h3>
              <div className="divide-y divide-gray-50">
                {[
                  { key: "hiring_suite", label: "Hiring Suite", desc: "Recruitment & ATS" },
                  { key: "sales_suite", label: "Sales Suite", desc: "CRM, contacts, companies" },
                  { key: "finance_suite", label: "Finance Suite", desc: "Invoices, billing" },
                  { key: "project_suite", label: "Project Suite", desc: "Project management" },
                  { key: "verification_suite", label: "Verification Suite", desc: "EPFO, BGV checks" },
                  { key: "general_suite", label: "General Suite", desc: "General platform features" },
                ].map(({ key, label, desc }) => {
                  const features = details.subscription_features || {};
                  return (
                    <ToggleField key={key} label={label} description={desc} value={!!features[key]}
                      onToggle={async () => {
                        const updated = { ...features, [key]: !features[key] };
                        await saveOrgField("subscription_features", updated);
                        toast.success(`${label} ${!features[key] ? "enabled" : "disabled"}`);
                      }} />
                  );
                })}
              </div>
            </div>
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Org Flags</h3>
                <div className="divide-y divide-gray-50">
                  <ToggleField label="Recruitment Firm" description="Is this a recruitment agency?" value={!!details.is_recruitment_firm}
                    onToggle={async () => { await saveOrgField("is_recruitment_firm", !details.is_recruitment_firm); toast.success("Updated"); }} />
                  <ToggleField label="Verification Firm" value={!!details.is_verification_firm}
                    onToggle={async () => { await saveOrgField("is_verification_firm", !details.is_verification_firm); toast.success("Updated"); }} />
                  <ToggleField label="Auto Job ID" description="Auto-generate job IDs" value={!!details.is_job_id_auto}
                    onToggle={async () => { await saveOrgField("is_job_id_auto", !details.is_job_id_auto); toast.success("Updated"); }} />
                  <ToggleField label="Skill Matrix Mandatory" value={!!details.is_skill_matrix_mandatory}
                    onToggle={async () => { await saveOrgField("is_skill_matrix_mandatory", !details.is_skill_matrix_mandatory); toast.success("Updated"); }} />
                  <ToggleField label="Complete Profile" value={!!details.complete_profile}
                    onToggle={async () => { await saveOrgField("complete_profile", !details.complete_profile); toast.success("Updated"); }} />
                  <ToggleField label="Trial Extended" value={!!details.trial_extended}
                    onToggle={async () => { await saveOrgField("trial_extended", !details.trial_extended); toast.success("Updated"); }} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Role Credit Limits</h3>
                <div className="space-y-3">
                  {Object.entries(details.role_credit_limits || {}).map(([role, limit]) => (
                    <EditField key={role}
                      label={role === "organization_superadmin" ? "Super Admin" : role.charAt(0).toUpperCase() + role.slice(1)}
                      value={String(limit)}
                      onSave={async (v) => {
                        const updated = { ...details.role_credit_limits, [role]: parseInt(v) || 0 };
                        await saveOrgField("role_credit_limits", updated);
                      }}
                      type="number" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Organization Users</h3>
                <p className="text-xs text-gray-400 mt-0.5">{details.total_users} total users</p>
              </div>
              <RouterLink to={`/organization/${organizationId}/users`}
                className="flex items-center gap-1.5 text-xs font-bold text-[#7B43F1] hover:underline">
                Full User Management <ExternalLink size={11} />
              </RouterLink>
            </div>
            <div className="p-5"><UsersPanel orgId={organizationId!} /></div>
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && organizationId && (
          <ActivitySessionsPanel orgId={organizationId} />
        )}

        {/* BILLING */}
        {activeTab === "billing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Invoices</h3>
                <InvoicesList orgId={organizationId!} />
              </div>
            </div>
            <div>
              <CreditAdjustPanel
                orgId={organizationId!}
                currentBalance={parseFloat(details.credit_balance || "0")}
                onSuccess={refetchAll}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {organizationId && (
        <>
          {/* Direct edit — no invoice. Opened from header "Edit Subscription" button. */}
          <EditSubscriptionModal
            isOpen={isSubModalOpen}
            onClose={() => setIsSubModalOpen(false)}
            organizationId={organizationId}
            currentData={{
              subscription_status: details.subscription_status,
              subscription_plan: details.subscription_plan,
              subscription_start_date: details.subscription_start_date,
              subscription_expires_at: details.subscription_expires_at,
              trial_start_date: details.trial_start_date,
              trial_end_date: details.trial_end_date,
              trial_extended: details.trial_extended,
              role_credit_limits: details.role_credit_limits,
              subscription_features: details.subscription_features,
              status: details.status,
            }}
            onSuccess={refetchAll}
          />

          {/* Original billing modal — creates invoice. Opened from TrialSubscriptionCard buttons. */}
          <SubscriptionBillingModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
            organizationId={organizationId}
            initialData={{
              planId: details.subscription_plan,
              limits: details.role_credit_limits,
              expiryDate: details.subscription_status === "trial"
                ? details.trial_end_date
                : details.subscription_expires_at,
            }}
            onSuccess={() => { setIsBillingModalOpen(false); refetchAll(); }}
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