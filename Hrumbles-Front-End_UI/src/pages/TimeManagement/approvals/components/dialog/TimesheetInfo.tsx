import { useState, useEffect } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";
import { formatDuration } from "../TimesheetList";
import { format, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import parse from "html-react-parser";
import { Clock, Coffee, Utensils, MousePointerClick, BarChart, WifiOff, Moon } from "lucide-react";

interface TimesheetInfoProps {
  dialogTimesheet: TimeLog;
  type: 'normal' | 'clarification';
}

// --- NEW: Define a type for activity logs ---
interface ActivityLog {
  id: string;
  activity_type: 'active' | 'inactive' | 'away';
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

interface Project {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

export const TimesheetInfo = ({ dialogTimesheet, type }: TimesheetInfoProps) => {
  const [projects, setProjects] = useState<Map<string, string>>(new Map());
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const hasProjects = !!dialogTimesheet.project_time_data?.projects?.length;
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);


    useEffect(() => {
    if (!dialogTimesheet.employee_id || !dialogTimesheet.date) return;

    const fetchActivityLogs = async () => {
      setLoadingActivity(true);
      try {
        const dateStart = startOfDay(new Date(dialogTimesheet.date)).toISOString();
        const dateEnd = endOfDay(new Date(dialogTimesheet.date)).toISOString();

        const { data, error } = await supabase
          .from('user_session_activity')
          .select('id, activity_type, start_time, end_time, duration_seconds')
          .eq('user_id', dialogTimesheet.employee_id)
          .gte('start_time', dateStart)
          .lte('start_time', dateEnd)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        
        setActivityLogs(data as ActivityLog[]);
      } catch (error) {
        console.error("Error fetching user activity logs:", error);
        setActivityLogs([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    fetchActivityLogs();
  }, [dialogTimesheet.employee_id, dialogTimesheet.date]);

  // Fetch project and client names
  useEffect(() => {
    const fetchProjectsAndClients = async () => {
      if (!hasProjects) {
        console.log('Debug: No projects to fetch', {
          timeLogId: dialogTimesheet.id,
          projectData: dialogTimesheet.project_time_data?.projects || null,
        });
        return;
      }

      const projectIds = dialogTimesheet.project_time_data!.projects
        .map((entry) => entry.projectId)
        .filter((id): id is string => !!id);

      const clientIds = dialogTimesheet.project_time_data!.projects
        .map((entry) => entry.clientId)
        .filter((id): id is string => !!id);

      console.log('Debug: IDs to fetch', { projectIds, clientIds, projectCount: projectIds.length, clientCount: clientIds.length });

      if (projectIds.length === 0) {
        console.log('Debug: No valid project IDs found');
        return;
      }

      try {
        // Fetch projects
        const { data: projectData, error: projectError } = await supabase
          .from('hr_projects')
          .select('id, name')
          .in('id', projectIds);

        if (projectError) {
          console.error('Error fetching projects from hr_projects:', projectError);
          return;
        }

        const projectMap = new Map<string, string>();
        projectData.forEach((project: Project) => {
          projectMap.set(project.id, project.name);
        });
        setProjects(projectMap);

        console.log('Debug: Fetched projects', {
          projectCount: projectData.length,
          projects: projectData.map((p: Project) => ({ id: p.id, name: p.name })),
        });

        // Fetch clients
        if (clientIds.length > 0) {
          const { data: clientData, error: clientError } = await supabase
            .from('hr_clients')
            .select('id, client_name')
            .in('id', clientIds);

          if (clientError) {
            console.error('Error fetching clients from hr_clients:', clientError);
            return;
          }

          const clientMap = new Map<string, string>();
          clientData.forEach((client: Client) => {
            clientMap.set(client.id, client.client_name);
          });
          setClients(clientMap);

          console.log('Debug: Fetched clients', {
            clientCount: clientData.length,
            clients: clientData.map((c: Client) => ({ id: c.id, name: c.name })),
          });
        }
      } catch (error) {
        console.error('Error fetching projects or clients:', error);
      }
    };

    fetchProjectsAndClients();
  }, [dialogTimesheet, hasProjects]);

  // Format clock-in and clock-out times
  const formatTime = (time: string | null) => {
    if (!time) return "N/A";
    return format(new Date(time), "h:mm a");
  };

    const activitySummary = activityLogs.reduce((acc, log) => {
    const duration = log.duration_seconds || 0;
    if (log.activity_type === 'active') acc.active += duration;
    if (log.activity_type === 'inactive') acc.inactive += duration;
    if (log.activity_type === 'away') acc.away += duration;
    return acc;
  }, { active: 0, inactive: 0, away: 0 });
  
  const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return formatDuration(Math.floor(seconds / 60));
  };

    // --- NEW: Calculate total break minutes ---
  const totalBreakMinutes = dialogTimesheet.break_logs?.reduce(
    (sum, breakLog) => sum + (breakLog.duration_minutes || 0), 0
  ) || 0;


   // --- NEW: Component to render the activity log timeline ---
  const renderActivityLog = () => {
    const activityIcon = (type: string) => {
        switch(type) {
            case 'active': return <WifiOff size={14} className="text-green-500" />;
            case 'inactive': return <Moon size={14} className="text-gray-500" />;
            case 'away': return <Coffee size={14} className="text-orange-500" />;
            default: return <MousePointerClick size={14} />;
        }
    };

    return (
        <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart size={16} /> Activity Log
            </h4>
            <div className="bg-white rounded-lg border p-3">
                {loadingActivity ? (
                    <p className="text-sm text-gray-500">Loading activity...</p>
                ) : activityLogs.length === 0 ? (
                    <p className="text-sm text-gray-500">No activity recorded for this day.</p>
                ) : (
                    <>
                        {/* Summary Section */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div>
                                <p className="text-xs text-green-600">Active</p>
                                <p className="text-sm font-semibold text-green-700">{formatSeconds(activitySummary.active)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">Inactive</p>
                                <p className="text-sm font-semibold text-gray-700">{formatSeconds(activitySummary.inactive)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-orange-600">Away</p>
                                <p className="text-sm font-semibold text-orange-700">{formatSeconds(activitySummary.away)}</p>
                            </div>
                        </div>
                        {/* Timeline Section */}
                        <div className="max-h-[200px] overflow-y-auto space-y-2 border-t pt-3 pr-2">
                           {activityLogs.map(log => (
                               <div key={log.id} className="flex justify-between items-center text-xs">
                                   <span className="capitalize flex items-center gap-2">
                                       {activityIcon(log.activity_type)}
                                       {formatTime(log.start_time)}
                                   </span>
                                   <span className="font-medium text-gray-600">
                                       {formatSeconds(log.duration_seconds || 0)}
                                   </span>
                               </div>
                           ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
  };


  // --- NEW: Component to render break logs ---
  const renderBreakLogs = () => {
    if (!dialogTimesheet.break_logs || dialogTimesheet.break_logs.length === 0) {
        return null; // Don't render anything if there are no breaks
    }

    return (
        <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Coffee size={16} /> Break Details
            </h4>
            <div className="bg-white rounded-lg border p-3 space-y-2">
                {dialogTimesheet.break_logs.map(log => (
                    <div key={log.id} className="flex justify-between items-center text-sm">
                        <span className="capitalize flex items-center gap-2">
                            {log.break_type === 'lunch' ? <Utensils size={14} /> : <Coffee size={14} />}
                            {log.break_type} Break
                        </span>
                        <span className="font-medium text-gray-700">
                            {formatDuration(log.duration_minutes)}
                        </span>
                    </div>
                ))}
                <div className="flex justify-between items-center text-sm font-semibold border-t pt-2 mt-2">
                    <span>Total Break Time</span>
                    <span className="text-orange-600">
                        {formatDuration(totalBreakMinutes)}
                    </span>
                </div>
            </div>
        </div>
    );
  };

  // Render project details in a table
  const renderProjectDetails = () => {
    if (!hasProjects) return null;

    return (
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Project Details</h4>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Summary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dialogTimesheet.project_time_data!.projects.map((entry, index) => {
                  const projectName = projects.get(entry.projectId) || 'Unknown Project';
                  const clientName = clients.get(entry.clientId) || 'Unknown Client';
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">{projectName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{clientName}</td>
                      <td className="px-4 py-2 text-sm text-indigo-600">{`${entry.hours}h`}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {entry.report ? parse(entry.report) : 'No summary provided'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  console.log("dialogTimesheet", dialogTimesheet);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold">Employee</h4>
          <p>
            {dialogTimesheet.employee?.first_name && dialogTimesheet.employee?.last_name
              ? `${dialogTimesheet.employee.first_name} ${dialogTimesheet.employee.last_name}`
              : 'Unknown Employee'}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Department</h4>
          <p>
            {dialogTimesheet?.employee?.department?.name ||
              dialogTimesheet?.employee?.hr_departments?.name ||
              'Unknown'}
          </p>
        </div>
      </div>

      {type === 'normal' ? (
        <>
          {/* --- Time Info: Adjusted to 3 columns --- */}
          <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-4">
            <div>
              <h4 className="text-sm font-semibold">Date</h4>
              <p>{formatDate(dialogTimesheet.date)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Total Duration</h4>
              <p>{formatDuration(dialogTimesheet.duration_minutes)}</p>
            </div>
             {/* --- ADDED: Total Breaks Info --- */}
            <div>
              <h4 className="text-sm font-semibold">Total Breaks</h4>
              <p className="font-medium text-orange-600">{formatDuration(totalBreakMinutes)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Log In</h4>
              <p>{formatTime(dialogTimesheet.clock_in_time)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Log Out</h4>
              <p>{formatTime(dialogTimesheet.clock_out_time)}</p>
            </div>
          </div>
         <div className="flex gap-4">
            <div className="w-1/2 space-y-6">
                {renderBreakLogs()}
            </div>
            <div className="w-1/2 space-y-6">
                {renderActivityLog()}
            </div>
          </div>
          {renderProjectDetails()}

        </>
      ) : (
        <>
          <div>
            <h4 className="text-sm font-semibold">Date</h4>
            <p>{formatDate(dialogTimesheet.date)}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Original Issue</h4>
            <p className="text-sm text-muted-foreground">
              {dialogTimesheet.rejection_reason || 'No reason provided'}
            </p>
          </div>
          <div className="bg-slate-200 p-3 rounded-md">
            <h4 className="text-sm font-semibold">Employee's Clarification</h4>
            <p className="text-sm mt-1">
              {dialogTimesheet.clarification_response || 'No clarification provided'}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="w-1/2 space-y-6">
                {renderBreakLogs()}
            </div>
            <div className="w-1/2 space-y-6">
                {renderActivityLog()}
            </div>
          </div>
          {renderProjectDetails()}
        </>
      )}
    </div>
  );
};