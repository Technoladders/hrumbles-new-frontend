// src/pages/jobs/ai/AllCandidatesPage.tsx

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux'; 
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { UserPlus, ChevronLeft, ChevronRight, Search, Users, ShieldCheck, Clock, Briefcase } from 'lucide-react';
import { getAllCandidatesWithVerificationInfo } from '@/services/candidateService';
import { CandidatesTable } from './CandidatesTable';
import { AddCandidateJobSelectModal } from './AddCandidateJobSelectModal';
import { AiAddCandidateModal } from './AiAddCandidateModal';
import Loader from '@/components/ui/Loader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { GlobalAddCandidateModal } from './GlobalAddCandidateModal';
import { AssignCandidateToJobModal } from './AddCandidateJobSelectModal';

const AllCandidatesPage = () => {
    const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [isJobSelectModalOpen, setIsJobSelectModalOpen] = useState(false);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // State for search
    // --- NEW PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Default to 50

   const [assignModalState, setAssignModalState] = useState({ 
      isOpen: false, 
      candidateId: null as string | null, 
      candidateName: '' 
    });


  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['allCandidatesWithVerification'],
    queryFn: getAllCandidatesWithVerificationInfo,
  });
  
 const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidates;
    const lowercasedFilter = searchTerm.toLowerCase();
    return candidates.filter(candidate =>
      candidate.name?.toLowerCase().includes(lowercasedFilter) ||
      candidate.email?.toLowerCase().includes(lowercasedFilter) ||
      candidate.job_title?.toLowerCase().includes(lowercasedFilter)
    );
  }, [candidates, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredCandidates.length;
    const verified = filteredCandidates.filter(c => 
        c.latest_verification && isVerificationSuccessful(c.latest_verification.response_data, c.latest_verification.lookup_type)
    ).length;
    const uniqueJobs = new Set(filteredCandidates.map(c => c.job_id)).size;
    return { total, verified, uniqueJobs };
  }, [filteredCandidates]);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

   const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(Number(value));
        setCurrentPage(1);
    };

    const handleCloseAddCandidate = () => {
        setIsAddModalOpen(false);
        refetch(); // Refetch data after adding a new candidate
    };

    // --- NEW HANDLERS FOR ASSIGNMENT MODAL ---
    const handleOpenAssignModal = (candidateId: string, candidateName: string) => {
        setAssignModalState({ isOpen: true, candidateId, candidateName });
    };

    const handleCloseAssignModal = () => {
        setAssignModalState({ isOpen: false, candidateId: null, candidateName: '' });
    };

    const handleAssignSuccess = () => {
        refetch(); // Refetch data to show the updated job title
        handleCloseAssignModal();
    };

 return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Candidate Directory</h1>
          <p className="text-gray-500">Search, view, and manage all candidates across your organization.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Verify New Candidate
        </Button>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Candidates</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Successfully Verified</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.verified}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Jobs</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.uniqueJobs}</div></CardContent></Card>
      </div>
      
      {/* --- TABLE CARD --- */}
      <Card>
        <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input placeholder="Search by name, email, or job title..." className="pl-10 h-10 w-full md:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </CardHeader>
        <CardContent>
          <CandidatesTable candidates={paginatedCandidates} organizationId={organizationId}  onAssignClick={handleOpenAssignModal} />
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /> Prev</Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next <ChevronRight size={16} /></Button>
              </div>
              <span className="text-sm text-gray-600">
                Total Candidates: {candidates.length}
              </span>
          </CardFooter>
        )}
      </Card>

      {/* --- MODALS --- */}
      <GlobalAddCandidateModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddCandidate}
      />
      <AssignCandidateToJobModal
                isOpen={assignModalState.isOpen}
                onClose={handleCloseAssignModal}
                onAssignSuccess={handleAssignSuccess}
                candidateId={assignModalState.candidateId}
                candidateName={assignModalState.candidateName}
            />
    </div>
  );
};

export default AllCandidatesPage;