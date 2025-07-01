import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { supabase } from "@/integrations/supabase/client";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";

interface TimeEntrySectionProps {
  timeLog: TimeLog;
  employeeHasProjects: boolean;
}

interface Project {
  id: string;
  name: string;
}

export const TimeEntrySection = ({ timeLog, employeeHasProjects }: TimeEntrySectionProps) => {
  const [projects, setProjects] = useState<Map<string, string>>(new Map());

  // Fetch project names for projectIds in timeLog
  useEffect(() => {
    const fetchProjects = async () => {
      console.log('Debug: employeeHasProjects status', { employeeHasProjects, timeLogId: timeLog.id });

      if (!employeeHasProjects || !timeLog.project_time_data?.projects) {
        console.log('Debug: Skipping project fetch', {
          employeeHasProjects,
          hasProjectsData: !!timeLog.project_time_data?.projects,
          projectCount: timeLog.project_time_data?.projects?.length || 0,
        });
        return;
      }

      const projectIds = timeLog.project_time_data.projects
        .map((entry) => entry.projectId)
        .filter((id): id is string => !!id);

      console.log('Debug: Project IDs to fetch', { projectIds, count: projectIds.length });

      if (projectIds.length === 0) {
        console.log('Debug: No valid project IDs found');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('hr_projects')
          .select('id, name')
          .in('id', projectIds);

        if (error) {
          console.error('Error fetching projects from hr_projects:', error);
          return;
        }

        const projectMap = new Map<string, string>();
        data.forEach((project: Project) => {
          projectMap.set(project.id, project.name);
        });
        setProjects(projectMap);

        console.log('Debug: Fetched projects', {
          projectCount: data.length,
          projects: data.map((p: Project) => ({ id: p.id, name: p.name })),
        });
      } catch (error) {
        console.error('Error fetching projects from hr_projects:', error);
      }
    };

    fetchProjects();
  }, [timeLog, employeeHasProjects]);

  // Format time in IST
  const formatTime = (utcTime?: string) => {
    if (!utcTime) return 'N/A';
    return DateTime.fromISO(utcTime, { zone: 'UTC' })
      .setZone('Asia/Kolkata')
      .toFormat('hh:mm a');
  };

  // Format project-wise details
  const formatProjectDetails = () => {
    if (!employeeHasProjects || !timeLog.project_time_data?.projects) {
      return null;
    }

    const projectDetails = timeLog.project_time_data.projects.map((entry, index) => {
      const projectName = projects.get(entry.projectId) || 'Unknown Project';
      return (
        <div
          key={index}
          className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">{`Project ${index + 1}: ${projectName}`}</h4>
            <span className="text-xs font-medium text-indigo-600">{`${entry.hours}h`}</span>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500 block">Work Summary</span>
            <p className="text-sm text-gray-700">{entry.report || 'No summary provided'}</p>
          </div>
        </div>
      );
    });

    console.log('Debug: Project details for display', {
      timeLogId: timeLog.id,
      projectCount: timeLog.project_time_data.projects.length,
      details: timeLog.project_time_data.projects.map((entry) => ({
        projectId: entry.projectId,
        projectName: projects.get(entry.projectId) || 'Unknown Project',
        hours: entry.hours,
        report: entry.report,
      })),
    });

    return projectDetails;
  };

  console.log('Debug: timeLog Entry', {
    timeLogId: timeLog.id,
    date: timeLog.date,
    clockIn: timeLog.clock_in_time,
    clockOut: timeLog.clock_out_time,
    durationMinutes: timeLog.duration_minutes,
    employeeHasProjects,
    projectData: timeLog.project_time_data?.projects || null,
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Entry Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-gray-500 block uppercase tracking-wide">Date</span>
          <span className="text-sm font-medium text-gray-800">{formatDate(timeLog.date)}</span>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-gray-500 block uppercase tracking-wide">Total Duration</span>
          <span className="text-sm font-medium text-gray-800">
            {timeLog.duration_minutes
              ? `${Math.floor(timeLog.duration_minutes / 60)}h ${timeLog.duration_minutes % 60}m`
              : 'N/A'}
          </span>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-gray-500 block uppercase tracking-wide">Clock In</span>
          <span className="text-sm font-medium text-gray-800">{formatTime(timeLog.clock_in_time)}</span>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
          <span className="text-xs text-gray-500 block uppercase tracking-wide">Clock Out</span>
          <span className="text-sm font-medium text-gray-800">{formatTime(timeLog.clock_out_time)}</span>
        </div>
      </div>
      {employeeHasProjects && timeLog.project_time_data?.projects && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Project Details</h4>
          <div className="space-y-4">{formatProjectDetails()}</div>
        </div>
      )}
    </div>
  );
};