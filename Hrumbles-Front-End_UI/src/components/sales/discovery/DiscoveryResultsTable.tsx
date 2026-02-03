import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { searchPeopleInDiscovery, saveSearchResultToContacts } from '@/services/sales/apolloSearch';
import { 
  Mail, Phone, Building2, Plus, Loader2, MapPin, 
  Linkedin, Globe, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Twitter, Facebook
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { setPage } from '@/Redux/intelligenceSearchSlice';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const DiscoveryResultsTable = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { discoveryFilters, currentPage, perPage, targetFileId, targetWorkspaceId } = useSelector((state: any) => state.intelligenceSearch);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['global-discovery', discoveryFilters, currentPage],
    queryFn: () => searchPeopleInDiscovery(discoveryFilters, currentPage, perPage),
    enabled: !!discoveryFilters,
    placeholderData: (prev) => prev,
  });

  const handleAdd = async (person: any) => {
    try {
      await saveSearchResultToContacts(person, organization_id, targetWorkspaceId, targetFileId, user.id);
      toast({ title: "Lead Captured", description: `${person.first_name} added to your workspace.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (isLoading && !isPlaceholderData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Scanning Global Database...</p>
      </div>
    );
  }

  const totalEntries = data?.total_entries || 0;
  const browseableLimit = 50000;
  const displayTotal = Math.min(totalEntries, browseableLimit);
  const totalPages = Math.ceil(displayTotal / perPage);
  const startRange = ((currentPage - 1) * perPage) + 1;
  const endRange = Math.min(currentPage * perPage, totalEntries);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      
      {/* SCROLLABLE TABLE AREA */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px]">
          <thead className="sticky top-0 z-40 bg-white shadow-sm">
            <tr className="border-b border-slate-100">
              {/* STICKY COLUMN 1: IDENTITY */}
              <th className="sticky left-0 z-50 bg-white px-4 py-3 text-[10px] font-black uppercase text-slate-400 border-r border-slate-100 w-[280px]">
                Professional Identity
              </th>
              
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[220px]">Organisation</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[180px]">Location</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[150px] text-center">Digital Footprint</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-[160px] text-center">Contact Assets</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right w-[140px]">Actions</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50">
            {data?.people?.map((person: any) => (
              <tr key={person.id} className="group hover:bg-slate-50/60 transition-colors">
                
                {/* STICKY NAME CELL */}
                <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50/60 px-4 py-3 border-r border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-lg border border-slate-100">
                      <AvatarImage src={person.photo_url} />
                      <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-600 font-black">
                        {person.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {person.first_name} {person.last_name_obfuscated}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5" title={person.title}>
                        {person.title}
                      </p>
                    </div>
                  </div>
                </td>

                {/* ORGANISATION */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={12} className="text-slate-300" />
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[180px]" title={person.organization?.name}>
                      {person.organization?.name || 'Confidential'}
                    </span>
                  </div>
                </td>

                {/* LOCATION */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-300" />
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
                      {person.city || person.state || person.country || 'Remote'}
                    </span>
                  </div>
                </td>

                {/* DIGITAL FOOTPRINT (Socials) */}
                <td className="px-4 py-3">
                   <div className="flex justify-center gap-2">
                      <SocialIcon active={!!person.linkedin_url} icon={<Linkedin size={10}/>} tooltip="LinkedIn Available"/>
                      <SocialIcon active={!!person.twitter_url} icon={<Twitter size={10}/>} tooltip="Twitter Available"/>
                      <SocialIcon active={!!person.facebook_url} icon={<Facebook size={10}/>} tooltip="Facebook Available"/>
                   </div>
                </td>

                {/* CONTACT ASSETS (Email/Phone) */}
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-3">
                    <AssetBadge 
                      active={person.has_email} 
                      icon={<Mail size={10} />} 
                      label="EMAIL" 
                    />
                    <AssetBadge 
                      active={person.has_direct_phone || person.has_mobile_phone} 
                      icon={<Phone size={10} />} 
                      label="PHONE" 
                    />
                  </div>
                </td>

                {/* ACTION BUTTON */}
                <td className="px-4 py-3 text-right">
                  <Button 
                    size="sm" 
                    onClick={() => handleAdd(person)} 
                    className="h-7 text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 shadow-sm px-4"
                  >
                    <Plus size={12} className="mr-1.5" /> SAVE LEAD
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER & PAGINATION */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t sticky bottom-0 z-40">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {startRange.toLocaleString()} - {endRange.toLocaleString()} of {totalEntries.toLocaleString()} matches
         </span>
         <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dispatch(setPage(currentPage - 1))} disabled={currentPage === 1} className="h-7 text-[10px] font-bold">
              <ChevronLeft size={12} className="mr-1"/> PREV
            </Button>
            <div className="px-3 py-1 bg-slate-100 rounded text-[10px] font-black text-slate-600">
               PAGE {currentPage}
            </div>
            <Button variant="outline" size="sm" onClick={() => dispatch(setPage(currentPage + 1))} disabled={currentPage >= totalPages} className="h-7 text-[10px] font-bold">
              NEXT <ChevronRight size={12} className="ml-1"/>
            </Button>
         </div>
      </div>
    </div>
  );
};

/* --- HELPER COMPONENTS --- */

const AssetBadge = ({ active, icon, label }: any) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded border transition-colors",
          active 
            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
            : "bg-slate-50 border-slate-100 text-slate-300"
        )}>
          {icon}
          <span className="text-[8px] font-black tracking-wider">{label}</span>
          {active ? <CheckCircle2 size={8} /> : <XCircle size={8} />}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-[10px] font-bold">
        {active ? `${label} is available to unlock` : `${label} not found`}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const SocialIcon = ({ active, icon, tooltip }: any) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <div className={cn(
          "p-1.5 rounded-md transition-colors",
          active 
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
            : "bg-slate-50 text-slate-300"
        )}>
          {icon}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-[10px] font-bold">
        {active ? tooltip : "Not Available"}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);