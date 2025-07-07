
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Plus, 
  Edit,
  Trash2,
  Settings,
  Eye,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface DefaultPermission {
  id: string;
  permission_key: string;
  permission_name: string;
  permission_description: string;
  category: string;
  is_active: boolean;
}

interface MenuPermission {
  key: string;
  name: string;
  description: string;
  route: string;
}

const RolePermissionsManagement = () => {
  const [permissions, setPermissions] = useState<DefaultPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<DefaultPermission | null>(null);
  const [formData, setFormData] = useState({
    permission_name: '',
    permission_description: '',
    category: '',
    permission_key: ''
  });
  const { toast } = useToast();

  // Define menu permissions for platform navigation control
  const menuPermissions: MenuPermission[] = [
    { key: 'access_dashboard', name: 'Access Dashboard', description: 'View main dashboard', route: '/' },
    { key: 'access_user_management', name: 'User Management', description: 'Access user management module', route: '/user-management' },
    { key: 'access_team_management', name: 'Team Management', description: 'Access team management features', route: '/teams' },
    { key: 'access_client_management', name: 'Client Management', description: 'Access client management module', route: '/clients' },
    { key: 'access_project_management', name: 'Project Management', description: 'Access project management features', route: '/projects' },
    { key: 'access_reports', name: 'Reports & Analytics', description: 'Access reporting features', route: '/reports' },
    { key: 'access_settings', name: 'System Settings', description: 'Access system configuration', route: '/settings' },
  ];

  useEffect(() => {
    fetchPermissions();
    initializeMenuPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_default_permissions')
        .select('*')
        .order('category')
        .order('permission_name');

      if (error) throw error;

      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMenuPermissions = async () => {
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) return;
      const { organization_id } = authData;

      // Check if menu permissions already exist
      const { data: existing } = await supabase
        .from('hr_default_permissions')
        .select('permission_key')
        .eq('category', 'menu_access');

      const existingKeys = existing?.map(p => p.permission_key) || [];
      
      // Insert missing menu permissions
      const missingPermissions = menuPermissions.filter(
        mp => !existingKeys.includes(mp.key)
      );

      if (missingPermissions.length > 0) {
        const permissionsToInsert = missingPermissions.map(mp => ({
          permission_key: mp.key,
          permission_name: mp.name,
          permission_description: mp.description,
          category: 'menu_access',
          organization_id: organization_id
        }));

        await supabase
          .from('hr_default_permissions')
          .insert(permissionsToInsert);

        fetchPermissions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error initializing menu permissions:', error);
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id } = authData;

      // Generate permission key from name if not provided
      const permissionKey = formData.permission_key || 
        formData.permission_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      const { error } = await supabase
        .from('hr_default_permissions')
        .insert([{
          permission_key: permissionKey,
          permission_name: formData.permission_name,
          permission_description: formData.permission_description,
          category: formData.category,
          organization_id: organization_id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission created successfully",
      });

      setShowCreateModal(false);
      setFormData({ permission_name: '', permission_description: '', category: '', permission_key: '' });
      fetchPermissions();
    } catch (error: any) {
      console.error('Error creating permission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create permission",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPermission) return;

    try {
      const { error } = await supabase
        .from('hr_default_permissions')
        .update({
          permission_name: formData.permission_name,
          permission_description: formData.permission_description,
          category: formData.category
        })
        .eq('id', editingPermission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });

      setEditingPermission(null);
      setFormData({ permission_name: '', permission_description: '', category: '', permission_key: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const handleTogglePermission = async (permission: DefaultPermission) => {
    try {
      const { error } = await supabase
        .from('hr_default_permissions')
        .update({ is_active: !permission.is_active })
        .eq('id', permission.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Permission ${permission.is_active ? 'disabled' : 'enabled'} successfully`,
      });

      fetchPermissions();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: "Error",
        description: "Failed to update permission status",
        variant: "destructive",
      });
    }
  };

  const startEdit = (permission: DefaultPermission) => {
    setEditingPermission(permission);
    setFormData({
      permission_name: permission.permission_name,
      permission_description: permission.permission_description,
      category: permission.category,
      permission_key: permission.permission_key
    });
  };

  const getCategoryDisplayName = (category: string) => {
    const names: Record<string, string> = {
      analytics: 'Analytics & Reporting',
      task_management: 'Task Management',
      leave_management: 'Leave Management',
      member_management: 'Member Management',
      monitoring: 'Screen Monitoring',
      data_access: 'Data Visibility',
      menu_access: 'Menu Access Control'
    };
    return names[category] || category;
  };

  const getPermissionsByCategory = () => {
    const categories = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, DefaultPermission[]>);

    return categories;
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles & Permissions Management
              </CardTitle>
              <CardDescription>
                Manage default permissions and menu access controls for the platform
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-8">
            {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4">
                  {getCategoryDisplayName(category)}
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission Name</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryPermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium">
                            {permission.permission_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {permission.permission_key}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            {permission.permission_description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={permission.is_active}
                                onCheckedChange={() => handleTogglePermission(permission)}
                              />
                              <Badge 
                                variant={permission.is_active ? "default" : "secondary"}
                              >
                                {permission.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(permission)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          {permissions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No permissions found. Create your first permission to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Permission Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Add a new permission to the system.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreatePermission} className="space-y-4">
            <div>
              <Label htmlFor="permission_name">Permission Name *</Label>
              <Input
                id="permission_name"
                value={formData.permission_name}
                onChange={(e) => setFormData(prev => ({ ...prev, permission_name: e.target.value }))}
                required
                placeholder="e.g., View Team Reports"
              />
            </div>

            <div>
              <Label htmlFor="permission_key">Permission Key</Label>
              <Input
                id="permission_key"
                value={formData.permission_key}
                onChange={(e) => setFormData(prev => ({ ...prev, permission_key: e.target.value }))}
                placeholder="Auto-generated from name if empty"
              />
            </div>

            <div>
              <Label htmlFor="permission_description">Description</Label>
              <Input
                id="permission_description"
                value={formData.permission_description}
                onChange={(e) => setFormData(prev => ({ ...prev, permission_description: e.target.value }))}
                placeholder="Brief description of what this permission allows"
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytics">Analytics & Reporting</SelectItem>
                  <SelectItem value="task_management">Task Management</SelectItem>
                  <SelectItem value="leave_management">Leave Management</SelectItem>
                  <SelectItem value="member_management">Member Management</SelectItem>
                  <SelectItem value="monitoring">Screen Monitoring</SelectItem>
                  <SelectItem value="data_access">Data Visibility</SelectItem>
                  <SelectItem value="menu_access">Menu Access Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Permission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Modal */}
      <Dialog open={!!editingPermission} onOpenChange={(open) => !open && setEditingPermission(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Update permission details.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdatePermission} className="space-y-4">
            <div>
              <Label htmlFor="edit_permission_name">Permission Name *</Label>
              <Input
                id="edit_permission_name"
                value={formData.permission_name}
                onChange={(e) => setFormData(prev => ({ ...prev, permission_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit_permission_description">Description</Label>
              <Input
                id="edit_permission_description"
                value={formData.permission_description}
                onChange={(e) => setFormData(prev => ({ ...prev, permission_description: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit_category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytics">Analytics & Reporting</SelectItem>
                  <SelectItem value="task_management">Task Management</SelectItem>
                  <SelectItem value="leave_management">Leave Management</SelectItem>
                  <SelectItem value="member_management">Member Management</SelectItem>
                  <SelectItem value="monitoring">Screen Monitoring</SelectItem>
                  <SelectItem value="data_access">Data Visibility</SelectItem>
                  <SelectItem value="menu_access">Menu Access Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingPermission(null)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Permission
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolePermissionsManagement;
