// import { useState, useEffect } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { useSelector } from "react-redux";
// import { toast } from "sonner";
// import { getCandidatesByJobId } from "@/services/candidateService";
// import { Candidate, CandidateStatus } from "@/lib/types";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/jobs/ui/table";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/jobs/ui/tooltip";
// import { StatusSelector } from "./StatusSelector";
// import ValidateResumeButton from "./candidate/ValidateResumeButton";
// import StageProgress from "./candidate/StageProgress";
// import EmptyState from "./candidate/EmptyState";
// import { Pencil, Eye, Download, FileText, Phone, Calendar, User, ChevronLeft, ChevronRight, EyeOff, Copy, Check, PhoneOff, MailOpen, Mail, Contact } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import EditCandidateDrawer from "@/components/jobs/job/candidate/EditCandidateDrawer";
// import { getJobById } from "@/services/jobService";
// import { ProgressColumn } from "./ProgressColumn";
// import { Candidates } from "./types/candidate.types";
// import { getCandidatesForJob, createDummyCandidate } from "@/services/candidatesService";
// import { updateCandidateStatus, fetchAllStatuses } from "@/services/statusService";
// import SummaryModal from "./SummaryModal";
// import { supabase } from "@/integrations/supabase/client";
// import { updateCandidateValidationStatus } from "@/services/candidateService";

// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger, TabsList1, TabsTrigger1 } from "@/components/ui/tabs";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { 
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
//   SelectGroup,
//   SelectLabel,
// } from '@/components/ui/select';
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import EmployeeProfileDrawer from "@/components/MagicLinkView/EmployeeProfileDrawer";
// import moment from 'moment';
// import { getRoundNameFromResult } from "@/utils/statusTransitionHelper";


// interface CandidatesListProps {
//   jobId: string;
//   jobdescription: string;
//   statusFilter?: string;
//   statusFilters?: string[];
//   onAddCandidate?: () => void;
//   onRefresh: () => Promise<void>;
//   isCareerPage?: boolean;
// }

// const CandidatesList = ({
//   jobId,
//   statusFilter,
//   statusFilters = [],
//   onAddCandidate,
//   jobdescription,
//   onRefresh,
//   isCareerPage = false
// }: CandidatesListProps) => {
//   const user = useSelector((state: any) => state.auth.user);
//   const organizationId = useSelector((state: any) => state.auth.organization_id);
//     const userRole = useSelector((state: any) => state.auth.role);
//     const isEmployee = userRole === 'employee';

//   const { data: candidatesData = [], isLoading, refetch } = useQuery({
//     queryKey: ["job-candidates", jobId],
//     queryFn: () => getCandidatesByJobId(jobId),
//   });

//   const { data: appliedCandidates = [] } = useQuery({
//     queryKey: ["applied-candidates", jobId],
//     queryFn: () => getCandidatesByJobId(jobId, "Applied"),
//   });


//   const [candidates, setCandidates] = useState<Candidate[]>([]);
//   const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
//   const [activeTab, setActiveTab] = useState("All Candidates");
//   const [analysisData, setAnalysisData] = useState(null);
//   const [candidateAnalysisData, setCandidateAnalysisData] = useState<{ [key: number]: any }>({});
//   const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
//   const [analysisDataAvailable, setAnalysisDataAvailable] = useState<{
//     [key: number]: boolean;
//   }>({});

//   const [isDrawerOpen, setIsDrawerOpen] = useState(false);
//   const [selectedDrawerCandidate, setSelectedDrawerCandidate] = useState<Candidate | null>(null);

//   const [showInterviewModal, setShowInterviewModal] = useState(false);
//   const [showInterviewFeedbackModal, setShowInterviewFeedbackModal] = useState(false);
//   const [showJoiningModal, setShowJoiningModal] = useState(false);
//   const [showRejectModal, setShowRejectModal] = useState(false);
//   const [interviewDate, setInterviewDate] = useState("");
//   const [interviewTime, setInterviewTime] = useState("");
//   const [interviewLocation, setInterviewLocation] = useState("Virtual");
//   const [interviewType, setInterviewType] = useState("Technical");
//   const [interviewerName, setInterviewerName] = useState("");
//   const [interviewFeedback, setInterviewFeedback] = useState("");
//   const [interviewResult, setInterviewResult] = useState("selected");
//   const [ctc, setCtc] = useState("");
//   const [joiningDate, setJoiningDate] = useState("");
//   const [rejectReason, setRejectReason] = useState("");
//   const [rejectType, setRejectType] = useState("internal");
//   const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
//   const [currentSubStatusId, setCurrentSubStatusId] = useState<string | null>(null);
//   const [currentRound, setCurrentRound] = useState<string | null>(null);
//   const [needsReschedule, setNeedsReschedule] = useState(false);
  

//   // Pagination States
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);

//   // New state to track visibility of contact details
//   const [visibleContacts, setVisibleContacts] = useState<{
//     [key: string]: { email: boolean; phone: boolean };
//   }>({});


//   console.log("filtered resumes", filteredCandidates);

//   const {
//     data: job,
//     isLoading: jobLoading,
//     refetch: refetchJob,
//   } = useQuery({
//     queryKey: ["job", jobId],
//     queryFn: () => getJobById(jobId || ""),
//     enabled: !!jobId,
//   });

//   const [validatingId, setValidatingId] = useState<number | null>(null);
//   const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
//   const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

//   const recruitmentStages = ["New", "InReview", "Engaged", "Available", "Offered", "Hired"];

//   // useEffect(() => {
//   //   setFilteredCandidates(candidatesData);
//   //   const checkAnalysisData = async () => {
//   //     const { data, error } = await supabase
//   //       .from("hr_job_candidates")
//   //       .select("candidate_id, overall_summary, overall_score")
//   //       .eq("job_id", jobId)
//   //       .not("overall_summary", "is", null);
      
//   //     if (error) {
//   //       console.error("Error checking analysis data:", error);
//   //       return;
//   //     }

//   //     const availableData: { [key: number]: boolean } = {};
//   //     const analysisDataTemp: { [key: number]: any } = {};
//   //     data.forEach((item) => {
//   //       availableData[item.candidate_id] = true;
//   //       analysisDataTemp[item.candidate_id] = { overall_score: item.overall_score };
//   //     });

//   //     setAnalysisDataAvailable(availableData);
//   //     setCandidateAnalysisData((prev) => ({ ...prev, ...analysisDataTemp }));
//   //   };

//   //   checkAnalysisData();
//   // }, [jobId]);

//   // const fetchAnalysisData = async (candidateId: number) => {
//   //   try {
//   //     const { data, error } = await supabase
//   //       .from("hr_job_candidates")
//   //       .select(`
//   //         overall_score,
//   //         skills_score,
//   //         skills_summary,
//   //         skills_enhancement_tips,
//   //         work_experience_score,
//   //         work_experience_summary,
//   //         work_experience_enhancement_tips,
//   //         projects_score,
//   //         projects_summary,
//   //         projects_enhancement_tips,
//   //         education_score,
//   //         education_summary,
//   //         education_enhancement_tips,
//   //         overall_summary,
//   //         report_url
//   //       `)
//   //       .eq("job_id", jobId)
//   //       .eq("candidate_id", candidateId)
//   //       .single();

//   //     if (error) throw error;

