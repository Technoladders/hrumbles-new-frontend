import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { Team } from './TeamManagement';

// ── Radix forbids value="" on <SelectItem> ───────────────────────────────────
const NO_LEAD = '__none__';

// ── Employee with display metadata ──────────────────────────────────────────
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  designation_name: string | null;
  department_name: string | null;
}

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
  allTeams: Team[];
  onSuccess: () => void;
}

// ── Shared field wrapper ──────────────────────────────────────────────────────
const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label, hint, children,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between">
      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</Label>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
    {children}
  </div>
);

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({
  open, onOpenChange, team, allTeams, onSuccess,
}) => {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [teamLeadId, setTeamLeadId]   = useState<string>(NO_LEAD);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(false);
  const { toast } = useToast();

  // ── Populate form ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setName(team.name);
      setDescription(team.description ?? '');
      setTeamLeadId(team.team_lead_id && team.team_lead_id !== '' ? team.team_lead_id : NO_LEAD);
    }
  }, [open, team]);

  // ── Fetch employees with designation + department ─────────────────────────
  useEffect(() => {
    if (!open) return;
    const authData = getAuthDataFromLocalStorage();
    if (!authData) return;

    supabase
      .from('hr_employees')
      .select(`
        id,
        first_name,
        last_name,
        designation:hr_designations!hr_employees_designation_id_fkey(name),
        department:hr_departments!hr_employees_department_id_fkey(name)
      `)
      .eq('organization_id', authData.organization_id)
      .eq('status', 'active')
      .order('first_name')
      .limit(300)
      .then(({ data }) => {
        setEmployees(
          (data ?? []).map(e => ({
            id: e.id,
            first_name: e.first_name,
            last_name: e.last_name,
            designation_name: e.designation?.name ?? null,
            department_name: e.department?.name ?? null,
          }))
        );
      });
  }, [open]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) throw new Error('Auth data missing');

      const updates = {
        name: name.trim(),
        description: description.trim() || null,
        team_lead_id: teamLeadId === NO_LEAD ? null : teamLeadId,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('hr_teams').update(updates).eq('id', team.id);
      if (error) throw error;

      await supabase.from('hr_team_audit_logs').insert({
        team_id: team.id,
        action_type: 'team_updated',
        action_details: { changes: updates, updated_by: authData.userId },
        performed_by: authData.userId,
        organization_id: authData.organization_id,
      });

      toast({ title: 'Team updated', description: `"${name.trim()}" saved.` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to update.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const parentTeam = team.parent_team_id
    ? allTeams.find(t => t.id === team.parent_team_id)
    : null;

  const typePill: Record<string, string> = {
    department: 'bg-violet-100 text-violet-700 border-violet-200',
    team:       'bg-sky-100 text-sky-700 border-sky-200',
    sub_team:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 border-0 shadow-xl">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-white text-base font-bold">Edit Team</DialogTitle>
              <DialogDescription className="text-violet-200 text-xs mt-0.5">
                {parentTeam ? `Sub-team of "${parentTeam.name}"` : 'Root-level team'}
              </DialogDescription>
            </div>
            <span className={cn(
              'mt-0.5 flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize',
              typePill[team.team_type] ?? 'bg-white/20 text-white border-white/30',
            )}>
              {team.team_type.replace('_', ' ')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">

          {/* Parent team — read only */}
          {parentTeam && (
            <Field label="Parent Team">
              <Input value={parentTeam.name} readOnly
                className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 h-8 text-sm" />
            </Field>
          )}

          {/* Team name */}
          <Field label="Team Name" hint="required">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering"
              required autoFocus
              className="h-8 text-sm border-slate-200 focus-visible:ring-violet-400"
            />
          </Field>

          {/* Team lead — shows designation + department */}
          <Field label="Team Lead" hint="optional">
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger className="h-auto min-h-8 text-sm border-slate-200 focus:ring-violet-400 py-1.5">
                <SelectValue placeholder="Select a team lead…">
                  {/* Show rich label for the currently selected lead */}
                  {teamLeadId !== NO_LEAD && (() => {
                    const emp = employees.find(e => e.id === teamLeadId);
                    if (!emp) return null;
                    return (
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-slate-800">
                          {emp.first_name} {emp.last_name}
                        </span>
                        {(emp.designation_name || emp.department_name) && (
                          <span className="text-[10px] text-slate-400">
                            {[emp.designation_name, emp.department_name].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {/* Sentinel — Radix throws on value="" */}
                <SelectItem value={NO_LEAD}>
                  <span className="text-slate-400 italic text-sm">No lead assigned</span>
                </SelectItem>

                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id} className="py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-800">
                        {emp.first_name} {emp.last_name}
                      </span>
                      {(emp.designation_name || emp.department_name) && (
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {[emp.designation_name, emp.department_name].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Description */}
          <Field label="Description" hint="optional">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe this team's purpose…"
              rows={3}
              className="text-sm resize-none border-slate-200 focus-visible:ring-violet-400"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm"
              onClick={() => onOpenChange(false)} disabled={loading}
              className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm"
              disabled={!name.trim() || loading}
              className="h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white border-0 shadow-sm px-4">
              {loading
                ? <div className="animate-spin h-3 w-3 rounded-full border-b-2 border-white" />
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamDialog;