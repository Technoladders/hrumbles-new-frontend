// Hrumbles-Front-End_UI/src/components/sales/contact-detail/SimilarProfessionalsTab.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Users, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SimilarProfessionalsTabProps {
  contact: any;
  compact?: boolean;
}

export const SimilarProfessionalsTab: React.FC<SimilarProfessionalsTabProps> = ({ 
  contact,
  compact = false 
}) => {
  const navigate = useNavigate();
  const titleKeywords = contact.job_title?.split(' ')?.[0] || '';

  const { data: peers = [], isLoading } = useQuery({
    queryKey: ['similar-people', contact.organization_id, contact.job_title],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*, enrichment_people(photo_url)')
        .eq('organization_id', contact.organization_id)
        .neq('id', contact.id)
        .ilike('job_title', `%${titleKeywords}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!contact.organization_id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (peers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Users size={20} className="text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 font-medium">No similar contacts found</p>
        <p className="text-xs text-gray-400 mt-1">
          Try enriching more contacts from this organization
        </p>
      </div>
    );
  }

  console.log('peers', peers);

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stage
            </th>
            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {peers.map((peer: any) => (
            <tr 
              key={peer.id} 
              className="hover:bg-gray-50 transition-colors group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={peer.photo_url || peer.enrichment_people?.[0]?.photo_url} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                      {peer.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{peer.name}</p>
                    {peer.city && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {peer.city}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">{peer.job_title}</span>
              </td>
              <td className="py-3 px-4">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs font-medium",
                    peer.contact_stage === 'Lead' && "bg-blue-50 text-blue-700",
                    peer.contact_stage === 'Prospect' && "bg-purple-50 text-purple-700",
                    peer.contact_stage === 'Customer' && "bg-green-50 text-green-700",
                    peer.contact_stage === 'Identified' && "bg-gray-100 text-gray-700",
                    peer.contact_stage === 'Cold' && "bg-slate-100 text-slate-600",
                  )}
                >
                  {peer.contact_stage}
                </Badge>
              </td>
              <td className="py-3 px-4 text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  onClick={() => navigate(`/contacts/${peer.id}`)}
                >
                  <Eye size={16} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {peers.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {peers.length} similar contact{peers.length !== 1 ? 's' : ''} from this organization
          </p>
        </div>
      )}
    </div>
  );
};