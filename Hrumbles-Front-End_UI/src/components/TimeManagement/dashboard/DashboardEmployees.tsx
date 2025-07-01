
import { TopEmployeesCard } from "@/components/TimeManagement/dashboard/TopEmployeesCard";

interface DashboardEmployeesProps {
  topTimeLoggedEmployees: any[];
  topActiveEmployees: any[];
}

export function DashboardEmployees({ topTimeLoggedEmployees, topActiveEmployees }: DashboardEmployeesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <TopEmployeesCard 
        title="Top 5 Members based on activity" 
        employees={topActiveEmployees} 
        type="activity" 
      />
      
      <TopEmployeesCard 
        title="Top 5 Members based on time logged" 
        employees={topTimeLoggedEmployees} 
        type="time" 
      />
    </div>
  );
}
