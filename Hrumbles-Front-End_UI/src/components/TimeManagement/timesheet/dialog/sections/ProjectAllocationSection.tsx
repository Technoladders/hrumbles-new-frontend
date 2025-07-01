
import { TimeLog } from "@/types/time-tracker-types";
import { Badge } from "@/components/ui/badge";

interface ProjectAllocationSectionProps {
  timeLog: TimeLog;
  getProjectName: (projectId: string | null) => string;
}

export const ProjectAllocationSection = ({ timeLog, getProjectName }: ProjectAllocationSectionProps) => {
  if (!timeLog.project_time_data || !Array.isArray(timeLog.project_time_data)) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-100">
      <h3 className="text-xs font-medium text-amber-800 mb-2">Project Allocation</h3>
      <div className="space-y-1.5">
        {timeLog.project_time_data.map((item: any, index: number) => (
          <div key={index} className="bg-white/80 p-2 rounded shadow-sm">
            <div className="flex justify-between">
              <h5 className="text-xs font-medium text-amber-900">
                {getProjectName(item.project_id)}
              </h5>
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                {item.hours} hrs
              </Badge>
            </div>
            {item.report && (
              <p className="text-xs text-amber-700 mt-1 line-clamp-2">
                {item.report}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