//   //     setAnalysisData(data);
//   //     setCandidateAnalysisData((prev) => ({
//   //       ...prev,
//   //       [candidateId]: data,
//   //     }));
//   //     setAnalysisDataAvailable((prev) => ({
//   //       ...prev,
//   //       [candidateId]: true,
//   //     }));
//   //     setIsSummaryModalOpen(true);
//   //   } catch (error) {
//   //     console.error("Error fetching analysis data:", error);
//   //     toast.error("Failed to fetch candidate analysis.");
//   //     setAnalysisDataAvailable((prev) => ({
//   //       ...prev,
//   //       [candidateId]: false,
//   //     }));
//   //   }
//   // };


//   useEffect(() => {
//     setFilteredCandidates(candidatesData);

//     const checkAnalysisData = async () => {
//       const { data, error } = await supabase
//         .from("candidate_resume_analysis")
//         .select("candidate_id, summary, overall_score")
//         .eq("job_id", jobId)
//         .not("summary", "is", null);

//       if (error) {
//         console.error("Error checking analysis data:", error);
//         return;
//       }

//       const availableData: { [key: string]: boolean } = {};
//       const analysisDataTemp: { [key: string]: any } = {};
//       data.forEach((item) => {
//         availableData[item.candidate_id] = true;
//         analysisDataTemp[item.candidate_id] = { overall_score: item.overall_score };
//       });

//       setAnalysisDataAvailable(availableData);
//       setCandidateAnalysisData((prev) => ({ ...prev, ...analysisDataTemp }));
//     };

//     checkAnalysisData();
//   }, [candidatesData, jobId]);

//   const fetchAnalysisData = async (candidateId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("candidate_resume_analysis")
//         .select("overall_score, summary, top_skills, missing_or_weak_areas")
//         .eq("job_id", jobId)
//         .eq("candidate_id", candidateId)
//         .single();

//       if (error) throw error;

//       setAnalysisData({
//         overall_score: data.overall_score || 0,
//         summary: data.summary || "",
//         top_skills: data.top_skills || [],
//         missing_or_weak_areas: data.missing_or_weak_areas || [],
//       });
//       setCandidateAnalysisData((prev) => ({
//         ...prev,
//         [candidateId]: {
//           overall_score: data.overall_score || 0,
//           summary: data.summary || "",
//           top_skills: data.top_skills || [],
//           missing_or_weak_areas: data.missing_or_weak_areas || [],
//         },
//       }));
//       setAnalysisDataAvailable((prev) => ({
//         ...prev,
//         [candidateId]: true,
//       }));
//       setIsSummaryModalOpen(true);
//     } catch (error) {
//       console.error("Error fetching analysis data:", error);
//       toast.error("Failed to fetch candidate analysis.");
//       setAnalysisDataAvailable((prev) => ({
//         ...prev,
//         [candidateId]: false,
//       }));
//     }
//   };

//   useEffect(() => {
//     if (candidatesData.length > 0) {
//       const transformedCandidates: Candidate[] = candidatesData.map((candidate) => {
       
       
//         return {
//           id: candidate.id,
//           name: candidate.name,
//           experience: candidate.experience || "",
//           matchScore: candidate.matchScore || 0,
//           appliedDate: candidate.appliedDate,
//           skills: candidate.skillRatings || candidate.skills || [],
//           email: candidate.email,
//           phone: candidate.phone,
//           resume: candidate.resumeUrl,
//           appliedFrom: candidate.appliedFrom,
//           currentSalary: candidate.currentSalary,
//           expectedSalary: candidate.expectedSalary,
//           location: candidate.location,
//           metadata: candidate.metadata,
//           skill_ratings: candidate.skillRatings,
//           status: candidate.status || "New",
//           currentStage: candidate.main_status?.name || "New",
//           createdAt: candidate.created_at,
         
//           hasValidatedResume: candidate.hasValidatedResume || false,
          
//           main_status: candidate.main_status,
//           sub_status: candidate.sub_status,
//           main_status_id: candidate.main_status_id,
//           sub_status_id: candidate.sub_status_id,
//         };
//       });

//       setCandidates(transformedCandidates);
//     }
//   }, [candidatesData]);

  

//   const setDefaultStatusForCandidate = async (candidateId: string) => {
//     try {
//       const statuses = await fetchAllStatuses();
//       const newStatus = statuses.find(s => s.name === "New");
//       if (newStatus?.subStatuses?.length) {
//         const defaultSubStatus = newStatus.subStatuses.find(s => s.name === "New Application") || newStatus.subStatuses[0];
        
//         await updateCandidateStatus(candidateId, defaultSubStatus.id, user?.id);
//         console.log(`Set default status for candidate ${candidateId}`);
//       }
//     } catch (error) {
//       console.error("Error setting default status:", error);
//     }
//   };



//   useEffect(() => {
//     let filtered = [...candidates];
    
//     if (activeTab === "All Candidates") {
//       filtered = filtered.filter(c => c.main_status?.name !== "Applied" || c.created_by);
//     } else if (activeTab === "Applied") {
//       filtered = appliedCandidates;
//     } else {
//       filtered = filtered.filter(c => c.main_status?.name === activeTab);
//     }
    
//     if (statusFilters && statusFilters.length > 0) {
//       filtered = filtered.filter(c => 
//         statusFilters.includes(c.main_status_id || '') || 
//         statusFilters.includes(c.sub_status_id || '')
//       );
//     }
    
//     if (statusFilter) {
//       filtered = filtered.filter(c => c.main_status?.name === statusFilter);
//     }
    
//     if (isCareerPage) {
//       filtered = filtered.filter(c => c.appliedFrom === "Candidate");
//     }
    
//     setFilteredCandidates(filtered);
//   }, [candidates, appliedCandidates, activeTab, statusFilters, statusFilter, isCareerPage]);

//   const handleStatusChange = async (value: string, candidate: Candidate) => {
//     try {
//       if (!value) {
//         toast.error("Invalid status selected");
//         return;
//       }

//       const statuses = await fetchAllStatuses();
//       const subStatuses = statuses.flatMap(s => s.subStatuses || []);
//       const newSubStatus = subStatuses.find(s => s.id === value);
      
//       if (!newSubStatus) {
//         toast.error("Status not found");
//         return;
//       }
      
//       const newMainStatus = statuses.find(s => s.id === newSubStatus.parent_id);
//       const oldSubStatusName = candidate.sub_status?.name;
      
//       setCurrentCandidateId(candidate.id);
//       setCurrentSubStatusId(value);

//       const { getRequiredInteractionType, getInterviewRoundName } = await import('@/utils/statusTransitionHelper');
//       const interactionType = getRequiredInteractionType(oldSubStatusName, newSubStatus.name); // Fixed: Use newSubStatus.name
      
//       if (interactionType === 'interview-schedule' || interactionType === 'reschedule') {
//         const roundName = getInterviewRoundName(newSubStatus.name);
//         setCurrentRound(roundName);
//         setNeedsReschedule(interactionType === 'reschedule');

//         // Load existing interview details for the round
//         const { data: interviews, error } = await supabase
//           .from('hr_candidate_interviews')
//           .select('*')
//           .eq('candidate_id', candidate.id)
//           .eq('interview_round', roundName)
//           .order('created_at', { ascending: false })
//           .limit(1);
          
//         if (error) {
//           console.error("Error fetching interview:", error);
//           toast.error("Failed to load interview details");
//           return;
//         }

//         if (interviews && interviews.length > 0) {
//           const interview = interviews[0];
//           setInterviewDate(interview.interview_date || '');
//           setInterviewTime(interview.interview_time || '');
//           setInterviewLocation(interview.location || 'Virtual');
//           setInterviewType(interview.interview_type || 'Technical');
//           setInterviewerName(interview.interviewers?.[0]?.name || '');
//         } else {
//           // Reset fields for new scheduling
//           setInterviewDate('');
//           setInterviewTime('');
//           setInterviewLocation('Virtual');
//           setInterviewType('Technical');
//           setInterviewerName('');
//         }

//         setShowInterviewModal(true);
//         return;
//       }
      
//       if (interactionType === 'interview-feedback') {
//         const roundName = getRoundNameFromResult(newSubStatus.name);
//         if (roundName) {
//           setCurrentRound(roundName);
//           setInterviewResult(newSubStatus.name.includes('Selected') ? 'selected' : 'rejected');
//           setShowInterviewFeedbackModal(true);
//           return;
//         }
//       }
      
//       if (interactionType === 'joining') {
//         setShowJoiningModal(true);
//         return;
//       }
      
//       if (interactionType === 'reject') {
//         setShowRejectModal(true);
//         return;
//       }
      
//       updateCandidateStatus(candidate.id, value, user?.id)
//         .then(success => {
//           if (success) {
//             toast.success("Status updated successfully");
//             onRefresh();
//           } else {
//             toast.error("Failed to update status");
//           }
//         })
//         .catch(error => {
//           console.error("Error updating status:", error);
//           toast.error("Failed to update status");
//         });
//     } catch (error) {
//       console.error("Error in handleStatusChange:", error);
//       toast.error("Failed to update status");
//     }
//   };


//   const handleValidateResume = async (candidateId: number) => {
//     try {
//       setValidatingId(candidateId);
//       const candidate = filteredCandidates.find((c) => c.id === candidateId);
//       if (!candidate) return;
  
//       const resumeUrlParts = candidate.resume.split("candidate_resumes/");
//       const extractedResumeUrl = resumeUrlParts.length > 1 ? resumeUrlParts[1] : candidate.resume;
  
//       const payload = {
//         job_id: jobId,
//         candidate_id: candidateId.toString(),
//         resume_url: extractedResumeUrl,
//         job_description: jobdescription,
//       };
  
//       console.log("Backend data", payload);
  
//       // Step 1: Trigger the validation process
//       const response = await fetch("/api/proxy", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(payload),
//       });
  
//       if (!response.ok) {
//         throw new Error("Validation failed");
//       }
  
//       // Step 2: Poll the backend for the overall_score
//       let overallScore = null;
//       let attempts = 0;
//       const maxAttempts = 20; // Adjust based on expected max time (e.g., 20 attempts * 5 seconds = 100 seconds)
//       const interval = 5000; // Poll every 5 seconds
  
//       while (!overallScore && attempts < maxAttempts) {
//         const { data, error } = await supabase
//           .from("hr_job_candidates")
//           .select("overall_score")
//           .eq("job_id", jobId)
//           .eq("candidate_id", candidateId)
//           .single();
  
//         if (error && error.code !== "PGRST116") {
//           // Ignore "no rows found" error (PGRST116)
//           throw error;
//         }
  
//         if (data && data.overall_score !== null) {
//           overallScore = data.overall_score;
//           break;
//         }
  
//         // Wait for the next polling interval
//         await new Promise((resolve) => setTimeout(resolve, interval));
//         attempts++;
//       }
  
//       if (!overallScore) {
//         throw new Error("Overall score not set within the expected time");
//       }
  
//       // Step 3: Update the backend with has_validated_resume = true
//       await updateCandidateValidationStatus(candidateId.toString());
  
//       // Step 4: Refetch the candidates data to reflect the updated status
//       await refetch();
  
//       // Step 5: Update local state (optional, since refetch will handle it)
//       const candidateIndex = filteredCandidates.findIndex((c) => c.id === candidateId);
//       if (candidateIndex !== -1) {
//         filteredCandidates[candidateIndex].hasValidatedResume = true;
//         setFilteredCandidates([...filteredCandidates]);
//         setAnalysisDataAvailable((prev) => ({
//           ...prev,
//           [candidateId]: true,
//         }));
//         toast.success("Resume validated successfully!");
//         await fetchAnalysisData(candidateId);
//       }
//     } catch (error) {
//       toast.error("Failed to validate resume");
//       console.error("Validation error:", error);
//     } finally {
//       setValidatingId(null);
//     }
//   };

//   const handleViewResume = (candidateId: number) => {
//     const candidate = filteredCandidates.find((c) => c.id === candidateId);
//     if (candidate?.resume) {
//       window.open(candidate.resume, "_blank");
//     } else {
//       toast.error("Resume not available");
//     }
//   };


//   const handleEditCandidate = (candidate: Candidate) => {
//     console.log("Editing candidate:", candidate);
//     setSelectedCandidate(candidate);
//     setIsEditDrawerOpen(true);
//   };

//   const handleCandidateUpdated = () => {
//     setIsEditDrawerOpen(false);
//     setSelectedCandidate(null);
//     refetch();
//     toast.success("Candidate updated successfully");
//   };

  
//   const handleInterviewSubmit = async () => {
//     if (!currentCandidateId || !currentSubStatusId || !currentRound) return;
    
//     const interviewData = {
//       interview_date: interviewDate,
//       interview_time: interviewTime,
//       interview_location: interviewLocation,
//       interview_type: interviewType,
//       interviewer_name: interviewerName,
//       round: currentRound
//     };
    
//     try {
//       // Check if an interview exists for this round
//       const { data: existingInterviews, error: fetchError } = await supabase
//         .from('hr_candidate_interviews')
//         .select('*')
//         .eq('candidate_id', currentCandidateId)
//         .eq('interview_round', currentRound)
//         .order('created_at', { ascending: false })
//         .limit(1);
      
//       if (fetchError) throw fetchError;

//       if (needsReschedule && existingInterviews && existingInterviews.length > 0) {
//         // Update existing interview
//         const { error } = await supabase
//           .from('hr_candidate_interviews')
//           .update({
//             interview_date: interviewDate,
//             interview_time: interviewTime,
//             location: interviewLocation,
//             interview_type: interviewType,
//             interviewers: [{ name: interviewerName }],
//             status: 'scheduled',
//             updated_by: user.id,
//             updated_at: new Date().toISOString()
//           })
//           .eq('id', existingInterviews[0].id);
          
//         if (error) throw error;
//       } else {
//         // Insert new interview
//         const { error } = await supabase
//           .from('hr_candidate_interviews')
//           .insert({
//             candidate_id: currentCandidateId,
//             interview_date: interviewDate,
//             interview_time: interviewTime,
//             location: interviewLocation,
//             interview_type: interviewType,
//             interview_round: currentRound,
//             interviewers: [{ name: interviewerName }],
//             status: 'scheduled',
//             created_by: user.id
//           });
          
//         if (error) throw error;
//       }
      
//       await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, interviewData);
      
//       setShowInterviewModal(false);
//       resetInterviewForm();
//       await onRefresh();
//       toast.success(needsReschedule ? "Interview rescheduled successfully" : "Interview scheduled successfully");
//     } catch (error) {
//       console.error("Error scheduling/rescheduling interview:", error);
//       toast.error("Failed to schedule/reschedule interview");
//     }
//   };

