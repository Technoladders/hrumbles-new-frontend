// Hrumbles-Front-End_UI\src\components\jobs\job-description\JobDetailsRightCard.tsx
// Changes: Consolidated experience here (removed from left). Added modern card styling with icons.
// Made it more scannable with better spacing. Kept role-based visibility.

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Consolidated Experience Display
  const getExperienceText = () => {
    const min = job.experience?.min;
    const max = job.experience?.max;
    if (min && max) {
      return `${min.years}-${max.years} years`;
    }
    if (min) {
      return `${min.years} years min`;
    }
    return "Not specified";
  };

  return (
    <Card className="h-full shadow-sm sticky top-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
          Quick Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Company / Client Name */}
        <InfoItem
          icon={<Building className="w-4 h-4 text-blue-500" />}
          label="Company"
          value={formatDisplayValue(job.clientDetails?.clientName || job.clientOwner)}
        />

        {/* Required Experience - Consolidated here */}
        <InfoItem
          icon={<Hourglass className="w-4 h-4 text-orange-500" />}
          label="Experience"
          value={getExperienceText()}
        />

        {/* No. of Positions */}
        <InfoItem
          icon={<UserPlus className="w-4 h-4 text-teal-500" />}
          label="Positions"
          value={formatDisplayValue(job.numberOfCandidates)}
          badge={<Badge variant="secondary" className="ml-1 text-xs bg-green-50 text-green-700 border-green-200">Open</Badge>}
        />

        {/* Job Type */}
        <InfoItem
          icon={<FileText className="w-4 h-4 text-gray-500" />}
          label="Type"
          value={formatDisplayValue(job.jobType)}
        />

        {/* Hiring Mode */}
        <InfoItem
          icon={<UserCheck className="w-4 h-4 text-purple-500" />}
          label="Hiring Mode"
          value={formatDisplayValue(job.hiringMode)}
        />

        {/* Client Budget - Admin Only */}
        {!isEmployee && job.clientDetails?.clientBudget && (
          <InfoItem
            icon={<IndianRupee className="w-4 h-4 text-green-500" />}
            label="Client Budget"
            value={formatDisplayValue(job.clientDetails.clientBudget)}
            isAdmin={true}
          />
        )}

        {/* HR Budget */}
        <InfoItem
          icon={<IndianRupee className="w-4 h-4 text-emerald-500" />}
          label={isEmployee ? "Budget" : "HR Budget"}
          value={`${formatINR(job.hr_budget)} ${job.hr_budget_type}`}
        />

        {/* Vendor Budget - Admin Only */}
        {!isEmployee && job.budgets?.vendorBudget && (
          <InfoItem
            icon={<IndianRupee className="w-4 h-4 text-teal-500" />}
            label="Vendor Budget"
            value={formatDisplayValue(job.budgets.vendorBudget)}
          />
        )}

        {/* End Client */}
        {job.clientDetails?.endClient && (
          <InfoItem
            icon={<CircleUser className="w-4 h-4 text-indigo-500" />}
            label="End Client"
            value={formatDisplayValue(job.clientDetails.endClient)}
          />
        )}

        {/* Posted Date */}
        <InfoItem
          icon={<CalendarDays className="w-4 h-4 text-amber-500" />}
          label="Posted"
          value={formatDisplayValue(job.postedDate)}
        />

        {/* Due Date */}
        <InfoItem
          icon={<Clock className="w-4 h-4 text-red-500" />}
          label="Due"
          value={formatDisplayValue(job.dueDate)}
          badge={<Badge variant="destructive" className="ml-1 text-xs">Urgent</Badge>} // Dynamic based on proximity
        />
      </CardContent>
    </Card>
  );
};

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isAdmin?: boolean;
  badge?: React.ReactNode;
}

const InfoItem = ({ icon, label, value, isAdmin = false, badge }: InfoItemProps) => {
  // Mock authorization check
  const isAuthorized = true;

  if (isAdmin && !isAuthorized) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-gray-600 truncate">{label}</span>
        <span className="block font-semibold text-gray-900 text-sm truncate">{value}</span>
      </div>
      {badge && <div className="flex-shrink-0">{badge}</div>}
    </div>
  );
};

export default JobDetailsRightCard;