import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, Calendar, Users, Globe, Linkedin, MapPin, 
  Briefcase, DollarSign, Award, Phone, ShieldCheck
} from 'lucide-react';
import { 
  extractCompanyFromRaw, 
  hasCompanyData, 
  formatCompanyNumber 
} from '@/utils/companyDataExtractor';
import { cn } from '@/lib/utils';

interface CompanyPrimaryDetailsProps {
  company: any;
}

export const CompanyPrimaryDetails: React.FC<CompanyPrimaryDetailsProps> = ({ company }) => {
  const data = extractCompanyFromRaw(company);
  const enrichment = company?.enrichment_organizations;
  const hasEnrichment = !!enrichment;

  return (
    <div className="space-y-4 sticky top-24">
      {/* Primary Card */}
      <Card className="border-none shadow-lg overflow-hidden bg-white">
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-900 to-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-white text-sm font-black uppercase tracking-wider">
              Company Profile
            </CardTitle>
            {hasEnrichment && (
              <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-400/30 text-[8px] font-black uppercase">
                <ShieldCheck size={10} className="mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {/* Core Details */}
          {data.industry && (
            <DetailRow 
              icon={<Briefcase className="w-4 h-4" />}
              label="Industry"
              value={data.industry}
            />
          )}

          {data.foundedYear && (
            <DetailRow 
              icon={<Calendar className="w-4 h-4" />}
              label="Founded"
              value={data.foundedYear}
            />
          )}

          {data.estimatedEmployees && (
            <DetailRow 
              icon={<Users className="w-4 h-4" />}
              label="Company Size"
              value={
                <span className="flex items-center gap-2">
                  <span className="font-bold">{formatCompanyNumber(data.estimatedEmployees)}</span>
                  <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-bold px-1.5 py-0">
                    Employees
                  </Badge>
                </span>
              }
            />
          )}

          <Separator />

          {/* Location */}
          {(data.city || data.state || data.country) && (
            <DetailRow 
              icon={<MapPin className="w-4 h-4" />}
              label="Headquarters"
              value={
                <div className="space-y-1">
                  <p className="font-semibold">
                    {[data.city, data.state, data.country].filter(Boolean).join(', ')}
                  </p>
                  {data.rawAddress && data.rawAddress !== [data.city, data.state, data.country].filter(Boolean).join(', ') && (
                    <p className="text-[10px] text-slate-500">{data.rawAddress}</p>
                  )}
                </div>
              }
            />
          )}

          <Separator />

          {/* Contact Methods */}
          {(data.websiteUrl || data.primaryDomain) && (
            <DetailRow 
              icon={<Globe className="w-4 h-4" />}
              label="Website"
              value={
                <a 
                  href={data.websiteUrl || `https://${data.primaryDomain}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 hover:underline font-semibold text-sm break-all"
                >
                  {data.primaryDomain || data.websiteUrl}
                </a>
              }
            />
          )}

          {data.phoneNumber && (
            <DetailRow 
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={
                <a href={`tel:${data.phoneNumber}`} className="text-indigo-600 hover:underline font-semibold">
                  {data.phoneNumber}
                </a>
              }
            />
          )}

          {data.linkedinUrl && (
            <DetailRow 
              icon={<Linkedin className="w-4 h-4" />}
              label="LinkedIn"
              value={
                <a 
                  href={data.linkedinUrl}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-semibold text-sm inline-flex items-center gap-1"
                >
                  View Profile
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {(data.annualRevenue || data.annualRevenuePrinted || data.totalFunding || data.totalFundingPrinted) && (
        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-white to-green-50">
          <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-green-600 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xs font-black uppercase tracking-wider">
                Financial Overview
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data.annualRevenuePrinted && (
              <MetricBox 
                label="Annual Revenue"
                value={data.annualRevenuePrinted}
                color="text-green-600"
              />
            )}
            {data.totalFundingPrinted && (
              <MetricBox 
                label="Total Funding"
                value={data.totalFundingPrinted}
                color="text-purple-600"
              />
            )}
            {data.latestFundingStage && (
              <MetricBox 
                label="Latest Stage"
                value={
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] font-bold">
                    {data.latestFundingStage}
                  </Badge>
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock Information */}
      {(data.publiclyTradedSymbol || data.publiclyTradedExchange) && (
        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-white to-blue-50">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <Award className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-slate-800 text-xs font-black uppercase tracking-wider">
                Public Company
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data.publiclyTradedSymbol && (
              <MetricBox 
                label="Stock Symbol"
                value={
                  <Badge className="bg-blue-600 text-white border-none text-sm font-black px-3 py-1">
                    {data.publiclyTradedSymbol}
                  </Badge>
                }
              />
            )}
            {data.publiclyTradedExchange && (
              <MetricBox 
                label="Exchange"
                value={data.publiclyTradedExchange}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      {(data.alexaRanking || data.numSuborganizations > 0 || data.retailLocationCount > 0) && (
        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="text-slate-700 text-xs font-black uppercase tracking-wider">
              Additional Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data.alexaRanking && (
              <MetricBox 
                label="Alexa Ranking"
                value={`#${formatCompanyNumber(data.alexaRanking)}`}
              />
            )}
            {data.numSuborganizations > 0 && (
              <MetricBox 
                label="Subsidiaries"
                value={data.numSuborganizations}
              />
            )}
            {data.retailLocationCount > 0 && (
              <MetricBox 
                label="Retail Locations"
                value={data.retailLocationCount}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Languages */}
      {hasCompanyData(data.languages) && (
        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardHeader className="pb-3 bg-slate-50 border-b border-slate-100 p-4">
            <CardTitle className="text-slate-700 text-xs font-black uppercase tracking-wider">
              Languages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1.5">
              {data.languages.map((lang: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[9px] font-semibold bg-slate-50 text-slate-700"
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper Components
const DetailRow = ({ icon, label, value }: any) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-400 mt-0.5">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm text-slate-900">{value || 'N/A'}</div>
    </div>
  </div>
);

const MetricBox = ({ label, value, color }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      {label}
    </span>
    <span className={cn("text-sm font-black", color || "text-slate-900")}>
      {value}
    </span>
  </div>
);

export default CompanyPrimaryDetails;