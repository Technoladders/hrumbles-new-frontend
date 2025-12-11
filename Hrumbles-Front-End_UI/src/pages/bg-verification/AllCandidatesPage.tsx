import { useState, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux'; 
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  UserPlus, ChevronLeft, ChevronRight, Search, 
  Users, ShieldCheck, AlertCircle, HelpCircle, Loader2,
  XCircle
} from 'lucide-react';
import moment from 'moment';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming you have this from Jobs.tsx
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector"; // Assuming this exists as per Jobs.tsx

// Services & Modals
import { getAllCandidatesWithVerificationInfo } from '@/services/candidateService';
import { CandidatesTable } from './CandidatesTable';
import { GlobalAddCandidateModal } from './GlobalAddCandidateModal';
import { AssignCandidateToJobModal } from './AddCandidateJobSelectModal';

// --- HELPER: Centralized Status Logic ---
// We define this outside or import it to ensure Stats and Table use identical logic
import { getVerificationSummary } from './CandidatesTable'; 

const AllCandidatesPage = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assignModalState, setAssignModalState] = useState({ 
    isOpen: false, 
    candidateId: null as string | null, 
    candidateName: '' 
  });

  // --- URL SYNCED STATE ---
  const searchTerm = searchParams.get('search') || '';
  const activeTab = searchParams.get('tab') || 'all'; // 'all', 'verified', 'unverified', 'not_found'
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = parseInt(searchParams.get('limit') || '20', 10);
  
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null} | null>(
    searchParams.get("startDate") || searchParams.get("endDate") 
      ? {
          startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null,
          endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null,
        }
      : null
  );

  // --- DATA FETCHING ---
  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ['allCandidatesWithVerification'],
    queryFn: getAllCandidatesWithVerificationInfo,
    refetchOnWindowFocus: false,
  });

  // --- URL UPDATER ---
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (activeTab !== "all") params.set("tab", activeTab);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 20) params.set("limit", itemsPerPage.toString());
    if (dateRange?.startDate) params.set("startDate", dateRange.startDate.toISOString());
    if (dateRange?.endDate) params.set("endDate", dateRange.endDate.toISOString());
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, activeTab, currentPage, itemsPerPage, dateRange, setSearchParams]);


  // --- PROCESSING DATA & STATS ---
  const processedData = useMemo(() => {
    // 1. Tag every candidate with a status string for easy filtering
    const taggedCandidates = candidates.map(c => {
        const summary = getVerificationSummary(c);
        let status = 'unverified';
        if (summary.badgeColor === 'green') status = 'verified';
        else if (summary.badgeColor === 'yellow') status = 'not_found';
        return { ...c, _status: status };
    });

    // 2. Calculate Stats (Based on total data, not filtered)
    const stats = {
        total: taggedCandidates.length,
        verified: taggedCandidates.filter(c => c._status === 'verified').length,
        notFound: taggedCandidates.filter(c => c._status === 'not_found').length,
        unverified: taggedCandidates.filter(c => c._status === 'unverified').length,
    };

    return { taggedCandidates, stats };
  }, [candidates]);


  // --- FILTERING ---
  const filteredCandidates = useMemo(() => {
    return processedData.taggedCandidates.filter(candidate => {
        // 1. Search
        const lowerTerm = searchTerm.toLowerCase();
        const matchesSearch = 
            !searchTerm || 
            candidate.name?.toLowerCase().includes(lowerTerm) ||
            candidate.email?.toLowerCase().includes(lowerTerm) ||
            candidate.phone?.includes(lowerTerm);

        // 2. Tab / Status
        const matchesTab = 
            activeTab === 'all' || 
            candidate._status === activeTab;

        // 3. Date Range
        const matchesDate = (() => {
            if (!dateRange || !dateRange.startDate || !dateRange.endDate) return true;
            const created = moment(candidate.created_at);
            const start = moment(dateRange.startDate).startOf('day');
            const end = moment(dateRange.endDate).endOf('day');
            return created.isBetween(start, end, undefined, '[]');
        })();

        return matchesSearch && matchesTab && matchesDate;
    });
  }, [processedData.taggedCandidates, searchTerm, activeTab, dateRange]);


  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  // --- HANDLERS ---
  const handleTabChange = (val: string) => {
    setSearchParams(prev => {
        prev.set('tab', val);
        prev.set('page', '1');
        return prev;
    });
  };
  
  const handleCloseAddCandidate = () => {
    setIsAddModalOpen(false);
    refetch(); 
  };

  const handleOpenAssignModal = (candidateId: string, candidateName: string) => {
    setAssignModalState({ isOpen: true, candidateId, candidateName });
  };

  const handleCloseAssignModal = () => {
    setAssignModalState({ isOpen: false, candidateId: null, candidateName: '' });
  };

  const handleAssignSuccess = () => {
    refetch();
    handleCloseAssignModal();
  };

  const handleCardClick = (tab: string) => {
    handleTabChange(tab);
  };

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={(val) => {
             const params = new URLSearchParams(searchParams);
             params.set('limit', val);
             params.set('page', '1');
             setSearchParams(params);
        }}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">per page</span>
      </div>

      <div className="flex items-center gap-2">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchParams(p => { p.set('page', String(Math.max(currentPage - 1, 1))); return p; })} 
            disabled={currentPage === 1}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">Page {currentPage} of {Math.max(totalPages, 1)}</span>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchParams(p => { p.set('page', String(Math.min(currentPage + 1, totalPages))); return p; })} 
            disabled={currentPage === totalPages || totalPages === 0}
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <span className="text-sm text-gray-600">
        Showing {filteredCandidates.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} candidates
      </span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-6 bg-gray-50/30 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight text-gray-800">Candidate Directory</h1>
          <p className="text-gray-500">Search, verify, and manage background checks.</p>
        </div>
        
        {/* 3D STYLE BUTTON (From Jobs.tsx) */}
        <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-3 pl-1.5 pr-6 py-1 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-[0_4px_15px_rgba(119,49,232,0.4)] hover:shadow-[0_6px_20px_rgba(119,49,232,0.6)] transform hover:scale-105 transition-all duration-300 group h-10"
          >
            <div className="relative flex items-center justify-center w-7 h-7 mr-1">
              <div className="absolute inset-0 bg-white blur-md scale-110 opacity-50 animate-pulse"></div>
              <div className="relative w-full h-full rounded-full flex items-center justify-center z-10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.2)]"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff, #f1f5f9)' }}
              >
                <UserPlus size={16} className="text-[#7731E8]" />
              </div>
            </div>
            <span className="tracking-wide text-sm relative z-10">Verify New Candidate</span>
          </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card onClick={() => handleCardClick('all')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow border-none shadow-sm">
            <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Total Candidates</p><h3 className="text-3xl font-bold text-gray-800">{processedData.stats.total}</h3></div>
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="text-blue-600" size={22} /></div>
          </Card>
          
          <Card onClick={() => handleCardClick('verified')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow border-none shadow-sm">
            <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Verified</p><h3 className="text-3xl font-bold text-green-700">{processedData.stats.verified}</h3></div>
            <div className="p-2 bg-green-50 rounded-lg"><ShieldCheck className="text-green-600" size={22} /></div>
          </Card>

          <Card onClick={() => handleCardClick('unverified')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow border-none shadow-sm">
            <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Yet to Verify</p><h3 className="text-3xl font-bold text-gray-700">{processedData.stats.unverified}</h3></div>
            <div className="p-2 bg-gray-100 rounded-lg"><HelpCircle className="text-gray-600" size={22} /></div>
          </Card>

          <Card onClick={() => handleCardClick('not_found')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow border-none shadow-sm">
            <div className="space-y-1"><p className="text-sm font-medium text-gray-500">Partially Verified</p><h3 className="text-3xl font-bold text-amber-600">{processedData.stats.notFound}</h3></div>
            <div className="p-2 bg-amber-50 rounded-lg"><AlertCircle className="text-amber-600" size={22} /></div>
          </Card>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full">
         {/* Tabs */}
         <div className="flex-shrink-0 order-1">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 p-1 shadow-inner space-x-0.5">
                <TabsTrigger value="all" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all">All</TabsTrigger>
                <TabsTrigger value="verified" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all">Verified</TabsTrigger>
                <TabsTrigger value="unverified" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-gray-600 data-[state=active]:text-white transition-all">Yet to Verify</TabsTrigger>
                <TabsTrigger value="not_found" className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all">Partially Verified</TabsTrigger>
                </TabsList>
            </Tabs>
         </div>

         {/* Search */}
         <div className="relative flex-grow order-2 min-w-[200px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
                placeholder="Search by Name, Email or Phone..."
                className="pl-10 h-10 w-full rounded-full bg-white border-gray-200 shadow-sm focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('search', e.target.value);
                    params.set('page', '1');
                    setSearchParams(params);
                }}
            />
         </div>

         {/* Date Picker */}
         <div className="flex-shrink-0 order-3 w-full sm:w-auto">
            <EnhancedDateRangeSelector
                value={dateRange}
                onChange={setDateRange}
                onApply={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', '1');
                    setSearchParams(params);
                }}
            />
         </div>
      </div>
      
      {/* MAIN CONTENT */}
      {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>
      ) : (
          <div className="animate-fade-in">
             <CandidatesTable 
                candidates={paginatedCandidates} 
                organizationId={organizationId}  
                onAssignClick={handleOpenAssignModal} 
             />
             {filteredCandidates.length > 0 && renderPagination()}
          </div>
      )}

      {/* MODALS */}
      <GlobalAddCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); refetch(); }}
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