
import React from "react";
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
  progress: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress }) => {
  return (
    <div className="w-full">
      <Progress value={progress} className="h-1" />
      <div className="text-[6px] text-gray-500 mt-1 text-right">{progress}%</div>
    </div>
  );
};
