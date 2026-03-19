import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo  } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Filter, X, Zap, Mail, User, Search, Settings2, Send } from "lucide-react";
import CandidatesList from "../CandidatesList";
import { Candidate } from "@/lib/types";
import StatusSettings from "@/pages/jobs/StatusSettings";
import { getCandidatesForJob } from "@/services/candidatesService";
import { fetchAllStatuses, MainStatus } from "@/services/statusService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnalysisConfigDialog } from "../AnalysisConfigDialog";
import { supabase } from "@/integrations/supabase/client";

// --- ADDED: Define a type for the ref to get autocompletion ---
// --- Update the ref handle interface ---
interface CandidatesListHandle {
  triggerBatchValidate: () => void;
  triggerBulkShare: (emailType: 'shortlist' | 'rejection') => void; // Add this new method
  triggerBulkInvite: () => void;
}

interface CandidatesTabsSectionProps {
  jobId: string;
  jobdescription: string;
  candidates: Candidate[];
  onAddCandidate: () => void;
}

const ITECH_ORGANIZATION_ID = ["1961d419-1272-4371-8dc7-63a4ec71be83", "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9"];
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

const CandidatesTabsSection = ({ 
  jobId, 
  jobdescription,
  candidates,
  onAddCandidate 
}: CandidatesTabsSectionProps) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
const [candidateFilter, setCandidateFilter] = useState<string>("All");
    const [searchTerm, setSearchTerm] = useState("");

    const [activeTab, setActiveTab] = useState("All Candidates");
const [mainStatuses, setMainStatuses] = useState<MainStatus[]>([]);

      const uniqueOwners = useMemo(() => {
    const owners = localCandidates
      .map(c => c.owner || c.appliedFrom)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(owners)).sort();
  }, [localCandidates]);
  const [bulkEmailType, setBulkEmailType] = useState<'shortlist' | 'rejection'>('shortlist');

  
  // --- ADDED: State for the new score filter ---
  const [scoreFilter, setScoreFilter] = useState("all");

  // --- ADDED: Ref to call the batch validate function in the child component ---
  const candidatesListRef = useRef<CandidatesListHandle>(null);
    const userRole = useSelector((state: any) => state.auth.role);
    const isEmployee = userRole === 'employee';

    // --- ADDED: State for the Analysis Config Dialog ---
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [analysisConfig, setAnalysisConfig] = useState<any>(null);

  useEffect(() => {
    if (candidates.length > 0) {
      setLocalCandidates(candidates);
    }
  }, [candidates]);

  useEffect(() => {
  const loadStatuses = async () => {
    const data = await fetchAllStatuses();
    setMainStatuses(data);
  };

  loadStatuses();
}, []);

  // Add this effect to fetch config
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('hr_jobs')
        .select('analysis_config')
        .eq('id', jobId)
        .single();
      
      if (data?.analysis_config) {
        setAnalysisConfig(data.analysis_config);
      }
    };
    fetchConfig();
  }, [jobId]);
  
const fetchCandidates = async () => {
    try {
      const data = await getCandidatesForJob(jobId);
      if (data) {
        // Map the data to resolve the owner from hr_employees
        const mappedData = data.map((candidate: any) => {
          const ownerName = candidate.hr_employees 
            ? `${candidate.hr_employees.first_name || ''} ${candidate.hr_employees.last_name || ''}`.trim()
            : candidate.appliedFrom || candidate.applied_from;
            
          return {
            ...candidate,
            owner: ownerName,
            appliedFrom: candidate.appliedFrom || candidate.applied_from
          };
        });
        
        setLocalCandidates(mappedData);
      }
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      toast.error(`Error fetching candidates: ${error.message}`);
    }
  };

  // --- ADDED: Handler for the Batch Validate button click ---
  const handleBatchValidateClick = () => {
    if (candidatesListRef.current) {
      candidatesListRef.current.triggerBatchValidate();
    }
  };

const handleBulkShareClick = (type?: 'shortlist' | 'rejection') => {
  if (candidatesListRef.current) {
    candidatesListRef.current.triggerBulkShare(type || bulkEmailType);
  }
};

  const handleBulkInviteClick = () => {
  if (candidatesListRef.current) {
    candidatesListRef.current.triggerBulkInvite();
  }
};

const getTabCount = (tabName: string) => {
  if (!localCandidates || localCandidates.length === 0) return 0;

  if (tabName === "All Candidates") {
    return localCandidates.filter(
      (c) => c.main_status?.name !== "New Applicants"
    ).length;
  }

  if (tabName === "Applied") {
    return localCandidates.filter(
      (c) => c.main_status?.name === "New Applicants"
    ).length;
  }

  return localCandidates.filter(
    (c) => c.main_status?.name === tabName
  ).length;
};

console.log("localCandidates", localCandidates);
  return (
    <TooltipProvider>
      <div className="md:col-span-3">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">

            {/* Candidate Tabs */}
<div className="flex-shrink-0">
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">

      {[{ id: "all-candidates", name: "All Candidates" }, ...mainStatuses].map((status) => (
       <TabsTrigger
  key={status.id}
  value={status.name}
  className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600
  data-[state=active]:bg-violet-600 data-[state=active]:text-white
  transition-all"
>
  <span className="flex items-center gap-2">
    {status.name}

    <span
      className={`text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center
      ${
        activeTab === status.name
          ? "bg-white/20 text-white"
          : "bg-primary/10 text-primary"
      }`}
    >
      {getTabCount(status.name)}
    </span>
  </span>
</TabsTrigger>
      ))}

    </TabsList>
  </Tabs>
</div>
            {/* Score Filter */}
            <div className="flex-shrink-0 order-3 w-full sm:w-[180px] min-w-0 overflow-hidden">
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="group w-full rounded-full justify-start h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-[#7731E8] hover:text-white shadow-inner text-sm relative z-0 transition-all duration-200">
                  <Filter size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                  <div className="truncate min-w-0">
                    <SelectValue placeholder="Categorize by Score" />
                  </div>
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all" className="focus:bg-[#7731E8] focus:text-white cursor-pointer transition-colors">
                    All Scores
                  </SelectItem>
                  <SelectItem value="shortlisted" className="focus:bg-[#7731E8] focus:text-white cursor-pointer transition-colors">
                    Shortlisted (&gt; 80)
                  </SelectItem>
                  <SelectItem value="review" className="focus:bg-[#7731E8] focus:text-white cursor-pointer transition-colors">
                    Review (= 80)
                  </SelectItem>
                  <SelectItem value="not_shortlisted" className="focus:bg-[#7731E8] focus:text-white cursor-pointer transition-colors">
                    Not Shortlisted (&lt; 80)
                  </SelectItem>
                  <SelectItem value="not_validated" className="focus:bg-[#7731E8] focus:text-white cursor-pointer transition-colors">
                    Not Validated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
           
  <div className="flex-shrink-0 order-2 w-full sm:w-[150px] min-w-0 overflow-hidden">
              <Select value={candidateFilter} onValueChange={setCandidateFilter}>
                <SelectTrigger className="group w-full rounded-full justify-start h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500 hover:text-white shadow-inner text-sm relative z-0">
                  <User size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                  <div className="truncate min-w-0">
                    <SelectValue placeholder="Filter Candidates" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {isEmployee ? (
                    <SelectItem value="Yours">Yours</SelectItem>
                  ) : (
                    uniqueOwners.map((owner, index) => (
                      <SelectItem key={index} value={owner}>
                        {owner}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>


<div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] max-w-[400px] w-full sm:w-auto">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
           <Input
  placeholder="Search by Name, Email, or Phone"
  className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm transition-all duration-200 focus-visible:ring-[#7731E8] hover:ring-1 hover:ring-[#7731E8]"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
            </div>

            {/* Bulk Share Button (Conditional) */}
            {(scoreFilter === 'shortlisted' || scoreFilter === 'not_shortlisted') && (
              <div className="flex items-center gap-2 flex-shrink-0 order-5">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        onClick={() => handleBulkShareClick('shortlist')}
        size="sm"
        className="
          rounded-full h-10 text-gray-600
          bg-gray-100 dark:bg-gray-800 shadow-inner text-sm
          hover:bg-emerald-600 hover:text-white hover:border-emerald-600
          border-transparent transition-all duration-200
          flex items-center gap-2
        "
      >
        <Mail className="w-4 h-4" />
        <span className="hidden sm:inline">Shortlist Mail</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>Send shortlist email to selected / visible candidates</p>
    </TooltipContent>
  </Tooltip>
 
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        onClick={() => handleBulkShareClick('rejection')}
        size="sm"
        className="
          rounded-full h-10 text-gray-600
          bg-gray-100 dark:bg-gray-800 shadow-inner text-sm
          hover:bg-rose-600 hover:text-white hover:border-rose-600
          border-transparent transition-all duration-200
          flex items-center gap-2
        "
      >
        <Mail className="w-4 h-4" />
        <span className="hidden sm:inline">Rejection Mail</span>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      <p>Send rejection email to selected / visible candidates</p>
    </TooltipContent>
  </Tooltip>
</div>
            )}

            {/* Bulk Invite Button */}
<Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={handleBulkInviteClick}
      className="
        flex items-center order-8 justify-center
        w-9 h-9 group
        rounded-xl
        bg-gradient-to-br from-purple-50 to-purple-100
        text-purple-700
        border border-purple-200
        shadow-sm
        hover:from-purple-100 hover:to-purple-200
        hover:shadow-md
        hover:scale-[1.05]
        active:scale-[0.96]
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
      "
    >
      <Send size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>Bulk Invite Selected Candidates</p>
  </TooltipContent>
</Tooltip>

            {/* Batch Validate Button */}
            <Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={handleBatchValidateClick}
      className="
      flex items-center order-6 justify-center
      w-9 h-9 group
      rounded-xl
      bg-gradient-to-br from-purple-50 to-purple-100
      text-purple-700
      border border-purple-200
      shadow-sm
      hover:from-purple-100 hover:to-purple-200
      hover:shadow-md
      hover:scale-[1.05]
      active:scale-[0.96]
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
      "
    >
      <Zap size={16} className="transition-transform duration-200 group-hover:rotate-12" />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>Batch Validate All Candidates</p>
  </TooltipContent>
</Tooltip>

            {/* Status Settings Button (Conditional) */}
            {/* {!ITECH_ORGANIZATION_ID.includes(organization_id) && organization_id !== ASCENDION_ORGANIZATION_ID && (
              <Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={() => setShowStatusDialog(true)}
      className="flex items-center order-8 justify-center w-9 h-9 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
    >
      <Filter size={16} />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>Status Settings</p>
  </TooltipContent>
</Tooltip>
            )} */}

             {/* NEW: Configuration Button - Add before Batch Validate or Status Settings */}
<Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={() => setShowConfigDialog(true)}
      className="
      group
      flex items-center order-7 justify-center
      w-9 h-9
      rounded-xl
      bg-gradient-to-br from-indigo-50 to-indigo-100
      text-indigo-700
      border border-indigo-200
      shadow-sm
      hover:from-indigo-100 hover:to-indigo-200
      hover:shadow-md
      hover:scale-[1.05]
      active:scale-[0.96]
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
      "
    >
      <Settings2
        size={16}
        className="transition-transform duration-200 group-hover:rotate-90"
      />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">
    <p>Configure AI Scoring Weights</p>
  </TooltipContent>
</Tooltip>
          </div>
        </div>

        <CandidatesList
          ref={candidatesListRef} // Attach the ref here
          jobId={jobId}
          jobdescription={jobdescription}
          onAddCandidate={onAddCandidate}
          onRefresh={fetchCandidates}
          scoreFilter={scoreFilter} // Pass the filter down
          candidateFilter={candidateFilter}
          searchTerm={searchTerm}
          activeTab={activeTab}
        />

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-4xl p-0">
            <StatusSettings onStatusChange={fetchCandidates} />
          </DialogContent>
        </Dialog>

        <AnalysisConfigDialog 
          open={showConfigDialog} 
          onOpenChange={setShowConfigDialog}
          jobId={jobId}
          currentConfig={analysisConfig}
          onSave={() => {
            // Optional: Refresh parent or toast
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default CandidatesTabsSection;