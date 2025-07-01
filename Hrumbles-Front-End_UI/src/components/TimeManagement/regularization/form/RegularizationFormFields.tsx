import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RegularizationDatePicker } from "../RegularizationDatePicker";
import { RegularizationTimeInputs } from "../RegularizationTimeInputs";
import { Skeleton } from "@/components/ui/skeleton";

interface RegularizationFormFieldsProps {
  employeeId: string;
  date: Date;
  handleDateChange: (date: Date | undefined) => void;
  isDateValid: (date: Date) => boolean;
  isFromTimesheet: boolean;
  isChecking: boolean;
  requestedClockIn: string;
  requestedClockOut: string;
  setRequestedClockIn: (value: string) => void;
  setRequestedClockOut: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
}

export const RegularizationFormFields = ({
  employeeId,
  date,
  handleDateChange,
  isDateValid,
  isFromTimesheet,
  isChecking,
  requestedClockIn,
  requestedClockOut,
  setRequestedClockIn,
  setRequestedClockOut,
  reason,
  setReason,
}: RegularizationFormFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Date</Label>
        {isChecking ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <RegularizationDatePicker
            date={date}
            onDateChange={handleDateChange}
            isDateValid={isDateValid}
            disabled={isFromTimesheet}
          />
        )}
      </div>

      <RegularizationTimeInputs
        clockIn={requestedClockIn}
        clockOut={requestedClockOut}
        onClockInChange={setRequestedClockIn}
        onClockOutChange={setRequestedClockOut}
      />

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Regularization</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please provide a detailed reason for this regularization request"
          className="min-h-[100px]"
          required
        />
      </div>
    </div>
  );
};