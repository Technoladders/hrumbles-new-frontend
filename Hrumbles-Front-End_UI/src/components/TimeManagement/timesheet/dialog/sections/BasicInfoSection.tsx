
import { TimeLog } from "@/types/time-tracker-types";
import { Badge } from "@/components/ui/badge";

interface BasicInfoSectionProps {
  timeLog: TimeLog;
  parsedNotes: {
    title: string;
    workReport: string;
  };
}

export const BasicInfoSection = ({ timeLog, parsedNotes }: BasicInfoSectionProps) => {
  if (!parsedNotes.title) return null;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 rounded-lg border border-violet-100">
      <h3 className="text-sm font-medium text-violet-800">{parsedNotes.title}</h3>
    </div>
  );
};
