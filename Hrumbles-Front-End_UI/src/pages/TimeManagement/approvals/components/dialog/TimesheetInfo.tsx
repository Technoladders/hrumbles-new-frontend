import { useState, useEffect } from "react";
import { TimeLog } from "@/types/time-tracker-types";
import { formatDate } from "@/utils/timeFormatters";
import { formatDuration } from "../TimesheetList";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import parse from "html-react-parser";

interface TimesheetInfoProps {
  dialogTimesheet: TimeLog;
  type: 'normal' | 'clarification';
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold">Date</h4>
              <p>{formatDate(dialogTimesheet.date)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Duration</h4>
              <p>{formatDuration(dialogTimesheet.duration_minutes)}</p>
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
          {renderProjectDetails()}
        </>
      )}
    </div>
  );
};