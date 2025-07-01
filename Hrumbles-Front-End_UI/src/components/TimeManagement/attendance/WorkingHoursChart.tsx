
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HourglassIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface WorkingHoursChartProps {
  weeklyHours: number;
  monthlyHours: number;
  dailyHours: Array<{ date: string; hours: number }>;
  timeView: 'weekly' | 'monthly';
}

export const WorkingHoursChart = ({ weeklyHours, monthlyHours, dailyHours, timeView }: WorkingHoursChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>
          {timeView === 'weekly' ? 'Weekly' : 'Monthly'} working hours summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-6 flex items-center">
          <HourglassIcon className="mr-2 h-6 w-6 text-indigo-500" />
          {timeView === 'weekly' ? weeklyHours : monthlyHours} hours
        </div>
        
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyHours} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
