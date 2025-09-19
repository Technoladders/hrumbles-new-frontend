import { useState, useEffect, useRef, forwardRef, useImperativeHandle  } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Filter, X, Zap, Mail } from "lucide-react";
import CandidatesList from "../CandidatesList";
import { Candidate } from "@/lib/types";
import StatusSettings from "@/pages/jobs/StatusSettings";
import { getCandidatesForJob } from "@/services/candidatesService";
import { fetchAllStatuses, MainStatus } from "@/services/statusService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // --- ADDED: State for the new score filter ---
  const [scoreFilter, setScoreFilter] = useState("all");

  // --- ADDED: Ref to call the batch validate function in the child component ---
  const candidatesListRef = useRef<CandidatesListHandle>(null);

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
    <div className="md:col-span-3">
      <div className="flex items-center justify-end mb-4 gap-4">
        {/* --- ADDED: Score filter dropdown --- */}
        <div className="flex items-center gap-2">
           <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categorize by Score" />
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

        <div className="flex items-center gap-2">

           {(scoreFilter === 'shortlisted' || scoreFilter === 'not_shortlisted') && (
            <Button onClick={handleBulkShareClick} size="sm">
              <Mail size={16} className="mr-2" />
              Send Mail to All
            </Button>
          )}
          {/* --- ADDED: Batch Validate button --- */}
          <Button onClick={handleBatchValidateClick} size="sm" variant="outline">
            <Zap size={16} className="mr-2" />
            Batch Validate All
          </Button>

          {!ITECH_ORGANIZATION_ID.includes(organization_id) && organization_id !== ASCENDION_ORGANIZATION_ID && (
            <Button onClick={() => setShowStatusDialog(true)} size="sm">
              Status Settings
            </Button>
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
      />
  
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-4xl p-0">
          <StatusSettings onStatusChange={fetchCandidates} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidatesTabsSection;