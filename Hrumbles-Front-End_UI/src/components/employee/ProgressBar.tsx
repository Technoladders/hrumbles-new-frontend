
import React from "react";

interface ProgressBarProps {
  percentage: number;
  title: string;
  subtitle: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  title,
  subtitle,
}) => {
  return (
    <div className="bg-white border flex flex-col mt-[19px] pl-4 pr-20 py-4 rounded-lg border-[rgba(238,238,238,1)] border-solid">
      <div className="text-black text-base font-semibold">{title}</div>
      <div className="bg-[rgba(242,242,245,1)] flex w-[600px] max-w-full flex-col mt-3 rounded-[100px]">
        <div
          className="bg-[rgba(221,1,1,1)] flex h-5 rounded-[10px] transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-[rgba(80,80,80,1)] text-xs font-medium mt-2">
        {subtitle}
      </div>
    </div>
  );
};
