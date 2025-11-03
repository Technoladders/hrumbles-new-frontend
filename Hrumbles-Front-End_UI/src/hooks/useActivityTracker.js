import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../integrations/supabase/client';

export const useActivityTracker = ({ inactivityThreshold = 300000 }) => { // 5 minutes
  const user = useSelector((state) => state.auth.user);
  const organizationId = useSelector((state) => state.auth.organization_id);
  
  const [sessionId] = useState(uuidv4());
  const userStatus = useRef('active');
  const inactivityTimer = useRef(null);
  const lastLoggedPeriod = useRef({ type: 'active', start: new Date().toISOString() });

  const logActivityPeriod = useCallback(async (endTime, nextActivityType) => {
    if (!user || !organizationId) return;

    const startTime = new Date(lastLoggedPeriod.current.start);
    const duration = Math.round((new Date(endTime).getTime() - startTime.getTime()) / 1000);

    if (duration < 5) {
        // If the period is too short, just update the start time for the next log
        // unless the type is changing (e.g., from 'active' to 'away')
        if (lastLoggedPeriod.current.type === nextActivityType) {
            return;
        }
    }

    console.log(`Logging period: ${lastLoggedPeriod.current.type}, Duration: ${duration}s, Next type: ${nextActivityType}`);
    
    await supabase.from('user_session_activity').insert({
      user_id: user.id,
      organization_id: organizationId,
      session_id: sessionId,
      activity_type: lastLoggedPeriod.current.type,
      start_time: lastLoggedPeriod.current.start,
      end_time: endTime,
      duration_seconds: duration,
    });

    // Set up the start of the next period
    lastLoggedPeriod.current = { type: nextActivityType, start: endTime };
  }, [user, organizationId, sessionId]);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (userStatus.current === 'active') {
        userStatus.current = 'inactive';
        // The next logical period after inactivity starts is 'active' (when the user returns)
        logActivityPeriod(new Date().toISOString(), 'active');
      }
    }, inactivityThreshold);
  }, [inactivityThreshold, logActivityPeriod]);

  const handleUserActivity = useCallback(() => {
    if (userStatus.current === 'inactive') {
      userStatus.current = 'active';
      // The user was inactive and is now active. We log the 'inactive' period.
      // The next period will be 'active'.
      logActivityPeriod(new Date().toISOString(), 'active');
    }
    resetInactivityTimer();
  }, [logActivityPeriod, resetInactivityTimer]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleUserActivity));
    
    resetInactivityTimer();

    // --- MODIFIED VISIBILITY LOGIC ---
    const handleVisibilityChange = () => {
      const now = new Date().toISOString();
      if (document.visibilityState === 'hidden') {
        // User is leaving the tab. Log the current period (likely 'active')
        // and set the next expected period type to 'away'.
        logActivityPeriod(now, 'away');
        clearTimeout(inactivityTimer.current); // Stop the inactivity timer
      } else {
        // User has returned to the tab. Log the 'away' period.
        // The next period will be 'active'.
        userStatus.current = 'active'; // Set status to active immediately
        logActivityPeriod(now, 'active');
        resetInactivityTimer(); // Start the inactivity timer again
      }
    };
    
    const handleBeforeUnload = () => {
        // When closing the tab, log the final period as 'away'
        logActivityPeriod(new Date().toISOString(), 'away');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(inactivityTimer.current);
      // Log the final period on cleanup
      logActivityPeriod(new Date().toISOString(), 'away');
    };
  }, [user, handleUserActivity, resetInactivityTimer, logActivityPeriod]);
};