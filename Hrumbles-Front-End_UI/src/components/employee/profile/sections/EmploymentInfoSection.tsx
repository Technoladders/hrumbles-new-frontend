
import React from "react";
import { Briefcase } from "lucide-react";
import { InfoCard } from "../InfoCard";

interface EmploymentInfoSectionProps {
  employeeId: string;
  onEdit: () => void;
}

export const EmploymentInfoSection: React.FC<EmploymentInfoSectionProps> = ({
  employeeId,
  onEdit,
}) => {
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center">
      <span className="text-gray-500 w-1/3">{label}</span>
      <span className="flex-1 text-right">{value}</span>
      <div className="w-10 flex justify-end"></div>
    </div>
  );

  return (
    <InfoCard 
      title="Employment Details" 
      icon={Briefcase}
      onEdit={onEdit}
    >
      <div className="space-y-3 p-2">
        <div className="space-y-2">
          <InfoRow 
            label="Employee ID"
            value={employeeId}
          />
          <InfoRow 
            label="Department"
            value="Engineering"
          />
          <InfoRow 
            label="Position"
            value="Software Engineer"
          />
        </div>
      </div>
    </InfoCard>
  );
};
