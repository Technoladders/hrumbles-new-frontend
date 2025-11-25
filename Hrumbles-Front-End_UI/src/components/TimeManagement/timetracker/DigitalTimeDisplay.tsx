import { CheckCircle, Clock, Coffee, LogIn, LogOut, Sparkles } from 'lucide-react';
import { format, isToday, parseISO, differenceInSeconds } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface DigitalTimeDisplayProps {
  time: string;
  timeLogs: any[];
  isOnBreak: boolean;
  breakTime: string;
  onClockIn?: () => void;
  onClockOut?: () => void;
}

const formatDisplayTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  try {
    const date = parseISO(timeStr);
    return format(date, 'hh:mm a');
  } catch (error) {
    console.error("Error parsing time:", timeStr, error);
    return '-';
  }
};

const formatSecondsToHHMMSS = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Celebration particles component
const CelebrationParticles = ({ type }: { type: 'clockIn' | 'clockOut' }) => {
  const particles = Array.from({ length: 20 }, (_, i) => i);
  const color = type === 'clockIn' ? '#10b981' : '#f59e0b';

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
            x: Math.cos((i / particles.length) * Math.PI * 2) * 150,
            y: Math.sin((i / particles.length) * Math.PI * 2) * 150,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
            times: [0, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
};

export function DigitalTimeDisplay({ 
  time, 
  timeLogs, 
  isOnBreak, 
  breakTime,
  onClockIn,
  onClockOut 
}: DigitalTimeDisplayProps) {
  const [showClockInAnimation, setShowClockInAnimation] = useState(false);
  const [showClockOutAnimation, setShowClockOutAnimation] = useState(false);
  const [prevClockInTime, setPrevClockInTime] = useState<string | null>(null);
  const [prevClockOutTime, setPrevClockOutTime] = useState<string | null>(null);

  const todayLog = timeLogs.find(log => log.date && isToday(parseISO(log.date)));
  const clockInTime = todayLog ? todayLog.clock_in_time : null;
  const clockOutTime = todayLog ? todayLog.clock_out_time : null;

  // Trigger animations when clock in/out changes
  useEffect(() => {
    if (clockInTime && clockInTime !== prevClockInTime) {
      setShowClockInAnimation(true);
      setPrevClockInTime(clockInTime);
      setTimeout(() => setShowClockInAnimation(false), 2000);
    }
  }, [clockInTime, prevClockInTime]);

  useEffect(() => {
    if (clockOutTime && clockOutTime !== prevClockOutTime) {
      setShowClockOutAnimation(true);
      setPrevClockOutTime(clockOutTime);
      setTimeout(() => setShowClockOutAnimation(false), 2000);
    }
  }, [clockOutTime, prevClockOutTime]);

  const totalBreakMinutes = (todayLog?.break_logs || [])
    .filter((b: any) => b.duration_minutes)
    .reduce((sum: number, breakItem: any) => sum + breakItem.duration_minutes, 0);
    
  const totalBreakHours = Math.floor(totalBreakMinutes / 60);
  const remainingBreakMinutes = totalBreakMinutes % 60;
  
  const totalBreakTimeDisplay = totalBreakMinutes > 0
    ? `${String(totalBreakHours).padStart(2, '0')}:${String(remainingBreakMinutes).padStart(2, '0')}`
    : '00:00';

  let sessionDurationDisplay = time;

  if (clockInTime && clockOutTime) {
    try {
      const clockInDate = parseISO(clockInTime);
      const clockOutDate = parseISO(clockOutTime);
      const grossTotalSeconds = differenceInSeconds(clockOutDate, clockInDate);
      const totalBreakSeconds = totalBreakMinutes * 60;
      const netWorkSeconds = grossTotalSeconds - totalBreakSeconds;
      sessionDurationDisplay = formatSecondsToHHMMSS(netWorkSeconds);
    } catch (e) {
      console.error("Could not calculate final duration", e);
      sessionDurationDisplay = "Error";
    }
  }

  const isClockedIn = !!clockInTime && !clockOutTime;
  const isClockedOut = !!clockOutTime;

  return (
    <div className="w-full relative h-full">
      {/* Celebration Animations */}
      <AnimatePresence>
        {showClockInAnimation && <CelebrationParticles type="clockIn" />}
        {showClockOutAnimation && <CelebrationParticles type="clockOut" />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        // CHANGED: Reduced padding from p-3 to p-2.5 to make card smaller
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-2.5 shadow-lg border border-indigo-100 h-full flex flex-col justify-between"
      >
        {/* Animated Background Gradient */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1), transparent)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Header with Date */}
        <motion.div 
          // CHANGED: Reduced margin from mb-3 to mb-2
          className="flex items-center justify-between mb-2 relative z-10"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Clock className="h-3.5 w-3.5 text-indigo-600" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 leading-tight">Time Tracker</h3>
              <p className="text-[10px] text-gray-500">{format(new Date(), 'EEE, MMM d, yyyy')}</p>
            </div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isClockedIn && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Active
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Clock In / Out Cards with 3D Effect */}
        <div className="grid grid-cols-2 gap-2 mb-2 relative z-10">
          <motion.div
            whileHover={{ scale: 1.05, rotateY: 5 }}
            style={{ transformStyle: 'preserve-3d' }}
            // CHANGED: Reduced padding to p-2
            className={`relative rounded-lg p-2 transition-all duration-300 ${
              clockInTime 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-md' 
                : 'bg-white border border-gray-200'
            }`}
          >
            {showClockInAnimation && (
              <motion.div
                className="absolute inset-0 bg-green-400 rounded-lg"
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
            <div className="flex items-center gap-1.5 mb-0.5">
              <LogIn className={`h-3 w-3 ${clockInTime ? 'text-green-600' : 'text-gray-400'}`} />
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Clock In</p>
            </div>
            <motion.p 
              // CHANGED: Reduced font from text-xl to text-lg
              className={`text-lg font-bold truncate ${clockInTime ? 'text-green-700' : 'text-gray-400'}`}
              animate={showClockInAnimation ? { scale: [1, 1.2, 1] } : {}}
            >
              {formatDisplayTime(clockInTime)}
            </motion.p>
            {clockInTime && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              </motion.div>
            )}
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, rotateY: -5 }}
            style={{ transformStyle: 'preserve-3d' }}
            // CHANGED: Reduced padding to p-2
            className={`relative rounded-lg p-2 transition-all duration-300 ${
              clockOutTime 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-md' 
                : 'bg-white border border-gray-200'
            }`}
          >
            {showClockOutAnimation && (
              <motion.div
                className="absolute inset-0 bg-amber-400 rounded-lg"
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
            <div className="flex items-center gap-1.5 mb-0.5">
              <LogOut className={`h-3 w-3 ${clockOutTime ? 'text-amber-600' : 'text-gray-400'}`} />
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Clock Out</p>
            </div>
            <motion.p 
              // CHANGED: Reduced font from text-xl to text-lg
              className={`text-lg font-bold truncate ${clockOutTime ? 'text-amber-700' : 'text-gray-400'}`}
              animate={showClockOutAnimation ? { scale: [1, 1.2, 1] } : {}}
            >
              {formatDisplayTime(clockOutTime)}
            </motion.p>
            {clockOutTime && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Live Tracker Label */}
        <motion.div 
          // CHANGED: Reduced margin from mb-3 to mb-1.5
          className="text-center mb-1.5 relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Live Tracker</p>
            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
          </div>
        </motion.div>

        {/* Duration Display Cards with 3D Flip */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <motion.div
            whileHover={{ 
              scale: 1.05,
              rotateX: 5,
              rotateY: -5,
            }}
            style={{ transformStyle: 'preserve-3d' }}
            // CHANGED: Reduced padding to p-2.5
            className="bg-gradient-to-br from-purple-400 to-purple-700 rounded-lg p-2.5 shadow-lg text-white"
          >
            <motion.div
              animate={{ 
                scale: isClockedIn ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                duration: 2, 
                repeat: isClockedIn ? Infinity : 0 
              }}
            >
              {/* CHANGED: Reduced font from text-2xl to text-xl */}
              <p className="text-xl font-mono font-bold tracking-tight mb-0.5">
                {sessionDurationDisplay}
              </p>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 opacity-80" />
                <p className="text-[9px] font-medium opacity-90 uppercase">Session Duration</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            whileHover={{ 
              scale: 1.05,
              rotateX: 5,
              rotateY: 5,
            }}
            style={{ transformStyle: 'preserve-3d' }}
            // CHANGED: Reduced padding to p-2.5
className={`rounded-lg p-2.5 shadow-lg text-white transition-all duration-300 ${
  isOnBreak 
    ? 'bg-gradient-to-br from-cyan-400 to-teal-500' 
    : 'bg-gradient-to-br from-blue-500 to-blue-600' // <--- CHANGED THIS
}`}
          >
            <motion.div
              animate={{ 
                scale: isOnBreak ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                duration: 2, 
                repeat: isOnBreak ? Infinity : 0 
              }}
            >
               {/* CHANGED: Reduced font from text-2xl to text-xl */}
              <p className="text-xl font-mono font-bold tracking-tight mb-0.5">
                {isOnBreak ? breakTime : totalBreakTimeDisplay}
              </p>
              <div className="flex items-center gap-1">
                <Coffee className="h-3 w-3 opacity-80" />
                <p className="text-[9px] font-medium opacity-90 uppercase">
                  {isOnBreak ? 'Current Break' : 'Total Break'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Status Indicator */}
        {isClockedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // CHANGED: Reduced margin from mt-3 to mt-2
            className="mt-2 text-center relative z-10"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              // CHANGED: Reduced padding
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-semibold shadow-md"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-white rounded-full"
              />
              Working Session in Progress
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}