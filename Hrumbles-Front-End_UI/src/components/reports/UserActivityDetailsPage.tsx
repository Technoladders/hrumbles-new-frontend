import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, BarChart, WifiOff, Moon, Coffee, MousePointerClick } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

// Types
interface ActivityLog {
  id: string;
  activity_type: 'active' | 'inactive' | 'away';
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

// Helpers
const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};
const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return "N/A";
    return format(new Date(timeStr), "h:mm:ss a");
};

const UserActivityDetailsPage: React.FC = () => {
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId || !fromDate || !toDate) {
      setError("Missing required information (Employee ID or date range).");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch employee name
        const { data: empData, error: empError } = await supabase
          .from('hr_employees')
          .select('first_name, last_name')
          .eq('id', employeeId)
          .single();
        if (empError) throw empError;
        setEmployeeName(`${empData.first_name} ${empData.last_name}`);

        // Fetch detailed activity logs
        const dateStart = startOfDay(new Date(fromDate)).toISOString();
        const dateEnd = endOfDay(new Date(toDate)).toISOString();
        
        const { data, error: logError } = await supabase
          .from('user_session_activity')
          .select('id, activity_type, start_time, end_time, duration_seconds')
          .eq('user_id', employeeId)
          .gte('start_time', dateStart)
          .lte('start_time', dateEnd)
          .order('start_time', { ascending: true });
        
        if (logError) throw logError;
        setActivityLogs(data as ActivityLog[]);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch activity details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [employeeId, fromDate, toDate]);
  
  const activitySummary = activityLogs.reduce((acc, log) => {
    const duration = log.duration_seconds || 0;
    if (log.activity_type === 'active') acc.active += duration;
    if (log.activity_type === 'inactive') acc.inactive += duration;
    if (log.activity_type === 'away') acc.away += duration;
    return acc;
  }, { active: 0, inactive: 0, away: 0 });

  const activityIcon = (type: string) => {
      switch(type) {
          case 'active': return <WifiOff size={16} className="text-green-500" />;
          case 'inactive': return <Moon size={16} className="text-gray-500" />;
          case 'away': return <Coffee size={16} className="text-orange-500" />;
          default: return <MousePointerClick size={16} />;
      }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-semibold">Activity Details for {employeeName || '...'}</h1>
            <p className="text-sm text-muted-foreground">
              Showing records from {fromDate} to {toDate}
            </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart size={20} /> Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center p-12"><LoadingSpinner /></div> : 
           error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> :
           activityLogs.length === 0 ? <p className="text-center text-gray-500 py-8">No activity recorded for this period.</p> :
           (
            <>
              {/* Summary Section */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center p-4 bg-muted rounded-lg">
                  <div>
                      <p className="text-sm text-green-600 font-semibold">Active</p>
                      <p className="text-lg font-bold text-green-700">{formatDuration(activitySummary.active)}</p>
                  </div>
                  <div>
                      <p className="text-sm text-gray-600 font-semibold">Inactive</p>
                      <p className="text-lg font-bold text-gray-700">{formatDuration(activitySummary.inactive)}</p>
                  </div>
                  <div>
                      <p className="text-sm text-orange-600 font-semibold">Away</p>
                      <p className="text-lg font-bold text-orange-700">{formatDuration(activitySummary.away)}</p>
                  </div>
              </div>
              {/* Timeline Section */}
              <div className="max-h-[60vh] overflow-y-auto space-y-2 border-t pt-4 pr-3">
                 {activityLogs.map(log => (
                     <div key={log.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-50">
                         <span className="capitalize flex items-center gap-3 font-mono">
                             {activityIcon(log.activity_type)}
                             {formatTime(log.start_time)}
                         </span>
                         <span className="font-medium text-gray-600">
                             {formatDuration(log.duration_seconds || 0)}
                         </span>
                     </div>
                 ))}
              </div>
            </>
           )
          }
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityDetailsPage;