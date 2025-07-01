import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { JobData } from "@/lib/types";
import {
  Building,
  CalendarDays,
  Clock,
  Users,
  Briefcase,
  IndianRupee,
  CircleUser,
  Hourglass,
  UserPlus,
  FileText,
  UserCheck,
  MapPin,
} from "lucide-react";
import { formatDisplayValue } from "./utils/formatUtils";
import { useSelector } from "react-redux";

interface JobDetailsRightCardProps {
  job: JobData;
}

const JobDetailsRightCard = ({ job }: JobDetailsRightCardProps) => {
  const userRole = useSelector((state: any) => state.auth.role);
  const isEmployee = userRole === 'employee';

  // Format HR Budget to INR
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="h-full shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Job Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Company / Client Name */}
        <InfoItem
          icon={<Building className="text-blue-500" />}
          title="Company Name"
          value={formatDisplayValue(job.clientDetails?.clientName || job.clientOwner)}
        />

        {/* Required Experience */}
        <InfoItem
          icon={<Hourglass className="text-orange-500" />}
          title="Required Experience"
          value={formatDisplayValue(`${job.experience?.min.years} years to ${job.experience?.max.years} years`)}
        />

        {/* No. of Positions */}
        <InfoItem
          icon={<UserPlus className="text-teal-500" />}
          title="No. of Positions"
          value={formatDisplayValue(job.numberOfCandidates)}
        />

        {/* Job Type */}
        <InfoItem
          icon={<FileText className="text-gray-500" />}
          title="Job Type"
          value={formatDisplayValue(job.jobType)}
        />

        {/* Hiring Mode */}
        <InfoItem
          icon={<UserCheck className="text-purple-500" />}
          title="Hiring Mode"
          value={formatDisplayValue(job.hiringMode)}
        />

        {/* Client Budget - Admin Only, Hidden for Employee */}
        {!isEmployee && (
          <InfoItem
            icon={<IndianRupee className="text-green-500" />}
            title="Client Budget"
            value={formatDisplayValue(job.clientDetails?.clientBudget)}
            isAdmin={true}
          />
        )}

        {/* HR Budget in Admin */}
        <InfoItem
  icon={<IndianRupee className="text-emerald-500" />}
  title={isEmployee ? "Budget" : "Budget (HR)"}
  value={`${formatINR(job.hr_budget)} ${job.hr_budget_type}`}
/>


        {/* Vendor Budget - Hidden for Employee */}
        {!isEmployee && job.budgets?.vendorBudget && (
          <InfoItem
            icon={<IndianRupee className="text-teal-500" />}
            title="Vendor Budget"
            value={formatDisplayValue(job.budgets?.vendorBudget)}
          />
        )}

        {/* End Client */}
        {job.clientDetails?.endClient && (
          <InfoItem
            icon={<CircleUser className="text-indigo-500" />}
            title="End Client"
            value={formatDisplayValue(job.clientDetails.endClient)}
          />
        )}

        {/* Posted Date */}
        <InfoItem
          icon={<CalendarDays className="text-amber-500" />}
          title="Date Posted"
          value={formatDisplayValue(job.postedDate)}
        />

        {/* Location */}
        {job.location?.length > 0 && (
          <InfoItem
            icon={<MapPin className="text-red-500" />}
            title="Location"
            value={job.location.map(loc => formatDisplayValue(loc)).join(", ")}
          />
        )}
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
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-medium">{title}:</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
};

export default JobDetailsRightCard;