//   const handleInterviewFeedbackSubmit = async () => {
//     if (!currentCandidateId || !currentSubStatusId || !currentRound) return;
    
//     const feedbackData = {
//       interview_feedback: interviewFeedback,
//       interview_result: interviewResult,
//       round: currentRound
//     };
    
//     const { data: interviews, error: interviewError } = await supabase
//       .from('hr_candidate_interviews')
//       .select('*')
//       .eq('candidate_id', currentCandidateId)
//       .eq('interview_round', currentRound)
//       .order('created_at', { ascending: false })
//       .limit(1);
      
//     if (interviewError) {
//       console.error("Error fetching interview:", interviewError);
//       toast.error("Failed to fetch interview details");
//       return;
//     }
    
//     if (interviews && interviews.length > 0) {
//       const { error } = await supabase
//         .from('hr_candidate_interviews')
//         .update({
//           feedback: {
//             result: interviewResult === 'selected' ? 'Selected' : 'Rejected',
//             comments: interviewFeedback,
//             updated_by: user.id,
//             updated_at: new Date().toISOString()
//           },
//           status: interviewResult === 'selected' ? 'completed' : 'rejected'
//         })
//         .eq('id', interviews[0].id);
        
//       if (error) {
//         console.error("Error updating interview:", error);
//         toast.error("Failed to update interview feedback");
//         return;
//       }
//     }
    
//     await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, feedbackData);
      
//     setShowInterviewFeedbackModal(false);
//     setInterviewFeedback('');
//     setInterviewResult('selected');
//     await onRefresh();
//     toast.success("Interview feedback saved");
//   };



//   const handleJoiningSubmit = async () => {
//     if (!currentCandidateId || !currentSubStatusId) return;
    
//     const joiningData = {
//       ctc,
//       joining_date: joiningDate
//     };
    
//     try {
//       const { data: existingDetails, error: fetchError } = await supabase
//         .from('hr_candidate_joining_details')
//         .select('*')
//         .eq('candidate_id', currentCandidateId)
//         .maybeSingle();
        
//       if (fetchError && !fetchError.message.includes('No rows found')) {
//         throw fetchError;
//       }
      
//       if (existingDetails) {
//         const { error } = await supabase
//           .from('hr_candidate_joining_details')
//           .update({
//             joining_date: joiningDate,
//             final_salary: parseFloat(ctc),
//             updated_at: new Date().toISOString()
//           })
//           .eq('id', existingDetails.id);
          
//         if (error) throw error;
//       } else {
//         const { error } = await supabase
//           .from('hr_candidate_joining_details')
//           .insert({
//             candidate_id: currentCandidateId,
//             joining_date: joiningDate,
//             final_salary: parseFloat(ctc),
//             created_by: user.id,
//             onboarding_status: 'pending'
//           });
          
//         if (error) throw error;
//       }
      
//       await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, joiningData);
      
//       setShowJoiningModal(false);
//       setCtc('');
//       setJoiningDate('');
//       await onRefresh();
//       toast.success("Joining details saved");
//     } catch (error) {
//       console.error("Error saving joining details:", error);
//       toast.error("Failed to save joining details");
//     }
//   };

//   const handleRejectSubmit = async () => {
//     if (!currentCandidateId || !currentSubStatusId) return;
    
//     const rejectData = {
//       reject_reason: rejectReason,
//       reject_type: rejectType
//     };
    
//     await updateCandidateStatus(currentCandidateId, currentSubStatusId, user.id, rejectData);
    
//     setShowRejectModal(false);
//     setRejectReason('');
//     setRejectType('internal');
//     await onRefresh();
//     toast.success("Candidate rejected");
//   };

//   const resetInterviewForm = () => {
//     setInterviewDate('');
//     setInterviewTime('');
//     setInterviewLocation('Virtual');
//     setInterviewType('Technical');
//     setInterviewerName('');
//     setCurrentRound(null);
//     setNeedsReschedule(false);
//   };

//   const handleAddToJob = async (candidateId: string) => {
//     try {
//       toast.success("Candidate added to job");
//       await onRefresh();
//     } catch (error) {
//       toast.error("Failed to add candidate to job");
//     }
//   };


//   if (isLoading || jobLoading) {
//     return (
//       <div className="flex justify-center py-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   const getTabCount = (tabName: string) => {
//     if (tabName === "All Candidates") return candidates.filter(c => c.main_status?.name !== "Applied" || c.created_by).length;
//     if (tabName === "Applied") return appliedCandidates.length;
//     return candidates.filter(c => c.main_status?.name === tabName).length;
//   };

//   // Pagination logic
//   const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const paginatedCandidates = filteredCandidates.slice(
//     startIndex,
//     startIndex + itemsPerPage
//   );

//   // Handle items per page change
//   const handleItemsPerPageChange = (value: string) => {
//     setItemsPerPage(Number(value));
//     setCurrentPage(1); // Reset to first page when changing items per page
//   };

//   // Pagination component
//   const renderPagination = () => {
//     return (
//       <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
//         <div className="flex items-center gap-2">
//           <span className="text-sm text-gray-600">Show</span>
//           <Select
//             value={itemsPerPage.toString()}
//             onValueChange={handleItemsPerPageChange}
//           >
//             <SelectTrigger className="w-[70px]">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="5">5</SelectItem>
//               <SelectItem value="10">10</SelectItem>
//               <SelectItem value="20">20</SelectItem>
//               <SelectItem value="50">50</SelectItem>
//             </SelectContent>
//           </Select>
//           <span className="text-sm text-gray-600">per page</span>
//         </div>

//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//             disabled={currentPage === 1}
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </Button>

//           <div className="flex items-center gap-1">
//             {Array.from({ length: totalPages }, (_, i) => i + 1)
//               .slice(
//                 Math.max(0, currentPage - 3),
//                 Math.min(totalPages, currentPage + 2)
//               )
//               .map((page) => (
//                 <Button
//                   key={page}
//                   variant={currentPage === page ? "default" : "outline"}
//                   size="sm"
//                   onClick={() => setCurrentPage(page)}
//                 >
//                   {page}
//                 </Button>
//               ))}
//           </div>

//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() =>
//               setCurrentPage((prev) => Math.min(prev + 1, totalPages))
//             }
//             disabled={currentPage === totalPages}
//           >
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>

//         <span className="text-sm text-gray-600">
//           Showing {startIndex + 1} to{" "}
//           {Math.min(startIndex + itemsPerPage, filteredCandidates.length)} of{" "}
//           {filteredCandidates.length} candidates
//         </span>
//       </div>
//     );
//   };


//   // Toggle visibility of contact details
//   const toggleContactVisibility = (
//     candidateId: string,
//     field: "email" | "phone"
//   ) => {
//     setVisibleContacts((prev) => ({
//       ...prev,
//       [candidateId]: {
//         ...prev[candidateId],
//         [field]: !prev[candidateId]?.[field],
//       },
//     }));
//   };

//   // Copy contact details to clipboard
//   const copyToClipboard = (text: string, field: string) => {
//     navigator.clipboard.writeText(text).then(() => {
//       toast.success(`${field} copied to clipboard`);
//     }).catch(() => {
//       toast.error(`Failed to copy ${field}`);
//     });
//   };

//   // Reusable component for hidden/contact cells
//   const HiddenContactCell = ({ email, phone, candidateId }: HiddenContactCellProps) => {
//     const [justCopiedEmail, setJustCopiedEmail] = useState(false);
//     const [justCopiedPhone, setJustCopiedPhone] = useState(false);
  
