import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { MultiSelect } from '@/components/ui/multi-selector'; // Assuming this component exists
import { fetchEmployees } from '@/api/user'; // Assuming this api function exists

interface EmployeeOption {
  value: string; // employee id
  label: string; // employee name and email
}

const EmailConfigurationManagement = () => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [eodRecipients, setEodRecipients] = useState<string[]>([]); // stores list of employee IDs

  useEffect(() => {
    const loadData = async () => {
      if (!organization_id) return;
      setLoading(true);
      try {
        // Fetch all employees for the multi-select dropdown
        const employees = await fetchEmployees(organization_id);
        setAllEmployees(employees.map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name} (${e.email})`
        })));

        // Fetch the current EOD report configuration
        const { data: config, error } = await supabase
          .from('hr_email_configurations')
          .select('recipients')
          .eq('organization_id', organization_id)
          .eq('report_type', 'eod_report')
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }

        if (config) {
          setEodRecipients(config.recipients || []);
        }

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

  const handleSaveChanges = async () => {
    if (!organization_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hr_email_configurations')
        .upsert({
          organization_id: organization_id,
          report_type: 'eod_report',
          recipients: eodRecipients,
        }, { onConflict: 'organization_id,report_type' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "EOD Report recipients have been updated.",
      });
    } catch (error) {
      console.error("Error saving email configurations:", error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div>Loading configurations...</div>;
  }

  return (
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
        <Button onClick={handleSaveChanges} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EmailConfigurationManagement;