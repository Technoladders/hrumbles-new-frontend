import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeLog, DetailedTimesheetEntry } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useTimesheetSubmission } from './hooks/useTimesheetSubmission';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import parse from "html-react-parser";

interface ViewTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitTimesheet: () => void;
  employeeHasProjects: boolean;
}

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

interface Project {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

export const TimesheetProjectDetails: React.FC<{ timesheet: TimeLog; employeeHasProjects: boolean }> = ({ timesheet, employeeHasProjects }) => {
  const [projects, setProjects] = useState<Map<string, string>>(new Map());
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const hasProjects = employeeHasProjects && !!timesheet.project_time_data?.projects?.length;

  // Fetch project and client names
  useEffect(() => {
    const fetchProjectsAndClients = async () => {
      if (!hasProjects) {
        console.log('Debug: No projects to fetch', {
          timeLogId: timesheet.id,
          projectData: timesheet.project_time_data?.projects || null,
        });
        return;
      }

      const projectIds = timesheet.project_time_data!.projects
        .map((entry) => entry.projectId)
        .filter((id): id is string => !!id);

      const clientIds = timesheet.project_time_data!.projects
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
  }, [timesheet, hasProjects]);

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
              {timesheet.project_time_data!.projects.map((entry, index) => {
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