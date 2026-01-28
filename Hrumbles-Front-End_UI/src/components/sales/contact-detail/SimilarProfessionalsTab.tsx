import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Building2, MapPin, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SimilarProfessionalsTab = ({ contact }: any) => {
  const navigate = useNavigate();
  const titleKeywords = contact.job_title?.split(' ')?.[0] || '';

  const { data: peers = [], isLoading } = useQuery({
    queryKey: ['similar-people', contact.organization_id, contact.job_title],
    queryFn: async () => {
      // Find contacts with similar titles in the same org
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', contact.organization_id)
        .neq('id', contact.id) // Exclude current contact
        .ilike('job_title', `%${titleKeywords}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!contact.organization_id
  });

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-slate-900 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Users size={14} className="text-indigo-400" /> Similar People
        </CardTitle>
        <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400 bg-slate-800">
          {peers.length} Matches Found
        </Badge>
      </CardHeader>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b">
             <tr>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Full Name</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Current Title</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-tighter">Engagement Stage</th>
                <th className="px-6 py-3 text-right text-[10px] font-black uppercase text-slate-400 tracking-tighter">Actions</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
             {peers.map((peer: any) => (
               <tr key={peer.id} className="hover:bg-slate-50/80 transition-colors group">
                 <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-900 leading-none">{peer.name}</p>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin size={10}/> {peer.city || 'Location N/A'}
                    </p>
                 </td>
                 <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{peer.job_title}</span>
                 </td>
                 <td className="px-6 py-4">
                    <Badge variant="secondary" className="text-[9px] font-black px-2.5 py-0 bg-blue-50 text-blue-700 border-none">
                      {peer.contact_stage}
                    </Badge>
                 </td>
                 <td className="px-6 py-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      onClick={() => navigate(`/contacts/${peer.id}`)}
                    >
                       <Eye size={14}/>
                    </Button>
                 </td>
               </tr>
             ))}
             
             {!isLoading && peers.length === 0 && (
               <tr>
                 <td colSpan={4} className="p-20 text-center">
                    <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                       <Search size={20} className="text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold italic">
                      No matching peers found in the current internal client account.
                    </p>
                 </td>
               </tr>
             )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};