//     const copyToClipboard = (value: string, field: "Email" | "Phone") => {
//       navigator.clipboard.writeText(value);
//       if (field === "Email") {
//         setJustCopiedEmail(true);
//         setTimeout(() => setJustCopiedEmail(false), 2000);
//       } else {
//         setJustCopiedPhone(true);
//         setTimeout(() => setJustCopiedPhone(false), 2000);
//       }
//     };
  
//     if (!email && !phone) {
//       return <TableCell className="text-muted-foreground">N/A</TableCell>;
//     }
  
//     return (
//       <TableCell>
//         <div className="flex items-center gap-2">
//           {email && (
//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   aria-label="View email"
//                   className="p-0 h-6 w-6"
//                 >
//                   <Mail className="h-5 w-5" />
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent
//                 className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
//                 side="top"
//                 align="center"
//                 sideOffset={8}
//                 collisionPadding={10}
//               >
//                 <Mail className="h-4 w-4 flex-shrink-0" />
//                 <span className="text-sm truncate flex-1">{email}</span>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => copyToClipboard(email, "Email")}
//                   className="h-6 w-6 p-0 flex-shrink-0"
//                   aria-label="Copy email"
//                 >
//                   {justCopiedEmail ? (
//                     <Check className="h-4 w-4 text-green-500" />
//                   ) : (
//                     <Copy className="h-4 w-4" />
//                   )}
//                 </Button>
//               </PopoverContent>
//             </Popover>
//           )}
//           {phone && (
//             <Popover>
//               <PopoverTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   aria-label="View phone"
//                   className="p-0 h-6 w-6"
//                 >
//                   <Phone className="h-5 w-5" />
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent
//                 className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
//                 side="top"
//                 align="center"
//                 sideOffset={8}
//                 collisionPadding={10}
//               >
//                 <Phone className="h-4 w-4 flex-shrink-0" />
//                 <span className="text-sm truncate flex-1">{phone}</span>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => copyToClipboard(phone, "Phone")}
//                   className="h-6 w-6 p-0 flex-shrink-0"
//                   aria-label="Copy phone"
//                 >
//                   {justCopiedPhone ? (
//                     <Check className="h-4 w-4 text-green-500" />
//                   ) : (
//                     <Copy className="h-4 w-4" />
//                   )}
//                 </Button>
//               </PopoverContent>
//             </Popover>
//           )}
//           {!email && !phone && (
//             <span className="text-sm text-muted-foreground">No contact info</span>
//           )}
//         </div>
//       </TableCell>
//     );
//   };

//   return (
//     <>
// <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//   <TabsList1 className="grid grid-cols-7 mb-4">
//     <TabsTrigger1 value="All Candidates" className="relative">
//       All Candidates
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-4 w-4 flex items-center justify-center ${
//           activeTab === "All Candidates"
//             ? "bg-white purple-text-color"
//             : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("All Candidates")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="Applied" className="relative">
//       Applied
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "Applied" ? "bg-white purple-text-color" : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("Applied")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="New" className="relative">
//       New
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "New" ? "bg-white purple-text-color" : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("New")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="Processed" className="relative">
//       Processed
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "Processed"
//             ? "bg-white purple-text-color"
//             : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("Processed")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="Interview" className="relative">
//       Interview
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "Interview"
//             ? "bg-white purple-text-color"
//             : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("Interview")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="Offered" className="relative">
//       Offered
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "Offered" ? "bg-white purple-text-color" : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("Offered")}
//       </span>
//     </TabsTrigger1>
//     <TabsTrigger1 value="Joined" className="relative">
//       Joined
//       <span
//         className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
//           activeTab === "Joined" ? "bg-white purple-text-color" : "bg-purple text-white"
//         }`}
//       >
//         {getTabCount("Joined")}
//       </span>
//     </TabsTrigger1>
//   </TabsList1>
// </Tabs>


//       {filteredCandidates.length === 0 ? (
//         <EmptyState onAddCandidate={async () => {
//           try {
//             const statuses = await fetchAllStatuses();
//             const newStatus = statuses.find(s => s.name === "New");
//             if (newStatus?.subStatuses?.length) {
//               await supabase.from("hr_job_candidates").insert({
//                 job_id: jobId,
//                 main_status_id: newStatus.id,
//                 sub_status_id: newStatus.subStatuses[0].id,
//                 created_by: user.id,
//                 owner: user.id,
//                 name: "New Candidate",
//                 applied_date: new Date().toISOString().split('T')[0],
//                 skills: []
//               });
//               await onRefresh();
//               toast.success("New candidate added successfully");
//             } else {
//               toast.error("Could not find New status");
//             }
//           } catch (error) {
//             console.error("Error adding new candidate:", error);
//             toast.error("Failed to add new candidate");
//           }
//         }} />
//       ) : (

//       <div className="rounded-md border">
//         <Table>
//         <TableHeader>
//   <TableRow className="bg-muted/50">
//     <TableHead className="w-[150px] sm:w-[200px]">Candidate Name</TableHead>
//     <TableHead className="w-[100px] sm:w-[150px]">Owner</TableHead>
//     <TableHead className="w-[50px] sm:w-[100px]">
//       {/* <span className="flex items-center gap-1"> */}
//         {/* <Contact className="h-3 w-3 sm:h-4 sm:w-4" /> */}
//          Contact Info
//       {/* </span> */}
//     </TableHead>
//     {/* <TableHead className="w-[50px] sm:w-[100px]">
//       <span className="flex items-center gap-1">
//         <Phone className="h-3 w-3 sm:h-4 sm:w-4" /> Phone
//       </span>
//     </TableHead> */}
//     {!isEmployee && <TableHead className="w-[80px] sm:w-[100px]">Profit</TableHead>}
//     <TableHead className="w-[120px] sm:w-[150px]">Stage Progress</TableHead>
//    <TableHead className="w-[100px] sm:w-[120px]">Status</TableHead>
//     <TableHead className="w-[80px] sm:w-[100px]">Validate</TableHead>
//     {activeTab === "Applied" && <TableHead className="w-[80px] sm:w-[100px]">Action</TableHead>}
//     <TableHead className="w-[50px] sm:w-[60px]">Action</TableHead>
//     {/* <TableHead className="w-[50px]"></TableHead> */}
//   </TableRow>
// </TableHeader>
//           <TableBody>
//             {paginatedCandidates.map((candidate) => (
//               <TableRow key={candidate.id}>
//                 <TableCell className="font-medium">
//                 <div
//           className="flex flex-col cursor-pointer"
//           onClick={() => {
//             setSelectedDrawerCandidate(candidate); // Set the selected candidate
//             setIsDrawerOpen(true); // Open the drawer
//           }}
//         >
//           <span>{candidate.name}</span>
//           <span className="text-xs text-muted-foreground">
//   {moment(candidate.createdAt).format("DD MMM YYYY")} (
//   {moment(candidate.createdAt).fromNow()})
// </span>
//         </div>
//                 </TableCell>
//                 <TableCell>{candidate.owner || candidate.appliedFrom}</TableCell>
//                 <HiddenContactCell
//         email={candidate.email}
//         phone={candidate.phone}
//         candidateId={candidate.id}
//       />
//                 {!isEmployee &&  <TableCell>{candidate.profit || "N/A"}</TableCell>}
//                 <TableCell>
//                   <div className="truncate">
//                     <ProgressColumn
//                       progress={candidate.progress}
//                       mainStatus={candidate.main_status}
//                       subStatus={candidate.sub_status}
//                     />
//                   </div>
//                 </TableCell>
//                <TableCell>
               
