import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info, ShieldCheck } from "lucide-react";

interface Props {
  targetId: string;
  type: 'role' | 'department' | 'user';
  parentRoleId?: string;
  organizationId: string;
  enabledSuites: Record<string, boolean>;
}

const PermissionMatrix = ({ targetId, type, parentRoleId, organizationId, enabledSuites }: Props) => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inheritedFromRole, setInheritedFromRole] = useState<string[]>([]);
  const [inheritedFromDept, setInheritedFromDept] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const tableName = { role: 'hr_role_permissions', department: 'hr_department_permissions', user: 'hr_user_permissions' }[type];
  const columnId = { role: 'role_id', department: 'department_id', user: 'user_id' }[type];

  useEffect(() => { if (targetId) fetchData(); }, [targetId, type, parentRoleId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Master List (Restricted by Global Admin)
      const { data: allowed } = await supabase
        .from('hr_organization_allowed_permissions')
        .select('hr_default_permissions(*)').eq('organization_id', organizationId);
      
      const cleanPerms = allowed?.map((item: any) => item.hr_default_permissions).filter(Boolean) || [];

      // 2. Inheritance Logic
      let roleP: string[] = [];
      let deptP: string[] = [];

      if (type === 'user') {
        const { data: emp } = await supabase.from('hr_employees').select('role_id, department_id').eq('id', targetId).single();
        if (emp) {
          const { data: rp } = await supabase.from('hr_role_permissions').select('permission_id').eq('role_id', emp.role_id).eq('organization_id', organizationId);
          const { data: dp } = await supabase.from('hr_department_permissions').select('permission_id').eq('department_id', emp.department_id).eq('organization_id', organizationId);
          roleP = rp?.map(r => r.permission_id) || [];
          deptP = dp?.map(d => d.permission_id) || [];
        }
      } else if (type === 'department' && parentRoleId) {
          const { data: rp } = await supabase.from('hr_role_permissions').select('permission_id').eq('role_id', parentRoleId).eq('organization_id', organizationId);
          roleP = rp?.map(r => r.permission_id) || [];
      }

      // 3. Current Direct Assignment
      const { data: assigned } = await supabase.from(tableName).select('*').eq(columnId, targetId).eq('organization_id', organizationId);
      const assignedIds = assigned?.filter(a => type === 'user' ? a.is_allowed : true).map(a => a.permission_id) || [];

      setPermissions(cleanPerms);
      setInheritedFromRole(roleP);
      setInheritedFromDept(deptP);
      setSelectedIds(Array.from(new Set([...assignedIds, ...roleP, ...deptP])));
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from(tableName).delete().eq(columnId, targetId).eq('organization_id', organizationId);
      const toInsert = selectedIds.map(pid => {
        const item: any = { [columnId]: targetId, permission_id: pid, organization_id: organizationId };
        if (type === 'user') item.is_allowed = true;
        return item;
      });

      // User Denial Logic: if an inherited permission is unchecked, add as is_allowed: false
      if (type === 'user') {
        [...inheritedFromRole, ...inheritedFromDept].forEach(id => {
          if (!selectedIds.includes(id)) toInsert.push({ [columnId]: targetId, permission_id: id, organization_id: organizationId, is_allowed: false });
        });
      }

      if (toInsert.length > 0) await supabase.from(tableName).insert(toInsert);
      toast({ title: "Rules Updated" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const grouped = permissions.reduce((acc: any, p) => {
    const suiteMap: any = { general: 'General (Core)', hiring: 'Recruit & Project', project: 'Recruit & Project', verification: 'Verification', sales: 'Sales', finance: 'Finance' };
    const title = suiteMap[p.suite_key] || p.suite_key;
    if (!acc[title]) acc[title] = [];
    acc[title].push(p);
    return acc;
  }, {});

  if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-violet-50 p-4 rounded-lg border border-violet-100">
        <div className="flex items-center gap-2 text-violet-800 text-sm font-bold">
          <Info size={16} /> Hierarchy-based Access Mapping
        </div>
        <Button onClick={handleSave} isLoading={saving} className="bg-violet-600 hover:bg-violet-700">Save Access rules</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(grouped).map(title => (
          <Card key={title} className="border-slate-200">
            <CardHeader className="py-2 bg-slate-50 border-b"><CardTitle className="text-[10px] uppercase font-black">{title}</CardTitle></CardHeader>
            <CardContent className="pt-4 space-y-2">
              {grouped[title].map((p: any) => {
                const isRole = inheritedFromRole.includes(p.id);
                const isDept = inheritedFromDept.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-1">
                    <div className="flex items-center space-x-3">
                      <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={(c) => setSelectedIds(prev => c ? [...prev, p.id] : prev.filter(i => i !== p.id))} />
                      <label className={`text-sm ${(isRole || isDept) ? 'font-bold text-violet-700' : ''}`}>{p.permission_name}</label>
                    </div>
                    <div className="flex gap-1">
                        {isRole && <Badge variant="outline" className="text-[8px] bg-blue-50">ROLE</Badge>}
                        {isDept && type === 'user' && <Badge variant="outline" className="text-[8px] bg-orange-50">DEPT</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PermissionMatrix;