
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Users,
  Settings,
  Plus,
  Mail,
  Bell,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface Team {
  id: string;
  name: string;
  description?: string;
  team_lead_name?: string;
  department_name?: string;
  member_count: number;
  parent_team_id?: string;
  team_type: 'department' | 'team' | 'sub_team';
  level: number;
  is_active: boolean;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name: string;
  designation_name: string;
  employment_status: string;
}

interface TeamPermission {
  id: string;
  permission_key: string;
  permission_value: boolean;
  permission_name?: string;
  permission_description?: string;
  category?: string;
}

interface EmailNotificationConfig {
  id: string;
  notification_type: string;
  is_enabled: boolean;
  recipients: string[];
  include_new_users: boolean;
  frequency: string;
  team_id: string;
}

interface TeamDetailViewProps {
  team: Team;
  onBack: () => void;
  onRefresh: () => void;
}

const TeamDetailView: React.FC<TeamDetailViewProps> = ({ team, onBack, onRefresh }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permissions, setPermissions] = useState<TeamPermission[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<TeamMember[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const { toast } = useToast();

  const notificationTypes = [
    { key: 'eod_report', name: 'EOD Report', description: 'End-of-day summary of team activities' },
    { key: 'job_assign_notify', name: 'Job Assign Notify', description: 'Alerts when jobs are assigned' },
    { key: 'job_create_update', name: 'Job Create/Update', description: 'Job creation and update notifications' },
    { key: 'client_reports', name: 'Client Reports', description: 'Client-related activity summaries' },
    { key: 'individual_reports', name: 'Individual Reports', description: 'Individual performance reports' },
    { key: 'recruiter_reports', name: 'Recruiter Reports', description: 'Recruiter performance reports' },
    { key: 'leave_attendance', name: 'Leave & Attendance', description: 'Leave and attendance notifications' },
    { key: 'project_updates', name: 'Project Updates', description: 'Project progress and milestone updates' },
    { key: 'new_user_signup', name: 'New User Signup', description: 'New user onboarding notifications' }
  ];

  useEffect(() => {
    fetchTeamData();
  }, [team.id]);

const fetchTeamData = async () => {
  try {
    setLoading(true);
    console.log('Fetching members...');
    await fetchMembers();
    console.log('Fetching permissions...');
    await fetchPermissions();
    console.log('Fetching email notifications...');
    await fetchEmailNotifications();
    console.log('Fetching available employees...');
    await fetchAvailableEmployees();
  } catch (error) {
    console.error('Error fetching team data:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    toast({
      title: "Error",
      description: `Failed to fetch team data: ${error.message}`,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

const fetchMembers = async () => {
  const { data, error } = await supabase
    .from('hr_team_members')
    .select(`
      employee:hr_employees!hr_team_members_employee_id_fkey!inner(
        id,
        first_name,
        last_name,
        email,
        employment_status,
        role:hr_roles!hr_employees_role_id_fkey(name),
        designation:hr_designations!hr_employees_designation_id_fkey(name)
      )
    `)
    .eq('team_id', team.id);

  if (error) {
    console.error('Fetch members error:', error);
    throw error;
  }

  const formattedMembers = data?.map(item => ({
    id: item.employee.id,
    first_name: item.employee.first_name,
    last_name: item.employee.last_name,
    email: item.employee.email,
    role_name: item.employee.role?.name || 'No role',
    designation_name: item.employee.designation?.name || 'No designation',
    employment_status: item.employee.employment_status
  })) || [];

  setMembers(formattedMembers);
};

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('hr_team_permissions')
      .select(`
        id,
        permission_key,
        permission_value
      `)
      .eq('team_id', team.id);

    if (error) throw error;

    // Get default permissions for display info
    const { data: defaultPerms } = await supabase
      .from('hr_default_permissions')
      .select('permission_key, permission_name, permission_description, category')
      .eq('is_active', true);

    const defaultPermMap = new Map(
      defaultPerms?.map(p => [p.permission_key, p]) || []
    );

    const formattedPermissions = data?.map(perm => {
      const defaultPerm = defaultPermMap.get(perm.permission_key);
      return {
        id: perm.id,
        permission_key: perm.permission_key,
        permission_value: perm.permission_value,
        permission_name: defaultPerm?.permission_name || perm.permission_key,
        permission_description: defaultPerm?.permission_description || '',
        category: defaultPerm?.category || 'general'
      };
    }) || [];

    setPermissions(formattedPermissions);
  };

  const fetchEmailNotifications = async () => {
    const { data, error } = await supabase
      .from('hr_email_notifications')
      .select('*')
      .eq('team_id', team.id);

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching email notifications:', error);
      return;
    }

    setEmailNotifications(data || []);
  };

  const fetchAvailableEmployees = async () => {
    const authData = getAuthDataFromLocalStorage();
    if (!authData) return;

    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
id,
    first_name,
    last_name,
    email,
    employment_status,
    role:hr_roles!inner(name),
    designation:hr_designations!inner(name)
      `)
      .eq('organization_id', authData.organization_id)
      .eq('status', 'active')
      // .not('id', 'in', `(${members.map(m => `'${m.id}'`).join(',') || "''"})`)
      .limit(50);

    if (error) throw error;

    const formattedEmployees = data?.map(emp => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      role_name: emp.role?.name || 'No role',
      designation_name: emp.designation?.name || 'No designation',
      employment_status: emp.employment_status
    })) || [];

    setAvailableEmployees(formattedEmployees);
  };

  const handleAddMembers = async () => {
    if (selectedEmployees.length === 0) return;

    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) return;

      const memberData = selectedEmployees.map(employeeId => ({
        team_id: team.id,
        employee_id: employeeId,
        organization_id: authData.organization_id,
        added_by: authData.userId
      }));

      const { error } = await supabase
        .from('hr_team_members')
        .insert(memberData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${selectedEmployees.length} member(s) to team`,
      });

      setSelectedEmployees([]);
      setShowAddMember(false);
      fetchTeamData();
      onRefresh();
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: "Error",
        description: "Failed to add members to team",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;

    try {
      const { error } = await supabase
        .from('hr_team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('employee_id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed from team",
      });

      fetchTeamData();
      onRefresh();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member from team",
        variant: "destructive",
      });
    }
  };

  const handleEmailNotificationToggle = async (notificationType: string, enabled: boolean) => {
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) return;

      const existingConfig = emailNotifications.find(n => n.notification_type === notificationType);

      if (existingConfig) {
        const { error } = await supabase
          .from('hr_email_notifications')
          .update({ is_enabled: enabled })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_email_notifications')
          .insert({
            team_id: team.id,
            notification_type: notificationType,
            is_enabled: enabled,
            recipients: [],
            include_new_users: false,
            frequency: 'instant',
            organization_id: authData.organization_id
          });

        if (error) throw error;
      }

      fetchEmailNotifications();
      toast({
        title: "Success",
        description: `Email notification ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating email notification:', error);
      toast({
        title: "Error",
        description: "Failed to update email notification",
        variant: "destructive",
      });
    }
  };

  const getPermissionsByCategory = () => {
    const categories = permissions.reduce((acc, perm) => {
      const category = perm.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, TeamPermission[]>);

    return categories;
  };

  const getCategoryDisplayName = (category: string) => {
    const names: Record<string, string> = {
      analytics: 'Analytics & Reporting',
      task_management: 'Task Management',
      leave_management: 'Leave Management',
      member_management: 'Member Management',
      monitoring: 'Screen Monitoring',
      data_access: 'Data Visibility',
      general: 'General'
    };
    return names[category] || category;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const permissionsByCategory = getPermissionsByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">
              {team.team_type} • {members.length} members
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowEmailConfig(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email Notifications
          </Button>
          <Button onClick={() => setShowAddMember(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Members
          </Button>
        </div>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role_name}</Badge>
                    </TableCell>
                    <TableCell>{member.designation_name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={member.employment_status === 'active' ? 'default' : 'secondary'}
                      >
                        {member.employment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Team Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4">
                  {getCategoryDisplayName(category)}
                </h3>
                <div className="grid gap-4">
                  {categoryPermissions.map(permission => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="font-medium">
                            {permission.permission_name}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {permission.permission_key}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.permission_description}
                        </p>
                      </div>
                      <Badge 
                        variant={permission.permission_value ? "default" : "secondary"}
                        className="ml-4"
                      >
                        {permission.permission_value ? "Granted" : "Denied"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Members Modal */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Members to {team.name}</DialogTitle>
            <DialogDescription>
              Select employees to add to this team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, employee.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {employee.first_name} {employee.last_name}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.role_name}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMembers}
              disabled={selectedEmployees.length === 0}
            >
              Add {selectedEmployees.length} Member(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Notifications Modal */}
      <Dialog open={showEmailConfig} onOpenChange={setShowEmailConfig}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Email Notifications - {team.name}
            </DialogTitle>
            <DialogDescription>
              Configure email notifications for team reports and activities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {notificationTypes.map(type => {
              const config = emailNotifications.find(n => n.notification_type === type.key);
              const isEnabled = config?.is_enabled || false;

              return (
                <div key={type.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => 
                        handleEmailNotificationToggle(type.key, checked)
                      }
                    />
                  </div>
                  
                  {isEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                      <div>
                        <Label className="text-sm font-medium">Recipients</Label>
                        <p className="text-sm text-muted-foreground">
                          Currently configured to send to team leads and admins
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={config?.include_new_users || false}
                          onCheckedChange={() => {
                            // Handle include new users toggle
                          }}
                        />
                        <Label className="text-sm">Include newly added team members</Label>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Frequency</Label>
                        <p className="text-sm text-muted-foreground">
                          {config?.frequency || 'instant'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowEmailConfig(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamDetailView;
