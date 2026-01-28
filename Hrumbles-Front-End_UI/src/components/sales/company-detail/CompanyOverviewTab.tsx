import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, Globe, Users, DollarSign, Calendar, MapPin, TrendingUp,
  Code, Linkedin, Twitter, Facebook, Award, Briefcase, PieChart,
  ChevronDown, ChevronUp, Tag, Database, Landmark, Phone
} from 'lucide-react';
import { 
  extractCompanyFromRaw, 
  hasCompanyData, 
  formatCompanyCurrency, 
  formatCompanyNumber,
  groupCompanyTechnologies,
  processDepartments
} from '@/utils/companyDataExtractor';
import { cn } from '@/lib/utils';

export const CompanyOverviewTab = ({ company }: any) => {
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const data = extractCompanyFromRaw(company);
  
  // Get enrichment data from normalized tables
  const enrichment = company?.enrichment_organizations;
  const departments = enrichment?.enrichment_org_departments || [];
  const keywords = enrichment?.enrichment_org_keywords || [];
  const technologies = enrichment?.enrichment_org_technologies || [];
  const fundingEvents = enrichment?.enrichment_org_funding_events || [];

  const hasMetrics = hasCompanyData(data.estimatedEmployees) || hasCompanyData(data.annualRevenue) || hasCompanyData(data.foundedYear);
  const hasTech = hasCompanyData(technologies);
  const hasClassification = hasCompanyData(data.sicCodes) || hasCompanyData(data.naicsCodes) || hasCompanyData(data.industries);
  const hasFunding = hasCompanyData(fundingEvents) || hasCompanyData(data.totalFunding);
  const hasKeywords = hasCompanyData(keywords);
  const hasDepartments = hasCompanyData(departments);

  const techGroups = groupCompanyTechnologies(technologies);
  const departmentData = processDepartments(data.departmentalHeadCount);

  // Department colors for pie chart
  const departmentColors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', 
    '#06b6d4', '#f43f5e', '#6366f1', '#a855f7', '#14b8a6',
    '#84cc16', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Company Overview Card */}
      <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div 
          className="cursor-pointer bg-gradient-to-r from-slate-900 to-slate-800 p-6"
          onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              {data.logoUrl && (
                <img 
                  src={data.logoUrl} 
                  alt={data.name}
                  className="w-16 h-16 rounded-xl object-contain bg-white p-2 shadow-lg"
                />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-black text-white mb-2 tracking-tight">
                  {data.name}
                </h2>
                {data.industry && (
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold backdrop-blur-sm">
                    {data.industry}
                  </Badge>
                )}
              </div>
            </div>
            <button className="text-white/70 hover:text-white transition-colors">
              {isOverviewExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>
        </div>

        {isOverviewExpanded && (
          <CardContent className="p-8 space-y-6">
            {/* Description */}
            {data.shortDescription && (
              <div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium bg-white p-4 rounded-lg border border-slate-200">
                  {data.shortDescription}
                </p>
              </div>
            )}

            {/* Key Metrics Grid */}
            {hasMetrics && (
              <div className="grid grid-cols-4 gap-4">
                {data.estimatedEmployees && (
                  <MetricCard 
                    icon={<Users className="w-5 h-5" />}
                    label="Employees"
                    value={formatCompanyNumber(data.estimatedEmployees)}
                    color="blue"
                  />
                )}
                {(data.annualRevenue || data.annualRevenuePrinted) && (
                  <MetricCard 
                    icon={<DollarSign className="w-5 h-5" />}
                    label="Annual Revenue"
                    value={data.annualRevenuePrinted || formatCompanyCurrency(data.annualRevenue)}
                    color="green"
                  />
                )}
                {data.foundedYear && (
                  <MetricCard 
                    icon={<Calendar className="w-5 h-5" />}
                    label="Founded"
                    value={data.foundedYear}
                    color="purple"
                  />
                )}
                {(data.totalFunding || data.totalFundingPrinted) && (
                  <MetricCard 
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Total Funding"
                    value={data.totalFundingPrinted || formatCompanyCurrency(data.totalFunding)}
                    color="amber"
                  />
                )}
              </div>
            )}

            {/* Contact & Location */}
            <div className="grid grid-cols-2 gap-4">
              {(data.websiteUrl || data.primaryDomain) && (
                <ContactCard 
                  icon={<Globe className="w-4 h-4" />}
                  label="Website"
                  value={data.primaryDomain || data.websiteUrl}
                  link={data.websiteUrl}
                />
              )}
              {data.phoneNumber && (
                <ContactCard 
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={data.phoneNumber}
                />
              )}
              {(data.city || data.state || data.country) && (
                <ContactCard 
                  icon={<MapPin className="w-4 h-4" />}
                  label="Location"
                  value={[data.city, data.state, data.country].filter(Boolean).join(', ')}
                />
              )}
              {data.alexaRanking && (
                <ContactCard 
                  icon={<Award className="w-4 h-4" />}
                  label="Alexa Rank"
                  value={`#${formatCompanyNumber(data.alexaRanking)}`}
                />
              )}
            </div>

            {/* Social Links */}
            {(data.linkedinUrl || data.twitterUrl || data.facebookUrl) && (
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {data.linkedinUrl && (
                  <SocialButton icon={<Linkedin size={16} />} url={data.linkedinUrl} color="bg-blue-600" />
                )}
                {data.twitterUrl && (
                  <SocialButton icon={<Twitter size={16} />} url={data.twitterUrl} color="bg-sky-500" />
                )}
                {data.facebookUrl && (
                  <SocialButton icon={<Facebook size={16} />} url={data.facebookUrl} color="bg-blue-700" />
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Sub-tabs for detailed data */}
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 h-11">
          {hasDepartments && (
            <TabsTrigger value="departments" className="text-xs font-bold">
              Departments ({departmentData.active.length})
            </TabsTrigger>
          )}
          {hasTech && (
            <TabsTrigger value="tech" className="text-xs font-bold">
              Technology ({technologies.length})
            </TabsTrigger>
          )}
          {hasKeywords && (
            <TabsTrigger value="keywords" className="text-xs font-bold">
              Keywords ({keywords.length})
            </TabsTrigger>
          )}
          {hasClassification && (
            <TabsTrigger value="classification" className="text-xs font-bold">
              Classification
            </TabsTrigger>
          )}
          {hasFunding && (
            <TabsTrigger value="funding" className="text-xs font-bold">
              Funding
            </TabsTrigger>
          )}
        </TabsList>

        {/* Departments with Pie Chart */}
        {hasDepartments && (
          <TabsContent value="departments" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 rounded-lg">
                      <PieChart className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                      Department Distribution
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <DepartmentPieChart departments={departmentData.active} colors={departmentColors} />
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                      Total Employees Tracked: <span className="font-black text-slate-700">{departmentData.total}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Department List */}
              <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600 rounded-lg">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                      Department Breakdown
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {departmentData.active.map((dept: any, idx: number) => {
                      const percentage = ((dept.head_count / departmentData.total) * 100).toFixed(1);
                      return (
                        <div key={idx} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: departmentColors[idx % departmentColors.length] }}
                              />
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {dept.department_name.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium">{percentage}%</span>
                              <Badge className="bg-violet-100 text-violet-700 text-[9px] font-black">
                                {dept.head_count}
                              </Badge>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                              className="h-1.5 rounded-full transition-all"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: departmentColors[idx % departmentColors.length]
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Technology Stack */}
        {hasTech && (
          <TabsContent value="tech" className="mt-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                    Technology Stack ({technologies.length} Technologies)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {Object.entries(techGroups).map(([category, techs]: [string, any]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                        <Code size={12} />
                        {category}
                      </h4>
                      <Badge variant="outline" className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                        {techs.length} items
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {techs.map((tech: any, idx: number) => (
                        <Badge 
                          key={idx}
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                        >
                          {tech.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Keywords */}
        {hasKeywords && (
          <TabsContent value="keywords" className="mt-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600 rounded-lg">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                    Company Keywords & Specializations ({keywords.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw: any, idx: number) => (
                    <Badge 
                      key={idx}
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium hover:bg-amber-100 transition-colors"
                    >
                      {kw.keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Classification */}
        {hasClassification && (
          <TabsContent value="classification" className="mt-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                    Industry Classification
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {hasCompanyData(data.industries) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                      Industries
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {data.industries.map((industry: string, idx: number) => (
                        <Badge key={idx} className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] font-bold">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {hasCompanyData(data.secondaryIndustries) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">
                      Secondary Industries
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {data.secondaryIndustries.map((industry: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 text-[10px] font-bold">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  {hasCompanyData(data.sicCodes) && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                        SIC Codes
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {data.sicCodes.map((code: string, idx: number) => (
                          <Badge key={idx} className="bg-slate-700 text-white text-[9px] font-mono">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {hasCompanyData(data.naicsCodes) && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                        NAICS Codes
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {data.naicsCodes.map((code: string, idx: number) => (
                          <Badge key={idx} className="bg-slate-700 text-white text-[9px] font-mono">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Funding */}
        {hasFunding && (
          <TabsContent value="funding" className="mt-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-slate-800 text-sm font-black uppercase tracking-wider">
                    Funding History
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {hasCompanyData(fundingEvents) ? (
                  <div className="space-y-4">
                    {fundingEvents.map((event: any, idx: number) => (
                      <div key={idx} className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge className="bg-amber-600 text-white text-[9px] font-bold mb-2">
                              {event.type}
                            </Badge>
                            <p className="text-sm font-black text-slate-900">
                              {event.amount} {event.currency}
                            </p>
                          </div>
                          {event.date && (
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {event.investors && (
                          <p className="text-xs text-slate-600 font-medium">
                            Investors: {event.investors}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 font-medium">
                      Total Funding: <span className="font-black text-slate-700">{data.totalFundingPrinted || formatCompanyCurrency(data.totalFunding)}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Department Pie Chart Component
const DepartmentPieChart = ({ departments, colors }: any) => {
  const total = departments.reduce((sum: number, d: any) => sum + d.head_count, 0);
  let currentAngle = 0;

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-auto">
        {departments.map((dept: any, idx: number) => {
          const percentage = (dept.head_count / total) * 100;
          const angle = (percentage / 100) * 360;
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const startX = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
          const startY = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
          
          currentAngle += angle;
          
          const endX = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
          const endY = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
          
          const pathData = `
            M 100 100
            L ${startX} ${startY}
            A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}
            Z
          `;
          
          return (
            <g key={idx}>
              <path
                d={pathData}
                fill={colors[idx % colors.length]}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                strokeWidth="2"
                stroke="white"
              />
            </g>
          );
        })}
        <circle cx="100" cy="100" r="50" fill="white" />
        <text x="100" y="95" textAnchor="middle" className="text-xs font-black fill-slate-700">
          {total}
        </text>
        <text x="100" y="110" textAnchor="middle" className="text-[8px] font-medium fill-slate-500">
          Employees
        </text>
      </svg>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon, label, value, color }: any) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("inline-flex p-2 rounded-lg bg-gradient-to-br text-white mb-3", colors[color as keyof typeof colors])}>
        {icon}
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">{label}</p>
      <p className="text-lg font-black text-slate-900">{value}</p>
    </div>
  );
};

const ContactCard = ({ icon, label, value, link }: any) => (
  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
    <div className="flex items-center gap-2 text-slate-400 mb-2">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </div>
    {link ? (
      <a href={link} target="_blank" rel="noreferrer" className="text-sm font-bold text-indigo-600 hover:underline break-all">
        {value}
      </a>
    ) : (
      <p className="text-sm font-bold text-slate-700 break-all">{value}</p>
    )}
  </div>
);

const SocialButton = ({ icon, url, color }: any) => (
  <a 
    href={url}
    target="_blank"
    rel="noreferrer"
    className={cn("p-3 rounded-lg text-white hover:scale-110 transition-transform shadow-md", color)}
  >
    {icon}
  </a>
);