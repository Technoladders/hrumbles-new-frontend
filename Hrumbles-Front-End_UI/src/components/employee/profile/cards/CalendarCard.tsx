import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar, Users, Sun } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, format, addDays, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { InterviewsList } from './calendar/InterviewsList';
import { CalendarDay } from './calendar/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalendarCardProps {
  employeeId: string;
  isHumanResourceEmployee: boolean;
  role?: string; // Add role prop
   organizationId?: string;
}

interface Holiday {
  date: string;
  localName: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  notes: string | null;
  employee_id?: string; // Include employee_id for superadmin
}

const mockHolidays: Holiday[] = [
  { date: '2025-01-01', localName: "New Year's Day", name: "New Year's Day" },
  { date: '2025-01-26', localName: 'Republic Day', name: 'Republic Day' },
  { date: '2025-08-15', localName: 'Independence Day', name: 'Independence Day' },
  { date: '2025-10-02', localName: 'Gandhi Jayanti', name: 'Gandhi Jayanti' },
  { date: '2025-12-25', localName: 'Christmas Day', name: 'Christmas Day' },
  { date: '2025-06-01', localName: 'Test Holiday 1', name: 'Test 1' },
  { date: '2025-06-02', localName: 'Test Holiday 2', name: 'Test 2' },
  { date: '2025-06-03', localName: 'Test Holiday 3', name: 'Test 3' }
];

const mockLeaves: LeaveRequest[] = [];

const HolidaysList: React.FC<{ holidays: Holiday[], leaves: LeaveRequest[], selectedDate: Date }> = ({ holidays, leaves, selectedDate }) => {
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const filteredHolidays = holidays.filter(holiday => holiday.date === selectedDateString);
  const filteredLeaves = leaves.filter(leave => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    return isSameDay(selectedDate, start) || isSameDay(selectedDate, end) || (selectedDate >= start && selectedDate <= end);
  });

  const today = new Date();
  const next30Days = addDays(today, 30);
  const upcomingHolidays = holidays
    .filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= today && holidayDate <= next30Days && holiday.date !== selectedDateString;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingLeaves = leaves
    .filter(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return (start >= today && start <= next30Days) || (end >= today && end <= next30Days) || isWithinInterval(today, { start, end });
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="overflow-y-auto max-h-[250px] pr-2 overflow-x-hidden">
      <h4 className="text-sm font-semibold mb-2">Holidays & Leaves for {format(selectedDate, 'MMMM d, yyyy')}</h4>
      {filteredHolidays.length === 0 && filteredLeaves.length === 0 ? (
       <div className="mb-10 p-3 bg-red-50 rounded-lg">
              <p className="text-sm italic text-gray-600">No holidays or leaves on this date</p>
            </div>
      ) : (
        <>
          {filteredHolidays.map((holiday, index) => (
            <div key={`holiday-${index}`} className="mb-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold">{holiday.localName}</p>
              <p className="text-xs text-gray-600">{holiday.name}</p>
            </div>
          ))}
          {filteredLeaves.map((leave, index) => (
            <div key={`leave-${index}`} className={`mb-2 p-3 ${leave.status === 'approved' ? 'bg-green-50' : 'bg-amber-50'} rounded-lg`}>
              <p className="text-sm font-semibold">Leave ({leave.status})</p>
              <p className="text-xs text-gray-600">{leave.notes || 'No notes provided'}</p>
              <p className="text-xs text-gray-600">
                {leave.start_date === leave.end_date
                  ? leave.start_date
                  : `${leave.start_date} to ${leave.end_date}`}
              </p>
            </div>
          ))}
        </>
      )}
      <h4 className="text-sm font-semibold mb-2">Upcoming Holidays & Leaves (Next 30 Days)</h4>
      {upcomingHolidays.length > 0 || upcomingLeaves.length > 0 ? (
        <>
          {upcomingHolidays.map((holiday, index) => (
            <div key={`upcoming-holiday-${index}`} className="mb-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold">{holiday.localName}</p>
              <p className="text-xs text-gray-600">{holiday.name} - {holiday.date}</p>
            </div>
          ))}
          {upcomingLeaves.map((leave, index) => (
            <div key={`upcoming-leave-${index}`} className={`mb-2 p-3 ${leave.status === 'approved' ? 'bg-green-50' : 'bg-amber-50'} rounded-lg`}>
              <p className="text-sm font-semibold">Leave ({leave.status})</p>
              <p className="text-xs text-gray-600">{leave.notes || 'No notes provided'}</p>
              <p className="text-xs text-gray-600">
                {leave.start_date === leave.end_date
                  ? leave.start_date
                  : `${leave.start_date} to ${leave.end_date}`}
              </p>
            </div>
          ))}
        </>
      ) : (
        <div className="text-gray-500 italic">No upcoming holidays or leaves</div>
      )}
    </div>
  );
};

const AllEventsList: React.FC<{ interviewDates: string[], holidays: Holiday[], leaves: LeaveRequest[], selectedDate: Date, isHumanResourceEmployee: boolean }> = ({ interviewDates, holidays, leaves, selectedDate, isHumanResourceEmployee }) => {
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const hasInterviews = isHumanResourceEmployee && interviewDates.includes(selectedDateString);
  const filteredHolidays = holidays.filter(holiday => holiday.date === selectedDateString);
  const filteredLeaves = leaves.filter(leave => {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    return isSameDay(selectedDate, start) || isSameDay(selectedDate, end) || (selectedDate >= start && selectedDate <= end);
  });

  const today = new Date();
  const next30Days = addDays(today, 30);
  const upcomingInterviews = isHumanResourceEmployee
    ? interviewDates
        .filter(date => {
          const interviewDate = new Date(date);
          return interviewDate >= today && interviewDate <= next30Days && !isSameDay(interviewDate, selectedDate);
        })
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    : [];
  const upcomingHolidays = holidays
    .filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= today && holidayDate <= next30Days && holiday.date !== selectedDateString;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingLeaves = leaves
    .filter(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return (start >= today && start <= next30Days) || (end >= today && end <= next30Days) || isWithinInterval(today, { start, end });
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="overflow-y-auto max-h-[320px] pr-2 overflow-x-hidden">
      <h4 className="text-sm font-semibold mb-2">Events for {format(selectedDate, 'MMMM d, yyyy')}</h4>
      {hasInterviews || filteredHolidays.length > 0 || filteredLeaves.length > 0 ? (
        <>
          {hasInterviews && (
            <div className="mb-2 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-semibold">Interview Scheduled</p>
              <p className="text-xs text-gray-600">Check Interviews tab for details</p>
            </div>
          )}
          {filteredHolidays.map((holiday, index) => (
            <div key={`holiday-${index}`} className="mb-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold">{holiday.localName}</p>
              <p className="text-xs text-gray-600">{holiday.name}</p>
            </div>
          ))}
          {filteredLeaves.map((leave, index) => (
            <div key={`leave-${index}`} className={`mb-2 p-3 ${leave.status === 'approved' ? 'bg-green-50' : 'bg-amber-50'} rounded-lg`}>
              <p className="text-sm font-semibold">Leave ({leave.status})</p>
              <p className="text-xs text-gray-600">{leave.notes || 'No notes provided'}</p>
              <p className="text-xs text-gray-600">
                {leave.start_date === leave.end_date
                  ? leave.start_date
                  : `${leave.start_date} to ${leave.end_date}`}
              </p>
            </div>
          ))}
        </>
      ) : (
         <div className="mb-12 p-3 bg-red-50 rounded-lg">
              <p className="text-sm italic text-gray-600">No events on this date</p>
            </div>
      )}
      <h4 className="text-sm font-semibold mb-2">Upcoming Events (Next 30 Days)</h4>
      {upcomingInterviews.length > 0 || upcomingHolidays.length > 0 || upcomingLeaves.length > 0 ? (
        <>
          {upcomingInterviews.map((date, index) => (
            <div key={`upcoming-interview-${index}`} className="mb-2 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-semibold">Interview Scheduled</p>
              <p className="text-xs text-gray-600">Date: {date}</p>
            </div>
          ))}
          {upcomingHolidays.map((holiday, index) => (
            <div key={`upcoming-holiday-${index}`} className="mb-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold">{holiday.localName}</p>
              <p className="text-xs text-gray-600">{holiday.name} - {holiday.date}</p>
            </div>
          ))}
          {upcomingLeaves.map((leave, index) => (
            <div key={`upcoming-leave-${index}`} className={`mb-2 p-3 ${leave.status === 'approved' ? 'bg-green-50' : 'bg-amber-50'} rounded-lg`}>
              <p className="text-sm font-semibold">Leave ({leave.status})</p>
              <p className="text-xs text-gray-600">{leave.notes || 'No notes provided'}</p>
              <p className="text-xs text-gray-600">
                {leave.start_date === leave.end_date
                  ? leave.start_date
                  : `${leave.start_date} to ${leave.end_date}`}
              </p>
            </div>
          ))}
        </>
      ) : (
        <div className="text-gray-500 italic">No upcoming events</div>
      )}
    </div>
  );
};

export const CalendarCard: React.FC<CalendarCardProps> = ({ employeeId, isHumanResourceEmployee, role, organizationId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [interviewDates, setInterviewDates] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    const fetchData = async () => {
      // Ensure we don't run if the organizationId is not yet available
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching data for employeeId:', employeeId, 'role:', role, 'organizationId:', organizationId);

        let fullName = '';
        if (role !== 'organization_superadmin') {
          const { data: employeeData, error: employeeError } = await supabase
            .from('hr_employees')
            .select('first_name, last_name')
            .eq('id', employeeId)
            .single();

          if (employeeError || !employeeData) {
            throw new Error(`Employee fetch failed: ${employeeError?.message || 'No employee found'}`);
          }
          fullName = `${employeeData.first_name} ${employeeData.last_name}`;
        }

        // Fetch interview dates dynamically
        if (isHumanResourceEmployee || role === 'organization_superadmin') {
          // 1. Fetch the dynamic status ID for "Interview" for the current organization
          const { data: statusData, error: statusError } = await supabase
            .from("job_statuses")
            .select("id")
            .eq("organization_id", organizationId)
            .in("name", ["Interview", "Interviews"]) // Handles both singular and plural names
            .single();

          if (statusError) {
            // It's better to log a warning and continue than to crash the whole component
            console.warn("Could not find the interview status for this organization.", statusError);
            setInterviewDates([]); // Set to empty and proceed
          } else if (statusData) {
            const interviewStatusId = statusData.id;

            // 2. Build the main query using the dynamic status ID
            const query = supabase
              .from('hr_job_candidates')
              .select('interview_date')
              .eq('main_status_id', interviewStatusId) // <-- USE THE DYNAMIC ID HERE
              .not('interview_date', 'is', null)
              .eq('organization_id', organizationId);

            if (role !== 'organization_superadmin') {
              query.eq('applied_from', fullName);
            }

            const { data: candidatesData, error: candidatesError } = await query;

            if (candidatesError) {
              throw new Error(`Candidates fetch failed: ${candidatesError.message}`);
            }

            const interviewDatesData = candidatesData.map(candidate => candidate.interview_date);
            setInterviewDates(interviewDatesData);
          }
        } else {
          setInterviewDates([]);
        }

        // Fetch public holidays from Google Calendar API
        const year = 2025;
        const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_KEY;
        const calendarId = 'in.indian%23holiday@group.v.calendar.google.com';
        const timeMin = `${year}-01-01T00:00:00Z`;
        const timeMax = `${year}-12-31T23:59:59Z`;
        try {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
            `timeMin=${timeMin}&timeMax=${timeMax}&key=${apiKey}`
          );
          console.log('Google Calendar API Response Status:', response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`Google Calendar API failed: ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Google Calendar API Response:', data);
          const holidayData = data.items
            .filter((event: any) => event.start?.date && event.summary)
            .map((event: any) => ({
              date: event.start.date,
              localName: event.summary,
              name: event.summary,
            }));
          console.log('Parsed Holidays:', holidayData);
          setHolidays(holidayData.length > 0 ? holidayData : mockHolidays);
        } catch (holidayError: any) {
          console.error('Holiday fetch error:', holidayError.message);
          console.log('Falling back to mock holidays');
          setHolidays(mockHolidays);
        }

        // Fetch leave requests
        console.log('Fetching leave requests for:', role === 'organization_superadmin' ? 'all employees' : `employeeId: ${employeeId}`);
        const leaveQuery = supabase
          .from('leave_requests')
          .select('id, start_date, end_date, status, notes, employee_id')
          .in('status', ['approved', 'pending']);

        if (role !== 'organization_superadmin') {
          leaveQuery.eq('employee_id', employeeId);
        }

        const { data: leaveData, error: leaveError } = await leaveQuery;

        if (leaveError) {
          throw new Error(`Leave requests fetch failed: ${leaveError.message}`);
        }

        console.log('Leave Requests:', leaveData);
        setLeaves(leaveData.length > 0 ? leaveData : mockLeaves);
      } catch (error: any) {
        console.error('Failed to fetch data:', error.message, error.stack);
        toast.error(`Failed to load calendar data: ${error.message}`);
        setInterviewDates([]);
        setHolidays(mockHolidays);
        setLeaves(mockLeaves);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [employeeId, isHumanResourceEmployee, role]);

  const generateMonth = (date: Date): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => ({
      date: day,
      isCurrentMonth: isSameMonth(day, date),
      isToday: isSameDay(day, new Date()),
      isSunday: day.getDay() === 0,
      hasInterview: (isHumanResourceEmployee || role === 'organization_superadmin') && isInterviewDay(day),
      hasHoliday: isHolidayDay(day),
      hasLeave: isLeaveDay(day),
      leaveStatus: getLeaveStatus(day),
    }));
  };

  const isInterviewDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return interviewDates.includes(dateString);
  };

  const isHolidayDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => holiday.date === dateString);
  };

  const isLeaveDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return leaves.some(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return dateString >= format(start, 'yyyy-MM-dd') && dateString <= format(end, 'yyyy-MM-dd');
    });
  };

  const getLeaveStatus = (date: Date): 'approved' | 'pending' | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    const leave = leaves.find(leave => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return dateString >= format(start, 'yyyy-MM-dd') && dateString <= format(end, 'yyyy-MM-dd');
    });
    return leave ? leave.status as 'approved' | 'pending' : null;
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDateSelect = (date: Date, hasInterview: boolean, hasHoliday: boolean, hasLeave: boolean) => {
    setSelectedDate(date);
    if ((isHumanResourceEmployee || role === 'organization_superadmin') && hasInterview) {
      setActiveTab('interviews');
    } else if (hasHoliday || hasLeave) {
      setActiveTab('holidays');
    } else {
      setActiveTab('events');
    }
  };

  const days = generateMonth(currentDate);

  if (isLoading) {
    return <div className="text-center text-sm text-gray-500">Loading calendar data...</div>;
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow h-[400px] overflow-hidden ">
      <div className="grid grid-cols-[2fr_3fr] gap-4 h-full">
        <div className="bg-gradient-to-b from-indigo-600 to-purple-700 rounded-lg p-5 flex flex-col space-y-2 min-w-0">
          <CalendarHeader 
            currentDate={currentDate}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
          <CalendarGrid 
            days={days}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2 flex flex-col h-full min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className={`grid ${isHumanResourceEmployee || role === 'organization_superadmin' ? 'grid-cols-3' : 'grid-cols-2'} mb-1.5`}>
              <TabsTrigger value="events" className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">All Events</span>
              </TabsTrigger>
              <TabsTrigger value="holidays" className="flex items-center gap-1 text-xs">
                <Sun className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Holidays</span>
              </TabsTrigger>
              {(isHumanResourceEmployee || role === 'organization_superadmin') && (
                <TabsTrigger value="interviews" className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Interviews</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="events" className="flex-1">
              <AllEventsList 
                interviewDates={interviewDates}
                holidays={holidays}
                leaves={leaves}
                selectedDate={selectedDate}
                isHumanResourceEmployee={isHumanResourceEmployee || role === 'organization_superadmin'}
              />
            </TabsContent>
            <TabsContent value="holidays" className="flex-1">
              <HolidaysList holidays={holidays} leaves={leaves} selectedDate={selectedDate} />
            </TabsContent>
            {(isHumanResourceEmployee || role === 'organization_superadmin') && (
              <TabsContent value="interviews" className="flex-1">
                <InterviewsList employeeId={employeeId} selectedDate={selectedDate} role={role} organizationId={organizationId} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Card>
  );
};