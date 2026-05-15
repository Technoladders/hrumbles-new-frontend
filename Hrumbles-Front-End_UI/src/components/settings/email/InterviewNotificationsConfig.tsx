// src/components/settings/email/InterviewNotificationsConfig.tsx
// Self-contained — loads & saves its own config.
// Prefills from DB. Master toggle enables/disables the whole feature.
// Saves: is_active (top-level) + config JSONB + recipients UUID[]

import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '@/components/ui/card';
import { Button }  from '@/components/ui/button';
import { Switch }  from '@/components/ui/switch';
import { Input }   from '@/components/ui/input';
import { Badge }   from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  Video, Bell, UserCheck, Users, BellRing,
  Clock, Check, Search, X, Info, Monitor, Plus, Loader2,
} from 'lucide-react';

// ── Config shape stored in hr_email_configurations.config ────────────────────

interface NotifConfig {
  // Master reminder toggle (maps to is_active on the row too)
  send_reminder:           boolean;
  reminder_before_minutes: number[];   // [5, 10, 15, 30, 60]
  reminder_channels:       string[];   // ['email', 'in_app']
  snooze_options_minutes:  number[];
  notify_roles: {
    interviewer:      boolean;
    recruiter:        boolean;
    candidate_owner:  boolean;  // who added the candidate — hr_job_candidates.created_by
    candidate:        boolean;
  };
  notify_additional_users: string[];   // hr_employees.id UUIDs (also synced to recipients[])
  send_reschedule_alert:   boolean;
  send_cancellation_alert: boolean;
  send_confirmation:       boolean;
}

// Sensible defaults — only used when no row exists yet in DB
const DEFAULT_CONFIG: NotifConfig = {
  send_reminder:           false,      // OFF by default until explicitly enabled
  reminder_before_minutes: [15],
  reminder_channels:       ['email', 'in_app'],
  snooze_options_minutes:  [5, 10, 15],
  notify_roles:            { interviewer: false, recruiter: true, candidate_owner: true, candidate: false },
  notify_additional_users: [],
  send_reschedule_alert:   true,
  send_cancellation_alert: true,
  send_confirmation:       true,
};

const REPORT_TYPE    = 'interview_notifications';
const PRESET_MINS    = [5, 10, 15, 30, 60];
const SNOOZE_PRESETS = [5, 10, 15, 20, 30];

// ── Minute chip picker ────────────────────────────────────────────────────────

