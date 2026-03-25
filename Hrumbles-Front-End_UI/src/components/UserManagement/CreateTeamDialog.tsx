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
import { GitBranch, Layers } from "lucide-react";
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

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allTeams: Team[];
  parentTeam?: Team;
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

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open, onOpenChange, onSuccess, allTeams, parentTeam,
}) => {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [teamLeadId, setTeamLeadId]   = useState<string>(NO_LEAD);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [loading, setLoading]         = useState(false);
  const { toast } = useToast();

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) { setName(''); setDescription(''); setTeamLeadId(NO_LEAD); }
  }, [open]);

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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) throw new Error('Auth data missing');

      const level    = parentTeam ? parentTeam.level + 1 : 0;
      const teamType = parentTeam ? 'sub_team' : 'team';

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        parent_team_id: parentTeam?.id ?? null,
        team_type: teamType,
        level,
        organization_id: authData.organization_id,
        team_lead_id: teamLeadId === NO_LEAD ? null : teamLeadId,
        is_active: true,
      };

      const { data: newTeam, error } = await supabase
        .from('hr_teams').insert([payload]).select().single();
      if (error) throw error;

      await supabase.from('hr_team_audit_logs').insert({
        team_id: newTeam.id,
        action_type: 'team_created',
        action_details: { team_data: payload, created_by: authData.userId },
        performed_by: authData.userId,
        organization_id: authData.organization_id,
      });

      toast({ title: 'Team created', description: `"${payload.name}" was created.` });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Failed to create team.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isSubTeam = !!parentTeam;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 border-0 shadow-xl">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              {isSubTeam
                ? <GitBranch className="h-4 w-4 text-white" />
                : <Layers className="h-4 w-4 text-white" />
              }
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold">
                {isSubTeam ? 'Create Sub-Team' : 'Create New Team'}
              </DialogTitle>
              <DialogDescription className="text-violet-200 text-xs mt-0.5">
                {isSubTeam
                  ? `Nested under "${parentTeam!.name}" at level ${parentTeam!.level + 1}`
                  : 'New root-level team in your organisation'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">

          {/* Parent team — read only */}
          {isSubTeam && (
            <Field label="Parent Team">
              <Input value={parentTeam!.name} readOnly
                className="bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200 h-8 text-sm" />
            </Field>
          )}

          {/* Team name */}
          <Field label={isSubTeam ? 'Sub-Team Name' : 'Team Name'} hint="required">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isSubTeam ? 'e.g. Backend Squad' : 'e.g. Engineering'}
              required autoFocus
              className="h-8 text-sm border-slate-200 focus-visible:ring-violet-400"
            />
          </Field>

          {/* Team lead — shows designation + department */}
          <Field label="Team Lead" hint="optional">
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger className="h-auto min-h-8 text-sm border-slate-200 focus:ring-violet-400 py-1.5">
                <SelectValue placeholder="Select a team lead…">
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
                {/* Sentinel — must NOT be "" */}
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
                : isSubTeam ? 'Create Sub-Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;