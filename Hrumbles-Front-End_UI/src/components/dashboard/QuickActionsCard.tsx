import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, User, Calendar, Briefcase, Zap, Target } from "lucide-react";

interface QuickActionsCardProps {
  showJobsLink: boolean;
}

const ActionButton = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Button asChild variant="copyicon1" className="w-full justify-start h-10 px-3 py-2 text-sm">
    <Link to={to}>
      <div className="flex items-center w-full">
        {icon}
        <span className="ml-3 font-medium">{label}</span>
        <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
      </div>
    </Link>
  </Button>
);

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ showJobsLink }) => {
  return (
    <Card className="shadow-md rounded-xl h-full flex flex-col purple-gradient">
      <CardHeader className="pb-2">
        <CardTitle className="flex text-white items-center text-base">
          <Zap className="h-4 w-4 text-white mr-2" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-center flex-grow space-y-1 p-1 text-xs">
        <ActionButton to="/profile" icon={<User className="h-4 w-4 "/>} label="My Profile" />
        <ActionButton to="/employee/timesheet" icon={<Calendar className="h-4 w-4 "/>} label="View Timesheets" />
        <ActionButton to="/goalsview" icon={<Target className="h-4 w-4 "/>} label="View Goals" />
        <ActionButton to="/employee/leave" icon={<Calendar className="h-4 w-4 "/>} label="Apply for Leave" />
        <ActionButton to="/employee/attendance" icon={<Calendar className="h-4 w-4 "/>} label="Attendance" />
        {showJobsLink && (
          <ActionButton to="/jobs" icon={<Briefcase className="h-4 w-4 "/>} label="View Jobs" />
        )}
      </CardContent>
    </Card>
  );
};