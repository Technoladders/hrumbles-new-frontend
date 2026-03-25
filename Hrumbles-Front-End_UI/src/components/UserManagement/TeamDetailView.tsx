import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Users, UserPlus, Trash2, Edit, Search,
  UserCircle2, Building2, GitBranch, Hash, Mail, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { Team } from './TeamManagement';
import EditTeamDialog from './EditTeamDialog';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  designation_name: string;
  employment_status: string;
}

interface TeamDetailViewProps {
  team: Team;
  allTeams: Team[];
  onBack: () => void;
  onRefresh: () => void;
}

// ─── Avatar helpers ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-violet-600',
];

const avatarGradient = (id: string) =>
  AVATAR_COLORS[parseInt(id.replace(/\D/g, '').slice(-2) || '0') % AVATAR_COLORS.length];

const initials = (fn: string, ln: string) =>
  ((fn?.[0] || '') + (ln?.[0] || '')).toUpperCase();

// ─── Skeleton row ────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
  <tr className="border-b border-slate-100">
    <td className="pl-3 pr-1.5 py-2.5">
      <div className="h-3 w-3 rounded bg-slate-100 animate-pulse" />
    </td>
    <td className="pl-2 pr-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-violet-100 animate-pulse flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-2.5 w-28 bg-slate-100 rounded animate-pulse" />
          <div className="h-2 w-36 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </td>
    {[120, 100, 80].map((w, i) => (
      <td key={i} className="px-3 py-2.5">
        <div className={`h-2.5 w-${w} bg-slate-100 rounded animate-pulse`} />
      </td>
    ))}
    <td className="px-3 py-2.5">
      <div className="h-5 w-12 rounded-full bg-slate-100 animate-pulse" />
    </td>
    <td className="px-3 py-2.5">
      <div className="h-6 w-6 rounded bg-slate-100 animate-pulse" />
    </td>
  </tr>
);

// ─── Gradient SVG def (once per render tree) ─────────────────────────────────

const GradientDef: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="tm-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Info pill ────────────────────────────────────────────────────────────────

const InfoPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  empty?: string;
}> = ({ icon, label, value, empty = 'None' }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
    <div className="text-violet-400 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn(
        'text-xs font-medium truncate',
        value ? 'text-slate-700' : 'text-slate-400 italic',
      )}>
        {value ?? empty}
      </p>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const TeamDetailView: React.FC<TeamDetailViewProps> = ({ team, allTeams, onBack, onRefresh }) => {
  const [members, setMembers]                   = useState<TeamMember[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<TeamMember[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [addLoading, setAddLoading]             = useState(false);

  const [showAddMember, setShowAddMember]   = useState(false);
  const [showEditTeam, setShowEditTeam]     = useState(false);
  const [removeTarget, setRemoveTarget]     = useState<TeamMember | null>(null);

  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');

  const { toast } = useToast();

  // ── Data ─────────────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('hr_team_members')
      .select(`
        employee:hr_employees!hr_team_members_employee_id_fkey!inner(
          id, first_name, last_name, email, employment_status,
          role:hr_roles!hr_employees_role_id_fkey(name),
          designation:hr_designations!hr_employees_designation_id_fkey(name)
        )
      `)
      .eq('team_id', team.id);
    if (error) throw error;
    return (data ?? []).map(item => ({
      id: item.employee.id,
      first_name: item.employee.first_name,
      last_name: item.employee.last_name,
      email: item.employee.email,
      role_name: item.employee.role?.name ?? 'No role',
      designation_name: item.employee.designation?.name ?? 'No designation',
      employment_status: item.employee.employment_status ?? 'unknown',
    }));
  }, [team.id]);

  const fetchAvailableEmployees = useCallback(async (currentIds: Set<string>) => {
    const authData = getAuthDataFromLocalStorage();
    if (!authData) return [];
    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
        id, first_name, last_name, email, employment_status,
        role:hr_roles!hr_employees_role_id_fkey(name),
        designation:hr_designations!hr_employees_designation_id_fkey(name)
      `)
      .eq('organization_id', authData.organization_id)
      .eq('status', 'active')
      .limit(200);
    if (error) throw error;
    return (data ?? [])
      .filter(e => !currentIds.has(e.id))
      .map(e => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email,
        role_name: e.role?.name ?? 'No role',
        designation_name: e.designation?.name ?? 'No designation',
        employment_status: e.employment_status ?? 'unknown',
      }));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const fetched = await fetchMembers();
      setMembers(fetched);
      const ids = new Set(fetched.map(m => m.id));
      setAvailableEmployees(await fetchAvailableEmployees(ids));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [fetchMembers, fetchAvailableEmployees, toast]);

  useEffect(() => {
    loadAll();
    setSelectedIds(new Set());
    setEmployeeSearch('');
  }, [team.id, loadAll]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAddMembers = async () => {
    if (selectedIds.size === 0) return;
    setAddLoading(true);
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) throw new Error('Auth data missing');
      const rows = Array.from(selectedIds).map(id => ({
        team_id: team.id,
        employee_id: id,
        organization_id: authData.organization_id,
        added_by: authData.userId,
      }));
      const { error } = await supabase.from('hr_team_members').insert(rows);
      if (error) throw error;
      toast({ title: 'Members added', description: `${rows.length} member(s) added to ${team.name}` });
      setShowAddMember(false);
      setSelectedIds(new Set());
      await loadAll();
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    try {
      const { error } = await supabase.from('hr_team_members')
        .delete().eq('team_id', team.id).eq('employee_id', removeTarget.id);
      if (error) throw error;
      toast({ title: 'Removed', description: `${removeTarget.first_name} ${removeTarget.last_name} removed.` });
      setRemoveTarget(null);
      await loadAll();
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = availableEmployees.filter(e => {
    const q = employeeSearch.toLowerCase();
    return e.first_name.toLowerCase().includes(q)
      || e.last_name.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q)
      || e.role_name.toLowerCase().includes(q);
  });

  const parentTeam = team.parent_team_id ? allTeams.find(t => t.id === team.parent_team_id) : null;

  const typePill: Record<string, string> = {
    department: 'bg-violet-100 text-violet-700',
    team:       'bg-sky-100 text-sky-700',
    sub_team:   'bg-emerald-100 text-emerald-700',
  };

  // ─── Column header ─────────────────────────────────────────────────────────
  const TH: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <th className={cn(
      'py-2.5 text-[9px] font-bold uppercase tracking-widest',
      'bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent',
      cls,
    )}>
      {children}
    </th>
  );

  // ─── Member row ────────────────────────────────────────────────────────────
  const MemberRow: React.FC<{ member: TeamMember }> = ({ member }) => {
    const grad = avatarGradient(member.id);
    const init = initials(member.first_name, member.last_name);
    const isActive = member.employment_status === 'active';

    return (
      <tr className="group border-b border-slate-100 hover:bg-violet-50/40 transition-colors duration-100">
        <td className="pl-4 pr-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0',
              'bg-gradient-to-br', grad,
            )}>
              {init}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">
                {member.first_name} {member.last_name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-100">
            {member.role_name}
          </span>
        </td>
        <td className="px-3 py-2.5 text-[11px] text-slate-500">{member.designation_name}</td>
        <td className="px-3 py-2.5">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
            isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-slate-100 text-slate-500 border border-slate-200',
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
            {member.employment_status}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right pr-4">
          <button
            onClick={() => setRemoveTarget(member)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500"
            title="Remove from team"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <GradientDef />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Teams
          </button>
          <span className="text-slate-200">/</span>
          <span className="text-sm font-semibold text-slate-700">{team.name}</span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', typePill[team.team_type])}>
            {team.team_type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowEditTeam(true)}
            className="h-7 text-xs border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600 gap-1.5"
          >
            <Edit className="h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddMember(true)}
            className="h-7 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm gap-1.5"
          >
            <UserPlus className="h-3 w-3" /> Add Members
          </Button>
        </div>
      </div>

      {/* Info pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <InfoPill icon={<UserCircle2 className="h-3.5 w-3.5" />} label="Team Lead"   value={team.team_lead_name}  empty="Not assigned" />
        <InfoPill icon={<Building2   className="h-3.5 w-3.5" />} label="Department"  value={team.department_name} empty="None" />
        <InfoPill icon={<GitBranch   className="h-3.5 w-3.5" />} label="Parent Team" value={parentTeam?.name}     empty="Root team" />
        <InfoPill icon={<Hash        className="h-3.5 w-3.5" />} label="Level"       value={String(team.level)} />
      </div>

      {team.description && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
          {team.description}
        </p>
      )}

      {/* Members table */}
      <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm bg-white">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-violet-50/40">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-bold text-slate-600">Members</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-semibold">
              {members.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/30">
                <TH cls="pl-4 pr-3">Member</TH>
                <TH cls="px-3">Role</TH>
                <TH cls="px-3">Designation</TH>
                <TH cls="px-3">Status</TH>
                <TH cls="px-3 pr-4 text-right">Action</TH>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : members.length === 0
                ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="rounded-full bg-violet-50 p-4 mb-3">
                          <Users className="h-6 w-6 text-violet-300" />
                        </div>
                        <p className="text-xs font-semibold text-slate-500">No members yet</p>
                        <p className="text-[11px] text-slate-400 mt-1 mb-4">
                          Add employees to this team to get started.
                        </p>
                        <Button size="sm" onClick={() => setShowAddMember(true)}
                          className="h-7 text-xs bg-gradient-to-r from-violet-600 to-pink-600 text-white border-0 gap-1.5">
                          <UserPlus className="h-3 w-3" /> Add Members
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
                : members.map(m => <MemberRow key={m.id} member={m} />)
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Members dialog ──────────────────────────────────────────────── */}
      <Dialog open={showAddMember} onOpenChange={open => {
        setShowAddMember(open);
        if (!open) { setSelectedIds(new Set()); setEmployeeSearch(''); }
      }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-xl gap-0">
          <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-4">
            <DialogTitle className="text-white text-base font-bold">Add Members</DialogTitle>
            <DialogDescription className="text-violet-200 text-xs mt-0.5">
              Select employees to add to <strong className="text-white">{team.name}</strong>. Already-added members are excluded.
            </DialogDescription>
          </div>

          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                className="pl-9 h-8 text-sm border-slate-200 focus-visible:ring-violet-400"
                placeholder="Search by name, email or role…"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto bg-white">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                {employeeSearch ? 'No employees match your search.' : 'All employees are already in this team.'}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-violet-100 bg-violet-50/40">
                    <th className="pl-4 pr-2 py-2 w-8">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))}
                        onCheckedChange={v => {
                          if (v) setSelectedIds(prev => new Set([...prev, ...filtered.map(e => e.id)]));
                          else setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(e => n.delete(e.id)); return n; });
                        }}
                        className="h-3 w-3"
                      />
                    </th>
                    {['Employee', 'Email', 'Role'].map(h => (
                      <th key={h} className={cn(
                        'px-3 py-2 text-[9px] font-bold uppercase tracking-widest',
                        'bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent',
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const selected = selectedIds.has(emp.id);
                    const grad = avatarGradient(emp.id);
                    const init = initials(emp.first_name, emp.last_name);
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => toggleSelect(emp.id)}
                        className={cn(
                          'border-b border-slate-100 cursor-pointer transition-colors duration-100',
                          selected ? 'bg-violet-700' : 'hover:bg-violet-50/40',
                        )}
                      >
                        <td className="pl-4 pr-2 py-2" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleSelect(emp.id)}
                            className={cn('h-3 w-3', selected && '[&>span]:border-white')}
                          />
                        </td>
                        <td className="pl-2 pr-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 bg-gradient-to-br', selected ? 'bg-white/20' : grad)}>
                              {init}
                            </div>
                            <span className={cn('text-[11px] font-semibold', selected ? 'text-white' : 'text-slate-700')}>
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn('text-[11px]', selected ? 'text-violet-200' : 'text-slate-400')}>
                            {emp.email}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            selected ? 'bg-white/20 text-violet-100' : 'bg-violet-50 text-violet-700',
                          )}>
                            {emp.role_name}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {selectedIds.size > 0
                ? `${selectedIds.size} employee${selectedIds.size > 1 ? 's' : ''} selected`
                : 'Select employees above'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddMember(false)}
                className="h-7 text-xs border-slate-200 text-slate-600">Cancel</Button>
              <Button size="sm" onClick={handleAddMembers}
                disabled={selectedIds.size === 0 || addLoading}
                className="h-7 text-xs bg-gradient-to-r from-violet-600 to-pink-600 text-white border-0 gap-1.5">
                {addLoading
                  ? <div className="animate-spin h-3 w-3 rounded-full border-b-2 border-white" />
                  : <><UserPlus className="h-3 w-3" /> Add {selectedIds.size > 0 ? selectedIds.size : ''} Member{selectedIds.size !== 1 ? 's' : ''}</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Remove confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent className="border-0 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-700">Remove member?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              {removeTarget && (
                <><strong className="text-slate-700">{removeTarget.first_name} {removeTarget.last_name}</strong>{' '}
                will be removed from <strong className="text-slate-700">{team.name}</strong>.
                Their employee record will not be affected.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="h-7 text-xs bg-rose-500 hover:bg-rose-600 text-white border-0"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit team dialog ────────────────────────────────────────────────── */}
      <EditTeamDialog
        open={showEditTeam}
        onOpenChange={setShowEditTeam}
        team={team}
        allTeams={allTeams}
        onSuccess={() => { setShowEditTeam(false); onRefresh(); }}
      />
    </div>
  );
};

export default TeamDetailView;