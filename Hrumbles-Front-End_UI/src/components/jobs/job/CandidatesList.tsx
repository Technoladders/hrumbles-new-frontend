

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo  } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { getCandidatesByJobId } from "@/services/candidateService";
import { Candidate, CandidateStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/jobs/ui/table";
import {
   Tooltip ,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";
import { StatusSelector } from "./StatusSelector";
import { TaskupStatusSelector } from "./TaskupStatusSelector";
import { ItechStatusSelector } from "./ItechStatusSelector";
import ValidateResumeButton from "./candidate/ValidateResumeButton";
import StageProgress from "./candidate/StageProgress";
import EmptyState from "./candidate/EmptyState";
import { Pencil,Bot,Sparkles, UserSearch, Eye, Download, FileText, Phone, Calendar, User, ChevronLeft, ChevronRight, Copy, Check, Mail, MessageSquare, Notebook, Linkedin } from "lucide-react";

import { Button } from "@/components/ui/button";
import EditCandidateDrawer from "@/components/jobs/job/candidate/EditCandidateDrawer";
import { getJobById } from "@/services/jobService";
import { ProgressColumn } from "./ProgressColumn";
import { Candidates } from "./types/candidate.types";
import { getCandidatesForJob, createDummyCandidate } from "@/services/candidatesService";
import { updateCandidateStatus, fetchAllStatuses, updateClientSubmissionStatus } from "@/services/statusService";
import SummaryModal from "./SummaryModal";
import { supabase } from "@/integrations/supabase/client";
import { updateCandidateValidationStatus } from "@/services/candidateService";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsList1, TabsTrigger1 } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  Select1,
  SelectGroup2,
  SelectValue3,
  SelectTrigger4,
  SelectContent7,
  SelectLabel8,
  SelectItem9,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CandidateTimelineModal } from './CandidateTimelineModal';
import { ShareCandidateModal } from './ShareCandidateModal';

import moment from 'moment';
import { format, isValid } from 'date-fns';
import { getRoundNameFromResult } from "@/utils/statusTransitionHelper";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/jobs/ui/avatar";
import { motion } from "framer-motion";
import { TaskupActionModal, TaskupModalConfig } from './TaskupActionModal';

const VALIDATION_QUEUE_KEY = "validationQueue";


const getInitials = (name: string = "") => {
  if (!name) return "NA";
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};



interface CandidatesListProps {
  jobId: string;
  jobdescription: string;
  statusFilter?: string;
  statusFilters?: string[];
  onAddCandidate?: () => void;
  onRefresh: () => Promise<void>;
  isCareerPage?: boolean;
  scoreFilter?: string;
  candidateFilter?: "All" | "Yours";
   rejection_reason?: string; 
}

interface HiddenContactCellProps {
  email?: string;
  phone?: string;
  candidateId: string;
}


const CandidatesList = forwardRef((props: CandidatesListProps, ref) => {
  const queryClient = useQueryClient();
  const {
    jobId,
    statusFilter,
    statusFilters = [],
    onAddCandidate,
    jobdescription,
    onRefresh,
    scoreFilter = "all",
    candidateFilter = "All",
    isCareerPage = false
  } = props;
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';
    // ADD NEW STATE FOR THE TASKUP MODAL
  const [isTaskupActionModalOpen, setIsTaskupActionModalOpen] = useState(false);
  const [taskupModalConfig, setTaskupModalConfig] = useState<TaskupModalConfig | null>(null);

  const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];
  const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";
  const TASKUP_ORGANIZATION_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";


   const getInitials = (name: string = "") => {
    if (!name) return "NA";
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

const OwnerAvatarCell = ({ 
  ownerName, 
  createdAt, 
  isEmployee, 
  currentUserName 
}: { 
  ownerName: string, 
  createdAt: string,
  isEmployee: boolean,
  currentUserName: string
}) => {
  if (!ownerName) {
    return <TableCell><span className="text-gray-400 text-sm">N/A</span></TableCell>;
  }

  const displayName = isEmployee 
    ? (ownerName === currentUserName ? ownerName : "Others") 
    : ownerName;

  const initials = getInitials(displayName);
  const isOwnCandidate = isEmployee && ownerName === currentUserName;

  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* {isOwnCandidate && (
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block" title="You added this candidate"></span>
        )} */}
        
        {/* Display owner name and date in a column layout */}
        {/* <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{ownerName}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {moment(createdAt).format("DD MMM YYYY")} ({moment(createdAt).fromNow()})
          </span>
        </div> */}
      </div>
    </TableCell>
  );
};

    // ADDED: State for dynamic tabs
  const [mainStatuses, setMainStatuses] = useState<MainStatus[]>([]);
  const [areStatusesLoading, setAreStatusesLoading] = useState(true);
   const [validatingIds, setValidatingIds] = useState<string[]>([]);

console.log('mainStatuses', mainStatuses)

  const { data: candidatesData = [], isLoading, refetch } = useQuery({
    queryKey: ["job-candidates", jobId],
    queryFn: () => getCandidatesByJobId(jobId),
  });

  console.log('candidatesData', candidatesData)


  const { data: appliedCandidates = [] } = useQuery({
    queryKey: ["applied-candidates", jobId],
    queryFn: () => getCandidatesByJobId(jobId, "Applied"),
  });

  const formatINR = (value: string): string => {
    if (!value) return '';
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    // Format with INR-style commas (e.g., 40,00,000)
    const chars = numericValue.split('').reverse();
    let formatted = [];
    for (let i = 0; i < chars.length; i++) {
      if (i === 3) formatted.push(',');
      if (i > 3 && (i - 3) % 2 === 0) formatted.push(',');
      formatted.push(chars[i]);
    }
    return formatted.reverse().join('');
  };



  const [activeTab, setActiveTab] = useState("All Candidates");
  const [analysisData, setAnalysisData] = useState<{
    overall_score: number;
    summary: string;
    top_skills: string[];
    missing_or_weak_areas: string[];
    report_url?: string | null;
    candidate_name?: string | null;
  } | null>(null);
  const [candidateAnalysisData, setCandidateAnalysisData] = useState<{ [key: string]: any }>({});
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [analysisDataAvailable, setAnalysisDataAvailable] = useState<{
    [key: string]: boolean;
  }>({});

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDrawerCandidate, setSelectedDrawerCandidate] = useState<Candidate | null>(null);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showInterviewFeedbackModal, setShowInterviewFeedbackModal] = useState(false);
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [showActualCtcModal, setShowActualCtcModal] = useState(false); 
  const [submissionDate, setSubmissionDate] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("Virtual");
  const [interviewType, setInterviewType] = useState("Technical");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [interviewResult, setInterviewResult] = useState("selected");
  const [ctc, setCtc] = useState("");
  const [actualCtc, setActualCtc] = useState<string>('');
  const [currencyType, setCurrencyType] = useState("INR");
  const [budgetType, setBudgetType] = useState("LPA");
  const [joiningDate, setJoiningDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState("internal");
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
  const [currentSubStatusId, setCurrentSubStatusId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<string | null>(null);
  const [needsReschedule, setNeedsReschedule] = useState(false);


  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
const [selectedCandidateForTimeline, setSelectedCandidateForTimeline] = useState<Candidate | null>(null);

  const [showOfferJoiningModal, setShowOfferJoiningModal] = useState(false);  
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    candidate: Candidate;
    jobTitle: string;
    emailType: 'shortlist' | 'rejection' | 'generic';
    ownerName: string;
  } | null>(null);
  const [isFetchingOwner, setIsFetchingOwner] = useState<string | null>(null);

    const handleSelectCandidate = (candidateId: string, isSelected: boolean) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(candidateId);
      } else {
        newSet.delete(candidateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedCandidates(new Set(paginatedCandidates.map(c => c.id)));
    } else {
      setSelectedCandidates(new Set());
    }
  };
  

  // Create a handler function to open the modal
const handleViewTimeline = (candidate: Candidate) => {
  setSelectedCandidateForTimeline(candidate);
  setIsTimelineModalOpen(true);
};


const [currentSubStatus, setCurrentSubStatus] = useState<{ id: string; name: string; parentId?: string | null } | null>(null);
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Budget type options
  const budgetTypes = ["LPA", "Monthly", "Hourly"];

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // New state to track visibility of contact details
  const [visibleContacts, setVisibleContacts] = useState<{
    [key: string]: { email: boolean; phone: boolean };
  }>({});



  const {
    data: job,
    isLoading: jobLoading,
    refetch: refetchJob,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobById(jobId || ""),
    enabled: !!jobId,
  });


    // Inside CandidatesList.tsx (or a shared constants file)
