// src/hooks/use-dashboard-data.js

import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { startOfToday, endOfToday, startOfWeek, endOfWeek, addDays, isWithinInterval, format } from 'date-fns';

// --- MODIFIED: fetchUpcomingEvents now accepts an employeeId ---
const fetchUpcomingEvents = async (organizationId, employeeId = null) => {
    const today = startOfToday();
    const next30Days = addDays(today, 30);

    // --- 1. Fetch upcoming interviews (conditionally filtered) ---
    let interviewQuery = supabase
        .from('hr_job_candidates')
        .select('name, interview_date, interview_time')
        .eq('organization_id', organizationId)
        .eq('main_status_id', 'f72e13f8-7825-4793-85e0-e31d669f8097')
        .gte('interview_date', format(today, 'yyyy-MM-dd'))
        .lte('interview_date', format(next30Days, 'yyyy-MM-dd'));

    if (employeeId) {
        // If an employeeId is provided, we need to find their name to filter interviews
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

    // --- 2. Fetch upcoming leaves (conditionally filtered) ---
    let leaveQuery = supabase
        .from('leave_requests')
        .select('hr_employees!leave_requests_employee_id_fkey(first_name, last_name), start_date')
        .eq('status', 'approved')
        .gte('start_date', format(today, 'yyyy-MM-dd'))
        .lte('start_date', format(next30Days, 'yyyy-MM-dd'));

    if (employeeId) {
        // If it's for a single employee, only get their leaves
        leaveQuery = leaveQuery.eq('employee_id', employeeId);
    }
    const { data: leavesData, error: leavesError } = await leaveQuery;
    if (leavesError) console.error("Error fetching leaves:", leavesError);

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