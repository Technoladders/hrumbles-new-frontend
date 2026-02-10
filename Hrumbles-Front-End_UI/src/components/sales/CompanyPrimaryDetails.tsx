// Hrumbles-Front-End_UI/src/components/sales/CompanyPrimaryDetails.tsx
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, Globe, Linkedin, Facebook, ChevronDown, ChevronUp,
  ExternalLink, Copy, Check, Phone, MapPin, Calendar,
  Users, DollarSign, TrendingUp, Briefcase, Tag, Code2,
  Landmark, Award, Link2, Building, UserPlus
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CompanyPrimaryDetailsProps {
  company: any;
  employees?: any[];
  isLoadingEmployees?: boolean;
  companyId?: number;
  companyName?: string;
  onEditEmployee?: (emp: any) => void;
  onDataUpdate?: () => void;
}

export const CompanyPrimaryDetails: React.FC<CompanyPrimaryDetailsProps> = ({ 
  company,
  employees = [],
  isLoadingEmployees = false,
  onEditEmployee,
}) => {
  const { toast } = useToast();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [showAllTech, setShowAllTech] = useState(false);

  const enrichment = company?.enrichment_organizations;
  const companyData = company?.company_data || {};
  
  // Extract keywords from multiple sources
  const keywords = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) || 
                   companyData?.keywords || 
                   [];
  
  // Extract technologies
  const technologies = enrichment?.enrichment_org_technologies || 
                       companyData?.current_technologies ||
                       (companyData?.technologies ? companyData.technologies.map((t: string) => ({ name: t })) : []);
  
  // Extract funding events
  const fundingEvents = enrichment?.enrichment_org_funding_events || 
                        companyData?.funding_events || 
                        [];
  
  // Extract departments
  const departments = enrichment?.enrichment_org_departments || [];
  
  // Build comprehensive data object
  const data = {
    name: enrichment?.name || company?.name,
    description: enrichment?.short_description || enrichment?.seo_description || company?.about || company?.description,
    industry: enrichment?.industry || company?.industry,
    industries: enrichment?.industries || companyData?.industries || (company?.industry ? [company.industry] : []),
    secondaryIndustries: enrichment?.secondary_industries || companyData?.secondary_industries || [],
    keywords: keywords,
    ownedBy: enrichment?.owned_by_organization || companyData?.owned_by,
    subsidiaries: enrichment?.num_suborganizations || companyData?.suborganizations?.length || 0,
    tradingSymbol: enrichment?.publicly_traded_symbol || companyData?.publicly_traded_symbol,
    tradingExchange: enrichment?.publicly_traded_exchange || companyData?.publicly_traded_exchange,
    foundedYear: enrichment?.founded_year || company?.founded_year || company?.start_date,
    employees: enrichment?.estimated_num_employees || company?.employee_count,
    sicCodes: enrichment?.sic_codes || companyData?.sic_codes || [],
    naicsCodes: enrichment?.naics_codes || companyData?.naics_codes || [],
    website: enrichment?.website_url || company?.website,
    linkedinUrl: enrichment?.linkedin_url || company?.linkedin,
    facebookUrl: enrichment?.facebook_url || company?.facebook,
    twitterUrl: enrichment?.twitter_url || company?.twitter,
    crunchbaseUrl: enrichment?.crunchbase_url,
    angellistUrl: enrichment?.angellist_url,
    phone: enrichment?.primary_phone || company?.phone,
    address: enrichment?.raw_address || enrichment?.street_address || company?.address,
    city: enrichment?.city || company?.city,
    state: enrichment?.state || company?.state,
    country: enrichment?.country || company?.country,
    annualRevenue: enrichment?.annual_revenue_printed || company?.revenue,
    totalFunding: enrichment?.total_funding_printed || companyData?.total_funding,
    latestFundingStage: enrichment?.latest_funding_stage || companyData?.funding_stage,
    languages: enrichment?.languages || companyData?.languages || [],
    technologies: technologies,
    fundingEvents: fundingEvents,
    departments: departments,
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const formatNumber = (num: number | string | undefined) => {
    if (!num) return null;
    const n = typeof num === 'string' ? parseInt(num) : num;
    if (isNaN(n)) return num;
    return n.toLocaleString();
  };

  const formatLocation = () => {
    return [data.city, data.state, data.country].filter(Boolean).join(', ');
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Company Details Section */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Company Details</span>
          </div>
          {detailsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Description */}
            {data.description && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{data.description}</p>
              </div>
            )}

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              {data.foundedYear && (
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <Calendar size={12} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-900">{data.foundedYear}</p>
                  <p className="text-[10px] text-gray-500">Founded</p>
                </div>
              )}
              {data.employees && (
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <Users size={12} className="text-green-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-900">{formatNumber(data.employees)}</p>
                  <p className="text-[10px] text-gray-500">Employees</p>
                </div>
              )}
              {data.annualRevenue && (
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <DollarSign size={12} className="text-purple-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-gray-900">{data.annualRevenue}</p>
                  <p className="text-[10px] text-gray-500">Revenue</p>
                </div>
              )}
            </div>

            {/* Industries */}
            {data.industries.length > 0 && (
              <DetailRow label="Industries" icon={<Briefcase size={12} />}>
                <div className="flex flex-wrap gap-1">
                  {data.industries.map((industry: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] font-normal bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5">
                      {industry}
                    </Badge>
                  ))}
                  {data.secondaryIndustries.map((industry: string, idx: number) => (
                    <Badge key={`sec-${idx}`} variant="outline" className="text-[10px] font-normal text-gray-600 border-gray-200 px-1.5 py-0.5">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            )}

            {/* Keywords */}
            {data.keywords.length > 0 && (
              <DetailRow label="Keywords" icon={<Tag size={12} />}>
                <div className="flex flex-wrap gap-1">
                  {(showAllKeywords ? data.keywords : data.keywords.slice(0, 8)).map((keyword: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[10px] font-normal bg-gray-50 text-gray-600 border-gray-200 px-1.5 py-0.5">
                      {keyword}
                    </Badge>
                  ))}
                  {data.keywords.length > 8 && (
                    <button onClick={() => setShowAllKeywords(!showAllKeywords)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">
                      {showAllKeywords ? 'Show less' : `+${data.keywords.length - 8} more`}
                    </button>
                  )}
                </div>
              </DetailRow>
            )}

            {/* Technologies */}
            {data.technologies.length > 0 && (
              <DetailRow label="Technologies" icon={<Code2 size={12} />}>
                <div className="flex flex-wrap gap-1">
                  {(showAllTech ? data.technologies : data.technologies.slice(0, 6)).map((tech: any, idx: number) => (
                    <Badge key={idx} className="text-[10px] font-normal bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5">
                      {tech.name || tech}
                    </Badge>
                  ))}
                  {data.technologies.length > 6 && (
                    <button onClick={() => setShowAllTech(!showAllTech)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium">
                      {showAllTech ? 'Show less' : `+${data.technologies.length - 6} more`}
                    </button>
                  )}
                </div>
              </DetailRow>
            )}

            {/* Parent Company */}
            {data.ownedBy && (
              <DetailRow label="Parent Company" icon={<Building size={12} />}>
                <div className="flex items-center gap-2 bg-amber-50 rounded px-2 py-1.5">
                  <Building2 size={12} className="text-amber-600" />
                  <span className="text-xs font-medium text-gray-900">{data.ownedBy.name}</span>
                  {data.ownedBy.website_url && (
                    <a href={data.ownedBy.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </DetailRow>
            )}

            {/* Subsidiaries */}
            {data.subsidiaries > 0 && (
              <DetailRow label="Subsidiaries" icon={<Building size={12} />}>
                <span className="text-xs text-gray-700"><span className="font-medium">{data.subsidiaries}</span> subsidiaries</span>
              </DetailRow>
            )}

            {/* Stock Info */}
            {data.tradingSymbol && (
              <DetailRow label="Stock" icon={<TrendingUp size={12} />}>
                <Badge className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border-none">
                  {data.tradingExchange?.toUpperCase()}: {data.tradingSymbol}
                </Badge>
              </DetailRow>
            )}

            {/* SIC / NAICS Codes */}
            {(data.sicCodes.length > 0 || data.naicsCodes.length > 0) && (
              <DetailRow label="Industry Codes" icon={<Award size={12} />}>
                <div className="flex flex-wrap gap-1">
                  {data.sicCodes.map((code: string, idx: number) => (
                    <Badge key={`sic-${idx}`} className="text-[10px] font-mono bg-gray-700 text-white border-none px-1.5 py-0.5">
                      SIC: {code}
                    </Badge>
                  ))}
                  {data.naicsCodes.map((code: string, idx: number) => (
                    <Badge key={`naics-${idx}`} className="text-[10px] font-mono bg-gray-600 text-white border-none px-1.5 py-0.5">
                      NAICS: {code}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            )}

            {/* Location */}
            {formatLocation() && (
              <DetailRow label="Location" icon={<MapPin size={12} />}>
                <p className="text-xs text-gray-700">{formatLocation()}</p>
                {data.address && <p className="text-[10px] text-gray-500 mt-0.5">{data.address}</p>}
              </DetailRow>
            )}

            {/* Phone */}
            {data.phone && (
              <DetailRow label="Phone" icon={<Phone size={12} />}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-700">{data.phone}</span>
                  <button onClick={() => copyToClipboard(data.phone, 'phone')} className="p-1 hover:bg-gray-100 rounded">
                    {copiedField === 'phone' ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="text-gray-400" />}
                  </button>
                </div>
              </DetailRow>
            )}

            {/* Languages */}
            {data.languages.length > 0 && (
              <DetailRow label="Languages" icon={<Globe size={12} />}>
                <p className="text-xs text-gray-700">{[...new Set(data.languages)].join(', ')}</p>
              </DetailRow>
            )}

            {/* Links */}
            <DetailRow label="Links" icon={<Link2 size={12} />}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {data.website && (
                  <a href={data.website} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200" title="Website">
                    <Globe size={14} className="text-gray-500" />
                  </a>
                )}
                {data.linkedinUrl && (
                  <a href={data.linkedinUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 rounded-md transition-colors border border-gray-200" title="LinkedIn">
                    <Linkedin size={14} className="text-[#0A66C2]" />
                  </a>
                )}
                {data.facebookUrl && (
                  <a href={data.facebookUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 rounded-md transition-colors border border-gray-200" title="Facebook">
                    <Facebook size={14} className="text-[#1877F2]" />
                  </a>
                )}
                {data.twitterUrl && (
                  <a href={data.twitterUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded-md transition-colors border border-gray-200" title="X (Twitter)">
                    <XIcon />
                  </a>
                )}
                {data.crunchbaseUrl && (
                  <a href={data.crunchbaseUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-orange-50 rounded-md transition-colors border border-gray-200" title="Crunchbase">
                    <Landmark size={14} className="text-orange-500" />
                  </a>
                )}
              </div>
            </DetailRow>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Financials Section */}
      {(data.totalFunding || data.latestFundingStage || data.fundingEvents.length > 0) && (
        <Collapsible open={financialsOpen} onOpenChange={setFinancialsOpen}>
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Funding & Financials</span>
              {data.fundingEvents.length > 0 && (
                <Badge className="text-[10px] bg-green-100 text-green-700 border-none ml-1">{data.fundingEvents.length}</Badge>
              )}
            </div>
            {financialsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {/* Funding Summary */}
              <div className="grid grid-cols-2 gap-2">
                {data.totalFunding && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Funding</p>
                    <p className="text-sm font-bold text-green-700 mt-0.5">{data.totalFunding}</p>
                  </div>
                )}
                {data.latestFundingStage && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Latest Stage</p>
                    <p className="text-xs font-semibold text-purple-700 mt-0.5">{data.latestFundingStage}</p>
                  </div>
                )}
              </div>

              {/* Funding Events */}
              {data.fundingEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Funding Rounds</p>
                  {data.fundingEvents.slice(0, 3).map((event: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded-lg p-2.5 hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 border-none">{event.type || 'Funding'}</Badge>
                        {event.date && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {event.amount && <p className="text-xs font-semibold text-gray-900 mt-1.5">{event.currency || '$'}{event.amount}</p>}
                      {event.investors && <p className="text-[10px] text-gray-500 mt-1">{event.investors}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* People Section */}
      <Collapsible open={peopleOpen} onOpenChange={setPeopleOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">People</span>
            {employees.length > 0 && (
              <Badge className="text-[10px] bg-blue-100 text-blue-700 border-none ml-1">{employees.length}</Badge>
            )}
          </div>
          {peopleOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4">
            {isLoadingEmployees ? (
              <div className="py-6 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Loading people...</p>
              </div>
            ) : employees.length > 0 ? (
              <div className="space-y-2">
                {employees.slice(0, 5).map((person: any, idx: number) => (
                  <div 
                    key={idx}
                    onClick={() => onEditEmployee?.(person)}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group"
                  >
                    <Avatar className="h-8 w-8 border border-gray-200">
                      <AvatarImage src={person.photo_url} />
                      <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
                        {person.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-blue-600">{person.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{person.job_title || person.designation}</p>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-400" />
                  </div>
                ))}
                {employees.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    View all {employees.length} people
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 mt-2">No people found</p>
                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs">
                  <UserPlus size={12} className="mr-1.5" />
                  Add person
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Departments Section - Mini Chart */}
      {data.departments.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Team Breakdown</span>
          </div>
          <div className="space-y-1.5">
            {data.departments
              .filter((d: any) => d.head_count > 0)
              .sort((a: any, b: any) => b.head_count - a.head_count)
              .slice(0, 5)
              .map((dept: any, idx: number) => {
                const maxCount = Math.max(...data.departments.map((d: any) => d.head_count));
                const percentage = (dept.head_count / maxCount) * 100;
                return (
                  <div key={idx} className="group">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-gray-600 capitalize">{dept.department_name?.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500 font-medium">{dept.head_count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// Detail Row Component
const DetailRow = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="pl-4">{children}</div>
  </div>
);

// X (Twitter) Icon
const XIcon = () => (
  <svg className="w-[14px] h-[14px] text-gray-800" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default CompanyPrimaryDetails;