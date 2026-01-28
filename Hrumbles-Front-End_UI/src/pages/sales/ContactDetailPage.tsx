// Hrumbles-Front-End_UI\src\pages\sales\ContactDetailPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Modular Components
import { ContactDetailHeader } from '@/components/sales/contact-detail/ContactDetailHeader';
import { ContactDetailSidebar } from '@/components/sales/contact-detail/ContactDetailSidebar';
import { ProspectTab } from '@/components/sales/contact-detail/ProspectTab';
import { ProspectCompanyTab } from '@/components/sales/contact-detail/ProspectCompanyTab';
import { ActivityTimelineTab } from '@/components/sales/contact-detail/ActivityTimelineTab';
import { MasterRecordTab } from '@/components/sales/contact-detail/MasterRecordTab';

// UI
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PhoneCall, StickyNote } from 'lucide-react';

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal States
  const [activeModal, setActiveModal] = useState<'call' | 'note' | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRequestingPhone, setIsRequestingPhone] = useState(false);

  // Form States
  const [noteContent, setNoteContent] = useState('');
  const [callDetails, setCallDetails] = useState({ disposition: '', purpose: '', note: '' });

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ['contact-full-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
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
          contact_activities(*),
          enrichment_raw_responses(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const logActivity = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('contact_activities').insert({
        contact_id: id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        ...payload
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      setActiveModal(null);
      setNoteContent('');
      setCallDetails({ disposition: '', purpose: '', note: '' });
      toast({ title: "Activity Logged" });
    }
  });

  // Enrich Contact Function
  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const { error } = await supabase.functions.invoke('enrich-contact', {
        body: { contactId: id, apolloPersonId: contact.apollo_person_id }
      });
      if (error) throw error;
      toast({ title: "Intelligence Refreshed" });
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { 
      setIsEnriching(false); 
    }
  };

  // Request Phone Verification Function
  const handleRequestPhone = async () => {
    setIsRequestingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('request-phone', {
        body: { contactId: id, apolloPersonId: contact.apollo_person_id }
      });
      if (error) throw error;
      toast({ title: "Verification Requested", description: "System is verifying phone networks." });
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    } finally { 
      setIsRequestingPhone(false); 
    }
  };

  if (isLoading || !contact) return <Skeleton className="h-screen w-full" />;

  return (
    <div className="flex flex-col fixed p-2 h-screen overflow-hidden">
      
      {/* 1. FIXED HEADER */}
      <ContactDetailHeader 
        contact={contact} 
        onBack={() => navigate(-1)} 
        onEnrich={handleEnrich} 
        isEnriching={isEnriching}
        onOpenModal={(m: any) => setActiveModal(m)}
        refetch={refetch}
      />

      {/* 2. SCROLLABLE BODY AREA */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR (Independent Scroll) */}
        <ContactDetailSidebar 
            contact={contact} 
            isRequestingPhone={isRequestingPhone} 
            setIsRequestingPhone={setIsRequestingPhone} 
            onRequestPhone={handleRequestPhone}
            refetch={refetch}
        />

        {/* MAIN WORKSPACE (Independent Scroll) */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <Tabs defaultValue="prospect" className="w-full">
            <div className="bg-white px-6 border-b sticky top-0 z-20">
              <TabsList className="bg-transparent h-12 gap-8 rounded-none p-0">
                <TabsTrigger value="prospect" className="tab-trigger">Prospect</TabsTrigger>
                <TabsTrigger value="company" className="tab-trigger">Prospect Company</TabsTrigger>
                <TabsTrigger value="activities" className="tab-trigger">Activity Timeline</TabsTrigger>
                <TabsTrigger value="fields" className="tab-trigger">Master Record</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 max-w-6xl mx-auto">
              <TabsContent value="prospect" className="mt-0">
                <ProspectTab contact={contact} />
              </TabsContent>
              <TabsContent value="company" className="mt-0">
                <ProspectCompanyTab contact={contact} />
              </TabsContent>
              <TabsContent value="activities" className="mt-0">
                <ActivityTimelineTab contact={contact} onAddNote={() => setActiveModal('note')} />
              </TabsContent>
              <TabsContent value="fields" className="mt-0">
                <MasterRecordTab contact={contact} />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      {/* --- REUSABLE MODALS --- */}
      <Dialog open={activeModal === 'call'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl">
          <div className="p-6 bg-slate-900 text-white font-black flex items-center gap-2">
            <PhoneCall size={20} className="text-indigo-400"/> Log Call
          </div>
          <div className="p-6 space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Disposition</label>
                  <Select onValueChange={(v) => setCallDetails(p => ({...p, disposition: v}))}>
                    <SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Connected">Connected</SelectItem>
                      <SelectItem value="No Answer">No Answer</SelectItem>
                      <SelectItem value="Busy">Busy</SelectItem>
                      <SelectItem value="Voicemail">Voicemail</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Purpose</label>
                  <Select onValueChange={(v) => setCallDetails(p => ({...p, purpose: v}))}>
                    <SelectTrigger><SelectValue placeholder="Objective" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Discovery">Discovery</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
             </div>
             <Textarea 
                placeholder="Call summary..." 
                className="min-h-[100px]"
                onChange={(e) => setCallDetails(p => ({...p, note: e.target.value}))}
             />
          </div>
          <DialogFooter className="p-4 bg-slate-50">
             <Button variant="ghost" onClick={() => setActiveModal(null)}>Cancel</Button>
             <Button 
                onClick={() => logActivity.mutate({ type: 'call', title: `Call: ${callDetails.disposition}`, description: callDetails.note, disposition: callDetails.disposition, purpose: callDetails.purpose })}
                className="bg-indigo-600 font-black"
             >Save Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'note'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-black flex items-center gap-2"><StickyNote className="text-blue-500" /> Add New Note</DialogTitle></DialogHeader>
          <Textarea 
             placeholder="Write something about this contact..." 
             className="min-h-[200px]"
             value={noteContent}
             onChange={(e) => setNoteContent(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={() => logActivity.mutate({ type: 'note', title: 'Manual Note', description: noteContent })} className="bg-indigo-600 font-black">Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactDetailPage;