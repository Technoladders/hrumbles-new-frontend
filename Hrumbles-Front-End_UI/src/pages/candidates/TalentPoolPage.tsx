import { useState, useMemo, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { useDebounce } from 'use-debounce'; // NEW: For debouncing search input

// Import UI components and icons (These remain the same)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserPlus, Search, History, ChevronsRight, Calendar,
  ChevronLeft, ChevronRight, Briefcase, ScanSearch, Mail, Phone, Copy, Sparkles,
  CheckCircle
} from 'lucide-react';

// Import your modals and custom components (These remain the same)
import AddCandidateModal from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog from '@/components/candidates/AnalysisHistoryDialog';
import Loader from '@/components/ui/Loader';
import EnrichDataDialog from '@/components/candidates/talent-pool/EnrichDataDialog';
import CircularProgress from '@/components/jobs/ui/CircularProgress';

// Define the main interface for a candidate (This remains the same)
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

// Define the shape of the Redux state for useSelector (This remains the same)
interface RootState {
  auth: {
    role: string;
    user: { id: string } | null;
  };
}

// Profile Completion Calculator Logic (This function remains unchanged)
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

  // NEW: Debounce the search term to avoid firing queries on every keystroke.
  // The query will only run 500ms after the user stops typing.
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isAddModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [compareCandidate, setCompareCandidate] = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<TalentPoolCandidate | null>(null);
  const [enrichCandidate, setEnrichCandidate] = useState<TalentPoolCandidate | null>(null);

  const [copiedValue, setCopiedValue] = useState<'email' | 'phone' | null>(null);

  // This useEffect for managing URL search params remains the same and is good practice.
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

 // --- REFACTORED: Main data fetching logic ---
 const { data, isLoading, refetch } = useQuery({
    // CHANGED: The queryKey now includes all server-side dependencies.
    // react-query will automatically refetch when any of these change.
    queryKey: ['talentPoolCandidates', role, user?.id, currentPage, itemsPerPage, debouncedSearchTerm],
    queryFn: async () => {
      // Calculate the range for pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('hr_talent_pool')
        // CHANGED: Request the total count of matching records from the server.
        .select(`
          id, candidate_name, email, phone, suggested_title, created_at, current_salary,
          current_location, total_experience, current_company, current_designation,
          notice_period, highest_education, work_experience,
          created_by:hr_employees!hr_talent_pool_created_by_fkey (first_name, last_name)
        `, { count: 'exact' });

      if (role === '' && user?.id) {
        query = query.eq('created_by', user.id);
      }

      // CHANGED: Apply search filter on the server using the debounced term.
      if (debouncedSearchTerm) {
        const searchTermForQuery = `%${debouncedSearchTerm}%`;
        query = query.or(
          `candidate_name.ilike.${searchTermForQuery},email.ilike.${searchTermForQuery},phone.ilike.${searchTermForQuery}`
        );
      }
      
      // CHANGED: Apply server-side pagination.
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data: queryData, error, count } = await query;

      if (error) throw new Error(error.message);
      
      // CHANGED: Return both the data for the current page and the total count.
      return { candidates: queryData as TalentPoolCandidate[], totalCount: count ?? 0 };
    },
    enabled: !!user,
  });

  // CHANGED: Get paginated data and total count from the query result.
  const paginatedCandidates = data?.candidates ?? [];
  const totalCandidates = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCandidates / itemsPerPage);


  // --- NEW: Separate, efficient query for dashboard statistics ---
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
      queryKey: ['talentPoolStats', role, user?.id],
      queryFn: async () => {
        const thisMonthStart = moment().startOf('month').toISOString();
        const thisWeekStart = moment().startOf('week').toISOString();

        let monthQuery = supabase
            .from('hr_talent_pool')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thisMonthStart);

        let weekQuery = supabase
            .from('hr_talent_pool')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thisWeekStart);

        if (role === '' && user?.id) {
          monthQuery = monthQuery.eq('created_by', user.id);
          weekQuery = weekQuery.eq('created_by', user.id);
        }

        const { count: monthCount, error: monthError } = await monthQuery;
        const { count: weekCount, error: weekError } = await weekQuery;
        
        if (monthError || weekError) console.error("Error fetching stats:", monthError || weekError);
        
        return {
            addedThisMonth: monthCount ?? 0,
            addedThisWeek: weekCount ?? 0
        };
      },
      enabled: !!user,
  });

  const addedThisMonth = statsData?.addedThisMonth ?? 0;
  const addedThisWeek = statsData?.addedThisWeek ?? 0;

  // REMOVED: Client-side filtering and memoization are no longer needed.
  // const addedThisMonth = useMemo(...);
  // const addedThisWeek = useMemo(...);
  // const filteredCandidates = useMemo(...);

  const handleCandidateAdded = () => {
    refetch(); // Refetch the current page and stats
    setAddModalOpen(false);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1); // Reset to page 1 when changing page size
  };

  const renderCandidateList = () => {
    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* FIXED HEADER */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
            <div className="col-span-3">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2 text-center">
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
            <div className="col-span-1">
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="col-span-1">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          <div className="divide-y divide-gray-200/80">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center px-4 py-4">
                {/* CANDIDATE NAME & PROFILE STATUS - 3 columns */}
                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
                
                {/* ACTIONS - 2 columns */}
                <div className="col-span-2 flex justify-center items-center">
                  <div className="flex items-center space-x-1 rounded-full bg-slate-50 p-1 shadow-sm border border-slate-200">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className="h-7 w-7 rounded-full" />
                    ))}
                  </div>
                </div>

                {/* SALARY - 1 column */}
                <div className="col-span-1">
                  <Skeleton className="h-4 w-12" />
                </div>
                
                {/* LOCATION - 1 column */}
                <div className="col-span-1">
                  <Skeleton className="h-4 w-16" />
                </div>

                {/* SUGGESTED TITLE - 2 columns */}
                <div className="col-span-2">
                  <Skeleton className="h-4 w-24" />
                </div>

                {/* ADDED BY - 3 columns */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    // CHANGED: Check against the data from the server
    if (paginatedCandidates.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-2">No candidates found.</p>
          {searchTerm && <p className="text-sm text-gray-400">Try adjusting your search criteria.</p>}
        </Card>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* FIXED HEADER (This JSX remains the same) */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
            <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</div>
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</div>
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</div>
            <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Title</div>
            <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added By</div>
        </div>

        <div className="divide-y divide-gray-200/80">
          {/* CHANGED: We now map directly over `paginatedCandidates` */}
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
        {/* Items per page selector (This JSX remains the same) */}
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
        
        {/* Pagination controls (This JSX remains the same, but the state is now server-driven) */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Showing results text (This JSX remains the same, but uses server-driven counts) */}
        <span className="text-sm text-gray-600">
          Showing {Math.min(startIndex + 1, totalCandidates)} to {Math.min(startIndex + itemsPerPage, totalCandidates)} of {totalCandidates} candidates
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Header section (This JSX remains the same) */}
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

      {/* Stats cards (This JSX remains the same but now uses the efficient stats query) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start justify-between">
            {isLoading ? (
              <>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-blue" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Candidates</p>
                  <h3 className="text-3xl font-bold">{totalCandidates}</h3>
                </div>
                <div className="stat-icon stat-icon-blue">
                  <Users size={22} />
                </div>
              </>
            )}
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start justify-between">
            {isStatsLoading ? (
              <>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-green" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Added this Month</p>
                  <h3 className="text-3xl font-bold">{addedThisMonth}</h3>
                </div>
                <div className="stat-icon stat-icon-green">
                  <Calendar size={22} />
                </div>
              </>
            )}
          </div>
        </Card>
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between">
            {isStatsLoading ? (
              <>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-yellow" />
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Added this Week</p>
                  <h3 className="text-3xl font-bold">{addedThisWeek}</h3>
                </div>
                <div className="stat-icon stat-icon-yellow">
                  <Briefcase size={22} />
                </div>
              </>
            )}
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input 
          placeholder="Search by name or email or phone" 
          className="pl-10 h-10" 
          value={searchTerm} 
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // CHANGED: Reset to page 1 on every new search.
          }}
        />
      </div>

      {renderCandidateList()}
      {/* CHANGED: Conditionally render pagination only if there are candidates */}
      {totalCandidates > 0 && renderPagination()}

      {/* All modals remain exactly the same */}
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