
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/TimeManagement/dashboard/StatsCard";

interface DashboardStatsProps {
  weeklyTotals: {
    totalHours: number;
    totalMinutes: number;
    changePercentage: number;
    isPositive: boolean;
  };
  dailyData: any[];
}

export function DashboardStats({ weeklyTotals, dailyData }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatsCard 
        title="Total Hours"
        value={`${weeklyTotals.totalHours} h ${weeklyTotals.totalMinutes || 0} m`}
        changePercent={7.5}
        changeIsPositive={false}
        chartData={dailyData}
        subtitle="Total hours this week"
      />
      
      <StatsCard 
        title="Common Room"
        value="46 h 30 m"
        changePercent={3.5}
        changeIsPositive={true}
        chartData={dailyData}
        subtitle="Most hour logged project"
      />
      
      <StatsCard 
        title="Davidson Chambers"
        value="76%"
        changePercent={3.5}
        changeIsPositive={true}
        chartData={dailyData}
        subtitle="Most project activity"
        isPercentage={true}
      />
      
      <StatsCard 
        title="All Projects"
        value="72%"
        changePercent={0}
        chartData={dailyData}
        subtitle="Today's activity"
        isPercentage={true}
        showChangePercent={false}
      />
    </div>
  );
}
