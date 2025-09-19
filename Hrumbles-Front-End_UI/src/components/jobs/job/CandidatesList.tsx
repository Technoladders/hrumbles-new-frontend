

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
   Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";
import { StatusSelector } from "./StatusSelector";
import { ItechStatusSelector } from "./ItechStatusSelector";
import ValidateResumeButton from "./candidate/ValidateResumeButton";
import StageProgress from "./candidate/StageProgress";
import EmptyState from "./candidate/EmptyState";
import { Pencil, Eye, Download, FileText, Phone, Calendar, User, ChevronLeft, ChevronRight, EyeOff, Copy, Check, PhoneOff, MailOpen, Mail, Contact, Clock, MessageSquare, Notebook } from "lucide-react";
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


const VALIDATION_QUEUE_KEY = "validationQueue";

interface CandidatesListProps {
  jobId: string;
  jobdescription: string;
  statusFilter?: string;
  statusFilters?: string[];
  onAddCandidate?: () => void;
  onRefresh: () => Promise<void>;
  isCareerPage?: boolean;
  scoreFilter?: string;
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
    isCareerPage = false
  } = props;
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];
  const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";


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
  const [candidateFilter, setCandidateFilter] = useState<"All" | "Yours">("All"); // New filter state

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
    // No need to check candidatesData here, as the hook depends on it.
    if (!jobId) return;
    
    const { data, error } = await supabase
      .from("candidate_resume_analysis")
      .select("candidate_id, summary, overall_score")
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
      analysisDataTemp[item.candidate_id] = { overall_score: item.overall_score };
    });

    setAnalysisDataAvailable(availableData);
    setCandidateAnalysisData(prevData => {
      const hasNewData = Object.keys(analysisDataTemp).some(key => 
        !prevData[key] || prevData[key].overall_score !== analysisDataTemp[key].overall_score
      );
      if (hasNewData) {
        return { ...prevData, ...analysisDataTemp };
      }
      return prevData;
    });
  };

  checkAnalysisData();
}, [candidatesData, jobId]); // <-- CRITICAL CHANGE: Add candidatesData back to the dependency array

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
    maximumFractionDigits: 2,
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


  const handleStatusChange = async (value: string, candidate: Candidate) => {
    try {
      if (!value) {
        toast.error("Invalid status selected");
        return;
      }
  
      const statuses = await fetchAllStatuses();
      const subStatuses = statuses.flatMap(s => s.subStatuses || []);
      const newSubStatus = subStatuses.find(s => s.id === value);
      
      if (!newSubStatus) {
        toast.error("Status not found");
        return;
      }
      
      const newMainStatus = statuses.find(s => s.id === newSubStatus.parent_id);
      const oldSubStatusName = candidate.sub_status?.name;
      
      setCurrentCandidateId(candidate.id);
      setCurrentSubStatusId(value);
      setCurrentSubStatus({
        id: newSubStatus.id,
        name: newSubStatus.name,
        parentId: newSubStatus.parent_id,
      });
  
      const { getRequiredInteractionType, getInterviewRoundName } = await import('@/utils/statusTransitionHelper');
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
      toast.error("Failed to update status");
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
    const unvalidatedCandidates = candidates.filter(c => !c.hasValidatedResume && !validatingIds.includes(c.id));

    if (unvalidatedCandidates.length === 0) {
      toast.info("All candidates have already been validated.");
      return;
    }

    toast.success(`Starting batch validation for ${unvalidatedCandidates.length} candidates.`);
    
    // Add all candidates to the validation queue immediately for instant UI feedback
    const idsToValidate = unvalidatedCandidates.map(c => c.id);
    setValidatingIds(prev => [...new Set([...prev, ...idsToValidate])]);

    // Process validations concurrently without stopping if one fails
    await Promise.allSettled(
      unvalidatedCandidates.map(candidate => handleValidateResume(candidate.id))
    );

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

    if (candidateFilter === "Yours") {
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

  return (
    <>
    {isEmployee && <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filter Candidates:</span>
          <Select
            value={candidateFilter}
            onValueChange={(value: "All" | "Yours") => setCandidateFilter(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Yours">Yours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div> }
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList1 className="grid grid-cols-7 mb-4">
          <TabsTrigger1 value="All Candidates" className="relative">
            All Candidates
            <span
              className={`absolute top-0 right-1 text-xs rounded-full h-4 w-4 flex items-center justify-center ${
                activeTab === "All Candidates"
                  ? "bg-white purple-text-color"
                  : "bg-purple text-white"
              }`}
            >
              {getTabCount("All Candidates")}
            </span>
          </TabsTrigger1>
         
           {areStatusesLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-md" />
            ))
          ) : (
            mainStatuses.map((status) => (
              <TabsTrigger1 key={status.id} value={status.name} className="relative">
                {status.name}
                <span
                  className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                    activeTab === status.name ? "bg-white purple-text-color" : "bg-purple text-white"
                  }`}
                >
                  {getTabCount(status.name)}
                </span>
              </TabsTrigger1>
            ))
          )}
        </TabsList1>
      </Tabs>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]">
  <Checkbox
    checked={paginatedCandidates.length > 0 && selectedCandidates.size === paginatedCandidates.length}
    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
  />
</TableHead>
                <TableHead className="w-[150px] sm:w-[200px]">Candidate Name</TableHead>
                {!isEmployee && <TableHead className="w-[100px] sm:w-[150px]">Owner</TableHead>}
                <TableHead className="w-[50px] sm:w-[100px]">
                  Contact Info
                </TableHead>
                {/* <TableHead className="w-[150px] sm:w-[200px]">Interview / Feedback</TableHead> */}
                {ITECH_ORGANIZATION_ID.includes(organizationId) || organizationId !== ASCENDION_ORGANIZATION_ID && !isEmployee && <TableHead className="w-[80px] sm:w-[100px]">Profit</TableHead>}
                <TableHead className="w-[120px] sm:w-[150px]">Stage Progress</TableHead>
                <TableHead className="w-[100px] sm:w-[120px]">Status</TableHead>
                <TableHead className="w-[80px] sm:w-[100px]">Validate</TableHead>
                {activeTab === "Applied" && <TableHead className="w-[80px] sm:w-[100px]">Action</TableHead>}
                <TableHead className="w-[50px] sm:w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                   <TableCell>
    <Checkbox
      checked={selectedCandidates.has(candidate.id)}
      onCheckedChange={(checked) => handleSelectCandidate(candidate.id, Boolean(checked))}
    />
  </TableCell>
                  <TableCell className="font-medium">
  <div
    className="flex flex-col cursor-pointer"
    onClick={() => {
      navigate(`/employee/${candidate.id}/${jobId}`, {
        state: { candidate, jobId },
      });
    }}
  >
    <div className="flex items-center gap-2">
      {candidate.owner || candidate.appliedFrom === `${user.user_metadata.first_name} ${user.user_metadata.last_name}` && (
        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" title="You added this candidate"></span>
      )}
      <span>{candidate.name}</span>
    </div>
    <span className="text-xs text-muted-foreground">
      {moment(candidate.createdAt).format("DD MMM YYYY")} (
      {moment(candidate.createdAt).fromNow()})
    </span>
  </div>
</TableCell>

{!isEmployee && <TableCell>{candidate.owner || candidate.appliedFrom}</TableCell>}
                  <HiddenContactCell
                    email={candidate.email}
                    phone={candidate.phone}
                    candidateId={candidate.id}
                  />
                  {/* <TableCell>
                <InterviewDetailsCell candidate={candidate} />
              </TableCell> */}
                {ITECH_ORGANIZATION_ID.includes(organizationId)|| organizationId !== ASCENDION_ORGANIZATION_ID && !isEmployee && (
  <TableCell>
    <span
      className={
        candidate.profit?.profit != null && candidate.profit.profit > 0
          ? "text-green-600"
          : "text-red-600"
      }
    >
      {candidate.profit?.profit != null
        ? `${formatCurrency(candidate.profit.profit)} `
        : "N/A"}
    </span>
  </TableCell>
)}
                  <TableCell>
                    <div className="truncate">
                      <ProgressColumn
                        progress={candidate.progress}
                        mainStatus={candidate.main_status}
                        subStatus={candidate.sub_status}
                      />
                    </div>
                  </TableCell>
                 <TableCell>
                    {/* 3. ADD CONDITIONAL RENDERING LOGIC */}
                    {ITECH_ORGANIZATION_ID.includes(organizationId) || organizationId === ASCENDION_ORGANIZATION_ID ? (
                      <ItechStatusSelector
                        value={candidate.sub_status_id || ""}
                        onChange={(value) => handleStatusChange(value, candidate)}
                        className="h-7 text-xs w-full"
                      />
                    ) : (
                      <StatusSelector
                        value={candidate.sub_status_id || ""}
                        onChange={(value) => handleStatusChange(value, candidate)}
                        className="h-7 text-xs w-full"
                        disableNextStage={candidate.sub_status?.name?.includes('Reject')}
                      />
                    )}
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-2">
                      <ValidateResumeButton
                        isValidated={candidate.hasValidatedResume || false}
                        candidateId={candidate.id}
                        onValidate={handleValidateResume}
                         isLoading={validatingIds.includes(candidate.id)}
    overallScore={candidateAnalysisData[candidate.id]?.overall_score}
                      />
                      {analysisDataAvailable[candidate.id] && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => fetchAnalysisData(candidate.id)}
                          title="View Summary Report"
                          className="p-1"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {activeTab === "Applied" && (
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleAddToJob(candidate.id)}>
                        Add to Job
                      </Button>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-start">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResume(candidate.id)}
                        title="View Resume"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (candidate.resume) {
                            const link = document.createElement('a');
                            link.href = candidate.resume;
                            link.download = `${candidate.name}_resume.pdf`;
                            link.click();
                          } else {
                            toast.error("Resume not available for download");
                          }
                        }}
                        title="Download Resume"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCandidate(candidate)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                       <Button
      variant="ghost"
      size="sm"
      onClick={() => handleViewTimeline(candidate)}
      title="View Timeline & Notes"
    >
      <MessageSquare className="h-4 w-4" />
    </Button>

    
      {candidate.hasValidatedResume && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openShareModal([candidate], scoreFilter === 'not_shortlisted' ? 'rejection' : 'shortlist')}
          disabled={isFetchingOwner !== null}
          title={`Share update with ${candidate.name}`}
        >
          <Mail className="h-4 w-4" />
        </Button>
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