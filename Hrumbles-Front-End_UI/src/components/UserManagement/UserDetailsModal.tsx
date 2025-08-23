import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Building,
  Edit,
  Save,
  X, Users
} from "lucide-react";
import UserPermissionsDialog from './UserPermissionsDialog';
import ManagerAssignmentDialog from './ManagerAssignmentDialog';

interface UserDetailsModalProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status: string;
    employment_start_date?: string;
    last_login?: string;
    role_name?: string;
    department_name?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const UserDetailsModal = ({ user, isOpen, onClose, onUpdate }: UserDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone || '',
    role_id: '',
    department_id: '',
    employment_start_date: user.employment_start_date || ''
  });
  const [roles, setRoles] = useState<Array<{id: string, name: string}>>([]);
  const [departments, setDepartments] = useState<Array<{id: string, name: string}>>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [reportingManager, setReportingManager] = useState<any>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showManagerAssignment, setShowManagerAssignment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAdditionalData();
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        role_id: '',
        department_id: '',
        employment_start_date: user.employment_start_date || ''
      });
    }
  }, [isOpen, user]);

  const fetchAdditionalData = async () => {
    try {
      const [rolesResponse, departmentsResponse, activityResponse] = await Promise.all([
        supabase.from('hr_roles').select('id, name'),
        supabase.from('hr_departments').select('id, name'),
        supabase
          .from('hr_employee_work_times')
          .select('*')
          .eq('employee_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (rolesResponse.data) setRoles(rolesResponse.data);
      if (departmentsResponse.data) setDepartments(departmentsResponse.data);
      if (activityResponse.data) setUserActivity(activityResponse.data);
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hr_employees')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          role_id: formData.role_id || null,
          department_id: formData.department_id || null,
          employment_start_date: formData.employment_start_date || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User details updated successfully",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-yellow-100 text-yellow-800">Inactive</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {user.first_name} {user.last_name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {getStatusBadge(user.status)}
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </DialogDescription>
              </div>
              {/* <div className="flex gap-2">
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={loading}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div> */}
            </div>
          </DialogHeader>

          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_first_name">First Name</Label>
                        <Input
                          id="edit_first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_last_name">Last Name</Label>
                        <Input
                          id="edit_last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="edit_email">Email</Label>
                      <Input
                        id="edit_email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_phone">Phone</Label>
                      <Input
                        id="edit_phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.employment_start_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Started: {new Date(user.employment_start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="edit_role">Role</Label>
                      <Select value={formData.role_id} onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, role_id: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_department">Department</Label>
                      <Select value={formData.department_id} onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, department_id: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{user.role_name || 'No role assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{user.department_name || 'No department assigned'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div> */}
          {/* Reporting Structure Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reporting Structure</CardTitle>
              <CardDescription>
                Manage reporting relationships and organizational hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <Label className="font-medium">Reporting Manager</Label>
                    {reportingManager ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={reportingManager.profile_picture_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(reportingManager.first_name, reportingManager.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {reportingManager.first_name} {reportingManager.last_name}
                        </span>
                        {reportingManager.position && (
                          <Badge variant="outline" className="text-xs">
                            {reportingManager.position}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        No reporting manager assigned
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManagerAssignment(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {reportingManager ? 'Change Manager' : 'Assign Manager'}
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Role & Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label className="font-medium">Current Role</Label>
                    <p className="text-sm text-muted-foreground">
                      {user.role_name || 'No role assigned'}
                    </p>
                  </div>
                  <Badge variant="outline">{user.role_name || 'None'}</Badge>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPermissions(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Individual Permissions
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Individual permissions override role-based permissions and control menu access.
                </p>
              </div>
            </div>
          </div> */}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Permissions Dialog */}
      {user && (
        <UserPermissionsDialog
          open={showPermissions}
          onOpenChange={setShowPermissions}
          user={user}
          onSuccess={() => {
            setShowPermissions(false);
            onUpdate();
          }}
        />
      )}

       {/* Manager Assignment Dialog */}
      {user && (
        <ManagerAssignmentDialog
          open={showManagerAssignment}
          onOpenChange={setShowManagerAssignment}
          employee={user}
          onSuccess={() => {
            setShowManagerAssignment(false);
            fetchAdditionalData();
            onUpdate();
          }}
        />
      )}
    </>
  );
};

export default UserDetailsModal;
