// Hrumbles-Front-End_UI/src/pages/sales/ContactDetailPage.tsx
import React, { useState, useCallback } from 'react';
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
import { ProspectCompanyTab } from '@/components/sales/contact-detail/ProspectCompanyTab';
import { ContactCompanyPanel } from '@/components/sales/contact-detail/ContactCompanyPanel';
import { MasterRecordTab } from '@/components/sales/contact-detail/MasterRecordTab';


// Dialogs
import {
  LogCallDialog,
  LogEmailDialog,
  CreateNoteDialog,
  CreateTaskDialog,
  LogMeetingDialog,
  LogLinkedInDialog,
  ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Database } from 'lucide-react';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

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
  const [activeTab, setActiveTab] = useState('prospect');

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ['contact-full-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          companies(id, name, logo_url, industry, website),
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

  // ─── Mutations ────────────────────────────────────────────────────────────

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

  // ─── CHANGED: Unified enrich-contact (was old-contact-enrich + enrich-contact) ───
  const handleEnrich = useCallback(async () => {
    setIsEnriching(true);
    try {
      // Single unified call handles both:
      //   - apolloPersonId exists → direct ID lookup
      //   - no apolloPersonId → match by email/name/linkedin/org
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId: id,
          organizationId: organizationId,
          userId: user?.id,
          revealType: 'email',
          apolloPersonId: contact?.apollo_person_id || null,
          email: contact?.email,
          name: contact?.name,
          linkedin_url: contact?.linkedin_url,
          organization_name: contact?.company_name || contact?.companies?.name,
          domain: contact?.companies?.website
        }
      });

      if (error) throw new Error(error.message || "Function invocation failed");

      // Handle 402 insufficient credits
      if (data?.error === 'insufficient_credits') {
        toast({
          variant: 'destructive',
          title: 'Insufficient Credits',
          description: data.message || `Need ${data.required} credits, balance: ${data.balance}. Please recharge.`
        });
        return;
      }

      // Handle no match
      if (data?.error === 'no_match') {
        toast({
          variant: 'destructive',
          title: 'No Match Found',
          description: data.message || 'Apollo could not identify this person.'
        });
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
    } finally { setIsEnriching(false); }
  }, [contact, id, organizationId, user?.id, refetch, toast, queryClient]);

  // ─── CHANGED: Unified phone request (was request-phone) ──────────────────
  const handleRequestPhone = useCallback(async () => {
    if (!contact?.apollo_person_id) {
      toast({
        variant: 'destructive',
        title: 'Enrich First',
        description: 'Please enrich this contact first to get their Apollo ID before requesting phone.'
      });
      return;
    }

    setIsRequestingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId: id,
          organizationId: organizationId,
          userId: user?.id,
          apolloPersonId: contact.apollo_person_id,
          revealType: 'phone'
        }
      });

      if (error) throw new Error(error.message || "Function invocation failed");

      // Handle 402 insufficient credits
      if (data?.error === 'insufficient_credits') {
        toast({
          variant: 'destructive',
          title: 'Insufficient Credits',
          description: data.message || `Need ${data.required} credits, balance: ${data.balance}. Please recharge.`
        });
        return;
      }

      const creditInfo = data?.credits?.deducted ? ` (${data.credits.deducted} credits used)` : '';
      toast({ title: 'Phone Requested', description: (data?.message || 'Phone verification started.') + creditInfo });
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally { setIsRequestingPhone(false); }
  }, [contact, id, organizationId, user?.id, refetch, toast]);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading || !contact) {
    return (
      <div className="min-h-screen bg-[#F7F7F8]">
        <div className="h-[65px] bg-white border-b border-gray-200 px-6 flex items-center">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="flex h-[calc(100vh-65px)]">
          <div className="w-[380px] border-r border-gray-200 bg-white p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
      {/* Sticky Header */}
      <ContactDetailHeader
        contact={contact}
        onBack={() => navigate(-1)}
        onEnrich={handleEnrich}
        isEnriching={isEnriching}
        onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
        refetch={refetch}
      />

      {/* Body: Left Activities + Right Profile */}
      <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 65px)' }}>

        {/* ── Left: Activity Panel ──────────────────────────────────── */}
        <aside className="w-[380px] min-w-[380px] border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <ContactActivityPanel
            contact={contact}
            onOpenModal={(m: ActivityModalType) => { setEditingActivity(null); setActiveModal(m); }}
            onEditActivity={handleEditActivity}
            onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
            onDeleteActivity={(activityId) => deleteActivityMutation.mutate(activityId)}
            onRequestPhone={handleRequestPhone}
            isRequestingPhone={isRequestingPhone}
            refetch={refetch}
          />
        </aside>

        {/* ── Right: Profile Tabs ───────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F7F7F8]">
          <div className="p-5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-5 bg-white border border-gray-200 rounded-xl p-1 h-auto shadow-sm gap-1">
                <TabsTrigger
                  value="prospect"
                  className="px-5 py-2 rounded-lg text-sm font-medium text-gray-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-150 flex items-center gap-1.5"
                >
                  <User size={14} />
                  Prospect
                </TabsTrigger>
                <TabsTrigger
                  value="company"
                  className="px-5 py-2 rounded-lg text-sm font-medium text-gray-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-150 flex items-center gap-1.5"
                >
                  <Building2 size={14} />
                  Company
                </TabsTrigger>
                {/* <TabsTrigger
                  value="fields"
                  className="px-5 py-2 rounded-lg text-sm font-medium text-gray-500 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-150 flex items-center gap-1.5"
                >
                  <Database size={14} />
                  Data Fields
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="prospect" className="mt-0 focus-visible:outline-none">
                <ProspectOverviewPanel contact={contact} />
              </TabsContent>
              <TabsContent value="company" className="mt-0 focus-visible:outline-none">
                <ContactCompanyPanel contact={contact} />
              </TabsContent>
              {/* <TabsContent value="fields" className="mt-0 focus-visible:outline-none">
                <MasterRecordTab contact={contact} />
              </TabsContent> */}
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
    </div>
  );
};

export default ContactDetailPage;