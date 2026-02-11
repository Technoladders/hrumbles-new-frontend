// src/components/sales/company-search/CompanyTable.tsx
// Extracted table component with new column structure
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { 
  Globe, Linkedin, Users, MapPin, DollarSign, Eye, 
  MoreHorizontal, Sparkles, CheckCircle2, ExternalLink, 
  ListPlus, Info, Star, ChevronDown, Phone, Copy, Check,
  Facebook, Twitter, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ============================================================================
// Types & Constants
// ============================================================================

interface CompanyTableProps {
  companies: any[];
  selectedOrgs: Set<string>;
  onSelectAll: () => void;
  onSelectOrg: (id: string) => void;
  viewMode: "database" | "search";
  enrichingIds: Set<string>;
  onEnrich: (company: any) => void;
  onGetInfo: (apolloOrgId: string) => void;
  onPromote: (companyId: number) => void;
  onStageChange: (company: any, stage: string) => void;
  onAddToList: (company: any, fileId: string) => void;
  workspaceFiles: any[];
  currentUserId: string | null;
  isPromoting?: boolean;
  promotingId?: number | null;
  isGettingInfo?: boolean;
}

const STAGES = [
  'Identified',
  'Targeting',
  'In Outreach',
  'Warm',
  'Qualified Company',
  'Proposal Sent / In Discussion',
  'Negotiation',
  'Closed - Won',
  'Closed - Lost',
  'Re-engage Later',
];

const stageColors: Record<string, string> = {
  'Identified': 'bg-blue-100 text-blue-800',
  'Targeting': 'bg-indigo-100 text-indigo-800',
  'In Outreach': 'bg-teal-100 text-teal-800',
  'Warm': 'bg-yellow-100 text-yellow-800',
  'Qualified Company': 'bg-green-100 text-green-800',
  'Proposal Sent / In Discussion': 'bg-purple-100 text-purple-800',
  'Negotiation': 'bg-orange-100 text-orange-800',
  'Closed - Won': 'bg-emerald-100 text-emerald-800',
  'Closed - Lost': 'bg-red-100 text-red-800',
  'Re-engage Later': 'bg-gray-100 text-gray-800',
  'Intelligence': 'bg-slate-100 text-slate-600',
  'Active': 'bg-green-100 text-green-700',
  'default': 'bg-gray-100 text-gray-800',
};

// Country flag mapping
const countryCodeToFlag: Record<string, string> = {
  'US': '🇺🇸', 'GB': '🇬🇧', 'IN': '🇮🇳', 'BR': '🇧🇷', 'DE': '🇩🇪',
  'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹', 'JP': '🇯🇵', 'CN': '🇨🇳',
  'AU': '🇦🇺', 'SG': '🇸🇬', 'AE': '🇦🇪', 'ZA': '🇿🇦', 'MY': '🇲🇾',
  'MX': '🇲🇽', 'CH': '🇨🇭', 'EG': '🇪🇬', 'TR': '🇹🇷', 'CZ': '🇨🇿',
  'CA': '🇨🇦', 'NL': '🇳🇱', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴',
};

// Extract country code from phone
function getCountryCodeFromPhone(sanitizedPhone: string | null, phoneCountryCode: string | null): string | null {
  if (phoneCountryCode) return phoneCountryCode;
  if (!sanitizedPhone) return null;
  
  const prefixMap: Record<string, string> = {
    '+1': 'US', '+44': 'GB', '+91': 'IN', '+55': 'BR', '+49': 'DE',
    '+33': 'FR', '+34': 'ES', '+39': 'IT', '+81': 'JP', '+86': 'CN',
    '+61': 'AU', '+65': 'SG', '+971': 'AE', '+27': 'ZA', '+60': 'MY',
    '+52': 'MX', '+41': 'CH', '+20': 'EG', '+90': 'TR', '+420': 'CZ',
  };

  for (const [prefix, code] of Object.entries(prefixMap)) {
    if (sanitizedPhone.startsWith(prefix)) return code;
  }
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

const extractDomain = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace("www.", "");
  } catch {
    return null;
  }
};

const getInitials = (name: string) => (name ? name.slice(0, 2).toUpperCase() : "??");

const formatEmployeeCount = (count?: number | null) => {
  if (!count) return "—";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toLocaleString();
};

