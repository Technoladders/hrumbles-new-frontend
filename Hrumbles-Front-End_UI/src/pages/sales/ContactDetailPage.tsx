// Hrumbles-Front-End_UI/src/pages/sales/ContactDetailPage.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

// Components
import { ContactHeroPanel }       from '@/components/sales/contact-detail/ContactHeroPanel';
import { ContactLeftPanel }       from '@/components/sales/contact-detail/ContactLeftPanel';
import { ContactRightPanel }      from '@/components/sales/contact-detail/ContactRightPanel';
import { AddToListModal }         from '@/components/sales/contacts-table/AddToListModal';

// Dialogs
import {
  LogCallDialog, LogEmailDialog, CreateNoteDialog,
  CreateTaskDialog, LogMeetingDialog, LogLinkedInDialog,
  ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

const ContactDetailPage = () => {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const user            = useSelector((state: any) => state.auth.user);
  const organizationId  = useSelector((state: any) => state.auth.organization_id);

  const [activeModal,       setActiveModal]       = useState<ActivityModalType>(null);
  const [editingActivity,   setEditingActivity]   = useState<any>(null);
  const [isEnriching,       setIsEnriching]       = useState(false);
  const [isRequestingPhone, setIsRequestingPhone] = useState(false);
  const [phonePending,      setPhonePending]      = useState(false);
  const [listModalOpen,     setListModalOpen]     = useState(false);

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
    enabled: !!id,
  });

  console.log('contact', contact);  

  // ─── Phone pending detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!contact) return;
    const hasPhone = !!(contact.mobile || contact.enrichment_contact_phones?.length > 0);
    const isPending = contact.phone_enrichment_status === 'pending_phones';
    setPhonePending(isPending && !hasPhone);
  }, [contact]);

  // ─── Poll when phone pending ──────────────────────────────────────────────
  useEffect(() => {
    if (!phonePending) return;
    const interval = setInterval(() => {
      refetch().then(({ data }) => {
        const hasPhone = data?.mobile || data?.enrichment_contact_phones?.length > 0;
        const noPhone  = data?.phone_enrichment_status === 'no_phone_found';
        if (hasPhone) {
          setPhonePending(false);
          setIsRequestingPhone(false);
          toast({ title: 'Phone Received', description: 'Phone number has been delivered.' });
        } else if (noPhone) {
          setPhonePending(false);
          setIsRequestingPhone(false);
          toast({ variant: 'destructive', title: 'No phone found', description: 'Apollo couldn\'t find a number for this contact.' });
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
    enabled: !!organizationId,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const editContactMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    },
  });

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
    },
  });

  const logActivityMutation = useMutation({
    mutationFn: async (payload: ActivityLogData) => {
      const dbData = {
        contact_id:        id,
        organization_id:   organizationId,
        created_by:        user?.id,
        type:              payload.type,
        title:             payload.title,
        description:       payload.description,
        description_html:  payload.descriptionHtml,
        metadata:          payload.metadata,
        outcome:           payload.metadata?.outcome || payload.metadata?.linkedinOutcome,
        direction:         payload.metadata?.direction,
        duration_minutes:  payload.metadata?.duration ? parseInt(payload.metadata.duration) : null,
        activity_date:     payload.metadata?.activityDate || payload.metadata?.startTime || new Date().toISOString(),
        due_date:          payload.metadata?.dueDate,
        due_time:          payload.metadata?.dueTime,
        priority:          payload.metadata?.priority,
        task_type:         payload.metadata?.taskType,
        assigned_to:       payload.metadata?.assignedTo || null,
      };
      if (payload.id) {
        const { error } = await supabase.from('contact_activities').update(dbData).eq('id', payload.id);
        if (error) throw error;
      } else if (payload.createFollowUp) {
        const { error } = await supabase.rpc('log_activity_with_followup', {
          p_contact_id:          id,
          p_organization_id:     organizationId,
          p_created_by:          user?.id,
          p_type:                payload.type,
          p_title:               payload.title,
          p_description:         payload.description,
          p_description_html:    payload.descriptionHtml,
          p_metadata:            payload.metadata || {},
          p_create_followup:     true,
          p_followup_task_type:  payload.createFollowUp.taskType,
          p_followup_due_date:   payload.createFollowUp.dueDate,
          p_followup_due_time:   payload.createFollowUp.dueTime || '09:00:00',
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contact_activities').insert(dbData);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Activity Saved' });
      setActiveModal(null);
      setEditingActivity(null);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.rpc('complete_task', { p_task_id: taskId, p_completed_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Task Completed' });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('contact_activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: 'Activity Deleted' });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleFieldSave = useCallback(async (field: string, value: any) => {
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

  const handleActivitySubmit = useCallback(async (data: ActivityLogData) => {
    await logActivityMutation.mutateAsync(data);
  }, [logActivityMutation]);

  const handleEnrich = useCallback(async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId:        id,
          organizationId,
          userId:           user?.id,
          revealType:       'email',
          apolloPersonId:   contact?.apollo_person_id || null,
          email:            contact?.email,
          name:             contact?.name,
          linkedin:         contact?.linkedin_url,
          organization_name: contact?.company_name || contact?.companies?.name,
          domain:           contact?.companies?.website,
        },
      });
      if (error) throw new Error(error.message || 'Function invocation failed');
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message });
        return;
      }
      if (data?.error === 'no_match') {
        toast({ variant: 'destructive', title: 'No Match Found', description: data.message });
        return;
      }
      toast({ title: contact?.apollo_person_id ? 'Intelligence Refreshed' : 'Contact Enriched' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Enrichment Failed', description: err.message });
    } finally {
      setIsEnriching(false);
    }
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
          contactId:      id,
          organizationId,
          userId:         user?.id,
          apolloPersonId: contact.apollo_person_id,
          revealType:     'phone',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message });
        setIsRequestingPhone(false);
        setPhonePending(false);
        return;
      }
      const gotPhoneNow = data?.phone || data?.phoneStatus;
      if (gotPhoneNow) {
        setIsRequestingPhone(false);
        setPhonePending(false);
        toast({ title: 'Phone Received' });
        refetch();
      } else {
        toast({ title: 'Phone Requested', description: 'Usually delivers in 1–5 min.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
      setIsRequestingPhone(false);
      setPhonePending(false);
    }
  }, [contact, id, organizationId, user?.id, refetch, toast]);

