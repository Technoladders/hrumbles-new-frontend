// Hrumbles-Front-End_UI/src/pages/sales/ContactDetailPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

// Modular Components
import { ContactDetailHeader } from '@/components/sales/contact-detail/ContactDetailHeader';
import { ContactDetailSidebar } from '@/components/sales/contact-detail/ContactDetailSidebar';
import { ProspectTab } from '@/components/sales/contact-detail/ProspectTab';
import { ProspectCompanyTab } from '@/components/sales/contact-detail/ProspectCompanyTab';
import { ActivityTimelineTab } from '@/components/sales/contact-detail/ActivityTimelineTab';
import { MasterRecordTab } from '@/components/sales/contact-detail/MasterRecordTab';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  PhoneCall, StickyNote, Mail, Calendar, CheckSquare, 
  Clock, Loader2, User, Building2, Briefcase, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Activity Types
type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | null;

const ContactDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);

  // Modal States
  const [activeModal, setActiveModal] = useState<ActivityModalType>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRequestingPhone, setIsRequestingPhone] = useState(false);
  const [createFollowUp, setCreateFollowUp] = useState(false);

  // Form States
  const [noteContent, setNoteContent] = useState('');
  const [callDetails, setCallDetails] = useState({
    outcome: '',
    direction: 'outbound',
    notes: '',
    duration: '15'
  });
  const [emailDetails, setEmailDetails] = useState({
    subject: '',
    body: ''
  });
  const [taskDetails, setTaskDetails] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00',
    priority: 'none',
    taskType: 'to-do'
  });
  const [meetingDetails, setMeetingDetails] = useState({
    title: '',
    outcome: '',
    startTime: new Date().toISOString().slice(0, 16),
    duration: '30',
    notes: ''
  });

  // Fetch Contact Data
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
          contact_activities(*, creator:created_by(
      id, first_name, last_name, profile_picture_url
    )),
          enrichment_raw_responses(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Log Activity Mutation
  const logActivity = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from('contact_activities').insert({
        contact_id: id,
        created_by: user?.id,
        ...payload
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contact-full-detail', id] });
      closeModal();
      toast({ title: "Activity Logged", description: `${variables.type} has been recorded.` });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  // Enrich Contact
const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      // Condition 1: If we ALREADY have the Apollo ID, use standard enrichment
      if (contact?.apollo_person_id) {
        const { error } = await supabase.functions.invoke('enrich-contact', {
          body: { 
            contactId: id, 
            apolloPersonId: contact.apollo_person_id 
          }
        });
        if (error) throw error;
        toast({ title: "Intelligence Refreshed", description: "Contact data updated via Apollo ID." });
      
      } else {
        // Condition 2: If ID is MISSING, use "old-contact-enrich" to find and link the person
        console.log("Missing Apollo ID, attempting to match...");
        
        const payload = {
          contactId: id,
          // Match Parameters from existing contact data
          email: contact?.email,
          name: contact?.name,
          linkedin_url: contact?.linkedin_url,
          // Context for better matching
          organization_name: contact?.company_name || contact?.companies?.name,
          domain: contact?.companies?.website 
        };

        const { error } = await supabase.functions.invoke('old-contact-enrich', {
          body: payload
        });

        if (error) throw error;
        toast({ title: "Contact Matched & Enriched", description: "We found this person in Apollo and linked their ID." });
      }

      refetch();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Enrichment Failed", description: err.message });
    } finally { 
      setIsEnriching(false); 
    }
  };


  // Request Phone
  const handleRequestPhone = async () => {
    setIsRequestingPhone(true);
    try {
      const { error } = await supabase.functions.invoke('request-phone', {
        body: { contactId: id, apolloPersonId: contact?.apollo_person_id }
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

  // Close Modal & Reset Forms
  const closeModal = () => {
    setActiveModal(null);
    setNoteContent('');
    setCreateFollowUp(false);
    setCallDetails({ outcome: '', direction: 'outbound', notes: '', duration: '15' });
    setEmailDetails({ subject: '', body: '' });
    setTaskDetails({ title: '', description: '', dueDate: new Date().toISOString().split('T')[0], dueTime: '09:00', priority: 'none', taskType: 'to-do' });
    setMeetingDetails({ title: '', outcome: '', startTime: new Date().toISOString().slice(0, 16), duration: '30', notes: '' });
  };

  // Submit Handlers
  const handleLogNote = () => {
    if (!noteContent.trim()) return;
    logActivity.mutate({ 
      type: 'note', 
      title: 'Note', 
      description: noteContent 
    });
  };

  const handleLogCall = () => {
    if (!callDetails.notes.trim()) return;
    logActivity.mutate({ 
      type: 'call', 
      title: `Call: ${callDetails.outcome || 'Logged'}`,
      description: callDetails.notes,
      metadata: {
        outcome: callDetails.outcome,
        direction: callDetails.direction,
        duration: callDetails.duration
      }
    });
  };

  const handleLogEmail = () => {
    if (!emailDetails.subject.trim()) return;
    logActivity.mutate({ 
      type: 'email', 
      title: emailDetails.subject,
      description: emailDetails.body
    });
  };

  const handleCreateTask = () => {
    if (!taskDetails.title.trim()) return;
    logActivity.mutate({ 
      type: 'task', 
      title: taskDetails.title,
      description: taskDetails.description,
      metadata: {
        dueDate: taskDetails.dueDate,
        dueTime: taskDetails.dueTime,
        priority: taskDetails.priority,
        taskType: taskDetails.taskType,
        status: 'pending'
      }
    });
  };

  const handleLogMeeting = () => {
    if (!meetingDetails.notes.trim()) return;
    logActivity.mutate({ 
      type: 'meeting', 
      title: meetingDetails.title || `Meeting: ${meetingDetails.outcome || 'Logged'}`,
      description: meetingDetails.notes,
      metadata: {
        outcome: meetingDetails.outcome,
        startTime: meetingDetails.startTime,
        duration: meetingDetails.duration
      }
    });
  };

  if (isLoading || !contact) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-9xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="flex gap-6">
            <Skeleton className="h-[600px] w-[340px] rounded-xl" />
            <Skeleton className="h-[600px] flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Full-width Header */}
      <ContactDetailHeader 
        contact={contact} 
        onBack={() => navigate(-1)} 
        onEnrich={handleEnrich} 
        isEnriching={isEnriching}
        onOpenModal={(m: ActivityModalType) => setActiveModal(m)}
        refetch={refetch}
      />

      {/* Main Content with max-width */}
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT SIDEBAR - Contact Info */}
          <aside className="w-full lg:w-[360px] flex-shrink-0">
            <ContactDetailSidebar 
              contact={contact} 
              isRequestingPhone={isRequestingPhone} 
              setIsRequestingPhone={setIsRequestingPhone} 
              onRequestPhone={handleRequestPhone}
              refetch={refetch}
            />
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <Tabs defaultValue="prospect" className="w-full">
                {/* Tab Navigation */}
                <div className="border-b border-slate-200 bg-slate-50/50">
                  <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1.5 shadow-inner">
                    <TabsTrigger 
                      value="prospect" 
                      className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2">
                      <User size={16}  />  Prospect
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="company"
                     className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                       <div className="flex items-center gap-2">
                      <Building2 size={16} className="mr-2" />
                      Company
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="activities"
                      className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                       <div className="flex items-center gap-2">
                      <Clock size={16} className="mr-2" />
                      Activities
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fields"
                      className="px-6 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    >
                       <div className="flex items-center gap-2">
                      <Database size={16} className="mr-2" />
                      Data Fields
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  <TabsContent value="prospect" className="mt-0 focus-visible:outline-none">
                    <ProspectTab contact={contact} />
                  </TabsContent>
                  <TabsContent value="company" className="mt-0 focus-visible:outline-none">
                    <ProspectCompanyTab contact={contact} />
                  </TabsContent>
                  <TabsContent value="activities" className="mt-0 focus-visible:outline-none">
                    <ActivityTimelineTab 
                      contact={contact} 
                      onOpenModal={(m: ActivityModalType) => setActiveModal(m)}
                    />
                  </TabsContent>
                  <TabsContent value="fields" className="mt-0 focus-visible:outline-none">
                    <MasterRecordTab contact={contact} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* ========== MODALS ========== */}
      
      {/* NOTE MODAL */}
      <Dialog open={activeModal === 'note'} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <StickyNote size={20} />
              Create Note
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">For:</span>
              <Badge variant="secondary" className="font-medium">
                {contact.name}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Note Content
              </Label>
              <Textarea 
                placeholder="Write your note here..."
                className="min-h-[180px] resize-none"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="followup-note" 
                checked={createFollowUp}
                onCheckedChange={(checked) => setCreateFollowUp(!!checked)}
              />
              <label htmlFor="followup-note" className="text-sm text-slate-600 cursor-pointer">
                Create a follow-up task in 3 business days
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={handleLogNote}
              disabled={!noteContent.trim() || logActivity.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {logActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CALL MODAL */}
      <Dialog open={activeModal === 'call'} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <PhoneCall size={20} />
              Log Call
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Contacted:</span>
              <Badge variant="secondary" className="font-medium">
                {contact.name}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Call Outcome
                </Label>
                <Select 
                  value={callDetails.outcome}
                  onValueChange={(v) => setCallDetails(p => ({...p, outcome: v}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="voicemail">Left Voicemail</SelectItem>
                    <SelectItem value="wrong_number">Wrong Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Call Direction
                </Label>
                <Select 
                  value={callDetails.direction}
                  onValueChange={(v) => setCallDetails(p => ({...p, direction: v}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Activity Date
                </Label>
                <Input 
                  type="datetime-local" 
                  defaultValue={new Date().toISOString().slice(0, 16)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Duration
                </Label>
                <Select 
                  value={callDetails.duration}
                  onValueChange={(v) => setCallDetails(p => ({...p, duration: v}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Call Notes
              </Label>
              <Textarea 
                placeholder="Start typing to log a call..."
                className="min-h-[120px] resize-none"
                value={callDetails.notes}
                onChange={(e) => setCallDetails(p => ({...p, notes: e.target.value}))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="followup-call" 
                checked={createFollowUp}
                onCheckedChange={(checked) => setCreateFollowUp(!!checked)}
              />
              <label htmlFor="followup-call" className="text-sm text-slate-600 cursor-pointer">
                Create a follow-up task in 3 business days
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={handleLogCall}
              disabled={!callDetails.notes.trim() || logActivity.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {logActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMAIL MODAL */}
      <Dialog open={activeModal === 'email'} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <Mail size={20} />
              Log Email
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">To:</span>
              <Badge variant="secondary" className="font-medium">
                {contact.email || contact.name}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Subject
              </Label>
              <Input 
                placeholder="Enter email subject..."
                value={emailDetails.subject}
                onChange={(e) => setEmailDetails(p => ({...p, subject: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Email Body
              </Label>
              <Textarea 
                placeholder="Enter email content..."
                className="min-h-[180px] resize-none"
                value={emailDetails.body}
                onChange={(e) => setEmailDetails(p => ({...p, body: e.target.value}))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="followup-email" 
                checked={createFollowUp}
                onCheckedChange={(checked) => setCreateFollowUp(!!checked)}
              />
              <label htmlFor="followup-email" className="text-sm text-slate-600 cursor-pointer">
                Create a follow-up task in 3 business days
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={handleLogEmail}
              disabled={!emailDetails.subject.trim() || logActivity.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {logActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TASK MODAL */}
      <Dialog open={activeModal === 'task'} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <CheckSquare size={20} />
              Create Task
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Task Title *
              </Label>
              <Input 
                placeholder="Enter your task..."
                value={taskDetails.title}
                onChange={(e) => setTaskDetails(p => ({...p, title: e.target.value}))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Due Date
                </Label>
                <Input 
                  type="date" 
                  value={taskDetails.dueDate}
                  onChange={(e) => setTaskDetails(p => ({...p, dueDate: e.target.value}))}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Due Time
                </Label>
                <Input 
                  type="time" 
                  value={taskDetails.dueTime}
                  onChange={(e) => setTaskDetails(p => ({...p, dueTime: e.target.value}))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Task Type
                </Label>
                <Select 
                  value={taskDetails.taskType}
                  onValueChange={(v) => setTaskDetails(p => ({...p, taskType: v}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-do">To-do</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Priority
                </Label>
                <Select 
                  value={taskDetails.priority}
                  onValueChange={(v) => setTaskDetails(p => ({...p, priority: v}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Description
              </Label>
              <Textarea 
                placeholder="Add task notes..."
                className="min-h-[100px] resize-none"
                value={taskDetails.description}
                onChange={(e) => setTaskDetails(p => ({...p, description: e.target.value}))}
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 pt-2">
              <span className="font-medium">Associated with:</span>
              <Badge variant="secondary" className="font-medium">
                {contact.name}
              </Badge>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!taskDetails.title.trim() || logActivity.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {logActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEETING MODAL */}
      <Dialog open={activeModal === 'meeting'} onOpenChange={() => closeModal()}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <Calendar size={20} />
              Log Meeting
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Attendees:</span>
              <Badge variant="secondary" className="font-medium">
                {contact.name}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Meeting Title
              </Label>
              <Input 
                placeholder="Enter meeting title..."
                value={meetingDetails.title}
                onChange={(e) => setMeetingDetails(p => ({...p, title: e.target.value}))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Meeting Outcome
                </Label>
                <Select 
                  value={meetingDetails.outcome}
                  onValueChange={(v) => setMeetingDetails(p => ({...p, outcome: v}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Duration
                </Label>
                <Select 
                  value={meetingDetails.duration}
                  onValueChange={(v) => setMeetingDetails(p => ({...p, duration: v}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Meeting Start Time
              </Label>
              <Input 
                type="datetime-local" 
                value={meetingDetails.startTime}
                onChange={(e) => setMeetingDetails(p => ({...p, startTime: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Meeting Notes
              </Label>
              <Textarea 
                placeholder="Start typing to log a meeting..."
                className="min-h-[120px] resize-none"
                value={meetingDetails.notes}
                onChange={(e) => setMeetingDetails(p => ({...p, notes: e.target.value}))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="followup-meeting" 
                checked={createFollowUp}
                onCheckedChange={(checked) => setCreateFollowUp(!!checked)}
              />
              <label htmlFor="followup-meeting" className="text-sm text-slate-600 cursor-pointer">
                Create a follow-up task in 3 business days
              </label>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button 
              onClick={handleLogMeeting}
              disabled={!meetingDetails.notes.trim() || logActivity.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {logActivity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactDetailPage;