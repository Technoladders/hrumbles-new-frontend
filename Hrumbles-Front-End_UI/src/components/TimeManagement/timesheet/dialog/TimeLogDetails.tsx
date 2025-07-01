import React, { useEffect, useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { TimeEntrySection } from "./sections/TimeEntrySection";
import { ProjectAllocationSection } from "./sections/ProjectAllocationSection";
import { getWorkflowState, canRegularize } from "./utils/timeLogUtils";
import DOMPurify from "dompurify"; // For sanitizing HTML
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";

// Interface for submission data
interface Submission {
  job_title: string;
  client_owner: string;
  candidate_name: string;
  status: string;
  employeeHasProjects: boolean;
}

// Custom CSS for table styling
const tableStyles = `
  .work-report table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 14px;
    line-height: 1.5;
  }
  .work-report table th, .work-report table td {
    border: 1px solid #d1d5db;
    padding: 8px;
    min-width: 150px; /* Increased cell width */
    text-align: left;
  }
  .work-report table th {
    background-color: #f3f4f6;
    font-weight: bold;
  }
  .work-report table tr:nth-child(even) {
    background-color: #f9fafb;
  }
  .work-report p {
    margin: 8px 0;
  }
  .work-report a {
    color: #2563eb;
    text-decoration: underline;
  }
  .work-report strong {
    font-weight: bold;
  }
  .work-report em {
    font-style: italic;
  }
`;

// Inject table styles into the document
const styleSheet = document.createElement("style");
styleSheet.innerHTML = tableStyles;
document.head.appendChild(styleSheet);

interface TimeLogDetailsProps {
  timeLog?: TimeLog;
  timesheet?: TimeLog;
  getProjectName?: (projectId: string | null) => string;
  onRegularizationRequest?: () => void;
}

export const TimeLogDetails = ({
  timeLog,
  timesheet,
  getProjectName = (id) => (id ? `Project ${id.substring(0, 8)}` : "Unassigned"),
  onRegularizationRequest,
  employeeHasProjects
}: TimeLogDetailsProps) => {
  const log = timeLog || timesheet;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);

  // Parse notes to extract title and work report
  let parsedNotes = {
    title: "",
    workReport: "",
  };

  try {
    if (log.notes && typeof log.notes === "string") {
      const parsed = JSON.parse(log.notes);
      if (parsed.title) parsedNotes.title = parsed.title;
      if (parsed.workReport) parsedNotes.workReport = parsed.workReport;
    }
  } catch (e) {
    if (log.notes) parsedNotes.workReport = log.notes;
  }

  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedWorkReport = DOMPurify.sanitize(parsedNotes.workReport, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "strong",
      "em",
      "a",
      "span",
      "div",
      "u",
    ],
    ALLOWED_ATTR: [
      "style",
      "href",
      "target",
      "rel",
      "class",
      "data-row",
      "data-cell",
      "data-rowspan",
      "data-colspan",
      "data-cell-bg",
    ],
  });

  // Fetch department name to determine if user is a recruiter
  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!log.employee_id) return;

      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", log.employee_id)
          .single();

        if (employeeError) throw employeeError;
        if (!employeeData?.department_id) return;

        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;

        if (departmentData.name === "Human Resource") {
          setIsRecruiter(true);
        }
      } catch (error) {
        console.error("Error fetching department:", error);
      }
    };

    fetchDepartmentName();
  }, [log.employee_id]);

  // Fetch candidate submissions for recruiters
  useEffect(() => {
    if (!isRecruiter || !log.employee_id || !log.date) return;

    const fetchSubmissions = async () => {
      setLoadingSubmissions(true);
      try {
        const dateStart = startOfDay(new Date(log.date));
        const dateEnd = endOfDay(new Date(log.date));

        const { data: candidates, error } = await supabase
          .from("hr_job_candidates")
          .select(`
            name,
            status:job_statuses!hr_job_candidates_sub_status_id_fkey(name),
            created_at,
            job_id,
            hr_jobs!hr_job_candidates_job_id_fkey(
              title,
              client_owner
            )
          `)
          .eq("created_by", log.employee_id)
          .gte("created_at", format(dateStart, "yyyy-MM-dd'T'HH:mm:ss"))
          .lte("created_at", format(dateEnd, "yyyy-MM-dd'T'HH:mm:ss"));

        if (error) throw error;

        const formattedSubmissions: Submission[] = candidates.map(
          (candidate: any) => ({
            job_title: candidate.hr_jobs?.title || "N/A",
            client_owner: candidate.hr_jobs?.client_owner || "N/A",
            candidate_name: candidate.name,
            status: candidate.status?.name,
          })
        );

        setSubmissions(formattedSubmissions);
        console.log("submissions", formattedSubmissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoadingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [isRecruiter, log.employee_id, log.date]);

  if (!log) return null;

  console.log("TimeLogDetails", log);

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
      <BasicInfoSection timeLog={log} parsedNotes={parsedNotes} />
      {/* <TimeEntrySection timeLog={log} employeeHasProjects={employeeHasProjects} /> */}
      <ProjectAllocationSection timeLog={log} getProjectName={getProjectName} />

      {/* Candidate Submissions Section */}
      {isRecruiter && (
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-3 rounded-lg border border-blue-100">
          <h3 className="text-xs font-medium text-blue-800 mb-2">Candidate Submissions</h3>
          <div className="bg-white/80 p-2 rounded shadow-sm">
            {loadingSubmissions ? (
              <div className="flex justify-center p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : submissions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-blue-700">Total Submissions: {submissions.length}</p>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left text-xs">Job Title</th>
                      <th className="border border-gray-300 p-2 text-left text-xs">Client Name</th>
                      <th className="border border-gray-300 p-2 text-left text-xs">Candidate Name</th>
                      <th className="border border-gray-300 p-2 text-left text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2 text-xs">{sub.job_title}</td>
                        <td className="border border-gray-300 p-2 text-xs">{sub.client_owner}</td>
                        <td className="border border-gray-300 p-2 text-xs">{sub.candidate_name}</td>
                        <td className="border border-gray-300 p-2 text-xs">{sub.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No submissions found for this date.</p>
            )}
          </div>
        </div>
      )}

      {/* Work Summary Section */}
      {parsedNotes.workReport && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
          <h3 className="text-xs font-medium text-green-800 mb-2">Work Summary</h3>
          <div className="bg-white/80 p-2 rounded shadow-sm">
            <div
              className="work-report text-xs text-green-700"
              dangerouslySetInnerHTML={{ __html: sanitizedWorkReport }}
            />
          </div>
        </div>
      )}

      {/* Clarification Section */}
      {(log.rejection_reason || log.clarification_response) && (
        <div
          className={`bg-gradient-to-r ${
            getWorkflowState(log) === "rejected"
              ? "from-red-50 to-rose-50 border-red-100"
              : "from-blue-50 to-sky-50 border-blue-100"
          } p-3 rounded-lg border`}
        >
          <h3
            className="text-xs font-medium mb-2"
            style={{
              color: getWorkflowState(log) === "rejected" ? "#991b1b" : "#1e40af",
            }}
          >
            {getWorkflowState(log) === "rejected" ? "Rejection Reason" : "Clarification"}
          </h3>
          {log.rejection_reason && (
            <div className="bg-white/80 p-2 rounded shadow-sm mb-2">
              <p
                className="text-xs"
                style={{
                  color: getWorkflowState(log) === "rejected" ? "#ef4444" : "#3b82f6",
                }}
              >
                {log.rejection_reason}
              </p>
            </div>
          )}
          {log.clarification_response && (
            <div className="bg-white/80 p-2 rounded shadow-sm">
              <h4
                className="text-xs font-medium mb-1"
                style={{
                  color: getWorkflowState(log) === "rejected" ? "#991b1b" : "#1e40af",
                }}
              >
                Response
              </h4>
              <p
                className="text-xs"
                style={{
                  color: getWorkflowState(log) === "rejected" ? "#ef4444" : "#3b82f6",
                }}
              >
                {log.clarification_response}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Regularization Button */}
      {canRegularize(log) && onRegularizationRequest && (
        <div className="pt-2">
          <Button
            onClick={onRegularizationRequest}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
          >
            <FileText className="w-4 h-4" />
            Request Regularization
          </Button>
        </div>
      )}
    </div>
  );
};