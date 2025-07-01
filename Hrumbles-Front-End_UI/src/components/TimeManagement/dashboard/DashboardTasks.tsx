
import { Card, CardContent } from "@/components/ui/card";
import { TasksCard } from "@/components/TimeManagement/dashboard/TasksCard";
import { WeeklyTimesheet } from "@/components/TimeManagement/dashboard/WeeklyTimesheet";

interface DashboardTasksProps {
  ongoingTasks: {
    id: number;
    name: string;
    project: string;
    time: string;
    bgColor: string;
  }[];
}

export function DashboardTasks({ ongoingTasks }: DashboardTasksProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Ongoing Tasks</h3>
            <button className="text-emerald-500 text-sm font-medium">View More</button>
          </div>
          <TasksCard tasks={ongoingTasks} />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Timesheet</h3>
            <button className="text-emerald-500 text-sm font-medium">View More</button>
          </div>
          <WeeklyTimesheet />
        </CardContent>
      </Card>
    </div>
  );
}
