import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RefreshCcw } from "lucide-react";

interface ControlButtonsProps {
  activeSession: any;
  isLoading: boolean;
  checkOfficeHours: () => boolean;
  onAction: (action: "start" | "pause" | "resume" | "reset" | "stop") => void;
}

export const ControlButtons: React.FC<ControlButtonsProps> = ({
  activeSession,
  isLoading,
  checkOfficeHours,
  onAction,
}) => {
  return (
    <div className="flex justify-center gap-3 mt-6">
      {!activeSession && (
        <Button
          size="icon"
          className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 w-12 h-12"
          onClick={() => onAction("start")}
          disabled={isLoading || !checkOfficeHours()}
        >
          <Play className="h-5 w-5 text-white" />
        </Button>
      )}

      {activeSession && activeSession.status === "running" && (
        <Button
          size="icon"
          className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 w-12 h-12"
          onClick={() => onAction("pause")}
          disabled={isLoading}
        >
          <Pause className="h-5 w-5 text-white" />
        </Button>
      )}

      {activeSession && activeSession.status === "paused" && (
        <Button
          size="icon"
          className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 w-12 h-12"
          onClick={() => onAction("resume")}
          disabled={isLoading}
        >
          <Play className="h-5 w-5 text-white" />
        </Button>
      )}

      {activeSession && (
        <>
          <Button
            size="icon"
            className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 w-12 h-12"
            onClick={() => onAction("stop")}
            disabled={isLoading}
          >
            <Square className="h-5 w-5 text-red-400" />
          </Button>
          <Button
            size="icon"
            className="bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30 w-12 h-12"
            onClick={() => onAction("reset")}
            disabled={isLoading}
          >
            <RefreshCcw className="h-5 w-5 text-white" />
          </Button>
        </>
      )}
    </div>
  );
};