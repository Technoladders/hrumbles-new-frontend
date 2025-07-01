
import { Card, CardContent } from "@/components/ui/card";
import { ActivityChart } from "@/components/TimeManagement/dashboard/ActivityChart";
import { ProjectBreakdown } from "@/components/TimeManagement/dashboard/ProjectBreakdown";

interface DashboardChartsProps {
  projectBreakdown: {
    name: string;
    value: number;
    time: string;
    color: string;
  }[];
}

export function DashboardCharts({ projectBreakdown }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4 items-center">
              <h3 className="font-semibold text-lg">Activity Report</h3>
              <span className="text-sm text-gray-500">All Projects</span>
            </div>
            <button className="text-emerald-500 text-sm font-medium">View More</button>
          </div>
          <div className="h-64">
            <ActivityChart />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Top Assigned Projects</h3>
          </div>
          <ProjectBreakdown projects={projectBreakdown} />
        </CardContent>
      </Card>
    </div>
  );
}
