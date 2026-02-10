// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, ChevronUp, ChevronDown, Search, Filter, ChevronLeft, 
  ChevronRight, Mail, Sparkles, Star, Users, TrendingUp, TrendingDown,
  DollarSign, Code2, Briefcase, Calendar, Building2, ExternalLink,
  Globe, BarChart3, PieChart, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CompanyOverviewTabProps {
  company: any;
  refetchParent: () => void;
  employees?: any[];
  isLoadingEmployees?: boolean;
  onEditEmployee?: (emp: any) => void;
}

export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({ 
  company, 
  refetchParent,
  employees = [],
  isLoadingEmployees = false,
  onEditEmployee 
}) => {
  const navigate = useNavigate();
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [leadsOpen, setLeadsOpen] = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [activeLeadFilter, setActiveLeadFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const enrichment = company?.enrichment_organizations;
  const companyData = company?.company_data || {};
  
  // Extract data from enrichment tables
  const technologies = enrichment?.enrichment_org_technologies || 
                       companyData?.current_technologies ||
                       (companyData?.technologies ? companyData.technologies.map((t: string) => ({ name: t, category: 'Other' })) : []);
  
  const fundingEvents = enrichment?.enrichment_org_funding_events || 
                        companyData?.funding_events || 
                        [];
  
  const departments = enrichment?.enrichment_org_departments || [];
  
  const keywords = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) || 
                   companyData?.keywords || 
                   [];

  // Employee metrics from company_data
  const employeeMetrics = companyData?.employee_metrics || [];

  // Fetch suggested leads (people at this company)
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

  // Combine employees and suggested leads
  const allPeople = useMemo(() => {
    const peopleMap = new Map();
    employees.forEach(e => peopleMap.set(e.id, e));
    suggestedLeads.forEach((l: any) => {
      if (!peopleMap.has(l.id)) peopleMap.set(l.id, l);
    });
    return Array.from(peopleMap.values());
  }, [employees, suggestedLeads]);

  // Filter leads
  const filteredLeads = allPeople.filter((lead: any) => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const seniority = lead.enrichment_people?.[0]?.seniority?.toLowerCase() || lead.seniority?.toLowerCase();
    const matchesFilter = 
      activeLeadFilter === 'all' ||
      (activeLeadFilter === 'cxo' && ['c_suite', 'owner', 'founder', 'cxo'].includes(seniority)) ||
      (activeLeadFilter === 'director' && ['director', 'vp', 'head', 'manager'].includes(seniority));
    
    return matchesSearch && matchesFilter;
  });

  // Count by seniority for filter badges
  const seniorityCount = useMemo(() => {
    const counts = { cxo: 0, director: 0 };
    allPeople.forEach((lead: any) => {
      const seniority = lead.enrichment_people?.[0]?.seniority?.toLowerCase() || lead.seniority?.toLowerCase() || '';
      if (['c_suite', 'owner', 'founder', 'cxo'].includes(seniority)) counts.cxo++;
      if (['director', 'vp', 'head', 'manager'].includes(seniority)) counts.director++;
    });
    return counts;
  }, [allPeople]);

  const insightTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'technologies', label: 'Technologies', count: technologies.length },
    { id: 'funding', label: 'Funding', count: fundingEvents.length },
    { id: 'trends', label: 'Employee Trends', count: departments.filter((d: any) => d.head_count > 0).length },
    { id: 'keywords', label: 'Keywords', count: keywords.length },
  ];

  const leadFilters = [
    { id: 'all', label: 'All', count: allPeople.length },
    { id: 'cxo', label: 'CXO', count: seniorityCount.cxo },
    { id: 'director', label: 'Director+', count: seniorityCount.director },
  ];

  return (
    <div className="space-y-4">
      {/* Company Insights Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900">Company Insights</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
              <Settings size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={() => setInsightsOpen(!insightsOpen)}
            >
              {insightsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>

        {insightsOpen && (
          <>
            {/* Insight Tabs */}
            <div className="border-b border-gray-100 px-4 bg-gray-50/50">
              <div className="flex gap-0 overflow-x-auto">
                {insightTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInsightTab(tab.id)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                      activeInsightTab === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <Badge className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 border-none px-1.5">{tab.count}</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Insight Content */}
            <div className="p-4">
              {activeInsightTab === 'overview' && (
                <OverviewInsights company={company} enrichment={enrichment} companyData={companyData} />
              )}
              {activeInsightTab === 'technologies' && (
                <TechnologiesInsights technologies={technologies} />
              )}
              {activeInsightTab === 'trends' && (
                <EmployeeTrendsInsights departments={departments} employeeMetrics={employeeMetrics} />
              )}
              {activeInsightTab === 'funding' && (
                <FundingInsights fundingEvents={fundingEvents} enrichment={enrichment} companyData={companyData} />
              )}
              {activeInsightTab === 'keywords' && (
                <KeywordsInsights keywords={keywords} />
              )}
            </div>
          </>
        )}
      </div>

      {/* People / Leads Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-900">People at {company.name}</span>
            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-none">{allPeople.length}</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            onClick={() => setLeadsOpen(!leadsOpen)}
          >
            {leadsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>

        {leadsOpen && (
          <>
            {/* Filters */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 bg-gray-50/30">
              <div className="flex items-center gap-1">
                {leadFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveLeadFilter(filter.id)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                      activeLeadFilter === filter.id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {filter.label}
                    {filter.count > 0 && (
                      <span className="ml-1 text-[10px] opacity-60">({filter.count})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search people..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 w-40 pl-7 text-xs border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-4 py-2">
                      <Checkbox className="h-3.5 w-3.5" />
                    </th>
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(isLoadingLeads || isLoadingEmployees) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="animate-spin w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full mx-auto" />
                        <p className="text-xs text-gray-500 mt-2">Loading people...</p>
                      </td>
                    </tr>
                  ) : filteredLeads.length > 0 ? (
                    filteredLeads.slice(0, 10).map((lead: any) => (
                      <LeadRow key={lead.id} lead={lead} onEdit={onEditEmployee} navigate={navigate} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No people found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredLeads.length > 10 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                <span className="text-xs text-gray-500">
                  Showing 1-10 of {filteredLeads.length}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  View all {filteredLeads.length} people
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Lead Row Component
const LeadRow = ({ lead, onEdit, navigate }: { lead: any; onEdit?: (l: any) => void; navigate: any }) => {
  const seniority = lead.enrichment_people?.[0]?.seniority || lead.seniority;
  const hasEmail = lead.email || (lead.enrichment_contact_emails?.length > 0);
  const location = [lead.city, lead.state].filter(Boolean).join(', ') || lead.country;

  return (
    <tr className="hover:bg-blue-50/30 transition-colors group">
      <td className="px-4 py-2.5">
        <Checkbox className="h-3.5 w-3.5" />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onEdit?.(lead)}>
          <Avatar className="h-7 w-7 border border-gray-200">
            <AvatarImage src={lead.photo_url || lead.enrichment_people?.[0]?.photo_url} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
              {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600">{lead.name}</p>
            {seniority && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-gray-500 border-gray-200 mt-0.5">
                {seniority.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <p className="text-xs text-gray-600 truncate max-w-[180px]">{lead.job_title || lead.designation || '—'}</p>
      </td>
      <td className="px-4 py-2.5">
        {hasEmail ? (
          <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 font-normal">
            <Mail size={10} className="mr-1" />
            Available
          </Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-gray-600">{location || '—'}</span>
      </td>
    </tr>
  );
};

// Overview Insights Component
const OverviewInsights = ({ company, enrichment, companyData }: { company: any; enrichment: any; companyData: any }) => {
  const stats = [
    { 
      label: 'Revenue', 
      value: enrichment?.annual_revenue_printed || company?.revenue, 
      icon: DollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Employees', 
      value: enrichment?.estimated_num_employees || company?.employee_count, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      format: (v: number) => v?.toLocaleString()
    },
    { 
      label: 'Founded', 
      value: enrichment?.founded_year || company?.founded_year, 
      icon: Calendar, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      label: 'Total Funding', 
      value: enrichment?.total_funding_printed || companyData?.total_funding, 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
  ].filter(s => s.value);

  const industries = enrichment?.industries || companyData?.industries || [];
  const tradingSymbol = enrichment?.publicly_traded_symbol || companyData?.publicly_traded_symbol;
  const tradingExchange = enrichment?.publicly_traded_exchange || companyData?.publicly_traded_exchange;

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            const displayValue = stat.format ? stat.format(stat.value) : stat.value;
            return (
              <div key={idx} className={cn("rounded-lg p-3 border", stat.bg, "border-gray-100")}>
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md bg-white shadow-sm")}>
                    <Icon size={14} className={stat.color} />
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-2">{displayValue}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock & Industries Row */}
      <div className="grid grid-cols-2 gap-4">
        {tradingSymbol && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-emerald-600" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Stock</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 mt-1.5 font-mono">
              {tradingExchange?.toUpperCase()}: {tradingSymbol}
            </p>
          </div>
        )}
        {industries.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={14} className="text-blue-600" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Industries</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {industries.slice(0, 3).map((ind: string, idx: number) => (
                <Badge key={idx} className="text-[10px] bg-white text-blue-700 border border-blue-200 font-normal">
                  {ind}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {(enrichment?.short_description || company?.about) && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
            {enrichment?.short_description || company?.about}
          </p>
        </div>
      )}
    </div>
  );
};

// Technologies Insights Component
const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (technologies.length === 0) {
    return <EmptyInsight message="No technologies detected" icon={<Code2 size={24} />} />;
  }

  // Group by category
  const grouped = technologies.reduce((acc: any, tech: any) => {
    const category = tech.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tech);
    return acc;
  }, {});

  const categoryColors: Record<string, string> = {
    'Email Providers': 'bg-red-50 text-red-700 border-red-200',
    'Analytics': 'bg-blue-50 text-blue-700 border-blue-200',
    'CRM': 'bg-green-50 text-green-700 border-green-200',
    'Cloud': 'bg-purple-50 text-purple-700 border-purple-200',
    'Development': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Other': 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="space-y-4">
      {/* Tech Count Summary */}
      <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <Code2 size={16} className="text-indigo-600" />
        <span className="text-sm font-medium text-indigo-700">
          {technologies.length} technologies detected
        </span>
      </div>

      {/* Categories */}
      {Object.entries(grouped).slice(0, 5).map(([category, techs]: [string, any]) => (
        <div key={category}>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {category} <span className="text-gray-400">({techs.length})</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {techs.slice(0, 8).map((tech: any, idx: number) => (
              <Badge 
                key={idx}
                className={cn("text-[10px] font-normal border", categoryColors[category] || categoryColors['Other'])}
              >
                {tech.name}
              </Badge>
            ))}
            {techs.length > 8 && (
              <span className="text-[10px] text-gray-500">+{techs.length - 8} more</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Employee Trends Insights Component
const EmployeeTrendsInsights = ({ departments, employeeMetrics }: { departments: any[]; employeeMetrics: any[] }) => {
  const activeDepts = departments
    .filter((d: any) => d.head_count > 0)
    .sort((a: any, b: any) => b.head_count - a.head_count);

  if (activeDepts.length === 0) {
    return <EmptyInsight message="No employee data available" icon={<Users size={24} />} />;
  }

  const total = activeDepts.reduce((sum: number, d: any) => sum + d.head_count, 0);

  // Mini bar chart colors
  const colors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-orange-400 to-orange-600',
    'from-pink-400 to-pink-600',
    'from-teal-400 to-teal-600',
    'from-indigo-400 to-indigo-600',
    'from-red-400 to-red-600',
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <Users size={16} className="text-blue-600" />
        <span className="text-sm font-medium text-blue-700">
          {total.toLocaleString()} employees across {activeDepts.length} departments
        </span>
      </div>

      {/* Mini Bar Chart */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Department Distribution</h4>
        <div className="space-y-2.5">
          {activeDepts.slice(0, 8).map((dept: any, idx: number) => {
            const percentage = ((dept.head_count / total) * 100);
            return (
              <div key={idx}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 capitalize font-medium">
                    {dept.department_name?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500">
                    {dept.head_count} <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn("h-2 rounded-full bg-gradient-to-r transition-all", colors[idx % colors.length])}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Funding Insights Component
const FundingInsights = ({ fundingEvents, enrichment, companyData }: { fundingEvents: any[]; enrichment: any; companyData: any }) => {
  const totalFunding = enrichment?.total_funding_printed || companyData?.total_funding;
  const latestStage = enrichment?.latest_funding_stage || companyData?.funding_stage;

  if (fundingEvents.length === 0 && !totalFunding) {
    return <EmptyInsight message="No funding data available" icon={<DollarSign size={24} />} />;
  }

  return (
    <div className="space-y-4">
      {/* Funding Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {totalFunding && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Total Raised</span>
            </div>
            <p className="text-xl font-bold text-green-700">{totalFunding}</p>
          </div>
        )}
        {latestStage && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-purple-600" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Latest Stage</span>
            </div>
            <p className="text-sm font-bold text-purple-700">{latestStage}</p>
          </div>
        )}
      </div>

      {/* Funding Timeline */}
      {fundingEvents.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Funding History</h4>
          <div className="space-y-2">
            {fundingEvents.map((event: any, idx: number) => (
              <div key={idx} className="bg-white border border-gray-100 rounded-lg p-3 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between">
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 border-none font-medium">
                    {event.type || 'Funding Round'}
                  </Badge>
                  {event.date && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  {event.amount && (
                    <p className="text-sm font-bold text-gray-900">
                      {event.currency || '$'}{event.amount}
                    </p>
                  )}
                  {event.investors && (
                    <p className="text-[10px] text-gray-500 truncate">
                      from {event.investors}
                    </p>
                  )}
                </div>
                {event.news_url && (
                  <a 
                    href={event.news_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1.5"
                  >
                    <ExternalLink size={10} />
                    Read more
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Keywords Insights Component
const KeywordsInsights = ({ keywords }: { keywords: string[] }) => {
  if (keywords.length === 0) {
    return <EmptyInsight message="No keywords available" icon={<Sparkles size={24} />} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
        <Sparkles size={16} className="text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          {keywords.length} keywords & tags
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword: string, idx: number) => (
          <Badge 
            key={idx}
            variant="outline"
            className="text-xs font-normal bg-white text-gray-700 border-gray-200 hover:bg-gray-50 cursor-default"
          >
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// Empty Insight Component
const EmptyInsight = ({ message, icon }: { message: string; icon: React.ReactNode }) => (
  <div className="py-8 text-center">
    <div className="text-gray-300 mx-auto mb-2">{icon}</div>
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

export default CompanyOverviewTab;