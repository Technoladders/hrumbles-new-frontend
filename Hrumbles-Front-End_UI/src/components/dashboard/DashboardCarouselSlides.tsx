import React, { useState, useEffect } from 'react';
import { Cake, PartyPopper, Sparkles, Calendar, Clock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import AnalogClock from './AnalogClock';
import { motion, AnimatePresence } from 'framer-motion';

// --- Live Clock Component ---
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  return <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{format(time, 'h:mm:ss a')}</p>;
};

// --- Slide 1: Greeting ---
export const GreetingSlide = ({ user }) => {
  console.log("greeting", user);
  const [greeting, setGreeting] = useState('');
  const userFirstName = user?.user_metadata?.first_name || "Admin";

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full text-center px-2 sm:px-4">
      <AnalogClock />
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white/90 mt-2">{greeting}, {userFirstName}!</h2>
      <LiveClock />
      <p className="text-white/80 mt-1 text-xs sm:text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
    </div>
  );
};

// --- Slide 2: Upcoming Events ---
export const EventsSlide = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center text-white/90 px-2 sm:px-4">
        <Calendar size={32} className="mb-2 sm:mb-4 sm:h-10 sm:w-10" />
        <h3 className="font-semibold text-base sm:text-lg">No Upcoming Events</h3>
        <p className="text-xs sm:text-sm">Your schedule is clear for now.</p>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 h-full flex flex-col">
      <h3 className="font-semibold text-base sm:text-lg text-white mb-2 flex items-center flex-shrink-0">
        <Calendar size={16} className="mr-1 sm:mr-2 sm:h-5 sm:w-5" /> Upcoming Events
      </h3>
      <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden flex-grow pr-2 touch-auto">
        <AnimatePresence>
          <ul className="space-y-2">
            {events.map((event, index) => (
              <motion.li
                key={index}
                className="flex items-start gap-2 sm:gap-3 bg-white/10 p-2 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <div className="text-center bg-white/20 rounded p-1 w-10 sm:w-12 flex-shrink-0">
                  <p className="text-[10px] sm:text-xs font-bold uppercase text-white">{format(event.date, 'MMM')}</p>
                  <p className="text-base sm:text-lg font-bold text-white">{format(event.date, 'd')}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-white truncate">{event.title}</p>
                  <p className="text-[10px] sm:text-xs text-white/80">{format(event.date, 'EEEE, h:mm a')}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Slide 3: Celebrations ---
export const CelebrationsSlide = ({ celebrations }) => {
  const { birthdays = [], anniversaries = [], newJoiners = [] } = celebrations || {};
  const totalCelebrations = birthdays.length + anniversaries.length + newJoiners.length;

  if (totalCelebrations === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center text-white/90 px-2 sm:px-4">
        <Sparkles size={32} className="mb-2 sm:mb-4 sm:h-10 sm:w-10" />
        <h3 className="font-semibold text-base sm:text-lg">No Celebrations Today</h3>
        <p className="text-xs sm:text-sm">Check back tomorrow!</p>
      </div>
    );
  }

  const CelebrationItem = ({ icon, text, index }) => (
    <motion.div
      className="flex items-center gap-2 bg-white/10 p-2 rounded-md text-xs sm:text-sm text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      {icon}
      <span>{text}</span>
    </motion.div>
  );

  return (
    <div className="p-1 sm:p-2 h-full flex flex-col">
      <h3 className="font-semibold text-base sm:text-lg text-white mb-2 flex items-center flex-shrink-0">
        <Sparkles size={16} className="mr-1 sm:mr-2 sm:h-5 sm:w-5" /> Today's Celebrations
      </h3>
      <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden flex-grow pr-2 touch-auto">
        <AnimatePresence>
          <div className="space-y-2">
            {birthdays.map((e, index) => (
              <CelebrationItem
                key={e.id}
                icon={<Cake size={14} className="sm:h-4 sm:w-4" />}
                text={`${e.first_name} ${e.last_name}'s Birthday!`}
                index={index}
              />
            ))}
            {anniversaries.map((e, index) => (
              <CelebrationItem
                key={e.id}
                icon={<PartyPopper size={14} className="sm:h-4 sm:w-4" />}
                text={`${e.first_name} ${e.last_name}'s Work Anniversary!`}
                index={index + birthdays.length}
              />
            ))}
            {newJoiners.map((e, index) => (
              <CelebrationItem
                key={e.id}
                icon={<UserCheck size={14} className="sm:h-4 sm:w-4" />}
                text={`Welcome ${e.first_name} ${e.last_name}!`}
                index={index + birthdays.length + anniversaries.length}
              />
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};