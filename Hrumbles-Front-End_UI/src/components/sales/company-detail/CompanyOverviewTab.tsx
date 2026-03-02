// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
// ✅ ALL business logic preserved verbatim — UI restructured
// Changes: removed headcount/trends tab → replaced by EmployeeGrowthIntelligence
//          added DeptPiePanel on the right of insights card
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Settings, ChevronUp, ChevronDown, Search,
  Mail, Sparkles, Users, TrendingUp,
  DollarSign, Code2, Briefcase, Calendar,
  BarChart3, Activity, PieChart as PieIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';

// ── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  card:          "bg-white border border-[#E5E0D8] rounded-2xl overflow-hidden",
  sectionHeader: "flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8] bg-[#FDFCFB]",
  tabActive:     "border-b-2 border-[#5B4FE8] text-[#5B4FE8]",
  tabInactive:   "border-b-2 border-transparent text-[#9C9189] hover:text-[#6A6057] hover:border-[#E5E0D8]",
  filterActive:  "bg-[#5B4FE8] text-white",
  filterInactive:"text-[#6A6057] hover:bg-[#F0EDE8] hover:text-[#1C1916]",
};

const PIE_COLORS = [
  '#5B4FE8','#16A34A','#D97706','#DC2626',
  '#2563EB','#7C3AED','#DB2777','#059669',
  '#0891B2','#92400E','#1D4ED8','#065F46',
];

// ── Types ──────────────────────────────────────────────────────────────────
interface CompanyOverviewTabProps {
  company: any;
  refetchParent: () => void;
  employees?: any[];
  isLoadingEmployees?: boolean;
  onEditEmployee?: (emp: any) => void;
}

// ── Pie Tooltip ────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl shadow-lg px-3 py-2">
      <p className="text-[11px] font-[700] text-[#1C1916] capitalize">{d.name}</p>
      <p className="text-[12px] font-[800] text-[#5B4FE8] font-['DM_Mono',monospace]">
        {d.value.toLocaleString()}
        <span className="text-[10px] font-[500] text-[#9C9189] ml-1">({d.payload.pct}%)</span>
      </p>
    </div>
  );
};

// ── Department Pie Panel ───────────────────────────────────────────────────
const DeptPiePanel = ({ departments }: { departments: any[] }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const active = departments
    .filter(d => d.head_count > 0)
    .sort((a, b) => b.head_count - a.head_count);

  const total = active.reduce((s, d) => s + d.head_count, 0);

  const pieData = active.slice(0, 10).map(d => ({
    name: d.department_name?.replace(/_/g, ' ') || 'Unknown',
    value: d.head_count,
    pct: total > 0 ? ((d.head_count / total) * 100).toFixed(1) : '0',
  }));

  if (active.length > 10) {
    const rest = active.slice(10).reduce((s, d) => s + d.head_count, 0);
    pieData.push({ name: 'Other', value: rest, pct: total > 0 ? ((rest / total) * 100).toFixed(1) : '0' });
  }

  if (!active.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
        <PieIcon size={22} className="text-[#D5CFC5]" />
        <p className="text-[11px] text-[#9C9189]">No dept data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0EDE8] bg-[#FDFCFB]">
        <div className="w-6 h-6 rounded-lg bg-[#F0EEFF] flex items-center justify-center">
          <PieIcon size={12} className="text-[#5B4FE8]" />
        </div>
        <span className="text-[12px] font-[650] text-[#1C1916]">Dept Breakdown</span>
        <span className="ml-auto text-[10px] font-[700] text-[#9C9189] font-['DM_Mono',monospace]">
          {total.toLocaleString()}
        </span>
      </div>

      <div className="flex justify-center py-2">
        <ResponsiveContainer width={200} height={170}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={74}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, i) => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {pieData.map((_, i) => (
                <Cell
                  key={i}
                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                  opacity={hovered === null || hovered === i ? 1 : 0.4}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RTooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="px-4 pb-4 space-y-1 overflow-y-auto max-h-[240px]">
        {pieData.map((d, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-default transition-colors ${hovered === i ? 'bg-[#F8F6F3]' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-[11px] text-[#6A6057] truncate capitalize">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">{d.value.toLocaleString()}</span>
              <span className="text-[10px] text-[#9C9189] w-10 text-right font-['DM_Mono',monospace]">{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Framer variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const tabContent = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

// ── Main Component ─────────────────────────────────────────────────────────
export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({
  company,
  refetchParent,
  employees = [],
  isLoadingEmployees = false,
  onEditEmployee,
}) => {
  const navigate = useNavigate();
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [leadsOpen, setLeadsOpen]       = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [activeLeadFilter, setActiveLeadFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ── All logic preserved verbatim ─────────────────────────────────────────
  const enrichment  = company?.enrichment_organizations;
  const companyData = company?.company_data || {};

  const technologies = enrichment?.enrichment_org_technologies ||
    companyData?.current_technologies ||
    (companyData?.technologies ? companyData.technologies.map((t: string) => ({ name: t, category: 'Other' })) : []);

  const fundingEvents = enrichment?.enrichment_org_funding_events ||
    companyData?.funding_events || [];

  const departments = enrichment?.enrichment_org_departments || [];

  const keywords = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) ||
    companyData?.keywords || [];

  const employeeMetrics = companyData?.employee_metrics || [];

  const { data: suggestedLeads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['suggested-leads', company.id, company.apollo_org_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(photo_url, seniority),
          enrichment_contact_emails(email, email_status)
        `)
        .eq('company_id', company.id)
        .limit(50);
      return data || [];
    },
    enabled: !!company.id
  });

  const allPeople = useMemo(() => {
    const peopleMap = new Map();
    employees.forEach(e => peopleMap.set(e.id, e));
    suggestedLeads.forEach((l: any) => { if (!peopleMap.has(l.id)) peopleMap.set(l.id, l); });
    return Array.from(peopleMap.values());
  }, [employees, suggestedLeads]);

  const filteredLeads = allPeople.filter((lead: any) => {
    const matchesSearch = !searchTerm ||
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const seniority = lead.enrichment_people?.[0]?.seniority?.toLowerCase() || lead.seniority?.toLowerCase();
    const matchesFilter =
      activeLeadFilter === 'all' ||
      (activeLeadFilter === 'cxo'      && ['c_suite', 'owner', 'founder', 'cxo'].includes(seniority)) ||
      (activeLeadFilter === 'director' && ['director', 'vp', 'head', 'manager'].includes(seniority));
    return matchesSearch && matchesFilter;
  });

  const seniorityCount = useMemo(() => {
    const counts = { cxo: 0, director: 0 };
    allPeople.forEach((lead: any) => {
      const s = lead.enrichment_people?.[0]?.seniority?.toLowerCase() || lead.seniority?.toLowerCase() || '';
      if (['c_suite', 'owner', 'founder', 'cxo'].includes(s)) counts.cxo++;
      if (['director', 'vp', 'head', 'manager'].includes(s)) counts.director++;
    });
    return counts;
  }, [allPeople]);

  // 'trends' tab removed — headcount now in EmployeeGrowthIntelligence
  const insightTabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'technologies', label: 'Tech',    count: technologies.length },
    { id: 'funding',      label: 'Funding', count: fundingEvents.length },
    { id: 'keywords',     label: 'Keywords',count: keywords.length },
  ];

  const leadFilters = [
    { id: 'all',      label: 'All',  count: allPeople.length },
    { id: 'cxo',      label: 'CXO',  count: seniorityCount.cxo },
    { id: 'director', label: 'Dir+', count: seniorityCount.director },
  ];

  return (
    <div className="space-y-5 font-['DM_Sans',system-ui,sans-serif]">

      {/* ── Top: Insights Card + Pie Panel ────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* Insights — flex-1 */}
        <motion.div
          className={`${T.card} flex-1 min-w-0`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={T.sectionHeader}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F0EEFF] flex items-center justify-center">
                <BarChart3 size={14} className="text-[#5B4FE8]" />
              </div>
              <span className="text-[13px] font-[650] text-[#1C1916] tracking-[-0.01em]">Company Insights</span>
            </div>
            <div className="flex items-center gap-1">
              <motion.button className="w-7 h-7 rounded-lg hover:bg-[#F0EDE8] transition-colors flex items-center justify-center" whileTap={{ scale: 0.9 }}>
                <Settings size={13} className="text-[#9C9189]" />
              </motion.button>
              <motion.button
                className="w-7 h-7 rounded-lg hover:bg-[#F0EDE8] transition-colors flex items-center justify-center"
                onClick={() => setInsightsOpen(!insightsOpen)}
                whileTap={{ scale: 0.9 }}
              >
                {insightsOpen ? <ChevronUp size={13} className="text-[#9C9189]" /> : <ChevronDown size={13} className="text-[#9C9189]" />}
              </motion.button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.div
                key="insights-body"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ overflow: 'hidden' }}
              >
                {/* Tab nav */}
                <div className="flex border-b border-[#F0EDE8] px-5 bg-[#FAFAF9] overflow-x-auto">
                  {insightTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInsightTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-[600] whitespace-nowrap transition-colors duration-150 ${activeInsightTab === tab.id ? T.tabActive : T.tabInactive}`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`text-[9px] font-[700] px-1.5 py-0.5 rounded-full ${activeInsightTab === tab.id ? 'bg-[#F0EEFF] text-[#5B4FE8]' : 'bg-[#F0EDE8] text-[#9C9189]'}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div key={activeInsightTab} variants={tabContent} initial="hidden" animate="visible" exit="exit">
                      {activeInsightTab === 'overview'     && <OverviewInsights company={company} enrichment={enrichment} companyData={companyData} />}
                      {activeInsightTab === 'technologies' && <TechnologiesInsights technologies={technologies} />}
                      {activeInsightTab === 'funding'      && <FundingInsights fundingEvents={fundingEvents} enrichment={enrichment} companyData={companyData} />}
                      {activeInsightTab === 'keywords'     && <KeywordsInsights keywords={keywords} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Dept Pie — 260px fixed */}
        {departments.length > 0 && (
          <motion.div
            className={`${T.card} w-[260px] min-w-[260px] flex-shrink-0`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <DeptPiePanel departments={departments} />
          </motion.div>
        )}
      </div>

      {/* ── People Card ───────────────────────────────────────────────────── */}
      <motion.div
        className={T.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className={T.sectionHeader}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Users size={14} className="text-[#2563EB]" />
            </div>
            <span className="text-[13px] font-[650] text-[#1C1916] tracking-[-0.01em]">People at {company.name}</span>
            <span className="text-[10px] font-[700] px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] rounded-full">{allPeople.length}</span>
          </div>
          <motion.button className="w-7 h-7 rounded-lg hover:bg-[#F0EDE8] transition-colors flex items-center justify-center" onClick={() => setLeadsOpen(!leadsOpen)} whileTap={{ scale: 0.9 }}>
            {leadsOpen ? <ChevronUp size={13} className="text-[#9C9189]" /> : <ChevronDown size={13} className="text-[#9C9189]" />}
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {leadsOpen && (
            <motion.div
              key="leads-body"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ overflow: 'hidden' }}
            >
              {/* Filter bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F0EDE8] bg-[#FAFAF9]">
                <div className="flex items-center gap-1">
                  {leadFilters.map(f => (
                    <motion.button
                      key={f.id}
                      onClick={() => setActiveLeadFilter(f.id)}
                      className={`px-2.5 py-1 text-[11px] font-[600] rounded-lg transition-colors duration-120 ${activeLeadFilter === f.id ? T.filterActive : T.filterInactive}`}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    >
                      {f.label}
                      {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
                    </motion.button>
                  ))}
                </div>
                <div className="ml-auto relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C9189]" />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 w-44 pl-7 pr-3 text-[11px] border border-[#E5E0D8] rounded-lg bg-white text-[#1C1916] placeholder-[#C4BDB5] focus:outline-none focus:border-[#5B4FE8] transition-colors"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F0EDE8] bg-[#FAFAF9]">
                      {['Name','Title','Email','Location'].map((h, i) => (
                        <th key={i} className="text-left px-5 py-2.5 text-[10px] font-[700] text-[#9C9189] uppercase tracking-[0.08em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8F6F3]">
                    {(isLoadingLeads || isLoadingEmployees) ? (
                      <tr><td colSpan={4} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-7 h-7 rounded-full border-2 border-[#E5E0D8] border-t-[#5B4FE8] animate-spin" />
                          <p className="text-[11px] text-[#9C9189]">Loading people...</p>
                        </div>
                      </td></tr>
                    ) : filteredLeads.length > 0 ? (
                      filteredLeads.slice(0, 10).map((lead: any, idx: number) => (
                        <LeadRow key={lead.id} lead={lead} onEdit={onEditEmployee} navigate={navigate} index={idx} />
                      ))
                    ) : (
                      <tr><td colSpan={4} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
                            <Users size={18} className="text-[#D5CFC5]" />
                          </div>
                          <p className="text-[12px] text-[#9C9189]">No people found</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredLeads.length > 10 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0EDE8] bg-[#FAFAF9]">
                  <span className="text-[11px] text-[#9C9189]">Showing 10 of {filteredLeads.length}</span>
                  <motion.button className="px-3 py-1.5 text-[11px] font-[600] text-[#5B4FE8] border border-[#D9D4FF] bg-[#F0EEFF] rounded-lg hover:bg-[#E8E4FF] transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    View all {filteredLeads.length} people
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ── Lead Row ───────────────────────────────────────────────────────────────
const LeadRow = ({ lead, onEdit, navigate, index }: any) => {
  const seniority = lead.enrichment_people?.[0]?.seniority || lead.seniority;
  const hasEmail  = lead.email || (lead.enrichment_contact_emails?.length > 0);
  const location  = [lead.city, lead.state].filter(Boolean).join(', ') || lead.country;
  return (
    <motion.tr
      className="group hover:bg-[#F8F6F3] transition-colors duration-100 cursor-pointer"
      custom={index} variants={fadeUp} initial="hidden" animate="visible"
      onClick={() => onEdit?.(lead)}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#F0EDE8] border border-[#E5E0D8] flex-shrink-0 overflow-hidden">
            {(lead.photo_url || lead.enrichment_people?.[0]?.photo_url) ? (
              <img src={lead.photo_url || lead.enrichment_people?.[0]?.photo_url} alt={lead.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[9px] font-[700] text-[#6A6057]">
                {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-[12px] font-[600] text-[#1C1916] group-hover:text-[#5B4FE8] transition-colors leading-tight">{lead.name}</p>
            {seniority && (
              <span className="text-[9px] font-[600] px-1.5 py-0.5 bg-[#F0EDE8] text-[#9C9189] rounded-md uppercase tracking-[0.04em]">
                {seniority.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="text-[12px] text-[#6A6057] truncate max-w-[200px]">{lead.job_title || lead.designation || <span className="text-[#D5CFC5]">—</span>}</p>
      </td>
      <td className="px-5 py-3">
        {hasEmail ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-[600] px-2 py-1 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] rounded-md">
            <Mail size={9} />Available
          </span>
        ) : <span className="text-[12px] text-[#D5CFC5]">—</span>}
      </td>
      <td className="px-5 py-3">
        <span className="text-[12px] text-[#6A6057]">{location || <span className="text-[#D5CFC5]">—</span>}</span>
      </td>
    </motion.tr>
  );
};

// ── Overview Insights ──────────────────────────────────────────────────────
const OverviewInsights = ({ company, enrichment, companyData }: any) => {
  const stats = [
    { label: 'Revenue',       value: enrichment?.annual_revenue_printed || company?.revenue,            icon: DollarSign, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]',  border: 'border-[#BBF7D0]' },
    { label: 'Employees',     value: enrichment?.estimated_num_employees || company?.employee_count,    icon: Users,       color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]',  border: 'border-[#BFDBFE]',
      format: (v: number) => v?.toLocaleString() },
    { label: 'Founded',       value: enrichment?.founded_year || company?.founded_year,                 icon: Calendar,    color: 'text-[#5B4FE8]', bg: 'bg-[#F0EEFF]',  border: 'border-[#D9D4FF]' },
    { label: 'Total Funding', value: enrichment?.total_funding_printed || companyData?.total_funding,   icon: TrendingUp,  color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]',  border: 'border-[#FDE68A]' },
  ].filter(s => s.value);

  const industries    = enrichment?.industries || companyData?.industries || [];
  const tradingSymbol = enrichment?.publicly_traded_symbol || companyData?.publicly_traded_symbol;
  const tradingExchange = enrichment?.publicly_traded_exchange || companyData?.publicly_traded_exchange;

  return (
    <div className="space-y-5">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            const val = (stat as any).format ? (stat as any).format(stat.value) : stat.value;
            return (
              <motion.div key={idx} custom={idx} variants={fadeUp} initial="hidden" animate="visible"
                className={`rounded-xl p-4 border ${stat.bg} ${stat.border}`} whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}>
                <Icon size={14} className={`${stat.color} mb-2`} />
                <p className="text-[9px] font-[700] text-[#9C9189] uppercase tracking-[0.08em]">{stat.label}</p>
                <p className="text-[18px] font-[800] text-[#1C1916] mt-1 font-['DM_Mono',monospace] leading-none tracking-[-0.02em]">{val}</p>
              </motion.div>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {tradingSymbol && (
          <div className="rounded-xl p-4 border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]">
            <Activity size={13} className="text-[#16A34A] mb-2" />
            <p className="text-[9px] font-[700] text-[#16A34A] uppercase tracking-[0.08em]">Listed</p>
            <p className="text-[14px] font-[800] text-[#14532D] font-['DM_Mono',monospace]">{tradingExchange?.toUpperCase()}: {tradingSymbol}</p>
          </div>
        )}
        {industries.length > 0 && (
          <div className="rounded-xl p-4 border border-[#D9D4FF] bg-gradient-to-br from-[#F0EEFF] to-[#EDE9FE]">
            <Briefcase size={13} className="text-[#5B4FE8] mb-2" />
            <p className="text-[9px] font-[700] text-[#5B4FE8] uppercase tracking-[0.08em]">Industries</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {industries.slice(0, 3).map((ind: string, idx: number) => (
                <span key={idx} className="text-[10px] font-[500] px-2 py-0.5 bg-white text-[#5B4FE8] border border-[#D9D4FF] rounded-md">{ind}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {(enrichment?.short_description || company?.about) && (
        <div className="bg-[#F8F6F3] rounded-xl p-4 border border-[#EDE9E3]">
          <p className="text-[12px] text-[#6A6057] leading-[1.65]">{enrichment?.short_description || company?.about}</p>
        </div>
      )}
    </div>
  );
};

// ── Technologies Insights ──────────────────────────────────────────────────
const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (!technologies.length) return <EmptyState message="No technologies detected" icon={<Code2 size={20} />} />;
  const grouped = technologies.reduce((acc: any, tech: any) => {
    const cat = tech.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tech);
    return acc;
  }, {});
  const catColors: Record<string, string> = {
    'Email Providers':'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    'Analytics':      'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
    'CRM':            'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
    'Cloud':          'bg-[#F0EEFF] text-[#5B4FE8] border-[#D9D4FF]',
    'Load Balancers': 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    'Other':          'bg-[#F0EDE8] text-[#6A6057] border-[#E5E0D8]',
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F0EEFF] border border-[#D9D4FF] rounded-xl">
        <Code2 size={15} className="text-[#5B4FE8]" />
        <span className="text-[13px] font-[650] text-[#5B4FE8]">{technologies.length} technologies detected</span>
      </div>
      {Object.entries(grouped).slice(0, 6).map(([cat, techs]: [string, any]) => {
        const style = catColors[cat] || catColors['Other'];
        return (
          <div key={cat}>
            <p className="text-[10px] font-[700] uppercase tracking-[0.07em] text-[#9C9189] mb-2">{cat} <span className="text-[#C4BDB5]">({techs.length})</span></p>
            <div className="flex flex-wrap gap-1.5">
              {techs.slice(0, 10).map((tech: any, idx: number) => (
                <span key={idx} className={`text-[10px] font-[500] px-2 py-0.5 rounded-md border ${style}`}>{tech.name}</span>
              ))}
              {techs.length > 10 && <span className="text-[10px] text-[#9C9189] self-center">+{techs.length - 10}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Funding Insights ───────────────────────────────────────────────────────
const FundingInsights = ({ fundingEvents, enrichment, companyData }: any) => {
  const totalFunding = enrichment?.total_funding_printed || companyData?.total_funding;
  const latestStage  = enrichment?.latest_funding_stage  || companyData?.funding_stage;
  if (!fundingEvents.length && !totalFunding) return <EmptyState message="No funding data available" icon={<DollarSign size={20} />} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {totalFunding && (
          <div className="rounded-xl p-4 border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]">
            <DollarSign size={14} className="text-[#16A34A] mb-2" />
            <p className="text-[9px] font-[700] text-[#16A34A] uppercase tracking-[0.08em]">Total Raised</p>
            <p className="text-[22px] font-[800] text-[#14532D] mt-1 font-['DM_Mono',monospace] leading-none">{totalFunding}</p>
          </div>
        )}
        {latestStage && (
          <div className="rounded-xl p-4 border border-[#D9D4FF] bg-gradient-to-br from-[#F0EEFF] to-[#EDE9FE]">
            <TrendingUp size={14} className="text-[#5B4FE8] mb-2" />
            <p className="text-[9px] font-[700] text-[#5B4FE8] uppercase tracking-[0.08em]">Latest Stage</p>
            <p className="text-[14px] font-[700] text-[#3730A3] mt-1">{latestStage}</p>
          </div>
        )}
      </div>
      {fundingEvents.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-[700] text-[#9C9189] uppercase tracking-[0.08em]">History</p>
          {fundingEvents.map((event: any, idx: number) => (
            <motion.div key={idx} className="bg-white border border-[#E5E0D8] rounded-xl p-3 hover:border-[#5B4FE8] transition-colors"
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-[700] px-2 py-0.5 bg-[#F0EEFF] text-[#5B4FE8] rounded-md">{event.type || 'Funding Round'}</span>
                {event.date && <span className="text-[10px] text-[#9C9189] font-['DM_Mono',monospace]">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
              {event.amount && <p className="text-[15px] font-[800] text-[#1C1916] font-['DM_Mono',monospace]">{event.currency || '$'}{event.amount}</p>}
              {event.investors && <p className="text-[10px] text-[#9C9189] mt-0.5 truncate">from {event.investors}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Keywords Insights ──────────────────────────────────────────────────────
const KeywordsInsights = ({ keywords }: { keywords: string[] }) => {
  if (!keywords.length) return <EmptyState message="No keywords available" icon={<Sparkles size={20} />} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
        <Sparkles size={15} className="text-[#D97706]" />
        <span className="text-[13px] font-[650] text-[#D97706]">{keywords.length} keywords & signals</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw: string, idx: number) => (
          <motion.span key={idx} className="inline-flex text-[11px] font-[500] px-2.5 py-1 bg-white text-[#6A6057] border border-[#E5E0D8] rounded-lg hover:border-[#5B4FE8] hover:text-[#5B4FE8] transition-colors cursor-default"
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.01 }}>
            {kw}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ message, icon }: { message: string; icon: React.ReactNode }) => (
  <div className="py-10 flex flex-col items-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-[#F0EDE8] flex items-center justify-center text-[#D5CFC5]">{icon}</div>
    <p className="text-[12px] font-[500] text-[#9C9189]">{message}</p>
  </div>
);

export default CompanyOverviewTab;
// 2