import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo  } from "react";
import { useSelector } from "react-redux";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Filter, X, Zap, Mail, User, Search, Settings2, Send, Download, FileSpreadsheet } from "lucide-react";
import CandidatesList from "../CandidatesList";
import { Candidate, JobData } from "@/lib/types";
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
import CSVExportDialog from "../export/CSVExportDialog";
import TemplateSelectorDialog from "../export/TemplateSelectorDialog";
import { ALL_COLUMNS, ColumnItem } from "@/components/clients-new/TemplateEditorDialog"; // adjust path
import * as XLSX from "xlsx";

// --- ADDED: Define a type for the ref to get autocompletion ---
// --- Update the ref handle interface ---
interface CandidatesListHandle {
  triggerBatchValidate: () => void;
  triggerBulkShare: (emailType: 'shortlist' | 'rejection') => void;
  triggerBulkInvite: () => void;
  triggerCSVExport: () => any[] | null;  // Changed from void
}

interface CandidatesTabsSectionProps {
  jobId: string;
  jobTitle: string;
  jobdescription: string;
  clientdetails?: JobData['clientDetails'];
  candidates: Candidate[];
  onAddCandidate: () => void;
}

const ITECH_ORGANIZATION_ID = ["1961d419-1272-4371-8dc7-63a4ec71be83", "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9"];
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

const CandidatesTabsSection = ({ 
  jobId, 
  jobTitle,
  jobdescription,
  clientdetails,
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

// Helper functions (same as before, but we'll move them inside the component for simplicity)
const formatPhoneForCSV = (phone?: string) => phone || "";
const formatSalaryForCSV = (salary: any) => {
  if (!salary && salary !== 0) return "";
  const num = typeof salary === "string" ? parseFloat(salary.replace(/[^0-9.]/g, "")) : salary;
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
const formatDateForCSV = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr; }
};

// New state
const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);
const [clientTemplates, setClientTemplates] = useState<any[]>([]);
const [pendingExportCandidates, setPendingExportCandidates] = useState<any[]>([]);

