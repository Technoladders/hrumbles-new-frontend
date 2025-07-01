
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

interface RegularizationTimeInputsProps {
  clockIn: string;
  clockOut: string;
  onClockInChange: (value: string) => void;
  onClockOutChange: (value: string) => void;
}

export const RegularizationTimeInputs = ({
  clockIn,
  clockOut,
  onClockInChange,
  onClockOutChange
}: RegularizationTimeInputsProps) => {
  // Extract time components from clockIn/clockOut if they exist
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: "12", minute: "00", period: "AM" };
    
    const parts = timeStr.split(/[:\s]/);
    if (parts.length >= 3) {
      return { 
        hour: parts[0].padStart(2, '0'), 
        minute: parts[1].padStart(2, '0'), 
        period: parts[2].toUpperCase() 
      };
    }
    return { hour: "12", minute: "00", period: "AM" };
  };
  
  const inTime = parseTime(clockIn);
  const outTime = parseTime(clockOut);
  
  const updateClockIn = (hour: string, minute: string, period: string) => {
    // Ensure consistent formatting
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    onClockInChange(`${formattedHour}:${formattedMinute} ${period.toUpperCase()}`);
  };

  const updateClockOut = (hour: string, minute: string, period: string) => {
    // Ensure consistent formatting
    const formattedHour = hour.padStart(2, '0');
    const formattedMinute = minute.padStart(2, '0');
    onClockOutChange(`${formattedHour}:${formattedMinute} ${period.toUpperCase()}`);
  };

  // Hours and minutes options
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Initialize with default values if none are provided
  useEffect(() => {
    if (!clockIn) {
      updateClockIn("12", "00", "AM");
    }
    if (!clockOut) {
      updateClockOut("12", "00", "AM");
    }
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="clockIn">Requested Clock In</Label>
        <div className="flex space-x-2">
          <Select 
            value={inTime.hour} 
            onValueChange={(value) => updateClockIn(value, inTime.minute, inTime.period)}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hours.map(hour => (
                <SelectItem key={`in-hour-${hour}`} value={hour}>{hour}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={inTime.minute} 
            onValueChange={(value) => updateClockIn(inTime.hour, value, inTime.period)}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map(minute => (
                <SelectItem key={`in-min-${minute}`} value={minute}>{minute}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={inTime.period} 
            onValueChange={(value) => updateClockIn(inTime.hour, inTime.minute, value)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clockOut">Requested Clock Out</Label>
        <div className="flex space-x-2">
          <Select 
            value={outTime.hour} 
            onValueChange={(value) => updateClockOut(value, outTime.minute, outTime.period)}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hours.map(hour => (
                <SelectItem key={`out-hour-${hour}`} value={hour}>{hour}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={outTime.minute} 
            onValueChange={(value) => updateClockOut(outTime.hour, value, outTime.period)}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map(minute => (
                <SelectItem key={`out-min-${minute}`} value={minute}>{minute}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={outTime.period} 
            onValueChange={(value) => updateClockOut(outTime.hour, outTime.minute, value)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
