// src/components/candidates/zive-x/CandidateSearchResults.tsx

import { useState, useMemo, FC } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CandidateSearchResult } from '@/types/candidateSearch'; // Assuming this is now in types folder
import { Briefcase, GraduationCap, MapPin, IndianRupee } from 'lucide-react';

interface CandidateSearchResultsProps {
  results: CandidateSearchResult[];
}

// A small helper to format salary
const formatSalary = (ctc: number | null) => {
  if (!ctc) return null;
  const inLacs = ctc / 100000;
  return `${inLacs.toFixed(2)} Lacs`;
};

const CandidateSearchResults: FC<CandidateSearchResultsProps> = ({ results }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(40);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return results.slice(startIndex, startIndex + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(results.length / itemsPerPage);

  console.log('paginatedResults', paginatedResults);

  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900">No Candidates Found</h3>
        <p className="mt-1 text-sm text-gray-500">Your search did not return any results. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Found {results.length} candidate(s)</h2>
      </div>
      
      {paginatedResults.map((candidate) => (
        <Card key={candidate.id} className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Left side: Avatar */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-3xl font-bold">
                  {candidate.full_name?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Right side: Candidate Details */}
              <div className="flex-grow">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <Link 
                      to={candidate.source === 'migrated' ? `/migrated-talent-pool/${candidate.id}` : `/talent-pool/${candidate.id}`}
                      className="text-lg font-bold text-primary hover:underline"
                    >
                      {candidate.full_name}
                    </Link>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      {candidate.total_experience_years && <span>{candidate.total_experience_years} Yrs Exp</span>}
                      {candidate.current_ctc && <span><IndianRupee size={12} className="inline-block -mt-1" /> {formatSalary(candidate.current_ctc)}</span>}
                      {candidate.email && <span>{candidate.email}</span>}
                    </div>
                  </div>
                  {/* Optional: Add Comment/Save buttons here later */}
                </div>

                {/* Body Details Table */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 text-xs text-gray-700 gap-y-2">
                  <div className="md:col-span-2 font-semibold text-gray-500">Current</div>
                  <div className="md:col-span-10">{candidate.current_designation || 'N/A'} at {candidate.current_company || 'N/A'}</div>

                  <div className="md:col-span-2 font-semibold text-gray-500">Education</div>
                  <div className="md:col-span-10">{candidate.education_summary || 'N/A'}</div>
                  
                  <div className="md:col-span-2 font-semibold text-gray-500">Key skills</div>
                  <div className="md:col-span-10">
                    <p className="line-clamp-2">
                      {(candidate.key_skills || []).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="80">80</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateSearchResults;