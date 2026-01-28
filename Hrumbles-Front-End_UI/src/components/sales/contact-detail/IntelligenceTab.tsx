import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, Cpu, History, DollarSign, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export const IntelligenceTab = ({ contact }: any) => {
  const person = contact.enrichment_people?.[0];
  const org = person?.enrichment_organizations;
  const history = person?.enrichment_employment_history || [];
  const tech = org?.enrichment_org_technologies || [];
  const depts = org?.enrichment_org_departments || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: WORK HISTORY TIMELINE */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 py-3">
              <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                <History size={16} /> Professional Trajectory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {history.map((job: any) => (
                  <div key={job.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${job.is_current ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Briefcase size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{job.title}</h4>
                      <p className="text-xs text-indigo-600 font-bold">{job.organization_name}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                        {job.start_date ? format(new Date(job.start_date), 'MMM yyyy') : 'N/A'} — {job.is_current ? 'Present' : (job.end_date ? format(new Date(job.end_date), 'MMM yyyy') : 'N/A')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TECH STACK GRID */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 py-3">
              <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                <Cpu size={16} /> Technology Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
               {tech.map((t: any) => (
                 <div key={t.id} className="p-3 rounded-xl border bg-white hover:border-indigo-200 transition-colors">
                    <p className="text-[11px] font-black text-slate-800 truncate">{t.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black truncate">{t.category}</p>
                 </div>
               ))}
            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2: DEPARTMENT BREAKDOWN */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b bg-slate-50/50 py-3">
              <CardTitle className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                <Users size={16} /> Workforce Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
               {depts.sort((a: any, b: any) => b.head_count - a.head_count).map((d: any) => {
                 const total = org?.estimated_num_employees || 1;
                 const percent = Math.round((d.head_count / total) * 100);
                 return (
                   <div key={d.id} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-600">{d.department_name.replace('_', ' ')}</span>
                        <span className="text-slate-400">{d.head_count}</span>
                      </div>
                      <Progress value={percent} className="h-1 bg-slate-100" />
                   </div>
                 )
               })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};