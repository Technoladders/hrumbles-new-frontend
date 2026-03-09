import React, { useState, useEffect } from 'react';
import { Cake, PartyPopper, Sparkles, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import AnalogClock from './AnalogClock';
import { motion, AnimatePresence } from 'framer-motion';

// ── Live Clock ──
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
      {format(time, 'h:mm:ss a')}
    </p>
  );
};

// ── Slide 1: Greeting ──
export const GreetingSlide = ({ user }: { user: any }) => {
  const [greeting, setGreeting] = useState('');
  const firstName = user?.user_metadata?.first_name || 'Admin';

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-full text-center">
      <AnalogClock />
      <h2 className="text-base sm:text-lg font-semibold text-white/90 mt-1.5">
        {greeting}, {firstName}!
      </h2>
      <LiveClock />
      <p className="text-white/70 mt-0.5 text-xs">
        {format(new Date(), 'EEEE, MMMM d')}
      </p>
    </div>
  );
};

// ── Slide 2: Events ──
export const EventsSlide = ({ events }: { events: any[] }) => {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center text-white/90">
        <Calendar size={28} className="mb-2" />
        <h3 className="font-semibold text-sm">No Upcoming Events</h3>
        <p className="text-xs text-white/60">Your schedule is clear.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-1">
      <h3 className="font-semibold text-sm text-white mb-2 flex items-center flex-shrink-0">
        <Calendar size={14} className="mr-1.5" /> Upcoming Events
      </h3>
      <div className="overflow-y-auto flex-grow scrollbar-hide space-y-1.5">
        <AnimatePresence>
          {events.slice(0, 4).map((event, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm p-2 rounded-lg"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.25 }}
            >
              <div className="text-center bg-white/15 rounded-lg px-2 py-1 flex-shrink-0 min-w-[40px]">
                <p className="text-[9px] font-bold uppercase text-white/80">
                  {format(event.date, 'MMM')}
                </p>
                <p className="text-base font-bold text-white leading-tight">
                  {format(event.date, 'd')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs text-white truncate">{event.title}</p>
                <p className="text-[10px] text-white/60">
                  {format(event.date, 'EEEE, h:mm a')}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Slide 3: Celebrations ──
export const CelebrationsSlide = ({ celebrations }: { celebrations: any }) => {
  const { birthdays = [], anniversaries = [], newJoiners = [] } = celebrations || {};
  const total = birthdays.length + anniversaries.length + newJoiners.length;

  if (total === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center text-white/90">
        <Sparkles size={28} className="mb-2" />
        <h3 className="font-semibold text-sm">No Celebrations Today</h3>
        <p className="text-xs text-white/60">Check back tomorrow!</p>
      </div>
    );
  }

  const CelebItem = ({
    icon,
    text,
    index,
  }: {
    icon: React.ReactNode;
    text: string;
    index: number;
  }) => (
    <motion.div
      className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-lg text-xs text-white"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
    >
      {icon}
      <span className="truncate">{text}</span>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col p-1">
      <h3 className="font-semibold text-sm text-white mb-2 flex items-center flex-shrink-0">
        <Sparkles size={14} className="mr-1.5" /> Today's Celebrations
      </h3>
      <div className="overflow-y-auto flex-grow scrollbar-hide space-y-1.5">
        <AnimatePresence>
          {birthdays.map((e: any, i: number) => (
            <CelebItem
              key={`b-${e.id}`}
              icon={<Cake size={13} className="flex-shrink-0" />}
              text={`${e.first_name} ${e.last_name}'s Birthday!`}
              index={i}
            />
          ))}
          {anniversaries.map((e: any, i: number) => (
            <CelebItem
              key={`a-${e.id}`}
              icon={<PartyPopper size={13} className="flex-shrink-0" />}
              text={`${e.first_name} ${e.last_name}'s Work Anniversary!`}
              index={i + birthdays.length}
            />
          ))}
          {newJoiners.map((e: any, i: number) => (
            <CelebItem
              key={`n-${e.id}`}
              icon={<UserCheck size={13} className="flex-shrink-0" />}
              text={`Welcome ${e.first_name} ${e.last_name}!`}
              index={i + birthdays.length + anniversaries.length}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};