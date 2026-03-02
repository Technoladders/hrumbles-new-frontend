// Hrumbles-Front-End_UI/src/components/sales/CompanyPrimaryDetails.tsx
// ✅ ALL business logic preserved verbatim — UI fully replaced
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Globe, Linkedin, Facebook, ChevronDown, ChevronUp,
  ExternalLink, Copy, Check, Phone, MapPin, Calendar,
  Users, DollarSign, TrendingUp, Briefcase, Tag, Code2,
  Landmark, Award, Link2, Building, UserPlus
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface CompanyPrimaryDetailsProps {
  company: any;
  employees?: any[];
  isLoadingEmployees?: boolean;
  companyId?: number;
  companyName?: string;
  onEditEmployee?: (emp: any) => void;
  onDataUpdate?: () => void;
}

// ── Motion Variants ────────────────────────────────────────────────────────
const collapseVariants = {
  open: { opacity: 1, height: 'auto', transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  closed: { opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const staggerList = {
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemFade = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

const badgePop = {
  hidden: { opacity: 0, scale: 0.82 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

// ── Sub-Components ─────────────────────────────────────────────────────────

/** Section header — collapsible trigger */
const SectionHeader = ({
  icon,
  label,
  count,
  isOpen,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between px-4 py-3 group hover:bg-[#F8F6F3] transition-colors duration-100"
  >
    <div className="flex items-center gap-2">
      <span className="text-[#9C9189] group-hover:text-[#5B4FE8] transition-colors">{icon}</span>
      <span className="text-[10px] font-[700] text-[#6A6057] uppercase tracking-[0.07em] group-hover:text-[#1C1916] transition-colors">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F0EEFF] text-[#5B4FE8] text-[9px] font-[700]">
          {count}
        </span>
      )}
    </div>
    <motion.span
      animate={{ rotate: isOpen ? 0 : -90 }}
      transition={{ duration: 0.2 }}
      className="text-[#9C9189]"
    >
      <ChevronDown size={13} />
    </motion.span>
  </button>
);

/** Labeled data row */
const DataRow = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-[#9C9189]">{icon}</span>}
      <span className="text-[9px] font-[700] text-[#9C9189] uppercase tracking-[0.09em]">{label}</span>
    </div>
    <div className="pl-0">{children}</div>
  </div>
);

/** Stat tile */
const StatTile = ({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: string;
}) => (
  <motion.div
    className={`rounded-xl p-3 border border-[#E5E0D8] ${accent}`}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.15 }}
  >
    <div className="flex items-center gap-1.5 mb-1.5">{icon}</div>
    <p className="text-[13px] font-[700] text-[#1C1916] leading-none font-['DM_Mono',monospace]">{value}</p>
    <p className="text-[9px] font-[600] text-[#9C9189] uppercase tracking-[0.07em] mt-1">{label}</p>
  </motion.div>
);

/** Tag/badge chip */
const Chip = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'accent' | 'dim' | 'tech' }) => {
  const styles = {
    default: 'bg-[#F0EDE8] text-[#6A6057] border-[#E5E0D8]',
    accent:  'bg-[#F0EEFF] text-[#5B4FE8] border-[#D9D4FF]',
    dim:     'bg-white text-[#9C9189] border-[#E5E0D8]',
    tech:    'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]',
  };
  return (
    <motion.span
      variants={badgePop}
      className={`inline-flex items-center text-[10px] font-[500] px-2 py-0.5 rounded-md border ${styles[variant]}`}
    >
      {children}
    </motion.span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
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

  // ── Logic (preserved verbatim) ───────────────────────────────────────────
  const keywords = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) ||
    companyData?.keywords || [];

  const technologies = enrichment?.enrichment_org_technologies ||
    companyData?.current_technologies ||
    (companyData?.technologies ? companyData.technologies.map((t: string) => ({ name: t })) : []);

  const fundingEvents = enrichment?.enrichment_org_funding_events ||
    companyData?.funding_events || [];

  const departments = enrichment?.enrichment_org_departments || [];

  const data = {
    name: enrichment?.name || company?.name,
    description: enrichment?.short_description || enrichment?.seo_description || company?.about || company?.description,
    industry: enrichment?.industry || company?.industry,
    industries: enrichment?.industries || companyData?.industries || (company?.industry ? [company.industry] : []),
    secondaryIndustries: enrichment?.secondary_industries || companyData?.secondary_industries || [],
    keywords,
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
    technologies,
    fundingEvents,
    departments,
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="font-['DM_Sans',system-ui,sans-serif]">

      {/* ── Company Details Section ─────────────────────────────────────── */}
      <div className="border-b border-[#F0EDE8]">
        <SectionHeader
          icon={<Building2 size={13} />}
          label="Company Details"
          isOpen={detailsOpen}
          onToggle={() => setDetailsOpen(!detailsOpen)}
        />
        <AnimatePresence initial={false}>
          {detailsOpen && (
            <motion.div
              key="details"
              variants={collapseVariants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-5 space-y-4">
                {/* Description */}
                {data.description && (
                  <p className="text-[12px] text-[#6A6057] leading-[1.6] bg-[#F8F6F3] rounded-xl p-3 border border-[#EDE9E3]">
                    {data.description}
                  </p>
                )}

                {/* Quick Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  {data.foundedYear && (
                    <StatTile
                      icon={<Calendar size={12} className="text-[#5B4FE8]" />}
                      value={data.foundedYear}
                      label="Founded"
                      accent="bg-[#F8F6FF]"
                    />
                  )}
                  {data.employees && (
                    <StatTile
                      icon={<Users size={12} className="text-[#16A34A]" />}
                      value={formatNumber(data.employees) || data.employees}
                      label="Employees"
                      accent="bg-[#F0FDF4]"
                    />
                  )}
                  {data.annualRevenue && (
                    <StatTile
                      icon={<DollarSign size={12} className="text-[#D97706]" />}
                      value={data.annualRevenue}
                      label="Revenue"
                      accent="bg-[#FFFBEB]"
                    />
                  )}
                </div>

                {/* Industries */}
                {data.industries.length > 0 && (
                  <DataRow label="Industries" icon={<Briefcase size={11} />}>
                    <motion.div
                      className="flex flex-wrap gap-1 mt-1"
                      variants={staggerList}
                      initial="hidden"
                      animate="visible"
                    >
                      {data.industries.map((industry: string, idx: number) => (
                        <Chip key={idx} variant="accent">{industry}</Chip>
                      ))}
                      {data.secondaryIndustries.map((industry: string, idx: number) => (
                        <Chip key={`s${idx}`} variant="dim">{industry}</Chip>
                      ))}
                    </motion.div>
                  </DataRow>
                )}

                {/* Keywords */}
                {data.keywords.length > 0 && (
                  <DataRow label="Keywords" icon={<Tag size={11} />}>
                    <motion.div
                      className="flex flex-wrap gap-1 mt-1"
                      variants={staggerList}
                      initial="hidden"
                      animate="visible"
                    >
                      {(showAllKeywords ? data.keywords : data.keywords.slice(0, 8)).map((kw: string, idx: number) => (
                        <Chip key={idx} variant="default">{kw}</Chip>
                      ))}
                    </motion.div>
                    {data.keywords.length > 8 && (
                      <button
                        onClick={() => setShowAllKeywords(!showAllKeywords)}
                        className="mt-1.5 text-[10px] font-[600] text-[#5B4FE8] hover:text-[#4A3FD6] transition-colors"
                      >
                        {showAllKeywords ? '↑ Show less' : `+${data.keywords.length - 8} more`}
                      </button>
                    )}
                  </DataRow>
                )}

                {/* Technologies */}
                {data.technologies.length > 0 && (
                  <DataRow label="Technologies" icon={<Code2 size={11} />}>
                    <motion.div
                      className="flex flex-wrap gap-1 mt-1"
                      variants={staggerList}
                      initial="hidden"
                      animate="visible"
                    >
                      {(showAllTech ? data.technologies : data.technologies.slice(0, 6)).map((tech: any, idx: number) => (
                        <Chip key={idx} variant="tech">{tech.name || tech}</Chip>
                      ))}
                    </motion.div>
                    {data.technologies.length > 6 && (
                      <button
                        onClick={() => setShowAllTech(!showAllTech)}
                        className="mt-1.5 text-[10px] font-[600] text-[#5B4FE8] hover:text-[#4A3FD6] transition-colors"
                      >
                        {showAllTech ? '↑ Show less' : `+${data.technologies.length - 6} more`}
                      </button>
                    )}
                  </DataRow>
                )}

                {/* Parent Company */}
                {data.ownedBy && (
                  <DataRow label="Parent Company" icon={<Building size={11} />}>
                    <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                      <Building2 size={12} className="text-[#D97706]" />
                      <span className="text-[12px] font-[500] text-[#1C1916]">{data.ownedBy.name}</span>
                      {data.ownedBy.website_url && (
                        <a href={data.ownedBy.website_url} target="_blank" rel="noreferrer"
                          className="ml-auto text-[#5B4FE8] hover:text-[#4A3FD6]">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </DataRow>
                )}

                {/* Stock */}
                {data.tradingSymbol && (
                  <DataRow label="Stock" icon={<TrendingUp size={11} />}>
                    <span className="inline-flex items-center mt-1 px-2.5 py-1 bg-[#ECFDF5] text-[#16A34A] border border-[#BBF7D0] rounded-md text-[11px] font-['DM_Mono',monospace] font-[600]">
                      {data.tradingExchange?.toUpperCase()}: {data.tradingSymbol}
                    </span>
                  </DataRow>
                )}

                {/* Industry Codes */}
                {(data.sicCodes.length > 0 || data.naicsCodes.length > 0) && (
                  <DataRow label="Industry Codes" icon={<Award size={11} />}>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.sicCodes.map((code: string, idx: number) => (
                        <span key={`sic-${idx}`} className="inline-flex items-center text-[10px] font-['DM_Mono',monospace] font-[600] px-2 py-0.5 bg-[#1C1916] text-white rounded-md">
                          SIC {code}
                        </span>
                      ))}
                      {data.naicsCodes.map((code: string, idx: number) => (
                        <span key={`naics-${idx}`} className="inline-flex items-center text-[10px] font-['DM_Mono',monospace] font-[600] px-2 py-0.5 bg-[#374151] text-white rounded-md">
                          NAICS {code}
                        </span>
                      ))}
                    </div>
                  </DataRow>
                )}

                {/* Location */}
                {formatLocation() && (
                  <DataRow label="Location" icon={<MapPin size={11} />}>
                    <div className="mt-1">
                      <p className="text-[12px] text-[#1C1916] font-[500]">{formatLocation()}</p>
                      {data.address && <p className="text-[11px] text-[#9C9189] mt-0.5">{data.address}</p>}
                    </div>
                  </DataRow>
                )}

                {/* Phone */}
                {data.phone && (
                  <DataRow label="Phone" icon={<Phone size={11} />}>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-[#1C1916] font-['DM_Mono',monospace]">{data.phone}</span>
                      <motion.button
                        onClick={() => copyToClipboard(data.phone, 'phone')}
                        className="p-1 rounded-md hover:bg-[#F0EDE8] transition-colors"
                        whileTap={{ scale: 0.9 }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {copiedField === 'phone' ? (
                            <motion.div key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                              <Check size={11} className="text-[#16A34A]" />
                            </motion.div>
                          ) : (
                            <motion.div key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                              <Copy size={11} className="text-[#9C9189]" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </DataRow>
                )}

                {/* Languages */}
                {data.languages.length > 0 && (
                  <DataRow label="Languages" icon={<Globe size={11} />}>
                    <p className="text-[12px] text-[#6A6057] mt-1">{[...new Set(data.languages)].join(', ')}</p>
                  </DataRow>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Financials Section ──────────────────────────────────────────── */}
      {(data.totalFunding || data.latestFundingStage || data.fundingEvents.length > 0) && (
        <div className="border-b border-[#F0EDE8]">
          <SectionHeader
            icon={<DollarSign size={13} />}
            label="Funding & Financials"
            count={data.fundingEvents.length}
            isOpen={financialsOpen}
            onToggle={() => setFinancialsOpen(!financialsOpen)}
          />
          <AnimatePresence initial={false}>
            {financialsOpen && (
              <motion.div
                key="financials"
                variants={collapseVariants}
                initial="closed"
                animate="open"
                exit="closed"
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-5 space-y-3">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    {data.totalFunding && (
                      <div className="rounded-xl p-3 bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0]">
                        <p className="text-[9px] font-[700] text-[#16A34A] uppercase tracking-[0.08em]">Total Raised</p>
                        <p className="text-[16px] font-[800] text-[#14532D] mt-1 font-['DM_Mono',monospace] leading-none">
                          {data.totalFunding}
                        </p>
                      </div>
                    )}
                    {data.latestFundingStage && (
                      <div className="rounded-xl p-3 bg-gradient-to-br from-[#F0EEFF] to-[#EDE9FE] border border-[#D9D4FF]">
                        <p className="text-[9px] font-[700] text-[#5B4FE8] uppercase tracking-[0.08em]">Latest Stage</p>
                        <p className="text-[13px] font-[700] text-[#3730A3] mt-1 leading-tight">{data.latestFundingStage}</p>
                      </div>
                    )}
                  </div>

                  {/* Events */}
                  {data.fundingEvents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-[700] text-[#9C9189] uppercase tracking-[0.09em]">Funding Rounds</p>
                      {data.fundingEvents.slice(0, 3).map((event: any, idx: number) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white border border-[#E5E0D8] rounded-xl p-3 hover:border-[#5B4FE8] transition-colors duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-[700] px-2 py-0.5 bg-[#F0EEFF] text-[#5B4FE8] rounded-md">
                              {event.type || 'Funding'}
                            </span>
                            {event.date && (
                              <span className="text-[10px] text-[#9C9189] font-['DM_Mono',monospace]">
                                {new Date(event.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {event.amount && (
                            <p className="text-[14px] font-[800] text-[#1C1916] mt-2 font-['DM_Mono',monospace]">
                              {event.currency || '$'}{event.amount}
                            </p>
                          )}
                          {event.investors && (
                            <p className="text-[10px] text-[#9C9189] mt-1 truncate">{event.investors}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── People Section ──────────────────────────────────────────────── */}
      <div className="border-b border-[#F0EDE8]">
        <SectionHeader
          icon={<Users size={13} />}
          label="People"
          count={employees.length}
          isOpen={peopleOpen}
          onToggle={() => setPeopleOpen(!peopleOpen)}
        />
        <AnimatePresence initial={false}>
          {peopleOpen && (
            <motion.div
              key="people"
              variants={collapseVariants}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-4">
                {isLoadingEmployees ? (
                  <div className="py-8 flex flex-col items-center gap-2">
                    <div className="w-7 h-7 rounded-full border-2 border-[#E5E0D8] border-t-[#5B4FE8] animate-spin" />
                    <p className="text-[11px] text-[#9C9189]">Loading people...</p>
                  </div>
                ) : employees.length > 0 ? (
                  <motion.div
                    className="space-y-0.5"
                    variants={staggerList}
                    initial="hidden"
                    animate="visible"
                  >
                    {employees.slice(0, 5).map((person: any, idx: number) => (
                      <motion.div
                        key={idx}
                        variants={itemFade}
                        onClick={() => onEditEmployee?.(person)}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer hover:bg-[#F8F6F3] group transition-colors duration-100"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#F0EDE8] border border-[#E5E0D8] flex-shrink-0 overflow-hidden">
                          {person.photo_url ? (
                            <img src={person.photo_url} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-[700] text-[#6A6057]">
                              {person.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-[600] text-[#1C1916] truncate group-hover:text-[#5B4FE8] transition-colors">
                            {person.name}
                          </p>
                          <p className="text-[10px] text-[#9C9189] truncate">{person.job_title || person.designation}</p>
                        </div>

                        <ExternalLink size={11} className="text-[#D5CFC5] group-hover:text-[#5B4FE8] flex-shrink-0 transition-colors" />
                      </motion.div>
                    ))}

                    {employees.length > 5 && (
                      <button className="w-full mt-1 py-2 text-[11px] font-[600] text-[#5B4FE8] hover:text-[#4A3FD6] hover:bg-[#F0EEFF] rounded-xl transition-colors duration-100">
                        View all {employees.length} people →
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
                      <Users size={18} className="text-[#D5CFC5]" />
                    </div>
                    <p className="text-[12px] text-[#9C9189]">No people found</p>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-[600] text-[#5B4FE8] bg-[#F0EEFF] border border-[#D9D4FF] rounded-lg hover:bg-[#E8E4FF] transition-colors">
                      <UserPlus size={11} />
                      Add person
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Department Distribution ─────────────────────────────────────── */}
      {data.departments.length > 0 && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={13} className="text-[#9C9189]" />
            <span className="text-[10px] font-[700] text-[#6A6057] uppercase tracking-[0.07em]">Team Breakdown</span>
          </div>
          <div className="space-y-2.5">
            {data.departments
              .filter((d: any) => d.head_count > 0)
              .sort((a: any, b: any) => b.head_count - a.head_count)
              .slice(0, 5)
              .map((dept: any, idx: number) => {
                const maxCount = Math.max(...data.departments.map((d: any) => d.head_count));
                const percentage = (dept.head_count / maxCount) * 100;
                const colors = [
                  'bg-[#5B4FE8]', 'bg-[#16A34A]', 'bg-[#D97706]',
                  'bg-[#DC2626]', 'bg-[#0891B2]'
                ];
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-[500] text-[#6A6057] capitalize">
                        {dept.department_name?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">
                        {dept.head_count}
                      </span>
                    </div>
                    <div className="w-full bg-[#F0EDE8] rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full ${colors[idx % colors.length]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
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

export default CompanyPrimaryDetails;