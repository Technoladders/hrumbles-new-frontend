
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceStatsCards } from "./AttendanceStatsCards";
import { WorkingHoursChart } from "./WorkingHoursChart";
import { DailyDistributionChart } from "./DailyDistributionChart";
import { AttendanceHistoryTable } from "./AttendanceHistoryTable";
import type { TimeView } from "@/hooks/TimeManagement/useAttendanceData";

interface AttendanceContentProps {
  timeView: TimeView;
  onTimeViewChange: (value: string) => void;
  attendanceData: {
    present: number;
    absent: number;
    late: number;
    records: any[];
    weeklyHours: number;
    monthlyHours: number;
    dailyHours: Array<{ date: string; hours: number }>;
  };
  isExternal: boolean;
}

export function AttendanceContent({
  timeView,
  onTimeViewChange,
  attendanceData,
  isExternal
}: AttendanceContentProps) {
  return (
    <>
      <Tabs value={timeView} onValueChange={onTimeViewChange} className="mb-6">
        <TabsList className="mb-4 bg-primary/10 p-1">
          <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Monthly View
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AttendanceStatsCards 
        present={attendanceData.present}
        absent={attendanceData.absent}
        late={attendanceData.late}
        isExternal={isExternal}
        timeView={timeView}
      />

      <div className="grid gap-6 md:grid-cols-2 mb-6 mt-6">
        <div className="gradient-card p-4">
          <WorkingHoursChart 
            weeklyHours={attendanceData.weeklyHours}
            monthlyHours={attendanceData.monthlyHours}
            dailyHours={attendanceData.dailyHours}
            timeView={timeView}
          />
        </div>
        
        <div className="gradient-card p-4">
          <DailyDistributionChart 
            present={attendanceData.present}
            absent={attendanceData.absent}
            late={attendanceData.late}
            isExternal={isExternal}
          />
        </div>
      </div>

      <div className="gradient-card p-6">
        <AttendanceHistoryTable 
          records={attendanceData.records}
          isExternal={isExternal}
        />
      </div>
    </>
  );
}