// Direct export function
const performExport = (candidates: any[], columns: ColumnItem[], filenamePrefix: string) => {
  const exportData = candidates.map(c => {
    const row: Record<string, string> = {};
    columns.filter(col => col.selected).forEach(col => {
      let value = "";
      switch (col.key) {
        case "name": value = c.name || ""; break;
        case "email": value = c.email || ""; break;
        case "phone": value = formatPhoneForCSV(c.phone); break;
        case "experience": value = c.experience || ""; break;
        case "currentSalary": value = formatSalaryForCSV(c.currentSalary || c.current_salary); break;
        case "expectedSalary": value = formatSalaryForCSV(c.expectedSalary || c.expected_salary); break;
        case "noticePeriod": value = c.notice_period || c.metadata?.noticePeriod || ""; break;
        case "location": value = c.location || c.metadata?.currentLocation || ""; break;
        case "status": value = c.main_status?.name || c.status || ""; break;
        case "subStatus": value = c.sub_status?.name || ""; break;
        case "skills": {
          if (c.skills && Array.isArray(c.skills)) {
            const stringSkills = c.skills.filter((s: any) => typeof s === "string");
            value = stringSkills.join(", ");
          }
          break;
        }
        case "skillRatings": {
          const ratings = c.skill_ratings || c.skillRatings;
          if (ratings) {
            value = ratings
              .map((s: any) =>
                s.name ? `${s.name} - ${s.rating || ""}/5 (${s.experienceYears}y ${s.experienceMonths}m)` : ""
              )
              .filter(Boolean)
              .join(" | ");
          }
          break;
        }
        case "appliedDate": value = formatDateForCSV(c.appliedDate || c.applied_date); break;
        case "owner": value = c.hr_employees?.first_name
          ? `${c.hr_employees.first_name} ${c.hr_employees.last_name || ""}`
          : (c.owner || c.appliedFrom || ""); break;
        case "aiScore": value = c.overall_score ?? c.overallScore ?? ""; break;
        case "linkedin": value = c.linkedin_url || c.linkedin || c.metadata?.linkedInId || ""; break;
        case "interviewDate": value = formatDateForCSV(c.interview_date); break;
        case "joiningDate": value = formatDateForCSV(c.joining_date); break;
        case "rejectionReason": value = c.reject_reason || c.rejection_reason || ""; break;
        default: break;
      }
      row[col.label] = value;
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Candidates");

  // column widths
  const selectedCols = columns.filter(c => c.selected);
  ws["!cols"] = selectedCols.map(col => {
    const maxLen = Math.max(
      col.label.length,
      ...exportData.map(row => (row[col.label] || "").length).filter(len => len > 0),
      0
    );
    return { wch: Math.min(maxLen + 3, 60) };
  });

const sanitizedTitle = (jobTitle || 'candidates')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, '')   // Keep only alphanumeric and spaces
  .trim()
  .replace(/\s+/g, '_')           // Replace spaces with underscores
  .substring(0, 40);
  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const filename = `${sanitizedTitle}_${candidates.length}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success(`Exported ${candidates.length} candidates`);
};

console.log("clientdetails in tab section:", clientdetails);

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

    const [showCSVExportDialog, setShowCSVExportDialog] = useState(false);
const [exportCandidates, setExportCandidates] = useState<Candidate[]>([]);

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

const handleCSVExportClick = async () => {
  if (!candidatesListRef.current) return;
  const candidatesForExport = candidatesListRef.current.triggerCSVExport();
  if (!candidatesForExport || candidatesForExport.length === 0) return;

  const clientName = clientdetails?.clientName;
  if (!clientName) {
    setExportCandidates(candidatesForExport);
    setShowCSVExportDialog(true);
    return;
  }

  const { data: clientData, error } = await supabase
    .from("hr_clients")
    .select("export_template_config")
    .eq("client_name", clientName)
    .eq("organization_id", organization_id)
    .single();

  const templates = (clientData?.export_template_config as any[]) || [];
  if (templates.length === 0) {
    setExportCandidates(candidatesForExport);
    setShowCSVExportDialog(true);
    return;
  }

  const defaultTemplate = templates.find(t => t.is_default);
  if (defaultTemplate) {
    performExport(candidatesForExport, defaultTemplate.columns, jobTitle);
    return;
  }

  // No default -> ask which template
  setPendingExportCandidates(candidatesForExport);
  setClientTemplates(templates);
  setTemplateSelectorOpen(true);
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

          {/* 📊 Export CSV */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      onClick={handleCSVExportClick}
      variant="outline"
      size="sm"
      className="
        h-8 px-3 rounded-xl
        bg-gradient-to-br from-emerald-50 to-emerald-100
        text-emerald-700
        border border-emerald-200
        shadow-sm
        hover:text-emerald-700
        hover:from-emerald-100 hover:to-emerald-200
        hover:shadow-md hover:scale-[1.03]
        active:scale-[0.97]
        transition-all duration-200
        flex items-center gap-2
        whitespace-nowrap
        relative
      "
    >
      <FileSpreadsheet size={14} />
      <span className="text-xs font-medium">Export CSV</span>
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top" className="max-w-[250px] p-3">
    <div className="text-xs space-y-1">
      <p className="font-semibold text-emerald-700">Export Candidates</p>
      <p className="text-gray-500">
        {clientdetails?.clientName 
          ? `Uses template from ${clientdetails.clientName}. Set default template in Client Settings to export directly.`
          : 'Select columns and export candidates to Excel.'}
      </p>
      <p className="text-gray-400 italic">
        💡 Configure templates per client in Client Page → Export Templates
      </p>
    </div>
  </TooltipContent>
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

      <CSVExportDialog
  open={showCSVExportDialog}
  onOpenChange={setShowCSVExportDialog}
  candidates={exportCandidates}
  jobTitle={jobTitle}
/>

<TemplateSelectorDialog
  open={isTemplateSelectorOpen}
  onOpenChange={setTemplateSelectorOpen}
  templates={clientTemplates}
  onSelect={(index) => {
    const template = clientTemplates[index];
    performExport(pendingExportCandidates, template.columns, jobTitle);
    setTemplateSelectorOpen(false);
  }}
/>
    </div>
  </TooltipProvider>
);
};

export default CandidatesTabsSection;