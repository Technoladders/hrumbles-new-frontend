import { format, startOfDay, endOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import QuillTableBetterDemo from "@/utils/QuillTableBetterDemo";

interface TimeLog {
  id?: string;
  date: string;
  duration_minutes: number;
  notes: string | Record<string, any>;
}

interface TimesheetEditFormProps {
  timesheet?: TimeLog;
  editedTimesheet?: TimeLog;
  setEditedTimesheet?: (timesheet: TimeLog) => void;
  formData: {
    workReport: string;
    projectAllocations: any[];
  };
  setFormData: (formData: {
    workReport: string;
    projectAllocations: any[];
  }) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface Submission {
  candidate_name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string;
  match_score: string;
  overall_score: string;
  applied_date: string;
  submission_date: string;
  applied_from: string;
  current_salary: string;
  expected_salary: string;
  location: string;
  preferred_location: string;
  notice_period: string;
  resume_url: string;
  main_status: string;
  sub_status: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  interview_round: string;
  interviewer_name: string;
  interview_result: string;
  reject_reason: string;
  ctc: string;
  joining_date: string;
  created_at: string;
  job_title: string;
  client_name: string;
}

export const TimesheetEditForm: React.FC<TimesheetEditFormProps> = ({
  timesheet,
  editedTimesheet,
  setEditedTimesheet,
  formData,
  setFormData,
  onValidationChange,
}) => {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [workReportError, setWorkReportError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const { user, role } = useSelector((state: any) => state.auth);
  const userId = user?.id;

  // Handle Quill content change
  const handleQuillChange = (content: string) => {
    const strippedContent = content.replace(/<[^>]+>/g, "").trim();
    validateWorkReport(strippedContent);
    setFormData({ ...formData, workReport: content });

    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      if (typeof editedTimesheet.notes === "string") {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // Fallback to empty object
        }
      }
      setEditedTimesheet({
        ...editedTimesheet,
        notes: JSON.stringify({
          ...parsedNotes,
          workReport: content,
        }),
      });
    }
  };

  // Helper function to safely extract values from notes
  const getNotesValue = (key: string): string => {
    if (key === "workReport" && formData?.workReport !== undefined) {
      return formData.workReport;
    }
    const targetObject = editedTimesheet || timesheet;
    if (!targetObject) return "";
    if (typeof targetObject.notes === "string") {
      try {
        const parsedNotes = JSON.parse(targetObject.notes);
        return parsedNotes[key] || "";
      } catch {
        return "";
      }
    }
    if (typeof targetObject.notes === "object" && targetObject.notes !== null) {
      return (targetObject.notes as Record<string, any>)[key] || "";
    }
    return "";
  };

  // Fetch department name to determine if user is a recruiter
  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (!userId) return;

      try {
        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", userId)
          .single();

        if (employeeError) throw employeeError;
        if (!employeeData?.department_id) return;

        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;

        if (role === "employee" && departmentData.name === "Human Resource") {
          setIsRecruiter(true);
        }
      } catch (error) {
        console.error("Error fetching department:", error);
      }
    };

    fetchDepartmentName();
  }, [userId, role]);

  // Fetch candidate submissions for recruiters
  useEffect(() => {
    if (!isRecruiter || !userId || !timesheet) return;

    const fetchSubmissions = async () => {
      setLoadingSubmissions(true);
      try {
        const targetDate = editedTimesheet?.date || timesheet.date;
        const dateStart = startOfDay(new Date(targetDate));
        const dateEnd = endOfDay(new Date(targetDate));

        const { data: candidates, error } = await supabase
          .from("hr_job_candidates")
          .select(`
            name,
            email,
            phone,
            experience,
            skills,
            match_score,
            overall_score,
            applied_date,
            submission_date,
            applied_from,
            current_salary,
            expected_salary,
            location,
            preferred_location,
            notice_period,
            resume_url,
            main_status_id,
            sub_status_id,
            interview_date,
            interview_time,
            interview_type,
            round,
            interviewer_name,
            interview_result,
            reject_reason,
            ctc,
            joining_date,
            created_at,
            status:job_statuses!hr_job_candidates_main_status_id_fkey(name),
            sub_status:job_statuses!hr_job_candidates_sub_status_id_fkey(name),
            hr_jobs!hr_job_candidates_job_id_fkey(title, client_owner)
          `)
          .eq("created_by", userId)
          .gte("created_at", format(dateStart, "yyyy-MM-dd'T'HH:mm:ss"))
          .lte("created_at", format(dateEnd, "yyyy-MM-dd'T'HH:mm:ss"));

        if (error) throw error;

        const formattedSubmissions: Submission[] = candidates.map((candidate: any) => ({
          candidate_name: candidate.name || 'n/a',
          email: candidate.email || 'n/a',
          phone: candidate.phone || 'n/a',
          experience: candidate.experience || 'n/a',
          skills: candidate.skills?.length ? candidate.skills.join(', ') : 'n/a',
          match_score: candidate.match_score?.toString() || 'n/a',
          overall_score: candidate.overall_score?.toString() || 'n/a',
          applied_date: candidate.applied_date ? format(new Date(candidate.applied_date), 'dd:MM:yyyy') : 'n/a',
          submission_date: candidate.submission_date || 'n/a',
          applied_from: candidate.applied_from || 'n/a',
          current_salary: candidate.current_salary ? `₹${candidate.current_salary}` : 'n/a',
          expected_salary: candidate.expected_salary ? `₹${candidate.expected_salary}` : 'n/a',
          location: candidate.location || 'n/a',
          preferred_location: candidate.preferred_location || 'n/a',
          notice_period: candidate.notice_period || 'n/a',
          resume_url: candidate.resume_url || 'n/a',
          main_status: candidate.status?.name || 'n/a',
          sub_status: candidate.sub_status?.name || 'n/a',
          interview_date: candidate.interview_date || 'n/a',
          interview_time: candidate.interview_time || 'n/a',
          interview_type: candidate.interview_type || 'n/a',
          interview_round: candidate.round || 'n/a',
          interviewer_name: candidate.interviewer_name || 'n/a',
          interview_result: candidate.interview_result || 'n/a',
          reject_reason: candidate.reject_reason || 'n/a',
          ctc: candidate.ctc || 'n/a',
          joining_date: candidate.joining_date || 'n/a',
          created_at: candidate.created_at || 'n/a',
          job_title: candidate.hr_jobs?.title || 'n/a',
          client_name: candidate.hr_jobs?.client_owner || 'n/a'
        }));

        setSubmissions(formattedSubmissions);
        console.log("submissions", formattedSubmissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoadingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [isRecruiter, userId, timesheet, editedTimesheet]);

  // Initialize form fields
  useEffect(() => {
    const initialTitle = getNotesValue("title");
    const initialWorkReport = getNotesValue("workReport");
    setTitle(initialTitle);
    validateTitle(initialTitle);
    validateWorkReport(initialWorkReport);
  }, [editedTimesheet, timesheet]);

  // Validate title
  const validateTitle = (title: string) => {
    const isValid = title.trim().length > 0;
    setTitleError(isValid ? null : "Title is required");
    updateFormValidity(isValid, workReportError === null);
    return isValid;
  };

  // Validate workReport
  const validateWorkReport = (workReport: string) => {
    const isValid = workReport.trim().length > 0;
    setWorkReportError(isValid ? null : "Work Summary is required");
    updateFormValidity(titleError === null, isValid);
    return isValid;
  };

  // Update parent component on validation change
  const updateFormValidity = (isTitleValid: boolean, isWorkReportValid: boolean) => {
    if (onValidationChange) {
      onValidationChange(isTitleValid && isWorkReportValid);
    }
  };

  // Handle title change
  const handleTitleChange = (value: string) => {
    setTitle(value);
    validateTitle(value);

    if (editedTimesheet && setEditedTimesheet) {
      let parsedNotes = {};
      if (typeof editedTimesheet.notes === "string") {
        try {
          parsedNotes = JSON.parse(editedTimesheet.notes);
        } catch {
          // Fallback to empty object
        }
      }
      setEditedTimesheet({
        ...editedTimesheet,
        notes: JSON.stringify({
          ...parsedNotes,
          title: value,
        }),
      });
    }
  };

  // Calculate total working hours
  const targetTimesheet = editedTimesheet || timesheet;
  const calculatedWorkingHours = targetTimesheet?.duration_minutes
    ? (targetTimesheet.duration_minutes / 60).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Timesheet Title"
          className={`mb-3 ${titleError ? "border-red-500" : ""}`}
        />
        {titleError && (
          <p className="text-red-500 text-sm mt-1">{titleError}</p>
        )}
      </div>

      {/* <div> */}
        {/* <Label htmlFor="totalWorkingHours">Total Working Hours</Label> */}
        {/* <Input
          id="totalWorkingHours"
          type="number"
          value={calculatedWorkingHours}
          readOnly
          className="mb-3 bg-muted"
        /> */}
      {/* </div> */}

      <div>
        {isRecruiter && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Candidate Submissions</h3>
            {loadingSubmissions ? (
              <div className="flex justify-center p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : submissions.length > 0 ? (
              <div>
                <p className="mb-2">Total Submissions: {submissions.length}</p>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Job Title</th>
                      <th className="border border-gray-300 p-2 text-left">Client Name</th>
                      <th className="border border-gray-300 p-2 text-left">Candidate Name</th>
                      <th className="border border-gray-300 p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{sub.job_title}</td>
                        <td className="border border-gray-300 p-2">{sub.client_name}</td>
                        <td className="border border-gray-300 p-2">{sub.candidate_name}</td>
                        <td className="border border-gray-300 p-2">{sub.sub_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No submissions found for this date.</p>
            )}
          </div>
        )}

        <Label htmlFor="workReport">
          Work Summary <span className="text-red-500">*</span>
        </Label>
        <div className={`border rounded-md ${workReportError ? "border-red-500" : "border-gray-200"}`}>
          <QuillTableBetterDemo
            value={formData.workReport || ""}
            onChange={handleQuillChange}
          />
        </div>
        {workReportError && (
          <p className="text-red-500 text-sm mt-1">{workReportError}</p>
        )}
      </div>
    </div>
  );
};