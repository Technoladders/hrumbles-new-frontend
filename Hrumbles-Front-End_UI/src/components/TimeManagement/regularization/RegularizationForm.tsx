import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRegularizationForm } from "@/hooks/TimeManagement/regularization/useRegularizationForm";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useTimesheetCheck } from "@/hooks/TimeManagement/regularization/useTimesheetCheck";
import { RegularizationAlerts } from "./alerts/RegularizationAlerts";
import { RegularizationFormFields } from "./form/RegularizationFormFields";
import { format } from "date-fns";

interface RegularizationFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

export const RegularizationForm = ({ employeeId, onSuccess }: RegularizationFormProps) => {
  console.log('RegularizationForm render', { employeeId });
  const location = useLocation();
  const navigate = useNavigate();
  const { existingTimesheet, isChecking } = useTimesheetCheck();

  const {
    date,
    setDate,
    requestedClockIn,
    setRequestedClockIn,
    requestedClockOut,
    setRequestedClockOut,
    reason,
    setReason,
    isDateValid,
    handleSubmit,
    timeLogId,
    setTimeLogId,
    originalClockIn,
    setOriginalClockIn,
    originalClockOut,
    setOriginalClockOut
  } = useRegularizationForm({ employeeId, onSuccess });

  // Memoize formatted date to stabilize useQuery key
  const formattedDate = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  const { data: existingTimesheetData, isLoading: isCheckingTimesheet } = existingTimesheet(employeeId, date);

  useEffect(() => {
    if (location.state) {
      const { timeLogId, employeeId: stateEmployeeId, date: timesheetDate, clockIn, clockOut } = location.state;
      
      if (timeLogId) setTimeLogId(timeLogId);
      if (timesheetDate) setDate(new Date(timesheetDate));
      if (clockIn) {
        setOriginalClockIn(clockIn);
        setRequestedClockIn(format(new Date(clockIn), "hh:mm a"));
      }
      if (clockOut) {
        setOriginalClockOut(clockOut);
        setRequestedClockOut(format(new Date(clockOut), "hh:mm a"));
      }
    }
  }, [location.state, setTimeLogId, setDate, setOriginalClockIn, setRequestedClockIn, setOriginalClockOut, setRequestedClockOut]);

  const handleDateChange = async (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const isFromTimesheet = !!timeLogId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Regularization Request</CardTitle>
        <CardDescription>
          Submit a request to regularize your timesheet entry (allowed only for dates within the last 10 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegularizationAlerts
          isFromTimesheet={isFromTimesheet}
          existingTimesheet={existingTimesheetData}
          isChecking={isChecking || isCheckingTimesheet}
          date={date}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <RegularizationFormFields
            employeeId={employeeId}
            date={date}
            handleDateChange={handleDateChange}
            isDateValid={isDateValid}
            isFromTimesheet={isFromTimesheet}
            isChecking={isChecking || isCheckingTimesheet}
            requestedClockIn={requestedClockIn}
            requestedClockOut={requestedClockOut}
            setRequestedClockIn={setRequestedClockIn}
            setRequestedClockOut={setRequestedClockOut}
            reason={reason}
            setReason={setReason}
          />

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Submit Request
            </Button>
            {isFromTimesheet && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};