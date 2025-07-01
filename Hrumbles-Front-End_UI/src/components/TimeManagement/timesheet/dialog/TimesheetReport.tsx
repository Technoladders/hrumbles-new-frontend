import React, { useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useSelector } from 'react-redux';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface Submission {
  candidate_name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string;
  match_score: string;
  overall_score: string;
  applied_date: string;
  submission_date: string;
  applied_from: string;
  current_salary: string;
  expected_salary: string;
  location: string;
  preferred_location: string;
  notice_period: string;
  resume_url: string;
  main_status: string;
  sub_status: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  interview_round: string;
  interviewer_name: string;
  interview_result: string;
  reject_reason: string;
  ctc: string;
  joining_date: string;
  created_at: string;
  job_title: string;
  client_name: string;
}

interface TimesheetReportProps {
  userId: string;
  submissions: Submission[];
  date: Date;
  onTimesheetSubmit?: () => void;
}

const TimesheetReport: React.FC<TimesheetReportProps> = ({ userId, submissions, date, onTimesheetSubmit }) => {
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const { user } = useSelector((state: any) => state.auth);

  console.log('submissions', submissions);

  const generateCSV = (data: Submission[]) => {
    const headers = [
      'Candidate Name', 'Email', 'Phone', 'Experience', 'Skills', 'Match Score', 'Overall Score',
      'Applied Date', 'Submission Date', 'Applied From', 'Current Salary', 'Expected Salary',
      'Location', 'Preferred Location', 'Notice Period', 'Resume URL', 'Main Status', 'Sub Status',
      'Interview Date', 'Interview Time', 'Interview Type', 'Interview Round', 'Interviewer Name',
      'Interview Result', 'Reject Reason', 'CTC Offered', 'Joining Date', 
    ];

    const csvData = data.map(sub => [
      sub.candidate_name || 'n/a',
      sub.email || 'n/a',
      sub.phone || 'n/a',
      sub.experience || 'n/a',
      sub.skills || 'n/a',
      sub.match_score || 'n/a',
      sub.overall_score || 'n/a',
      sub.applied_date || 'n/a',
      sub.submission_date || 'n/a',
      sub.applied_from || 'n/a',
      sub.current_salary || 'n/a',
      sub.expected_salary || 'n/a',
      sub.location || 'n/a',
      sub.preferred_location || 'n/a',
      sub.notice_period || 'n/a',
      sub.resume_url || 'n/a',
      sub.main_status || 'n/a',
      sub.sub_status || 'n/a',
      sub.interview_date || 'n/a',
      sub.interview_time || 'n/a',
      sub.interview_type || 'n/a',
      sub.interview_round || 'n/a',
      sub.interviewer_name || 'n/a',
      sub.interview_result || 'n/a',
      sub.reject_reason || 'n/a',
      sub.ctc || 'n/a',
      sub.joining_date || 'n/a',
     
    ]);

    return Papa.unparse({
      fields: headers,
      data: csvData
    }, {
      delimiter: ', ',
      quotes: false
    });
  };

  const sendReport = async (reportType: 'EOD', reportData: Submission[], dateRange: { start: Date; end: Date }) => {
    try {
      setEmailStatus(`Sending ${reportType} report...`);
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error('No authenticated user found');
      }
      const jwt = session.access_token;

      // Fetch user name from hr_employees
      const { data: employee, error: employeeError } = await supabase
        .from('hr_employees')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      if (employeeError || !employee) {
        throw new Error('Failed to fetch user name');
      }

      const csvContent = generateCSV(reportData);
      const payload = {
        reportType,
        reportData,
        userEmail: user.email,
        userName: employee.first_name || 'User',
        dateRange: {
          start: format(dateRange.start, 'yyyy-MM-dd'),
          end: format(dateRange.end, 'yyyy-MM-dd'),
        },
        csvContent
      };

      const response = await fetch(
        'https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/report-manager',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to send ${reportType} report`);
      }

      setEmailStatus(`${reportType} report sent successfully!`);
      console.log(`${reportType} report sent successfully!`, data);
    } catch (err) {
      setEmailStatus(`Failed to send ${reportType} report: ${err.message}`);
      console.error(`Failed to send ${reportType} report:`, err.message);
    }
  };

  const handleEODReport = async () => {
    const dateStart = startOfDay(date);
    const dateEnd = endOfDay(date);
    await sendReport('EOD', submissions, { start: dateStart, end: dateEnd });
    if (onTimesheetSubmit) onTimesheetSubmit();
  };

  console.log('submissions', submissions);

  return (
    <div className="space-y-4">
      {emailStatus && (
        <Alert>
          <AlertDescription>{emailStatus}</AlertDescription>
        </Alert>
      )}
      <Button onClick={handleEODReport} disabled={!submissions.length}>
        Submit Timesheet and Send EOD Report
      </Button>
    </div>
  );
};

export default TimesheetReport;
// Single submit with work summary