
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_name?: string;
}

interface DefaultPermission {
  permission_key: string;
  permission_name: string;
  permission_description: string;
  category: string;
}

interface UserPermission {
  permission_key: string;
  permission_value: boolean;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: () => void;
}

const UserPermissionsDialog: React.FC<UserPermissionsDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess
}) => {
  const [defaultPermissions, setDefaultPermissions] = useState<DefaultPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPermissions();
    }
  }, [open, user.id]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);

      // Fetch default permissions
      const { data: defaultPerms, error: defaultError } = await supabase
        .from('hr_default_permissions')
        .select('permission_key, permission_name, permission_description, category')
        .eq('is_active', true)
        .order('category')
        .order('permission_name');

      if (defaultError) throw defaultError;

      setDefaultPermissions(defaultPerms || []);

      // Fetch existing user permissions
      const { data: userPerms, error: userError } = await supabase
        .from('hr_user_permissions')
        .select('permission_key, permission_value')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Create permission map
      const permissionMap: Record<string, boolean> = {};
      defaultPerms?.forEach(perm => {
        permissionMap[perm.permission_key] = false; // Default to false
      });

      userPerms?.forEach(perm => {
        permissionMap[perm.permission_key] = perm.permission_value;
      });

      setUserPermissions(permissionMap);
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

  const handlePermissionChange = (permissionKey: string, value: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [permissionKey]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id, userId } = authData;

      // Delete existing permissions for this user
      await supabase
        .from('hr_user_permissions')
        .delete()
        .eq('user_id', user.id);

      // Insert new permissions
      const permissionsToInsert = Object.entries(userPermissions).map(([key, value]) => ({
        user_id: user.id,
        permission_key: key,
        permission_value: value,
        granted_by: userId,
        organization_id: organization_id
      }));

      const { error: insertError } = await supabase
        .from('hr_user_permissions')
        .insert(permissionsToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByCategory = () => {
    const categories = defaultPermissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, DefaultPermission[]>);

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
      menu_access: 'Menu Access Control'
    };
    return names[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'menu_access') {
      return '🧭';
    }
    return '🔧';
  };

  const permissionsByCategory = getPermissionsByCategory();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions - {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            Configure individual permissions for this user. Menu access permissions control which sidebar items the user can see.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{getCategoryIcon(category)}</span>
                    {getCategoryDisplayName(category)}
                  </CardTitle>
                  {category === 'menu_access' && (
                    <p className="text-sm text-muted-foreground">
                      These permissions control which menu items appear in the sidebar for this user.
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {permissions.map(permission => (
                      <div
                        key={permission.permission_key}
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
                        <Switch
                          checked={userPermissions[permission.permission_key] || false}
                          onCheckedChange={(value) => 
                            handlePermissionChange(permission.permission_key, value)
                          }
                          className="ml-4"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || saving}
            className="min-w-24"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsDialog;
