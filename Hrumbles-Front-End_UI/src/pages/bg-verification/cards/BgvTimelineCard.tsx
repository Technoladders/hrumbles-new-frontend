import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  candidateId: string;
}

interface VerificationEvent {
  id: number;
  created_at: string;
  lookup_type: string;
  lookup_value: string;
  user: {
    last_name: string;
    first_name: string;
  } | null;
  verified_by: string;
}

export const BgvTimelineCard = ({ candidateId }: Props) => {
  const queryClient = useQueryClient();
  const queryKey = ['bgvVerifiedTimeline', candidateId];

  const { data: events, isLoading } = useQuery<VerificationEvent[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uanlookups')
        .select(`
          id,
          created_at,
          lookup_type,
          lookup_value,
          user:hr_employees!verified_by(first_name, last_name),
          verified_by
        `)
        .eq('candidate_id', candidateId)
        .in('status', [1, 0, 1014, 1022])
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!candidateId,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`bgv-verified-timeline-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uanlookups',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const newRecord = payload.new as { status: number };
          if ([1, 0, 1014, 1022].includes(newRecord.status)) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId, queryClient, queryKey]);

  return (
    <Card className="shadow-md border-gray-200 h-full flex flex-col overflow-hidden">
      <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
        <CardTitle className="text-gray-800 flex items-center gap-2 text-lg font-semibold">
          <History size={20} className="text-purple-600" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-full max-h-[500px] p-4 pr-6">
          {isLoading && (
            <p className="text-sm text-gray-500 text-center animate-pulse">Loading timeline...</p>
          )}
          {!isLoading && (!events || events.length === 0) && (
            <div className="flex items-center justify-center h-full text-center text-gray-500">
              <p>No verification records found.</p>
            </div>
          )}
          <div className="relative space-y-6 pt-4">
            {events && events.length > 0 && (
              <div className="absolute left-6 top-0 w-1 h-full bg-green-200 z-0" />
            )}
            {events?.map((event, index) => (
              <div key={event.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10 mt-1">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-md w-full max-w-md bg-gradient-to-r from-gray-50 to-white hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {formatVerificationType(event.lookup_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Value: {event.lookup_value || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Verified By: {event.user?.first_name} {event.user?.last_name || ''}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Date: {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {/* <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-gray-400 mt-2 block cursor-pointer">
                          View Details
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verified By ID: {event.verified_by}</p>
                        <p>Time: {new Date(event.created_at).toLocaleString()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> */}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Helper function to format lookup type
const formatVerificationType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};