// ============================================================================
// X (Twitter) Icon Component
// ============================================================================

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  selectedOrgs,
  onSelectAll,
  onSelectOrg,
  viewMode,
  enrichingIds,
  onEnrich,
  onGetInfo,
  onPromote,
  onStageChange,
  onAddToList,
  workspaceFiles,
  currentUserId,
  isPromoting = false,
  promotingId = null,
  isGettingInfo = false,
}) => {
  const { toast } = useToast();
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const copyPhoneToClipboard = (phone: string, companyId: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(companyId);
    setTimeout(() => setCopiedPhone(null), 2000);
    toast({ title: "Copied", description: "Phone number copied to clipboard" });
  };

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full min-w-max divide-y divide-slate-200 table-fixed">
        {/* Table Header */}
        <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 shadow-sm">
          <tr>
            {/* Company Column - Sticky */}
            <th className="sticky top-0 left-0 z-30 bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider border-r border-slate-600/40 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.25)] w-[220px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={companies.length > 0 && companies.every((c: any) => selectedOrgs.has(c.id?.toString() || c.apollo_org_id || ""))}
                  onCheckedChange={onSelectAll}
                  className="border-white/70 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-3.5 w-3.5"
                />
                Company
              </div>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[160px]">
              <div className="flex items-center gap-1">
                <Phone size={10} />
                Phone
              </div>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[180px]">
              <div className="flex items-center gap-1">
                <MapPin size={10} />
                Location
              </div>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[140px]">Industry</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[100px]">
              <div className="flex items-center gap-1">
                <Users size={10} />
                Employees
              </div>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[100px]">Revenue</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[150px]">CRM Stage</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[100px]">Links</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[80px]">Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
          {companies.map((company: any) => {
            const companyId = company.id?.toString() || company.apollo_org_id || "";
            const isSelected = selectedOrgs.has(companyId);
            const domain = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
            const location = company.location || [company.city, company.state, company.country].filter(Boolean).join(", ");
            const isPromoted = company.status === "Active";
            const hasApolloData = !!company.apollo_org_id;
            
            // Phone data
            const phoneNumber = company.phone || company.primary_phone?.number || null;
            const sanitizedPhone = company.sanitized_phone || company.primary_phone?.sanitized_number || null;
            const countryCode = getCountryCodeFromPhone(sanitizedPhone, company.phone_country_code);
            const flag = countryCode ? countryCodeToFlag[countryCode] : null;

            // Revenue - display value only
            const revenue = company.revenue || company.annual_revenue_printed || company.organization_revenue_printed || null;

            return (
              <tr
                key={companyId}
                className={cn(
                  "group transition-colors duration-100",
                  isSelected ? "bg-purple-50/60" : "hover:bg-slate-50/80"
                )}
              >
                {/* Company Column - Sticky */}
                <td className="sticky left-0 z-5 bg-white group-hover:bg-slate-50 px-3 py-2 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.08)] border-r border-slate-100 w-[220px]">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectOrg(companyId)}
                      className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-3.5 w-3.5"
                    />
                    <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
                      <AvatarImage src={company.logo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[9px] font-bold">
                        {getInitials(company.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        {viewMode === "database" && company.id ? (
                          <RouterLink
                            to={`/companies/${company.id}`}
                            className="font-semibold text-slate-900 hover:text-purple-700 truncate text-[11px] block leading-tight"
                          >
                            {company.name}
                          </RouterLink>
                        ) : (
                          <span className="font-semibold text-slate-900 truncate text-[11px] block leading-tight">
                            {company.name}
                          </span>
                        )}
                        {hasApolloData && <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                        {isPromoted && <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />}
                      </div>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">
                        {domain || "No domain"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Phone Column */}
                <td className="px-3 py-2 whitespace-nowrap w-[160px]">
                  {phoneNumber ? (
                    <div className="flex items-center gap-1.5 group/phone">
                      {flag && <span className="text-sm">{flag}</span>}
                      <span className="text-[10px] text-slate-700 truncate max-w-[100px]">
                        {phoneNumber}
                      </span>
                      <button
                        onClick={() => copyPhoneToClipboard(phoneNumber, companyId)}
                        className="opacity-0 group-hover/phone:opacity-100 p-0.5 hover:bg-slate-100 rounded transition-opacity"
                      >
                        {copiedPhone === companyId ? (
                          <Check size={10} className="text-green-500" />
                        ) : (
                          <Copy size={10} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </td>

                {/* Location Column */}
                <td className="px-3 py-2 whitespace-nowrap w-[180px]">
                  {location ? (
                    <span className="text-[10px] text-slate-700 truncate block max-w-[160px]" title={location}>
                      {location}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </td>

                {/* Industry Column */}
                <td className="px-3 py-2 whitespace-nowrap w-[140px]">
                  {company.industry ? (
                    <span className="text-[10px] text-slate-700 truncate block max-w-[120px]" title={company.industry}>
                      {company.industry}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </td>

                {/* Employees Column */}
                <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                  <span className="text-[10px] font-medium text-slate-800">
                    {formatEmployeeCount(company.employee_count || company.estimated_num_employees)}
                  </span>
                </td>

                {/* Revenue Column - Value only, no icon */}
                <td className="px-3 py-2 whitespace-nowrap w-[100px]">
                  {revenue ? (
                    <span className="text-[10px] font-medium text-slate-800">
                      {revenue}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </td>

                {/* CRM Stage Column */}
                <td className="px-3 py-2 whitespace-nowrap w-[150px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-6 min-w-[120px] text-[9px] font-semibold uppercase tracking-tight rounded-md border shadow-sm px-2 py-0.5",
                          stageColors[company.stage || company.status || "default"]
                        )}
                      >
                        {company.stage || company.status || "Stage"}
                        <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[150px] max-h-60 overflow-y-auto text-[10px]">
                      {STAGES.map((stageOption) => (
                        <DropdownMenuItem
                          key={stageOption}
                          onClick={() => onStageChange(company, stageOption)}
                          className={cn(
                            "py-1.5 cursor-pointer text-[10px]",
                            (company.stage || company.status) === stageOption && "bg-purple-50 font-medium"
                          )}
                        >
                          {stageOption}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                {/* Links Column - All available links as icons */}
                <td className="px-3 py-2 whitespace-nowrap text-center w-[100px]">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {(company.website || company.website_url) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={company.website || company.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>Website</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(company.linkedin || company.linkedin_url) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={company.linkedin || company.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-[#0A66C2] transition-colors p-0.5"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>LinkedIn</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(company.twitter || company.twitter_url) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={company.twitter || company.twitter_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-black transition-colors p-0.5"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>X (Twitter)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(company.facebook || company.facebook_url) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={company.facebook || company.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-[#1877F2] transition-colors p-0.5"
                            >
                              <Facebook className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>Facebook</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {(company.crunchbase || company.crunchbase_url) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={company.crunchbase || company.crunchbase_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-orange-500 transition-colors p-0.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>Crunchbase</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </td>

                {/* Actions Column */}
                <td className="px-3 py-2 whitespace-nowrap text-center w-[80px]">
                  <div className="flex items-center justify-center gap-0.5">
                    {viewMode === "database" && company.id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-purple-50">
                              <RouterLink to={`/companies/${company.id}`}>
                                <Eye className="h-3.5 w-3.5" />
                              </RouterLink>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-[11px]">
                        {viewMode === "database" && !isPromoted && company.id && (
                          <DropdownMenuItem
                            onClick={() => onPromote(company.id)}
                            disabled={isPromoting}
                            className="text-green-600"
                          >
                            {isPromoting && promotingId === company.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            ) : (
                              <Star className="h-3.5 w-3.5 mr-2" />
                            )}
                            Promote to CRM
                          </DropdownMenuItem>
                        )}

                        {company.apollo_org_id && (
                          <DropdownMenuItem
                            onClick={() => onGetInfo(company.apollo_org_id)}
                            disabled={isGettingInfo}
                          >
                            <Info className="h-3.5 w-3.5 mr-2" />
                            Get Full Info
                          </DropdownMenuItem>
                        )}

                        {domain && (
                          <DropdownMenuItem
                            onClick={() => onEnrich(company)}
                            disabled={enrichingIds.has(companyId)}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-2" />
                            {enrichingIds.has(companyId) ? "Enriching..." : "Enrich Data"}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {workspaceFiles.length > 0 && (
                          <>
                            <DropdownMenuLabel className="text-[10px] text-slate-500 px-2 py-1">
                              Add to List
                            </DropdownMenuLabel>
                            {workspaceFiles.slice(0, 5).map((file: any) => (
                              <DropdownMenuItem
                                key={file.id}
                                onClick={() => onAddToList(company, file.id)}
                                className="text-[11px]"
                              >
                                <ListPlus className="h-3.5 w-3.5 mr-2" />
                                <span className="truncate">{file.name}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {(company.website || company.website_url) && (
                          <DropdownMenuItem asChild>
                            <a
                              href={company.website || company.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px]"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Visit Website
                            </a>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyTable;