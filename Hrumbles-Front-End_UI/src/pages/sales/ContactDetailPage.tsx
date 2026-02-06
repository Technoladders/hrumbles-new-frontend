// Hrumbles-Front-End_UI/src/pages/sales/ContactDetailPage.tsx
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

// Tab Components
import { ContactDetailHeader } from '@/components/sales/contact-detail/ContactDetailHeader';
import { ContactDetailSidebar } from '@/components/sales/contact-detail/ContactDetailSidebar';
import { ProspectTab } from '@/components/sales/contact-detail/ProspectTab';
import { ProspectCompanyTab } from '@/components/sales/contact-detail/ProspectCompanyTab';
import { ActivityTimelineTab } from '@/components/sales/contact-detail/ActivityTimelineTab';
import { MasterRecordTab } from '@/components/sales/contact-detail/MasterRecordTab';

// Dialog Components - All using the new HubSpot-style rich text editor
import { 
  LogCallDialog, 
  LogEmailDialog, 
  CreateNoteDialog, 
  CreateTaskDialog, 
  LogMeetingDialog,
  ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Clock, Database } from 'lucide-react';

// Types
type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | null;

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Modal States
  const [activeModal, setActiveModal] = useState<ActivityModalType>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRequestingPhone, setIsRequestingPhone] = useState(false);

  // =====================
  // QUERIES
  // =====================

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
            enrichment_organizations (*, 
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
            creator:created_by(id, first_name, last_name, profile_picture_url)
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

  // =====================
  // MUTATIONS
  // =====================

  // Log Activity with Follow-up Support
  const logActivityMutation = useMutation({
    mutationFn: async (payload: ActivityLogData) => {
      // Use RPC function if follow-up is requested
      if (payload.createFollowUp) {
        const { data, error } = await supabase.rpc('log_activity_with_followup', {
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
        return data;
      } else {
        // Direct insert
        const { error } = await supabase.from('contact_activities').insert({
          contact_id: id,
          organization_id: organizationId,
          created_by: user?.id,
          type: payload.type,
          title: payload.title,
          description: payload.description,
          description_html: payload.descriptionHtml,
          metadata: payload.metadata,
          outcome: payload.metadata?.outcome,
          direction: payload.metadata?.direction,
          duration_minutes: payload.metadata?.duration ? parseInt(payload.metadata.duration) : null,
          activity_date: payload.metadata?.activityDate || payload.metadata?.startTime || new Date().toISOString(),
          due_date: payload.metadata?.dueDate,
          due_time: payload.metadata?.dueTime,
          priority: payload.metadata?.priority,
          task_type: payload.metadata?.taskType
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      const activityName = variables.type.charAt(0).toUpperCase() + variables.type.slice(1);
      const hasFollowUp = variables.createFollowUp ? ' Follow-up task created.' : '';
      toast({ 
        title: "Activity Logged", 
        description: `${activityName} has been recorded.${hasFollowUp}`
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  // Complete Task Mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.rpc('complete_task', {
        p_task_id: taskId,
        p_completed_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: "Task Completed", description: "Task marked as complete." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  // Delete Activity Mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('contact_activities')
        .delete()
        .eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      toast({ title: "Activity Deleted", description: "Activity has been removed." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  // =====================
  // HANDLERS
  // =====================

  const handleActivitySubmit = useCallback(async (data: ActivityLogData) => {
    await logActivityMutation.mutateAsync(data);
  }, [logActivityMutation]);

  const handleEnrich = useCallback(async () => {
    setIsEnriching(true);
    try {
      if (contact?.apollo_person_id) {
        const { error } = await supabase.functions.invoke('enrich-contact', {
          body: { contactId: id, apolloPersonId: contact.apollo_person_id }
        });
        if (error) throw error;
        toast({ title: "Intelligence Refreshed", description: "Contact data updated." });
      } else {
        const { error } = await supabase.functions.invoke('old-contact-enrich', {
          body: {
            contactId: id,
            email: contact?.email,
            name: contact?.name,
            linkedin_url: contact?.linkedin_url,
            organization_name: contact?.company_name || contact?.companies?.name,
            domain: contact?.companies?.website 
          }
        });
        if (error) throw error;
        toast({ title: "Contact Enriched", description: "Data has been updated." });
      }
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrichment Failed", description: err.message });
    } finally { 
      setIsEnriching(false); 
    }
  }, [contact, id, refetch, toast]);

  const handleRequestPhone = useCallback(async () => {
    setIsRequestingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('request-phone', {
        body: { contactId: id, apolloPersonId: contact?.apollo_person_id }
      });
      if (error) throw error;
      toast({ title: "Phone Requested", description: "Verifying phone networks." });
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    } finally { 
      setIsRequestingPhone(false); 
    }
  }, [contact, id, refetch, toast]);

  // =====================
  // RENDER
  // =====================

  if (isLoading || !contact) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex">
          <div className="w-[380px] border-r border-gray-200 bg-white p-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <ContactDetailHeader 
        contact={contact} 
        onBack={() => navigate(-1)} 
        onEnrich={handleEnrich} 
        isEnriching={isEnriching}
        onOpenModal={(m: ActivityModalType) => setActiveModal(m)}
        refetch={refetch}
      />

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[380px] min-w-[380px] border-r border-gray-200 bg-white min-h-[calc(100vh-65px)] overflow-y-auto">
          <ContactDetailSidebar 
            contact={contact} 
            isRequestingPhone={isRequestingPhone} 
            setIsRequestingPhone={setIsRequestingPhone} 
            onRequestPhone={handleRequestPhone}
            refetch={refetch}
          />
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Tabs defaultValue="prospect" className="w-full">
            <div className="border-b border-gray-200 bg-white">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="prospect" 
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                >
                  <User size={16} className="mr-2" /> Prospect
                </TabsTrigger>
                <TabsTrigger 
                  value="company" 
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                >
                  <Building2 size={16} className="mr-2" /> Company
                </TabsTrigger>
                <TabsTrigger 
                  value="activities" 
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                >
                  <Clock size={16} className="mr-2" /> Activities
                </TabsTrigger>
                <TabsTrigger 
                  value="fields" 
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
                >
                  <Database size={16} className="mr-2" /> Data Fields
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="prospect" className="mt-0">
                <ProspectTab contact={contact} />
              </TabsContent>
              <TabsContent value="company" className="mt-0">
                <ProspectCompanyTab contact={contact} />
              </TabsContent>
              <TabsContent value="activities" className="mt-0">
                <ActivityTimelineTab 
                  contact={contact} 
                  onOpenModal={(m: ActivityModalType) => setActiveModal(m)}
                  onCompleteTask={(taskId) => completeTaskMutation.mutate(taskId)}
                  onDeleteActivity={(activityId) => deleteActivityMutation.mutate(activityId)}
                />
              </TabsContent>
              <TabsContent value="fields" className="mt-0">
                <MasterRecordTab contact={contact} />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      {/* ========== ACTIVITY DIALOGS ========== */}
      
      {/* Log Call Dialog */}
      <LogCallDialog
        open={activeModal === 'call'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        contact={contact}
        onSubmit={handleActivitySubmit}
        isSubmitting={logActivityMutation.isPending}
      />

      {/* Log Email Dialog */}
      <LogEmailDialog
        open={activeModal === 'email'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        contact={contact}
        onSubmit={handleActivitySubmit}
        isSubmitting={logActivityMutation.isPending}
      />

      {/* Create Note Dialog */}
      <CreateNoteDialog
        open={activeModal === 'note'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        contact={contact}
        onSubmit={handleActivitySubmit}
        isSubmitting={logActivityMutation.isPending}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={activeModal === 'task'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        contact={contact}
        onSubmit={handleActivitySubmit}
        isSubmitting={logActivityMutation.isPending}
      />

      {/* Log Meeting Dialog */}
      <LogMeetingDialog
        open={activeModal === 'meeting'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        contact={contact}
        onSubmit={handleActivitySubmit}
        isSubmitting={logActivityMutation.isPending}
      />
    </div>
  );
};

export default ContactDetailPage;