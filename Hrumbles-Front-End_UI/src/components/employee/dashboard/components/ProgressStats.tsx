
import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressStatsProps {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  onLeaveCount: number;
}

export const ProgressStats: React.FC<ProgressStatsProps> = ({ 
  totalCount,
  activeCount,
  inactiveCount,
  onLeaveCount
}) => {
  const calculatePercentage = (count: number): number => {
    if (totalCount === 0) return 0;
    return (count / totalCount) * 100;
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-brand-secondary">Total Employees</span>
          <span className="text-sm font-bold">{totalCount}</span>
        </div>
        <Progress value={100} className="h-2 bg-gray-100" />
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-brand-secondary">Active</span>
          <span className="text-sm font-bold">{activeCount}</span>
        </div>
        <Progress 
          value={calculatePercentage(activeCount)} 
          className="h-2 bg-gray-100" 
        />
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-brand-secondary">On Leave</span>
          <span className="text-sm font-bold">{onLeaveCount}</span>
        </div>
        <Progress 
          value={calculatePercentage(onLeaveCount)} 
          className="h-2 bg-gray-100" 
        />
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-brand-secondary">Inactive</span>
          <span className="text-sm font-bold">{inactiveCount}</span>
        </div>
        <Progress 
          value={calculatePercentage(inactiveCount)} 
          className="h-2 bg-gray-100" 
        />
      </div>
    </div>
  );
};
