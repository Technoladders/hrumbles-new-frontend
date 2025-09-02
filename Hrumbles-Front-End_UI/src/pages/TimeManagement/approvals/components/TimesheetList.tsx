import { useState, useEffect } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, MessageCircleQuestion, ChevronLeft, ChevronRight, CheckCircle2, Check, AlertCircle } from "lucide-react";
import { formatDate } from "@/utils/timeFormatters";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import parse from "html-react-parser";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface TimesheetListProps {
  timesheets: TimeLog[];
  loading: boolean;
  type: 'pending' | 'clarification' | 'approved';
  onViewTimesheet: (timesheet: TimeLog, openClarification?: boolean) => void;
  onRespondToClarification?: (timesheet: TimeLog) => void;
  handleApprove: (timesheetId: string) => Promise<void>;
  handleRequestClarification: (timesheetId: string, reason: string) => Promise<void>;
  emptyMessage: string;
}

export const formatDuration = (minutes: number | null) => {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round((minutes % 60) * 10) / 10;
  return `${hours}.${mins} hrs`;
};

// Convert UTC ISO time to IST and format as 12-hour with AM/PM
const format12HourTime = (time: string | null) => {
  if (!time) return "N/A";
  const date = new Date(time);
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHour = hours % 12 || 12;
  return `${adjustedHour}:${minutes} ${period}`;
};

// Get hours in IST for login/logout rules
const getISTHours = (time: string | null) => {
  if (!time) return 0;
  const date = new Date(time);
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.getUTCHours() + istDate.getUTCMinutes() / 60;
};

// Determine time-based status with color
const getTimeBasedStatus = (minutes: number | null) => {
  if (!minutes) return { display: "", components: [] };
  const hours = minutes / 60;
  let statuses: string[] = [];

  if (hours > 9) statuses.push("Overtime");
  if (hours > 10) statuses.push("Clarification");
  else if (hours < 5) statuses.push("Half Day");
  else if (hours >= 5 && hours < 8) statuses.push("Short Time");
  else if (hours >= 8 && hours <= 9) statuses.push("Normal");

  const components = statuses.map((status) => {
    let variant: string;
    switch (status) {
      case "Overtime":
        variant = "bg-blue-100 text-blue-800 border-blue-200";
        break;
      case "Clarification":
        variant = "bg-yellow-100 text-yellow-800 border-yellow-200";
        break;
      case "Half Day":
        variant = "bg-red-100 text-red-800 border-red-200";
        break;
      case "Short Time":
        variant = "bg-orange-100 text-orange-800 border-orange-200";
        break;
      case "Normal":
        variant = "bg-green-100 text-green-800 border-green-200";
        break;
      default:
        variant = "bg-gray-100 text-gray-800 border-gray-200";
    }
    return (
      <Badge key={status} className={variant}>
        {status}
      </Badge>
    );
  });

  return { display: statuses.join(", "), components };
};

// Check login/logout rules
const getLoginDisplay = (clockIn: string | null) => {
  if (!clockIn) return { display: "N/A", className: "" };
  const hourNum = getISTHours(clockIn);
  const formattedTime = format12HourTime(clockIn);
  const isLate = hourNum > 10.3;
  return {
    display: isLate ? `${formattedTime} (Late Login)` : formattedTime,
    className: isLate ? "text-red-500" : "",
  };
};

const getLogoutDisplay = (clockOut: string | null, duration: number | null) => {
  if (!clockOut) return { display: "N/A", className: "" };
  const hourNum = getISTHours(clockOut);
  const formattedTime = format12HourTime(clockOut);
  const isEarly = hourNum < 19 || (duration && duration / 60 < 8);
  return {
    display: isEarly ? `${formattedTime} (Early Logout)` : formattedTime,
    className: isEarly ? "text-red-500" : "",
  };
};

