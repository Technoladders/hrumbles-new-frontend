import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import CompanyOverviewTab          from "@/components/sales/company-detail/CompanyOverviewTab";
import EmployeeGrowthIntelligence  from "@/components/sales/company-detail/EmployeeGrowthIntelligence";
import { AddToCompanyListModal }   from '@/components/sales/company-search/AddToCompanyListModal';
import CompanyEditForm             from "@/components/sales/CompanyEditForm";
import { CompanyActivityPanel }    from "@/components/sales/company-detail/CompanyActivityPanel";

// Dialogs Reused from Contacts
import {
  LogCallDialog, LogEmailDialog, CreateNoteDialog,
  CreateTaskDialog, LogMeetingDialog, LogLinkedInDialog, ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

import {
  Sparkles, RefreshCw, ListPlus, Globe, Linkedin,
  Twitter, Facebook, MapPin, Building2, Loader2, ChevronLeft
} from "lucide-react";

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

const S = {
  page:    "min-h-screen font-['DM_Sans',system-ui,sans-serif] bg-[#F7F7F8] flex flex-col",
  bar:     "flex-shrink-0 z-50 bg-white border-b border-[#E5E0D8]",
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
};

const CompanyDetail = () => {
  const { toast }  = useToast();
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const queryClient = useQueryClient();
  const companyId  = parseInt(id || "0", 10);

  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const[isSyncing, setIsSyncing] = useState(false);
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);

  // Activity States
  const [activeModal, setActiveModal] = useState<ActivityModalType>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);

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
          enrichment_org_raw_responses(*),
          company_activities(
            *,
            creator:created_by(id, first_name, last_name, profile_picture_url),
            assignee:assigned_to(id, first_name, last_name, profile_picture_url)
          )
        `)
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const { data: allContacts =[], isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey:['company-contacts-all', companyId, company?.apollo_org_id, company?.name],
    queryFn: async () => {
      const safeCompanyName = company.name.replace(/"/g, ''); 
      const { data: directContacts, error: directError } = await supabase
        .from('contacts')
        .select(`
          *,
          enrichment_people(*, enrichment_person_metadata(*)),
          enrichment_contact_emails(*),
          enrichment_contact_phones(*)
        `)
        .or(`company_id.eq.${companyId},and(company_id.is.null,company_name.eq."${safeCompanyName}")`);
      if (directError) throw directError;
      return directContacts ||[];
    },
    enabled: !!companyId && !!company
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-sales', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, profile_picture_url')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error; 
      return data ||[];
    },
    enabled: !!organizationId
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const logActivityMutation = useMutation({
    mutationFn: async (payload: ActivityLogData) => {
      const dbData = {
        company_id: companyId, // Attached to Company Table
        organization_id: organizationId,
        created_by: user?.id,
        type: payload.type,
        title: payload.title,
        description: payload.description,
        description_html: payload.descriptionHtml,
        metadata: payload.metadata,
        outcome: payload.metadata?.outcome || payload.metadata?.linkedinOutcome,
        direction: payload.metadata?.direction,
        duration_minutes: payload.metadata?.duration ? parseInt(payload.metadata.duration, 10) : null,
        activity_date: payload.metadata?.activityDate || payload.metadata?.startTime || new Date().toISOString(),
        due_date: payload.metadata?.dueDate,
        due_time: payload.metadata?.dueTime,
        priority: payload.metadata?.priority,
        task_type: payload.metadata?.taskType,
        assigned_to: payload.metadata?.assignedTo || null
      };

      if (payload.id) {
        const { error } = await supabase.from('company_activities').update(dbData).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_activities').insert(dbData);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] });
      const action = variables.id ? 'Updated' : 'Logged';
      toast({ title: 'Activity Saved', description: `${variables.type} ${action.toLowerCase()} successfully.` });
      setActiveModal(null); 
      setEditingActivity(null);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('company_activities')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey:['company-detail', companyId] }); 
      toast({ title: 'Task Completed' }); 
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('company_activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] }); 
      toast({ title: 'Activity Deleted' }); 
    }
  });


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

  const handleCloseModal = () => { 
    setActiveModal(null); 
    setEditingActivity(null); 
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#5B4FE8] animate-spin" />
      </div>
    );
  }

  // Generate "Contact" duck-type wrapper to reuse the Dialogs seamlessly.
  const dialogEntityWrapper = {
    id: company.id,
    name: company.name,
    photo_url: company.logo_url || company.enrichment_organizations?.logo_url,
    title: company.industry || 'Company',
    email: company.website,
  };

  // ── Render Derived Variables ───────────────────────────────────────────────
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
    <div className={S.page}>

      {/* ── Command Bar ──────────────────────────────────────────────────── */}
      <header className={S.bar}>
        <div className={S.barInner}>
          <div className={S.bc}>
            <button onClick={() => navigate('/companies')} className={S.bcBtn}><ChevronLeft size={11} />Companies</button>
            <span className="text-[#D5CFC5]">›</span><span className="text-[#1C1916]">{company.name}</span>
          </div>

          <div className={S.hdrRow}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={S.logoBox}>
                {(company.logo_url || enrichment?.logo_url) ? (
                  <img src={company.logo_url || enrichment?.logo_url} alt={company.name} className="w-full h-full object-cover" />
                ) : company.name?.charAt(0).toUpperCase()}
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
                  {company.industry && <span className={S.metaPill}><Building2 size={10} />{company.industry}</span>}
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

            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button className={S.listBtn} onClick={() => setListModalOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <ListPlus size={13} />Add to list
              </motion.button>
              <motion.button 
                className={`${S.enrichBtn} ${isSyncing ? S.enrichOff : S.enrichOn}`} 
                onClick={handleRefreshIntelligence}
                disabled={isSyncing}
                whileHover={!isSyncing ? { scale: 1.02 } : {}}
                whileTap={!isSyncing ? { scale: 0.97 } : {}}
              >
                {isSyncing ? <><RefreshCw size={12} className="animate-spin" />Syncing</> : <><Sparkles size={12} />Enrich Company</>}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Two Column Layout (Activities | Data) ───────────────────────── */}
      <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 110px)' }}>
        
        {/* Left: Activity Sidebar */}
        <aside className="w-[360px] min-w-[360px] border-r border-[#E5E0D8] bg-white flex flex-col overflow-hidden">
          <CompanyActivityPanel
            company={company}
            onOpenModal={(m) => { setEditingActivity(null); setActiveModal(m); }}
            onEditActivity={(act) => { setEditingActivity(act); setActiveModal(act.type); }}
            onCompleteTask={(id) => completeTaskMutation.mutate(id)}
            onDeleteActivity={(id) => deleteActivityMutation.mutate(id)}
          />
        </aside>

        {/* Right: Main Content Canvas */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F7F7F8]">
          <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
            <CompanyOverviewTab
              company={company}
              refetchParent={refetchCompany}
              employees={allContacts}
              isLoadingEmployees={isLoadingContacts}
              onEditEmployee={(emp) => navigate(`/contacts/${emp.id}`)}
            />
            <EmployeeGrowthIntelligence company={company} />
          </div>
        </main>
      </div>

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

      {/* ── Activity Dialogs ────────────────────────────────────────────── */}
      <LogCallDialog open={activeModal === 'call'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
      <LogEmailDialog open={activeModal === 'email'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
      <CreateNoteDialog open={activeModal === 'note'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
      <CreateTaskDialog open={activeModal === 'task'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} teamMembers={teamMembers || []} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
      <LogMeetingDialog open={activeModal === 'meeting'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
      <LogLinkedInDialog open={activeModal === 'linkedin'} onOpenChange={(o) => !o && handleCloseModal()} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={(data) => logActivityMutation.mutateAsync(data)} isSubmitting={logActivityMutation.isPending} />
    </div>
  );
};

export default CompanyDetail;