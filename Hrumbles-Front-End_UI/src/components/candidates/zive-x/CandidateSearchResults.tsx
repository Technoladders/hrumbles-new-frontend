// src/components/candidates/zive-x/CandidateSearchResults.tsx

import { useState, useMemo, FC } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, IndianRupee, MapPin, Briefcase, GraduationCap } from 'lucide-react';
import { CandidateSearchResult } from '@/types/candidateSearch';

interface CandidateSearchResultsProps {
  results: CandidateSearchResult[];
}

// Helper to format salary
const formatSalary = (ctc: number | null) => {
  if (!ctc) return null;
  const inLacs = ctc / 100000;
  return `${inLacs.toFixed(1)} LPA`; // Simplified format
};

const CandidateSearchResults: FC<CandidateSearchResultsProps> = ({ results }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(40);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return results.slice(startIndex, startIndex + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(results.length / itemsPerPage);

  if (results.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl shadow-lg border border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Candidates Found</h3>
        <p className="text-gray-500">Try adjusting your search filters to see more results.</p>
        <Button variant="outline" className="mt-4">Refine Search</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Found <span className="text-purple-600">{results.length}</span> candidate{results.length !== 1 ? 's' : ''}
          </h2>
          {/* <div className="flex items-center gap-4 text-sm">
            <span>Sort by:</span>
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Relevance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
              </SelectContent>
            </Select>
          </div> */}
        </div>
      </div>
      
      {/* Candidates List */}
      <div className="space-y-4">
        {paginatedResults.map((candidate) => (
          <Card key={candidate.id} className="hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row gap-6 p-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                    {candidate.full_name?.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Candidate Details */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={candidate.source === 'migrated' ? `/migrated-talent-pool/${candidate.id}` : `/talent-pool/${candidate.id}`}
                    className="block text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors mb-2"
                  >
                    {candidate.full_name}
                  </Link>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                    {candidate.total_experience_years != null && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{candidate.total_experience_years} Yrs Exp</span>
                      </div>
                    )}
                    {candidate.current_ctc && (
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        <span>{formatSalary(candidate.current_ctc)}</span>
                      </div>
                    )}
                    {candidate.locations && candidate.locations.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{candidate.locations.join(', ')}</span>
                      </div>
                    )}
                    {candidate.email && <span>{candidate.email}</span>}
                  </div>

                  {/* Current Role */}
                  {candidate.current_designation || candidate.current_company ? (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <span>{candidate.current_designation || 'N/A'}</span>
                        <span className="text-gray-500">at</span>
                        <span className="font-semibold">{candidate.current_company || 'N/A'}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Education */}
                  {candidate.education_summary ? (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1">
                        <GraduationCap className="h-4 w-4 text-green-600" />
                        <span>Education</span>
                      </div>
                      <p className="text-sm text-gray-700">{candidate.education_summary}</p>
                    </div>
                  ) : null}

                  {/* Key Skills */}
                  {(candidate.key_skills || []).length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                        Key Skills
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(candidate.key_skills || []).slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                            {skill}
                          </Badge>
                        ))}
                        {(candidate.key_skills || []).length > 6 && (
                          <Badge variant="outline">+{candidate.key_skills.length - 6} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 justify-end items-end">
                  <Link 
                    to={candidate.source === 'migrated' ? `/migrated-talent-pool/${candidate.id}` : `/talent-pool/${candidate.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto  font-semibold px-6 py-2 rounded-lg shadow-md">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
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
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1}
                className="border-gray-300 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-900 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                disabled={currentPage === totalPages}
                className="border-gray-300 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateSearchResults;