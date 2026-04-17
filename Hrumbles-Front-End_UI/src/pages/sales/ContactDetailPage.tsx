// Hrumbles-Front-End_UI/src/pages/sales/ContactDetailPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

// Components
import { ContactDetailHeader } from '@/components/sales/contact-detail/ContactDetailHeader';
import { ContactActivityPanel } from '@/components/sales/contact-detail/ContactActivityPanel';
import { ProspectOverviewPanel } from '@/components/sales/contact-detail/ProspectOverviewPanel';
import { ContactCompanyPanel } from '@/components/sales/contact-detail/ContactCompanyPanel';
import { MasterRecordTab } from '@/components/sales/contact-detail/MasterRecordTab';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';

// Dialogs
import {
  LogCallDialog, LogEmailDialog, CreateNoteDialog,
  CreateTaskDialog, LogMeetingDialog, LogLinkedInDialog,
  ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User } from 'lucide-react';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

// ── Gradient defs shared across page ──────────────────────────────────────────
const GradientDef = () => (
  <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
    <defs>
      <linearGradient id="cdp-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [activeModal, setActiveModal] = useState<ActivityModalType>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRequestingPhone, setIsRequestingPhone] = useState(false);
  const [phonePending, setPhonePending] = useState(false);
  const [activeTab, setActiveTab] = useState('prospect');
  const [listModalOpen, setListModalOpen] = useState(false);

  // ─── Main contact query ───────────────────────────────────────────────────
  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ['contact-full-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          companies(id, name, logo_url, industry, website, phone, description, founded_year, employee_count, linkedin, twitter, facebook),
          enrichment_availability(*),
          enrichment_people (
            *,
            enrichment_organizations (
              *,
              enrichment_org_keywords (*),
              enrichment_org_technologies (*),
              enrichment_org_funding_events(*),
              enrichment_org_departments(*)
            ),
            enrichment_employment_history (*),
            enrichment_person_metadata (*)
          ),
          enrichment_contact_emails (*),
          enrichment_contact_phones (*),
          contact_activities(
            *,
            creator:created_by(id, first_name, last_name, profile_picture_url),
            assignee:assigned_to(id, first_name, last_name, profile_picture_url)
          ),
          enrichment_raw_responses(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Detect if phone is pending (phone_enrichment_status = 'pending_phones')
  useEffect(() => {
    if (!contact) return;
    const hasPhone = !!(contact.mobile || (contact.enrichment_contact_phones?.length > 0));
    const isPending = contact.phone_enrichment_status === 'pending_phones';
    if (isPending && !hasPhone) {
      setPhonePending(true);
    } else {
      setPhonePending(false);
    }
  }, [contact]);

  // Poll for phone when pending (check every 15s)
  useEffect(() => {
    if (!phonePending) return;
    const interval = setInterval(() => {
      refetch().then(({ data }) => {
        const hasPhone = data?.mobile || (data?.enrichment_contact_phones?.length > 0);
        if (hasPhone) {
          setPhonePending(false);
          setIsRequestingPhone(false);
          toast({ title: 'Phone Received', description: 'Phone number has been delivered by Apollo.' });
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [phonePending, refetch, toast]);

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-sales', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, profile_picture_url')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId
  });

  // ─── Inline field edit mutation ───────────────────────────────────────────
  const editContactMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, { field }) => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      toast({ title: 'Saved', description: `Field updated successfully.` });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    }
  });

  // ─── Inline company edit mutation ─────────────────────────────────────────
  const editCompanyMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!contact?.companies?.id) throw new Error('No company linked');
      const { error } = await supabase
        .from('companies')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', contact.companies.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Company Updated' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    }
  });

  // ─── Activity mutations ───────────────────────────────────────────────────
  const logActivityMutation = useMutation({
    mutationFn: async (payload: ActivityLogData) => {
      const dbData = {
        contact_id: id,
        organization_id: organizationId,
        created_by: user?.id,
        type: payload.type,
        title: payload.title,
        description: payload.description,
        description_html: payload.descriptionHtml,
        metadata: payload.metadata,
        outcome: payload.metadata?.outcome || payload.metadata?.linkedinOutcome,
        direction: payload.metadata?.direction,
        duration_minutes: payload.metadata?.duration ? parseInt(payload.metadata.duration) : null,
        activity_date: payload.metadata?.activityDate || payload.metadata?.startTime || new Date().toISOString(),
        due_date: payload.metadata?.dueDate,
        due_time: payload.metadata?.dueTime,
        priority: payload.metadata?.priority,
        task_type: payload.metadata?.taskType,
        assigned_to: payload.metadata?.assignedTo || null
      };

      if (payload.id) {
        const { error } = await supabase.from('contact_activities').update(dbData).eq('id', payload.id);
        if (error) throw error;
      } else {
        if (payload.createFollowUp) {
          const { error } = await supabase.rpc('log_activity_with_followup', {
            p_contact_id: id,
            p_organization_id: organizationId,
            p_created_by: user?.id,
            p_type: payload.type,
            p_title: payload.title,
            p_description: payload.description,
            p_description_html: payload.descriptionHtml,
            p_metadata: payload.metadata || {},
            p_create_followup: true,
            p_followup_task_type: payload.createFollowUp.taskType,
            p_followup_due_date: payload.createFollowUp.dueDate,
            p_followup_due_time: payload.createFollowUp.dueTime || '09:00:00'
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('contact_activities').insert(dbData);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
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
      const { error } = await supabase.rpc('complete_task', { p_task_id: taskId, p_completed_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Task Completed' });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('contact_activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Activity Deleted' });
    }
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCloseModal = () => { setActiveModal(null); setEditingActivity(null); };
  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setActiveModal(activity.type as ActivityModalType);
  };
  const handleActivitySubmit = useCallback(async (data: ActivityLogData) => {
    await logActivityMutation.mutateAsync(data);
  }, [logActivityMutation]);

  const handleFieldSave = useCallback(async (field: string, value: any) => {
    // __refresh__ is a signal from AssetSectionManager to just refetch after
    // writing to enrichment tables directly — no contacts update needed
    if (field === '__refresh__') {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      return;
    }
    await editContactMutation.mutateAsync({ field, value });
  }, [editContactMutation, refetch, queryClient]);

  const handleCompanyFieldSave = useCallback(async (field: string, value: any) => {
    await editCompanyMutation.mutateAsync({ field, value });
  }, [editCompanyMutation]);

  const handleListAdd = async (targetFileId: string) => {
    if (!targetFileId || !contact?.id) {
      toast({ variant: 'destructive', title: 'No list selected' });
      return;
    }
    try {
      const { error } = await supabase.from('contact_workspace_files').upsert({
        contact_id: contact.id,
        file_id: targetFileId,
        added_by: user?.id,
      });
      if (error) throw error;
      toast({ title: 'Added to List', description: `${contact.name} was successfully added.` });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to add', description: err.message });
    } finally {
      setListModalOpen(false);
    }
  };

  const handleEnrich = useCallback(async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId: id,
          organizationId,
          userId: user?.id,
          revealType: 'email',
          apolloPersonId: contact?.apollo_person_id || null,
          email: contact?.email,
          name: contact?.name,
          linkedin: contact?.linkedin,
          organization_name: contact?.company_name || contact?.companies?.name,
          domain: contact?.companies?.website
        }
      });
      if (error) throw new Error(error.message || "Function invocation failed");
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message });
        return;
      }
      if (data?.error === 'no_match') {
        toast({ variant: 'destructive', title: 'No Match Found', description: data.message });
        return;
      }
      const creditInfo = data?.credits?.deducted ? ` (${data.credits.deducted} credit${data.credits.deducted > 1 ? 's' : ''} used)` : '';
      toast({
        title: contact?.apollo_person_id ? 'Intelligence Refreshed' : 'Contact Enriched',
        description: (data?.message || 'Data has been updated.') + creditInfo
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Enrichment Failed', description: err.message });
    } finally {
      setIsEnriching(false); }
  }, [contact, id, organizationId, user?.id, refetch, toast, queryClient]);

  const handleRequestPhone = useCallback(async () => {
    if (!contact?.apollo_person_id) {
      toast({ variant: 'destructive', title: 'Enrich First', description: 'Please enrich this contact first.' });
      return;
    }
    setIsRequestingPhone(true);
    setPhonePending(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId: id,
          organizationId,
          userId: user?.id,
          apolloPersonId: contact.apollo_person_id,
          revealType: 'phone'
        }
      });
      if (error) throw new Error(error.message);
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message });
        setIsRequestingPhone(false);
        setPhonePending(false);
        return;
      }
      // Phone may arrive synchronously or via webhook
      const gotPhoneNow = data?.phone || data?.phoneStatus;
      if (gotPhoneNow) {
        setIsRequestingPhone(false);
        setPhonePending(false);
        toast({ title: 'Phone Received', description: 'Phone number retrieved successfully.' });
        refetch();
      } else {
        // Async — webhook will deliver
        toast({ title: 'Phone Requested', description: 'Apollo is looking up the number. It will appear shortly.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
      setIsRequestingPhone(false);
      setPhonePending(false);
    }
  }, [contact, id, organizationId, user?.id, refetch, toast]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !contact) {
    return (
      <div className="min-h-screen bg-[#F7F7F8]">
        <div className="h-[65px] bg-white border-b border-gray-200 px-6 flex items-center">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="flex h-[calc(100vh-65px)]">
          <div className="w-[380px] border-r border-gray-200 bg-white p-4 space-y-3">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-32 w-full" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
      <GradientDef />

      <ContactDetailHeader
        contact={contact}
        onBack={() => navigate(-1)}
        onEnrich={handleEnrich}
        isEnriching={isEnriching}
        onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
        refetch={refetch}
        onAddToList={() => setListModalOpen(true)}
        onFieldSave={handleFieldSave}
        isSaving={editContactMutation.isPending}
      />

      <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 65px)' }}>
        {/* ── Left: Activity Panel ─────────────────────────────────── */}
        <aside className="w-[380px] min-w-[380px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <ContactActivityPanel
            contact={contact}
            onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
            onEditActivity={handleEditActivity}
            onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
            onDeleteActivity={(activityId) => deleteActivityMutation.mutate(activityId)}
            onRequestPhone={handleRequestPhone}
            isRequestingPhone={isRequestingPhone}
            phonePending={phonePending}
            refetch={refetch}
          />
        </aside>

        {/* ── Right: Profile Tabs ──────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F7F8]">
          {/* Sticky tab bar */}
          <div className="flex-shrink-0 px-4 pt-3 pb-0 bg-[#F7F7F8] border-b border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white border border-gray-200 rounded-xl p-1 h-auto shadow-sm gap-1">
                <TabsTrigger
                  value="prospect"
                  className="
                    px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 transition-all duration-150
                    flex items-center gap-1.5
                    data-[state=active]:text-white data-[state=active]:shadow-sm
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600
                  "
                >
                  <User size={13} />
                  Prospect
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="
                    px-4 py-1.5 rounded-lg text-xs font-medium text-gray-500 transition-all duration-150
                    flex items-center gap-1.5
                    data-[state=active]:text-white data-[state=active]:shadow-sm
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600
                  "
                >
                  <Building2 size={13} />
                  Company
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="prospect" className="mt-0 focus-visible:outline-none p-4">
                <ProspectOverviewPanel
                  contact={contact}
                  onFieldSave={handleFieldSave}
                  onRequestPhone={handleRequestPhone}
                  onEnrich={handleEnrich}
                  isRequestingPhone={isRequestingPhone}
                  isEnriching={isEnriching}
                  phonePending={phonePending}
                  isSaving={editContactMutation.isPending}
                />
              </TabsContent>
              <TabsContent value="company" className="mt-0 focus-visible:outline-none">
                <ContactCompanyPanel
                  contact={contact}
                  onCompanyFieldSave={handleCompanyFieldSave}
                  isSaving={editCompanyMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <LogCallDialog open={activeModal === 'call'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogEmailDialog open={activeModal === 'email'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <CreateNoteDialog open={activeModal === 'note'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <CreateTaskDialog open={activeModal === 'task'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} teamMembers={teamMembers || []} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogMeetingDialog open={activeModal === 'meeting'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogLinkedInDialog open={activeModal === 'linkedin'} onOpenChange={(o) => !o && handleCloseModal()}
        contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <AddToListModal
        open={listModalOpen}
        onOpenChange={setListModalOpen}
        personName={contact?.name || ''}
        onConfirm={handleListAdd}
        isFromDiscovery={false}
        contactIds={contact?.id ? [contact.id] : []}
      />
    </div>
  );
};

export default ContactDetailPage;