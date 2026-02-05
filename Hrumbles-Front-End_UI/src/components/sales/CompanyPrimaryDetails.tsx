// Hrumbles-Front-End_UI/src/components/sales/CompanyPrimaryDetails.tsx
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, Globe, Linkedin, Facebook, ChevronDown, ChevronUp,
  ExternalLink, Copy, Check
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CompanyPrimaryDetailsProps {
  company: any;
}

export const CompanyPrimaryDetails: React.FC<CompanyPrimaryDetailsProps> = ({ company }) => {
  const { toast } = useToast();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const enrichment = company?.enrichment_organizations;
  const keywords = enrichment?.enrichment_org_keywords || [];
  
  // Extract data from enrichment or company
  const data = {
    name: enrichment?.name || company.name,
    description: enrichment?.short_description || company.about,
    industry: enrichment?.industry || company.industry,
    industries: enrichment?.industries || (company.industry ? [company.industry] : []),
    keywords: keywords.map((k: any) => k.keyword),
    subsidiaryOf: null, // Would need parent company data
    subsidiaries: enrichment?.num_suborganizations || 0,
    tradingSymbol: enrichment?.publicly_traded_symbol 
      ? `${enrichment?.publicly_traded_exchange?.toUpperCase() || 'STOCK'}: ${enrichment?.publicly_traded_symbol}`
      : null,
    marketCap: null, // Not in current data
    foundedYear: enrichment?.founded_year || company.start_date,
    employees: enrichment?.estimated_num_employees || company.employee_count,
    sicCodes: enrichment?.sic_codes || [],
    naicsCodes: enrichment?.naics_codes || [],
    website: enrichment?.website_url || company.website,
    linkedinUrl: enrichment?.linkedin_url || company.linkedin,
    facebookUrl: enrichment?.facebook_url || company.facebook,
    twitterUrl: enrichment?.twitter_url || company.twitter,
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  return (
    <div className="divide-y divide-gray-200">
      {/* Company Details Section */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <span className="text-sm font-semibold text-gray-900">Company details</span>
          {detailsOpen ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Description */}
            {data.description && (
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {data.description.length > 200 
                    ? `${data.description.substring(0, 200)}...` 
                    : data.description
                  }
                </p>
                {data.description.length > 200 && (
                  <button className="text-sm text-blue-600 hover:text-blue-700 mt-1">
                    Show More
                  </button>
                )}
              </div>
            )}

            {/* Industries */}
            {data.industries && data.industries.length > 0 && (
              <DetailRow label="Industries">
                <div className="flex flex-wrap gap-1.5">
                  {data.industries.slice(0, 3).map((industry: string, idx: number) => (
                    <Badge 
                      key={idx}
                      variant="secondary"
                      className="text-xs font-normal bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    >
                      {industry}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            )}

            {/* Keywords */}
            {data.keywords && data.keywords.length > 0 && (
              <DetailRow label="Keywords">
                <div className="flex flex-wrap gap-1.5">
                  {data.keywords.slice(0, 5).map((keyword: string, idx: number) => (
                    <Badge 
                      key={idx}
                      variant="outline"
                      className="text-xs font-normal bg-gray-50 text-gray-600 border-gray-200"
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {data.keywords.length > 5 && (
                    <button className="text-xs text-blue-600 hover:text-blue-700">
                      Show all {data.keywords.length} ↓
                    </button>
                  )}
                </div>
              </DetailRow>
            )}

            {/* Subsidiary Of */}
            {data.subsidiaryOf && (
              <DetailRow label="Subsidiary of">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                    <Building2 size={12} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-900">{data.subsidiaryOf}</span>
                </div>
              </DetailRow>
            )}

            {/* Subsidiaries */}
            {data.subsidiaries > 0 && (
              <DetailRow label="Subsidiaries">
                <span className="text-sm text-gray-900">
                  {data.name} has {data.subsidiaries} subsidiaries
                </span>
              </DetailRow>
            )}

            {/* Trading Symbol */}
            {data.tradingSymbol && (
              <DetailRow label="Trading Symbol">
                <span className="text-sm font-medium text-gray-900">{data.tradingSymbol}</span>
              </DetailRow>
            )}

            {/* Market Cap */}
            {data.marketCap && (
              <DetailRow label="Market Cap">
                <span className="text-sm font-medium text-gray-900">{data.marketCap}</span>
              </DetailRow>
            )}

            {/* Founding Year */}
            {data.foundedYear && (
              <DetailRow label="Founding Year">
                <span className="text-sm text-gray-900">{data.foundedYear}</span>
              </DetailRow>
            )}

            {/* Number of Employees */}
            {data.employees && (
              <DetailRow label="Number of Employees">
                <span className="text-sm text-gray-900">
                  {typeof data.employees === 'number' 
                    ? data.employees.toLocaleString() 
                    : data.employees
                  } employees
                </span>
              </DetailRow>
            )}

            {/* SIC Codes */}
            {data.sicCodes && data.sicCodes.length > 0 && (
              <DetailRow label="SIC Codes">
                <div className="flex flex-wrap gap-1.5">
                  {data.sicCodes.map((code: string, idx: number) => (
                    <Badge 
                      key={idx}
                      className="text-xs font-mono bg-gray-700 text-white border-none"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            )}

            {/* NAICS Codes */}
            {data.naicsCodes && data.naicsCodes.length > 0 && (
              <DetailRow label="NAICS Codes">
                <div className="flex flex-wrap gap-1.5">
                  {data.naicsCodes.map((code: string, idx: number) => (
                    <Badge 
                      key={idx}
                      className="text-xs font-mono bg-gray-700 text-white border-none"
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </DetailRow>
            )}

            {/* Links */}
            <DetailRow label="Links">
              <div className="flex items-center gap-2">
                {data.website && (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Website"
                  >
                    <Globe size={18} className="text-gray-500" />
                  </a>
                )}
                {data.linkedinUrl && (
                  <a
                    href={data.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="LinkedIn"
                  >
                    <Linkedin size={18} className="text-[#0A66C2]" />
                  </a>
                )}
                {data.facebookUrl && (
                  <a
                    href={data.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Facebook"
                  >
                    <Facebook size={18} className="text-[#1877F2]" />
                  </a>
                )}
                {data.twitterUrl && (
                  <a
                    href={data.twitterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="X (Twitter)"
                  >
                    <XIcon />
                  </a>
                )}
              </div>
            </DetailRow>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Detail Row Component
const DetailRow = ({ 
  label, 
  children 
}: { 
  label: string; 
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
      {label}
    </span>
    <div>{children}</div>
  </div>
);

// X (Twitter) Icon
const XIcon = () => (
  <svg className="w-[18px] h-[18px] text-gray-800" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default CompanyPrimaryDetails;