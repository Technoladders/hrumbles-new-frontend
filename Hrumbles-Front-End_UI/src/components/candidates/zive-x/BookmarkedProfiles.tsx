// src/components/candidates/zive-x/BookmarkedProfiles.tsx

import { FC } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // NEW: Import mutation hooks
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bookmark, X } from 'lucide-react'; // NEW: Import X icon
import Loader from '@/components/ui/Loader';
import { Button } from '@/components/ui/button'; // NEW: Import Button
import { CandidateSearchResult } from '@/types/candidateSearch';

const BookmarkedProfiles: FC = () => {
  const userId = useSelector((state: any) => state.auth.user?.id);
  const queryClient = useQueryClient(); // NEW: Get query client instance

  const { data: bookmarkedProfiles, isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['bookmarkedProfiles', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bookmarked_candidate_profiles');
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId,
  });

  // NEW: Create a mutation for removing a bookmark
  const { mutate: removeBookmark } = useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from('bookmarked_candidates')
        .delete()
        .match({ user_id: userId, candidate_id: candidateId });

      if (error) throw error;
    },
    // NEW: When the mutation succeeds, invalidate queries to update UI across the app
    onSuccess: () => {
      // This refetches the list in this component
      queryClient.invalidateQueries({ queryKey: ['bookmarkedProfiles', userId] });
      // This updates the bookmark icons on the main search results page
      queryClient.invalidateQueries({ queryKey: ['bookmarkedCandidates', userId] });
    },
    onError: (error) => {
      console.error("Failed to remove bookmark:", error);
    }
  });

  const handleRemoveClick = (e: React.MouseEvent, candidateId: string) => {
    e.preventDefault(); // Prevent the <Link> from navigating
    e.stopPropagation(); // Stop the event from bubbling up
    removeBookmark(candidateId);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center mb-4">
        <Bookmark className="h-5 w-5 text-indigo-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Bookmarked Profiles</h3>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader /></div>
      ) : !bookmarkedProfiles || bookmarkedProfiles.length === 0 ? (
        <p className="text-sm text-gray-500">You haven't bookmarked any profiles yet.</p>
      ) : (
        <div className="space-y-1 max-h-96 overflow-auto">
          {bookmarkedProfiles.map((profile) => (
            <Link 
              key={profile.id} 
              to={`/talent-pool/${profile.id}`}
              className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600">{profile.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{profile.current_designation || profile.title}</p>
              </div>
              <Button 
                variant="destructive" 
                size="icon"
                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleRemoveClick(e, profile.id)}
                aria-label="Remove bookmark"
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarkedProfiles;