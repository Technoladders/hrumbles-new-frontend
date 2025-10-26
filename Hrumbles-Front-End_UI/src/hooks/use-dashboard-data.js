// src/hooks/use-dashboard-data.js

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { startOfToday, endOfToday, startOfWeek, endOfWeek, addDays, isWithinInterval, format } from 'date-fns';

// --- CONSTANTS FOR CLARITY ---
const LEGACY_INTERVIEW_MAIN_STATUS_ID = 'f72e13f8-7825-4793-85e0-e31d669f8097';

// UUIDs for the new Taskup interview sub-statuses
const TASKUP_INTERVIEW_SUB_STATUS_IDS = [
  'b1b1b1b1-0010-4010-8010-000000000010', // Telephonic Interview
  'b1b1b1b1-0011-4011-8011-000000000011', // Face-to-Face Interview
  'b1b1b1b1-0012-4012-8012-000000000012', // Virtual Interview
  'b1b1b1b1-0016-4016-8016-000000000016', // Level 1 Interview (L1)
  'b1b1b1b1-0017-4017-8017-000000000017', // Level 2 Interview (L2)
  'b1b1b1b1-0018-4018-8018-000000000018', // Level 3 – Management Round
];

const fetchUpcomingEvents = async (organizationId, employeeId = null) => {
    const today = startOfToday();
    const next30Days = addDays(today, 30);

    // --- 1. MODIFIED QUERY for upcoming interviews ---
    let interviewQuery = supabase
        .from('hr_job_candidates')
        .select('name, interview_date, interview_time')
        .eq('organization_id', organizationId)
        .gte('interview_date', format(today, 'yyyy-MM-dd'))
        .lte('interview_date', format(next30Days, 'yyyy-MM-dd'))
        // Use .or() to find interviews from either the old system or the new Taskup system
        .or(
          `main_status_id.eq.${LEGACY_INTERVIEW_MAIN_STATUS_ID},` +
          `sub_status_id.in.(${TASKUP_INTERVIEW_SUB_STATUS_IDS.map(id => `"${id}"`).join(',')})`
        );

    // This employee-specific filter remains unchanged
    if (employeeId) {
        const { data: employeeData } = await supabase
            .from('hr_employees')
            .select('first_name, last_name')
            .eq('id', employeeId)
            .single();
        
        if (employeeData) {
            const fullName = `${employeeData.first_name} ${employeeData.last_name}`;
            interviewQuery = interviewQuery.eq('applied_from', fullName);
        }
    }
    const { data: interviewsData, error: interviewsError } = await interviewQuery;
    if (interviewsError) console.error("Error fetching interviews:", interviewsError);

    // --- 2. Fetch upcoming leaves (This section is unchanged) ---
    let leaveQuery = supabase
        .from('leave_requests')
        .select('hr_employees!leave_requests_employee_id_fkey(first_name, last_name), start_date')
        .eq('status', 'approved')
        .gte('start_date', format(today, 'yyyy-MM-dd'))
        .lte('start_date', format(next30Days, 'yyyy-MM-dd'));

    if (employeeId) {
        leaveQuery = leaveQuery.eq('employee_id', employeeId);
    }
    const { data: leavesData, error: leavesError } = await leaveQuery;
    if (leavesError) console.error("Error fetching leaves:", leavesError);

    // The rest of the function remains unchanged as the data format is the same
    const formattedInterviews = (interviewsData || []).map(i => ({
        type: 'Interview',
        title: `Interview: ${i.name}`,
        date: new Date(`${i.interview_date}T${i.interview_time || '00:00:00'}`)
    }));

    const formattedLeaves = (leavesData || []).map(l => ({
        type: 'Leave',
        title: `${l.hr_employees?.first_name || 'Someone'} on Leave`,
        date: new Date(l.start_date)
    }));

    return [...formattedInterviews, ...formattedLeaves]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 4);
};


// Helper to fetch celebrations
const fetchCelebrations = async (organizationId) => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const sevenDaysAgo = format(addDays(today, -7), 'yyyy-MM-dd');
    const todayFormatted = format(today, 'yyyy-MM-dd');

    const { data: employees, error } = await supabase
        .from('hr_employees')
        .select('first_name, last_name, date_of_birth, joining_date')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
        
    if (error) {
        console.error("Error fetching employees for celebrations:", error);
        return { birthdays: [], anniversaries: [], newJoiners: [] };
    }

    const birthdays = employees.filter(e => {
        if (!e.date_of_birth) return false;
        const dob = new Date(e.date_of_birth);
        return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
    });

    const anniversaries = employees.filter(e => {
        if (!e.joining_date) return false;
        const joinDate = new Date(e.joining_date);
        return joinDate.getMonth() + 1 === todayMonth && joinDate.getDate() === todayDay && joinDate.getFullYear() !== today.getFullYear();
    });

    const newJoiners = employees.filter(e => 
        e.joining_date && e.joining_date >= sevenDaysAgo && e.joining_date <= todayFormatted
    );

    return { birthdays, anniversaries, newJoiners };
};


export const useDashboardData = (organizationId, employeeId = null) => {
    return useQuery({
        queryKey: ['dashboardData', organizationId, employeeId],
        queryFn: async () => {
            const [events, celebrations] = await Promise.all([
                fetchUpcomingEvents(organizationId, employeeId),
                fetchCelebrations(organizationId)
            ]);
            return { events, celebrations };
        },
        enabled: !!organizationId,
    });
};