function MinuteChips({
  label, selected, presets = PRESET_MINS, onChange,
}: {
  label:    string;
  selected: number[];
  presets?: number[];
  onChange: (v: number[]) => void;
}) {
  const [custom, setCustom] = useState('');

  const toggle = (v: number) =>
    onChange(
      selected.includes(v)
        ? selected.filter(x => x !== v)
        : [...selected, v].sort((a, b) => a - b)
    );

  const addCustom = () => {
    const v = parseInt(custom, 10);
    if (!isNaN(v) && v > 0 && v <= 1440 && !selected.includes(v))
      onChange([...selected, v].sort((a, b) => a - b));
    setCustom('');
  };

  const allChips = [...new Set([...presets, ...selected])].sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2 items-center">
        {allChips.map(v => {
          const active = selected.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all select-none ${
                active
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600'
              }`}
            >
              {v >= 60 ? `${v / 60}h` : `${v}m`}
              {active && <span className="ml-1 opacity-80">✓</span>}
            </button>
          );
        })}
        {/* Custom input */}
        <div className="flex items-center gap-1">
          <Input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="min"
            type="number"
            min={1}
            max={1440}
            className="w-14 h-7 text-xs text-center rounded-full px-2"
          />
          <button
            type="button"
            onClick={addCustom}
            className="h-7 w-7 rounded-full border border-violet-300 text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee search/pick ──────────────────────────────────────────────────────

interface Employee {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
  role_name:  string;
}

function UserPicker({
  selected, onChange, organizationId,
}: {
  selected:       string[];
  onChange:       (ids: string[]) => void;
  organizationId: string;
}) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<Employee[]>([]);
  const [searching, setSearching]   = useState(false);
  const [showDrop, setShowDrop]     = useState(false);
  const [displayEmps, setDisplayEmps] = useState<Employee[]>([]);

  // Load display info for existing selected IDs
  useEffect(() => {
    if (!selected.length || !organizationId) { setDisplayEmps([]); return; }
    supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email, hr_roles!inner(name)')
      .eq('organization_id', organizationId)
      .in('id', selected)
      .then(({ data }) => {
        setDisplayEmps((data || []).map((e: any) => ({
          id: e.id, first_name: e.first_name, last_name: e.last_name,
          email: e.email, role_name: e.hr_roles?.name || '',
        })));
      });
  }, [organizationId, selected.join(',')]); // re-run if selected list changes

  // Search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || !organizationId) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, hr_roles!inner(name)')
        .eq('organization_id', organizationId)   // ✅ scoped to this org
        .eq('status', 'active')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      setResults((data || []).map((e: any) => ({
        id: e.id, first_name: e.first_name, last_name: e.last_name,
        email: e.email, role_name: e.hr_roles?.name || '',
      })));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, organizationId]);

  const add = (emp: Employee) => {
    if (!selected.includes(emp.id)) {
      onChange([...selected, emp.id]);
      setDisplayEmps(prev => [...prev, emp]);
    }
    setQuery(''); setResults([]); setShowDrop(false);
  };

  const remove = (id: string) => {
    onChange(selected.filter(x => x !== id));
    setDisplayEmps(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Tags */}
      {displayEmps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayEmps.map(e => (
            <span key={e.id}
              className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-800 border border-violet-200 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {e.first_name?.[0]}{e.last_name?.[0]}
              </span>
              {e.first_name} {e.last_name}
              <span className="text-[9px] text-violet-400">({e.role_name})</span>
              <button onClick={() => remove(e.id)}
                className="text-violet-400 hover:text-red-500 transition-colors ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 200)}
            placeholder="Search employees in this organisation…"
            className="pl-9 h-9 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-violet-400 animate-spin" />
          )}
        </div>

        {/* Dropdown results */}
        {showDrop && results.length > 0 && (
          <div className="absolute top-10 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {results.map(emp => {
              const already = selected.includes(emp.id);
              return (
                <div key={emp.id}
                  onMouseDown={() => !already && add(emp)}
                  className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                    already ? 'bg-violet-50 cursor-default' : 'hover:bg-violet-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {emp.role_name}
                    </span>
                    {already && <Check className="h-3.5 w-3.5 text-violet-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showDrop && query.length >= 2 && !searching && results.length === 0 && (
          <div className="absolute top-10 left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">No active employees found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InterviewNotificationsConfig() {
  const { toast }      = useToast();
  const organizationId = useSelector((s: any) => s.auth?.organization_id);

  const [config, setConfig]     = useState<NotifConfig>(DEFAULT_CONFIG);
  const [isActive, setIsActive] = useState(false);   // top-level feature toggle
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // ── Load from DB — prefill everything ───────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('hr_email_configurations')
      .select('id, config, is_active, recipients')
      .eq('organization_id', organizationId)
      .eq('report_type', REPORT_TYPE)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Load config error:', error);
        if (data) {
          setConfigId(data.id);

          const saved = data.config || {};

          // ── isActive: row-level is_active is the source of truth ──────────
          // send_reminder inside config must always match is_active.
          // Use is_active as the master — ignore config.send_reminder.
          const active = data.is_active ?? false;
          setIsActive(active);

          setConfig({
            send_reminder:           active, // ← always synced to is_active
            reminder_before_minutes: Array.isArray(saved.reminder_before_minutes) && saved.reminder_before_minutes.length
                                       ? saved.reminder_before_minutes
                                       : DEFAULT_CONFIG.reminder_before_minutes,
            reminder_channels:       Array.isArray(saved.reminder_channels) && saved.reminder_channels.length
                                       ? saved.reminder_channels
                                       : DEFAULT_CONFIG.reminder_channels,
            snooze_options_minutes:  Array.isArray(saved.snooze_options_minutes) && saved.snooze_options_minutes.length
                                       ? saved.snooze_options_minutes
                                       : DEFAULT_CONFIG.snooze_options_minutes,
            notify_roles: {
              interviewer:     saved.notify_roles?.interviewer     ?? DEFAULT_CONFIG.notify_roles.interviewer,
              recruiter:       saved.notify_roles?.recruiter       ?? DEFAULT_CONFIG.notify_roles.recruiter,
              candidate_owner: saved.notify_roles?.candidate_owner ?? DEFAULT_CONFIG.notify_roles.candidate_owner,
              candidate:       saved.notify_roles?.candidate       ?? DEFAULT_CONFIG.notify_roles.candidate,
            },
            notify_additional_users: Array.isArray(saved.notify_additional_users)
                                       ? saved.notify_additional_users
                                       : (Array.isArray(data.recipients) ? data.recipients : []),
            send_reschedule_alert:   saved.send_reschedule_alert   ?? DEFAULT_CONFIG.send_reschedule_alert,
            send_cancellation_alert: saved.send_cancellation_alert ?? DEFAULT_CONFIG.send_cancellation_alert,
            send_confirmation:       saved.send_confirmation       ?? DEFAULT_CONFIG.send_confirmation,
          });
        }
        setLoading(false);
      });
  }, [organizationId]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      // send_reminder inside config MUST match is_active — scheduler reads config.send_reminder
      const configToSave = { ...config, send_reminder: isActive };

      const upsertPayload = {
        organization_id: organizationId,
        report_type:     REPORT_TYPE,
        is_active:       isActive,
        recipients:      config.notify_additional_users,
        config:          configToSave,
      };

      if (configId) {
        const { error } = await supabase
          .from('hr_email_configurations')
          .update({
            is_active:  upsertPayload.is_active,
            recipients: upsertPayload.recipients,
            config:     upsertPayload.config,
          })
          .eq('id', configId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('hr_email_configurations')
          .insert(upsertPayload)
          .select('id')
          .single();
        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      toast({ title: 'Saved', description: 'Interview notification settings updated.' });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'Error', description: err?.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (patch: Partial<NotifConfig>) =>
    setConfig(prev => ({ ...prev, ...patch }));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-violet-100">
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          Loading interview notification settings…
        </CardContent>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="border-violet-100 shadow-sm">

      {/* ── Header with master on/off toggle ──────────────────────────── */}
      <CardHeader className="bg-gradient-to-r from-violet-50/60 to-purple-50/60 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-violet-100' : 'bg-gray-100'}`}>
              <Video className={`h-5 w-5 ${isActive ? 'text-violet-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <CardTitle className="text-violet-950">Interview Notifications</CardTitle>
              <CardDescription className="mt-0.5">
                Email + in-app alerts for reminders, confirmations, reschedules &amp; cancellations.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${isActive ? 'text-violet-600' : 'text-gray-400'}`}>
              {isActive ? 'Active' : 'Disabled'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => {
                setIsActive(v);
                update({ send_reminder: v }); // keep config.send_reminder in sync
              }}
            />
          </div>
        </div>
      </CardHeader>

      {/* ── Settings — only shown when active ─────────────────────────── */}
      {isActive && (
        <CardContent className="pt-6 space-y-7 animate-in fade-in slide-in-from-top-2 duration-300">

          {/* ── Section 1: Reminder timing ─────────────────────────────── */}
          <div className="space-y-4 border-l-2 border-violet-100 pl-4 ml-1">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-600" />
              Reminder Timing
            </h3>
            <MinuteChips
              label="Remind before interview (choose one or more)"
              selected={config.reminder_before_minutes}
              onChange={v => update({ reminder_before_minutes: v.length ? v : [15] })}
            />
            <MinuteChips
              label="Snooze options for in-app alert"
              selected={config.snooze_options_minutes}
              presets={SNOOZE_PRESETS}
              onChange={v => update({ snooze_options_minutes: v.length ? v : [5, 10, 15] })}
            />
          </div>

          {/* ── Section 2: Channels ────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-violet-600" />
              Notification Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'email',  Icon: Bell,    label: 'Email',          desc: 'Send email to all recipients' },
                { key: 'in_app', Icon: Monitor, label: 'In-App Overlay', desc: 'Pop-up visible on any page' },
              ].map(({ key, Icon, label, desc }) => {
                const active = config.reminder_channels.includes(key);
                return (
                  <div key={key}
                    onClick={() => {
                      const ch = active
                        ? config.reminder_channels.filter(c => c !== key)
                        : [...config.reminder_channels, key];
                      update({ reminder_channels: ch });
                    }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                      active ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${active ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${active ? 'text-violet-800' : 'text-gray-600'}`}>{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch checked={active} onCheckedChange={() => {}}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 3: Who gets notified ──────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                Who Gets Notified
              </h3>
              <span title="Selected roles receive both email and in-app reminders for interviews they are part of.">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'recruiter',        Icon: Bell,      label: 'Interview Creator',   desc: 'Who scheduled the interview' },
                { key: 'candidate_owner',  Icon: UserCheck, label: 'Candidate Owner',     desc: 'Who added the candidate ★ (recommended)' },
                { key: 'interviewer',      Icon: UserCheck, label: 'Interviewer',          desc: 'Assigned to conduct interview' },
                { key: 'candidate',        Icon: BellRing,  label: 'Candidate',            desc: 'Email only — no in-app' },
              ].map(({ key, Icon, label, desc }) => {
                const active = config.notify_roles[key as keyof typeof config.notify_roles] ?? (key === 'candidate_owner');
                return (
                  <div key={key}
                    onClick={() => update({ notify_roles: { ...config.notify_roles, [key]: !active } })}
                    className={`flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                      active ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-md flex-shrink-0 ${active ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${active ? 'text-violet-800' : 'text-gray-600'}`}>{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{desc}</p>
                      </div>
                    </div>
                    <Switch checked={active} onCheckedChange={() => {}}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 4: Additional recipients ──────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-gray-700">Additional Recipients</h3>
                <span title="These employees receive all interview notifications regardless of their role in the interview.">
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </span>
              </div>
              {config.notify_additional_users.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {config.notify_additional_users.length} selected
                </span>
              )}
            </div>
            <UserPicker
              selected={config.notify_additional_users}
              onChange={ids => update({ notify_additional_users: ids })}
              organizationId={organizationId}
            />
          </div>

          {/* ── Section 5: Event alerts ────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-600" />
              Event Alerts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'send_confirmation',       emoji: '✅', label: 'Confirmation', desc: 'When interview is scheduled' },
                { key: 'send_reschedule_alert',   emoji: '🔄', label: 'Reschedule',   desc: 'When time/date changes' },
                { key: 'send_cancellation_alert', emoji: '❌', label: 'Cancellation', desc: 'When interview is cancelled' },
              ].map(({ key, emoji, label, desc }) => {
                const active = config[key as keyof NotifConfig] as boolean;
                return (
                  <div key={key}
                    onClick={() => update({ [key]: !active } as any)}
                    className={`flex items-start justify-between gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                      active ? 'border-violet-200 bg-violet-50/60' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5 flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <Switch checked={active} onCheckedChange={() => {}}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Summary line ──────────────────────────────────────────── */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-gray-50 border rounded-lg px-3 py-2.5">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Reminders fire at{' '}
              <strong>{config.reminder_before_minutes.map(m => m >= 60 ? `${m / 60}h` : `${m}min`).join(', ')}</strong>
              {' '}before interview via{' '}
              <strong>{config.reminder_channels.join(' + ')}</strong>.
              Cron runs every 5 minutes (±2.5 min precision).
            </span>
          </div>

        </CardContent>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <CardFooter className="bg-slate-50/50 border-t">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          {saving
            ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Saving…</>
            : 'Save Interview Settings'
          }
        </Button>
      </CardFooter>
    </Card>
  );
}

export default InterviewNotificationsConfig;