// Truncate notes
const truncateNotes = (notes: string | null, maxLength: number = 50) => {
  if (!notes) return "-";
  const text = notes.replace(/<[^>]+>/g, ""); // Strip HTML tags for truncation
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const TimesheetList = ({
  timesheets,
  loading,
  type,
  onViewTimesheet,
  onRespondToClarification,
  handleApprove,
  handleRequestClarification,
  emptyMessage,
}: TimesheetListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([]);
  const [clarificationDialogOpen, setClarificationDialogOpen] = useState(false);
  const [clarificationTimesheetId, setClarificationTimesheetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  // Reset to page 1 when the filtered timesheet list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [timesheets]);

  const totalPages = Math.ceil(timesheets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTimesheets = timesheets.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectTimesheet = (timesheetId: string) => {
    setSelectedTimesheets((prev) =>
      prev.includes(timesheetId)
        ? prev.filter((id) => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTimesheets(paginatedTimesheets.map((t) => t.id));
    } else {
      setSelectedTimesheets([]);
    }
  };

  const handleBulkApprove = async () => {
    const failedApprovals: string[] = [];
    try {
      await Promise.all(
        selectedTimesheets.map(async (id) => {
          try {
            await handleApprove(id);
          } catch (error) {
            failedApprovals.push(id);
            console.error(`Failed to approve timesheet ${id}:`, error);
          }
        })
      );
      if (failedApprovals.length > 0) {
        toast.error(`Failed to approve ${failedApprovals.length} timesheet(s)`);
      } else {
        toast.success(`${selectedTimesheets.length} timesheet(s) approved successfully`);
      }
      setSelectedTimesheets([]);
    } catch (error) {
      toast.error("An unexpected error occurred during bulk approval");
      console.error("Bulk approval error:", error);
    }
  };

  const handleClarification = (timesheetId: string) => {
    setClarificationTimesheetId(timesheetId);
    setClarificationDialogOpen(true);
    setRejectionReason("");
    setReasonError(false);
  };

  const handleSendClarification = async () => {
    if (!rejectionReason.trim()) {
      setReasonError(true);
      return;
    }
    if (clarificationTimesheetId) {
      try {
        await handleRequestClarification(clarificationTimesheetId, rejectionReason);
        toast.success("Clarification request sent successfully");
        setClarificationDialogOpen(false);
        setRejectionReason("");
        setClarificationTimesheetId(null);
      } catch (error) {
        toast.error("Failed to send clarification request");
        console.error("Clarification error:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (timesheets.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {type === 'pending' && (
                  <th className="px-4 py-2 text-left text-sm">
                    <Checkbox
                      checked={selectedTimesheets.length === paginatedTimesheets.length && paginatedTimesheets.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-2 text-left text-sm">Date</th>
                <th className="px-4 py-2 text-left text-sm">Employee</th>
                <th className="px-4 py-2 text-left text-sm">Department</th>
                <th className="px-4 py-2 text-left text-sm">Login</th>
                <th className="px-4 py-2 text-left text-sm">Logout</th>
                <th className="px-4 py-2 text-right text-sm">Hours</th>
                <th className="px-4 py-2 text-left text-sm">Status</th>
                <th className="px-4 py-2 text-left text-sm">Notes</th>
                <th className="px-4 py-2 text-left text-sm">
                  <div className="flex items-center gap-2">
                    Actions
                    {type === 'pending' && selectedTimesheets.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkApprove}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Selected
                      </Button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-xs">
              {paginatedTimesheets.map((timesheet) => {
                const loginDisplay = getLoginDisplay(timesheet.clock_in_time);
                const logoutDisplay = getLogoutDisplay(timesheet.clock_out_time, timesheet.duration_minutes);
                const statusDisplay = getTimeBasedStatus(timesheet.duration_minutes);
                return (
                  <tr key={timesheet.id} className="hover:bg-gray-50 transition">
                    {type === 'pending' && (
                      <td className="px-4 py-2">
                        <Checkbox
                          checked={selectedTimesheets.includes(timesheet.id)}
                          onCheckedChange={() => handleSelectTimesheet(timesheet.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2">{formatDate(timesheet.date)}</td>
                    <td className="px-4 py-2 font-medium">
                      {timesheet.employee?.first_name && timesheet.employee?.last_name
                        ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
                        : 'Unknown Employee'}
                    </td>
                    <td className="px-4 py-2">{timesheet.employee?.department?.name || 'N/A'}</td>
                    <td className={`px-4 py-2 ${loginDisplay.className}`}>
                      {loginDisplay.display}
                    </td>
                    <td className={`px-4 py-2 ${logoutDisplay.className}`}>
                      {logoutDisplay.display}
                    </td>
                    <td className="px-4 py-2 text-right">{formatDuration(timesheet.duration_minutes)}</td>
                    <td className="px-4 py-2 flex gap-1 flex-wrap">
                      {statusDisplay.components.length > 0 ? statusDisplay.components : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <span className="cursor-pointer">{truncateNotes(timesheet.notes)}</span>
                        </PopoverTrigger>
                        <PopoverContent className="w-250">
                          {timesheet.notes ? parse(timesheet.notes) : '-'}
                        </PopoverContent>
                      </Popover>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {type === 'pending' && !timesheet.is_submitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => onViewTimesheet(timesheet)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => onViewTimesheet(timesheet)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {type === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                  try {
                                    await handleApprove(timesheet.id);
                                    toast.success("Timesheet approved successfully");
                                  } catch (error) {
                                    toast.error("Failed to approve timesheet");
                                    console.error("Approve error:", error);
                                  }
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <AlertDialog open={clarificationDialogOpen && clarificationTimesheetId === timesheet.id} onOpenChange={(open) => {
                                setClarificationDialogOpen(open);
                                if (!open) {
                                  setClarificationTimesheetId(null);
                                  setRejectionReason("");
                                  setReasonError(false);
                                }
                              }}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 border-yellow-500 text-yellow-500 hover:bg-yellow-50"
                                    onClick={() => handleClarification(timesheet.id)}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Clarify
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Request Clarification</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Request additional information from the employee before making a decision.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <label htmlFor="reason" className="block text-sm font-medium mb-2">
                                      Reason for clarification
                                    </label>
                                    <Textarea
                                      id="reason"
                                      value={rejectionReason}
                                      onChange={(e) => {
                                        setRejectionReason(e.target.value);
                                        if (e.target.value.trim()) setReasonError(false);
                                      }}
                                      placeholder="Please specify what information you need from the employee"
                                      className={`min-h-[100px] ${reasonError ? 'border-red-500' : ''}`}
                                    />
                                    {reasonError && (
                                      <p className="text-red-500 text-sm mt-1">Please provide a reason for clarification</p>
                                    )}
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleSendClarification}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Send Request
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </>
                      )}
                      {type === 'clarification' && onRespondToClarification && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => onRespondToClarification(timesheet)}
                        >
                          <MessageCircleQuestion className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {timesheets.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, timesheets.length)} of{" "}
            {timesheets.length} timesheets
          </span>
        </div>
      )}
    </div>
  );
};

export default TimesheetList;