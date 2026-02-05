// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, ChevronUp, ChevronDown, Search, Filter, ChevronLeft, 
  ChevronRight, Mail, Download, Sparkles, Star, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface CompanyOverviewTabProps {
  company: any;
  refetchParent: () => void;
}

export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({ company, refetchParent }) => {
  const navigate = useNavigate();
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [leadsOpen, setLeadsOpen] = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [activeLeadFilter, setActiveLeadFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const enrichment = company?.enrichment_organizations;
  const technologies = enrichment?.enrichment_org_technologies || [];
  const fundingEvents = enrichment?.enrichment_org_funding_events || [];
  const departments = enrichment?.enrichment_org_departments || [];

  // Fetch suggested leads (people at this company)
  const { data: suggestedLeads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['suggested-leads', company.id, company.apollo_org_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(seniority, photo_url),
          enrichment_contact_emails(email, email_status)
        `)
        .eq('company_id', company.id)
        .limit(50);
      return data || [];
    },
    enabled: !!company.id
  });

  // Filter leads
  const filteredLeads = suggestedLeads.filter((lead: any) => {
    const matchesSearch = !searchTerm || 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const seniority = lead.enrichment_people?.[0]?.seniority?.toLowerCase();
    const matchesFilter = 
      activeLeadFilter === 'all' ||
      (activeLeadFilter === 'cxo' && ['c_suite', 'owner', 'founder'].includes(seniority)) ||
      (activeLeadFilter === 'director' && ['director', 'vp', 'head'].includes(seniority));
    
    return matchesSearch && matchesFilter;
  });

  const insightTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'news', label: 'News' },
    { id: 'technologies', label: 'Technologies', count: technologies.length },
    { id: 'funding', label: 'Funding' },
    { id: 'jobs', label: 'Job postings' },
    { id: 'trends', label: 'Employee trends', count: departments.filter((d: any) => d.head_count > 0).length },
    { id: 'visitors', label: 'Website visitors' },
  ];

  const leadFilters = [
    { id: 'all', label: 'All' },
    { id: 'cxo', label: 'CXO', count: 0 },
    { id: 'director', label: 'Director+', count: 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Company Insights Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Company insights</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400">
              <Settings size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-gray-400"
              onClick={() => setInsightsOpen(!insightsOpen)}
            >
              {insightsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>
        </div>

        {insightsOpen && (
          <>
            {/* Insight Tabs */}
            <div className="border-b border-gray-100 px-4">
              <div className="flex gap-0 overflow-x-auto">
                {insightTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInsightTab(tab.id)}
                    className={cn(
                      "px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                      activeInsightTab === tab.id
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1.5 text-xs text-gray-400">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Insight Content */}
            <div className="p-4">
              {activeInsightTab === 'overview' && (
                <OverviewInsights company={company} />
              )}
              {activeInsightTab === 'technologies' && (
                <TechnologiesInsights technologies={technologies} />
              )}
              {activeInsightTab === 'trends' && (
                <EmployeeTrendsInsights departments={departments} />
              )}
              {activeInsightTab === 'funding' && (
                <FundingInsights fundingEvents={fundingEvents} company={company} />
              )}
              {['news', 'jobs', 'visitors'].includes(activeInsightTab) && (
                <EmptyInsight tab={activeInsightTab} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Suggested Leads Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Suggested leads</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-gray-400"
            onClick={() => setLeadsOpen(!leadsOpen)}
          >
            {leadsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        {leadsOpen && (
          <>
            {/* Filters */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4">
              <div className="flex items-center gap-1">
                {leadFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveLeadFilter(filter.id)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      activeLeadFilter === filter.id
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {filter.label}
                    {filter.count > 0 && (
                      <span className="ml-1 text-xs text-gray-400">{filter.count}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter size={12} className="mr-1.5" />
                  Show Filters
                </Button>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search people"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-48 pl-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-10 px-4 py-3">
                      <Checkbox />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emails
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead: any) => (
                      <LeadRow key={lead.id} lead={lead} navigate={navigate} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No leads found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredLeads.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                    <ChevronLeft size={16} />
                  </Button>
                  <select className="h-8 px-2 text-sm border border-gray-200 rounded-md">
                    <option>1</option>
                  </select>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronRight size={16} />
                  </Button>
                  <span className="text-sm text-gray-500">
                    1 - {filteredLeads.length} of {suggestedLeads.length}
                  </span>
                </div>
                <Button 
                  variant="default"
                  size="sm"
                  className="h-8 bg-blue-600 hover:bg-blue-700"
                >
                  View all
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
const LeadRow = ({ lead, navigate }: { lead: any; navigate: any }) => {
  const seniority = lead.enrichment_people?.[0]?.seniority;
  const hasEmail = lead.email || (lead.enrichment_contact_emails?.length > 0);
  const location = [lead.city, lead.state].filter(Boolean).join(', ');

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <Checkbox />
      </td>
      <td className="px-4 py-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/contacts/${lead.id}`)}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={lead.photo_url || lead.enrichment_people?.[0]?.photo_url} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
              {lead.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
              {lead.name}
            </p>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">
              {lead.job_title}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          <Badge 
            variant="secondary"
            className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200"
          >
            <Sparkles size={10} className="mr-1" />
            Similar to past prospects
          </Badge>
          {seniority && (
            <Badge 
              variant="secondary"
              className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200"
            >
              <Star size={10} className="mr-1" />
              Seniority
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {hasEmail ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs font-medium text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
          >
            <Mail size={12} className="mr-1" />
            Access email
          </Button>
        ) : (
          <span className="text-xs text-gray-400">No email</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">{location || '—'}</span>
      </td>
    </tr>
  );
};

// Overview Insights Component
const OverviewInsights = ({ company }: { company: any }) => {
  const enrichment = company?.enrichment_organizations;
  
  return (
    <div className="space-y-4">
      <InsightRow label="Score">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex gap-0.5">
                {[1, 2, 3, 4].map((col) => (
                  <div 
                    key={col}
                    className={cn(
                      "w-5 h-1.5 rounded-sm",
                      row === 2 && col <= 2 ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">No scores found</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-1">
              Create score
            </Button>
          </div>
        </div>
      </InsightRow>

      <InsightRow label="Relevant Jobs">
        <span className="text-sm text-gray-500">No relevant jobs</span>
      </InsightRow>

      <InsightRow label="Relevant Technology">
        <span className="text-sm text-gray-500">No relevant technologies</span>
      </InsightRow>

      <InsightRow label="Personas">
        <span className="text-sm text-gray-500">No relevant personas</span>
      </InsightRow>

      <InsightRow label="Recent Funding">
        <span className="text-sm text-gray-500">
          {enrichment?.total_funding_printed || 'No relevant funding'}
        </span>
      </InsightRow>
    </div>
  );
};

// Technologies Insights Component
const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (technologies.length === 0) {
    return <EmptyInsight tab="technologies" />;
  }

  // Group by category
  const grouped = technologies.reduce((acc: any, tech: any) => {
    const category = tech.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tech);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, techs]: [string, any]) => (
        <div key={category}>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {category}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {techs.map((tech: any, idx: number) => (
              <Badge 
                key={idx}
                variant="secondary"
                className="text-xs font-normal bg-gray-100 text-gray-700"
              >
                {tech.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Employee Trends Insights Component
const EmployeeTrendsInsights = ({ departments }: { departments: any[] }) => {
  const activeDepts = departments
    .filter((d: any) => d.head_count > 0)
    .sort((a: any, b: any) => b.head_count - a.head_count);

  if (activeDepts.length === 0) {
    return <EmptyInsight tab="trends" />;
  }

  const total = activeDepts.reduce((sum: number, d: any) => sum + d.head_count, 0);

  return (
    <div className="space-y-3">
      {activeDepts.slice(0, 10).map((dept: any, idx: number) => {
        const percentage = ((dept.head_count / total) * 100).toFixed(1);
        return (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700 capitalize">
                {dept.department_name.replace(/_/g, ' ')}
              </span>
              <span className="text-sm text-gray-500">
                {dept.head_count} ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Funding Insights Component
const FundingInsights = ({ fundingEvents, company }: { fundingEvents: any[]; company: any }) => {
  const enrichment = company?.enrichment_organizations;

  if (fundingEvents.length === 0 && !enrichment?.total_funding_printed) {
    return <EmptyInsight tab="funding" />;
  }

  return (
    <div className="space-y-4">
      {enrichment?.total_funding_printed && (
        <InsightRow label="Total Funding">
          <span className="text-lg font-semibold text-gray-900">
            {enrichment.total_funding_printed}
          </span>
        </InsightRow>
      )}

      {fundingEvents.map((event: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              {event.type || 'Funding Round'}
            </Badge>
            {event.date && (
              <span className="text-xs text-gray-500">
                {new Date(event.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            )}
          </div>
          {event.amount && (
            <p className="text-sm font-semibold text-gray-900 mt-2">
              {event.amount_printed || event.amount}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

// Empty Insight Component
const EmptyInsight = ({ tab }: { tab: string }) => {
  const messages: Record<string, string> = {
    overview: 'No overview data available',
    news: 'No relevant news',
    technologies: 'No technologies detected',
    funding: 'No relevant funding',
    jobs: 'No relevant jobs',
    trends: 'No employee trends data',
    visitors: 'No website visitor data',
  };

  return (
    <div className="py-8 text-center">
      <p className="text-sm text-gray-500">{messages[tab] || 'No data available'}</p>
    </div>
  );
};

// Insight Row Component
const InsightRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-32 flex-shrink-0 pt-1">
      {label}
    </span>
    <div className="flex-1">{children}</div>
  </div>
);