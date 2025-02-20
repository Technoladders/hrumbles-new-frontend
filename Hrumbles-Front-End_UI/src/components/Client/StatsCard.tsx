
import React from "react";
import { cn } from "../../lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  color?: string;
  textColor?: string;
  className?: string;
}

const StatsCard = ({ label, value, color = "bg-primary", textColor = "text-white", className }: StatsCardProps) => {
  return (
    <div className={cn("px-6 py-2 rounded-full", color, textColor, className)}>
      <span className="text-sm font-medium">{label}</span>
      <span className="ml-2 font-semibold">{value}</span>
    </div>
  );
};

export default StatsCard;
