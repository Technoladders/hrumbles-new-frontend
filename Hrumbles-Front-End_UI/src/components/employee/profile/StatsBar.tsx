
import React from "react";
import { Card } from "@/components/ui/card";
import { Users, Building2, BadgeCheck, Clock } from "lucide-react";
import { format } from "date-fns";

interface StatsBarProps {
  joinedDate: string;
  department: string;
  designation: string;
  yearsOfExperience: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  joinedDate,
  department,
  designation,
  yearsOfExperience,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateStr, error);
      return 'Invalid date';
    }
  };

  const stats = [
    { title: "Joined Date", value: formatDate(joinedDate), icon: <Users className="w-5 h-5" /> },
    { title: "Department", value: department || "Not specified", icon: <Building2 className="w-5 h-5" /> },
    { title: "Designation", value: designation || "Not specified", icon: <BadgeCheck className="w-5 h-5" /> },
    { title: "Total Experience", value: yearsOfExperience || "0.0 years", icon: <Clock className="w-5 h-5" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
      {stats.map(({ title, value, icon }) => (
        <Card key={title} className="p-4 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm border border-white/20">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <div className="text-xs text-gray-500">{title}</div>
              <div className="text-sm font-medium">{value}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
