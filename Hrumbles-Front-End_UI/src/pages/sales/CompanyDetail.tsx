// Hrumbles-Front-End_UI/src/pages/sales/CompanyDetail.tsx
// ✅ ALL business logic preserved verbatim
// Layout: sidebar removed → full-width main canvas
//         EmployeeGrowthIntelligence added below CompanyOverviewTab
// Changes: Updated contacts query to fetch by company_id OR (company_id is null AND company_name matches)

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { CompanyOverviewTab }          from "@/components/sales/company-detail/CompanyOverviewTab";
import EmployeeGrowthIntelligence      from "@/components/sales/company-detail/EmployeeGrowthIntelligence";
import { AddToCompanyListModal }        from '@/components/sales/company-search/AddToCompanyListModal';
import CompanyEditForm                  from "@/components/sales/CompanyEditForm";

import {
  Sparkles, RefreshCw, ListPlus, Globe, Linkedin,
  Twitter, Facebook, MapPin, Building2, Loader2, ChevronLeft
} from "lucide-react";

// ── Motion ─────────────────────────────────────────────────────────────────
const pageVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const blockIn = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page:    "min-h-screen font-['DM_Sans',system-ui,sans-serif]",
  bar:     "sticky top-0 z-50 bg-white/96 backdrop-blur-sm border-b border-[#E5E0D8]",
  barInner:"px-6 py-0",
  bc:      "flex items-center gap-1.5 text-[11px] font-[500] text-[#9C9189] py-2 border-b border-[#F0EDE8]",
  bcBtn:   "hover:text-[#1C1916] transition-colors cursor-pointer flex items-center gap-0.5",
  hdrRow:  "flex items-center justify-between py-3 gap-4",
  logoBox: "w-10 h-10 rounded-xl border border-[#E5E0D8] bg-gradient-to-br from-[#5B4FE8] to-[#7C6FF7] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden",
  name:    "text-[18px] font-[650] text-[#1C1916] tracking-[-0.01em] leading-tight",
  metaRow: "flex items-center gap-2 mt-0.5 flex-wrap",
  metaPill:"inline-flex items-center gap-1 text-[11px] font-[500] text-[#6A6057] uppercase tracking-[0.04em]",
  socialBtn:"p-1.5 rounded-md border border-[#E5E0D8] hover:border-[#5B4FE8] hover:bg-[#F0EEFF] transition-all duration-150",
  listBtn: "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-[600] text-[#6A6057] bg-white border border-[#D5CFC5] rounded-lg hover:border-[#5B4FE8] hover:text-[#5B4FE8] hover:bg-[#F0EEFF] transition-all duration-150",
  enrichBtn:"inline-flex items-center gap-2 px-4 py-1.5 text-[12px] font-[700] text-white rounded-lg transition-all",
  enrichOn: "bg-[#5B4FE8] hover:bg-[#4A3FD6] shadow-[0_2px_8px_rgba(91,79,232,0.35)]",
  enrichOff:"bg-[#5B4FE8]/70 cursor-not-allowed",
  canvas:  "px-6 py-6 space-y-5 max-w-[1400px] mx-auto",
};

// ── Component ──────────────────────────────────────────────────────────────
const CompanyDetail = () => {
  const { toast }  = useToast();
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const queryClient = useQueryClient();
  const companyId  = parseInt(id || "0");

  const user = useSelector((state: any) => state.auth.user);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const { data: company, isLoading, error: companyError, refetch: refetchCompany } = useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          enrichment_organizations(
            *,
            enrichment_org_departments(*),
            enrichment_org_technologies(*),
            enrichment_org_keywords(*),
            enrichment_org_funding_events(*)
          ),
          enrichment_org_raw_responses(*)
        `)
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const {
    data: allContacts = [],
    isLoading: isLoadingContacts,
    error: contactsError,
    refetch: refetchContacts
  } = useQuery({
    queryKey: ['company-contacts-all', companyId, company?.apollo_org_id, company?.name],
    queryFn: async () => {
      // 1. Fetch Direct Contacts (Matched by ID OR Matched by Name if ID is null)
      // We escape the company name to safely put it in the filter string
      const safeCompanyName = company.name.replace(/"/g, ''); 
      
      const { data: directContacts, error: directError } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(
            *,
            enrichment_person_metadata(*),
            enrichment_employment_history(*),
            enrichment_organizations(*)
          ),
          enrichment_contact_emails(*),
          enrichment_contact_phones(*),
          enrichment_raw_responses(*)
        `)
        // Logic: company_id = ID OR (company_id IS NULL AND company_name = Name)
        .or(`company_id.eq.${companyId},and(company_id.is.null,company_name.eq."${safeCompanyName}")`);
        
      if (directError) throw directError;

      let apolloContacts: any[] = [];
      
      // 2. Fetch Apollo enriched people if org ID exists (for suggestions)
      if (company?.apollo_org_id) {
        const { data: enrichedPeople, error: enrichError } = await supabase
          .from('enrichment_people')
          .select(`
            *,
            contact:contact_id(
              *,
              enrichment_contact_emails(*),
              enrichment_contact_phones(*),
              enrichment_raw_responses(*)
            ),
            enrichment_person_metadata(*),
            enrichment_employment_history(*),
            enrichment_organizations(*)
          `)
          .eq('apollo_org_id', company.apollo_org_id)
          .not('contact_id', 'is', null);
        if (enrichError) throw enrichError;

        apolloContacts = (enrichedPeople || [])
          .filter((ep: any) => ep.contact)
          .map((ep: any) => ({
            ...ep.contact,
            enrichment_people: [ep], // wrap in array to match structure
            enrichment_contact_emails: ep.contact.enrichment_contact_emails,
            enrichment_contact_phones: ep.contact.enrichment_contact_phones,
            enrichment_raw_responses: ep.contact.enrichment_raw_responses,
            source_via_apollo: true
          }));
      }

      // 3. Deduplicate
      const contactMap = new Map();
      (directContacts || []).forEach((c: any) => contactMap.set(c.id, c));
      apolloContacts.forEach((c: any) => { if (!contactMap.has(c.id)) contactMap.set(c.id, c); });

      return Array.from(contactMap.values()).map((contact: any) => ({
        ...contact,
        id: contact.id,
        name: contact.name || contact.full_name,
        email: contact.email,
        mobile: contact.mobile,
        phone_number: contact.phone_number,
        designation: contact.job_title || contact.designation,
        job_title: contact.job_title,
        linkedin: contact.linkedin_url,
        photo_url: contact.photo_url,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        contact_stage: contact.contact_stage,
        source_table: contact.source_table || 'contacts',
        source_via_apollo: contact.source_via_apollo || false,
        enrichment_people: contact.enrichment_people,
        enrichment_contact_emails: contact.enrichment_contact_emails,
        enrichment_contact_phones: contact.enrichment_contact_phones,
        enrichment_raw_responses: contact.enrichment_raw_responses
      }));
    },
    enabled: !!companyId && !!company
  });

  const employees    = allContacts.filter(c => c.source_table === 'employee_associations' || (c.source_table === 'contacts' && !c.is_primary_contact));
  // If we have specific employees use them, otherwise use all contacts found
  const employeesToShow = employees.length > 0 ? employees : allContacts;

  useEffect(() => {
    if (companyError) toast({ title: "Error Loading Company",  description: companyError.message, variant: "destructive" });
    if (contactsError) toast({ title: "Error Loading Contacts", description: contactsError.message, variant: "destructive" });
  }, [companyError, contactsError, toast]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDataUpdate = () => {
    refetchCompany();
    refetchContacts();
  };

  const handleListAdd = async (fileId: string) => {
    if (!company?.id || !fileId) return;
    try {
      const { error: linkError } = await supabase
        .from('company_workspace_files')
        .upsert({ company_id: company.id, file_id: fileId, added_by: user?.id }, { onConflict: 'company_id,file_id' });
      if (linkError) throw linkError;
      toast({ title: "Added to List", description: `${company.name} has been added successfully.` });
    } catch (error: any) {
      toast({ title: "Failed to add to list", description: error.message, variant: "destructive" });
    } finally {
      setListModalOpen(false);
    }
  };

  const handleRefreshIntelligence = async () => {
    setIsSyncing(true);
    try {
      let result;

      if (company?.apollo_org_id) {
        result = await supabase.functions.invoke('enrich-company', {
          body: { apolloOrgId: company.apollo_org_id, companyId: company.id, organizationId: company.organization_id, userId: user?.id }
        });
      } else if (company?.website || company?.domain) {
        const websiteUrl = company.website || company.domain;
        const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        result = await supabase.functions.invoke('enrich-company', {
          body: { domain, companyId: company.id, organizationId: company.organization_id, userId: user?.id }
        });
      } else {
        throw new Error("Cannot sync: Missing Website/Domain.");
      }

      if (result.error) throw result.error;
      const data = result.data;

      if (data?.error === 'insufficient_credits') {
        toast({
          variant: "destructive",
          title: "Insufficient Credits",
          description: data.message || `Need ${data.required} credits, balance: ${data.balance}. Please recharge.`
        });
        return;
      }

      if (data?.error === 'not_found') {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: data.message || "No intelligence found for this company."
        });
        return;
      }

      await supabase.from('companies')
        .update({ intelligence_last_synced: new Date().toISOString() })
        .eq('id', companyId);

      const creditInfo = data?.credits?.deducted ? ` (${data.credits.deducted} credit${data.credits.deducted > 1 ? 's' : ''} used)` : '';
      toast({ title: "Success", description: "Company intelligence refreshed" + creditInfo });
      refetchCompany();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (fetchError: any) {
      toast({ title: "Intelligence Sync Failed", description: fetchError.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[#5B4FE8] flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
          <p className="text-[12px] font-[500] text-[#9C9189] uppercase tracking-[0.06em]">Loading intelligence</p>
        </motion.div>
      </div>
    );
  }

  // ── Data Derivations ──────────────────────────────────────────────────────
  const enrichment = company?.enrichment_organizations;
  const location   = [
    enrichment?.city || company.location?.split(',')[0],
    enrichment?.country
  ].filter(Boolean).join(', ');

  const website  = company.website  || company.domain     || enrichment?.website_url;
  const linkedin = company.linkedin_url || company.linkedin || enrichment?.linkedin_url;
  const twitter  = company.twitter_url  || company.twitter  || enrichment?.twitter_url;
  const facebook = company.facebook_url || company.facebook || enrichment?.facebook_url;

  return (
    <motion.div className={S.page} variants={pageVariants} initial="hidden" animate="visible">

      {/* ── Command Bar ──────────────────────────────────────────────────── */}
      <header className={S.bar}>
        <div className={S.barInner}>
          {/* Breadcrumb */}
          <div className={S.bc}>
            <button onClick={() => navigate('/companies')} className={S.bcBtn}>
              <ChevronLeft size={11} />Companies
            </button>
            <span className="text-[#D5CFC5]">›</span>
            <span className="text-[#1C1916]">{company.name}</span>
          </div>

          {/* Header Row */}
          <div className={S.hdrRow}>
            {/* Identity */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo */}
              <div className={S.logoBox}>
                {(company.logo_url || enrichment?.logo_url) ? (
                  <img src={company.logo_url || enrichment?.logo_url} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  company.name?.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className={S.name}>{company.name}</h1>

                  {/* Social Links */}
                  <div className="flex items-center gap-1">
                    {website && (
                      <motion.a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer"
                        className={S.socialBtn} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                        <Globe size={12} className="text-[#6A6057]" />
                      </motion.a>
                    )}
                    {linkedin && (
                      <motion.a href={linkedin} target="_blank" rel="noreferrer"
                        className={S.socialBtn} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                        <Linkedin size={12} className="text-[#0A66C2]" />
                      </motion.a>
                    )}
                    {twitter && (
                      <motion.a href={twitter} target="_blank" rel="noreferrer"
                        className={S.socialBtn} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                        <Twitter size={12} className="text-[#1DA1F2]" />
                      </motion.a>
                    )}
                    {facebook && (
                      <motion.a href={facebook} target="_blank" rel="noreferrer"
                        className={S.socialBtn} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                        <Facebook size={12} className="text-[#1877F2]" />
                      </motion.a>
                    )}
                  </div>
                </div>

                <div className={S.metaRow}>
                  {(enrichment?.industry || company.industry) && (
                    <span className={S.metaPill}>
                      <Building2 size={10} />
                      {enrichment?.industry || company.industry}
                    </span>
                  )}
                  {location && (
                    <span className={S.metaPill}>
                      <span className="text-[#D5CFC5]">·</span>
                      <MapPin size={10} />
                      {location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                className={S.listBtn}
                onClick={() => setListModalOpen(true)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              >
                <ListPlus size={13} />
                Add to list
              </motion.button>

              <motion.button
                className={`${S.enrichBtn} ${isSyncing ? S.enrichOff : S.enrichOn}`}
                onClick={handleRefreshIntelligence}
                disabled={isSyncing}
                whileHover={!isSyncing ? { scale: 1.02 } : {}}
                whileTap={!isSyncing ? { scale: 0.97 } : {}}
              >
                {isSyncing
                  ? <><RefreshCw size={12} className="animate-spin" />Syncing</>
                  : <><Sparkles size={12} />Enrich Company</>
                }
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Full-Width Canvas ────────────────────────────────────────────── */}
      <motion.div className={S.canvas} variants={blockIn}>
        {/* Row 1: Company Insights + Dept Pie */}
        <CompanyOverviewTab
          company={company}
          refetchParent={refetchCompany}
          employees={employeesToShow}
          isLoadingEmployees={isLoadingContacts}
          onEditEmployee={(emp) => navigate(`/contacts/${emp.id}`)}
        />

        {/* Row 2: Employee Growth Intelligence */}
        <EmployeeGrowthIntelligence company={company} />
      </motion.div>

      {/* ── Edit Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-[#E5E0D8]">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-[17px] font-[650] text-[#1C1916] tracking-[-0.01em]">
              Edit {company.name}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#9C9189]">
              Update company information.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CompanyEditForm
              company={company}
              onClose={() => { setIsCompanyEditDialogOpen(false); handleDataUpdate(); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add to List Modal ─────────────────────────────────────────────── */}
      {company && (
        <AddToCompanyListModal
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          onConfirm={handleListAdd}
          companyName={company.name}
          isFromSearch={false}
        />
      )}
    </motion.div>
  );
};

export default CompanyDetail;