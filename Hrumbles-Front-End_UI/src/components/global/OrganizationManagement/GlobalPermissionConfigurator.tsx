import React, { useState, useEffect } from 'react';
import { Box } from "@chakra-ui/react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GlobalPermissionConfigurator = ({ organizationId }: { organizationId: string }) => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [allowedIds, setAllowedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: all } = await supabase.from('hr_default_permissions').select('*').order('permission_name');
      const { data: current } = await supabase.from('hr_organization_allowed_permissions')
          .select('permission_id').eq('organization_id', organizationId);
      
      setPermissions(all || []);
      setAllowedIds(current?.map(c => c.permission_id) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Allowed Permissions Master List
      await supabase.from('hr_organization_allowed_permissions').delete().eq('organization_id', organizationId);
      const toInsert = allowedIds.map(pid => ({ organization_id: organizationId, permission_id: pid }));
      if (toInsert.length > 0) await supabase.from('hr_organization_allowed_permissions').insert(toInsert);

      // 2. Automatically sync 'subscription_features' booleans
      // We check if any item in a suite is selected. If yes, that suite_feature = true
      const suiteFeatures: Record<string, boolean> = {
          general_suite: true // General is always true
      };

      const suiteKeys = ['hiring', 'project', 'sales', 'finance', 'verification'];
      
      suiteKeys.forEach(key => {
          const hasAnyInSuite = permissions
            .filter(p => p.suite_key === key)
            .some(p => allowedIds.includes(p.id));
          
          suiteFeatures[`${key}_suite`] = hasAnyInSuite;
      });

      // Update the organization table
      const { error: orgError } = await supabase
        .from('hr_organizations')
        .update({ subscription_features: suiteFeatures })
        .eq('id', organizationId);

      if (orgError) throw orgError;

      toast({ title: "Configuration Synced", description: "Master menus and suite features updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSuiteSelectAll = (suite: string, checked: boolean) => {
    const suiteIds = grouped[suite].map((p: any) => p.id);
    if (checked) {
      setAllowedIds(prev => [...new Set([...prev, ...suiteIds])]);
    } else {
      setAllowedIds(prev => prev.filter(id => !suiteIds.includes(id)));
    }
  };

  // Grouping using exact keys from your DB
  const grouped = permissions.reduce((acc: any, p) => {
    if (!acc[p.suite_key]) acc[p.suite_key] = [];
    acc[p.suite_key].push(p);
    return acc;
  }, {});

  const getSuiteState = (suite: string) => {
    const suitePerms = grouped[suite] || [];
    if (suitePerms.length === 0) return { isAll: false, hasSome: false };
    const allowedInSuite = suitePerms.filter((p: any) => allowedIds.includes(p.id)).length;
    return { isAll: allowedInSuite === suitePerms.length, hasSome: allowedInSuite > 0 };
  };

  const suiteDisplayNames: Record<string, string> = {
      general: "General / Core",
      hiring: "Recruitment",
      project: "Projects",
      sales: "Sales / CRM",
      finance: "Finance / Books",
      verification: "BG-Verification"
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
            <Globe className="text-blue-400" />
            <Box>
                <div className="font-bold text-sm">Organization Resource Access</div>
                <div className="text-[10px] text-slate-400">Global Master Menu Restrictions</div>
            </Box>
        </div>
        <Button onClick={handleSave} isLoading={saving} colorScheme="blue" size="sm" px={6}>
            Sync & Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(grouped).sort().map(suiteKey => {
          const { isAll, hasSome } = getSuiteState(suiteKey);
          return (
            <Card key={suiteKey} className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 bg-slate-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-slate-400" />
                    <CardTitle className="text-xs uppercase tracking-tighter">
                        {suiteDisplayNames[suiteKey] || suiteKey}
                    </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">SELECT ALL</span>
                    <Checkbox 
                        checked={isAll} 
                        onCheckedChange={(checked) => handleSuiteSelectAll(suiteKey, !!checked)}
                    />
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {grouped[suiteKey].map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                        <Checkbox 
                        checked={allowedIds.includes(p.id)}
                        onCheckedChange={(checked) => setAllowedIds(prev => checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                        />
                        <label className="text-sm font-medium text-slate-700">{p.permission_name}</label>
                    </div>
                    <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">
                        {p.permission_key}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default GlobalPermissionConfigurator;