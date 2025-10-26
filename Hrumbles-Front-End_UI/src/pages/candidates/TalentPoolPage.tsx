import { useState, useMemo, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
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
  ChevronLeft, ChevronRight, Briefcase, ScanSearch, Mail, Phone, Copy, Sparkles,
  CheckCircle
} from 'lucide-react';

// Import your modals and custom components
import AddCandidateModal from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog from '@/components/candidates/AnalysisHistoryDialog';
import Loader from '@/components/ui/Loader';
import EnrichDataDialog from '@/components/candidates/talent-pool/EnrichDataDialog';
import CircularProgress from '@/components/jobs/ui/CircularProgress';

// Define the main interface for a candidate
export interface TalentPoolCandidate {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  suggested_title: string;
  created_at: string;
  created_by: {
    first_name: string;
    last_name: string;
  } | null;
  [key: string]: any; // Allows for other dynamic properties
}

// Define the shape of the Redux state for useSelector
interface RootState {
  auth: {
    role: string;
    user: { id: string } | null;
  };
}

// Profile Completion Calculator Logic
const calculateProfileCompletion = (candidate: TalentPoolCandidate) => {
    const fieldsToCheck = [
      { key: 'phone', label: 'Phone Number' },
      { key: 'total_experience', label: 'Total Experience' },
      { key: 'current_company', label: 'Current Company' },
      { key: 'current_designation', label: 'Current Designation' },
      { key: 'notice_period', label: 'Notice Period' },
      { key: 'current_location', label: 'Current Location' },
      { key: 'highest_education', label: 'Highest Education' },
      { key: 'work_experience', label: 'Work Experience Details' },
    ];

    let filledCount = 0;
    const missingFields: string[] = [];

    fieldsToCheck.forEach(field => {
        const value = candidate[field.key];
        let isFilled = Array.isArray(value) ? value.length > 0 : !!value && String(value).trim() !== '';
        if (isFilled) {
            filledCount++;
        } else {
            missingFields.push(field.label);
        }
    });

    const percentage = Math.round((filledCount / fieldsToCheck.length) * 100);

    // The colorClass logic is now handled inside the CircularProgress component.
    // This can be removed if not used elsewhere.
    let colorClass = "text-green-500";
    if (percentage < 50) {
        colorClass = "text-red-500";
    } else if (percentage < 100) {
        colorClass = "text-yellow-500";
    }

    return { percentage, colorClass, missingFields };
};

const TalentPoolPage: FC = () => {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get("limit") || "20", 10));

  const [isAddModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [compareCandidate, setCompareCandidate] = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<TalentPoolCandidate | null>(null);
  const [enrichCandidate, setEnrichCandidate] = useState<TalentPoolCandidate | null>(null);

  const [copiedValue, setCopiedValue] = useState<'email' | 'phone' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 20) params.set("limit", itemsPerPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, itemsPerPage, setSearchParams]);

  const handleCopyToClipboard = (text: string, type: 'email' | 'phone'): void => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedValue(type);
    setTimeout(() => { setCopiedValue(null); }, 1500);
  };

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
          current_salary,
          current_location,
          total_experience,
          current_company,
          current_designation,
          notice_period,
          highest_education,
          work_experience,
          created_by:hr_employees!hr_talent_pool_created_by_fkey (
            first_name,
            last_name
          )
        `);

      if (role === '' && user?.id) {
        query = query.eq('created_by', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as TalentPoolCandidate[];
    },
    enabled: !!user,
  });

  const totalCandidates = candidates.length;
  const addedThisMonth = useMemo(() => candidates.filter(c => moment(c.created_at).isSame(moment(), 'month')).length, [candidates]);
  const addedThisWeek = useMemo(() => candidates.filter(c => moment(c.created_at).isSame(moment(), 'week')).length, [candidates]);

  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidates;
    return candidates.filter((c) => {
      const term = searchTerm.toLowerCase();
      return (
        c.candidate_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term)
      );
    });
  }, [candidates, searchTerm]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage, itemsPerPage]);

  const handleCandidateAdded = () => {
    refetch();
    setAddModalOpen(false);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  const renderCandidateList = () => {
    if (isLoading) return <Loader />;
    if (filteredCandidates.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-2">No candidates found.</p>
          {searchTerm && <p className="text-sm text-gray-400">Try adjusting your search criteria.</p>}
        </Card>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* FIXED HEADER */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
            <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</div>
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</div>
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Title</div>
            <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added By</div>
        </div>

        <div className="divide-y divide-gray-200/80">
          {paginatedCandidates.map((candidate) => {
            const profileStatus = calculateProfileCompletion(candidate);
            return (
              <div key={candidate.id} className="grid grid-cols-12 gap-3 items-center px-4 py-4 transition-all duration-300 ease-in-out hover:bg-gray-50">
                
                {/* CANDIDATE NAME & PROFILE STATUS - 3 columns */}
                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/talent-pool/${candidate.id}`} 
                      className="font text-gray-900 hover:text-purple-600 hover:underline text-sm truncate transition-colors"
                    >
                      {candidate.candidate_name || 'N/A'}
                    </Link>
                    
                    {/* MODIFIED: Always use CircularProgress */}
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <CircularProgress
                            percentage={profileStatus.percentage}
                            showEnrichButton={true} // Component hides button at 100%
                            onEnrichClick={() => setEnrichCandidate(candidate)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {profileStatus.percentage === 100 ? (
                            <p>Profile Completed</p>
                          ) : (
                            <div className="p-1">
                              <p className="font-semibold text-xs mb-1">Missing Info:</p>
                              <ul className="list-disc pl-4 text-xs space-y-0.5">
                                {profileStatus.missingFields.map(field => <li key={field}>{field}</li>)}
                              </ul>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                  </div>
                </div>
                
                {/* ACTIONS - 2 columns */}
                <div className="col-span-2 flex justify-center items-center">
                   <div className="flex items-center space-x-1 rounded-full bg-slate-50 p-1 shadow-sm border border-slate-200">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-purple-50" 
                              onClick={() => handleCopyToClipboard(candidate.email, 'email')}
                            >
                              <Mail className="h-4 w-4 text-purple-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedValue === 'email' ? <p>Copied!</p> : <p>{candidate.email}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {candidate.phone && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full hover:bg-purple-50" 
                                onClick={() => handleCopyToClipboard(candidate.phone, 'phone')}
                              >
                                <Phone className="h-4 w-4 text-purple-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {copiedValue === 'phone' ? <p>Copied!</p> : <p>{candidate.phone}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <div className="h-5 w-px bg-slate-300" />
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-slate-50" 
                              onClick={() => setHistoryCandidate(candidate)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View History</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-slate-50" 
                              onClick={() => setCompareCandidate(candidate)}
                            >
                              <ScanSearch className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Compare with Job</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <div className="h-5 w-px bg-slate-300" />
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full hover:bg-violet-50" 
                              onClick={() => setEnrichCandidate(candidate)}
                            >
                              <Sparkles className="h-4 w-4 text-violet-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Enrich Data</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                   </div>
                </div>

                {/* SALARY - 1 column */}
                <div className="col-span-1 text-sm text-gray-700 truncate">
                  {candidate.current_salary ? (
                    <span className="font-medium">{candidate.current_salary}</span>
                  ) : (
                    <span className="text-black-400 text-xs">N/A</span>
                  )}
                </div>
                
                {/* LOCATION - 1 column */}
                <div className="col-span-1 text-sm text-gray-700 truncate">
                  {candidate.current_location ? (
                    <span>{candidate.current_location}</span>
                  ) : (
                    <span className="text-black-400 text-xs">N/A</span>
                  )}
                </div>

                {/* SUGGESTED TITLE - 2 columns */}
                <div className="col-span-2 text-sm text-gray-700">
                  {candidate.suggested_title ? (
                    <span className="text-black-500">{candidate.suggested_title}</span>
                  ) : (
                    <span className="text-black-300 text-xs">Not specified</span>
                  )}
                </div>

                {/* ADDED BY - 3 columns */}
                <div className="col-span-3">
                    {candidate.created_by ? (
                        <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-sm">
                              {`${candidate.created_by.first_name.charAt(0)}${candidate.created_by.last_name.charAt(0)}`.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font text-sm text-gray-800 truncate">
                                  {`${candidate.created_by.first_name} ${candidate.created_by.last_name}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {moment(candidate.created_at).format("DD MMM YYYY")} ({moment(candidate.created_at).fromNow()})
                                </p>
                            </div>
                        </div>
                    ) : (
                      <span className="text-sm text-gray-600">System</span>
                    )}
                </div>
              </div>
            );
          })}
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
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
          >
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
            <div className="stat-icon stat-icon-blue">
              <Users size={22} />
            </div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Added this Month</p>
              <h3 className="text-3xl font-bold">{addedThisMonth}</h3>
            </div>
            <div className="stat-icon stat-icon-green">
              <Calendar size={22} />
            </div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Added this Week</p>
              <h3 className="text-3xl font-bold">{addedThisWeek}</h3>
            </div>
            <div className="stat-icon stat-icon-yellow">
              <Briefcase size={22} />
            </div>
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Archived</p>
              <h3 className="text-3xl font-bold">0</h3>
            </div>
            <div className="stat-icon stat-icon-purple">
              <Users size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input 
          placeholder="Search by name or email or phone" 
          className="pl-10 h-10" 
          value={searchTerm} 
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
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
          candidateName={historyCandidate.candidate_name ?? ''} 
        />
      )}
      {enrichCandidate && (
        <EnrichDataDialog 
          isOpen={!!enrichCandidate} 
          onClose={() => setEnrichCandidate(null)} 
          candidate={enrichCandidate} 
        />
      )}
    </div>
  );
};

export default TalentPoolPage;