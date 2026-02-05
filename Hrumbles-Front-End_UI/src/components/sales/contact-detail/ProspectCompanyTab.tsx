// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ProspectCompanyTab.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, Globe, Users, DollarSign, Calendar, MapPin, TrendingUp,
  Code, Linkedin, Twitter, ExternalLink, Mail, Phone, ChevronDown, 
  ChevronUp, Briefcase, Tag, Eye, Loader2, Settings
} from 'lucide-react';
import { extractFromRaw, hasData, formatCurrency, formatNumber, groupTechnologies } from '@/utils/dataExtractor';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const ProspectCompanyTab = ({ contact }: { contact: any }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const data = extractFromRaw(contact);
  const org = data.organization;

  // Fetch team members from CRM
  const { data: teamMembers = [], isLoading: isLoadingTeam } = useQuery({
    queryKey: ['org-team-crm', contact.company_id],
    queryFn: async () => {
      if (!contact.company_id) return [];
      const { data } = await supabase
        .from('contacts')
        .select('id, name, job_title, email, mobile, photo_url, contact_stage, enrichment_people(seniority)')
        .eq('company_id', contact.company_id)
        .neq('id', contact.id)
        .limit(20);
      return data || [];
    },
    enabled: !!contact.company_id
  });

  // Get enrichment data from normalized tables
  const enrichmentOrg = contact.enrichment_people?.[0]?.enrichment_organizations;
  const departments = enrichmentOrg?.enrichment_org_departments || [];
  const keywords = enrichmentOrg?.enrichment_org_keywords || [];
  const technologies = enrichmentOrg?.enrichment_org_technologies || [];
  const fundingEvents = enrichmentOrg?.enrichment_org_funding_events || [];

  const techGroups = groupTechnologies(technologies);
  const departmentsWithCount = departments.filter((d: any) => d.head_count > 0);

  // Check what data is available
  const hasTech = technologies.length > 0;
  const hasKeywords = keywords.length > 0;
  const hasDepartments = departmentsWithCount.length > 0;
  const hasFunding = fundingEvents.length > 0 || hasData(org.totalFunding);

  console.log("org", org);

  if (!hasData(org.name)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <Building2 className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 font-medium">No company data available</p>
        <p className="text-xs text-gray-400 mt-1">Enrich this contact to see company information</p>
      </div>
    );
  }

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'news', label: 'News' },
    ...(hasTech ? [{ id: 'technologies', label: 'Technologies', count: technologies.length }] : []),
    ...(hasFunding ? [{ id: 'funding', label: 'Funding' }] : []),
    { id: 'jobs', label: 'Job Postings' },
    { id: 'trends', label: 'Employee Trends' },
    { id: 'visitors', label: 'Website Visitors' },
  ];

  return (
    <div className="space-y-6">
      {/* Company Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header with settings */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Company Insights
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
            <Settings size={14} />
          </Button>
        </div>

        {/* Company Info */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            {org.logoUrl ? (
              <img 
                src={org.logoUrl} 
                alt={org.name || ''}
                className="w-12 h-12 rounded-lg object-contain bg-gray-50 border border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 size={24} className="text-gray-400" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{org.name}</h2>
                {org.publiclyTradedSymbol && (
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {org.publiclyTradedExchange?.toUpperCase()}: {org.publiclyTradedSymbol}
                  </Badge>
                )}
              </div>
              
              {org.industry && (
                <p className="text-sm text-gray-500 mt-0.5 capitalize">{org.industry}</p>
              )}
              
              {/* Quick Links */}
              <div className="flex items-center gap-3 mt-2">
                {org.websiteUrl && (
                  <a 
                    href={org.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Globe size={12} />
                    Website
                  </a>
                )}
                {org.linkedinUrl && (
                  <a 
                    href={org.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Linkedin size={12} />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>

            {/* More menu */}
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
              <ChevronDown size={16} />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-100">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeSection === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs text-gray-400">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {activeSection === 'overview' && (
            <OverviewSection 
              org={org} 
              keywords={keywords}
              departments={departmentsWithCount}
            />
          )}
          
          {activeSection === 'technologies' && hasTech && (
            <TechnologiesSection technologies={technologies} techGroups={techGroups} />
          )}
          
          {activeSection === 'funding' && hasFunding && (
            <FundingSection org={org} fundingEvents={fundingEvents} />
          )}
          
          {activeSection === 'news' && (
            <EmptySection 
              title="No relevant news" 
              description="News articles about this company will appear here"
            />
          )}
          
          {activeSection === 'jobs' && (
            <EmptySection 
              title="No relevant jobs" 
              description="Open positions at this company will appear here"
            />
          )}
          
          {activeSection === 'trends' && (
            <EmptySection 
              title="No employee trends data" 
              description="Employee growth trends will appear here"
            />
          )}
          
          {activeSection === 'visitors' && (
            <EmptySection 
              title="No website visitor data" 
              description="Website traffic insights will appear here"
            />
          )}
        </div>
      </div>

      {/* Company About Section */}
      {/* <CompanyAboutSection org={org} keywords={keywords} departments={departmentsWithCount} /> */}

      {/* Team Members */}
      <TeamMembersSection 
        teamMembers={teamMembers} 
        isLoading={isLoadingTeam}
        navigate={navigate}
      />
    </div>
  );
};

// Overview Section
const OverviewSection = ({ org, keywords, departments }: any) => (
   <div className="px-4 pb-4 border-t border-gray-100">
          {/* About */}
          {org.shortDescription && (
            <div className="pt-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">About</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {org.shortDescription}
              </p>
            </div>
          )}
          
          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Keywords</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">
                  Show all {keywords.length}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 10).map((kw: any, idx: number) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className="text-xs font-normal text-gray-600 border-gray-200 bg-gray-50"
                  >
                    {kw.keyword}
                  </Badge>
                ))}
                {keywords.length > 10 && (
                  <Badge variant="outline" className="text-xs text-gray-400">
                    +{keywords.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Company Details Grid */}
          <div className="pt-4 grid grid-cols-2 gap-4">
            {org.foundedYear && (
              <DetailItem label="Founded Year" value={org.foundedYear} />
            )}
            {org.annualRevenuePrinted && (
              <DetailItem label="Revenue" value={org.annualRevenuePrinted} />
            )}
            {org.industry && (
              <DetailItem label="Industries" value={org.industry} />
            )}
            {org.estimatedEmployees && (
              <DetailItem label="Number of Employees" value={`${formatNumber(org.estimatedEmployees)} employees`} />
            )}
            {(org.city || org.country) && (
              <DetailItem label="Location" value={[org.streetAddress, org.city, org.country].filter(Boolean).join(', ')} />
            )}
            {org.primaryPhone && (
              <DetailItem label="Phone Number" value={org.primaryPhone} />
            )}
            {org.naicsCodes && (
              <DetailItem label="NAICS Codes" value={org.naicsCodes} />
            )}
             {org.sicCodes && (
              <DetailItem label="SIC Codes" value={org.sicCodes} />
            )}
          </div>
        </div>
);

// Technologies Section
const TechnologiesSection = ({ technologies, techGroups }: any) => (
  <div className="space-y-4">
    {Object.entries(techGroups).map(([category, techs]: [string, any]) => (
      <div key={category}>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {category}
        </h4>
        <div className="flex flex-wrap gap-2">
          {techs.map((tech: any, idx: number) => (
            <Badge 
              key={idx}
              variant="secondary"
              className="bg-white text-gray-700 border border-gray-200 text-xs font-medium"
            >
              {tech.name}
            </Badge>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Funding Section  
const FundingSection = ({ org, fundingEvents }: any) => (
  <div className="space-y-4">
    {fundingEvents.length > 0 ? (
      fundingEvents.map((event: any, idx: number) => (
        <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs mb-2">
                {event.type || 'Funding Round'}
              </Badge>
              <p className="text-lg font-semibold text-gray-900">
                {event.amount_printed || formatCurrency(event.amount)}
              </p>
            </div>
            {event.date && (
              <span className="text-xs text-gray-500">
                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      ))
    ) : org.totalFunding && (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <p className="text-sm text-gray-500 mb-1">Total Funding</p>
        <p className="text-xl font-semibold text-gray-900">
          {org.totalFundingPrinted || formatCurrency(org.totalFunding)}
        </p>
      </div>
    )}
  </div>
);

// Company About Section
const CompanyAboutSection = ({ org, keywords, departments }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600 rounded text-white">
            <Building2 size={16} />
          </div>
          <span className="text-sm font-semibold text-gray-900">{org.name}</span>
          {org.estimatedEmployees && (
            <Badge variant="secondary" className="text-xs">
              {formatNumber(org.estimatedEmployees)} employees
            </Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* About */}
          {org.shortDescription && (
            <div className="pt-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">About</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {org.shortDescription}
              </p>
            </div>
          )}
          
          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Keywords</h4>
                <button className="text-xs text-blue-600 hover:text-blue-700">
                  Show all {keywords.length}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.slice(0, 10).map((kw: any, idx: number) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className="text-xs font-normal text-gray-600 border-gray-200 bg-gray-50"
                  >
                    {kw.keyword}
                  </Badge>
                ))}
                {keywords.length > 10 && (
                  <Badge variant="outline" className="text-xs text-gray-400">
                    +{keywords.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Company Details Grid */}
          <div className="pt-4 grid grid-cols-2 gap-4">
            {org.foundedYear && (
              <DetailItem label="Founded Year" value={org.foundedYear} />
            )}
            {org.annualRevenuePrinted && (
              <DetailItem label="Revenue" value={org.annualRevenuePrinted} />
            )}
            {org.industry && (
              <DetailItem label="Industries" value={org.industry} />
            )}
            {org.estimatedEmployees && (
              <DetailItem label="Number of Employees" value={`${formatNumber(org.estimatedEmployees)} employees`} />
            )}
            {(org.city || org.country) && (
              <DetailItem label="Location" value={[org.streetAddress, org.city, org.country].filter(Boolean).join(', ')} />
            )}
            {org.primaryPhone && (
              <DetailItem label="Phone Number" value={org.primaryPhone} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Team Members Section
const TeamMembersSection = ({ teamMembers, isLoading, navigate }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-purple-600 rounded text-white">
            <Users size={16} />
          </div>
          <span className="text-sm font-semibold text-gray-900">Suggested Leads</span>
          <Badge variant="secondary" className="text-xs">
            {teamMembers.length}
          </Badge>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {teamMembers.map((member: any) => (
                <div 
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.photo_url} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                        {member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.job_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className={member.email ? "text-green-500" : "text-gray-300"} />
                      <Phone size={14} className={member.mobile ? "text-green-500" : "text-gray-300"} />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                      onClick={() => navigate(`/contacts/${member.id}`)}
                    >
                      <Eye size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No other team members in CRM</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper Components
const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
    <div className="mt-1">{value}</div>
  </div>
);

const DetailItem = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
    <p className="text-sm text-gray-900 mt-0.5">{value}</p>
  </div>
);

const EmptySection = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-6">
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className="text-xs text-gray-400 mt-1">{description}</p>
  </div>
);