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
import { getCandidatesByJobId } from "@/services/candidateService";

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
   const [localCandidates, setLocalCandidates] = useState<Candidate[]>(candidates);
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
    setLocalCandidates(candidates);
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
      // Use getCandidatesByJobId to ensure main_status is joined
      const data = await getCandidatesByJobId(jobId);
      if (data) {
        setLocalCandidates(data);
      }
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
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

    // "All Candidates" usually represents the active pipeline (excluding entry-level 'Applied'/'New Applicants')
    if (tabName === "All Candidates") {
      return localCandidates.filter(
        (c) => c.main_status?.name !== "New Applicants" && c.main_status?.name !== "Applied"
      ).length;
    }

    // "Applied" is often the UI label for the "New Applicants" status from the DB
    if (tabName === "Applied") {
      return localCandidates.filter(
        (c) => c.main_status?.name === "New Applicants" || c.main_status?.name === "Applied"
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
        
        {/* 🔥 SINGLE ROW TOOLBAR */}
        <div className="flex flex-nowrap items-center gap-2 w-full mb-4 overflow-x-auto">

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner">

              {[{ id: "all-candidates", name: "All Candidates" }, ...mainStatuses].map((status) => (
                <TabsTrigger
                  key={status.id}
                  value={status.name}
                  className="
                    px-2 py-1 rounded-full text-xs font-medium text-gray-600
                    data-[state=active]:bg-violet-600 data-[state=active]:text-white
                  "
                >
                  <span className="flex items-center gap-1">
                    {status.name}

                    <span
                      className={`text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center
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

          {/* 🔍 Search */}
          <div className="relative w-[180px] flex-shrink-0">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <Input
              placeholder="Search name, email & phone"
              className="pl-7 h-8 text-xs rounded-full bg-gray-100 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 🎯 Score Filter (ICON) */}
<Select value={scoreFilter} onValueChange={setScoreFilter}>
  <SelectTrigger
    className="
      group
      flex items-center justify-center
      w-8 h-8 p-0
      rounded-xl
      bg-gradient-to-br from-purple-50 to-purple-100
      text-purple-700
      border border-purple-200
      shadow-sm
      hover:from-purple-100 hover:to-purple-200
      hover:shadow-md hover:scale-[1.05]
      active:scale-[0.96]
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
      [&>svg:last-child]:hidden
    "
  >
    <Filter size={14} className="group-hover:rotate-6 transition-transform" />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="all">All Scores</SelectItem>
    <SelectItem value="shortlisted">Shortlisted (&gt; 80)</SelectItem>
    <SelectItem value="review">Review (= 80)</SelectItem>
    <SelectItem value="not_shortlisted">Not Shortlisted (&lt; 80)</SelectItem>
    <SelectItem value="not_validated">Not Validated</SelectItem>
  </SelectContent>
</Select>

          {/* 👤 Candidate Filter (ICON) */}
<Select value={candidateFilter} onValueChange={setCandidateFilter}>
  <SelectTrigger
    className="
      group
      flex items-center justify-center
      w-8 h-8 p-0
      rounded-xl
      bg-gradient-to-br from-indigo-50 to-indigo-100
      text-indigo-700
      border border-indigo-200
      shadow-sm
      hover:from-indigo-100 hover:to-indigo-200
      hover:shadow-md hover:scale-[1.05]
      active:scale-[0.96]
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
      [&>svg:last-child]:hidden
    "
  >
    <User size={14} className="group-hover:scale-110 transition-transform" />
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

          {/* 📩 Bulk Actions */}
          {(scoreFilter === 'shortlisted' || scoreFilter === 'not_shortlisted') && (
            <div className="flex items-center gap-1">

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkShareClick('shortlist')}
                    size="sm"
                    className="
                      rounded-full h-8 px-2 text-xs
                      bg-gray-100 hover:bg-emerald-600 hover:text-white
                      flex items-center gap-1
                    "
                  >
                    <Mail className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Shortlist Mail</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkShareClick('rejection')}
                    size="sm"
                    className="
                      rounded-full h-8 px-2 text-xs
                      bg-gray-100 hover:bg-rose-600 hover:text-white
                      flex items-center gap-1
                    "
                  >
                    <Mail className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rejection Mail</TooltipContent>
              </Tooltip>

            </div>
          )}

          {/* 🚀 Bulk Invite */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleBulkInviteClick}
                className="
                  flex items-center justify-center
                  w-8 h-8 rounded-lg
                  bg-purple-100 text-purple-700
                  hover:scale-105 transition
                "
              >
                <Send size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Bulk Invite</TooltipContent>
          </Tooltip>

          {/* ⚡ Batch Validate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleBatchValidateClick}
                className="
                  flex items-center justify-center
                  w-8 h-8 rounded-lg
                  bg-purple-100 text-purple-700
                  hover:scale-105 transition
                "
              >
                <Zap size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Batch Validate</TooltipContent>
          </Tooltip>

          {/* ⚙️ Config */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowConfigDialog(true)}
                className="
                  flex items-center justify-center
                  w-8 h-8 rounded-lg
                  bg-indigo-100 text-indigo-700
                  hover:scale-105 transition
                "
              >
                <Settings2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>AI Config</TooltipContent>
          </Tooltip>

        </div>
      </div>

      <CandidatesList
        ref={candidatesListRef}
        jobId={jobId}
        jobdescription={jobdescription}
        onAddCandidate={onAddCandidate}
        onRefresh={fetchCandidates}
        scoreFilter={scoreFilter}
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
      />
    </div>
  </TooltipProvider>
);
};

export default CandidatesTabsSection;