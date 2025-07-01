
import { Award, Clock, UserCheck, UserX, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceStatsProps {
  present: number;
  absent: number;
  late: number;
  isExternal: boolean;
  timeView: 'weekly' | 'monthly';
}

export const AttendanceStatsCards = ({ present, absent, late, isExternal, timeView }: AttendanceStatsProps) => {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Present Days</CardTitle>
          <UserCheck className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{present}</div>
          <p className="text-xs text-muted-foreground">
            {timeView === 'weekly' ? 'This week' : 'This month'}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
          <UserX className="w-4 h-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{absent}</div>
          <p className="text-xs text-muted-foreground">
            {timeView === 'weekly' ? 'This week' : 'This month'}
          </p>
        </CardContent>
      </Card>
      
      {!isExternal && (
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Late Days</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{late}</div>
            <p className="text-xs text-muted-foreground">
              {timeView === 'weekly' ? 'This week' : 'This month'}
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
          <Award className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {present > 0
              ? Math.round((present / (present + absent)) * 100)
              : 0}%
          </div>
          <p className="text-xs text-muted-foreground">
            {timeView === 'weekly' ? 'This week' : 'This month'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
