import React, { useEffect, useState } from "react";
import { TimeLog, DetailedTimesheetEntry, JobLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { TimeEntrySection } from "./sections/TimeEntrySection";
import { ProjectAllocationSection } from "./sections/ProjectAllocationSection";
import { getWorkflowState, canRegularize } from "./utils/timeLogUtils";
import DOMPurify from "dompurify";
import parse from 'html-react-parser';
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
    min-width: 150px;
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
  /* New styles for recruiter report table inside job cards */
  .recruiter-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 12px;
  }
  .recruiter-table th {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  .recruiter-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
  }
  .recruiter-table tbody tr:hover {
    background-color: #f9fafb;
  }
  .recruiter-table tbody tr:nth-child(even) {
    background-color: #fafafa;
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
  employeeHasProjects?: boolean;
}

// Updated component to render the recruiter's detailed report with TABLE inside each job card
// Updated component to render the recruiter's detailed report with TABLE inside each job card
const RecruiterReportView = ({ log }: { log: TimeLog }) => {
  const [candidatesWithDetails, setCandidatesWithDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch candidate details including status and CTC
  useEffect(() => {
    const fetchCandidateDetails = async () => {
      if (!log.recruiter_report_data || !Array.isArray(log.recruiter_report_data)) {
        setIsLoading(false);
        return;
      }

      try {
        const jobLogs = log.recruiter_report_data as JobLog[];
        const updatedJobLogs = await Promise.all(
          jobLogs.map(async (jobLog) => {
            if (!jobLog.candidates || jobLog.candidates.length === 0) {
              return jobLog;
            }

            // Get all candidate IDs for this job
            const candidateIds = jobLog.candidates.map(c => c.id);

            // Fetch candidate details from database
// Fetch candidate details from database
            const { data: candidateDetails, error } = await supabase
              .from('hr_job_candidates')
              .select(`
                id,
                name,
                current_salary,
                expected_salary,
                main_status_id,
                sub_status_id,
                status:job_statuses!hr_job_candidates_main_status_id_fkey(name),
                sub_status:job_statuses!hr_job_candidates_sub_status_id_fkey(name)
              `)
              .in('id', candidateIds);

            if (error) {
              console.error('Error fetching candidate details:', error);
              return jobLog;
            }

            // Merge the fetched details with existing candidate data
   const enrichedCandidates = jobLog.candidates.map(candidate => {
              const details = candidateDetails?.find(d => d.id === candidate.id);
              return {
                ...candidate,
                current_ctc: details?.current_salary,
                expected_ctc: details?.expected_salary,
                mainStatus: details?.status?.name || 'N/A',
                subStatus: details?.sub_status?.name || 'N/A',
              };
            });

            return {
              ...jobLog,
              candidates: enrichedCandidates,
            };
          })
        );

        setCandidatesWithDetails(updatedJobLogs);
      } catch (error) {
        console.error('Error enriching candidate data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidateDetails();
  }, [log.recruiter_report_data]);

  // Sanitize and parse the overall summary
  const sanitizedSummary = log.notes ? DOMPurify.sanitize(log.notes) : '';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Detailed Job Report Section --- */}
      {candidatesWithDetails && candidatesWithDetails.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-purple-800">Detailed Job Report</h3>
          </div>
          
          {/* Individual Job Cards with TABLE inside */}
          <div className="space-y-3">
            {candidatesWithDetails.map((jobLog, index) => {
              return (
                <div key={index} className="bg-white/90 p-3 rounded-md shadow-sm border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{jobLog.jobTitle}</p>
                      <p className="text-xs text-gray-500">{jobLog.clientName}</p>
                    </div>
                  </div>
                  
                  {/* TABLE for Profiles Submitted */}
                  {jobLog.candidates && jobLog.candidates.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Profiles Submitted:</h4>
                      <div className="overflow-x-auto">
                        <table className="recruiter-table">
                          <thead>
                            <tr>
                              <th className="text-left">Candidate Name</th>
                              <th className="text-left">Client</th>
                              <th className="text-left">Status</th>
                              <th className="text-left">Current CTC</th>
                              <th className="text-left">Expected CTC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobLog.candidates.map((candidate: any) => {
                              // Format status: "MainStatus (SubStatus)" or just status if only one exists
                              // Display only Sub Status (fallback to Main Status only if Sub is missing/N/A)
const statusDisplay = 
  candidate.subStatus && candidate.subStatus !== 'N/A'
    ? candidate.subStatus
    : candidate.mainStatus || 'N/A';

                              return (
                                <tr key={candidate.id}>
                                  <td className="font-medium text-gray-900">{candidate.name}</td>
                                  <td className="text-gray-600">{jobLog.clientName}</td>
                                  <td className="font-semibold text-purple-600">{statusDisplay}</td>
                                  <td className="text-gray-700">
                                    {candidate.current_ctc ? `₹${candidate.current_ctc.toLocaleString()}` : 'N/A'}
                                  </td>
                                  <td className="text-gray-700">
                                    {candidate.expected_ctc ? `₹${candidate.expected_ctc.toLocaleString()}` : 'N/A'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {jobLog.challenges && (
                    <div className="mt-2 pt-2 border-t">
                      <h4 className="text-xs font-semibold text-gray-600 mb-1">Challenges & Notes:</h4>
                      <p className="text-xs text-gray-700">{jobLog.challenges}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* --- Overall Work Summary Section --- */}
      {sanitizedSummary && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Overall Work Summary</h3>
          <div className="bg-white/90 p-3 rounded-md shadow-sm border">
            <div className="work-report text-xs text-green-700 prose prose-sm max-w-none">
              {parse(sanitizedSummary)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export const TimeLogDetails = ({
  timeLog,
  timesheet,
  getProjectName = (id) => (id ? `Project ${id.substring(0, 8)}` : "Unassigned"),
  onRegularizationRequest,
  employeeHasProjects
}: TimeLogDetailsProps) => {
  const log = timeLog || timesheet;
  if (!log) return null;

  // --- CONDITIONAL RENDERING LOGIC ---
  // Check if this is a submitted recruiter timesheet
  const isRecruiterReport = log.recruiter_report_data && Array.isArray(log.recruiter_report_data);

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

  console.log("TimeLogDetails", log);

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
     
      {/* If it's a recruiter report, show the new dedicated view */}
      {isRecruiterReport ? (
        <RecruiterReportView log={log} />
      ) : (
        // Otherwise, show the original view for other employees
        <>
          <BasicInfoSection timeLog={log} parsedNotes={parsedNotes} />
          {/* <TimeEntrySection timeLog={log} employeeHasProjects={employeeHasProjects} /> */}
          <ProjectAllocationSection timeLog={log} getProjectName={getProjectName} />
          {/* Work Summary Section */}
          {parsedNotes.workReport && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
              <h3 className="text-xs font-medium text-green-800 mb-2">Work Summary</h3>
              <div className="bg-white/80 p-2 rounded shadow-sm">
                <div className="work-report text-xs text-green-700 prose prose-sm max-w-none">
                  {parse(DOMPurify.sanitize(parsedNotes.workReport))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Clarification Section (Common for all roles) */}
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
      
      {/* Regularization Button (Common for all roles) */}
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