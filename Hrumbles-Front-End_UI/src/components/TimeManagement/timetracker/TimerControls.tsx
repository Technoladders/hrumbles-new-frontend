import { Button } from "@/components/ui/button";
import { LogOut, Coffee, LogIn, ChevronDown, Utensils } from "lucide-react";
import { Alert } from "@/components/TimeManagement/ui/alert";
// --- Import DropdownMenu components ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimerControlsProps {
  isTracking: boolean;
  isOnBreak: boolean;
  handleClockIn?: () => void;
  handleClockOut: () => void;
  handleStartBreak: (type: 'lunch' | 'coffee') => void;
  handleEndBreak: () => void;
  isOnApprovedLeave?: boolean;
}

export function TimerControls({
  isTracking,
  isOnBreak,
  handleClockIn,
  handleClockOut,
  handleStartBreak,
  handleEndBreak,
  isOnApprovedLeave = false
}: TimerControlsProps) {

  if (isOnApprovedLeave) {
    return (
      <Alert variant="default" className="text-center text-sm p-3">
        Time tracking is disabled during approved leave.
      </Alert>
    );
  }

  return (
    <div className="flex justify-center gap-3 w-full mt-4">
      {isTracking ? (
        isOnBreak ? (
          // --- User is ON BREAK ---
          <Button className="w-full" onClick={handleEndBreak}>End Break</Button>
        ) : (
          // --- User is TRACKING TIME ---
          <>
            <Button 
            size="sm"
              className="w-full gap-2 shadow-md bg-gray-800 hover:bg-gray-900 text-white"
              onClick={handleClockOut}
            >
              Clock Out <LogOut className="h-4 w-4" />
            </Button>
            
            {/* --- REPLACED Button with DropdownMenu --- */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full gap-2 shadow-sm">
                  Start Break <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStartBreak('lunch')}>
                  <Utensils className="h-4 w-4 mr-2" /> Lunch Break
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStartBreak('coffee')}>
                  <Coffee className="h-4 w-4 mr-2" /> Coffee Break
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )
      ) : (
        // --- User is LOGGED OUT ---
        <Button 
          className="w-full gap-2 shadow-md" 
          onClick={handleClockIn}
          disabled={!handleClockIn}
        >
          <LogIn className="h-4 w-4" />
          Clock In
        </Button>
      )}
    </div>
  );
}