const INTERVIEW_MAIN_STATUS_ID = "f72e13f8-7825-4793-85e0-e31d669f8097";
const INTERVIEW_SCHEDULED_SUB_STATUS_IDS = ["4ab0c42a-4748-4808-8f29-e57cb401bde5", "a8eed1eb-f903-4bbf-a91b-e347a0f7c43f", "1de35d8a-c07f-4c1d-b185-12379f558286", "0cc92be8-c8f1-47c6-a38d-3ca04eca6bb8", "48e060dc-5884-47e5-85dd-d717d4debe40"];
const INTERVIEW_RESCHEDULED_SUB_STATUS_IDS = ["00601f51-90ec-4d75-8ced-3225fed31643", "9ef38a36-cffa-4286-9826-bc7d736a04ce", "2c38a0fb-8b56-47bf-8c7e-e4bd19b68fdf", "d2aef2b3-89b4-4845-84f0-777b6adf9018", "e569facd-7fd0-48b9-86cd-30062c80260b"];
const INTERVIEW_OUTCOME_SUB_STATUS_IDS = ["1930ab52-4bb4-46a2-a9d1-887629954868", "e5615fa5-f60c-4312-9f6b-4ed543541520", "258741d9-cdb1-44fe-8ae9-ed5e9eed9e27", "0111b1b9-23c9-4be1-8ad4-322ccad6ccf0", "11281dd5-5f33-4d5c-831d-2488a5d3c96e", "31346b5c-1ff4-4842-aab4-645b36b6197a", "1ce3a781-09c7-4b3f-9a58-e4c6cd02721a", "4694aeff-567b-4007-928e-b3fefe558daf", "5b59c8cb-9a6a-43b8-a3cd-8f867c0b30a2", "368aa85f-dd4a-45b5-9266-48898704839b"];



// Helper function for formatting time (from AllCandidatesTab.tsx)
const formatTime = (time?: string | null) => {
  if (!time || typeof time !== 'string') return '';
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
    return format(date, 'h:mm a');
  } catch {
    return time;
  }
};

const formatDate = (date: string) => isValid(new Date(date)) ? format(new Date(date), 'MMM d, yyyy') : 'N/A';

interface InterviewDetailsCellProps {
  candidate: Candidate;
}

const InterviewDetailsCell: React.FC<InterviewDetailsCellProps> = ({ candidate }) => {
  const isScheduled = candidate.main_status_id === INTERVIEW_MAIN_STATUS_ID && candidate.sub_status_id && (INTERVIEW_SCHEDULED_SUB_STATUS_IDS.includes(candidate.sub_status_id) || INTERVIEW_RESCHEDULED_SUB_STATUS_IDS.includes(candidate.sub_status_id));
  const isOutcome = candidate.main_status_id === INTERVIEW_MAIN_STATUS_ID && candidate.sub_status_id && INTERVIEW_OUTCOME_SUB_STATUS_IDS.includes(candidate.sub_status_id);

  if (isScheduled && candidate.interview_date) {
    return (
      <div className="flex flex-col">
        <div className="text-sm text-gray-700 flex items-center gap-1.5 whitespace-nowrap">
          <Calendar size={14} className="flex-shrink-0" />
          <span>{formatDate(candidate.interview_date)}</span>
        </div>
        {candidate.interview_time && (
          <div className="text-sm text-gray-700 flex items-center gap-1.5 whitespace-nowrap mt-1">
            <Clock size={14} className="flex-shrink-0" />
            <span>{formatTime(candidate.interview_time)}</span>
          </div>
        )}
      </div>
    );
  }

  if (isOutcome && candidate.interview_feedback) {
    return (
      <TooltipProvider>
        <ShadTooltip>
          <TooltipTrigger asChild>
            <div className="text-sm text-gray-700 flex items-start gap-1.5 cursor-help">
              <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
              <p className="truncate max-w-[150px]">
                {candidate.interview_feedback.length > 25 ? `${candidate.interview_feedback.slice(0, 25)}...` : candidate.interview_feedback}
              </p>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{candidate.interview_feedback}</p>
          </TooltipContent>
        </ShadTooltip>
      </TooltipProvider>
    );
  }

  return <span className="text-muted-foreground">-</span>;
};



    // Initialize dialog fields when opening
    useEffect(() => {
      if (showActualCtcModal && job?.clientDetails?.clientBudget) {
        const clientBudget = job.clientDetails.clientBudget;
        const currentCurrency = currencies.find((c) => clientBudget.startsWith(c.symbol)) || currencies[0];
        const budgetParts = clientBudget.replace(currentCurrency.symbol, "").trim().split(" ");
        const amount = budgetParts[0] || "";
        const type = budgetParts[1] || "LPA";
  
        setCurrencyType(currentCurrency.value);
        setBudgetType(type);
        setActualCtc(amount);
        setSubmissionDate("");
      }
    }, [showActualCtcModal, job]);

    // Add useEffect to fetch existing CTC data for "Joined" and reset dialog state (around line 330, after other useEffect)
    useEffect(() => {
      if (showJoiningModal && currentSubStatusId && currentCandidateId && jobId) {
        // Reset state
        setCtc("");
        setJoiningDate("");
        setCurrencyType("INR");
        setBudgetType("LPA");
    
        // Fetch job's client budget as default
        if (job?.clientDetails?.clientBudget) {
          const clientBudget = job.clientDetails.clientBudget;
          const currentCurrency = currencies.find((c) => clientBudget.startsWith(c.symbol)) || currencies[0];
          const budgetParts = clientBudget.replace(currentCurrency.symbol, "").trim().split(" ");
          const amount = budgetParts[0] || "";
          const type = budgetParts[1] || "LPA";
    
          setCurrencyType(currentCurrency.value);
          setBudgetType(type);
          setCtc(amount);
        }
    
        // Fetch existing joining details for "Offer Issued" or "Joined" status
        if (currentSubStatus?.name === 'Offer Issued' || currentSubStatus?.name === 'Joined') {
          const fetchJoiningData = async () => {
            try {
              const { data, error } = await supabase
                .from('hr_candidate_joining_details')
                .select('final_salary, currency_type, budget_type, client_budget, joining_date')
                .eq('candidate_id', currentCandidateId)
                
                .maybeSingle();
    
              if (error && !error.message.includes('No rows found')) {
                console.error('Error fetching joining details:', error);
                return;
              }
    
              if (data) {
                setCtc(data.final_salary?.toString() || "");
                setCurrencyType(data.currency_type || "INR");
                setBudgetType(data.budget_type || "LPA");
                setJoiningDate(data.joining_date ? data.joining_date.split('T')[0] : "");
              }
            } catch (error) {
              console.error('Error fetching joining details:', error);
            }
          };
          fetchJoiningData();
        }
      }
    }, [showJoiningModal, currentCandidateId, currentSubStatusId, job, jobId, currentSubStatus]);


  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const recruitmentStages = ["New Applicants", "InReview", "Engaged", "Available", "Offered", "Hired"];

  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://62.72.51.159:5005";

    // ADDED: useEffect to fetch and set dynamic tabs
  useEffect(() => {
    const loadStatuses = async () => {
        try {
            setAreStatusesLoading(true);
            const data = await fetchAllStatuses();
           
            setMainStatuses(data);
        } catch (error) {
            console.error("Error loading statuses:", error);
            toast.error("Failed to load statuses");
        } finally {
            setAreStatusesLoading(false);
        }
    };
    loadStatuses();
  }, []);

  

useEffect(() => {
  const checkAnalysisData = async () => {
    if (!jobId) return;
    
    const { data, error } = await supabase
      .from("candidate_resume_analysis")
      // 1. Add report_url to the query
      .select("candidate_id, summary, overall_score, report_url") 
      .eq("job_id", jobId)
      .not("summary", "is", null);

    if (error) {
      console.error("Error checking analysis data:", error);
      return;
    }

    const availableData: { [key: string]: boolean } = {};
    const analysisDataTemp: { [key: string]: any } = {};
    data.forEach((item) => {
      availableData[item.candidate_id] = true;
      // 2. Add the report_url to the data we store
      analysisDataTemp[item.candidate_id] = { 
        overall_score: item.overall_score,
        report_url: item.report_url 
      };
    });

    setAnalysisDataAvailable(availableData);
    setCandidateAnalysisData(prevData => {
      const hasNewData = Object.keys(analysisDataTemp).some(key => 
        !prevData[key] || 
        prevData[key].overall_score !== analysisDataTemp[key].overall_score ||
        prevData[key].report_url !== analysisDataTemp[key].report_url
      );
      if (hasNewData) {
        return { ...prevData, ...analysisDataTemp };
      }
      return prevData;
    });
  };

  checkAnalysisData();
}, [candidatesData, jobId]); 

 const fetchAnalysisData = async (candidateId: string) => {
  try {
    const { data, error } = await supabase
      .from("candidate_resume_analysis")
      .select("overall_score, summary, top_skills, missing_or_weak_areas, candidate_name, report_url")
      .eq("job_id", jobId)
      .eq("candidate_id", candidateId)
      .single();

    if (error) throw error;

    // Console log the fetched data
    console.log(`fetchAnalysisData for candidate ${candidateId}:`, data);

    setAnalysisData({
      overall_score: data.overall_score || 0,
      summary: data.summary || "",
      top_skills: data.top_skills || [],
      missing_or_weak_areas: data.missing_or_weak_areas || [],
      report_url: data.report_url ?? null,
      candidate_name: data.candidate_name ?? null,
    });
    setCandidateAnalysisData((prev) => ({
      ...prev,
      [candidateId]: {
        overall_score: data.overall_score || 0,
        summary: data.summary || "",
        top_skills: data.top_skills || [],
        missing_or_weak_areas: data.missing_or_weak_areas || [],
        report_url: data.report_url ?? null,
        candidate_name: data.candidate_name ?? null,
      },
    }));
    setAnalysisDataAvailable((prev) => ({
      ...prev,
      [candidateId]: true,
    }));
    setIsSummaryModalOpen(true);
  } catch (error) {
    console.error("Error fetching analysis data:", error);
    // Console log the error details
    console.log(`fetchAnalysisData error for candidate ${candidateId}:`, error);
    toast.error("Failed to fetch candidate analysis.");
    setAnalysisDataAvailable((prev) => ({
      ...prev,
      [candidateId]: false,
    }));
  }
};

  // Static USD to INR conversion rate
