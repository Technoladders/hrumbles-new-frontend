
import { format, subDays } from "date-fns";
import { DashboardStats } from "@/components/TimeManagement/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/TimeManagement/dashboard/DashboardCharts";
import { DashboardTasks } from "@/components/TimeManagement/dashboard/DashboardTasks";
import { DashboardEmployees } from "@/components/TimeManagement/dashboard/DashboardEmployees";
import { useDashboardData } from "@/hooks/TimeManagement/useDashboardData";

const Dashboard = () => {
  const {
    isLoading,
    weeklyTotals,
    dailyData,
    topTimeLoggedEmployees,
    topActiveEmployees,
    projectBreakdown,
    ongoingTasks
  } = useDashboardData();
  
  const today = new Date();
  const displayDateRange = `from ${format(subDays(today, 7), "MMM do")} to ${format(today, "MMM do, yyyy")}`;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-gray-50">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            These data are showed {displayDateRange}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-emerald-500 text-white rounded-md">
            Me
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border rounded-md">
            Organization
          </button>
        </div>
      </div>

      <DashboardEmployees 
        topTimeLoggedEmployees={topTimeLoggedEmployees}
        topActiveEmployees={topActiveEmployees}
      />

      <DashboardStats 
        weeklyTotals={weeklyTotals}
        dailyData={dailyData}
      />

      <DashboardCharts 
        projectBreakdown={projectBreakdown}
      />

      <DashboardTasks 
        ongoingTasks={ongoingTasks}
      />
    </div>
  );
};

export default Dashboard;
