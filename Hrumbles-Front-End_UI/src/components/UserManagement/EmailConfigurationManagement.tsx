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
import { Clock, CalendarDays, CalendarRange, Calendar, Briefcase, RefreshCw } from 'lucide-react';

interface EmployeeOption {
  value: string;
  label: string;
}

// Interface for the Recruiter Report Configs
interface RecruiterReportConfig {
  isActive: boolean;
  recipients: string[];
  sendTime: string;
  sendDay?: string;
  sendToRecruiters?: boolean;
}

const RECRUITER_REPORT_TYPES = ['daily_recruiter_report', 'weekly_recruiter_report', 'monthly_recruiter_report'];
const LEAVE_REPORT_TYPE = 'leave_request_notify';
const STATUS_UPDATE_REPORT_TYPE = 'status_update'; // NEW CONSTANT
const JOB_CREATION_REPORT_TYPE = 'job_creation_notify';
const JOB_UPDATE_REPORT_TYPE = 'job_update_notify';

const EmailConfigurationManagement = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const [loading, setLoading] = useState(true);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);

  // --- EXISTING STATE (EOD Report) ---
  const [savingEod, setSavingEod] = useState(false);
  const [eodRecipients, setEodRecipients] = useState<string[]>([]);

  // --- NEW STATE (Recruiter Reports) ---
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [recruiterConfigs, setRecruiterConfigs] = useState<Record<string, RecruiterReportConfig>>({
      daily_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00", sendToRecruiters: false },
      weekly_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00", sendDay: "Friday", sendToRecruiters: false },
      monthly_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00", sendToRecruiters: false },
  });

  // --- STATE (Leave Notifications) ---
  const [leaveRecipients, setLeaveRecipients] = useState<string[]>([]);
  const [isLeaveActive, setIsLeaveActive] = useState(true);
  const [savingLeave, setSavingLeave] = useState(false);

  // --- NEW STATE (Status Update Notifications) ---
  const [statusUpdateRecipients, setStatusUpdateRecipients] = useState<string[]>([]);
  const [isStatusUpdateActive, setIsStatusUpdateActive] = useState(true);
  const [savingStatusUpdate, setSavingStatusUpdate] = useState(false);

  // job creation and update notifications

  const [jobCreationRecipients, setJobCreationRecipients] = useState<string[]>([]);
  const [isJobCreationActive, setIsJobCreationActive] = useState(true);
  const [savingJobCreation, setSavingJobCreation] = useState(false);

  const [jobUpdateRecipients, setJobUpdateRecipients] = useState<string[]>([]);
  const [isJobUpdateActive, setIsJobUpdateActive] = useState(true);
  const [savingJobUpdate, setSavingJobUpdate] = useState(false);

 useEffect(() => {
    const loadData = async () => {
      if (!organization_id) return;
      setLoading(true);
      try {
        const employees = await fetchEmployees(organization_id);
        setAllEmployees(employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.email})` })));

        const { data: configs, error } = await supabase
          .from('hr_email_configurations')
          .select('*')
          .eq('organization_id', organization_id)
          .in('report_type', [LEAVE_REPORT_TYPE, STATUS_UPDATE_REPORT_TYPE, JOB_CREATION_REPORT_TYPE, JOB_UPDATE_REPORT_TYPE, 'eod_report', ...RECRUITER_REPORT_TYPES]);
        
        if (error) throw error;

        const newRecruiterConfigs = { ...recruiterConfigs };

        configs?.forEach((conf) => {
          if (conf.report_type === 'eod_report') setEodRecipients(conf.recipients || []);
          else if (conf.report_type === LEAVE_REPORT_TYPE) { setLeaveRecipients(conf.recipients || []); setIsLeaveActive(conf.is_active); }
          else if (conf.report_type === STATUS_UPDATE_REPORT_TYPE) { setStatusUpdateRecipients(conf.recipients || []); setIsStatusUpdateActive(conf.is_active); }
          else if (conf.report_type === JOB_CREATION_REPORT_TYPE) { setJobCreationRecipients(conf.recipients || []); setIsJobCreationActive(conf.is_active); }
          else if (conf.report_type === JOB_UPDATE_REPORT_TYPE) { setJobUpdateRecipients(conf.recipients || []); setIsJobUpdateActive(conf.is_active); }
          else if (newRecruiterConfigs[conf.report_type]) {
            newRecruiterConfigs[conf.report_type] = {
              isActive: conf.is_active, recipients: conf.recipients || [], sendTime: conf.config?.sendTime || "19:00", sendDay: conf.config?.sendDay || "Friday", sendToRecruiters: conf.config?.sendToRecruiters || false
            };
          }
        });
        setRecruiterConfigs(newRecruiterConfigs);
      } catch (error) { toast({ title: "Error", description: "Failed to load configs.", variant: "destructive" }); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [organization_id, toast]);


  // --- EXISTING HANDLER (EOD Report) ---
  const handleSaveEOD = async () => {
    if (!organization_id) return;
    setSavingEod(true);
    try {
      const { error } = await supabase
        .from('hr_email_configurations')
        .upsert({
          organization_id: organization_id,
          report_type: 'eod_report',
          recipients: eodRecipients,
        }, { onConflict: 'organization_id,report_type' });

      if (error) throw error;

      toast({ title: "Success", description: "EOD Report recipients updated." });
    } catch (error) {
      console.error("Error saving EOD:", error);
      toast({ title: "Error", description: "Failed to save EOD settings.", variant: "destructive" });
    } finally {
      setSavingEod(false);
    }
  };

  // --- RECRUITER REPORTS HANDLERS ---
  const updateRecruiterConfig = (type: string, field: keyof RecruiterReportConfig, value: any) => {
    setRecruiterConfigs(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleSaveRecruiterReports = async () => {
    if (!organization_id) return;
    setSavingRecruiter(true);
    try {
      const updates = Object.keys(recruiterConfigs).map(type => {
        const conf = recruiterConfigs[type];
        return {
          organization_id,
          report_type: type,
          recipients: conf.recipients,
          is_active: conf.isActive,
          config: {
            sendTime: conf.sendTime,
            sendDay: conf.sendDay,
            sendToRecruiters: conf.sendToRecruiters
          }
        };
      });

      const { error } = await supabase
        .from('hr_email_configurations')
        .upsert(updates, { onConflict: 'organization_id,report_type' });

      if (error) throw error;

      toast({ title: "Success", description: "Automated report settings saved." });
    } catch (error) {
      console.error("Error saving recruiter reports:", error);
      toast({ title: "Error", description: "Failed to save recruiter settings.", variant: "destructive" });
    } finally {
      setSavingRecruiter(false);
    }
  };

  // --- LEAVE NOTIFICATIONS HANDLER ---
  const handleSaveLeaveNotify = async () => {
    if (!organization_id) return;
    setSavingLeave(true);
    try {
      const { error } = await supabase
        .from('hr_email_configurations')
        .upsert({
          organization_id,
          report_type: 'leave_request_notify',
          recipients: leaveRecipients,
          is_active: isLeaveActive
        }, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: "Success", description: "Leave notification settings saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSavingLeave(false);
    }
  };

  // --- NEW: STATUS UPDATE NOTIFICATIONS HANDLER ---
  const handleSaveStatusUpdateNotify = async () => {
    if (!organization_id) return;
    setSavingStatusUpdate(true);
    try {
      const { error } = await supabase
        .from('hr_email_configurations')
        .upsert({
          organization_id,
          report_type: 'status_update',
          recipients: statusUpdateRecipients,
          is_active: isStatusUpdateActive
        }, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: "Success", description: "Status update notification settings saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSavingStatusUpdate(false);
    }
  };

  // Save Handlers
  const handleSaveConfig = async (type: string, recipients: string[], isActive: boolean, setSaving: (val: boolean) => void) => {
    if (!organization_id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('hr_email_configurations').upsert({
        organization_id, report_type: type, recipients, is_active: isActive
      }, { onConflict: 'organization_id,report_type' });
      if (error) throw error;
      toast({ title: "Success", description: "Settings saved successfully." });
    } catch (error) { toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" }); } 
    finally { setSaving(false); }
  };



  // Helper to render the configuration UI for Daily/Weekly/Monthly
  const renderRecruiterConfigTab = (type: string, showDayPicker: boolean = false) => {
    const config = recruiterConfigs[type];
    return (
      <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
         <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Enable Automatic Sending</Label>
            <p className="text-sm text-muted-foreground">
              If enabled, reports will be sent automatically at the configured time.
            </p>
          </div>
          <Switch 
            checked={config.isActive} 
            onCheckedChange={(val) => updateRecruiterConfig(type, 'isActive', val)} 
          />
        </div>

        {config.isActive && (
          <div className="grid gap-6 border-l-2 border-indigo-100 pl-4 ml-2">
             <div className="flex gap-6 flex-wrap">
                <div className="w-40">
                  <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Time (IST)</Label>
                  <div className="relative">
                    <Input 
                      type="time" 
                      value={config.sendTime} 
                      onChange={(e) => updateRecruiterConfig(type, 'sendTime', e.target.value)}
                      className="w-full bg-white cursor-pointer"
                    />
                  </div>
                </div>
                {showDayPicker && (
                  <div className="w-40">
                    <Label className="mb-2 block text-xs font-medium uppercase text-muted-foreground">Send Day</Label>
                    <Select value={config.sendDay} onValueChange={(val) => updateRecruiterConfig(type, 'sendDay', val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                           <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
             </div>

             <div className="space-y-2">
              <Label className="text-base">Select Recipients</Label>
              <MultiSelect
                options={allEmployees}
                selected={config.recipients}
                onChange={(val) => updateRecruiterConfig(type, 'recipients', val)}
                placeholder="Select employees to receive this report..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                These users will receive the report via email {showDayPicker ? `every ${config.sendDay}` : 'every day'} at {config.sendTime}.
              </p>
            </div>
           <div className="flex items-center space-x-2 border p-3 rounded-md bg-white">
              <Switch 
                id={`recruiter-copy-${type}`}
                checked={config.sendToRecruiters || false}
                onCheckedChange={(val) => updateRecruiterConfig(type, 'sendToRecruiters', val)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor={`recruiter-copy-${type}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Send individual copies to Recruiters
                </Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, each recruiter mentioned in the report will receive a personalized email containing only their candidates.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading configurations...</div>;
  }

 return (
    <div className="space-y-8 pb-10">

      {/* EOD REPORT */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
       <Card>
        <CardHeader>
          <CardTitle>End of Day (EOD) Report</CardTitle>
        </CardHeader>
        <CardContent><MultiSelect options={allEmployees} selected={eodRecipients} onChange={setEodRecipients} placeholder="Select employees..." className="w-full" /></CardContent>
        <CardFooter><Button onClick={() => handleSaveConfig('eod_report', eodRecipients, true, setSavingEod)} disabled={savingEod}>Save EOD</Button></CardFooter>
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
              <MultiSelect options={allEmployees} selected={jobCreationRecipients} onChange={setJobCreationRecipients} placeholder="Select HR/Admin employees..." className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">The Job Creator automatically receives a copy. Configured users will also receive it (with budget details).</p>
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(JOB_CREATION_REPORT_TYPE, jobCreationRecipients, isJobCreationActive, setSavingJobCreation)} disabled={savingJobCreation}>{savingJobCreation ? "Saving..." : "Save Config"}</Button>
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
              <MultiSelect options={allEmployees} selected={jobUpdateRecipients} onChange={setJobUpdateRecipients} placeholder="Select HR/Admin employees..." className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">Assigned Recruiters receive a notification <b>without</b> budget details. Configured users and the Creator receive full details.</p>
            </CardContent>
          )}
          <CardFooter>
            <Button onClick={() => handleSaveConfig(JOB_UPDATE_REPORT_TYPE, jobUpdateRecipients, isJobUpdateActive, setSavingJobUpdate)} disabled={savingJobUpdate}>{savingJobUpdate ? "Saving..." : "Save Config"}</Button>
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
            <CardContent><MultiSelect options={allEmployees} selected={statusUpdateRecipients} onChange={setStatusUpdateRecipients} placeholder="Select employees..." className="w-full" /></CardContent>
            )}
            <CardFooter><Button onClick={() => handleSaveConfig(STATUS_UPDATE_REPORT_TYPE, statusUpdateRecipients, isStatusUpdateActive, setSavingStatusUpdate)} disabled={savingStatusUpdate}>Save</Button></CardFooter>
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
            <CardContent><MultiSelect options={allEmployees} selected={leaveRecipients} onChange={setLeaveRecipients} placeholder="Select HR/Admin employees..." className="w-full" /></CardContent>
            )}
            <CardFooter><Button onClick={() => handleSaveConfig(LEAVE_REPORT_TYPE, leaveRecipients, isLeaveActive, setSavingLeave)} disabled={savingLeave}>Save</Button></CardFooter>
        </Card>
      </div>


      {/* RECRUITER AUTOMATION (Your existing code here, omitted for brevity, keep what you had) */}
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
            
            <TabsContent value="daily">
              {renderRecruiterConfigTab('daily_recruiter_report')}
            </TabsContent>
            
            <TabsContent value="weekly">
              {renderRecruiterConfigTab('weekly_recruiter_report', true)}
            </TabsContent>
            
            <TabsContent value="monthly">
              <div className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 p-3 rounded-md flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Monthly reports are automatically triggered on the <strong>Last Day</strong> of every month.
              </div>
              {renderRecruiterConfigTab('monthly_recruiter_report')}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="bg-slate-50/50 border-t">
          <Button onClick={handleSaveRecruiterReports} disabled={savingRecruiter} className="ml-auto bg-indigo-600 hover:bg-indigo-700">
            {savingRecruiter ? "Saving..." : "Save Automation Settings"}
          </Button>
        </CardFooter>

      </Card>

     

    </div>
  );
};

export default EmailConfigurationManagement;
// job update and create mail