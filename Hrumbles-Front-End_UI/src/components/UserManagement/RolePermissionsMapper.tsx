import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, ShieldCheck } from "lucide-react";

const RolePermissionsMapper = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { toast } = useToast();

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  console.log("rolesselect in permisison", roles);

  useEffect(() => {
    fetchInitialData();
  }, [organizationId]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchAssignedPermissions(selectedRoleId);
    }
  }, [selectedRoleId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Roles for this organization
      const { data: rolesData } = await supabase
        .from('hr_roles')
        .select('id, name')

      
      // 2. Fetch All Default Permissions
      const { data: permsData } = await supabase
        .from('hr_default_permissions')
        .select('*')
        .eq('is_active', true);

      setRoles(rolesData || []);
      setAllPermissions(permsData || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedPermissions = async (roleId: string) => {
    const { data } = await supabase
      .from('hr_role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);
    
    setAssignedPermissionIds(data?.map(p => p.permission_id) || []);
  };

  const handleTogglePermission = (permissionId: string) => {
    setAssignedPermissionIds(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId) 
        : [...prev, permissionId]
    );
  };

const handleSave = async () => {
  if (!selectedRoleId || !organizationId) return;
  setSaving(true);
  
  try {
    // 1. Delete ONLY this organization's mapping for this role
    // This prevents Org A from wiping Org B's settings
    await supabase
      .from('hr_role_permissions')
      .delete()
      .match({ 
        role_id: selectedRoleId, 
        organization_id: organizationId 
      });

    // 2. Insert new mappings stamped with the current Org ID
    const newMappings = assignedPermissionIds.map(permId => ({
      organization_id: organizationId, // Mandatory
      role_id: selectedRoleId,
      permission_id: permId
    }));

    if (newMappings.length > 0) {
      const { error } = await supabase.from('hr_role_permissions').insert(newMappings);
      if (error) throw error;
    }

    toast({ title: "Success", description: "Permissions updated for this role in your organization." });
  } catch (error: any) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  } finally {
    setSaving(false);
  }
};

  // Group permissions by suite_key
  const groupedPermissions = allPermissions.reduce((acc: any, curr: any) => {
    const suite = curr.suite_key || 'General';
    if (!acc[suite]) acc[suite] = [];
    acc[suite].push(curr);
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="text-violet-600" />
            Assign Permissions to Role
          </CardTitle>
          <CardDescription>Select a role to manage its access across the platform suites.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-8">
            <div className="flex-1 max-w-sm">
              <label className="text-sm font-medium mb-2 block">Select Role</label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={!selectedRoleId || saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Save Permissions
            </Button>
          </div>

          {!selectedRoleId ? (
            <div className="text-center py-20 border-2 border-dashed rounded-lg text-gray-400">
              Please select a role above to manage permissions
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(groupedPermissions).map(suite => (
                <Card key={suite} className="border-slate-200">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <Badge variant="outline" className="w-fit uppercase tracking-wider text-[10px] mb-1">
                      {suite} Suite
                    </Badge>
                    <CardTitle className="text-md capitalize">{suite} Access Control</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {groupedPermissions[suite].map((perm: any) => (
                        <div key={perm.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                          <Checkbox 
                            id={perm.id} 
                            checked={assignedPermissionIds.includes(perm.id)}
                            onCheckedChange={() => handleTogglePermission(perm.id)}
                            className="mt-1"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label htmlFor={perm.id} className="text-sm font-semibold leading-none cursor-pointer">
                              {perm.permission_name}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {perm.permission_description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissionsMapper;