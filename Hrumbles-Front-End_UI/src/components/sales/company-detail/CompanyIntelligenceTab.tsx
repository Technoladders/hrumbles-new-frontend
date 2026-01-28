import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, TrendingUp, Cpu, Landmark, Globe, MapPin, 
  DollarSign, Users, Briefcase, Sparkles, Calendar, ArrowUpRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CompanyIntelligenceTab = ({ company, refetchParent }: any) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const { data: intel, isLoading, refetch } = useQuery({
    queryKey: ['company-intelligence-deep', company.apollo_org_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrichment_organizations')
        .select(`
          *, 
          enrichment_org_technologies(*), 
          enrichment_org_keywords(*),
          enrichment_org_funding_events(*),
          enrichment_org_departments(*)
        `)
        .eq('apollo_org_id', company.apollo_org_id)
        .maybeSingle();
      return data;
    },
    enabled: !!company.apollo_org_id
  });

const handleSync = async () => {
  setIsSyncing(true);
  try {
    let error;
    
    // Check if we should use ID or Domain
    if (company.apollo_org_id) {
      // USE NEW ID-BASED FUNCTION
      const result = await supabase.functions.invoke('enrich-org-by-id', {
        body: { 
          apolloOrgId: company.apollo_org_id, 
          companyId: company.id,
          internalOrgId: company.organization_id
        }
      });
      error = result.error;
    } else if (company.website) {
      // USE OLD DOMAIN-BASED FUNCTION
      const domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const result = await supabase.functions.invoke('enrich-organization', {
        body: { domain, companyId: company.id }
      });
      error = result.error;
    } else {
      throw new Error("Cannot sync: Missing both Website and Intelligence ID.");
    }

    if (error) throw error;
    toast({ title: "Intelligence Refreshed" });
    refetch();
    refetchParent();
  } catch (err: any) {
    toast({ variant: "destructive", title: "Sync Failed", description: err.message });
  } finally {
    setIsSyncing(false);
  }
};

  if (!company.apollo_org_id && !intel) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed p-20 text-center shadow-sm">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise Insights Locked</h3>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Get verified department distributions, funding history, and deep tech stack info.</p>
        <Button onClick={handleSync} disabled={isSyncing} size="lg" className="bg-blue-600 px-10 shadow-lg shadow-blue-100">
          {isSyncing ? "Connecting Intelligence..." : "Activate Smart Sync"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* VERIFIED HEADER */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Verified Intelligence Layer</h2>
            <p className="text-sm text-slate-500">Last Synced: {company.intelligence_last_synced ? new Date(company.intelligence_last_synced).toLocaleString() : 'Just now'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="border-slate-200">
          <TrendingUp className="mr-2 h-4 w-4" /> Refresh Intelligence
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: FIRMOGRAPHICS & FUNDING */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest">Growth Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-end border-b pb-4 border-slate-50">
                <div><p className="text-[10px] text-slate-400 uppercase font-bold">Employees</p><p className="text-2xl font-black text-slate-900">{intel?.estimated_num_employees?.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase font-bold text-right">Revenue</p><p className="text-2xl font-black text-green-600 text-right">{intel?.annual_revenue_printed || 'N/A'}</p></div>
              </div>
              <div className="space-y-3 pt-2">
                <MetricRow icon={<Landmark size={14}/>} label="Legal Entity" value={intel?.name} />
                <MetricRow icon={<Globe size={14}/>} label="Official Domain" value={intel?.primary_domain} />
                <MetricRow icon={<Calendar size={14}/>} label="Founded" value={intel?.founded_year} />
                <MetricRow icon={<MapPin size={14}/>} label="Headquarters" value={`${intel?.city}, ${intel?.country}`} />
              </div>
            </CardContent>
          </Card>

          {/* FUNDING TIMELINE */}
          {intel?.enrichment_org_funding_events?.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><DollarSign size={14}/> Funding History</CardTitle></CardHeader>
              <CardContent className="space-y-6 pt-0">
                {intel.enrichment_org_funding_events.map((event: any, idx: number) => (
                  <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:h-full before:w-0.5 before:bg-slate-100 last:before:h-0">
                    <div className="absolute left-[-3px] top-1.5 h-2 w-2 rounded-full bg-blue-500 ring-4 ring-white" />
                    <p className="text-xs font-bold text-slate-900">{event.type} — {event.currency}{event.amount}</p>
                    <p className="text-[10px] text-slate-500 mb-1">{new Date(event.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-400 italic">Investors: {event.investors}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: DEPARTMENTS & TECH */}
        <div className="lg:col-span-8 space-y-6">
          {/* DEPARTMENT DISTRIBUTION */}
          {intel?.enrichment_org_departments?.length > 0 && (
            <Card className="border-none shadow-sm">
               <CardHeader><CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><Briefcase size={14}/> Workforce Distribution</CardTitle></CardHeader>
               <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {intel.enrichment_org_departments
                    .sort((a:any, b:any) => b.head_count - a.head_count)
                    .map((dept: any) => {
                    const percentage = Math.round((dept.head_count / intel.estimated_num_employees) * 100);
                    return (
                      <div key={dept.id} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-700 capitalize">{dept.department_name.replace(/_/g, ' ')}</span>
                          <span className="text-slate-400">{dept.head_count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-1.5 bg-slate-50" />
                      </div>
                    )
                  })}
               </CardContent>
            </Card>
          )}

          {/* TECH STACK */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2"><Cpu size={16} className="text-blue-500" /> Technology Stack</CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{intel?.enrichment_org_technologies?.length} Assets</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {intel?.enrichment_org_technologies?.map((t: any) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-100 transition-all">
                  <p className="text-[11px] font-black text-slate-800 truncate">{t.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter truncate">{t.category || 'Platform'}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const MetricRow = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2 text-slate-400">{icon} <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span></div>
    <span className="text-xs font-bold text-slate-700">{value || '—'}</span>
  </div>
);