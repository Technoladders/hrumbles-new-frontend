
import { AlertTriangle } from "lucide-react";

interface TimerDisplayProps {
  time: string;
  inGracePeriod?: boolean;
}

export function TimerDisplay({ time, inGracePeriod = false }: TimerDisplayProps) {
  return (
    <div className="text-center">
      <div className={`text-5xl font-mono font-bold tracking-widest my-6 py-6 px-4 rounded-lg ${inGracePeriod ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
        {time}
      </div>
      {inGracePeriod && (
        <div className="flex items-center justify-center gap-2 text-warning mb-4 p-2 bg-warning/10 rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Grace period active - please clock out soon</span>
        </div>
      )}
    </div>
  );
}
