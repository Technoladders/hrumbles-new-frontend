// TimesheetInfo.tsx

import { useState, useEffect } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";
import { formatDuration } from "../TimesheetList";
import { format, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import parse from "html-react-parser";
import {
  Clock,
  Coffee,
  Utensils,
  MousePointerClick,
  BarChart,
  WifiOff,
  Moon,
  Calendar,
  LogIn,
  LogOut,
  Timer,
  TrendingUp,
  User,
  Briefcase
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TimesheetInfoProps {
  dialogTimesheet: TimeLog;
  type: 'normal' | 'clarification';
}

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

// A simple type definition for recruiter report data for clarity
interface RecruiterJobReport {
    jobTitle: string;
    clientName: string;
    hours: number;
    minutes?: number;
    submissions: Array<{ id: string; name: string }>;
    challenges?: string;
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

  useEffect(() => {
    const fetchProjectsAndClients = async () => {
      if (!hasProjects) return;

      const projectIds = dialogTimesheet.project_time_data!.projects
        .map((entry) => entry.projectId)
        .filter((id): id is string => !!id);

      const clientIds = dialogTimesheet.project_time_data!.projects
        .map((entry) => entry.clientId)
        .filter((id): id is string => !!id);

      if (projectIds.length === 0) return;

      try {
        const { data: projectData, error: projectError } = await supabase
          .from('hr_projects')
          .select('id, name')
          .in('id', projectIds);

        if (projectError) {
          console.error('Error fetching projects:', projectError);
          return;
        }

        const projectMap = new Map<string, string>();
        projectData.forEach((project: Project) => {
          projectMap.set(project.id, project.name);
        });
        setProjects(projectMap);

        if (clientIds.length > 0) {
          const { data: clientData, error: clientError } = await supabase
            .from('hr_clients')
            .select('id, client_name')
            .in('id', clientIds);

          if (clientError) {
            console.error('Error fetching clients:', clientError);
            return;
          }

          const clientMap = new Map<string, string>();
          clientData.forEach((client: Client) => {
            clientMap.set(client.id, client.client_name);
          });
          setClients(clientMap);
        }
      } catch (error) {
        console.error('Error fetching projects or clients:', error);
      }
    };

    fetchProjectsAndClients();
  }, [dialogTimesheet, hasProjects]);

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
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes > 0) {
        return formatDuration(totalMinutes);
    }
    if (seconds < 60) {
        return `${seconds}s`;
    }
    return formatDuration(totalMinutes);
  };

  const totalBreakMinutes = dialogTimesheet.break_logs?.reduce(
    (sum, breakLog) => sum + (breakLog.duration_minutes || 0), 0
  ) || 0;

  const totalActivitySeconds = activitySummary.active + activitySummary.inactive + activitySummary.away;
  const activePercentage = totalActivitySeconds > 0 ? (activitySummary.active / totalActivitySeconds) * 100 : 0;
  const inactivePercentage = totalActivitySeconds > 0 ? (activitySummary.inactive / totalActivitySeconds) * 100 : 0;
  const awayPercentage = totalActivitySeconds > 0 ? (activitySummary.away / totalActivitySeconds) * 100 : 0;

const renderActivityLog = () => {
    const activityIcon = (type: string) => {
      // Using icons that match the visual style of the screenshot
      switch(type) {
        case 'active': return <TrendingUp size={14} className="text-emerald-500" />;
        case 'inactive': return <Moon size={14} className="text-slate-500" />;
        case 'away': return <Coffee size={14} className="text-blue-500" />;
        default: return <MousePointerClick size={14} />;
      }
    };

    const activityColor = (type: string) => {
      switch(type) {
        case 'active': return 'bg-emerald-50 border-emerald-200';
        case 'inactive': return 'bg-slate-50 border-slate-200';
        case 'away': return 'bg-blue-50 border-blue-200';
        default: return 'bg-gray-50 border-gray-200';
      }
    };

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-3 border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-blue-600 rounded-md">
            <BarChart size={14} className="text-white" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">Activity Timeline</h4>
        </div>
        
        {loadingActivity ? (
          <div className="text-center py-5">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="text-center py-5">
            <BarChart size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No activity recorded.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Active Card */}
              <div className="bg-white rounded-lg p-2.5 border border-emerald-200 shadow-sm text-center">
                 <div className="flex items-center justify-center gap-1.5">
                   <TrendingUp size={14} className="text-emerald-500" />
                   <span className="text-xs font-medium text-gray-600">Active</span>
                </div>
                <p className="text-lg font-bold text-gray-800">{formatSeconds(activitySummary.active)}</p>
                <p className="text-xs text-gray-500 -mt-1">{activePercentage.toFixed(0)}%</p>
              </div>
              
              {/* Inactive Card */}
              <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm text-center">
                 <div className="flex items-center justify-center gap-1.5">
                   <Moon size={14} className="text-slate-500" />
                   <span className="text-xs font-medium text-gray-600">Inactive</span>
                </div>
                <p className="text-lg font-bold text-gray-800">{formatSeconds(activitySummary.inactive)}</p>
                <p className="text-xs text-gray-500 -mt-1">{inactivePercentage.toFixed(0)}%</p>
              </div>
              
              {/* Away Card */}
              <div className="bg-white rounded-lg p-2.5 border border-blue-200 shadow-sm text-center">
                 <div className="flex items-center justify-center gap-1.5">
                   <Coffee size={14} className="text-blue-500" />
                   <span className="text-xs font-medium text-gray-600">Away</span>
                </div>
                <p className="text-lg font-bold text-gray-800">{formatSeconds(activitySummary.away)}</p>
                <p className="text-xs text-gray-500 -mt-1">{awayPercentage.toFixed(0)}%</p>
              </div>
            </div>

            {/* Timeline List */}
            <div className="bg-white rounded-lg p-2 max-h-[180px] overflow-y-auto custom-scrollbar border">
              <div className="space-y-1">
                {activityLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-1.5 rounded-md border ${activityColor(log.activity_type)}`}
                  >
                    <div className="flex items-center gap-2">
                      {activityIcon(log.activity_type)}
                      <span className="text-xs font-medium text-gray-700">{formatTime(log.start_time)}</span>
                       <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        log.activity_type === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        log.activity_type === 'inactive' ? 'bg-slate-100 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.activity_type}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-800 w-12 text-right">
                      {formatSeconds(log.duration_seconds || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };



   const renderBreakLogs = () => {
    if (!dialogTimesheet.break_logs || dialogTimesheet.break_logs.length === 0) {
      return null;
    }

    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-3 border border-purple-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-purple-600 rounded-md">
            <Coffee size={14} className="text-white" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">Break Details</h4>
        </div>
        
        <div className="space-y-2">
          {dialogTimesheet.break_logs.map(log => (
            <div 
              key={log.id} 
              className="bg-white rounded-lg p-2.5 border border-purple-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${log.break_type === 'lunch' ? 'bg-purple-100' : 'bg-indigo-100'}`}>
                    {log.break_type === 'lunch' ? 
                      <Utensils size={14} className="text-purple-600" /> : 
                      <Coffee size={14} className="text-indigo-600" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 capitalize">{log.break_type} Break</p>
                    <p className="text-xs text-gray-500 -mt-1">Duration</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-purple-600">
                  {formatDuration(log.duration_minutes)}
                </p>
              </div>
            </div>
          ))}
          
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2.5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer size={16} />
                <span className="text-xs font-semibold">Total Break Time</span>
              </div>
              <span className="text-lg font-bold">
                {formatDuration(totalBreakMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderProjectDetails = () => {
    if (!hasProjects) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Briefcase size={16} className="text-indigo-600" />
          </div>
          <h4 className="text-base font-bold text-gray-800">Project Breakdown</h4>
        </div>
        
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Client</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Hours</th>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Work Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dialogTimesheet.project_time_data!.projects.map((entry, index) => {
                  const projectName = projects.get(entry.projectId) || 'N/A';
                  const clientName = clients.get(entry.clientId) || 'N/A';
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-800">{projectName}</td>
                      <td className="px-4 py-2 text-gray-600">{clientName}</td>
                      <td className="px-4 py-2">
                        <span className="font-bold text-indigo-700">{`${entry.hours}h`}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs text-gray-700 max-w-xs">
                          {entry.report ? parse(entry.report) : <span className="text-gray-400 italic">No summary</span>}
                        </div>
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

  const renderRecruiterReport = () => {
    if (!dialogTimesheet.recruiter_report_data) return null;
    
    try {
      const reportData = (
        typeof dialogTimesheet.recruiter_report_data === 'string' 
          ? JSON.parse(dialogTimesheet.recruiter_report_data) 
          : dialogTimesheet.recruiter_report_data
      ) as RecruiterJobReport[];

      if (!Array.isArray(reportData) || reportData.length === 0) return null;

      return (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase size={18} className="text-purple-600" />
            </div>
            <h4 className="text-base font-bold text-gray-800">Detailed Job Report</h4>
          </div>

          <div className="space-y-3">
            {reportData.map((job, index) => {
              const timeSpent = `${job.hours}h ${job.minutes || 0}m`;
              return (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h5 className="text-sm font-bold text-gray-900">{job.jobTitle}</h5>
                      <p className="text-xs text-gray-600">{job.clientName}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{timeSpent}</span>
                  </div>

                  {job.submissions?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Profiles Submitted:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {job.submissions.map((submission) => (
                          <li key={submission.id} className="text-xs text-gray-700">
                            {submission.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error parsing recruiter report data:', error);
      return null;
    }
  };
  
  const getDayName = (dateString: string) => format(new Date(dateString), "EEEE");
  const getFormattedDate = (dateString: string) => format(new Date(dateString), "MMM dd, yyyy");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[220px_1fr] gap-4">
        <div className="bg-gradient-to-br from-100 to-emerald-100 rounded-2xl p-4 border-2 border-green-200 shadow-md flex flex-col items-center justify-center">
          <div className="p-2 bg-blue-600 rounded-lg mb-2">
            <Calendar size={28} className="text-white" />
          </div>
          <p className="text-base font-bold text-gray-700">{getDayName(dialogTimesheet.date)}</p>
          <p className="text-xl font-bold text-gray-900">{getFormattedDate(dialogTimesheet.date)}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 border-2 border-purple-400 shadow-md text-white">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Clock size={20} />
            Timesheet Details
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-purple-400/30">
              <div className="flex items-center gap-2">
                <User size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Employee</span>
              </div>
              <span className="text-base font-bold">
                {dialogTimesheet.employee?.first_name && dialogTimesheet.employee?.last_name
                  ? `${dialogTimesheet.employee.first_name} ${dialogTimesheet.employee.last_name}`
                  : 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-1.5 border-b border-purple-400/30">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Department</span>
              </div>
              <span className="text-base font-bold">
                {dialogTimesheet?.employee?.department?.name || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-1.5 border-b border-purple-400/30">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Total Duration</span>
              </div>
              <span className="text-base font-bold">{formatDuration(dialogTimesheet.duration_minutes)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1.5 border-b border-purple-400/30">
              <div className="flex items-center gap-2">
                <Coffee size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Total Breaks</span>
              </div>
              <span className="text-base font-bold">{formatDuration(totalBreakMinutes)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1.5 border-b border-purple-400/30">
              <div className="flex items-center gap-2">
                <LogIn size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Log In</span>
              </div>
              <span className="text-base font-bold">{formatTime(dialogTimesheet.clock_in_time)}</span>
            </div>
            
            <div className="flex justify-between items-center py-1.5">
              <div className="flex items-center gap-2">
                <LogOut size={14} className="text-purple-200" />
                <span className="text-xs font-semibold text-purple-100">Log Out</span>
              </div>
              <span className="text-base font-bold">{formatTime(dialogTimesheet.clock_out_time)}</span>
            </div>
          </div>
        </div>
      </div>

      {type === 'normal' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {renderBreakLogs()}
            {renderActivityLog()}
          </div>
          {renderProjectDetails()}
      
        </>
      ) : (
        <>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200 shadow-sm">
            <h4 className="text-xs font-bold text-red-600 uppercase mb-2">Original Issue</h4>
            <p className="text-sm text-gray-700">{dialogTimesheet.rejection_reason || 'No reason provided'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 shadow-sm">
            <h4 className="text-xs font-bold text-blue-600 uppercase mb-2">Employee's Clarification</h4>
            <p className="text-sm text-gray-700">{dialogTimesheet.clarification_response || 'No clarification provided'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {renderBreakLogs()}
            {renderActivityLog()}
          </div>
          {renderProjectDetails()}
         
        </>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};