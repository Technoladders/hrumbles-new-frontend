// src/components/UserManagement/UserManagementDashboard.tsx
// Rethemed to #7B43F1 app theme + licence-based user model
// User  = hr_employees WITH user_id  (has auth account, consumes a licence slot)
// Employee = hr_employees WITHOUT user_id (no login access, does NOT consume a slot)

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import moment from 'moment';
import {
  Users, UserPlus, Search, Shield, Building, Edit,
  UserRoundPen, RefreshCw, Key, UserX, ChevronDown,
  CheckCircle, XCircle, Clock, AlertTriangle, Loader2,
  UserCheck, Mail, Phone,
} from 'lucide-react';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import BulkActionsBar from './BulkActionsBar';

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  status: string;
  employee_id?: string | null;
  joining_date?: string | null;
  hire_type?: string | null;
  user_id?: string | null;
  has_licence: boolean;
  last_sign_in?: string | null;
  is_confirmed: boolean;
  role_id?: string | null;
  role_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  designation_name?: string | null;
  created_at: string;
  role_display_name?: string;
}

interface LicenceUsage {
  role_name: string;
  role_id: string;
  limit_count: number;
  used_count: number;
  available_count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_DISPLAY: Record<string, string> = {
  organization_superadmin: 'Super Admin',
  admin: 'Admin',
  employee: 'Employee',
};

const P = '#7B43F1';
const PL = '#EDE9FE';

// ─── Licence Slot Card ────────────────────────────────────────────────────────
const LicenceSlotCard = ({ slot }: { slot: LicenceUsage }) => {
  const pct = slot.limit_count > 0 ? Math.min((slot.used_count / slot.limit_count) * 100, 100) : 0;
  const isFull = slot.available_count === 0;
  const isNear = pct >= 80 && !isFull;
  const displayName = ROLE_DISPLAY[slot.role_name] || slot.role_name;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600">{displayName}</span>
        <span className={`text-xs font-black ${isFull ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-[#7B43F1]'}`}>
          {slot.used_count} / {slot.limit_count}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-[#7B43F1]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">
        {isFull ? (
          <span className="text-red-500 font-semibold">Limit reached</span>
        ) : (
          <span>{slot.available_count} slot{slot.available_count !== 1 ? 's' : ''} available</span>
        )}
      </p>
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    active:     'bg-emerald-50 text-emerald-700',
    inactive:   'bg-amber-50 text-amber-700',
    terminated: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cfg[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagementDashboard = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [licenceUsage, setLicenceUsage] = useState<LicenceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'licensed' | 'employees' | 'all'>('licensed');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection
  const [selected, setSelected] = useState<string[]>([]);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [prefillEmployee, setPrefillEmployee] = useState<EmployeeRow | null>(null);
  const [editingUser, setEditingUser] = useState<EmployeeRow | null>(null);
  const [detailUser, setDetailUser] = useState<EmployeeRow | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<EmployeeRow | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [rowsRes, licenceRes] = await Promise.all([
        supabase.rpc('get_users_with_licence_status', { org_id: organizationId }),
        supabase.rpc('get_licence_usage', { org_id: organizationId }),
      ]);

      if (rowsRes.error) throw rowsRes.error;
      if (licenceRes.error) throw licenceRes.error;

      const formatted = (rowsRes.data || []).map((r: any) => ({
        ...r,
        role_display_name: ROLE_DISPLAY[r.role_name] || r.role_name || '—',
      }));

      setRows(formatted);
      setLicenceUsage(licenceRes.data || []);
    } catch (e: any) {
      toast.error(`Failed to load users: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Revoke licence ─────────────────────────────────────────────────────────
  const handleRevoke = async (emp: EmployeeRow) => {
    setRevoking(emp.id);
    try {
      const { data, error } = await supabase.rpc('superadmin_revoke_user_licence', {
        p_employee_id: emp.id,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Revoke failed');
      toast.success('Licence revoked — auth access removed. Employee record preserved.');
      setConfirmRevoke(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke licence');
    } finally {
      setRevoking(null);
    }
  };

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (empId: string, newStatus: string) => {
    const { error } = await supabase.from('hr_employees').update({ status: newStatus }).eq('id', empId);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Status updated to ${newStatus}`);
    fetchData();
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const bulkStatus = async (status: string) => {
    await Promise.all(selected.map((id) => supabase.from('hr_employees').update({ status }).eq('id', id)));
    toast.success(`${selected.length} users updated`);
    setSelected([]);
    fetchData();
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [r.first_name, r.last_name, r.email, r.employee_id]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
    const matchView =
      viewMode === 'all' ? true :
      viewMode === 'licensed' ? r.has_licence :
      !r.has_licence;
    const matchRole = roleFilter === 'all' || r.role_name === roleFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchView && matchRole && matchStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    licensed: rows.filter((r) => r.has_licence).length,
    employees: rows.filter((r) => !r.has_licence).length,
    active: rows.filter((r) => r.status === 'active').length,
    inactive: rows.filter((r) => r.status === 'inactive').length,
    terminated: rows.filter((r) => r.status === 'terminated').length,
  };

  const totalSlots = licenceUsage.reduce((a, s) => a + s.limit_count, 0);
  const usedSlots = licenceUsage.reduce((a, s) => a + s.used_count, 0);
  const canAddUser = licenceUsage.some((s) => s.available_count > 0);

  const uniqueRoles = Array.from(new Set(rows.map((r) => r.role_name).filter(Boolean)));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Licensed Users', value: stats.licensed, color: 'text-[#7B43F1]', bg: '#EDE9FE', icon: Key },
          { label: 'Employees Only', value: stats.employees, color: 'text-gray-600', bg: '#F3F4F6', icon: Users },
          { label: 'Active', value: stats.active, color: 'text-emerald-700', bg: '#ECFDF5', icon: CheckCircle },
          { label: 'Inactive', value: stats.inactive, color: 'text-amber-700', bg: '#FEF3C7', icon: Clock },
          { label: 'Terminated', value: stats.terminated, color: 'text-red-600', bg: '#FEF2F2', icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
              <div className="p-1.5 rounded-lg" style={{ background: bg }}>
                <Icon size={12} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Licence Slots ───────────────────────────────────────────────── */}
      {licenceUsage.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Licence Slots</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {usedSlots} of {totalSlots} total slots used across all roles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-gray-400">
                <span className="font-bold text-[#7B43F1]">{usedSlots}</span> / {totalSlots}
              </div>
              <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full bg-[#7B43F1]" style={{ width: `${(usedSlots / totalSlots) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {licenceUsage.map((slot) => <LicenceSlotCard key={slot.role_id} slot={slot} />)}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <AlertTriangle size={10} />
            A <strong>Licence Slot</strong> is consumed when an employee has an auth login account (user_id is set).
            Employees without auth accounts do not consume slots.
          </p>
        </div>
      )}

      {/* ── Main Table Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {viewMode === 'licensed' ? 'Licensed Users' : viewMode === 'employees' ? 'Employees (No Login)' : 'All People'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {viewMode === 'licensed'
                ? 'People with active auth accounts — consuming a licence slot'
                : viewMode === 'employees'
                ? 'Employee records without login access — no licence consumed'
                : 'All hr_employees records'}
            </p>
          </div>
          <button
            onClick={() => { setPrefillEmployee(null); setShowAdd(true); }}
            disabled={!canAddUser}
            title={!canAddUser ? 'No licence slots available' : 'Invite a new user'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: P }}
          >
            <UserPlus size={13} /> Invite User
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50/50 border-b border-gray-50">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {([
              { key: 'licensed',  label: `Users (${stats.licensed})` },
              { key: 'employees', label: `Employees (${stats.employees})` },
              { key: 'all',       label: `All (${rows.length})` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setViewMode(key)}
                className={`px-3 py-1.5 font-semibold transition-colors ${viewMode === key ? 'bg-[#7B43F1] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ID…"
              className="w-full pl-7 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B43F1] bg-white" />
          </div>

          {/* Role filter */}
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
            <option value="all">All Roles</option>
            {uniqueRoles.map((r) => <option key={r!} value={r!}>{ROLE_DISPLAY[r!] || r}</option>)}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B43F1]">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>

          <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} records</span>
          <button onClick={fetchData} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <RefreshCw size={12} className="text-gray-400" />
          </button>
        </div>

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <div className="px-4 py-2">
            <BulkActionsBar
              selectedCount={selected.length}
              onActivate={() => bulkStatus('active')}
              onDeactivate={() => bulkStatus('inactive')}
              onClear={() => setSelected([])}
            />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-[#7B43F1]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((r) => r.id))}
                      className="rounded border-gray-300" />
                  </th>
                  {['Person', 'Role / Dept', 'Access', 'Status', 'Last Login', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-purple-50/20 transition-colors group">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(emp.id)}
                        onChange={() => setSelected((p) => p.includes(emp.id) ? p.filter((x) => x !== emp.id) : [...p, emp.id])}
                        className="rounded border-gray-300" />
                    </td>

                    {/* Person */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                          style={{ background: emp.has_licence ? PL : '#F3F4F6', color: emp.has_licence ? P : '#6B7280' }}>
                          {(emp.first_name?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{emp.first_name} {emp.last_name}</p>
                          <p className="text-[9px] text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role / Dept */}
                    <td className="px-4 py-3">
                      {emp.role_display_name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">{emp.role_display_name}</span>
                      )}
                      {emp.department_name && (
                        <p className="text-[9px] text-gray-400 mt-0.5">{emp.department_name}</p>
                      )}
                    </td>

                    {/* Access / Licence */}
                    <td className="px-4 py-3">
                      {emp.has_licence ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            <Key size={8} /> Licensed
                          </span>
                          {!emp.is_confirmed && (
                            <p className="text-[9px] text-amber-500 mt-0.5 flex items-center gap-0.5">
                              <Mail size={8} /> Invite pending
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                          <UserX size={8} /> Employee only
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={emp.status}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                          emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          emp.status === 'inactive' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-gray-400">
                      {emp.last_sign_in ? (
                        <div>
                          <p className="text-gray-600">{moment(emp.last_sign_in).format('D MMM, HH:mm')}</p>
                          <p className="text-[9px]">{moment(emp.last_sign_in).fromNow()}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300">{emp.has_licence ? 'Never' : '—'}</span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-gray-400">
                      {emp.joining_date ? moment(emp.joining_date).format('D MMM YYYY') : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View details */}
                        <button onClick={() => setDetailUser(emp)}
                          title="View details"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#7B43F1] transition-colors">
                          <UserRoundPen size={13} />
                        </button>

                        {/* Edit */}
                        <button onClick={() => setEditingUser(emp)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#7B43F1] transition-colors">
                          <Edit size={13} />
                        </button>

                        {/* Revoke licence (only shown for licensed users) */}
                        {emp.has_licence && (
                          <button onClick={() => setConfirmRevoke(emp)}
                            title="Revoke licence"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <UserX size={13} />
                          </button>
                        )}

                        {/* Grant access (only shown for employees without licence) */}
                        {!emp.has_licence && (
                          <button
                            onClick={() => { setPrefillEmployee(emp); setShowAdd(true); }}
                            title="Grant login access to this employee"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-[#7B43F1] transition-colors">
                            <Key size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <Users size={24} className="mx-auto mb-2 opacity-30" />
                      No records match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Revoke Confirmation Modal ─────────────────────────────────────── */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmRevoke(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm z-10">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX size={22} className="text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 text-center mb-1">Revoke Licence?</h3>
            <p className="text-xs text-gray-500 text-center mb-2">
              <strong>{confirmRevoke.first_name} {confirmRevoke.last_name}</strong>
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-700 leading-relaxed">
                This will <strong>remove their login access</strong> and free up their licence slot.
                Their employee record, timesheets, payroll data, and all history will be <strong>fully preserved</strong>.
                They can be re-invited at any time.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2 text-sm font-medium text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleRevoke(confirmRevoke)} disabled={revoking === confirmRevoke.id}
                className="flex-1 py-2 text-sm font-bold text-white rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-1">
                {revoking === confirmRevoke.id ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AddUserModal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setPrefillEmployee(null); }}
        onSuccess={() => { setShowAdd(false); setPrefillEmployee(null); fetchData(); }}
        prefillData={prefillEmployee}
      />
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => { setEditingUser(null); fetchData(); }}
          user={editingUser as any}
        />
      )}
      {detailUser && (
        <UserDetailsModal
          user={detailUser as any}
          isOpen={!!detailUser}
          onClose={() => setDetailUser(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default UserManagementDashboard;