import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, ExternalLink, Trash2 } from 'lucide-react'; // Changed from Heart to Bookmark
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string;
}

interface WishlistItem {
  id: string;
  hr_talent_id: string;
  hr_job_id: string;
  ai_score: number;
  ai_summary: string;
  created_at: string;
  talent: {
    candidate_name: string;
    email: string;
    phone: string;
    suggested_title: string;
  };
  job: {
    title: string;
  };
}

const WishlistModal: FC<WishlistModalProps> = ({ isOpen, onClose, jobId }) => {
  const user = useSelector((state: any) => state.auth.user);

  const { data: wishlistItems, isLoading, refetch } = useQuery({
    queryKey: ['wishlistItems', user?.id, jobId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('hr_talent_wishlist')
        .select(`
          id,
          hr_talent_id,
          hr_job_id,
          ai_score,
          ai_summary,
          created_at,
          talent:hr_talent_pool!hr_talent_wishlist_hr_talent_id_fkey (
            candidate_name,
            email,
            phone,
            suggested_title
          ),
          job:hr_jobs!hr_talent_wishlist_hr_job_id_fkey (
            title
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('hr_job_id', jobId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching wishlist:', error);
        return [];
      }
      
      return data as WishlistItem[];
    },
    enabled: !!user?.id && isOpen,
  });

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('hr_talent_wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;

      toast.success('Removed from shortlist');
      refetch();
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from shortlist');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-indigo-600" />
            {jobId ? 'Job Shortlist' : 'My Shortlist'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : wishlistItems && wishlistItems.length > 0 ? (
          <div className="space-y-4">
            {wishlistItems.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{item.talent.candidate_name}</h3>
                      <Badge className={`${getScoreColor(item.ai_score)} font-bold`}>
                        {item.ai_score}%
                      </Badge>
                    </div>
                    
                    {!jobId && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Job:</span> {item.job.title}
                      </p>
                    )}
                    
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Title:</span> {item.talent.suggested_title || 'Not specified'}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Email:</span> {item.talent.email}
                    </p>
                    
                    {item.ai_summary && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded">
                        <p className="text-xs text-gray-700 italic">"{item.ai_summary}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Link to={`/talent-pool/${item.hr_talent_id}`} target="_blank">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {jobId ? 'No candidates shortlisted for this job yet' : 'Your shortlist is empty'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Shortlist candidates from the job matching results
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WishlistModal;