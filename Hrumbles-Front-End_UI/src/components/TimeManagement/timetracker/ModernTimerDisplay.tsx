
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ModernTimerDisplayProps {
  time: string;
  inGracePeriod?: boolean;
}

export function ModernTimerDisplay({ time, inGracePeriod = false }: ModernTimerDisplayProps) {
  const [hours, minutes, seconds] = time.split(':');

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className={cn(
        "rounded-2xl p-8 backdrop-blur-sm transition-all duration-300",
        inGracePeriod ? 
        "bg-gradient-to-br from-orange-500/20 to-red-500/20" :
        "bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20"
      )}>
        <div className="flex justify-center items-center gap-4 text-7xl font-mono tracking-tight">
          <div className="flex flex-col items-center">
            <span className="bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              {hours}
            </span>
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <Separator orientation="vertical" className="h-16" />
          <div className="flex flex-col items-center">
            <span className="bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {minutes}
            </span>
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <Separator orientation="vertical" className="h-16" />
          <div className="flex flex-col items-center">
            <span className="bg-gradient-to-br from-pink-500 to-rose-500 bg-clip-text text-transparent">
              {seconds}
            </span>
            <span className="text-sm text-muted-foreground">seconds</span>
          </div>
        </div>
        {inGracePeriod && (
          <div className="absolute top-2 right-2 flex items-center gap-2 text-warning bg-warning/10 px-3 py-1 rounded-full">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Grace Period</span>
          </div>
        )}
      </div>
    </div>
  );
}
