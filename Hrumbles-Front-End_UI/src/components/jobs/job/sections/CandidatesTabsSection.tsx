import { useState, useEffect, useRef, forwardRef, useImperativeHandle  } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Filter, X, Zap, Mail, User, Search, Settings2 } from "lucide-react";
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
  const [candidateFilter, setCandidateFilter] = useState<"All" | "Yours">("All");
    const [searchTerm, setSearchTerm] = useState("");
  
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
        setLocalCandidates(data);
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

    const handleBulkShareClick = () => {
    if (candidatesListRef.current) {
      const emailType = scoreFilter === 'shortlisted' ? 'shortlist' : 'rejection';
      candidatesListRef.current.triggerBulkShare(emailType);
    }
  };

  return (
    <TooltipProvider>
      <div className="md:col-span-3">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
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
            {isEmployee && (
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
        <SelectItem value="Yours">Yours</SelectItem>
      </SelectContent>
    </Select>
  </div>
)}

<div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] w-full sm:w-auto">
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
              <Tooltip>
                <TooltipTrigger asChild>
          <Button 
  variant="outline" 
  onClick={handleBulkShareClick} 
  size="sm" 
  className="flex-shrink-0 order-5 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-[#7731E8] hover:text-white border-transparent transition-all duration-200"
>
                    <Mail className="w-4 h-4 mr-2" /> 
                    Send Mail to All
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="z-[70]">
                  <p className="max-w-48">Bulk email {scoreFilter === 'shortlisted' ? 'shortlist' : 'rejection'} to selected candidates</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Batch Validate Button */}
            <Tooltip>
              <TooltipTrigger asChild>
       <Button 
  onClick={handleBatchValidateClick} 
  size="sm" 
  variant="outline"
  className="flex-shrink-0 order-4 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-[#7731E8] hover:text-white border-transparent transition-all duration-200"
>
                  <Zap size={16} className="mr-2" />
                  Batch Validate All
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="z-[70]">
                <p className="max-w-48">Run AI validation on all candidates in this view</p>
              </TooltipContent>
            </Tooltip>

            {/* Status Settings Button (Conditional) */}
            {!ITECH_ORGANIZATION_ID.includes(organization_id) && organization_id !== ASCENDION_ORGANIZATION_ID && (
              <Tooltip>
                <TooltipTrigger asChild>
                <Button 
  onClick={() => setShowStatusDialog(true)} 
  size="sm" 
  variant="outline"
  className="flex-shrink-0 order-6 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-[#7731E8] hover:text-white border-transparent transition-all duration-200"
>
                    <Filter size={16} className="mr-2" />
                    Status Settings
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="z-[70]">
                  <p className="max-w-48">Configure job status workflow</p>
                </TooltipContent>
              </Tooltip>
            )}

             {/* NEW: Configuration Button - Add before Batch Validate or Status Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setShowConfigDialog(true)} 
                  size="sm" 
                  variant="outline"
                  className="flex-shrink-0 order-4 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-[#7731E8] hover:text-white border-transparent transition-all duration-200"
                >
                  <Settings2 size={16} className="mr-2" />
                  AI Config
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <p>Configure scoring weights</p>
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