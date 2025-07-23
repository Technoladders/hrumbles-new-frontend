import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

interface MoveContactsPayload {
  contactIds: string[];
  targetFileId: string;
}

export const useMoveContactsToFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ contactIds, targetFileId }: MoveContactsPayload) => {
      if (!contactIds || contactIds.length === 0 || !targetFileId) {
        throw new Error("Missing contact IDs or target file.");
      }

      const { data, error } = await supabase
        .from('contacts')
        .update({ file_id: targetFileId })
        .in('id', contactIds)
        .select();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Contacts Moved",
        description: `${data.length} contact(s) have been successfully filed.`,
      });
      // This is crucial: it refetches ALL contact-related data.
      // It will automatically refresh the "Unfiled" view (removing the ones you moved)
      // and update the count in the target file.
      queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
      queryClient.invalidateQueries({ queryKey: ['unfiledContactsCount'] });
    },
    onError: (error: any) => {
        toast({
            title: "Move Failed",
            description: error.message,
            variant: "destructive"
        });
    }
  });
};