const handleListAdd = async (fileIds: string | string[]) => {
  const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
  if (!ids.length || !contact?.id) return;
  try {
    const rows = ids.map(fileId => ({
      contact_id: contact.id,
      file_id:    fileId,
      added_by:   user?.id,
    }));
    const { error } = await supabase.from('contact_workspace_files').upsert(rows);
    if (error) throw error;
    toast({ title: 'Added to List' });
    queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
  } catch (err: any) {
    toast({ variant: 'destructive', title: 'Failed', description: err.message });
  } finally {
    setListModalOpen(false);
  }
};

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !contact) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Skeleton className="h-[61px] w-full" />
        <Skeleton className="h-[110px] w-full mt-0" />
        <div className="flex h-[calc(100vh-171px)]">
          <Skeleton className="w-[300px] h-full" />
          <Skeleton className="flex-1 h-full ml-0" />
        </div>
      </div>
    );
  }

  return (
    /*
      SCROLL FIX — no position:fixed (that breaks sidebar responsiveness).
      
      The Chakra content Box has:
        - p={1}  →  4px padding on all sides  →  cancel with margin: -4px
        - ml={mainSidebarWidth}  →  already handled by Chakra, we don't touch it
        - overflowY: auto  →  our overflow:hidden below prevents it from scrolling
        - height fills remaining space after 70px header
      
      Result: our div is exactly the available viewport minus header, with no
      scroll at the Box level. Each panel has its own overflow-y:auto.
    */
    <div
      className="flex flex-col bg-[#F7F7F8]"
      style={{
        height: 'calc(100vh - 70px - 8px)', /* 70px header + 8px = p={1} top+bottom */
        margin: '2px',                      /* cancel Chakra Box p={1} padding */
        overflow: 'hidden',
      }}
    >
      {/* ── Hero 3-col panel (includes back button, replaces ContactDetailHeader) ── */}
      <ContactHeroPanel
        contact={contact}
        onFieldSave={handleFieldSave}
        onEnrich={handleEnrich}
        onRequestPhone={handleRequestPhone}
        onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
        onAddToList={() => setListModalOpen(true)}
        onBack={() => navigate(-1)}
        isEnriching={isEnriching}
        isRequestingPhone={isRequestingPhone}
        phonePending={phonePending}
        isSaving={editContactMutation.isPending}
      />

      {/* ── Body: left + right panels with independent scroll ───────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel — summary + career + activity */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto m-2"
          style={{ width: 320, minWidth: 320 }}
        >
          <ContactLeftPanel
            contact={contact}
            onFieldSave={handleFieldSave}
            onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
            onEditActivity={(activity) => { setEditingActivity(activity); setActiveModal(activity.type as ActivityModalType); }}
            onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
            onDeleteActivity={(activityId) => deleteActivityMutation.mutate(activityId)}
            onRequestPhone={handleRequestPhone}
            isRequestingPhone={isRequestingPhone}
            phonePending={phonePending}
          />
        </div>

        {/* Right panel — company + similar prospects */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[#F7F7F8]">
          <ContactRightPanel
            contact={contact}
            onCompanyFieldSave={handleCompanyFieldSave}
            isSaving={editCompanyMutation.isPending}
            organizationId={organizationId}
            userId={user?.id}
          />
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <LogCallDialog     open={activeModal === 'call'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogEmailDialog    open={activeModal === 'email'}   onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <CreateNoteDialog  open={activeModal === 'note'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <CreateTaskDialog  open={activeModal === 'task'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} teamMembers={teamMembers || []} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogMeetingDialog  open={activeModal === 'meeting'} onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />
      <LogLinkedInDialog open={activeModal === 'linkedin'}onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={contact} activity={editingActivity} onSubmit={handleActivitySubmit} isSubmitting={logActivityMutation.isPending} />

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