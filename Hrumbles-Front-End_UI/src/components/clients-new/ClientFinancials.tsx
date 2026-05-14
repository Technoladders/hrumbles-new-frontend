// src/components/clients-new/ClientFinancials.tsx
// Light mode — compact mini visualizations, white cards, violet accent

import React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { ClientMetrics, MonthlyData, HiresByMonth, RecruiterPerformance, PipelineStage } from './ClientTypes';
import { TrendingUp, TrendingDown, IndianRupee, Users, Percent, Activity, Pencil, Trash2, Star, StarOff, Plus, Info, Undo2, FileSpreadsheet } from 'lucide-react';
import TemplateEditorDialog, { ColumnItem, ALL_COLUMNS } from './TemplateEditorDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const formatK = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatK(p.value)}</p>
      ))}
    </div>
  );
};

// Reusable mini card
const MiniCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${className}`}>{children}</div>
);

const MiniTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-3">
    <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{children}</span>
    {icon && <span className="ml-auto text-gray-300">{icon}</span>}
  </div>
);

// Spark stat row for KPIs
const StatChip = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md" style={{ background: `${color}15` }}>
        <div style={{ color, width: 12, height: 12 }}>{icon}</div>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-800">{value}</span>
  </div>
);

// Inline sparkline
const Sparkline = ({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

// Progress bar
const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{formatK(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const PIE_COLORS = ['#7B43F1', '#06B6D4'];

interface ClientFinancialsProps {
  metrics: ClientMetrics; monthlyData: MonthlyData[]; hiresByMonth: HiresByMonth[];
  allCandidatesCount?: number; recruiterPerformance?: RecruiterPerformance[]; pipelineStages?: PipelineStage[];
  clientId: string;
  organizationId: string;
  onConfigSaved?: () => void; // optional refresh
}

const ClientFinancials: React.FC<ClientFinancialsProps> = ({ metrics, monthlyData, hiresByMonth, clientId, organizationId, onConfigSaved }) => {
  const totalRevenue = metrics.candidateRevenue + metrics.employeeRevenueINR;
  const totalProfit = metrics.candidateProfit + metrics.employeeProfitINR;
  const profitMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const costAmount = totalRevenue - totalProfit;
  const maxRevenue = Math.max(metrics.candidateRevenue, metrics.employeeRevenueINR, 1);

 const [templates, setTemplates] = useState<any[]>([]);
const [isTemplateEditorOpen, setTemplateEditorOpen] = useState(false);
const [editingTemplate, setEditingTemplate] = useState<{
  name: string; columns: ColumnItem[]; index: number;
} | null>(null);

// Fetch templates from client.export_template_config
useEffect(() => {
  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("hr_clients")
      .select("export_template_config")
      .eq("id", clientId)
      .single();
    if (!error && data?.export_template_config) {
      setTemplates(data.export_template_config as any[]);
    }
  };
  fetchTemplates();
}, [clientId]);

const saveTemplates = async (updatedTemplates: any[]) => {
  const { error } = await supabase
    .from("hr_clients")
    .update({ export_template_config: updatedTemplates })
    .eq("id", clientId);  // ✅ use clientId prop
  if (error) {
    toast.error("Failed to save templates");
    throw error;
  }
  setTemplates(updatedTemplates);
};

const handleAddTemplate = () => {
  setEditingTemplate({ name: "", columns: ALL_COLUMNS.map(c => ({ ...c })), index: -1 });
  setTemplateEditorOpen(true);
};

const handleEditTemplate = (index: number) => {
  const t = templates[index];
  setEditingTemplate({ name: t.name, columns: t.columns, index });
  setTemplateEditorOpen(true);
};

const handleDeleteTemplate = async (index: number) => {
  const updated = templates.filter((_, i) => i !== index);
  await saveTemplates(updated);
  toast.success("Template deleted");
};

const handleSetDefault = async (index: number) => {
  const updated = templates.map((t, i) => ({ ...t, is_default: i === index }));
  await saveTemplates(updated);
  toast.success("Default template set");
};

const handleTemplateSave = async (name: string, columns: ColumnItem[], isDefault?: boolean) => {
  const newTemplate = { name, columns, is_default: isDefault || false };
  let updatedTemplates: any[];
  
  if (editingTemplate?.index !== undefined && editingTemplate.index >= 0) {
    updatedTemplates = templates.map((t, i) =>
      i === editingTemplate.index ? { ...t, ...newTemplate } : t
    );
  } else {
    // If setting as default, remove default from others
    if (isDefault) {
      updatedTemplates = templates.map(t => ({ ...t, is_default: false }));
      updatedTemplates.push(newTemplate);
    } else {
      updatedTemplates = [...templates, newTemplate];
    }
  }
  
  await saveTemplates(updatedTemplates);
  toast.success(isDefault ? "Template saved and set as default" : "Template saved");
};

const handleRemoveDefault = async (index: number) => {
  const updated = templates.map((t, i) => ({ ...t, is_default: false }));
  await saveTemplates(updated);
  toast.success("Default template removed — export will ask to choose");
};


  const pieData = [
    { name: 'Permanent', value: metrics.candidateRevenue },
    { name: 'Contractual', value: metrics.employeeRevenueINR },
  ].filter(d => d.value > 0);

  const profitTrendData = monthlyData.map(d => ({
    ...d,
    margin: d.revenue > 0 ? parseFloat(((d.profit / d.revenue) * 100).toFixed(1)) : 0,
  }));

  const latestMonthRevenue = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].revenue : 0;
  const prevMonthRevenue = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].revenue : 0;
  const revTrend = latestMonthRevenue >= prevMonthRevenue;

  return (
    <div className="space-y-4">
      {/* ── Row 1: 4 stat chips ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <div className="p-1.5 rounded-lg bg-violet-50"><IndianRupee size={12} className="text-violet-600" /></div>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatK(totalRevenue)}</p>
          {monthlyData.length > 1 && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${revTrend ? 'text-green-600' : 'text-red-500'}`}>
              {revTrend ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              vs last month
            </div>
          )}
        </MiniCard>
        <MiniCard>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Profit</p>
            <div className="p-1.5 rounded-lg bg-cyan-50"><TrendingUp size={12} className="text-cyan-600" /></div>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatK(totalProfit)}</p>
          <p className="text-[11px] text-gray-400 mt-1">{profitMarginPct}% margin</p>
        </MiniCard>
      </div>

      {/* ── Row 2: Revenue over time (compact area) + Hires bar ──── */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard>
          <MiniTitle icon={<Activity size={12} />}>Revenue Trend</MiniTitle>
          {monthlyData.length > 0 ? (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cfProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatK} width={36} />
                  <RechartsTooltip content={<LightTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7B43F1" strokeWidth={1.5} fill="url(#cfRevGrad)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#06B6D4" strokeWidth={1.5} fill="url(#cfProfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[90px] flex items-center justify-center"><p className="text-xs text-gray-300">No data</p></div>
          )}
        </MiniCard>

        <MiniCard>
          <MiniTitle icon={<Users size={12} />}>Hires / Month</MiniTitle>
          {hiresByMonth.length > 0 ? (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hiresByMonth} margin={{ top: 2, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7B43F1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="hires" name="Hires" fill="url(#cfBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[90px] flex items-center justify-center"><p className="text-xs text-gray-300">No hires</p></div>
          )}
        </MiniCard>
      </div>

      {/* ── Row 3: Revenue breakdown + Profit margin trend ──────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Revenue contribution donut + progress bars */}
        <MiniCard>
          <MiniTitle>Revenue Split</MiniTitle>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-[70px] h-[70px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={20} outerRadius={32} paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {pieData.map((entry, i) => (
                  <div key={entry.name}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[10px] text-gray-500">{entry.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-700">{totalRevenue > 0 ? Math.round((entry.value / totalRevenue) * 100) : 0}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${totalRevenue > 0 ? (entry.value / totalRevenue) * 100 : 0}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs text-gray-300 text-center py-4">No revenue data</p>}
        </MiniCard>

        {/* Profit margin over time sparkline */}
        <MiniCard>
          <MiniTitle icon={<Percent size={12} />}>Profit Margin %</MiniTitle>
          {profitTrendData.length > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-xl font-bold text-gray-800">{profitMarginPct}%</span>
                <span className="text-xs text-gray-400">overall</span>
              </div>
              <div className="h-[55px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profitTrendData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="margin" name="Margin %" stroke="#10B981" strokeWidth={1.5} fill="url(#marginGrad)" dot={false} />
                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 10 }} formatter={(v: any) => [`${v}%`, 'Margin']} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <p className="text-xs text-gray-300 text-center py-4">No margin data</p>}
        </MiniCard>
      </div>

      {/* ── Row 4: Revenue source breakdown progress bars ─────────── */}
      <MiniCard>
        <MiniTitle>Revenue Sources</MiniTitle>
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <ProgressBar label="Permanent (FTE)" value={metrics.candidateRevenue} max={totalRevenue} color="#7B43F1" />
            <ProgressBar label="Contractual" value={metrics.employeeRevenueINR} max={totalRevenue} color="#06B6D4" />
          </div>
          <div>
            <ProgressBar label="Profit" value={totalProfit} max={totalRevenue} color="#10B981" />
            <ProgressBar label="Cost" value={costAmount} max={totalRevenue} color="#F59E0B" />
          </div>
        </div>
      </MiniCard>

      {/* ── Tracker Templates Section ─────────────────────────────── */}
{/* ── Export Tracker Templates ─────────────────────────────── */}
<MiniCard>
  <MiniTitle>Export Tracker Templates</MiniTitle>
  
  {/* Info banner */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 mb-3">
    <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
    <div className="text-xs text-blue-700">
      <p className="font-medium mb-1">Template Guide:</p>
      <ul className="list-disc list-inside space-y-0.5 text-blue-600">
        <li>Create templates to customize export columns for jobs</li>
        <li><strong>Default template</strong> is auto-applied when exporting</li>
        <li>Remove default to show template picker during export</li>
        <li>Changes apply immediately to all future exports</li>
      </ul>
    </div>
  </div>

  <div className="space-y-2">
    {templates.map((t, idx) => (
      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        t.is_default ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-transparent'
      }`}>
        <div className="flex items-center gap-2">
          {t.is_default ? (
            <Star size={14} className="text-amber-500 fill-amber-500" />
          ) : (
            <StarOff size={14} className="text-gray-300" />
          )}
          <span className="text-sm font-medium">{t.name}</span>
          <span className="text-[10px] text-gray-400">
            ({t.columns?.filter((c: any) => c.selected).length || 0} columns)
          </span>
          {t.is_default && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              Active Default
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(idx)}>
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(idx)}>
            <Trash2 size={13} />
          </Button>
          {t.is_default ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleRemoveDefault(idx)} 
              title="Remove as default"
              className="text-amber-600 hover:text-amber-800"
            >
              <Undo2 size={13} />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleSetDefault(idx)} 
              title="Set as default"
              className="text-gray-400 hover:text-amber-600"
            >
              <Star size={13} />
            </Button>
          )}
        </div>
      </div>
    ))}
    
    {templates.length === 0 && (
      <div className="text-center py-6">
        <FileSpreadsheet size={32} className="text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400 mb-1">No templates yet</p>
        <p className="text-xs text-gray-300">Create a template to customize exports</p>
      </div>
    )}
    
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleAddTemplate} 
      className="w-full justify-center gap-1"
    >
      <Plus size={14} /> Add Template
    </Button>
  </div>
</MiniCard>

{isTemplateEditorOpen && (
  <TemplateEditorDialog
    open={isTemplateEditorOpen}
    onOpenChange={setTemplateEditorOpen}
    initialColumns={editingTemplate?.columns || ALL_COLUMNS}
    initialTemplateName={editingTemplate?.name || ""}
    onSave={handleTemplateSave}
  />
)}
    </div>
  );
};

export default ClientFinancials;