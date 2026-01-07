// src/components/sales/company-detail/CompanyApolloTab.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Users,
  Globe,
  Linkedin,
  MapPin,
  Calendar,
  DollarSign,
  Sparkles,
  TrendingUp,
  Briefcase,
  Phone,
  Facebook,
  Twitter,
  Code,
  Tag,
  BarChart3,
  Mail,
  Award,
} from 'lucide-react';
import {
  getCachedCompanyApolloData,
  enrichCompanyFromApollo,
  type ApolloOrganization,
} from '@/services/apolloCompanySearch';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { CompanyDetail } from '@/types/company';

interface CompanyApolloTabProps {
  company: CompanyDetail;
}

export const CompanyApolloTab: React.FC<CompanyApolloTabProps> = ({ company }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Query Apollo data
  const { data: apolloData, isLoading, refetch } = useQuery({
    queryKey: ['apolloCompanyData', company.id],
    queryFn: () => getCachedCompanyApolloData(company.id),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Enrich mutation
  const [isEnriching, setIsEnriching] = React.useState(false);

  const handleEnrich = async () => {
    let domain = company.website;
    
    if (!domain) {
      toast({
        title: 'Website Required',
        description: 'Please add a website URL to enrich this company.',
        variant: 'destructive',
      });
      return;
    }

    domain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    setIsEnriching(true);
    try {
      await enrichCompanyFromApollo(domain, company.id, organization_id);

      toast({
        title: 'Company Enriched! 🎉',
        description: 'Company data has been successfully fetched from Apollo.io.',
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (error: any) {
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company data.',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No website
  if (!company.website) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-20 w-20 text-gray-300 mb-4" />
          <p className="text-gray-600 text-center font-semibold text-lg">No Website Available</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md text-center">
            Add a company website to enrich this company with detailed data from Apollo.io
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not enriched yet
  if (!apolloData) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-white rounded-full p-6 shadow-lg mb-6">
            <Building2 className="h-16 w-16 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Company Data Available</h3>
          <p className="text-gray-600 mb-8 text-center max-w-lg">
            Enrich this company with comprehensive data from Apollo.io including employee count,
            industry insights, revenue data, technologies, and much more.
          </p>
          <Button onClick={handleEnrich} disabled={isEnriching} size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Sparkles className="mr-2 h-5 w-5" />
            {isEnriching ? 'Enriching...' : 'Enrich with Apollo.io'}
          </Button>
          <p className="text-xs text-gray-500 mt-4">
            ✨ Uses your existing Apollo.io subscription • Takes ~3 seconds
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse departmental_head_count if available
  const departments = (apolloData as any).departmental_head_count || {};
  const departmentsList = Object.entries(departments)
    .filter(([_, count]) => count && count > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8);

  // Enriched - Show comprehensive data
  return (
    <div className="space-y-6">
      {/* Hero Header Card */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
              {apolloData.logo_url ? (
                <AvatarImage src={apolloData.logo_url} alt={apolloData.name} />
              ) : (
                <AvatarFallback className="bg-white text-purple-600 text-3xl font-bold">
                  {apolloData.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-2">{apolloData.name}</h1>
                  {apolloData.industry && (
                    <p className="text-purple-100 text-lg mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {apolloData.industry}
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    {apolloData.founded_year && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur">
                        📅 Founded {apolloData.founded_year}
                      </Badge>
                    )}
                    {apolloData.publicly_traded_symbol && (
                      <Badge variant="secondary" className="bg-green-500/30 text-white border-green-300/50 backdrop-blur">
                        📈 {apolloData.publicly_traded_symbol}
                      </Badge>
                    )}
                    {(apolloData as any).primary_domain && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur">
                        🌐 {(apolloData as any).primary_domain}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleEnrich} 
                  disabled={isEnriching}
                  className="bg-white text-purple-600 hover:bg-purple-50"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Re-enrich
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Employee Count */}
        {apolloData.estimated_num_employees && (
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Employees</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {apolloData.estimated_num_employees.toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Annual Revenue */}
        {apolloData.organization_revenue && (
          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${(apolloData.organization_revenue / 1000).toFixed(0)}K
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technologies */}
        {apolloData.technology_names && apolloData.technology_names.length > 0 && (
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Technologies</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {apolloData.technology_names.length}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Funding */}
        {apolloData.total_funding && (
          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Funding</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${(apolloData.total_funding / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Description */}
          {apolloData.short_description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                  About Company
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {apolloData.short_description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Technologies Stack */}
          {apolloData.technology_names && apolloData.technology_names.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  Technology Stack ({apolloData.technology_names.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {apolloData.technology_names.map((tech, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 hover:bg-blue-100 transition-colors"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Industry Keywords */}
          {apolloData.keywords && apolloData.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple-600" />
                  Industry Keywords & Expertise ({apolloData.keywords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {apolloData.keywords.slice(0, 50).map((keyword, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {apolloData.keywords.length > 50 && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                      +{apolloData.keywords.length - 50} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Breakdown */}
          {departmentsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Department Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentsList.map(([dept, count]) => {
                    const total = apolloData.estimated_num_employees || 1;
                    const percentage = Math.round(((count as number) / total) * 100);
                    const deptName = dept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    
                    return (
                      <div key={dept}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{deptName}</span>
                          <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-600" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(apolloData as any).primary_phone?.number && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <a href={`tel:${(apolloData as any).primary_phone.sanitized_number}`} className="text-purple-600 hover:underline font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {(apolloData as any).primary_phone.number}
                  </a>
                </div>
              )}

              {apolloData.website_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Website</p>
                  <a
                    href={apolloData.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline font-medium flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                  </a>
                </div>
              )}

              <Separator />

              {/* Social Links */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold">Social Media</p>
                
                {apolloData.linkedin_url && (
                  <a
                    href={apolloData.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Profile
                  </a>
                )}

                {(apolloData as any).twitter_url && (
                  <a
                    href={(apolloData as any).twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sky-500 hover:underline text-sm"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter Profile
                  </a>
                )}

                {(apolloData as any).facebook_url && (
                  <a
                    href={(apolloData as any).facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-700 hover:underline text-sm"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook Page
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {(apolloData.city || apolloData.state || apolloData.country) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  Headquarters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apolloData.city && (
                    <p className="text-gray-700">📍 {apolloData.city}</p>
                  )}
                  {apolloData.state && (
                    <p className="text-gray-600">{apolloData.state}</p>
                  )}
                  {apolloData.country && (
                    <p className="text-gray-600 font-medium">{apolloData.country}</p>
                  )}
                  {(apolloData as any).postal_code && (
                    <p className="text-gray-500 text-sm">📮 {(apolloData as any).postal_code}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Business Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Business Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {apolloData.latest_funding_stage && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Funding Stage</p>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                    {apolloData.latest_funding_stage}
                  </Badge>
                </div>
              )}

              {apolloData.retail_location_count && apolloData.retail_location_count > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Retail Locations</p>
                  <p className="font-medium text-gray-900">{apolloData.retail_location_count} locations</p>
                </div>
              )}

              {(apolloData as any).sic_codes && (apolloData as any).sic_codes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">SIC Codes</p>
                  <div className="flex gap-2">
                    {(apolloData as any).sic_codes.map((code: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(apolloData as any).naics_codes && (apolloData as any).naics_codes.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">NAICS Codes</p>
                  <div className="flex gap-2">
                    {(apolloData as any).naics_codes.map((code: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Source Badge */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Award className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-semibold text-gray-900">Data Source</p>
                  <p className="text-xs text-gray-600">Enriched by Apollo.io</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

