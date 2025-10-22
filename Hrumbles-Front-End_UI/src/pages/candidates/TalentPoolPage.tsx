import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
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
import {
  Users, UserPlus, Search, History, ChevronsRight, Calendar,
  ChevronLeft, ChevronRight, Briefcase, ScanSearch, Mail, Phone, Copy
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
  const { role, user } = useSelector((state: any) => state.auth);
  
  // State management for UI
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // State for modals
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [compareCandidate, setCompareCandidate] = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<TalentPoolCandidate | null>(null);
  
  // State to manage "Copied!" feedback tooltip
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  
  // Handler to copy text to clipboard and provide feedback
  const handleCopyToClipboard = (text: string, type: 'email' | 'phone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedValue(type);
    setTimeout(() => {
        setCopiedValue(null);
    }, 1500); // Reset feedback after 1.5 seconds
  };


  // Fetch candidates with creator's name using a join
  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates', role, user?.id],
    queryFn: async () => {
      let query = supabase
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
        `);

      if (role === 'employee' && user?.id) {
        query = query.eq('created_by', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as TalentPoolCandidate[];
    },
    enabled: !!user,
  });

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate =>
      (candidate.candidate_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (candidate.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);

  const paginatedCandidates = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);

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

  const renderCandidateList = () => {
    if (paginatedCandidates.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p>No candidates found matching your criteria.</p>
        </div>
      );
    }
    
    const actionButtonStyles = "h-9 w-9 rounded-lg bg-white shadow-md hover:shadow-lg text-gray-500 hover:text-primary hover:-translate-y-px transition-all duration-200";

    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-8 gap-4 items-center bg-gray-50/70 px-4 py-3 border-b border-gray-200">
            <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</div>
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Title</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added By</div>
        </div>

        {/* Candidate Rows */}
        <div className="divide-y divide-gray-200/80">
          {paginatedCandidates.map((candidate) => (
            <div 
              key={candidate.id} 
              className="grid grid-cols-8 gap-4 items-center p-4 transition-all duration-300 ease-in-out hover:bg-gray-50"
            >
              {/* Column 1: Candidate */}
              <div className="col-span-8 md:col-span-3">
                <div className="flex items-center gap-3">
                  <Link to={`/talent-pool/${candidate.id}`} className="font-semibold text-gray-900 hover:underline text-base truncate">
                    {candidate.candidate_name || 'N/A'}
                  </Link>
                  <div className="flex items-center gap-3">
                      <TooltipProvider delayDuration={100}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Mail className="h-4 w-4 text-gray-400 hover:text-red-500 cursor-pointer transition-colors duration-200" />
                              </TooltipTrigger>
                              <TooltipContent 
                                  className="cursor-pointer bg-white p-2 rounded-lg shadow-lg border"
                                  onClick={() => handleCopyToClipboard(candidate.email, 'email')}
                              >
                                  {copiedValue === 'email' ? (
                                      <p className="text-primary font-semibold">Copied!</p>
                                  ) : (
                                      <div className="flex items-center gap-3 text-gray-700">
                                          <p>{candidate.email}</p>
                                          <Copy className="h-4 w-4" />
                                      </div>
                                  )}
                              </TooltipContent>
                          </Tooltip>
                      </TooltipProvider>

                      {candidate.phone && (
                          <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Phone className="h-4 w-4 text-gray-400 hover:text-green-500 cursor-pointer transition-colors duration-200" />
                                  </TooltipTrigger>
                                  <TooltipContent 
                                      className="cursor-pointer bg-white p-2 rounded-lg shadow-lg border"
                                      onClick={() => handleCopyToClipboard(candidate.phone, 'phone')}
                                  >
                                      {copiedValue === 'phone' ? (
                                          <p className="text-primary font-semibold">Copied!</p>
                                      ) : (
                                          <div className="flex items-center gap-3 text-gray-700">
                                              <p>{candidate.phone}</p>
                                              <Copy className="h-4 w-4" />
                                          </div>
                                      )}
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}
                  </div>
                </div>
              </div>
              
              {/* Column 2: Actions */}
              <div className="col-span-8 md:col-span-1 flex justify-start items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className={actionButtonStyles} onClick={() => setHistoryCandidate(candidate)}>
                        <History className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>View Analysis History</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className={actionButtonStyles} onClick={() => setCompareCandidate(candidate)}>
                        <ScanSearch className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Compare with Job</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Column 3: Suggested Title */}
              <div className="col-span-8 md:col-span-2">
                <span className="md:hidden text-xs text-gray-500">Title: </span>
                {candidate.suggested_title || <span className="text-gray-400">Not specified</span>}
              </div>

              {/* Column 4: Added By */}
              <div className="col-span-8 md:col-span-2">
                  {candidate.created_by ? (
                      <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-sm shadow-md">
                              {`${candidate.created_by.first_name.charAt(0)}${candidate.created_by.last_name.charAt(0)}`.toUpperCase()}
                          </div>
                          <div>
                              <p className="font-semibold text-gray-800">
                                  {`${candidate.created_by.first_name} ${candidate.created_by.last_name}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                  {moment(candidate.created_at).format("DD MMM YYYY")} ({moment(candidate.created_at).fromNow()})
                              </p>
                          </div>
                      </div>
                  ) : (
                      <span>System</span>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };


  const renderPagination = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
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

      {renderCandidateList()}
      
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