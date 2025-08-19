import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X, Mail, Phone, Copy, Check, Eye, Download, FileText } from "lucide-react";
import { JobData, Candidate } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import moment from "moment";
import { ProgressColumn } from "@/components/jobs/job/ProgressColumn";
import { StatusSelector } from "@/components/jobs/ai/StatusSelector";
import { ItechStatusSelector } from "@/components/jobs/job/ItechStatusSelector";


import { AiValidateResumeButton } from './AiValidateResumeButton'; // <-- Import new button
import SummaryModal from '@/components/jobs/job/SummaryModal';
import { fetchAllStatuses, MainStatus } from "@/services/statusService";
import { supabase } from "@/integrations/supabase/client";

interface StatusFilter {
  id: string;
  name: string;
  isMain: boolean;
  selected: boolean;
  color?: string;
}

interface Props {
  job: JobData;
  candidates: Candidate[];
  onCandidateUpdate: () => void;
}

interface HiddenContactCellProps {
  email?: string;
  phone?: string;
  candidateId: string;
}

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
      </div>
    </TableCell>
  );
};

export const AiCandidatesList = ({ job, candidates, onCandidateUpdate }: Props) => {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === "employee";
  const [activeTab, setActiveTab] = useState("All Candidates");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [candidateFilter, setCandidateFilter] = useState<"All" | "Yours">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [mainStatuses, setMainStatuses] = useState<MainStatus[]>([]);
  const [areStatusesLoading, setAreStatusesLoading] = useState(true);

  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [analysisDataAvailable, setAnalysisDataAvailable] = useState<{ [key: string]: boolean }>({});
  const [candidateAnalysisData, setCandidateAnalysisData] = useState<{ [key: string]: any }>({});

    // *** 1. ADD NEW STATE FOR BULK VALIDATION ***
  const [isBulkValidating, setIsBulkValidating] = useState(false);

   useEffect(() => {
    // Set the first main status as the default tab once loaded
    if (activeTab === 'all' && !areStatusesLoading && mainStatuses.length > 0) {
      setActiveTab(mainStatuses[0].id);
    }
    
    // Check for existing analysis data when candidates load
    const checkAnalysisData = async () => {
      const { data } = await supabase
        .from("candidate_resume_analysis")
        .select("candidate_id, summary, overall_score")
        .eq("job_id", job.id)
        .not("summary", "is", null);
      
      if (data) {
        const available: { [key: string]: boolean } = {};
        const analysis: { [key: string]: any } = {};
        data.forEach(item => {
          available[item.candidate_id] = true;
          analysis[item.candidate_id] = { overall_score: item.overall_score };
        });
        setAnalysisDataAvailable(available);
        setCandidateAnalysisData(analysis);
      }
    };
    checkAnalysisData();
  }, [candidates, job.id, areStatusesLoading, mainStatuses]);


  // Fetch user names for created_by
  useEffect(() => {
    const fetchUserNames = async () => {
      const uniqueCreatedBy = [...new Set(candidates.map(c => c.created_by).filter(Boolean))];
      if (uniqueCreatedBy.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .in('id', uniqueCreatedBy);

        if (error) throw error;

        const namesMap: { [key: string]: string } = {};
        data.forEach(user => {
          namesMap[user.id] = `${user.first_name} ${user.last_name}`.trim() || 'Unknown';
        });
        setUserNames(namesMap);
      } catch (error) {
        console.error('Error fetching user names:', error);
        toast.error('Failed to load creator names');
      }
    };

    fetchUserNames();
  }, [candidates]);

  // Load statuses for filter options and tabs
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setAreStatusesLoading(true);
        const data = await fetchAllStatuses();
        const pipelineOrder = ['Initiated', 'In Progress', 'On Hold', 'Completed', 'Closed'];
        const sortedData = [...data].sort((a, b) => {
          const aIndex = pipelineOrder.indexOf(a.name);
          const bIndex = pipelineOrder.indexOf(b.name);
          return aIndex - bIndex;
        });
        setMainStatuses(sortedData);
        const filterOptions: StatusFilter[] = [];
        sortedData.forEach((mainStatus) => {
          filterOptions.push({
            id: mainStatus.id,
            name: mainStatus.name,
            isMain: true,
            selected: false,
            color: mainStatus.color,
          });
          if (mainStatus.subStatuses && mainStatus.subStatuses.length > 0) {
            mainStatus.subStatuses.forEach((subStatus) => {
              filterOptions.push({
                id: subStatus.id,
                name: `${mainStatus.name} - ${subStatus.name}`,
                isMain: false,
                selected: false,
                color: subStatus.color || mainStatus.color,
              });
            });
          }
        });
        setStatusFilters(filterOptions);
      } catch (error) {
        console.error("Error loading statuses:", error);
        toast.error("Failed to load statuses");
      } finally {
        setAreStatusesLoading(false);
      }
    };
    loadStatuses();
  }, []);

  const getTabCount = (tab: string) => {
    if (tab === "All Candidates") {
      return candidates.length;
    }
    return candidates.filter((c) => c.main_status?.name === tab).length;
  };

  const filteredCandidates = useMemo(() => {
    let result = candidates;
    if (activeTab !== "All Candidates") {
      result = result.filter((c) => c.main_status?.name === activeTab);
    }
    if (appliedFilters.length > 0) {
      result = result.filter(
        (c) =>
          appliedFilters.includes(c.main_status_id || "") ||
          appliedFilters.includes(c.sub_status_id || "")
      );
    }
    if (candidateFilter === "Yours") {
      const userFullName = `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
      result = result.filter(
        (c) => c.owner === userFullName || c.appliedFrom === userFullName
      );
    }
    return result;
  }, [candidates, activeTab, appliedFilters, candidateFilter, user]);

  const toggleFilter = (id: string) => {
    setStatusFilters((prev) =>
      prev.map((filter) =>
        filter.id === id ? { ...filter, selected: !filter.selected } : filter
      )
    );
  };

  const applyFilters = () => {
    const selectedFilters = statusFilters
      .filter((filter) => filter.selected)
      .map((filter) => filter.id);
    setAppliedFilters(selectedFilters);
    setShowFilterDialog(false);
  };

  const clearFilters = () => {
    setStatusFilters((prev) =>
      prev.map((filter) => ({ ...filter, selected: false }))
    );
    setAppliedFilters([]);
    setShowFilterDialog(false);
  };

  const removeFilter = (id: string) => {
    setStatusFilters((prev) =>
      prev.map((filter) =>
        filter.id === id ? { ...filter, selected: false } : filter
      )
    );
    setAppliedFilters((prev) => prev.filter((filterId) => filterId !== id));
  };

  const getFilterNameById = (id: string): StatusFilter | undefined => {
    return statusFilters.find((filter) => filter.id === id);
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

   const fetchAnalysisData = async (candidateId: string) => {
    try {
      const { data, error } = await supabase
        .from("candidate_resume_analysis")
        .select("overall_score, summary, top_skills, missing_or_weak_areas, candidate_name, report_url")
        .eq("job_id", job.id)
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

   // --- UPDATED handleValidateResume using Proxy for POST, Direct for GET ---
  const handleValidateResume = async (candidateId: string) => {
    let rqJobId: string | null = null;
  
    if (validatingId) return;
  
    try {
      setValidatingId(candidateId);
      toast.info("Starting resume validation...");
  
      const candidate = filteredCandidates.find((c) => c.id === candidateId);
      console.log("candidate", candidate)
     if (!candidate || !candidate.resume_url) {
      throw new Error("Candidate or resume data missing.");
    }
  
      const resumeUrlParts = candidate.resume_url.split("candidate_resumes/"); // Use the correct bucket name
    if (resumeUrlParts.length <= 1) {
        throw new Error("Invalid or unexpected resume URL format.");
    }
    const extractedResumeUrl = resumeUrlParts[1];

  
    const { data: jobData, error: jobError } = await supabase
      .from("hr_jobs")
      .select("job_id, description") // Also select the description
      .eq("id", job.id) // Use job.id from component props
      .single();
  
       if (jobError || !jobData) {
      throw new Error("Invalid job configuration. Could not find job details.");
    }
    const jobTextId = jobData.job_id;
    const jobDescription = jobData.description; // Get the description

  
      const payload = {
      job_id: jobTextId,
      candidate_id: candidateId,
      resume_url: extractedResumeUrl,
      job_description: jobDescription, // Pass the actual job description
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
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate?.resume_url) {
      window.open(candidate.resume_url, "_blank");
    } else {
      toast.error("Resume not available");
    }
  };

  const handleStatusChange = async (newValue: string, candidate: Candidate) => {
    try {
      const { error } = await supabase
        .from('hr_job_candidates')
        .update({
          sub_status_id: newValue,
          main_status_id: mainStatuses.find(ms => ms.subStatuses?.some(ss => ss.id === newValue))?.id || candidate.main_status_id,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', candidate.id);

      if (error) throw error;

      toast.success("Status updated successfully");
      onCandidateUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  
  // *** 2. ADD NEW HANDLER FUNCTION FOR BULK VALIDATION ***
  const handleValidateAll = async () => {
    const candidatesToValidate = filteredCandidates.filter(c => !c.hasValidatedResume && c.resume_url);

    if (candidatesToValidate.length === 0) {
      toast.info("All visible candidates have already been validated or have no resume.");
      return;
    }

    setIsBulkValidating(true);
    toast.info(`Starting validation for ${candidatesToValidate.length} candidate(s)...`);

    let successCount = 0;
    let failureCount = 0;

    // Process candidates one by one to avoid overwhelming the backend
    for (const candidate of candidatesToValidate) {
      try {
        await handleValidateResume(candidate.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to validate resume for candidate ${candidate.name} (${candidate.id}):`, error);
        failureCount++;
        // The error toast is already shown inside handleValidateResume
      }
    }

    toast.success(`Bulk validation complete. Validated: ${successCount}, Failed: ${failureCount}.`);
    setIsBulkValidating(false);
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
            <X className="h-4 w-4" />
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
            <X className="h-4 w-4" />
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

  return (
    <>
    
        <div className="flex justify-between items-center mb-4">
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
          <div className="flex items-center gap-2">
             {/* *** 3. ADD THE "VALIDATE ALL" BUTTON HERE *** */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidateAll}
              disabled={isBulkValidating || filteredCandidates.length === 0}
              className="flex items-center gap-1"
            >
              {isBulkValidating ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <FileText size={16} />
              )}
              <span className="ml-1">{isBulkValidating ? "Validating..." : "Validate All"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterDialog(true)}
              className="flex items-center gap-1"
            >
              <Filter size={16} />
              <span className="ml-1">Filter</span>
            </Button>
          </div>
        </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {appliedFilters.length > 0 &&
          appliedFilters.map((filterId) => {
            const filter = getFilterNameById(filterId);
            if (!filter) return null;
            return (
              <Badge
                key={filterId}
                variant="secondary"
                className="flex items-center gap-1 py-1"
                style={{
                  backgroundColor: filter.color ? `${filter.color}20` : undefined,
                  borderColor: filter.color || undefined,
                  color: filter.color || undefined,
                }}
              >
                {filter.name}
                <button
                  onClick={() => removeFilter(filterId)}
                  className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                >
                  <X size={12} />
                </button>
              </Badge>
            );
          })}
        {appliedFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 text-xs px-2"
          >
            Clear all
          </Button>
        )}
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 mb-4">
          {areStatusesLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <>
              <TabsTrigger value="All Candidates" className="relative">
                All Candidates
                <span
                  className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                    activeTab === "All Candidates"
                      ? "bg-white text-purple-600"
                      : "bg-purple-600 text-white"
                  }`}
                >
                  {getTabCount("All Candidates")}
                </span>
              </TabsTrigger>
              {mainStatuses.map((status) => (
                <TabsTrigger key={status.id} value={status.name} className="relative">
                  {status.name}
                  <span
                    className={`absolute top-0 right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                      activeTab === status.name
                        ? "bg-white text-purple-600"
                        : `bg-${status.color ? status.color.replace('#', '') : 'purple-600'} text-white`
                    }`}
                  >
                    {getTabCount(status.name)}
                  </span>
                </TabsTrigger>
              ))}
            </>
          )}
        </TabsList>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[150px] sm:w-[200px]">Candidate</TableHead>
                <TableHead className="w-[100px] sm:w-[150px]">Created By</TableHead>
                <TableHead className="w-[50px] sm:w-[100px]">Contact Info</TableHead>
                <TableHead className="w-[120px] sm:w-[150px]">Status Progress</TableHead>
                <TableHead className="w-[100px] sm:w-[120px]">Status</TableHead>
                <TableHead className="w-[120px]">Validate</TableHead>
                <TableHead className="w-[50px] sm:w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No candidates in this stage.
                  </TableCell>
                </TableRow>
              )}
              {paginatedCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">
                    <div
                      className="flex flex-col cursor-pointer"
                      onClick={() => {
                        navigate(`/jobs/${job.id}/candidate/${candidate.id}/bgv`, {
                          state: { candidate, jobId: job.id },
                        });
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {(candidate.owner ||
                          candidate.appliedFrom ===
                            `${user.user_metadata.first_name} ${user.user_metadata.last_name}`) && (
                          <span
                            className="h-2 w-2 rounded-full bg-green-500 inline-block"
                            title="You added this candidate"
                          ></span>
                        )}
                        <span>{candidate.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {moment(candidate.created_at).format("DD MMM YYYY")} (
                        {moment(candidate.created_at).fromNow()})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {userNames[candidate.created_by] || candidate.created_by || 'Unknown'}
                  </TableCell>
                  <HiddenContactCell
                    email={candidate.email}
                    phone={candidate.phone}
                    candidateId={candidate.id}
                  />
                  <TableCell>
                    <div className="truncate">
                      <ProgressColumn
                        mainStatus={candidate.main_status}
                        subStatus={candidate.sub_status}
                        currentStatus={candidate.status}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <ItechStatusSelector
                      value={candidate.sub_status_id || ""}
                      onChange={(newValue) => handleStatusChange(newValue, candidate)}
                      className="h-7 text-xs w-full"
                      disableNextStage={candidate.sub_status?.name?.includes('Discrepancy') || candidate.sub_status?.name === 'Candidate Withdrawn'}
                    />
                  </TableCell>
                 <TableCell className="px-2">
                   <div className="flex items-center gap-2">
                    <AiValidateResumeButton
                      isValidated={candidate.hasValidatedResume  || false}
                      candidateId={candidate.id}
                      onValidate={handleValidateResume}
                      isLoading={validatingId === candidate.id}
                      overallScore={candidateAnalysisData[candidate.id]?.overall_score}
                    />
                    {analysisDataAvailable[candidate.id] && (
                      <Button variant="ghost" size="xs" onClick={() => fetchAnalysisData(candidate.id)} title="View Summary" className="p-1">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                          if (candidate.resume_url) {
                            const link = document.createElement("a");
                            link.href = candidate.resume_url;
                            link.download = candidate.resume_filename || `${candidate.name}_resume.${candidate.resume_url.split('.').pop() || 'pdf'}`;
                            link.click();
                          } else {
                            toast.error("Resume not available for download");
                          }
                        }}
                        title="Download Resume"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Tabs>
      {filteredCandidates.length > 0 && renderPagination()}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-md">
          <h2 className="text-xl font-semibold mb-4">Filter Candidates</h2>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              {areStatusesLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                statusFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={filter.id}
                      checked={filter.selected}
                      onCheckedChange={() => toggleFilter(filter.id)}
                    />
                    <label
                      htmlFor={filter.id}
                      className={`text-sm ${filter.isMain ? "font-medium" : "ml-2"}`}
                      style={{ color: filter.color || undefined }}
                    >
                      {filter.name}
                    </label>
                    {filter.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: filter.color }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </DialogContent>
      </Dialog>

       {isSummaryModalOpen && analysisData && (
        <SummaryModal
          analysisData={analysisData}
          onClose={() => setIsSummaryModalOpen(false)}
        />
      )}
    </>
  );
};