//                   <StatusSelector
//                       value={candidate.sub_status_id || ""}
//                       onChange={(value) => handleStatusChange(value, candidate)}
//                       className="h-7 text-xs w-full"
//                       disableNextStage={candidate.sub_status?.name?.includes('Reject')}
//                     />
               
//                 </TableCell> 
//                 <TableCell className="px-2">
//   <div className="flex items-center gap-2">
//     <ValidateResumeButton
//       isValidated={candidate.hasValidatedResume || false}
//       candidateId={candidate.id}
//       onValidate={handleValidateResume}
//       isLoading={validatingId === candidate.id}
//       overallScore={candidateAnalysisData[candidate.id]?.overall_score}
//     />
//     {analysisDataAvailable[candidate.id] && (
//       <Button
//         variant="ghost"
//         size="xs"
//         onClick={() => fetchAnalysisData(candidate.id)}
//         title="View Summary Report"
//         className="p-1"
//       >
//         <FileText className="h-4 w-4" />
//       </Button>
//     )}
//   </div>
// </TableCell>

// {activeTab === "Applied" && (
//                     <TableCell>
//                       <Button size="sm" variant="outline" onClick={() => handleAddToJob(candidate.id)}>
//                         Add to Job
//                       </Button>
//                     </TableCell>
//                   )}

//                 <TableCell className="text-right">
//                   <div className="flex gap-1 justify-start">
//                     {/* <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => handleViewProfile(candidate.id)}
//                       title="View Profile"
//                     >
//                       <User className="h-4 w-4" />
//                     </Button>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => handleScheduleInterview(candidate.id)}
//                       title="Schedule Interview"
//                     >
//                       <Calendar className="h-4 w-4" />
//                     </Button>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => handleCall(candidate.id)}
//                       title="Call"
//                     >
//                       <Phone className="h-4 w-4" />
//                     </Button> */}
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => handleViewResume(candidate.id)}
//                       title="View Resume"
//                     >
//                       <Eye className="h-4 w-4" />
//                     </Button>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => {
//                         if (candidate.resume) {
//                           const link = document.createElement('a');
//                           link.href = candidate.resume;
//                           link.download = `${candidate.name}_resume.pdf`;
//                           link.click();
//                         } else {
//                           toast.error("Resume not available for download");
//                         }
//                       }}
//                       title="Download Resume"
//                     >
//                       <Download className="h-4 w-4" />
//                     </Button>
//                     <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => handleEditCandidate(candidate)}
//                   >
//                     <Pencil className="h-4 w-4" />
//                   </Button>
                   
//                   </div>
//                 </TableCell>
//                 {/* <TableCell>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => handleEditCandidate(candidate)}
//                   >
//                     <Pencil className="h-4 w-4" />
//                   </Button>
//                 </TableCell> */}
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </div>
//       )}
//         {filteredCandidates.length > 0 && renderPagination()}


//       {selectedCandidate && (
//         <EditCandidateDrawer
//           job={{
//             id: jobId,
//             skills: selectedCandidate.skills.map((s) => (typeof s === "string" ? s : s.name)),
//             organization_id: organizationId,
//           } as any}
//           onCandidateAdded={handleCandidateUpdated}
//           candidate={selectedCandidate}
//           open={isEditDrawerOpen}
//           onOpenChange={setIsEditDrawerOpen}
//         />
//       )}

//       {isSummaryModalOpen && analysisData && (
//         <SummaryModal
//           analysisData={analysisData}
//           onClose={() => setIsSummaryModalOpen(false)}
//         />
//       )}

// <EmployeeProfileDrawer 
//        open={isDrawerOpen}
//        onClose={() => {
//          setIsDrawerOpen(false);
//          setSelectedDrawerCandidate(null); // Reset selected candidate when closing
//        }}
//        candidate={selectedDrawerCandidate}
//       />

//   {/* Interview Scheduling/Rescheduling Dialog */}
//   <Dialog open={showInterviewModal} onOpenChange={setShowInterviewModal}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle>{needsReschedule ? 'Reschedule' : 'Schedule'} {currentRound} Interview</DialogTitle>
//             <DialogDescription>
//               Enter the details for the interview session.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="grid gap-4 py-4">
//             <div className="grid grid-cols-4 items-center gap-4">
//               <Label className="text-right" htmlFor="date">Date</Label>
//               <input 
//                 id="date" 
//                 type="date" 
//                 value={interviewDate} 
//                 onChange={e => setInterviewDate(e.target.value)} 
//                 className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//                 required
//               />
//             </div>
//             <div className="grid grid-cols-4 items-center gap-4">
//               <Label className="text-right" htmlFor="time">Time</Label>
//               <input 
//                 id="time" 
//                 type="time" 
//                 value={interviewTime} 
//                 onChange={e => setInterviewTime(e.target.value)} 
//                 className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//                 required
//               />
//             </div>
//             <div className="grid grid-cols-4 items-center gap-4">
//               <Label className="text-right" htmlFor="location">Location</Label>
//               <input 
//                 id="location" 
//                 type="text" 
//                 value={interviewLocation} 
//                 onChange={e => setInterviewLocation(e.target.value)} 
//                 className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//                 placeholder="Virtual or Office Address"
//               />
//             </div>
//             <div className="grid grid-cols-4 items-center gap-4">
//               <Label className="text-right" htmlFor="type">Type</Label>
//               <select 
//                 id="type" 
//                 value={interviewType} 
//                 onChange={e => setInterviewType(e.target.value)} 
//                 className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//               >
//                 <option value="Technical">Technical</option>
//                 <option value="Behavioral">Behavioral</option>
//                 <option value="HR">HR</option>
//                 <option value="Client">Client</option>
//               </select>
//             </div>
//             <div className="grid grid-cols-4 items-center gap-4">
//               <Label className="text-right" htmlFor="interviewer">Interviewer</Label>
//               <input 
//                 id="interviewer" 
//                 type="text" 
//                 value={interviewerName} 
//                 onChange={e => setInterviewerName(e.target.value)} 
//                 className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//                 placeholder="Interviewer Name"
//               />
//             </div>
//           </div>
//           <div className="flex justify-end gap-3">
//             <Button variant="outline" onClick={() => setShowInterviewModal(false)}>Cancel</Button>
//             <Button onClick={handleInterviewSubmit}>{needsReschedule ? 'Reschedule' : 'Schedule'} Interview</Button>
//           </div>
//         </DialogContent>
//       </Dialog>

//     <Dialog open={showInterviewFeedbackModal} onOpenChange={setShowInterviewFeedbackModal}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Interview Feedback for {currentRound}</DialogTitle>
//           <DialogDescription>
//             Provide feedback for the interview.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="grid gap-4 py-4">
//           <div className="space-y-2 hidden">
//             <Label htmlFor="result">Interview Result</Label>
//             <RadioGroup 
//               id="result" 
//               value={interviewResult} 
//               onValueChange={setInterviewResult}
//               className="flex flex-col space-y-1"
//             >
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="selected" id="selected" />
//                 <Label htmlFor="selected">Selected</Label>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="rejected" id="rejected" />
//                 <Label htmlFor="rejected">Rejected</Label>
//               </div>
//             </RadioGroup>
//           </div>
//           <div className="space-y-2">
//             <Label htmlFor="feedback">Feedback</Label>
//             <Textarea 
//               id="feedback" 
//               value={interviewFeedback} 
//               onChange={e => setInterviewFeedback(e.target.value)} 
//               placeholder="Enter interview feedback"
//               className="min-h-[120px]"
//             />
//           </div>
//         </div>
//         <div className="flex justify-end gap-3">
//           <Button variant="outline" onClick={() => setShowInterviewFeedbackModal(false)}>Cancel</Button>
//           <Button onClick={handleInterviewFeedbackSubmit}>Save Feedback</Button>
//         </div>
//       </DialogContent>
//     </Dialog>

//     <Dialog open={showJoiningModal} onOpenChange={setShowJoiningModal}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Joining Details</DialogTitle>
//           <DialogDescription>
//             Enter the CTC and date of joining for the candidate.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="grid gap-4 py-4">
//           <div className="grid grid-cols-4 items-center gap-4">
//             <Label className="text-right" htmlFor="ctc">CTC</Label>
//             <input 
//               id="ctc" 
//               type="number" 
//               value={ctc} 
//               onChange={e => setCtc(e.target.value)} 
//               className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//               placeholder="Annual CTC"
//               required
//             />
//           </div>
//           <div className="grid grid-cols-4 items-center gap-4">
//             <Label className="text-right" htmlFor="joining-date">Joining Date</Label>
//             <input 
//               id="joining-date" 
//               type="date" 
//               value={joiningDate} 
//               onChange={e => setJoiningDate(e.target.value)} 
//               className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
//               required
//             />
//           </div>
//         </div>
//         <div className="flex justify-end gap-3">
//           <Button variant="outline" onClick={() => setShowJoiningModal(false)}>Cancel</Button>
//           <Button onClick={handleJoiningSubmit}>Save</Button>
//         </div>
//       </DialogContent>
//     </Dialog>

//     <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle>Rejection Reason</DialogTitle>
//           <DialogDescription>
//             Please provide a reason for rejecting this candidate.
//           </DialogDescription>
//         </DialogHeader>
//         <div className="grid gap-4 py-4">
//           {/* <div className="space-y-2">
//             <Label htmlFor="reject-type">Rejection Type</Label>
//             <RadioGroup 
//               id="reject-type" 
//               value={rejectType} 
//               onValueChange={setRejectType}
//               className="flex flex-col space-y-1"
//             >
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="internal" id="internal" />
//                 <Label htmlFor="internal">Internal Rejection</Label>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="client" id="client" />
//                 <Label htmlFor="client">Client Rejection</Label>
//               </div>
//             </RadioGroup>
//           </div> */}
//           <div className="space-y-2">
//             <Label htmlFor="reject-reason">Rejection Reason</Label>
//             <Textarea 
//               id="reject-reason" 
//               value={rejectReason} 
//               onChange={e => setRejectReason(e.target.value)} 
//               placeholder="Enter rejection reason"
//               className="min-h-[100px]"
//             />
//           </div>
//         </div>
//         <div className="flex justify-end gap-3">
//           <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
//           <Button variant="destructive" onClick={handleRejectSubmit}>Reject Candidate</Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//     </>
//   );
// };

// export default CandidatesList;

// // 


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";
import { StatusSelector } from "./StatusSelector";
import { ItechStatusSelector } from "./ItechStatusSelector";
import ValidateResumeButton from "./candidate/ValidateResumeButton";
import StageProgress from "./candidate/StageProgress";
import EmptyState from "./candidate/EmptyState";
import { Pencil, Eye, Download, FileText, Phone, Calendar, User, ChevronLeft, ChevronRight, EyeOff, Copy, Check, PhoneOff, MailOpen, Mail, Contact } from "lucide-react";
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

import moment from 'moment';
import { getRoundNameFromResult } from "@/utils/statusTransitionHelper";
import { Skeleton } from "@/components/ui/skeleton";

interface CandidatesListProps {
  jobId: string;
  jobdescription: string;
  statusFilter?: string;
  statusFilters?: string[];
  onAddCandidate?: () => void;
  onRefresh: () => Promise<void>;
  isCareerPage?: boolean;
}

interface HiddenContactCellProps {
  email?: string;
  phone?: string;
  candidateId: string;
}

const CandidatesList = ({
  jobId,
  statusFilter,
  statusFilters = [],
  onAddCandidate,
  jobdescription,
  onRefresh,
  isCareerPage = false
}: CandidatesListProps) => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  const ITECH_ORGANIZATION_ID = '1961d419-1272-4371-8dc7-63a4ec71be83';
  const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

    // ADDED: State for dynamic tabs
  const [mainStatuses, setMainStatuses] = useState<MainStatus[]>([]);
  const [areStatusesLoading, setAreStatusesLoading] = useState(true);

console.log('mainStatuses', mainStatuses)

  const { data: candidatesData = [], isLoading, refetch } = useQuery({
    queryKey: ["job-candidates", jobId],
    queryFn: () => getCandidatesByJobId(jobId),
  });


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

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
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

  const [showOfferJoiningModal, setShowOfferJoiningModal] = useState(false);



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

  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const recruitmentStages = ["New", "InReview", "Engaged", "Available", "Offered", "Hired"];

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
  setFilteredCandidates(candidatesData);

  const checkAnalysisData = async () => {
    const { data, error } = await supabase
      .from("candidate_resume_analysis")
      .select("candidate_id, summary, overall_score")
      .eq("job_id", jobId)
      .not("summary", "is", null);

    if (error) {
      console.error("Error checking analysis data:", error);
      // Console log the error
      console.log("checkAnalysisData error:", error);
      return;
    }

    // Console log the fetched data
    console.log("checkAnalysisData fetched data:", data);

    const availableData: { [key: string]: boolean } = {};
    const analysisDataTemp: { [key: string]: any } = {};
    data.forEach((item) => {
      availableData[item.candidate_id] = true;
      analysisDataTemp[item.candidate_id] = { overall_score: item.overall_score };
    });

    setAnalysisDataAvailable(availableData);
    setCandidateAnalysisData((prev) => ({ ...prev, ...analysisDataTemp }));
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
  

  useEffect(() => {
    if (candidatesData.length > 0) {
      const transformedCandidates: Candidate[] = candidatesData.map((candidate) => {
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
          status: candidate.status || "New",
          currentStage: candidate.main_status?.name || "New",
          createdAt: candidate.created_at,
          hasValidatedResume: candidate.hasValidatedResume || false,
          main_status: candidate.main_status,
          sub_status: candidate.sub_status,
          main_status_id: candidate.main_status_id,
          sub_status_id: candidate.sub_status_id,
          accrual_ctc: candidate.accrual_ctc,
          ctc: candidate.ctc,
          profit,
        };
      });

      setCandidates(transformedCandidates);
    }
  }, [candidatesData, job, clientData]);

  const setDefaultStatusForCandidate = async (candidateId: string) => {
    try {
      const statuses = await fetchAllStatuses();
      const newStatus = statuses.find(s => s.name === "New");
      if (newStatus?.subStatuses?.length) {
        const defaultSubStatus = newStatus.subStatuses.find(s => s.name === "New Application") || newStatus.subStatuses[0];
        
        await updateCandidateStatus(candidateId, defaultSubStatus.id, user?.id);
      }
    } catch (error) {
      console.error("Error setting default status:", error);
    }
  };

  useEffect(() => {
    let filtered = [...candidates];
    
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

        // Apply "Yours" filter
        if (candidateFilter === "Yours") {
          const userFullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
          filtered = filtered.filter(
            c => c.owner === userFullName || c.appliedFrom === userFullName
          );
        }
    
    setFilteredCandidates(filtered);
  }, [candidates, appliedCandidates, activeTab, statusFilters, statusFilter, isCareerPage, candidateFilter]);

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
  let rqJobId: string | null = null;

  if (validatingId) return;

  try {
    setValidatingId(candidateId);
    toast.info("Starting resume validation...");

    const candidate = filteredCandidates.find((c) => c.id === candidateId);
    console.log("candidate", candidate)
    if (!candidate || !candidate.resume) {
      throw new Error("Candidate or resume data missing.");
    }

    const resumeUrlParts = candidate.resume.split("candidate_resumes/");
    const extractedResumeUrl = resumeUrlParts.length > 1 ? resumeUrlParts[1] : candidate.resume;

    const { data: jobData, error: jobError } = await supabase
      .from("hr_jobs")
      .select("job_id")
      .eq("id", jobId)
      .single();

    if (jobError || !jobData) {
      throw new Error("Invalid job configuration. Could not find job details.");
    }
    const jobTextId = jobData.job_id;

    const payload = {
      job_id: jobTextId,
      candidate_id: candidateId,
      resume_url: extractedResumeUrl,
      job_description: jobdescription,
      organization_id: organizationId,
      user_id: user.id,
    };
    console.log("Sending payload to backend:", payload);

    const backendUrl = 'https://dev.hrumbles.ai/api/validate-candidate';
    console.log(`Using backend URL: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("Content-Type");
    if (!response.ok || !contentType?.includes("application/json")) {
      const errorText = await response.text();
      console.error(`Backend validation request failed: ${response.status} - ${response.statusText}`);
      console.error("Content-Type:", contentType);
      console.error("Response headers:", Object.fromEntries(response.headers.entries()));
      console.error("Response body:", errorText.slice(0, 200));
      throw new Error(
        `Invalid response: Expected JSON, received ${contentType || "unknown"} - ${errorText.slice(0, 200)}`
      );
    }

    const responseData = await response.json();
    console.log("Backend validation response:", responseData);
    if (!responseData.job_id) {
      throw new Error("Backend did not return a job ID to track.");
    }
    rqJobId = responseData.job_id;

    let attempts = 0;
    const maxAttempts = 24;
    const interval = 5000;

    const pollJobStatus = (): Promise<string> => {
      return new Promise(async (resolve, reject) => {
        if (attempts >= maxAttempts) {
          console.error(`Polling timed out after ${maxAttempts} attempts for job ${rqJobId}.`);
          return reject(new Error("Validation timed out. Check server logs."));
        }
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts} for job ${rqJobId}...`);

        try {
          const statusApiUrl = `https://dev.hrumbles.ai/api/job-status/${encodeURIComponent(rqJobId)}`;
          console.log(`Polling URL: ${statusApiUrl}`);
          const statusResponse = await fetch(statusApiUrl);

          const statusContentType = statusResponse.headers.get("Content-Type");
          if (!statusResponse.ok || !statusContentType?.includes("application/json")) {
            const pollErrorText = await statusResponse.text();
            console.warn(`Polling status check failed (attempt ${attempts}): ${statusResponse.status} - ${pollErrorText}`);
            setTimeout(() => pollJobStatus().then(resolve).catch(reject), interval);
            return;
          }

          const statusData = await statusResponse.json();
          console.log(`Polling status data:`, statusData);

          if (statusData.status === "finished") {
            console.log("Job finished!");
            return resolve(statusData.status);
          } else if (statusData.status === "failed") {
            console.error("Backend job failed:", statusData.result?.error);
            try {
              const logApiUrl = `https://dev.hrumbles.ai/api/job-logs?jobId=${encodeURIComponent(rqJobId)}`;
              console.log(`Fetching failure logs from: ${logApiUrl}`);
              const logResponse = await fetch(logApiUrl);
              if (logResponse.ok) {
                const logsJson = await logResponse.json();
                console.log("Failure Logs:", logsJson.logs);
                const errorLog = logsJson.logs?.find((log: any) => log.step?.includes("error"));
                const errorMessage = errorLog?.data?.error_message || statusData.result?.error || "Analysis failed on backend.";
                return reject(new Error(errorMessage));
              } else {
                console.warn(`Failed to fetch logs (${logResponse.status}), using original error.`);
                return reject(new Error(statusData.result?.error || "Analysis failed (could not fetch logs)."));
              }
            } catch (logError) {
              console.warn("Error fetching failure logs:", logError);
              return reject(new Error(statusData.result?.error || "Analysis failed (log fetch error)."));
            }
          } else {
            setTimeout(() => pollJobStatus().then(resolve).catch(reject), interval);
          }
        } catch (error) {
          console.error("Network or other error during polling attempt:", error);
          if (error instanceof TypeError && error.message.includes("fetch")) {
            return reject(new Error("Network error polling job status. Check backend connectivity."));
          }
          if (attempts < maxAttempts) {
            setTimeout(() => pollJobStatus().then(resolve).catch(reject), interval);
          } else {
            reject(new Error("Polling failed after multiple retry attempts."));
          }
        }
      });
    };

    await pollJobStatus();
    toast.success("Resume validation process completed successfully!");

    const finalAnalysisData = await fetchAnalysisData(candidateId);
    if (finalAnalysisData) {
      console.log("Displaying modal with final data:", finalAnalysisData);
      setAnalysisDataAvailable((prev) => ({ ...prev, [candidateId]: true }));
      setCandidateAnalysisData((prev) => ({ ...prev, [candidateId]: finalAnalysisData }));
      setAnalysisData(finalAnalysisData);
      setIsSummaryModalOpen(true);
    } else {
      toast.warn("Validation complete, but failed to load final analysis details.");
      setAnalysisDataAvailable((prev) => ({ ...prev, [candidateId]: false }));
    }
  } catch (error: any) {
    console.error("Overall validation error in handleValidateResume:", error);
    toast.error(error.message || "Failed to validate resume");
  } finally {
    setValidatingId(null);
  }
};





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
            const newStatus = statuses.find(s => s.name === "New");
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
                <TableHead className="w-[150px] sm:w-[200px]">Candidate Name</TableHead>
                {!isEmployee && <TableHead className="w-[100px] sm:w-[150px]">Owner</TableHead>}
                <TableHead className="w-[50px] sm:w-[100px]">
                  Contact Info
                </TableHead>
                {organizationId !== ITECH_ORGANIZATION_ID || organizationId !== ASCENDION_ORGANIZATION_ID && !isEmployee && <TableHead className="w-[80px] sm:w-[100px]">Profit</TableHead>}
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
                {organizationId !== ITECH_ORGANIZATION_ID || organizationId !== ASCENDION_ORGANIZATION_ID && !isEmployee && (
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
                    {organizationId === ITECH_ORGANIZATION_ID || organizationId === ASCENDION_ORGANIZATION_ID ? (
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
                        isLoading={validatingId === candidate.id}
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
};

export default CandidatesList;