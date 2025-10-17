// src/components/candidates/zive-x/CandidateSearchResults.tsx

import { useState, useMemo, FC } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndianRupee, MapPin, Briefcase, Bookmark, Mail, Clipboard, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { CandidateSearchResult } from '@/types/candidateSearch'; // Ensure this type includes previous_company etc.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';


// NEW: Utility function to escape special regex characters
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

const Highlight: FC<{ text: string; query: string[] }> = ({ text, query }) => {
  if (!query.length || !text) {
    return <span>{text}</span>;
  }
  // BUG FIX: Escape each query term before joining them into the regex
  const escapedQuery = query.map(term => escapeRegExp(term));
  const regex = new RegExp(`(${escapedQuery.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-black px-1 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface CandidateSearchResultsProps {
  results: CandidateSearchResult[];
}
const formatSalary = (ctc: number | null) => {
  if (!ctc) return null;
  const inLacs = ctc / 100000;
  return `${inLacs.toFixed(2)} Lacs`;
};

type ContactInfo = {
  email: string | null;
} | null;

const CandidateSearchResults: FC<CandidateSearchResultsProps> = ({ results }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchParams] = useSearchParams();
  const [contactInfo, setContactInfo] = useState<ContactInfo>(null);
  const [isCopied, setIsCopied] = useState(false);

  console.log("results", results);

  const highlightQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    const queries: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key.includes('keywords') || key.includes('skills') || key.includes('companies') || key.includes('educations') || key.includes('current')) {
        queries.push(...value.split(','));
      }
    }
    return [...new Set(queries.filter(Boolean))];
  }, [searchParams]);

  const userId = useSelector((state: any) => state.auth.user?.id);
  const queryClient = useQueryClient();
  const { data: bookmarkedIdsSet = new Set() } = useQuery({
    queryKey: ['bookmarkedCandidates', userId],
    queryFn: async () => {
      if (!userId) return new Set();
      const { data, error } = await supabase.from('bookmarked_candidates').select('candidate_id').eq('user_id', userId);
      if (error) throw error;
      return new Set(data.map(b => b.candidate_id));
    },
    enabled: !!userId,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: async ({ candidateId, isBookmarked }: { candidateId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await supabase.from('bookmarked_candidates').delete().match({ user_id: userId, candidate_id: candidateId });
      } else {
        await supabase.from('bookmarked_candidates').insert({ user_id: userId, candidate_id: candidateId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkedCandidates', userId] });
    },
  });

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return results.slice(startIndex, startIndex + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (results.length === 0) {
    return <div className="text-center p-12 bg-white rounded-2xl shadow-lg"><h3 className="text-2xl font-semibold">No Candidates Found</h3></div>;
  }

  return (
    <>
      <div className="space-y-4">
        {paginatedResults.map((candidate) => {
          const isBookmarked = bookmarkedIdsSet.has(candidate.id);
          
          return (
            <Card key={candidate.id} className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                
                  {/* Column 1: Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg">
                      {candidate.full_name?.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Column 2: Main Content (expands) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-lg font-bold text-purple-700">{candidate.full_name}</span>
                      <span className="text-sm font-semibold text-gray-700">
                         <Highlight text={candidate.title || ''} query={highlightQuery} />
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-4">
                      {candidate.total_experience_years != null && <div className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-gray-400" /> {candidate.total_experience_years}y 0m</div>}
                      {candidate.current_ctc && <div className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4 text-gray-400" /> {formatSalary(candidate.current_ctc)}</div>}
                      {candidate.current_location && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" /> {candidate.current_location}</div>}
                    </div>

                    <div className="grid grid-cols-5 gap-x-4 gap-y-2 text-sm">
                      <div className="col-span-1 text-gray-500">Current</div>
                      <div className="col-span-4 font-medium text-gray-800">
                        <Highlight text={`${candidate.current_designation || ''} at ${candidate.current_company || ''}`} query={highlightQuery} />
                      </div>

                      {/* BUG FIX: Conditionally render "Previous" only if data exists */}
                      {(candidate.previous_company || candidate.previous_designation) && (
                        <>
                          <div className="col-span-1 text-gray-500">Previous</div>
                          <div className="col-span-4 text-gray-800">
                             <Highlight text={`${candidate.previous_designation || ''} at ${candidate.previous_company || ''}`} query={highlightQuery} />
                          </div>
                        </>
                      )}

                      <div className="col-span-1 text-gray-500">Education</div>
                      <div className="col-span-4 text-gray-800">
                        <Highlight text={candidate.education_summary || ''} query={highlightQuery} />
                      </div>

                      <div className="col-span-1 text-gray-500">Key skills</div>
                      <div className="col-span-4 text-gray-800 line-clamp-2">
                        <Highlight text={(candidate.key_skills || []).join(' | ')} query={highlightQuery} />
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Actions (fixed width) */}
                  <div className="w-40 flex flex-col items-stretch justify-center gap-4">
                    <Button variant="bookmark" className="text-gray-600 p-0 h-auto flex items-center gap-1 self-center" onClick={() => toggleBookmark({ candidateId: candidate.id, isBookmarked })}>
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'text-purple-600 fill-current' : 'text-gray-400'}`} />
                      {isBookmarked ? 'Saved' : 'Save'}
                    </Button>
                    {/* <Button size='xs' onClick={() => setContactInfo({ email: candidate.email })} variant="outline" className="border-purple-500 text-purple-600 font-semibold hover:bg-purple-50 hover:text-purple-700">View Contact</Button> */}
                    <Link to={`/talent-pool/${candidate.id}`} className="w-full">
                       <Button size='sm' variant="default" className="w-full bg-purple-600 hover:bg-purple-700">View Profile</Button>
                    </Link>
                    
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px] border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium text-gray-900 px-3">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Dialog (Modal) */}
      <Dialog open={!!contactInfo} onOpenChange={(isOpen) => !isOpen && setContactInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {contactInfo?.email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-800">{contactInfo.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(contactInfo.email!)}>
                  {isCopied ? <ClipboardCheck className="h-4 w-4 mr-2 text-green-600" /> : <Clipboard className="h-4 w-4 mr-2" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CandidateSearchResults;