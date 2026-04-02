import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { MultiSelect } from '@/components/ui/multi-selector';
import { fetchEmployees } from '@/api/user';
import {
  Clock, CalendarDays, CalendarRange, Calendar, Briefcase, RefreshCw,
  TrendingUp, Sparkles,
} from 'lucide-react';

interface EmployeeOption {
  value: string;
  label: string;
}

interface RecruiterReportConfig {
  isActive: boolean;
  recipients: string[];
  sendTime: string;
  sendDay?: string;
  sendToRecruiters?: boolean;
  includeAI?: boolean;    // GPT-4o coaching insights
}

// ── NEW: Sales report config ──
interface SalesReportConfig {
  isActive: boolean;
  recipients: string[];
  sendTime: string;
  sendDay?: string;      // weekly only
  includeAI: boolean;    // whether to call GPT-4o for insights
}

const RECRUITER_REPORT_TYPES = ['daily_recruiter_report', 'weekly_recruiter_report', 'monthly_recruiter_report'];
// ── NEW ──
const SALES_REPORT_TYPES    = ['daily_sales_report', 'weekly_sales_report', 'monthly_sales_report'];

const LEAVE_REPORT_TYPE         = 'leave_request_notify';
const STATUS_UPDATE_REPORT_TYPE = 'status_update';
const JOB_CREATION_REPORT_TYPE  = 'job_creation_notify';
const JOB_UPDATE_REPORT_TYPE    = 'job_update_notify';

const EmailConfigurationManagement = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const [loading, setLoading]         = useState(true);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);

  // EOD
  const [savingEod, setSavingEod]       = useState(false);
  const [eodRecipients, setEodRecipients] = useState<string[]>([]);

  // Recruiter
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [recruiterConfigs, setRecruiterConfigs] = useState<Record<string, RecruiterReportConfig>>({
    daily_recruiter_report:   { isActive: false, recipients: [], sendTime: '19:00', sendToRecruiters: false, includeAI: false },
    weekly_recruiter_report:  { isActive: false, recipients: [], sendTime: '19:00', sendDay: 'Friday', sendToRecruiters: false, includeAI: true },
    monthly_recruiter_report: { isActive: false, recipients: [], sendTime: '19:00', sendToRecruiters: false, includeAI: true },
  });

  // Leave
  const [leaveRecipients, setLeaveRecipients] = useState<string[]>([]);
  const [isLeaveActive, setIsLeaveActive]     = useState(true);
  const [savingLeave, setSavingLeave]         = useState(false);

  // Status Update
  const [statusUpdateRecipients, setStatusUpdateRecipients] = useState<string[]>([]);
  const [isStatusUpdateActive, setIsStatusUpdateActive]     = useState(true);
  const [savingStatusUpdate, setSavingStatusUpdate]         = useState(false);

  // Job
  const [jobCreationRecipients, setJobCreationRecipients] = useState<string[]>([]);
  const [isJobCreationActive, setIsJobCreationActive]     = useState(true);
  const [savingJobCreation, setSavingJobCreation]         = useState(false);
  const [jobUpdateRecipients, setJobUpdateRecipients]     = useState<string[]>([]);
  const [isJobUpdateActive, setIsJobUpdateActive]         = useState(true);
  const [savingJobUpdate, setSavingJobUpdate]             = useState(false);

  // ── NEW: Sales automation state ──
  const [savingSales, setSavingSales] = useState(false);
  const [salesConfigs, setSalesConfigs] = useState<Record<string, SalesReportConfig>>({
    daily_sales_report:   { isActive: false, recipients: [], sendTime: '19:00', includeAI: true },
    weekly_sales_report:  { isActive: false, recipients: [], sendTime: '19:00', sendDay: 'Friday', includeAI: true },
    monthly_sales_report: { isActive: false, recipients: [], sendTime: '19:00', includeAI: true },
  });

  // ── Load all configs ──
  useEffect(() => {
    const loadData = async () => {
      if (!organization_id) return;
      setLoading(true);
      try {
        const employees = await fetchEmployees(organization_id);
        setAllEmployees(employees.map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name} (${e.email})`,
        })));

        const { data: configs, error } = await supabase
          .from('hr_email_configurations')
          .select('*')
          .eq('organization_id', organization_id)
          .in('report_type', [
            LEAVE_REPORT_TYPE, STATUS_UPDATE_REPORT_TYPE,
            JOB_CREATION_REPORT_TYPE, JOB_UPDATE_REPORT_TYPE,
            'eod_report', ...RECRUITER_REPORT_TYPES, ...SALES_REPORT_TYPES,
          ]);

        if (error) throw error;

        const newRecruiterConfigs = { ...recruiterConfigs };
        const newSalesConfigs     = { ...salesConfigs };

        configs?.forEach((conf) => {
          if (conf.report_type === 'eod_report') {
            setEodRecipients(conf.recipients || []);
          } else if (conf.report_type === LEAVE_REPORT_TYPE) {
            setLeaveRecipients(conf.recipients || []); setIsLeaveActive(conf.is_active);
          } else if (conf.report_type === STATUS_UPDATE_REPORT_TYPE) {
            setStatusUpdateRecipients(conf.recipients || []); setIsStatusUpdateActive(conf.is_active);
          } else if (conf.report_type === JOB_CREATION_REPORT_TYPE) {
            setJobCreationRecipients(conf.recipients || []); setIsJobCreationActive(conf.is_active);
          } else if (conf.report_type === JOB_UPDATE_REPORT_TYPE) {
            setJobUpdateRecipients(conf.recipients || []); setIsJobUpdateActive(conf.is_active);
          } else if (newRecruiterConfigs[conf.report_type]) {
            newRecruiterConfigs[conf.report_type] = {
              isActive: conf.is_active,
              recipients: conf.recipients || [],
              sendTime: conf.config?.sendTime || '19:00',
              sendDay: conf.config?.sendDay || 'Friday',
              sendToRecruiters: conf.config?.sendToRecruiters || false,
            };
          } else if (newSalesConfigs[conf.report_type]) {
            // ── Load saved sales config ──
            newSalesConfigs[conf.report_type] = {
              isActive:   conf.is_active,
              recipients: conf.recipients || [],
              sendTime:   conf.config?.sendTime  || '19:00',
              sendDay:    conf.config?.sendDay   || 'Friday',
              includeAI:  conf.config?.includeAI ?? true,
            };
          }
        });

        setRecruiterConfigs(newRecruiterConfigs);
        setSalesConfigs(newSalesConfigs);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load configs.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [organization_id, toast]);

  // ── Generic save helper ──
  const handleSaveConfig = async (
    type: string, recipients: string[], isActive: boolean,
    setSaving: (v: boolean) => void, extraConfig?: Record<string, any>
  ) => {
    if (!organization_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('hr_email_configurations').upsert({
        organization_id, report_type: type, recipients, is_active: isActive,
        ...(extraConfig ? { config: extraConfig } : {}),
      }, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: 'Success', description: 'Settings saved successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Recruiter helpers ──
  const updateRecruiterConfig = (type: string, field: keyof RecruiterReportConfig, value: any) => {
    setRecruiterConfigs(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const handleSaveRecruiterReports = async () => {
    if (!organization_id) return;
    setSavingRecruiter(true);
    try {
      const updates = Object.keys(recruiterConfigs).map(type => {
        const conf = recruiterConfigs[type];
        return {
          organization_id, report_type: type, recipients: conf.recipients,
          is_active: conf.isActive,
          config: { sendTime: conf.sendTime, sendDay: conf.sendDay, sendToRecruiters: conf.sendToRecruiters, includeAI: conf.includeAI },
        };
      });
      const { error } = await supabase.from('hr_email_configurations')
        .upsert(updates, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: 'Success', description: 'Automated report settings saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save recruiter settings.', variant: 'destructive' });
    } finally {
      setSavingRecruiter(false);
    }
  };

  // ── NEW: Sales helpers ──
  const updateSalesConfig = (type: string, field: keyof SalesReportConfig, value: any) => {
    setSalesConfigs(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const handleSaveSalesReports = async () => {
    if (!organization_id) return;
    setSavingSales(true);
    try {
      const updates = Object.keys(salesConfigs).map(type => {
        const conf = salesConfigs[type];
        return {
          organization_id, report_type: type, recipients: conf.recipients,
          is_active: conf.isActive,
          config: { sendTime: conf.sendTime, sendDay: conf.sendDay, includeAI: conf.includeAI },
        };
      });
      const { error } = await supabase.from('hr_email_configurations')
        .upsert(updates, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: 'Success', description: 'Sales automation settings saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save sales settings.', variant: 'destructive' });
    } finally {
      setSavingSales(false);
    }
  };

  // ── Recruiter tab renderer ──
  const renderRecruiterConfigTab = (type: string, showDayPicker = false) => {
    const config = recruiterConfigs[type];
    return (
      <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Automatic Sending</Label>
            <p className="text-sm text-muted-foreground">Reports sent automatically at the configured time.</p>
          </div>
          <Switch checked={config.isActive} onCheckedChange={val => updateRecruiterConfig(type, 'isActive', val)} />
        </div>
        {config.isActive && (
          <div className="grid gap-6 border-l-2 border-indigo-100 pl-4 ml-2">
            <div className="flex gap-6 flex-wrap">
              <div className="w-40">
                <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Time (IST)</Label>
                <Input type="time" value={config.sendTime}
                  onChange={e => updateRecruiterConfig(type, 'sendTime', e.target.value)} className="w-full bg-white" />
              </div>
              {showDayPicker && (
                <div className="w-40">
                  <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Day</Label>
                  <Select value={config.sendDay} onValueChange={val => updateRecruiterConfig(type, 'sendDay', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d =>
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-base">Select Recipients</Label>
              <MultiSelect options={allEmployees} selected={config.recipients}
                onChange={val => updateRecruiterConfig(type, 'recipients', val)}
                placeholder="Select employees to receive this report..." className="w-full" />
              <p className="text-xs text-muted-foreground">
                {showDayPicker ? `Every ${config.sendDay}` : 'Every day'} at {config.sendTime}.
              </p>
            </div>
            <div className="flex items-center space-x-2 border p-3 rounded-md bg-white">
              <Switch id={`recruiter-copy-${type}`} checked={config.sendToRecruiters || false}
                onCheckedChange={val => updateRecruiterConfig(type, 'sendToRecruiters', val)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={`recruiter-copy-${type}`} className="text-sm font-medium">Send individual copies to Recruiters</Label>
                <p className="text-xs text-muted-foreground">Each recruiter receives a personalised email with only their candidates.</p>
              </div>
            </div>

            {/* AI Insights toggle */}
            <div className="flex items-center space-x-3 border border-purple-100 p-4 rounded-lg bg-gradient-to-r from-purple-50/40 to-pink-50/40">
              <Switch id={`ai-recruiter-${type}`} checked={config.includeAI || false}
                onCheckedChange={val => updateRecruiterConfig(type, 'includeAI', val)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={`ai-recruiter-${type}`} className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Include AI Insights (GPT-4o)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically analyse recruiter activity and add performance coaching notes to the report.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── NEW: Sales tab renderer ──
  const renderSalesConfigTab = (type: string, showDayPicker = false, footerNote?: string) => {
    const config = salesConfigs[type];
    return (
      <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50/40">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Automatic Sending</Label>
            <p className="text-sm text-muted-foreground">Reports sent automatically at the configured time.</p>
          </div>
          <Switch checked={config.isActive} onCheckedChange={val => updateSalesConfig(type, 'isActive', val)} />
        </div>

        {config.isActive && (
          <div className="grid gap-6 border-l-2 border-purple-100 pl-4 ml-2">

            {/* Time + Day */}
            <div className="flex gap-6 flex-wrap">
              <div className="w-40">
                <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Time (IST)</Label>
                <Input type="time" value={config.sendTime}
                  onChange={e => updateSalesConfig(type, 'sendTime', e.target.value)} className="w-full bg-white" />
              </div>
              {showDayPicker && (
                <div className="w-40">
                  <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Day</Label>
                  <Select value={config.sendDay} onValueChange={val => updateSalesConfig(type, 'sendDay', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d =>
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label className="text-base">Select Recipients</Label>
              <MultiSelect options={allEmployees} selected={config.recipients}
                onChange={val => updateSalesConfig(type, 'recipients', val)}
                placeholder="Select employees to receive this report..." className="w-full" />
              <p className="text-xs text-muted-foreground">
                {footerNote || (showDayPicker ? `Every ${config.sendDay}` : 'Last day of every month')} at {config.sendTime} IST.
              </p>
            </div>

            {/* AI Insights toggle */}
            <div className="flex items-center space-x-3 border border-purple-100 p-4 rounded-lg bg-gradient-to-r from-purple-50/40 to-pink-50/40">
              <Switch id={`ai-${type}`} checked={config.includeAI}
                onCheckedChange={val => updateSalesConfig(type, 'includeAI', val)} />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={`ai-${type}`} className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Include AI Insights (GPT-4o)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically analyse the period's sales data and add highlights, concerns, a recommendation, and a performance rating to the report.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading configurations...</div>;

  return (
    <div className="space-y-8 pb-10">

      {/* EOD REPORT */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader><CardTitle>End of Day (EOD) Report</CardTitle></CardHeader>
          <CardContent>
            <MultiSelect options={allEmployees} selected={eodRecipients} onChange={setEodRecipients}
              placeholder="Select employees..." className="w-full" />
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleSaveConfig('eod_report', eodRecipients, true, setSavingEod)} disabled={savingEod}>
              Save EOD
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* JOB ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600"/> Job Creation Alerts</CardTitle>
                <CardDescription>Notify these users when a new Job is posted.</CardDescription>
              </div>
              <Switch checked={isJobCreationActive} onCheckedChange={setIsJobCreationActive} />
            </div>
          </CardHeader>
          {isJobCreationActive && (
            <CardContent className="animate-in fade-in slide-in-from-top-2">
              <MultiSelect options={allEmployees} selected={jobCreationRecipients} onChange={setJobCreationRecipients}
                placeholder="Select HR/Admin employees..." className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">Creator auto-receives a copy. Configured users also receive it (with budget details).</p>
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(JOB_CREATION_REPORT_TYPE, jobCreationRecipients, isJobCreationActive, setSavingJobCreation)} disabled={savingJobCreation}>
              {savingJobCreation ? 'Saving...' : 'Save Config'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-indigo-600"/> Job Update & Assignments</CardTitle>
                <CardDescription>Notify users when a Job is updated or users are assigned.</CardDescription>
              </div>
              <Switch checked={isJobUpdateActive} onCheckedChange={setIsJobUpdateActive} />
            </div>
          </CardHeader>
          {isJobUpdateActive && (
            <CardContent className="animate-in fade-in slide-in-from-top-2">
              <MultiSelect options={allEmployees} selected={jobUpdateRecipients} onChange={setJobUpdateRecipients}
                placeholder="Select HR/Admin employees..." className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">Assigned Recruiters receive notification <b>without</b> budget details.</p>
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(JOB_UPDATE_REPORT_TYPE, jobUpdateRecipients, isJobUpdateActive, setSavingJobUpdate)} disabled={savingJobUpdate}>
              {savingJobUpdate ? 'Saving...' : 'Save Config'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* CANDIDATE STATUS & LEAVE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidate Status Updates</CardTitle>
                <CardDescription>Notify default recipients on candidate status change.</CardDescription>
              </div>
              <Switch checked={isStatusUpdateActive} onCheckedChange={setIsStatusUpdateActive} />
            </div>
          </CardHeader>
          {isStatusUpdateActive && (
            <CardContent>
              <MultiSelect options={allEmployees} selected={statusUpdateRecipients} onChange={setStatusUpdateRecipients}
                placeholder="Select employees..." className="w-full" />
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(STATUS_UPDATE_REPORT_TYPE, statusUpdateRecipients, isStatusUpdateActive, setSavingStatusUpdate)} disabled={savingStatusUpdate}>Save</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Leave Request Notifications</CardTitle>
                <CardDescription>HR recipients auto-added to leave requests.</CardDescription>
              </div>
              <Switch checked={isLeaveActive} onCheckedChange={setIsLeaveActive} />
            </div>
          </CardHeader>
          {isLeaveActive && (
            <CardContent>
              <MultiSelect options={allEmployees} selected={leaveRecipients} onChange={setLeaveRecipients}
                placeholder="Select HR/Admin employees..." className="w-full" />
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(LEAVE_REPORT_TYPE, leaveRecipients, isLeaveActive, setSavingLeave)} disabled={savingLeave}>Save</Button>
          </CardFooter>
        </Card>
      </div>

      {/* ── NEW: SALES AUTOMATION ── */}
      <Card className="border-purple-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-purple-950">Automated Sales Reports</CardTitle>
          </div>
          <CardDescription>
            Schedule consolidated sales activity reports with optional GPT-4o insights.
            The daily EOD is already sent per-employee on timesheet submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" /> Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Monthly
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <div className="mb-3 text-sm text-purple-700 bg-purple-50 border border-purple-100 p-3 rounded-md flex items-center gap-2">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                A consolidated team sales activity report sent every day at the configured time.
              </div>
              {renderSalesConfigTab('daily_sales_report')}
            </TabsContent>

            <TabsContent value="weekly">
              <div className="mb-3 text-sm text-purple-700 bg-purple-50 border border-purple-100 p-3 rounded-md flex items-center gap-2">
                <CalendarRange className="w-4 h-4 flex-shrink-0" />
                Covers the full week (Monday–Sunday) up to the configured send day and time.
              </div>
              {renderSalesConfigTab('weekly_sales_report', true)}
            </TabsContent>

            <TabsContent value="monthly">
              <div className="mb-3 text-sm text-purple-700 bg-purple-50 border border-purple-100 p-3 rounded-md flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                Monthly reports are automatically triggered on the <strong>last day</strong> of every month.
              </div>
              {renderSalesConfigTab('monthly_sales_report', false, 'Last day of every month')}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t">
          <Button onClick={handleSaveSalesReports} disabled={savingSales}
            className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            {savingSales ? 'Saving...' : 'Save Sales Automation Settings'}
          </Button>
        </CardFooter>
      </Card>

      {/* RECRUITER AUTOMATION */}
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-indigo-950">Automated Recruiter Reports</CardTitle>
          </div>
          <CardDescription>Schedule consolidated candidate activity reports.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" /> Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Monthly
              </TabsTrigger>
            </TabsList>
            <TabsContent value="daily">{renderRecruiterConfigTab('daily_recruiter_report')}</TabsContent>
            <TabsContent value="weekly">{renderRecruiterConfigTab('weekly_recruiter_report', true)}</TabsContent>
            <TabsContent value="monthly">
              <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-md flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Monthly reports trigger on the <strong>Last Day</strong> of every month.
              </div>
              {renderRecruiterConfigTab('monthly_recruiter_report')}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t">
          <Button onClick={handleSaveRecruiterReports} disabled={savingRecruiter}
            className="ml-auto bg-indigo-600 hover:bg-indigo-700">
            {savingRecruiter ? 'Saving...' : 'Save Automation Settings'}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
};

export default EmailConfigurationManagement;