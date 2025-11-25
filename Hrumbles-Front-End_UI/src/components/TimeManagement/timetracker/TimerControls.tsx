import { Button } from "@/components/ui/button";
import { LogOut, Coffee, LogIn, ChevronDown, Utensils, Sparkles } from "lucide-react";
import { Alert } from "@/components/TimeManagement/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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

// Celebration particles component
const CelebrationParticles = ({ show, color }: { show: boolean; color: string }) => {
  if (!show) return null;
  
  const particles = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: color,
            left: '50%',
            top: '50%',
          }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            x: Math.cos((i / particles.length) * Math.PI * 2) * 100,
            y: Math.sin((i / particles.length) * Math.PI * 2) * 100,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            ease: 'easeOut',
            times: [0, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
};

export function TimerControls({
  isTracking,
  isOnBreak,
  handleClockIn,
  handleClockOut,
  handleStartBreak,
  handleEndBreak,
  isOnApprovedLeave = false
}: TimerControlsProps) {
  const [showClockInAnimation, setShowClockInAnimation] = useState(false);
  const [showClockOutAnimation, setShowClockOutAnimation] = useState(false);
  const [showBreakAnimation, setShowBreakAnimation] = useState(false);

  if (isOnApprovedLeave) {
    return (
      <Alert variant="default" className="text-center text-sm p-3">
        Time tracking is disabled during approved leave.
      </Alert>
    );
  }

  const onClockInClick = () => {
    setShowClockInAnimation(true);
    setTimeout(() => setShowClockInAnimation(false), 1500);
    handleClockIn?.();
  };

  const onClockOutClick = () => {
    console.log("DEBUG: 1. [TimerControls] Clock Out button CLICKED.");
    setShowClockOutAnimation(true);
    setTimeout(() => setShowClockOutAnimation(false), 1500);
    handleClockOut();
  };

  const onStartBreakClick = (type: 'lunch' | 'coffee') => {
    setShowBreakAnimation(true);
    setTimeout(() => setShowBreakAnimation(false), 1500);
    handleStartBreak(type);
  };

  return (
    <motion.div 
      className="relative flex justify-center gap-3 w-full mt-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Celebration Animations */}
      <AnimatePresence>
        {showClockInAnimation && <CelebrationParticles show={true} color="#10b981" />}
        {showClockOutAnimation && <CelebrationParticles show={true} color="#f59e0b" />}
        {showBreakAnimation && <CelebrationParticles show={true} color="#06b6d4" />}
      </AnimatePresence>

      {isTracking ? (
        isOnBreak ? (
          // --- User is ON BREAK ---
          <motion.div
            className="w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              className="w-full relative overflow-hidden group shadow-lg"
              onClick={handleEndBreak}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-teal-400/20"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                <Coffee className="h-4 w-4" />
                End Break
              </span>
            </Button>
          </motion.div>
        ) : (
          // --- User is TRACKING TIME ---
          <motion.div
            className="flex gap-3 w-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Clock Out Button */}
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.03, rotateY: 5 }}
              whileTap={{ scale: 0.97 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Button 
                size="sm"
                className="w-full gap-2 shadow-lg bg-gray-800 hover:bg-gray-900 text-white relative overflow-hidden"
                onClick={onClockOutClick}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                <span className="relative flex items-center gap-2">
                  Clock Out <LogOut className="h-4 w-4" />
                </span>
              </Button>
            </motion.div>
            
            {/* Start Break Dropdown */}
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.03, rotateY: -5 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 shadow-md hover:shadow-lg transition-all relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 opacity-0 group-hover:opacity-100"
                      transition={{ duration: 0.3 }}
                    />
                    <span className="relative flex items-center gap-2">
                      Start Break <ChevronDown className="h-4 w-4" />
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DropdownMenuItem 
                      onClick={() => onStartBreakClick('lunch')}
                    className="cursor-pointer rounded-lg hover:bg-orange-50 hover:text-gray-900 focus:bg-orange-100 focus:text-gray-900"
                    >
                      <Utensils className="h-4 w-4 mr-2 text-orange-600" /> 
                      <span className="font-medium">Lunch Break</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onStartBreakClick('coffee')}
                     className="cursor-pointer rounded-lg hover:bg-cyan-50 hover:text-gray-900 focus:bg-cyan-100 focus:text-gray-900"
                    >
                      <Coffee className="h-4 w-4 mr-2 text-cyan-600" /> 
                      <span className="font-medium">Coffee Break</span>
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          </motion.div>
        )
      ) : (
        // --- User is LOGGED OUT ---
        <motion.div
          className="w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.3 }}
        >
          <Button 
            className="w-full gap-2 shadow-lg relative overflow-hidden group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
            onClick={onClockInClick}
            disabled={!handleClockIn}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              <span className="font-semibold">Clock In</span>
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity 
                }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
            </span>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}