const USD_TO_INR_RATE = 84;



// Parse salary and return amount with budgetType
const parseSalary = (salary: string | number | undefined): { amount: number; budgetType: string } => {

  if (!salary) {

    return { amount: 0, budgetType: "LPA" };
  }
  let amount = 0;
  let currency = currencies[0]; // Default to INR
  let budgetType = "LPA";

  if (typeof salary === "string") {
    // Check if the string is a valid number (e.g., "2000000")
    if (!isNaN(parseFloat(salary)) && !salary.includes(" ")) {
      amount = parseFloat(salary);
   
    } else {
      // Handle formatted strings (e.g., "₹2000000 LPA")
      currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
     
      const parts = salary.replace(currency.symbol, "").trim().split(" ");
      amount = parseFloat(parts[0]) || 0;
      budgetType = parts[1] || "LPA";
    }
  } else {
    amount = salary;
  }

  let convertedAmount = amount;
  if (currency.value === "USD") {
    convertedAmount *= USD_TO_INR_RATE;
  }

  return { amount: convertedAmount, budgetType };
};

// Calculate profit based on budgetType period for Internal jobs
const calculateProfit = (
  candidate: any,
  job: any,
  client: any
): { profit: number | null; period: string } => {


  let salary = candidate.ctc || candidate.expected_salary || 0;
  let budget = candidate.accrual_ctc;
  let commissionValue = client?.commission_value || 0;


  const salaryParsed = parseSalary(salary);
  const budgetParsed = budget ? parseSalary(budget) : { amount: 0, budgetType: "LPA" };
  let salaryAmount = salaryParsed.amount;
  let budgetAmount = budgetParsed.amount;
  let profitPeriod = budgetParsed.budgetType; // Use accrual_ctc's budgetType for period


  if (job.jobType === "Internal") {
    // Skip profit calculation if accrual_ctc is missing
    if (budget == null || budget === "") {
      return { profit: null, period: profitPeriod };
    }

    // For Monthly or Hourly, convert to Monthly profit
    if (profitPeriod === "Monthly" || profitPeriod === "Hourly") {
      if (profitPeriod === "Hourly") {
        budgetAmount *= 160;
        profitPeriod = "Monthly";
      }
      salaryAmount /= 12;
    }
    // For LPA, both budget and salary are already in LPA, no conversion needed

    const profit = budgetAmount - salaryAmount;
    return { profit, period: profitPeriod };
  } else {
    // For External jobs, calculate profit using commission (yearly, as original)
    const effectiveCommissionType = client?.commission_type || (commissionValue ? "percentage" : null);

    // Salary is already in LPA, no conversion needed
    if (client?.currency === "USD" && client?.commission_type === "fixed") {
      commissionValue *= USD_TO_INR_RATE;
    }

    if (effectiveCommissionType === "percentage" && commissionValue) {
      const profit = (salaryAmount * commissionValue) / 100;
      return { profit, period: "LPA" };
    } else if (effectiveCommissionType === "fixed" && commissionValue) {
      return { profit: commissionValue, period: "LPA" };
    }
    return { profit: 0, period: "LPA" };
  }
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0, 
  }).format(amount);
};

// Fetch client data
const { data: clientData } = useQuery({
  queryKey: ["client", job?.clientOwner],
  queryFn: async () => {
    if (!job?.clientOwner) return null;
    const { data, error } = await supabase
      .from("hr_clients")
      .select("id, client_name, commission_value, commission_type, currency")
      .eq("client_name", job.clientOwner)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!job?.clientOwner,
});

   // --- ADD THIS NEW POLLING MECHANISM ---
  useEffect(() => {
    // If no candidates are currently being validated, do nothing.
    if (validatingIds.length === 0) {
      return;
    }

    // Start an interval that refreshes the data every 7 seconds.
    const intervalId = setInterval(() => {
      console.log("Polling for validation results...");
      onRefresh();
    }, 7000); // Poll every 7 seconds

    // This is the cleanup function. It runs when the component unmounts
    // or when the dependencies (validatingIds) change.
    return () => {
      clearInterval(intervalId); // Stop the interval
    };
  }, [validatingIds, onRefresh]); // Rerun this effect only if the queue or onRefresh changes.
  

const candidates = useMemo(() => {
    if (!candidatesData || candidatesData.length === 0) {
      return [];
    }

    // Check if any candidates in the validation queue have completed.
    const completedIds = new Set<string>();
    validatingIds.forEach(id => {
      const candidateInData = candidatesData.find(c => c.id === id);
      if (candidateInData && candidateInData.has_validated_resume) {
        completedIds.add(id);
      }
    });

    // If we found completed candidates, remove them from the queue.
    // We use a timeout to avoid a React warning about setting state during a render.
    if (completedIds.size > 0) {
      setTimeout(() => {
        setValidatingIds(prev => prev.filter(id => !completedIds.has(id)));
      }, 0);
    }

    // This transformation now happens only when the source data changes.
    return candidatesData.map((candidate) => {
      const profit = calculateProfit(candidate, job, clientData);
        return {
          id: candidate.id,
          name: candidate.name,
          experience: candidate.experience || "",
          matchScore: candidate.matchScore || 0,
          appliedDate: candidate.appliedDate,
          skills: candidate.skillRatings || candidate.skills || [],
          email: candidate.email,
          phone: candidate.phone,
          linkedin_url: candidate.linkedin_url, 
          resume: candidate.resumeUrl,
          appliedFrom: candidate.appliedFrom,
          currentSalary: candidate.currentSalary,
          expectedSalary: candidate.expectedSalary,
          location: candidate.location,
          metadata: candidate.metadata,
          skill_ratings: candidate.skillRatings,
          status: candidate.status || "New Applicant",
          currentStage: candidate.main_status?.name || "New Applicants",
          createdAt: candidate.created_at,
          hasValidatedResume: candidate.hasValidatedResume || false,
          notice_period: candidate.notice_period, 
          main_status: candidate.main_status,
          sub_status: candidate.sub_status,
          main_status_id: candidate.main_status_id,
          sub_status_id: candidate.sub_status_id,
          accrual_ctc: candidate.accrual_ctc,
          ctc: candidate.ctc,
          profit,
          interview_date: candidate.interview_date,
          interview_time: candidate.interview_time,
          interview_feedback: candidate.interview_feedback,
          joining_date: candidate.joining_date, 
    };
    });
  }, [candidatesData, job, clientData, validatingIds]);

  const setDefaultStatusForCandidate = async (candidateId: string) => {
    try {
      const statuses = await fetchAllStatuses();
      const newStatus = statuses.find(s => s.name === "New Applicant");
      if (newStatus?.subStatuses?.length) {
        const defaultSubStatus = newStatus.subStatuses.find(s => s.name === "New Applicant") || newStatus.subStatuses[0];
        
        await updateCandidateStatus(candidateId, defaultSubStatus.id, user?.id);
      }
    } catch (error) {
      console.error("Error setting default status:", error);
    }
  };

 // --- ADDED: Load validation queue from localStorage on initial render ---
  useEffect(() => {
    const storedQueue = localStorage.getItem(`${VALIDATION_QUEUE_KEY}_${jobId}`);
    if (storedQueue) {
      setValidatingIds(JSON.parse(storedQueue));
    }
  }, [jobId]);

  // --- ADDED: Save validation queue to localStorage whenever it changes ---
  useEffect(() => {
    if (validatingIds.length > 0) {
      localStorage.setItem(`${VALIDATION_QUEUE_KEY}_${jobId}`, JSON.stringify(validatingIds));
    } else {
      localStorage.removeItem(`${VALIDATION_QUEUE_KEY}_${jobId}`);
    }
  }, [validatingIds, jobId]);


// --- UPDATED handleStatusChange Function ---

  const handleStatusChange = async (value: string, candidate: Candidate) => {
    try {
      if (!value) {
        toast.error("Invalid status selected");
        return;
      }

      // This part is common: fetch statuses and set current state
      const statuses = await fetchAllStatuses();
      const subStatuses = statuses.flatMap(s => s.subStatuses || []);
      const newSubStatus = subStatuses.find(s => s.id === value);
      
      if (!newSubStatus) {
        toast.error("Status not found");
        return;
      }
      
      const oldSubStatusName = candidate.sub_status?.name;
      
      setCurrentCandidateId(candidate.id);
      setCurrentSubStatusId(value);
      setCurrentSubStatus({
        id: newSubStatus.id,
        name: newSubStatus.name,
        parentId: newSubStatus.parent_id,
      });

      const TASKUP_ORGANIZATION_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";

      // DYNAMICALLY HANDLE LOGIC BASED ON ORGANIZATION
    if (organizationId === TASKUP_ORGANIZATION_ID) {
        const { getRequiredInteractionType } = await import('@/utils/taskupStatusTransitionHelper');
        const interactionType = getRequiredInteractionType(oldSubStatusName, newSubStatus.name);

        let config: TaskupModalConfig | null = null;
        
        switch(interactionType) {
            case 'rejection-with-date':
                config = { title: newSubStatus.name, description: 'Please provide the date and a reason for this status change.', fields: ['date', 'reason'] };
                break;
            case 'date-only':
                config = { title: newSubStatus.name, description: 'Please provide the date for this action.', fields: ['date'] };
                break;
            case 'reason-only':
            case 'feedback-only':
                config = { title: newSubStatus.name, description: 'Please provide a reason or feedback.', fields: [interactionType === 'reason-only' ? 'reason' : 'feedback'] };
                break;
            case 'interview-schedule':
                 config = { title: `Schedule: ${newSubStatus.name}`, description: 'Please provide the interview date and time.', fields: ['datetime'] };
                 break;
            case 'billing':
                config = { title: newSubStatus.name, description: 'Please provide the date and reason for the pending status.', fields: ['date', 'billing_reason'] };
                break;
        }

        if (config) {
          setTaskupModalConfig(config);
          setIsTaskupActionModalOpen(true);
          return; // Stop execution to wait for modal submission
        }

      } else {
        // --- ORIGINAL LOGIC FOR ALL OTHER ORGANIZATIONS (Unaffected) ---
        const { getRequiredInteractionType, getInterviewRoundName, getRoundNameFromResult } = await import('@/utils/statusTransitionHelper');
        const interactionType = getRequiredInteractionType(oldSubStatusName, newSubStatus.name);
        
        if (interactionType === 'interview-schedule' || interactionType === 'reschedule') {
          const roundName = getInterviewRoundName(newSubStatus.name);
          setCurrentRound(roundName);
          setNeedsReschedule(interactionType === 'reschedule');
    
          const { data: interviews, error } = await supabase
            .from('hr_candidate_interviews')
            .select('*')
            .eq('candidate_id', candidate.id)
            .eq('interview_round', roundName)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (error) {
            console.error("Error fetching interview:", error);
            toast.error("Failed to load interview details");
            return;
          }
    
          if (interviews && interviews.length > 0) {
            const interview = interviews[0];
            setInterviewDate(interview.interview_date || '');
            setInterviewTime(interview.interview_time || '');
            setInterviewLocation(interview.location || 'Virtual');
            setInterviewType(interview.interview_type || 'Technical');
            setInterviewerName(interview.interviewers?.[0]?.name || '');
          } else {
            setInterviewDate('');
            setInterviewTime('');
            setInterviewLocation('Virtual');
            setInterviewType('Technical');
            setInterviewerName('');
          }
    
          setShowInterviewModal(true);
          return;
        }
        
        if (interactionType === 'interview-feedback') {
          const roundName = getRoundNameFromResult(newSubStatus.name);
          if (roundName) {
            setCurrentRound(roundName);
            setInterviewResult(newSubStatus.name.includes('Selected') ? 'selected' : 'rejected');
            setShowInterviewFeedbackModal(true);
            return;
          }
        }
        
        if (interactionType === 'joining') {
          setShowJoiningModal(true);
          return;
        }
    
        if (interactionType === 'actual-ctc') {
          setShowActualCtcModal(true);
          return;
        }
        
        if (interactionType === 'reject') {
          setShowRejectModal(true);
          return;
        }
      }

      // This is the default action if no modal is triggered. It works for both workflows.
      updateCandidateStatus(candidate.id, value, user?.id)
        .then(success => {
          if (success) {
            toast.success("Status updated successfully");
            onRefresh();
          } else {
            toast.error("Failed to update status");
          }
        })
        .catch(error => {
          console.error("Error updating status:", error);
          toast.error("Failed to update status");
        });

    } catch (error) {
      console.error("Error in handleStatusChange:", error);
      toast.error("An unexpected error occurred while changing status.");
    }
  };

 const handleTaskupActionSubmit = async (data: Record<string, any>) => {
    if (!currentCandidateId || !currentSubStatusId || !currentSubStatus) return;

    // Create a mutable object for additional data
    const additionalData = { ...data };

    // --- SPECIAL DATA MAPPING LOGIC ---
    // 1. If the new status is 'Submitted to Client', map the selected date to the 'submission_date' column.
    if (currentSubStatus.name === 'Submitted to Client') {
      additionalData.submission_date = data.action_date;
    }

    // 2. If the new status is 'Joined', map the selected date to the 'joining_date' column.
    if (currentSubStatus.name === 'Joined') {
      additionalData.joining_date = data.action_date;
    }
    
    // 3. For interviews, map date & time correctly
    if (data.interview_date || data.interview_time) {
        additionalData.interview_date = data.interview_date;
        additionalData.interview_time = data.interview_time;
        // Also add other relevant interview fields for consistency if needed
        additionalData.round = currentSubStatus.name;
    }
    // --- END OF SPECIAL LOGIC ---

    try {
      // Pass the enhanced 'additionalData' object to the update function
      const success = await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, additionalData);
      
      if (success) {
        toast.success("Status updated successfully with details.");
        onRefresh();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (error) {
      console.error("Error submitting Taskup action:", error);
      toast.error("Failed to save details.");
    } finally {
      setIsTaskupActionModalOpen(false);
      setTaskupModalConfig(null);
    }
  };


 // --- UPDATED handleValidateResume using Proxy for POST, Direct for GET ---
    const handleValidateResume = async (candidateId: string) => {
    if (validatingIds.includes(candidateId)) return;

    try {
      // Add to the loading queue to start the spinner and the polling.
      setValidatingIds(prev => [...prev, candidateId]);
      toast.info(`Validation has been queued for ${candidates.find(c => c.id === candidateId)?.name || 'candidate'}...`);

      // --- Call the backend to start the analysis ---
      const candidate = candidates.find((c) => c.id === candidateId);
      if (!candidate || !candidate.resume) throw new Error("Candidate or resume data missing.");
      
      const resumeUrlParts = candidate.resume.split("candidate_resumes/");
      const extractedResumeUrl = resumeUrlParts.length > 1 ? resumeUrlParts[1] : candidate.resume;
      
      const { data: jobData, error: jobError } = await supabase.from("hr_jobs").select("job_id").eq("id", jobId).single();
      if (jobError || !jobData) throw new Error("Invalid job configuration.");
      
      const jobTextId = jobData.job_id;
      const payload = { job_id: jobTextId, candidate_id: candidateId, resume_url: extractedResumeUrl, job_description: jobdescription, organization_id: organizationId, user_id: user.id };

      const backendUrl = 'https://dev.hrumbles.ai/api/validate-candidate';
      const response = await fetch(backendUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend Error: ${errorText.slice(0, 200)}`);
      }
      // We don't need to poll the backend task status anymore. We just poll for the final DB result.

    } catch (error: any) {
      console.error("Error starting validation:", error);
      toast.error(error.message || "Failed to start validation");
      // On failure to start, remove from the queue to stop the loader.
      setValidatingIds(prev => prev.filter(id => id !== candidateId));
    }
  };

// --- ADDED: Function to handle the batch validation process ---
  // --- ADDED: Function to handle the batch validation process ---
  const handleBatchValidate = async () => {
   
    const unvalidatedCandidates = paginatedCandidates.filter(c => !c.hasValidatedResume && !validatingIds.includes(c.id));

    if (unvalidatedCandidates.length === 0) {
      toast.info("All candidates have already been validated.");
      return;
    }

    toast.success(`Starting batch validation for ${unvalidatedCandidates.length} candidates.`);
    
    // Add all candidates to the validation queue immediately for instant UI feedback
    const idsToValidate = unvalidatedCandidates.map(c => c.id);
    setValidatingIds(prev => [...new Set([...prev, ...idsToValidate])]);

    // Process validations concurrently without stopping if one fails
   for (const candidate of unvalidatedCandidates) {
      await handleValidateResume(candidate.id);
    }
    toast.info("Batch validation process complete.");
  };


    // Helper to fetch rejection reasons from the analysis table
  const fetchRejectionReasons = async (candidateIds: string[]): Promise<Record<string, string>> => {
    if (candidateIds.length === 0) return {};
    const { data, error } = await supabase
      .from('candidate_resume_analysis')
      .select('candidate_id, summary')
      .in('candidate_id', candidateIds)
      .eq('job_id', jobId);
    
    if (error) {
      console.error("Error fetching rejection reasons:", error);
      return {};
    }

    return data.reduce((acc, item) => {
      acc[item.candidate_id] = item.summary;
      return acc;
    }, {});
  };

  // Main handler to prepare and open the modal
  const openShareModal = async (candidatesToShare: Candidate[], emailType: 'shortlist' | 'rejection') => {
    setIsFetchingOwner(candidatesToShare.map(c => c.id).join(',')); // Use a truthy value
    try {
      // For now, using a generic owner name. You can enhance this later if needed.
      const ownerName = `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim() || "The Talent Team";

      let finalCandidates = candidatesToShare;

      if (emailType === 'rejection') {
        const reasons = await fetchRejectionReasons(finalCandidates.map(c => c.id));
        finalCandidates = finalCandidates.map(c => ({
          ...c,
          rejection_reason: reasons[c.id] || "The position was highly competitive."
        }));
      }

      setShareModalData({
        candidates: finalCandidates,
        jobTitle: job?.title || 'the role',
        emailType,
        ownerName
      });
      setIsShareModalOpen(true);
    } catch (error) {
      toast.error("Could not prepare email. See console for details.");
      console.error(error);
    } finally {
      setIsFetchingOwner(null);
    }
  };

  // Expose bulk share trigger to parent
  useImperativeHandle(ref, () => ({
    triggerBatchValidate() { /* ... */ },
    triggerBulkShare(emailType: 'shortlist' | 'rejection') {
      const candidatesToShare = selectedCandidates.size > 0
        ? candidates.filter(c => selectedCandidates.has(c.id))
        : filteredCandidates; // Default to all visible if none are selected
      
      if (candidatesToShare.length === 0) {
        toast.info("No candidates to send mail to.");
        return;
      }
      openShareModal(candidatesToShare, emailType);
    }
  }));


// Add this new handler function inside your CandidatesList component

  const handleShareClick = async (candidate: Candidate) => {
    // Determine the email type based on the candidate's current status
    const statusName = candidate.sub_status?.name;
    let emailType: 'shortlist' | 'rejection' | 'generic' = 'generic';

    if (statusName === 'Processed (Client)') {
      emailType = 'shortlist';
    } else if (statusName && statusName.toLowerCase().includes('reject')) {
      if (!candidate.reject_reason) {
        toast.error("Cannot send email: A rejection reason must be added to the candidate first.");
        return;
      }
      emailType = 'rejection';
    }

    if (!candidate.email) {
        toast.error("Cannot send email: Candidate has no email address.");
        return;
    }

    setIsFetchingOwner(candidate.id);
    try {
      let ownerName = "The Talent Team";
      // The 'owner' field you added in transformation is the name, if it's there use it.
      // Otherwise, fetch from DB using created_by UUID.
      if (candidate.owner) {
        ownerName = candidate.owner;
      } else if (candidate.metadata?.createdBy) { // Assuming createdBy is the UUID
        const { data: ownerData, error } = await supabase
          .from('hr_employees')
          .select('first_name, last_name')
          .eq('id', candidate.metadata.createdBy)
          .single();
        if (error) throw error;
        ownerName = `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim();
      }

      setShareModalData({
        candidate,
        jobTitle: job?.title || 'the role',
        emailType,
        ownerName
      });
      setIsShareModalOpen(true);

    } catch (error) {
      console.error("Error fetching candidate owner:", error);
      toast.error("Could not fetch owner details for signature.");
    } finally {
      setIsFetchingOwner(null);
    }
  };

  // --- MODIFIED: Expose both batch functions to the parent component via ref ---
  useImperativeHandle(ref, () => ({
    // This is the existing function for batch validation
    triggerBatchValidate() {
      handleBatchValidate();
    },
    // --- THIS IS THE NEW FUNCTION YOU NEED TO ADD ---
    triggerBulkShare(emailType: 'shortlist' | 'rejection') {
      const candidatesToShare = selectedCandidates.size > 0
        ? candidates.filter(c => selectedCandidates.has(c.id))
        : filteredCandidates; // Default to all visible if none are selected
      
      if (candidatesToShare.length === 0) {
        toast.info("No candidates to send mail to.");
        return;
      }
      openShareModal(candidatesToShare, emailType);
    }
  }));


  const filteredCandidates = useMemo(() => {
    let filtered = [...candidates];

    // Score filtering logic
    if (scoreFilter !== "all") {
      filtered = filtered.filter(c => {
        const score = candidateAnalysisData[c.id]?.overall_score;
        if (scoreFilter === 'not_validated') {
          return !c.hasValidatedResume && score === undefined;
        }
        if (score === undefined || score === null) return false;
        switch (scoreFilter) {
          case 'shortlisted': return score > 80;
          case 'review': return score === 80;
          case 'not_shortlisted': return score < 80;
          default: return true;
        }
      });
    }
    
    // Tab and status filtering logic
    if (activeTab === "All Candidates") {
      filtered = filtered.filter(c => c.main_status?.name !== "Applied" || c.created_by);
    } else if (activeTab === "Applied") {
      filtered = appliedCandidates;
    } else {
      filtered = filtered.filter(c => c.main_status?.name === activeTab);
    }
    
    if (statusFilters && statusFilters.length > 0) {
      filtered = filtered.filter(c => 
        statusFilters.includes(c.main_status_id || '') || 
        statusFilters.includes(c.sub_status_id || '')
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(c => c.main_status?.name === statusFilter);
    }
    
    if (isCareerPage) {
      filtered = filtered.filter(c => c.appliedFrom === "Candidate");
    }

if (candidateFilter === "Yours") { // Use prop directly
    const userFullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    filtered = filtered.filter(
      c => c.owner === userFullName || c.appliedFrom === userFullName
    );
  }
    
    return filtered;
  }, [candidates, appliedCandidates, activeTab, statusFilters, statusFilter, isCareerPage, candidateFilter, scoreFilter, candidateAnalysisData, user]); // Added user to dependencies


  const handleViewResume = (candidateId: string) => {
    const candidate = filteredCandidates.find((c) => c.id === candidateId);
    if (candidate?.resume) {
      window.open(candidate.resume, "_blank");
    } else {
      toast.error("Resume not available");
    }
  };

  const handleEditCandidate = (candidate: Candidate) => {
    console.log("Editing candidate:", candidate);
    setSelectedCandidate(candidate);
    setIsEditDrawerOpen(true);
  };

  const handleCandidateUpdated = () => {
    setIsEditDrawerOpen(false);
    setSelectedCandidate(null);
    refetch();
    toast.success("Candidate updated successfully");
  };

  const handleInterviewSubmit = async () => {
    // Add a check for currentSubStatus to the guard clause
    if (!currentCandidateId || !currentSubStatusId || !currentRound || !currentSubStatus) return;
    
    const interviewData = {
      interview_date: interviewDate,
      interview_time: interviewTime,
      interview_location: interviewLocation,
      interview_type: interviewType,
      interviewer_name: interviewerName,
      round: currentRound
    };
    
    try {
      // First, find if an interview record for this round already exists
      const { data: existingInterviews, error: fetchError } = await supabase
        .from('hr_candidate_interviews')
        .select('id')
        .eq('candidate_id', currentCandidateId)
        .eq('interview_round', currentRound)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;

      // Determine if this is a new schedule or a reschedule/update
      const isUpdateAction = needsReschedule || (existingInterviews && existingInterviews.length > 0);

      if (isUpdateAction) {
        // Update the existing interview record
        const { error } = await supabase
          .from('hr_candidate_interviews')
          .update({
            interview_date: interviewDate,
            interview_time: interviewTime,
            location: interviewLocation,
            interview_type: interviewType,
            interviewers: [{ name: interviewerName }],
            status: 'scheduled',
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInterviews[0].id);
          
        if (error) throw error;
      } else {
        // Insert a new interview record
        const { error } = await supabase
          .from('hr_candidate_interviews')
          .insert({
            candidate_id: currentCandidateId,
            interview_date: interviewDate,
            interview_time: interviewTime,
            location: interviewLocation,
            interview_type: interviewType,
            interview_round: currentRound,
            interviewers: [{ name: interviewerName }],
            status: 'scheduled',
            created_by: user.id,
            organization_id: organizationId
            
          });
          
        if (error) throw error;
      }
      
      // --- FIX: Determine the correct final status for the candidate ---
      let finalSubStatusId = currentSubStatusId;

      // If this was a 'reschedule' action, we must set the status back to the
      // actual scheduled state (e.g., 'L1') instead of leaving it as 'Reschedule L1'.
      if (needsReschedule) {
        const statuses = await fetchAllStatuses();
        const targetScheduledStatus = statuses
          .flatMap(main => main.subStatuses || [])
          .find(sub => sub.name === currentRound); // currentRound holds the base name like 'L1'

        if (targetScheduledStatus) {
          finalSubStatusId = targetScheduledStatus.id;
        } else {
          // Fallback in case of inconsistent data.
          console.warn(`Could not find a matching status for round: '${currentRound}'. The candidate might remain in a 'Reschedule' state.`);
          toast.error(`Error: Could not find the target status for '${currentRound}'.`);
          // We proceed with the original 'Reschedule...' status ID, but the bug will persist for this one instance.
        }
      }

      // Update candidate status using the determined finalSubStatusId
      await updateCandidateStatus(currentCandidateId, finalSubStatusId, user.id, interviewData);
      
      setShowInterviewModal(false);
      resetInterviewForm();
      await onRefresh();
      toast.success(needsReschedule ? "Interview rescheduled successfully" : "Interview scheduled successfully");
    } catch (error) {
      console.error("Error scheduling/rescheduling interview:", error);
      toast.error("Failed to schedule/reschedule interview");
    }
  };

  const handleInterviewFeedbackSubmit = async () => {
    if (!currentCandidateId || !currentSubStatusId || !currentRound) return;
    
    const feedbackData = {
      interview_feedback: interviewFeedback,
      interview_result: interviewResult,
      round: currentRound
    };
    
    const { data: interviews, error: interviewError } = await supabase
      .from('hr_candidate_interviews')
      .select('*')
      .eq('candidate_id', currentCandidateId)
      .eq('interview_round', currentRound)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (interviewError) {
      console.error("Error fetching interview:", interviewError);
      toast.error("Failed to fetch interview details");
      return;
    }
    
    if (interviews && interviews.length > 0) {
      const { error } = await supabase
        .from('hr_candidate_interviews')
        .update({
          feedback: {
            result: interviewResult === 'selected' ? 'Selected' : 'Rejected',
            comments: interviewFeedback,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          },
          status: interviewResult === 'selected' ? 'completed' : 'rejected'
        })
        .eq('id', interviews[0].id);
        
      if (error) {
        console.error("Error updating interview:", error);
        toast.error("Failed to update interview feedback");
        return;
      }
    }
    
    await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, feedbackData);
      
    setShowInterviewFeedbackModal(false);
    setInterviewFeedback('');
    setInterviewResult('selected');
    await onRefresh();
    toast.success("Interview feedback saved");
  };


  const handleJoiningSubmit = async () => {
    if (!currentCandidateId || !currentSubStatusId || !jobId) return;
  
    // Validate CTC
    const cleanedCtc = parseFloat(ctc);
    if (isNaN(cleanedCtc) || cleanedCtc <= 0) {
      toast.error("Please enter a valid CTC");
      return;
    }
  
    // Validate Joining Date
    if (!joiningDate) {
      toast.error("Please select a joining date");
      return;
    }
  
    try {
      // Get current currency symbol
      const currentCurrency = currencies.find((c) => c.value === currencyType) || currencies[0];
  
      // Format client_budget
      const clientBudget = `${currentCurrency.symbol}${cleanedCtc} ${budgetType}`;
  
      // Update or insert into hr_candidate_joining_details
      const { data: existingDetails, error: fetchError } = await supabase
        .from("hr_candidate_joining_details")
        .select("*")
        .eq("candidate_id", currentCandidateId)
        .maybeSingle();
  
      if (fetchError && !fetchError.message.includes("No rows found")) {
        throw fetchError;
      }
  
      const joiningDetails = {
        candidate_id: currentCandidateId,
       
        final_salary: cleanedCtc,
        currency_type: currencyType,
        budget_type: budgetType,
        client_budget: clientBudget,
        joining_date: joiningDate,
        created_by: user.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_status: "pending",
        organization_id: organizationId,
      };
  
      if (existingDetails) {
        const { error } = await supabase
          .from("hr_candidate_joining_details")
          .update({
            final_salary: cleanedCtc,
            currency_type: currencyType,
            budget_type: budgetType,
            client_budget: clientBudget,
            joining_date: joiningDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDetails.id);
  
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_candidate_joining_details")
          .insert(joiningDetails);
  
        if (error) throw error;
      }
  
      // Prepare data for updateCandidateStatus
      const joiningData = {
        ctc: clientBudget,
        joining_date: joiningDate,
      };
  
      await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, joiningData);
  
      setShowJoiningModal(false);
      setCtc("");
      setJoiningDate("");
      setCurrencyType("INR");
      setBudgetType("LPA");
      await onRefresh();
      toast.success(`${currentSubStatus?.name === 'Offer Issued' ? 'Offered' : 'Joined'} details saved`);
    } catch (error) {
      console.error("Error saving joining details:", error);
      toast.error("Failed to save joining details");
    }
  };


  const handleActualCtcSubmit = async () => {
    if (!currentCandidateId || !currentSubStatusId) return;
  
    // Validate CTC
    const cleanedCtc = parseFloat(actualCtc);
    if (isNaN(cleanedCtc) || cleanedCtc <= 0) {
      toast.error("Please enter a valid CTC");
      return;
    }
  
    // Validate Submission Date
    if (!submissionDate) {
      toast.error("Please select a submission date");
      return;
    }
  
    try {
      // Get current currency symbol
      const currentCurrency = currencies.find((c) => c.value === currencyType) || currencies[0];
  
      // Format clientBudget
      const clientBudget = `${currentCurrency.symbol}${cleanedCtc} ${budgetType}`;
  
      // Update or insert into hr_candidate_accrual_ctc
      const { data: existingDetails, error: fetchError } = await supabase
        .from("hr_candidate_accrual_ctc")
        .select("*")
        .eq("candidate_id", currentCandidateId)
        .eq("job_id", jobId)
        .maybeSingle();
  
      if (fetchError && !fetchError.message.includes("No rows found")) {
        throw fetchError;
      }
  
      if (existingDetails) {
        const { error } = await supabase
          .from("hr_candidate_accrual_ctc")
          .update({
            actual_ctc: cleanedCtc,
            currency_type: currencyType,
            budget_type: budgetType,
            client_budget: clientBudget,
            updated_at: submissionDate ? new Date(submissionDate).toISOString() : new Date().toISOString(),
          })
          .eq("id", existingDetails.id);
  
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hr_candidate_accrual_ctc")
          .insert({
            candidate_id: currentCandidateId,
            job_id: jobId,
            actual_ctc: cleanedCtc,
            currency_type: currencyType,
            budget_type: budgetType,
            client_budget: clientBudget,
            created_by: user.id,
            created_at: submissionDate ? new Date(submissionDate).toISOString() : new Date().toISOString(),
            updated_at: submissionDate ? new Date(submissionDate).toISOString() : new Date().toISOString(),
            organization_id: organizationId,
          });
  
        if (error) throw error;
      }
  
      // Prepare data for status update
      const additionalData = {
        accrual_ctc: clientBudget,
        submission_date: submissionDate,
      };
  
      // Use the new client submission status update function
      const success = await updateClientSubmissionStatus(
        currentCandidateId,
        jobId,
        currentSubStatusId,
        user.id,
        additionalData
      );
  
      if (!success) {
        throw new Error('Failed to update client submission status');
      }
  
      setShowActualCtcModal(false);
      setActualCtc("");
      setCurrencyType("INR");
      setBudgetType("LPA");
      setSubmissionDate("");
      await onRefresh();
      toast.success("Client billing rate saved");
    } catch (error) {
      console.error("Error saving actual CTC:", error);
      toast.error("Failed to save actual CTC");
    }
  };



  const handleRejectSubmit = async () => {
    if (!currentCandidateId || !currentSubStatusId) return;
    
    const rejectData = {
      reject_reason: rejectReason,
      reject_type: rejectType
    };
    
    await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, rejectData);
    
    setShowRejectModal(false);
    setRejectReason('');
    setRejectType('internal');
    await onRefresh();
    toast.success("Candidate rejected");
  };

  const resetInterviewForm = () => {
    setInterviewDate('');
    setInterviewTime('');
    setInterviewLocation('Virtual');
    setInterviewType('Technical');
    setInterviewerName('');
    setCurrentRound(null);
    setNeedsReschedule(false);
  };

  const handleAddToJob = async (candidateId: string) => {
    try {
      toast.success("Candidate added to job");
      await onRefresh();
    } catch (error) {
      toast.error("Failed to add candidate to job");
    }
  };

  if (isLoading || jobLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getTabCount = (tabName: string) => {
    if (tabName === "All Candidates") return candidates.filter(c => c.main_status?.name !== "Applied" || c.created_by).length;
    if (tabName === "Applied") return appliedCandidates.length;
    return candidates.filter(c => c.main_status?.name === tabName).length;
  };

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(
    startIndex,
    startIndex + itemsPerPage
  );


  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of{" "}
          {filteredCandidates.length} candidates
        </span>
      </div>
    );
  };

  const toggleContactVisibility = (
    candidateId: string,
    field: "email" | "phone"
  ) => {
    setVisibleContacts((prev) => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: !prev[candidateId]?.[field],
      },
    }));
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${field} copied to clipboard`);
    }).catch(() => {
      toast.error(`Failed to copy ${field}`);
    });
  };

  const HiddenContactCell = ({ email, phone, candidateId }: HiddenContactCellProps) => {
    const [justCopiedEmail, setJustCopiedEmail] = useState(false);
    const [justCopiedPhone, setJustCopiedPhone] = useState(false);
  
    const copyToClipboard = (value: string, field: "Email" | "Phone") => {
      navigator.clipboard.writeText(value);
      if (field === "Email") {
        setJustCopiedEmail(true);
        setTimeout(() => setJustCopiedEmail(false), 2000);
      } else {
        setJustCopiedPhone(true);
        setTimeout(() => setJustCopiedPhone(false), 2000);
      }
    };
  
    if (!email && !phone) {
      return <TableCell className="text-muted-foreground">N/A</TableCell>;
    }




  
    return (
      <TableCell>
        <div className="flex items-center gap-2">
          {email && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View email"
                  className="p-0 h-6 w-6"
                >
                  <Mail className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
                side="top"
                align="center"
                sideOffset={8}
                collisionPadding={10}
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(email, "Email")}
                  className="h-6 w-6 p-0 flex-shrink-0"
                  aria-label="Copy email"
                >
                  {justCopiedEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </PopoverContent>
            </Popover>
          )}
          {phone && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View phone"
                  className="p-0 h-6 w-6"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
                side="top"
                align="center"
                sideOffset={8}
                collisionPadding={10}
              >
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate flex-1">{phone}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(phone, "Phone")}
                  className="h-6 w-6 p-0 flex-shrink-0"
                  aria-label="Copy phone"
                >
                  {justCopiedPhone ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </PopoverContent>
            </Popover>
          )}
          {!email && !phone && (
            <span className="text-sm text-muted-foreground">No contact info</span>
          )}
        </div>
      </TableCell>
    );
  };

const getScoreColor = (score: number | null | undefined): string => {
  if (score == null) return 'bg-gray-200 text-gray-600';
  if (score > 80) return 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-teal-500/30 border border-emerald-300';
  if (score >= 75) return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 border border-amber-300';
  return 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/30 border border-rose-400';
};


const ContactIcon = ({ type, value }: { type: 'email' | 'phone'; value: string }) => {
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(value);
    setJustCopied(true);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copied!`);
    setTimeout(() => setJustCopied(false), 2000);
  };

  const icon = type === 'email' 
    ? <Mail className="h-4 w-4" />
    : <Phone className="h-4 w-4" />;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors">
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top" align="center">
        <div className="flex items-center gap-2">
          <span className="text-sm">{value}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleCopy} className="p-1 rounded-md hover:bg-accent">
                  {justCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Copy</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ScoreDisplay = ({ score, isValidated, isLoading, candidateId, hasSummary, onValidate, onViewSummary, reportUrl }) => {
  if (isLoading) {
    return <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>;
  }

  if (isValidated && score != null) {
    return (
      <div className="relative flex items-center justify-center">
        {/* The 3D Score Circle */}
        <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-lg transition-transform hover:scale-105 ${getScoreColor(score)}`}>
          {score}
        </div>

        {/* --- This is the Hover Box, positioned on the LEFT and with a high z-index --- */}
        <div className="absolute right-full mr-2 z-30 flex items-center gap-1 rounded-md border bg-white p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex flex-col gap-1 items-center">
            <p className="font-semibold text-xs whitespace-nowrap px-1">Validation Score: {score}/100</p>
            <div className="w-full h-[1px] bg-gray-200" />
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onViewSummary(candidateId)} className="p-1 rounded-md hover:bg-accent">
                      <Eye className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>View Summary</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {reportUrl && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={reportUrl} download target="_blank" rel="noopener noreferrer" className="p-1 rounded-md text-foreground hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                        <Download className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent><p>Download Report</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for "Click to Validate" button
 return (
  <div className="relative flex items-center justify-center">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={() => onValidate(candidateId)}
            className="h-9 w-9 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-md border border-purple-400 animate-bounce hover:animate-bounce transition-all rounded-lg"
            title="Click to Validate"
          >
            <Sparkles className="h-5 w-5 " />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to Validate</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    </div>
  );
};
  return (
    <>

      <div className="w-full mb-4 flex justify-center">
<div className="flex-shrink-0 order-1">
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
      {/* Combine "All Candidates" with the dynamic statuses into one array */}
      {[{ id: "all-candidates", name: "All Candidates" }, ...mainStatuses].map((status) => {
        const isActive = activeTab === status.name || (status.id === 'all-candidates' && activeTab === 'All Candidates');

        return (
          <TabsTrigger
            key={status.id}
            value={status.name}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
              }`}
          >
            {/* Tab Content (Text and Count) */}
            <span className="relative flex items-center">
              {status.name}
              <span
                className={`ml-2 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                }`}
              >
                {getTabCount(status.name)}
              </span>
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  </Tabs>
</div>
</div>
      {filteredCandidates.length === 0 ? (
        <EmptyState onAddCandidate={async () => {
          try {
            const statuses = await fetchAllStatuses();
            const newStatus = statuses.find(s => s.name === "New Applicant");
            if (newStatus?.subStatuses?.length) {
              await supabase.from("hr_job_candidates").insert({
                job_id: jobId,
                main_status_id: newStatus.id,
                sub_status_id: newStatus.subStatuses[0].id,
                created_by: user.id,
                owner: user.id,
                name: "New Candidate",
                applied_date: new Date().toISOString().split('T')[0],
                skills: [],
                organization_id: organizationId
              });
              await onRefresh();
              toast.success("New candidate added successfully");
            } else {
              toast.error("Could not find New status");
            }
          } catch (error) {
            console.error("Error adding new candidate:", error);
            toast.error("Failed to add new candidate");
          }
        }} />
      ) : (
       <div className="w-full overflow-x-auto rounded-md border">
      <Table className="min-w-[800px]">
  <TableHeader>
    <TableRow className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap border border-purple-500">
      <TableHead className="sticky text-center left-0 z-20 w-[120px] px-2 text-white">Score</TableHead>
      <TableHead className="sticky left-[60px] z-10 w-[200px] px-2 text-white">Candidate Name</TableHead>
      <TableHead className="w-[60px] text-center px-2 text-white">Owner</TableHead>
      <TableHead className="w-[120px] px-2 text-white">Current CTC</TableHead>
      <TableHead className="w-[120px] px-2 text-white">Expected CTC</TableHead>
      <TableHead className="w-[120px] px-2 text-white">Notice Period</TableHead>
      <TableHead className="w-[120px] px-2 text-white">Location</TableHead>
      <TableHead className="w-[200px] px-2 text-white">Status</TableHead>
      <TableHead className="sticky right-0 z-20 w-[150px] px-2 text-white">Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedCandidates.map((candidate) => (
      <TableRow key={candidate.id} className="align-top group bg-white hover:bg-slate-50 relative">
        {/* --- Sticky Cell 1 (BACKGROUND FIXED) --- */}
        <TableCell className="sticky left-0 z-20 px-2 bg-purple-50 group-hover:bg-slate-50 py-1">
          <ScoreDisplay
            score={candidateAnalysisData[candidate.id]?.overall_score}
            isValidated={candidate.hasValidatedResume}
            isLoading={validatingIds.includes(candidate.id)}
            candidateId={candidate.id}
            hasSummary={!!candidateAnalysisData[candidate.id]}
            onValidate={handleValidateResume}
            onViewSummary={fetchAnalysisData}
            reportUrl={candidateAnalysisData[candidate.id]?.report_url}
          />
        </TableCell>

        {/* --- Sticky Cell 2 (BACKGROUND FIXED) --- */}
<TableCell className="sticky left-[60px] z-10 px-2 font-medium bg-purple-50 group-hover:bg-slate-50 py-1">
  <div className="flex items-start gap-2 h-full">
    <div className="flex-1 min-w-0">
      <div className="truncate cursor-pointer text-black" onClick={() => navigate(`/employee/${candidate.id}/${jobId}`, { state: { candidate } })} title={candidate.name}>
        {candidate.name}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap block text-left">
        {moment(candidate.createdAt).format("DD MMM YYYY")} ({moment(candidate.createdAt).fromNow()})
      </span>
    </div>
    <div className="flex-shrink-0 self-stretch flex items-center justify-center">
      <div className="flex space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200">
        {candidate.email && <ContactIcon type="email" value={candidate.email} />}
        {candidate.phone && <ContactIcon type="phone" value={candidate.phone} />}
      </div>
    </div>
  </div>
</TableCell>

        {/* --- Other Scrollable Cells --- */}
        <TableCell className="px-2 py-1 flex items-center justify-center">
          <OwnerAvatarCell ownerName={candidate.owner || candidate.appliedFrom} createdAt={candidate.createdAt} isEmployee={isEmployee} currentUserName={`${user.user_metadata.first_name} ${user.user_metadata.last_name}`} />
        </TableCell>
        <TableCell className="px-2 text-sm py-1">{candidate.currentSalary ? formatCurrency(parseFloat(String(candidate.currentSalary).replace(/[^0-9.]/g, ''))) : "N/A"}</TableCell>
        <TableCell className="px-2 text-sm py-1">{candidate.expectedSalary ? formatCurrency(parseFloat(String(candidate.expectedSalary).replace(/[^0-9.]/g, ''))) : "N/A"}</TableCell>
        <TableCell className="px-2 text-sm py-1">{candidate?.metadata?.noticePeriod || "N/A"}</TableCell>
        <TableCell className="px-2 text-sm py-1">{candidate?.metadata?.currentLocation || "N/A"}</TableCell>
        <TableCell className="px-2 py-1">
    {organizationId === TASKUP_ORGANIZATION_ID ? (
        <TaskupStatusSelector
            value={candidate.sub_status_id || ""}
            onChange={(value) => handleStatusChange(value, candidate)}
            className="h-8 text-xs w-full"
        />
    ) : (
        <StatusSelector
            value={candidate.sub_status_id || ""}
            onChange={(value) => handleStatusChange(value, candidate)}
            className="h-8 text-xs w-full"
        />
    )}
 </TableCell>
        {/* --- Action Cell (Right Fixed) --- */}
        <TableCell className="sticky right-0 z-20 px-2 bg-purple-50 group-hover:bg-slate-50 py-1">
          <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200 w-fit">
            {/* ... All your action buttons (Eye, Download, Pencil, etc.) go here ... */}
            {/* The content inside this div does not need to change. */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleViewResume(candidate.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Resume</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => { if (candidate.resumeUrl) { const link = document.createElement('a'); link.href = candidate.resumeUrl; link.download = `${candidate.name}_resume.pdf`; link.click(); } else { toast.error("Resume not available for download"); } }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Download Resume</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleEditCandidate(candidate)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Edit Candidate</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleViewTimeline(candidate)}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Timeline & Notes</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {candidate.hasValidatedResume && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => openShareModal(candidate)}>
                      <Mail className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Share update with {candidate.name}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
      </div>
      
    )}
      {filteredCandidates.length > 0 && renderPagination()}

      {selectedCandidate && (
        <EditCandidateDrawer
          job={{
            id: jobId,
            skills: selectedCandidate.skills.map((s) => (typeof s === "string" ? s : s.name)),
            organization_id: organizationId,
          } as any}
          onCandidateAdded={handleCandidateUpdated}
          candidate={selectedCandidate}
          open={isEditDrawerOpen}
          onOpenChange={setIsEditDrawerOpen}
        />
      )}

      {isTaskupActionModalOpen && (
        <TaskupActionModal
          isOpen={isTaskupActionModalOpen}
          onClose={() => setIsTaskupActionModalOpen(false)}
          onSubmit={handleTaskupActionSubmit}
          config={taskupModalConfig}
          candidateName={candidates.find(c => c.id === currentCandidateId)?.name || ''}
        />
      )}

      {isSummaryModalOpen && analysisData && (
        <SummaryModal
          analysisData={analysisData}
          onClose={() => {
            setIsSummaryModalOpen(false);
            setAnalysisData(null);
          }}
        />
      )}

      {/* --- ADD THIS NEW MODAL RENDER --- */}
      {selectedCandidateForTimeline && (
        <CandidateTimelineModal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          candidate={selectedCandidateForTimeline}
        />
      )}

{isShareModalOpen && (
  <ShareCandidateModal
    isOpen={isShareModalOpen}
    onClose={() => setIsShareModalOpen(false)}
    data={shareModalData}
  />
)}

      

      <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{needsReschedule ? 'Reschedule' : 'Schedule'} {currentRound} Interview</DialogTitle>
            <DialogDescription>
              Enter the details for the interview session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="date">Date</Label>
              <input 
                id="date" 
                type="date" 
                value={interviewDate} 
                onChange={e => setInterviewDate(e.target.value)} 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="time">Time</Label>
              <input 
                id="time" 
                type="time" 
                value={interviewTime} 
                onChange={e => setInterviewTime(e.target.value)} 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="location">Location</Label>
              <input 
                id="location" 
                type="text" 
                value={interviewLocation} 
                onChange={e => setInterviewLocation(e.target.value)} 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="Virtual or Office Address"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="type">Type</Label>
              <select 
                id="type" 
                value={interviewType} 
                onChange={e => setInterviewType(e.target.value)} 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="HR">HR</option>
                <option value="Client">Client</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="interviewer">Interviewer</Label>
              <input 
                id="interviewer" 
                type="text" 
                value={interviewerName} 
                onChange={e => setInterviewerName(e.target.value)} 
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="Interviewer Name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInterviewModal(false)}>Cancel</Button>
            <Button onClick={handleInterviewSubmit}>{needsReschedule ? 'Reschedule' : 'Schedule'} Interview</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showInterviewFeedbackModal} onOpenChange={setShowInterviewFeedbackModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Interview Feedback for {currentRound}</DialogTitle>
            <DialogDescription>
              Provide feedback for the interview.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 hidden">
              <Label htmlFor="result">Interview Result</Label>
              <RadioGroup 
                id="result" 
                value={interviewResult} 
                onValueChange={setInterviewResult}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected">Selected</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rejected" id="rejected" />
                  <Label htmlFor="rejected">Rejected</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea 
                id="feedback" 
                value={interviewFeedback} 
                onChange={e => setInterviewFeedback(e.target.value)} 
                placeholder="Enter interview feedback"
                className="min-h-[120px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInterviewFeedbackModal(false)}>Cancel</Button>
            <Button onClick={handleInterviewFeedbackSubmit}>Save Feedback</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoiningModal} onOpenChange={setShowJoiningModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{currentSubStatus?.name === 'Offer Issued' ? 'Offer Details' : 'Joining Details'}</DialogTitle>
      <DialogDescription>
        Enter the {currentSubStatus?.name === 'Offer Issued' ? 'Offered CTC and Joining Date' : 'Joined CTC and Joined Date'}
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right" htmlFor="ctc">
          {currentSubStatus?.name === 'Offer Issued' ? 'Offered CTC' : 'Joined CTC'}
        </Label>
        <div className="col-span-3 flex">
          <Select1 value={currencyType} onValueChange={setCurrencyType} disabled={true}>
            <SelectTrigger4 className="w-[80px] rounded-r-none border-r-0">
              <SelectValue3 />
            </SelectTrigger4>
            <SelectContent7>
              <SelectGroup2>
                <SelectLabel8>Currency</SelectLabel8>
                {currencies.map((currency) => (
                  <SelectItem9 key={currency.value} value={currency.value}>
                    {currency.symbol} {currency.value}
                  </SelectItem9>
                ))}
              </SelectGroup2>
            </SelectContent7>
          </Select1>
          <input
            id="ctc"
            type="text"
            value={formatINR(ctc)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9]/g, "");
              setCtc(rawValue);
            }}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2"
            placeholder="e.g., 10,00,000"
            required
          />
          <Select1 value={budgetType} onValueChange={setBudgetType} disabled={true}>
            <SelectTrigger4 className="w-[110px] rounded-l-none border-l-0">
              <SelectValue3 />
            </SelectTrigger4>
            <SelectContent7>
              {budgetTypes.map((type) => (
                <SelectItem9 key={type} value={type}>
                  {type}
                </SelectItem9>
              ))}
            </SelectContent7>
          </Select1>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right" htmlFor="joining-date">
          {currentSubStatus?.name === 'Offer Issued' ? 'Joining Date' : 'Joined Date'}
        </Label>
        <input
          id="joining-date"
          type="date"
          value={joiningDate}
          onChange={(e) => setJoiningDate(e.target.value)}
          className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
          required
        />
      </div>
    </div>
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setShowJoiningModal(false)}>
        Cancel
      </Button>
      <Button onClick={handleJoiningSubmit}>Save</Button>
    </div>
  </DialogContent>
</Dialog>

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea 
                id="reject-reason" 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                placeholder="Enter rejection reason"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>Reject Candidate</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showActualCtcModal} onOpenChange={setShowActualCtcModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Client Submission</DialogTitle>
          {job.jobType !== "Internal" && (
      <DialogDescription>
        Select the Submission Date
      </DialogDescription>
      )}
       {job.jobType !== "External" && (
      <DialogDescription>
        Enter the Client Billable Rate and Submission Date
      </DialogDescription>
      )}
    </DialogHeader>
    <div className="grid gap-4 py-4">
       {job.jobType !== "External" && (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right" htmlFor="actual-ctc">
          Client Billing
        </Label>
        <div className="col-span-3 flex">
          <Select1 value={currencyType} onValueChange={setCurrencyType} disabled={true}>
            <SelectTrigger4 className="w-[80px] rounded-r-none border-r-0">
              <SelectValue3 />
            </SelectTrigger4>
            <SelectContent7>
              <SelectGroup2>
                <SelectLabel8>Currency</SelectLabel8>
                {currencies.map((currency) => (
                  <SelectItem9 key={currency.value} value={currency.value}>
                    {currency.symbol} {currency.value}
                  </SelectItem9>
                ))}
              </SelectGroup2>
            </SelectContent7>
          </Select1>
          <input
            id="actual-ctc"
            type="text"
            value={formatINR(actualCtc)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9]/g, "");
              setActualCtc(rawValue);
            }}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2"
            placeholder="e.g., 10,00,000"
            required
          />
          <Select1 value={budgetType} onValueChange={setBudgetType} disabled={true}>
            <SelectTrigger4 className="w-[110px] rounded-l-none border-l-0">
              <SelectValue3 />
            </SelectTrigger4>
            <SelectContent7>
              {budgetTypes.map((type) => (
                <SelectItem9 key={type} value={type}>
                  {type}
                </SelectItem9>
              ))}
            </SelectContent7>
          </Select1>
        </div>
      </div>
       )}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right" htmlFor="submission-date">
          Submission Date
        </Label>
        <input
          id="submission-date"
          type="date"
          value={submissionDate}
          onChange={(e) => setSubmissionDate(e.target.value)}
          className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
          required
        />
      </div>
    </div>
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setShowActualCtcModal(false)}>
        Cancel
      </Button>
      <Button onClick={handleActualCtcSubmit}>Save</Button>
    </div>
  </DialogContent>
</Dialog>
    </>
  );
});

export default CandidatesList;