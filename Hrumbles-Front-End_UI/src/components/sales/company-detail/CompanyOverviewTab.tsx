// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
// ✅ ALL business logic preserved verbatim — UI restructured
// Changes: Dynamic Seniority Filters from enrichment_person_metadata
//          Fallback display for Email/Phone from enrichment tables
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Settings, ChevronUp, ChevronDown, Search,
  Mail, Sparkles, Users, TrendingUp,
  DollarSign, Code2, Briefcase, Calendar,
  BarChart3, Activity, PieChart as PieIcon, Phone, Copy, ChevronLeft, ChevronRight, Eye
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


// ── Contact Hover Tooltip + Copy ───────────────────────────────────────────
// ── Updated ContactCell (Tooltip now appears ABOVE the icons) ──────────────
const ContactCell = ({ email, phone }: { email?: string | null; phone?: string | null }) => {
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null);

  const copy = (text: string, type: 'email' | 'phone', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 1400);
    });
  };

  if (!email && !phone) return <span className="text-[#D5CFC5]">—</span>;

  return (
    <div className="relative group/contact">
      {/* Trigger Icons */}
      <div className="flex items-center gap-2">
        {email && (
          <div className="w-6 h-6 bg-[#F0FDF4] text-[#16A34A] rounded-lg flex items-center justify-center border border-[#BBF7D0]">
            <Mail size={13} />
          </div>
        )}
        {phone && (
          <div className="w-6 h-6 bg-[#F0EEFF] text-[#5B4FE8] rounded-lg flex items-center justify-center border border-[#D9D4FF]">
            <Phone size={13} />
          </div>
        )}
      </div>

      {/* Tooltip – NOW APPEARS ABOVE */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/contact:block z-100 w-80 bg-white border border-[#E5E0D8] rounded-2xl shadow-2xl p-4">
        <div className="space-y-4">
          {email && (
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="uppercase text-[10px] font-[700] tracking-[0.5px] text-[#9C9189]">EMAIL</div>
                <div className="text-[13px] text-[#1C1916] font-medium break-all mt-0.5 pr-2">{email}</div>
              </div>
              <button
                onClick={(e) => copy(email, 'email', e)}
                className="ml-3 flex-shrink-0 p-2 rounded-xl hover:bg-[#F0FDF4] transition-colors"
              >
                {copied === 'email' ? (
                  <span className="text-emerald-600 text-xs font-semibold">✓ Copied</span>
                ) : (
                  <Copy size={15} className="text-[#16A34A]" />
                )}
              </button>
            </div>
          )}

          {phone && (
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="uppercase text-[10px] font-[700] tracking-[0.5px] text-[#9C9189]">PHONE</div>
                <div className="text-[13px] text-[#1C1916] font-medium mt-0.5">{phone}</div>
              </div>
              <button
                onClick={(e) => copy(phone, 'phone', e)}
                className="ml-3 flex-shrink-0 p-2 rounded-xl hover:bg-[#F0EEFF] transition-colors"
              >
                {copied === 'phone' ? (
                  <span className="text-emerald-600 text-xs font-semibold">✓ Copied</span>
                ) : (
                  <Copy size={15} className="text-[#5B4FE8]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Arrow pointing DOWN (now at bottom of tooltip) */}
        <div className="absolute -bottom-1 left-6 w-3 h-3 bg-white border-r border-b border-[#E5E0D8] rotate-45" />
      </div>
    </div>
  );
};

// ── Pagination Controls ────────────────────────────────────────────────────
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#F0EDE8] bg-[#FAFAF9]">
      <div className="text-[11px] text-[#9C9189]">
        Showing {(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, totalItems)} of {totalItems}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-xl hover:bg-white disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={17} />
        </motion.button>

        <div className="px-4 py-1 bg-white border border-[#E5E0D8] rounded-2xl text-[13px] font-medium text-[#6A6057]">
          Page {currentPage} of {totalPages}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl hover:bg-white disabled:opacity-40 transition-colors"
        >
          <ChevronRight size={17} />
        </motion.button>
      </div>
    </div>
  );
};

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

    // ── Pagination state ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // ── All logic preserved ─────────────────────────────────────────
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

  // Combine passed employees with internal query for suggestions
  const { data: suggestedLeads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['suggested-leads', company.id, company.apollo_org_id],
    queryFn: async () => {
      // Just a fallback in case parent didn't pass employees, but usually parent handles this now
      return []; 
    },
    enabled: false // Logic moved to parent
  });

  const allPeople = useMemo(() => {
    // Parent passes 'employees' which contains both direct and apollo ones
    return employees; 
  }, [employees]);

  // ── Dynamic Filters Calculation ──────────────────────────────────────────
  // Extracts unique seniority levels from enrichment metadata or raw fields
  const { leadFilters, seniorityCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const seniorityMap = new Map();

    allPeople.forEach((lead: any) => {
      // Prioritize enrichment metadata -> direct seniority -> unknown
      let s = lead.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || 
              lead.seniority || 
              'other';
      
      s = s.toLowerCase().replace(/_/g, ' ');

      // Normalize common terms
      if (s === 'c_suite' || s === 'owner' || s === 'founder' || s === 'cxo' || s === 'partner') s = 'cxo';
      if (s === 'vice president') s = 'vp';
      if (!s) s = 'other';

      counts[s] = (counts[s] || 0) + 1;
      
      // Store normalized seniority back on the object for filtering speed (optional, good for perf)
      lead._normalizedSeniority = s;
    });

    // Define display order and labels
    const priority = ['cxo', 'vp', 'director', 'manager', 'senior', 'entry', 'other'];
    const labels: Record<string, string> = {
      cxo: 'CXO', vp: 'VP', director: 'Director', manager: 'Manager', senior: 'Senior', entry: 'Entry', other: 'Other'
    };

    const filters = [
      { id: 'all', label: 'All', count: allPeople.length },
      ...priority
        .filter(key => counts[key] > 0)
        .map(key => ({
          id: key,
          label: labels[key] || key,
          count: counts[key]
        }))
    ];

    return { leadFilters: filters, seniorityCounts: counts };
  }, [allPeople]);

  // ── Filter Logic ─────────────────────────────────────────────────────────
  // ── Filtered Leads ─────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return allPeople.filter((lead: any) => {
      const matchesSearch = !searchTerm ||
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const normalizedSeniority = lead._normalizedSeniority;
      
      const matchesFilter =
        activeLeadFilter === 'all' ||
        normalizedSeniority === activeLeadFilter;

      return matchesSearch && matchesFilter;
    });
  }, [allPeople, searchTerm, activeLeadFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredLeads, currentPage]);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeLeadFilter, searchTerm]);

  const insightTabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'technologies', label: 'Tech',    count: technologies.length },
    { id: 'funding',      label: 'Funding', count: fundingEvents.length },
    { id: 'keywords',     label: 'Keywords',count: keywords.length },
  ];

  return (
    <div className="space-y-5 font-['DM_Sans',system-ui,sans-serif]">

      {/* ── Top: Insights Card + Pie Panel ────────────────────────────────── */}
      <div className="flex gap-6 items-stretch min-h-[460px]">

        {/* Company Insights */}
        <motion.div
          className={`${T.card} flex-1 min-w-0 overflow-hidden flex flex-col`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={T.sectionHeader}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-violet-100 flex items-center justify-center">
                <BarChart3 size={16} className="text-violet-600" />
              </div>
              <span className="text-[14px] font-semibold text-slate-900 tracking-tight">Company Insights</span>
            </div>

            <motion.button
              className="w-8 h-8 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center"
              onClick={() => setInsightsOpen(!insightsOpen)}
              whileTap={{ scale: 0.92 }}
            >
              {insightsOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </motion.button>
          </div>

          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.div
                key="insights-body"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                {/* Modern Tab Navigation */}
                <div className="flex border-b border-slate-100 bg-slate-50/80 px-6 overflow-x-auto no-scrollbar">
                  {insightTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInsightTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-all
                        ${activeInsightTab === tab.id 
                          ? 'border-violet-600 text-violet-700' 
                          : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeInsightTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-auto bg-white">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeInsightTab} 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
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

        {/* Dept Pie Panel */}
        {departments.length > 0 && (
          <motion.div
            className={`${T.card} w-[272px] min-w-[272px] flex-shrink-0 h-full flex flex-col`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
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
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {leadFilters.map(f => (
                    <motion.button
                      key={f.id}
                      onClick={() => setActiveLeadFilter(f.id)}
                      className={`px-2.5 py-1 text-[11px] font-[600] rounded-lg transition-colors duration-120 whitespace-nowrap ${activeLeadFilter === f.id ? T.filterActive : T.filterInactive}`}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                    >
                      {f.label}
                      {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
                    </motion.button>
                  ))}
                </div>
                <div className="ml-auto relative flex-shrink-0">
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
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F0EDE8] bg-[#FAFAF9]">
                      {['Name', 'Title', 'Contact', 'Location', 'Actions'].map((h, i) => (
                        <th key={i} className="text-left px-5 py-3 text-[10px] font-[700] text-[#9C9189] uppercase tracking-[0.08em]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8F6F3]">
                    {isLoadingEmployees ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-7 h-7 rounded-full border-2 border-[#E5E0D8] border-t-[#5B4FE8] animate-spin" />
                            <p className="text-[11px] text-[#9C9189]">Loading people...</p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedLeads.length > 0 ? (
                      paginatedLeads.map((lead: any, idx: number) => (
                        <LeadRow
                          key={lead.id || idx}
                          lead={lead}
                          onEdit={onEditEmployee}
                          index={idx}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
                              <Users size={18} className="text-[#D5CFC5]" />
                            </div>
                            <p className="text-[12px] text-[#9C9189]">No people found matching filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredLeads.length}
              />

             
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ── Lead Row ───────────────────────────────────────────────────────────────
// ── Lead Row (Updated – Actions column only) ───────────────────────────────
const LeadRow = ({ lead, onEdit, index }: any) => {
  const seniority = lead.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || lead.seniority;
  
  const email = lead.email || (lead.enrichment_contact_emails?.length > 0 ? lead.enrichment_contact_emails[0].email : null);
  const phone = lead.mobile || lead.phone_number || (lead.enrichment_contact_phones?.length > 0 ? lead.enrichment_contact_phones[0].number : null);
  
  const location = [lead.city, lead.state].filter(Boolean).join(', ') || lead.country || '—';
  const photo = lead.photo_url || lead.enrichment_people?.[0]?.photo_url;

  return (
    <motion.tr
      className="group hover:bg-[#F8F6F3] transition-colors duration-100"
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      {/* Name */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-[#F0EDE8] border border-[#E5E0D8] flex-shrink-0 overflow-hidden">
            {photo ? (
              <img src={photo} alt={lead.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-[700] text-[#6A6057]">
                {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1C1916] group-hover:text-[#5B4FE8] transition-colors">
              {lead.name}
            </p>
            {seniority && (
              <span className="text-[9px] font-[600] px-1.5 py-0.5 bg-[#F0EDE8] text-[#9C9189] rounded-md uppercase tracking-[0.04em]">
                {seniority.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Title */}
      <td className="px-5 py-4">
        <p className="text-[13px] text-[#6A6057] truncate max-w-[240px]">
          {lead.job_title || lead.designation || <span className="text-[#D5CFC5]">—</span>}
        </p>
      </td>

      {/* Contact – Hover Tooltip */}
      <td className="px-5 py-4">
        <ContactCell email={email} phone={phone} />
      </td>

      {/* Location */}
      <td className="px-5 py-4">
        <span className="text-[13px] text-[#6A6057]">{location}</span>
      </td>

      {/* Actions Column */}
      <td className="px-5 py-4 text-right">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(lead);
          }}
          className="p-2.5 text-[#9C9189] hover:text-[#5B4FE8] hover:bg-[#F0EEFF] rounded-2xl transition-all"
          title="View / Edit"
        >
          <Eye size={17} />
        </motion.button>
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
 <div className="space-y-3">
  {/* SINGLE LINE ROW */}
  <div className="flex flex-wrap items-center gap-2">
    {/* Stats */}
    {stats.map((stat, idx) => {
      const Icon = stat.icon;
      const val = (stat as any).format
        ? (stat as any).format(stat.value)
        : stat.value;

      return (
        <motion.div
          key={idx}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${stat.bg} ${stat.border}`}
          whileHover={{ scale: 1.04 }}
        >
          <Icon size={11} className={stat.color} />
          <span className="text-[9px] font-[700] uppercase tracking-wide text-[#9C9189]">
            {stat.label}
          </span>
          <span className="text-[11px] font-[800] text-[#1C1916] font-['DM_Mono',monospace]">
            {val}
          </span>
        </motion.div>
      );
    })}

    {/* Trading Info */}
    {tradingSymbol && (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4]">
        <Activity size={11} className="text-[#16A34A]" />
        <span className="text-[9px] font-[700] uppercase text-[#16A34A]">
          {tradingExchange?.toUpperCase()}
        </span>
        <span className="text-[11px] font-[800] text-[#14532D] font-['DM_Mono',monospace]">
          {tradingSymbol}
        </span>
      </div>
    )}

    {/* Industries */}
    {industries.length > 0 && (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[#D9D4FF] bg-[#F0EEFF]">
        <Briefcase size={11} className="text-[#5B4FE8]" />
        {industries.slice(0, 2).map((ind: string, idx: number) => (
          <span
            key={idx}
            className="text-[9px] font-[600] px-1.5 py-0.5 rounded bg-white text-[#5B4FE8] border border-[#D9D4FF]"
          >
            {ind}
          </span>
        ))}
        {industries.length > 2 && (
          <span className="text-[9px] font-[700] text-[#5B4FE8]">
            +{industries.length - 2}
          </span>
        )}
      </div>
    )}
  </div>

  {/* DESCRIPTION */}
  {(enrichment?.short_description || company?.about) && (
    <div className="bg-[#F0EEFF] rounded-xl p-4 border border-[#EDE9E3]">
      <p className="text-[12px] text-[#6A6057] leading-[1.65]">
        {enrichment?.short_description || company?.about}
      </p>
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
// ── Company Overview Tab ───────────────────────────────────────────────────