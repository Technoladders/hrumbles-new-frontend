import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { JobData } from "@/lib/types";
import {
  Building,
  DollarSign,
  CalendarDays,
  Clock,
  Users,
  Briefcase,
  Banknote,
  IndianRupee,
  CircleUser,
} from "lucide-react";
import { formatDisplayValue } from "./utils/formatUtils";
 
interface JobDetailsRightCardProps {
  job: JobData;
}
 
const JobDetailsRightCard = ({ job }: JobDetailsRightCardProps) => {
  return (
    <Card className="h-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Job Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company / Client Name */}
        <InfoItem
          icon={<Building className="text-blue-500" />}
          title="Company Name"
          value={formatDisplayValue(job.clientDetails?.clientName || job.clientOwner)}
        />
       
        {/* Client Budget - Admin Only */}
        <InfoItem
          icon={<Banknote className="text-green-500" />}
          title="Client Budget (Admin)"
          value={formatDisplayValue(job.clientDetails?.clientBudget)}
          isAdmin={true}
        />
       
        {/* HR Budget */}
        <InfoItem
          icon={<IndianRupee className="text-emerald-500" />}
          title="Budget (HR)"
          value={formatDisplayValue(job.budgets?.hrBudget)}
        />
       
        {/* Vendor Budget */}
        <InfoItem
          icon={<IndianRupee className="text-teal-500" />}
          title="Vendor Budget"
          value={formatDisplayValue(job.budgets?.vendorBudget)}
        />
       
        {/* End Client */}
        <InfoItem
          icon={<CircleUser className="text-indigo-500" />}
          title="End Client"
          value={formatDisplayValue(job.clientDetails?.endClient)}
        />
       
        {/* Posted Date */}
        <InfoItem
          icon={<CalendarDays className="text-amber-500" />}
          title="Date Posted"
          value={formatDisplayValue(job.postedDate)}
        />
       
        {/* Due Date */}
        <InfoItem
          icon={<Clock className="text-red-500" />}
          title="Due Date"
          value={formatDisplayValue(job.dueDate)}
        />
       
        {/* Department */}
        <InfoItem
          icon={<Users className="text-purple-500" />}
          title="Department"
          value={formatDisplayValue(job.department)}
        />
       
        {/* Submission Type */}
        <InfoItem
          icon={<Briefcase className="text-gray-500" />}
          title="Submission Type"
          value={formatDisplayValue(job.submissionType)}
        />
      </CardContent>
    </Card>
  );
};
 
interface InfoItemProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  isAdmin?: boolean;
}
 
const InfoItem = ({ icon, title, value, isAdmin = false }: InfoItemProps) => {
  // Mock authorization check
  const isAuthorized = true; // In a real app, this would be from auth context
 
  // If it's admin-only and user is not authorized, don't show
  if (isAdmin && !isAuthorized) {
    return null;
  }
 
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="pl-7 text-gray-700">{value}</p>
    </div>
  );
};
 
export default JobDetailsRightCard;