import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { MultiSelect } from '@/components/ui/multi-selector';
import { fetchEmployees } from '@/api/user';
import { Clock, CalendarDays, CalendarRange, Calendar } from 'lucide-react';

interface EmployeeOption {
  value: string;
  label: string;
}

// Interface for the new Recruiter Report Configs
interface RecruiterReportConfig {
  isActive: boolean;
  recipients: string[];
  sendTime: string;
  sendDay?: string;
}

const RECRUITER_REPORT_TYPES = ['daily_recruiter_report', 'weekly_recruiter_report', 'monthly_recruiter_report'];

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
    daily_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00" },
    weekly_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00", sendDay: "Friday" },
    monthly_recruiter_report: { isActive: false, recipients: [], sendTime: "19:00" },
  });

  useEffect(() => {
    const loadData = async () => {
      if (!organization_id) return;
      setLoading(true);
      try {
        // 1. Fetch Employees
        const employees = await fetchEmployees(organization_id);
        setAllEmployees(employees.map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name} (${e.email})`
        })));

        // 2. Fetch All Configurations (EOD + Recruiter Reports)
        const { data: configs, error } = await supabase
          .from('hr_email_configurations')
          .select('*')
          .eq('organization_id', organization_id)
          .in('report_type', ['eod_report', ...RECRUITER_REPORT_TYPES]);
        
        if (error) throw error;

        // 3. Distribute Data to States
        const newRecruiterConfigs = { ...recruiterConfigs };

        configs?.forEach((conf) => {
          // Handle Existing EOD Logic
          if (conf.report_type === 'eod_report') {
            setEodRecipients(conf.recipients || []);
          }
          // Handle New Recruiter Logic
          else if (newRecruiterConfigs[conf.report_type]) {
            newRecruiterConfigs[conf.report_type] = {
              isActive: conf.is_active,
              recipients: conf.recipients || [],
              sendTime: conf.config?.sendTime || "19:00",
              sendDay: conf.config?.sendDay || "Friday"
            };
          }
        });

        setRecruiterConfigs(newRecruiterConfigs);

      } catch (error) {
        console.error("Error loading email configurations:", error);
        toast({
          title: "Error",
          description: "Failed to load email configurations.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
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

  // --- NEW HANDLERS (Recruiter Reports) ---
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
            sendDay: conf.sendDay
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
                  <Select value={config.sendTime} onValueChange={(val) => updateRecruiterConfig(type, 'sendTime', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['09:00', '13:00', '17:00', '19:00', '21:00'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading configurations...</div>;
  }

  return (
    <div className="space-y-8">
      
      {/* --- SECTION 1: EXISTING EOD REPORT --- */}
      <Card>
        <CardHeader>
          <CardTitle>End of Day (EOD) Report</CardTitle>
          <CardDescription>
            Define a default list of recipients who will automatically receive the EOD report email whenever an employee submits their timesheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="eod-recipients">Default Recipients</Label>
            <MultiSelect
              id="eod-recipients"
              options={allEmployees}
              selected={eodRecipients}
              onChange={setEodRecipients}
              placeholder="Select employees..."
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              The submitting user will always receive a copy of their own report.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveEOD} disabled={savingEod}>
            {savingEod ? "Saving..." : "Save EOD Changes"}
          </Button>
        </CardFooter>
      </Card>

      {/* --- SECTION 2: NEW AUTOMATED RECRUITER REPORTS --- */}
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-indigo-950">Automated Recruiter Reports</CardTitle>
          </div>
          <CardDescription>
            Schedule consolidated reports for candidate activities (Creation & Status Updates) to be sent automatically.
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