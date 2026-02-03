import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, Phone, Lock, Eye, Building2, 
  ListPlus, ShieldCheck, CheckCircle2, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const SavedContactsTable = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { savedSearchTerm } = useSelector((state: any) => state.intelligenceSearch);
  
  // State for List Modal
  const [listModalOpen, setListModalOpen] = React.useState(false);
  const [selectedContactForList, setSelectedContactForList] = React.useState<any>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['saved-crm-leads', savedSearchTerm],
    queryFn: async () => {
      let query = supabase.from('contacts')
        .select(`
          id, name, job_title, email, mobile, photo_url,
          apollo_person_id, phone_enrichment_status,
          company_id, companies(id, name, logo_url),
          enrichment_availability(has_email, has_phone)
        `)
        .not('apollo_person_id', 'is', null)
        .order('created_at', { ascending: false });
      
      if (savedSearchTerm) query = query.ilike('name', `%${savedSearchTerm}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

const handleEnrich = async (contactId: string, apolloId: string, mode: 'email' | 'phone') => {
    try {
      // NOTE: We now use ONLY 'enrich-contact' for both actions
      // 'request-phone' function is deprecated in favor of this unified logic
      
      const { error } = await supabase.functions.invoke('enrich-contact-master', { 
        body: { 
          contactId: contactId, 
          apolloPersonId: apolloId,
          revealType: mode // 'email' or 'phone'
        } 
      });

      if (error) throw error;

      toast({ 
        title: mode === 'email' ? "Email Unlocked" : "Phone Verification Started",
        description: mode === 'email' 
          ? "Record enriched with Verified Email." 
          : "Full profile refreshed. Phone verification in progress..." 
      });
      
      // Force refresh data
      queryClient.invalidateQueries({ queryKey: ['saved-crm-leads'] });
      
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    }
  };

  const openListModal = (contact: any) => {
    setSelectedContactForList(contact);
    setListModalOpen(true);
  };

  const handleAddToListConfirm = async (fileId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('contact_workspace_files').upsert({
        contact_id: selectedContactForList.id,
        file_id: fileId,
        added_by: user?.id
      });

      if (error) throw error;
      toast({ title: "Success", description: "Contact added to list." });
      setListModalOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (isLoading) return <div className="p-10 text-center text-xs font-bold text-slate-400">Loading CRM Records...</div>;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px]">
          <thead className="sticky top-0 z-40 bg-white shadow-sm">
            <tr className="border-b border-slate-100">
              {/* STICKY NAME COLUMN */}
              <th className="sticky left-0 z-50 bg-white px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-r border-slate-100 w-[280px]">
                <div className="flex items-center gap-3">
                  <Checkbox className="border-slate-300 data-[state=checked]:bg-indigo-600" />
                  <span>Name</span>
                </div>
              </th>
              
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[200px]">Job Title</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[200px]">Company</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[180px]">Emails</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[180px]">Phone Numbers</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right w-[160px]">Actions</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50">
            {contacts.map((c: any) => {
              // Check availability flags (set during discovery)
              const hasEmailAvail = c.enrichment_availability?.[0]?.has_email;
              // const hasPhoneAvail = c.enrichment_availability?.[0]?.has_phone; // Optional: use to disable button if false

              return (
              <tr key={c.id} className="group hover:bg-slate-50/60 transition-colors">
                
                {/* STICKY NAME CELL */}
                <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50/60 px-4 py-3 border-r border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-3">
                    <Checkbox className="border-slate-200" />
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
                      <Avatar className="h-8 w-8 rounded-lg border border-slate-100">
                        <AvatarImage src={c.photo_url} />
                        <AvatarFallback className="text-[10px] bg-slate-100 text-slate-500 font-bold">
                          {c.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline underline-offset-2 truncate max-w-[160px]">
                        {c.name}
                      </span>
                    </div>
                  </div>
                </td>

                {/* JOB TITLE */}
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-slate-600 truncate block max-w-[180px]" title={c.job_title}>
                    {c.job_title || '-'}
                  </span>
                </td>

                {/* COMPANY */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {c.companies?.logo_url ? (
                      <img src={c.companies.logo_url} alt="logo" className="w-4 h-4 object-contain" />
                    ) : (
                      <Building2 size={14} className="text-slate-300" />
                    )}
                    <span 
                      className="text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer truncate max-w-[160px]"
                      onClick={() => c.companies?.id && navigate(`/companies/${c.companies.id}`)}
                    >
                      {c.company_name || c.companies?.name || '-'}
                    </span>
                  </div>
                </td>

                {/* EMAIL ACCESS */}
                <td className="px-4 py-3">
                  {c.email ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold h-7 px-2 gap-1.5 hover:bg-emerald-100 cursor-pointer group/email">
                      <CheckCircle2 size={10} className="fill-emerald-200" />
                      {c.email}
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      // If discovery said no email, we can disable or change text, currently standard access
                      onClick={() => handleEnrich(c.id, c.apollo_person_id, 'email')}
                      className="h-7 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm px-3"
                    >
                      <Lock size={10} className="mr-1.5 text-slate-400" /> Access Email
                    </Button>
                  )}
                </td>

                {/* PHONE ACCESS (Independent Logic) */}
                <td className="px-4 py-3">
                   {c.mobile ? (
                     <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold h-7 px-2 gap-1.5 hover:bg-emerald-100 cursor-pointer">
                        <Phone size={10} className="fill-emerald-200" />
                        {c.mobile}
                     </Badge>
                   ) : c.phone_enrichment_status === 'pending_phones' ? (
                     <Badge className="bg-amber-50 text-amber-600 border-amber-200 animate-pulse font-black px-2 py-0.5 h-7">
                        <Clock size={10} className="mr-1"/> Verifying...
                     </Badge>
                   ) : (
                     <Button 
                        onClick={() => handleEnrich(c.id, c.apollo_person_id, 'phone')}
                        className="h-7 text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm px-3"
                     >
                        <Phone size={10} className="mr-1.5 text-slate-400" /> Request Mobile
                     </Button>
                   )}
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ActionIcon 
                        icon={<ListPlus size={14}/>} 
                        tooltip="Add to List" 
                        onClick={() => openListModal(c)} 
                    />
                    <ActionIcon 
                        icon={<Eye size={14}/>} 
                        tooltip="View Contact" 
                        onClick={() => navigate(`/contacts/${c.id}`)} 
                    />
                    <ActionIcon 
                        icon={<Building2 size={14}/>} 
                        tooltip="View Company" 
                        disabled={!c.company_id && !c.companies?.id}
                        onClick={() => {
                            const compId = c.company_id || c.companies?.id;
                            if(compId) navigate(`/companies/${compId}`);
                        }} 
                    />
                    <ActionIcon 
                        icon={<ShieldCheck size={14}/>} 
                        tooltip="Verify Data" 
                        onClick={() => handleEnrich(c.id, c.apollo_person_id, 'email')} 
                    />
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {/* MODAL FOR ADD TO LIST */}
      {selectedContactForList && (
        <AddToListModal 
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          personName={selectedContactForList.name}
          onConfirm={handleAddToListConfirm}
        />
      )}
    </div>
  );
};

const ActionIcon = ({ icon, tooltip, onClick, disabled }: any) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md", disabled && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-slate-400")}
          onClick={disabled ? undefined : onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[10px] font-bold">{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);