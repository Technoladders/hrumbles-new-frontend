import { useState, useEffect, useRef, forwardRef, useImperativeHandle  } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Filter, X, Zap, Mail, User } from "lucide-react";
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
  
  // --- ADDED: State for the new score filter ---
  const [scoreFilter, setScoreFilter] = useState("all");

  // --- ADDED: Ref to call the batch validate function in the child component ---
  const candidatesListRef = useRef<CandidatesListHandle>(null);
    const userRole = useSelector((state: any) => state.auth.role);
    const isEmployee = userRole === 'employee';

  useEffect(() => {
    if (candidates.length > 0) {
      setLocalCandidates(candidates);
    }
  }, [candidates]);
  
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
            <div className="flex-shrink-0 order-1 w-full sm:w-[180px] min-w-0 overflow-hidden">
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="group w-full rounded-full justify-start h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 hover:bg-purple-500 hover:text-white shadow-inner text-sm relative z-0">
                  <Filter size={16} className="text-gray-500 mr-2 flex-shrink-0 group-hover:text-white" />
                  <div className="truncate min-w-0">
                    <SelectValue placeholder="Categorize by Score" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted (&gt; 80)</SelectItem>
                  <SelectItem value="review">Review (= 80)</SelectItem>
                  <SelectItem value="not_shortlisted">Not Shortlisted (&lt; 80)</SelectItem>
                  <SelectItem value="not_validated">Not Validated</SelectItem>
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

            {/* Bulk Share Button (Conditional) */}
            {(scoreFilter === 'shortlisted' || scoreFilter === 'not_shortlisted') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={handleBulkShareClick} 
                    size="sm" 
                    className="flex-shrink-0 order-3 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500"
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
                  className="flex-shrink-0 order-4 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500"
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
                    className="flex-shrink-0 order-5 w-full sm:w-auto rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm hover:bg-purple-500"
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
        />

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-4xl p-0">
            <StatusSettings onStatusChange={fetchCandidates} />
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default CandidatesTabsSection;