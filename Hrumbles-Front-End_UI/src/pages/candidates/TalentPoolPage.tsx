import { useState, useMemo, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { useDebounce } from 'use-debounce';

// Import UI components and icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, User, UserPlus, Search, History, ChevronsRight, Calendar,
  ChevronLeft, ChevronRight, Briefcase, ScanSearch, Mail, Phone, Copy, Sparkles,
  CheckCircle, GitCompareArrows, XCircle
} from 'lucide-react';

// Import your modals and custom components
import AddCandidateModal from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog from '@/components/candidates/AnalysisHistoryDialog';
import Loader from '@/components/ui/Loader';
import EnrichDataDialog from '@/components/candidates/talent-pool/EnrichDataDialog';
import CircularProgress from '@/components/jobs/ui/CircularProgress';
import JobMatchLoader from '@/components/candidates/talent-pool/JobMatchLoader';

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
  matching_skill_count?: number;
  matching_skills?: string[];
  total_candidate_count?: number;
  [key: string]: any;
}

// Full Job interface with real data fields
interface Job {
  id: string;
  title: string;
  skills: string[];
  primary_skills?: string[];
  description: string;
  experience: string;
  location: string[];
}

// Define the shape of the Redux state for useSelector
interface RootState {
  auth: {
    role: string;
    user: { id: string; organization_id: string } | null;
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
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get("limit") || "20", 10));

  const [loaderStartTime, setLoaderStartTime] = useState<number | null>(null);
  const [isDisplayingLoader, setDisplayingLoader] = useState<boolean>(false);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobPopoverOpen, setJobPopoverOpen] = useState(false);
  const [jobSearchTerm, setJobSearchTerm] = useState("");

  const [isAddModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [compareCandidate, setCompareCandidate] = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<TalentPoolCandidate | null>(null);
  const [enrichCandidate, setEnrichCandidate] = useState<TalentPoolCandidate | null>(null);

  const [copiedValue, setCopiedValue] = useState<'email' | 'phone' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (selectedJob) params.set("jobId", selectedJob.id);
    if (currentPage !== 1) params.set("page", currentPage.toString());
    if (itemsPerPage !== 20) params.set("limit", itemsPerPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, itemsPerPage, selectedJob, setSearchParams]);

  const handleCopyToClipboard = (text: string, type: 'email' | 'phone'): void => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedValue(type);
    setTimeout(() => { setCopiedValue(null); }, 1500);
  };



  // --- MAIN DATA FETCHING LOGIC (FINAL VERSION) ---
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates', role, user?.id, currentPage, itemsPerPage, debouncedSearchTerm, selectedJob?.id],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;

      if (selectedJob?.id) {
        const limit = isDisplayingLoader ? 1000 : itemsPerPage;
        const offset = isDisplayingLoader ? 0 : from;

        const { data: rpcData, error } = await supabase.rpc('match_candidates_to_job', {
          p_job_id: selectedJob.id,
          p_organization_id: organizationId,
          p_limit: limit,
          p_offset: offset,
        });

        if (error) throw new Error(error.message);

        // The database now does ALL the filtering. We trust its results directly.
        const candidates = (rpcData as TalentPoolCandidate[]) || [];
        const totalCount = candidates[0]?.total_candidate_count || 0;

        return { candidates, totalCount };
        
      } else {
        const to = from + itemsPerPage - 1;
        let query = supabase
          .from('hr_talent_pool')
          .select(`
            id, candidate_name, email, phone, suggested_title, created_at, current_salary,
            current_location, total_experience, current_company, current_designation,
            notice_period, highest_education, work_experience,
            created_by:hr_employees!hr_talent_pool_created_by_fkey (first_name, last_name)
          `, { count: 'exact' });
        
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        if (role === '' && user?.id) {
          query = query.eq('created_by', user.id);
        }

        if (debouncedSearchTerm) {
          const searchTermForQuery = `%${debouncedSearchTerm}%`;
          query = query.or(
            `candidate_name.ilike.${searchTermForQuery},email.ilike.${searchTermForQuery},phone.ilike.${searchTermForQuery}`
          );
        }

        query = query.range(from, to).order('created_at', { ascending: false });

        const { data: queryData, error, count } = await query;
        if (error) throw new Error(error.message);

        return { candidates: queryData as TalentPoolCandidate[], totalCount: count ?? 0 };
      }
    },
    enabled: !!user && !!organizationId,
  });

  // Query to fetch full jobs for the popover
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobsForMatching', organizationId, jobSearchTerm],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from('hr_jobs')
        .select('id, title, skills, primary_skills, description, experience, location')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (jobSearchTerm) {
        query = query.ilike('title', `%${jobSearchTerm}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw new Error(error.message);
      return data as Job[];
    },
    enabled: !!organizationId && isJobPopoverOpen,
  });

  const { data: totalPoolData } = useQuery({
      queryKey: ['totalTalentPoolCount', organizationId],
      queryFn: async () => {
          if (!organizationId) return { count: 0 };
          const { count, error } = await supabase
              .from('hr_talent_pool')
              .select('*', { count: 'exact', head: true });

          if (error) {
              console.error("Error fetching total pool count:", error);
              return { count: 0 };
          }
          return { count: count ?? 0 };
      },
      enabled: !!organizationId,
      staleTime: 60 * 60 * 1000,
  });

  const totalCandidatesInPool = totalPoolData?.count ?? 0;

  // --- CRASH-PROOF EXPECTED MATCH COUNT (FINAL VERSION) ---
  const { data: matchCountData } = useQuery({
    queryKey: ['jobMatchCount', selectedJob?.id, organizationId],
    queryFn: async () => {
      if (!selectedJob?.id || !organizationId) return 0;
      const { data: rpcData, error } = await supabase.rpc('match_candidates_to_job', {
        p_job_id: selectedJob.id,
        p_organization_id: organizationId,
        p_limit: 1,
        p_offset: 0,
      });
      if (error) throw new Error(error.message);

      return rpcData?.[0]?.total_candidate_count || 0;
    },
    enabled: !!selectedJob?.id && !!organizationId,
  });


  const expectedMatches = matchCountData ?? 0;

  const parsedExperience = useMemo(() => {
    if (!selectedJob?.experience) return { min: { years: 0, months: 0 }, max: { years: 0, months: 0 } };
    try {
      return JSON.parse(selectedJob.experience);
    } catch (e) {
      console.error('Failed to parse job experience:', e);
      return { min: { years: 0, months: 0 }, max: { years: 0, months: 0 } };
    }
  }, [selectedJob?.experience]);

  const jobDataForLoader = useMemo(() => ({
    title: selectedJob?.title || '',
    skills: selectedJob?.primary_skills || selectedJob?.skills || [],
    description: selectedJob?.description || '',
    experience: parsedExperience,
    location: selectedJob?.location || [],
  }), [selectedJob, parsedExperience]);

  const paginatedCandidates = data?.candidates ?? [];
  const totalCandidates = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCandidates / itemsPerPage);

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
      queryKey: ['talentPoolStats', role, user?.id, organizationId],
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
      enabled: !!user && !!organizationId,
  });

  const addedThisMonth = statsData?.addedThisMonth ?? 0;
  const addedThisWeek = statsData?.addedThisWeek ?? 0;

  const handleCandidateAdded = () => {
    refetch();
    setAddModalOpen(false);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedJob(null);
    setCurrentPage(1);
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setSearchTerm("");
    setCurrentPage(1);
    setJobPopoverOpen(false);
    setLoaderStartTime(Date.now());
     setDisplayingLoader(true); 
  };
  
  const clearJobFilter = () => {
    setSelectedJob(null);
    setCurrentPage(1);
    setLoaderStartTime(null);
  };

  const renderCandidateList = () => {
    if (isDisplayingLoader && selectedJob) {
      const primarySkills = selectedJob.primary_skills || selectedJob.skills || [];

      return (
        <JobMatchLoader 
          jobTitle={selectedJob.title} 
          totalCandidatesInPool={totalCandidatesInPool}
          expectedMatches={expectedMatches}
          jobData={jobDataForLoader}
          matchedCandidates={!isLoading ? paginatedCandidates : []}
          jobSkills={primarySkills}
          onComplete={() => {
            setDisplayingLoader(false);
            setLoaderStartTime(null);
            refetch();
          }}
        />
      );
    }

    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Skeleton loading state... */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
            <div className="col-span-3"><Skeleton className="h-4 w-16" /></div>
            <div className="col-span-1 text-center"><Skeleton className="h-4 w-12 mx-auto" /></div>
            <div className="col-span-2 text-center"><Skeleton className="h-4 w-12 mx-auto" /></div>
            <div className="col-span-1"><Skeleton className="h-4 w-10" /></div>
            <div className="col-span-1"><Skeleton className="h-4 w-12" /></div>
            <div className="col-span-1"><Skeleton className="h-4 w-20" /></div>
            <div className="col-span-3"><Skeleton className="h-4 w-16" /></div>
          </div>
          <div className="divide-y divide-gray-200/80">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="grid grid-cols-12 gap-3 items-center px-4 py-4">
                <div className="col-span-3"><Skeleton className="h-4 w-32" /></div>
                <div className="col-span-1 text-center"><Skeleton className="h-6 w-16 mx-auto" /></div>
                <div className="col-span-2 flex justify-center"><Skeleton className="h-7 w-40" /></div>
                <div className="col-span-1"><Skeleton className="h-4 w-12" /></div>
                <div className="col-span-1"><Skeleton className="h-4 w-16" /></div>
                <div className="col-span-1"><Skeleton className="h-4 w-24" /></div>
                <div className="col-span-3"><Skeleton className="h-8 w-32" /></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!isDisplayingLoader && paginatedCandidates.length === 0) {
      return (
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-2">No candidates found.</p>
          {selectedJob && <p className="text-sm text-gray-400">No candidates in your talent pool matched the primary skills for this job.</p>}
          {searchTerm && <p className="text-sm text-gray-400">Try adjusting your search criteria.</p>}
        </Card>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-200">
          <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate</div>
          {selectedJob && (
            <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Match</div>
          )}
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</div>
          <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary</div>
          <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</div>
          <div className={`${selectedJob ? 'col-span-1' : 'col-span-2'} text-xs font-semibold text-gray-500 uppercase tracking-wider`}>Suggested Title</div>
          <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added By</div>
        </div>

        <div className="divide-y divide-gray-200/80">
          {paginatedCandidates.map((candidate) => {
            const profileStatus = calculateProfileCompletion(candidate);
            const firstInitial = candidate.created_by?.first_name?.charAt(0) || '';
            const lastInitial = candidate.created_by?.last_name?.charAt(0) || '';
            const fullName = `${candidate.created_by?.first_name || ''} ${candidate.created_by?.last_name || ''}`.trim();
            const hasCreator = candidate.created_by && (firstInitial || lastInitial);
            return (
              <div key={candidate.id} className="grid grid-cols-12 gap-3 items-center px-4 py-4 transition-all duration-300 ease-in-out hover:bg-gray-50">
                
                <div className="col-span-3">
                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/talent-pool/${candidate.id}`} 
                      className="font text-gray-900 hover:text-purple-600 hover:underline text-sm truncate transition-colors"
                    >
                      {candidate.candidate_name || 'N/A'}
                    </Link>
                    
                    <Tooltip>
                      <TooltipTrigger>
                        <CircularProgress
                          percentage={profileStatus.percentage}
                          showEnrichButton={true}
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
                  </div>
                </div>

                {selectedJob && (
                  <div className="col-span-1 text-center">
                      <Tooltip side="top">
                        <TooltipTrigger>
                          <Badge variant="secondary" className="cursor-help bg-green-100 text-green-800 hover:bg-green-200">
                            {candidate.matching_skill_count} Skills
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="font-semibold text-xs mb-1">Matching Skills:</p>
                          <ul className="list-disc pl-4 text-xs space-y-0.5">
                            {candidate.matching_skills?.map(skill => <li key={skill}>{skill}</li>)}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                  </div>
                )}
                
                <div className="col-span-2 flex justify-center items-center">
                   <div className="flex items-center space-x-1 rounded-full bg-slate-50 p-1 shadow-sm border border-slate-200">
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-purple-50" onClick={() => handleCopyToClipboard(candidate.email, 'email')}><Mail className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent>{copiedValue === 'email' ? <p>Copied!</p> : <p>{candidate.email}</p>}</TooltipContent></Tooltip>
                      {candidate.phone && (<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-purple-50" onClick={() => handleCopyToClipboard(candidate.phone, 'phone')}><Phone className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent>{copiedValue === 'phone' ? <p>Copied!</p> : <p>{candidate.phone}</p>}</TooltipContent></Tooltip>)}
                      <div className="h-5 w-px bg-slate-300" />
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-50" onClick={() => setHistoryCandidate(candidate)}><History className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>View History</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-50" onClick={() => setCompareCandidate(candidate)}><ScanSearch className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Compare with Job</p></TooltipContent></Tooltip>
                      <div className="h-5 w-px bg-slate-300" />
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-violet-50" onClick={() => setEnrichCandidate(candidate)}><Sparkles className="h-4 w-4 text-violet-500" /></Button></TooltipTrigger><TooltipContent><p>Enrich Data</p></TooltipContent></Tooltip>
                   </div>
                </div>

                <div className="col-span-1 text-sm text-gray-700 truncate">{candidate.current_salary ? (<span className="font-medium">{candidate.current_salary}</span>) : (<span className="text-black-400 text-xs">N/A</span>)}</div>
                <div className="col-span-1 text-sm text-gray-700 truncate">{candidate.current_location ? (<span>{candidate.current_location}</span>) : (<span className="text-black-400 text-xs">N/A</span>)}</div>

                <div className={`${selectedJob ? 'col-span-1' : 'col-span-2'} text-sm text-gray-700`}>{candidate.suggested_title ? (<span className="text-black-500">{candidate.suggested_title}</span>) : (<span className="text-black-300 text-xs">Not specified</span>)}</div>

                <div className="col-span-3">
                    {hasCreator ? (
                        <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs shadow-sm">
                              {`${firstInitial}${lastInitial}`.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font text-sm text-gray-800 truncate">{fullName}</p>
                                <p className="text-xs text-gray-500">{moment(candidate.created_at).format("DD MMM YY")} ({moment(candidate.created_at).fromNow()})</p>
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
    if (isDisplayingLoader || totalCandidates === 0) return null;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2"><span className="text-sm text-gray-600">Show</span><Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select><span className="text-sm text-gray-600">per page</span></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium">Page {currentPage} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button></div>
        <span className="text-sm text-gray-600">Showing {Math.min(startIndex + 1, totalCandidates)} to {Math.min(startIndex + itemsPerPage, totalCandidates)} of {totalCandidates} candidates</span>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8 animate-fade-in p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 className="text-3xl font-bold mb-1">Talent Pool</h1><p className="text-gray-500">Search and manage your organization's candidates.</p></div>
          <Button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2"><UserPlus size={16} /><span>Add Candidate</span></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stat-card animate-slide-up" style={{ animationDelay: "0ms" }}><div className="flex items-start justify-between">{isLoading ? (<><div><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-8 w-16" /></div><Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-blue" /></>) : (<><div><p className="text-sm font-medium text-gray-500 mb-1">Total Candidates</p><h3 className="text-3xl font-bold">{totalCandidates}</h3></div><div className="stat-icon stat-icon-blue"><Users size={22} /></div></>)}</div></Card>
          <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}><div className="flex items-start justify-between">{isStatsLoading ? (<><div><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-8 w-16" /></div><Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-green" /></>) : (<><div><p className="text-sm font-medium text-gray-500 mb-1">Added this Month</p><h3 className="text-3xl font-bold">{addedThisMonth}</h3></div><div className="stat-icon stat-icon-green"><Calendar size={22} /></div></>)}</div></Card>
          <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}><div className="flex items-start justify-between">{isStatsLoading ? (<><div><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-8 w-16" /></div><Skeleton className="h-8 w-8 rounded-full stat-icon stat-icon-yellow" /></>) : (<><div><p className="text-sm font-medium text-gray-500 mb-1">Added this Week</p><h3 className="text-3xl font-bold">{addedThisWeek}</h3></div><div className="stat-icon stat-icon-yellow"><Briefcase size={22} /></div></>)}</div></Card>
          <Card className="stat-card animate-slide-up" style={{ animationDelay: "300ms" }}><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-gray-500 mb-1">Archived</p><h3 className="text-3xl font-bold">0</h3></div><div className="stat-icon stat-icon-purple"><Users size={22} /></div></div></Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-grow min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]"><Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><Input placeholder="Search by name, email or phone..." className="pl-12 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm placeholder:text-sm" value={searchTerm} onChange={handleSearchChange} disabled={!!selectedJob} /></div>
          <Popover open={isJobPopoverOpen} onOpenChange={setJobPopoverOpen}>
            <PopoverTrigger asChild><Button className="h-10 px-6 font-semibold text-white whitespace-nowrap bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200 flex items-center gap-2"><Sparkles size={18} /><span>Match with Job</span></Button></PopoverTrigger>
            <PopoverContent className="w-[360px] p-4 bg-white rounded-2xl shadow-2xl border-none mt-2" align="end"><Command className="bg-transparent"><CommandInput placeholder="Search for a job..." value={jobSearchTerm} onValueChange={setJobSearchTerm} className="w-full h-12 px-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 placeholder:text-purple-400 focus:ring-2 focus:ring-purple-400 focus:ring-offset-2" /><CommandList className="mt-4 max-h-[300px]"><CommandEmpty>{isLoadingJobs ? 'Loading...' : 'No jobs found.'}</CommandEmpty><CommandGroup>{jobs?.map((job) => (<CommandItem key={job.id} onSelect={() => handleJobSelect(job)} className="flex justify-between items-center p-3 my-1 text-base font-medium text-gray-800 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-purple-100 data-[selected=true]:bg-purple-600 data-[selected=true]:text-white aria-selected:bg-purple-600 aria-selected:text-white"><span>{job.title}</span><ChevronRight className="h-5 w-5 text-purple-500 opacity-0 transition-opacity aria-selected:opacity-100" /></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
          </Popover>
        </div>

        {selectedJob && (<div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg"><span className="text-sm font-medium text-purple-800">Showing candidates matching: <strong>{selectedJob.title}</strong></span><Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={clearJobFilter}><XCircle className="h-4 w-4 text-purple-600" /></Button></div>)}

        {renderCandidateList()}
        {renderPagination()}

        {isAddModalOpen && (<AddCandidateModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onCandidateAdded={handleCandidateAdded} />)}
        {compareCandidate && (<CompareWithJobDialog isOpen={!!compareCandidate} onClose={() => setCompareCandidate(null)} candidateId={compareCandidate.id} />)}
        {historyCandidate && (<AnalysisHistoryDialog isOpen={!!historyCandidate} onClose={() => setHistoryCandidate(null)} candidateId={historyCandidate.id} candidateName={historyCandidate.candidate_name ?? ''} />)}
        {enrichCandidate && (<EnrichDataDialog isOpen={!!enrichCandidate} onClose={() => setEnrichCandidate(null)} candidate={enrichCandidate} />)}
      </div>
    </TooltipProvider>
  );
};

export default TalentPoolPage;