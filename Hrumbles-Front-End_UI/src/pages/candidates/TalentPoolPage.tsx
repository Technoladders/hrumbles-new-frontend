import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';

// Import UI components and icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users, UserPlus, Search, History, ChevronsRight, Calendar,
  ChevronLeft, ChevronRight, Briefcase, ScanSearch
} from 'lucide-react';

// Import your modals
import AddCandidateModal from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog from '@/components/candidates/AnalysisHistoryDialog';
import Loader from '@/components/ui/Loader'; // Assuming you have a general Loader component

// Define the type for a candidate in the talent pool
export interface TalentPoolCandidate {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  suggested_title: string;
  created_at: string;
  created_by: { // Nested object for creator details
    first_name: string;
    last_name: string;
  } | null;
}

const TalentPoolPage = () => {
  // State management for UI
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // State for modals
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [compareCandidate, setCompareCandidate] = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<TalentPoolCandidate | null>(null);

  // Fetch candidates with creator's name using a join
  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_talent_pool')
        .select(`
          id,
          candidate_name,
          email,
          phone,
          suggested_title,
          created_at,
          created_by:hr_employees!hr_talent_pool_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as TalentPoolCandidate[];
    },
  });
  // --- END: MODIFICATION ---

  // --- START: MODIFICATION ---
  // Memoized filtering logic with phone number
  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate =>
      (candidate.candidate_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);
  // --- END: MODIFICATION ---

  // paginatedCandidates and totalPages logic is unchanged
  const paginatedCandidates = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);


  // Stat card and handler functions are unchanged
  const totalCandidates = filteredCandidates.length;
  const addedThisMonth = filteredCandidates.filter(c => moment(c.created_at).isAfter(moment().subtract(30, 'days'))).length;
  const addedThisWeek = filteredCandidates.filter(c => moment(c.created_at).isAfter(moment().subtract(7, 'days'))).length;
  const handleCandidateAdded = () => { refetch(); setAddModalOpen(false); };
  const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }

  const renderTable = () => {
    if (paginatedCandidates.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No candidates found matching your criteria.</p>
        </div>
      );
    }

    console.log("PaginatedCasndd", paginatedCandidates)

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {/* --- START: MODIFICATION --- */}
              <tr>
                <th scope="col" className="table-header-cell">Candidate</th>
                <th scope="col" className="table-header-cell">Suggested Title</th>
                <th scope="col" className="table-header-cell">Date Added</th>
                <th scope="col" className="table-header-cell">Added By</th>
                <th scope="col" className="table-header-cell text-right">Actions</th>
              </tr>
              {/* --- END: MODIFICATION --- */}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50 transition">
                  <td className="table-cell">
                    <div className="flex flex-col">
                      <Link to={`/talent-pool/${candidate.id}`} className="font-medium text-primary hover:underline">
                        {candidate.candidate_name || 'N/A'}
                      </Link>
                      <span className="text-xs text-gray-500">{candidate.email || 'No email'}</span>
                    </div>
                  </td>
                  {/* --- START: MODIFICATION --- */}
                  <td className="table-cell">
                    {candidate.suggested_title || <span className="text-gray-400">Not specified</span>}
                  </td>
                  <td className="table-cell">
                    {moment(candidate.created_at).format("DD MMM YYYY")}
                    <span className="block text-xs text-gray-500">
                      ({moment(candidate.created_at).fromNow()})
                    </span>
                  </td>
                  <td className="table-cell">
                    {candidate.created_by ? `${candidate.created_by.first_name} ${candidate.created_by.last_name}` : 'System'}
                  </td>
                  {/* --- END: MODIFICATION --- */}
                  <td className="table-cell text-right">
                    <div className="flex justify-end space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryCandidate(candidate)}>
                              <History className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Analysis History</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCompareCandidate(candidate)}>
                              <ScanSearch className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Compare with Job</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-gray-600">
          Showing {Math.min(startIndex + 1, totalCandidates)} to {Math.min(startIndex + itemsPerPage, totalCandidates)} of {totalCandidates} candidates
        </span>
      </div>
    );
  };
  
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="space-y-8 animate-fade-in p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Talent Pool</h1>
          <p className="text-gray-500">Search and manage your organization's candidates.</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2">
          <UserPlus size={16} />
          <span>Add Candidate</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Candidates</p>
              <h3 className="text-3xl font-bold">{totalCandidates}</h3>
            </div>
            <div className="stat-icon stat-icon-blue"><Users size={22} /></div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Added this Month</p>
              <h3 className="text-3xl font-bold">{addedThisMonth}</h3>
            </div>
            <div className="stat-icon stat-icon-green"><Calendar size={22} /></div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Added this Week</p>
              <h3 className="text-3xl font-bold">{addedThisWeek}</h3>
            </div>
            <div className="stat-icon stat-icon-yellow"><Briefcase size={22} /></div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Archived</p>
              <h3 className="text-3xl font-bold">0</h3> {/* Placeholder */}
            </div>
            <div className="stat-icon stat-icon-purple"><Users size={22} /></div>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search by name or email or phone"
          className="pl-10 h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {renderTable()}
      {filteredCandidates.length > 0 && renderPagination()}

      {isAddModalOpen && (
        <AddCandidateModal
          isOpen={isAddModalOpen}
          onClose={() => setAddModalOpen(false)}
          onCandidateAdded={handleCandidateAdded}
        />
      )}
      
      {compareCandidate && (
        <CompareWithJobDialog
          isOpen={!!compareCandidate}
          onClose={() => setCompareCandidate(null)}
          candidateId={compareCandidate.id}
        />
      )}
      
      {historyCandidate && (
        <AnalysisHistoryDialog
          isOpen={!!historyCandidate}
          onClose={() => setHistoryCandidate(null)}
          candidateId={historyCandidate.id}
          candidateName={historyCandidate.candidate_name}
        />
      )}
    </div>
  );
};

export default TalentPoolPage;