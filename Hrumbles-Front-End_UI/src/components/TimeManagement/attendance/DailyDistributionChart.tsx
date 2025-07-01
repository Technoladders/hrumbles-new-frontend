
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Circle } from "lucide-react";

interface DailyDistributionChartProps {
  present: number;
  absent: number;
  late: number;
  isExternal: boolean;
}

export const DailyDistributionChart = ({ present, absent, late, isExternal }: DailyDistributionChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Distribution</CardTitle>
        <CardDescription>
          Attendance status distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-[250px]">
        <div className="grid grid-cols-3 gap-6 text-center w-full">
          <div className="flex flex-col items-center p-4 rounded-lg bg-green-50">
            <Circle className="h-8 w-8 mb-2 fill-green-500 text-green-500" />
            <span className="text-lg font-semibold">{present}</span>
            <span className="text-sm text-muted-foreground">Present</span>
          </div>
          
          <div className="flex flex-col items-center p-4 rounded-lg bg-gray-50">
            <Circle className="h-8 w-8 mb-2 fill-gray-300 text-gray-300" />
            <span className="text-lg font-semibold">{absent}</span>
            <span className="text-sm text-muted-foreground">Absent</span>
          </div>
          
          {!isExternal && (
            <div className="flex flex-col items-center p-4 rounded-lg bg-yellow-50">
              <Circle className="h-8 w-8 mb-2 fill-yellow-500 text-yellow-500" />
              <span className="text-lg font-semibold">{late}</span>
              <span className="text-sm text-muted-foreground">Late</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
