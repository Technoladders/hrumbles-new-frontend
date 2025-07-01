
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TimelineEvent {
  id: string;
  type: string;
  description: string[];
  created_at: string;
  details?: Record<string, any>;
}

export const TimelineCard: React.FC = () => {
  const [candidateEvents, setCandidateEvents] = useState<TimelineEvent[]>([]);
  const [jobEvents, setJobEvents] = useState<TimelineEvent[]>([]);
  const [clientProjectEvents, setClientProjectEvents] = useState<TimelineEvent[]>([]);
  const [leaveEvents, setLeaveEvents] = useState<TimelineEvent[]>([]);
  const [timeLogEvents, setTimeLogEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("candidate");

 useEffect(() => {
  const fetchTimelineData = async () => {
    try {
      setLoading(true);

      // Helper function to validate timestamps
      const validateTimestamp = (timestamp: string | null | undefined): string => {
        if (!timestamp || isNaN(new Date(timestamp).getTime())) {
          console.warn(`Invalid timestamp detected, using current time as fallback`);
          return new Date().toISOString();
        }
        return timestamp;
      };

      // Fetch Candidate Timeline
      const { data: candidates, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select("id, name, job_id, hr_jobs:hr_jobs!hr_job_candidates_job_id_fkey(title)");
      if (candidatesError) throw new Error(`Candidates fetch failed: ${candidatesError.message}`);

      const candidateIds = candidates?.map((candidate) => candidate.id) || [];
      const { data: candidateTimelineData, error: candidateTimelineError } = await supabase
        .from("hr_candidate_timeline")
        .select("id, candidate_id, event_type, previous_state, new_state, created_at")
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: false });
      if (candidateTimelineError) throw new Error(`Candidate timeline fetch failed: ${candidateTimelineError.message}`);

      const candidateEventsData = candidateTimelineData?.map((event) => ({
        id: event.id,
        type: "candidate",
        description: [
          candidates?.find((c) => c.id === event.candidate_id)?.name || "Unknown Candidate",
          `Status changed from ${event.previous_state?.subStatusName || event.previous_state?.mainStatusName || "N/A"} to ${event.new_state?.subStatusName || event.new_state?.mainStatusName || "N/A"}`,
          candidates?.find((c) => c.id === event.candidate_id)?.hr_jobs?.title ? `For ${candidates.find((c) => c.id === event.candidate_id)!.hr_jobs!.title}` : "",
        ].filter(Boolean),
        created_at: validateTimestamp(event.created_at),
        details: {
          candidate_name: candidates?.find((c) => c.id === event.candidate_id)?.name,
          job_title: candidates?.find((c) => c.id === event.candidate_id)?.hr_jobs?.title,
        },
      })) || [];
      setCandidateEvents(candidateEventsData);

      // Fetch Job Timeline
      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select(
          "id, title, created_at, updated_at, created_by, updated_by, hr_employees_created:hr_employees!hr_jobs_created_by_fkey(first_name, last_name), hr_employees_updated:hr_employees!hr_jobs_updated_by_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false });
      if (jobsError) throw new Error(`Jobs fetch failed: ${jobsError.message}`);

      const jobEventsData = jobsData?.flatMap((job) => {
        const events: TimelineEvent[] = [
          {
            id: `${job.id}-created`,
            type: "job",
            description: [
              `Job "${job.title}" created`,
              `By ${job.hr_employees_created?.first_name || "Unknown"} ${job.hr_employees_created?.last_name || ""}`,
            ],
            created_at: validateTimestamp(job.created_at),
            details: {
              job_title: job.title,
              creator: `${job.hr_employees_created?.first_name || "Unknown"} ${job.hr_employees_created?.last_name || ""}`,
            },
          },
        ];
        if (job.updated_at && job.updated_by && job.created_at !== job.updated_at) {
          events.push({
            id: `${job.id}-updated`,
            type: "job",
            description: [
              `Job "${job.title}" updated`,
              `By ${job.hr_employees_updated?.first_name || "Unknown"} ${job.hr_employees_updated?.last_name || ""}`,
            ],
            created_at: validateTimestamp(job.updated_at),
            details: {
              job_title: job.title,
              updater: `${job.hr_employees_updated?.first_name || "Unknown"} ${job.hr_employees_updated?.last_name || ""}`,
            },
          });
        }
        return events;
      }) || [];
      setJobEvents(jobEventsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      // Fetch Client & Project Timeline
      const { data: clientsData, error: clientsError } = await supabase
        .from("hr_clients")
        .select(
          "id, display_name, created_at, updated_at, created_by, updated_by, hr_employees_created:hr_employees!hr_clients_created_by_fkey(first_name, last_name), hr_employees_updated:hr_employees!hr_clients_updated_by_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false });
      if (clientsError) throw new Error(`Clients fetch failed: ${clientsError.message}`);

      const { data: projectsData, error: projectsError } = await supabase
        .from("hr_projects")
        .select(
          "id, name, client_id, created_at, updated_at, created_by, updated_by, hr_employees_created:hr_profiles!fk_created_by(first_name, last_name), hr_employees_updated:hr_profiles!fk_updated_by(first_name, last_name)"
        )
        .order("created_at", { ascending: false });
      if (projectsError) throw new Error(`Projects fetch failed: ${projectsError.message}`);

      const { data: projectEmployeesData, error: projectEmployeesError } = await supabase
        .from("hr_project_employees")
        .select(
          "id, project_id, assign_employee, created_at, updated_at, created_by, updated_by, hr_employees:hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name), hr_employees_created:hr_profiles!hr_project_employees_created_by_fkey(first_name, last_name), hr_employees_updated:hr_profiles!hr_project_employees_updated_by_fkey(first_name, last_name), hr_projects:hr_projects!hr_project_employees_project_id_fkey(name)"
        )
        .order("created_at", { ascending: false });
      if (projectEmployeesError) throw new Error(`Project employees fetch failed: ${projectEmployeesError.message}`);

      const clientProjectEventsData = [
        ...(clientsData?.flatMap((client) => {
          const events: TimelineEvent[] = [
            {
              id: `${client.id}-created`,
              type: "client",
              description: [
                `Client "${client.display_name}" created`,
                `By ${client.hr_employees_created?.first_name || "Unknown"} ${client.hr_employees_created?.last_name || ""}`,
              ],
              created_at: validateTimestamp(client.created_at),
              details: {
                client_name: client.display_name,
                creator: `${client.hr_employees_created?.first_name || "Unknown"} ${client.hr_employees_created?.last_name || ""}`,
              },
            },
          ];
          if (client.updated_at && client.updated_by && client.created_at !== client.updated_at) {
            events.push({
              id: `${client.id}-updated`,
              type: "client",
              description: [
                `Client "${client.display_name}" updated`,
                `By ${client.hr_employees_updated?.first_name || "Unknown"} ${client.hr_employees_updated?.last_name || ""}`,
              ],
              created_at: validateTimestamp(client.updated_at),
              details: {
                client_name: client.display_name,
                updater: `${client.hr_employees_updated?.first_name || "Unknown"} ${client.hr_employees_updated?.last_name || ""}`,
              },
            });
          }
          return events;
        }) || []),
        ...(projectsData?.flatMap((project) => {
          const events: TimelineEvent[] = [
            {
              id: `${project.id}-created`,
              type: "project",
              description: [
                `Project "${project.name}" created`,
                `By ${project.hr_employees_created?.first_name || "Unknown"} ${project.hr_employees_created?.last_name || ""}`,
              ],
              created_at: validateTimestamp(project.created_at),
              details: {
                project_name: project.name,
                creator: `${project.hr_employees_created?.first_name || "Unknown"} ${project.hr_employees_created?.last_name || ""}`,
              },
            },
          ];
          if (project.updated_at && project.updated_by && project.created_at !== project.updated_at) {
            events.push({
              id: `${project.id}-updated`,
              type: "project",
              description: [
                `Project "${project.name}" updated`,
                `By ${project.hr_employees_updated?.first_name || "Unknown"} ${project.hr_employees_updated?.last_name || ""}`,
              ],
              created_at: validateTimestamp(project.updated_at),
              details: {
                project_name: project.name,
                updater: `${project.hr_employees_updated?.first_name || "Unknown"} ${project.hr_employees_updated?.last_name || ""}`,
              },
            });
          }
          return events;
        }) || []),
        ...(projectEmployeesData?.flatMap((pe) => {
          const events: TimelineEvent[] = [
            {
              id: `${pe.id}-created`,
              type: "project_employee",
              description: [
                `Employee ${pe.hr_employees?.first_name || "Unknown"} ${pe.hr_employees?.last_name || ""} assigned to ${pe.hr_projects?.name || "Unknown Project"}`,
                `By ${pe.hr_employees_created?.first_name || "Unknown"} ${pe.hr_employees_created?.last_name || ""}`,
              ],
              created_at: validateTimestamp(pe.created_at),
              details: {
                employee_name: `${pe.hr_employees?.first_name || "Unknown"} ${pe.hr_employees?.last_name || ""}`,
                project_name: pe.hr_projects?.name || "Unknown Project",
                creator: `${pe.hr_employees_created?.first_name || "Unknown"} ${pe.hr_employees_created?.last_name || ""}`,
              },
            },
          ];
          if (pe.updated_at && pe.updated_by && pe.created_at !== pe.updated_at) {
            events.push({
              id: `${pe.id}-updated`,
              type: "project_employee",
              description: [
                `Employee assignment for ${pe.hr_employees?.first_name || "Unknown"} ${pe.hr_employees?.last_name || ""} to ${pe.hr_projects?.name || "Unknown Project"} updated`,
                `By ${pe.hr_employees_updated?.first_name || "Unknown"} ${pe.hr_employees_updated?.last_name || ""}`,
              ],
              created_at: validateTimestamp(pe.updated_at),
              details: {
                employee_name: `${pe.hr_employees?.first_name || "Unknown"} ${pe.hr_employees?.last_name || ""}`,
                project_name: pe.hr_projects?.name || "Unknown Project",
                updater: `${pe.hr_employees_updated?.first_name || "Unknown"} ${pe.hr_employees_updated?.last_name || ""}`,
              },
            });
          }
          return events;
        }) || []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setClientProjectEvents(clientProjectEventsData);

      // Fetch Leave Requests Timeline
      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_requests")
        .select(
          "id, employee_id, leave_type_id, start_date, end_date, total_days, status, notes, created_at, updated_at, hr_employees:hr_employees!leave_requests_employee_id_fkey(first_name, last_name), hr_employees_created:hr_employees!leave_requests_employee_id_fkey(first_name, last_name), hr_employees_updated:hr_employees!leave_requests_approved_by_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false });
      if (leaveError) throw new Error(`Leave requests fetch failed: ${leaveError.message}`);

      const leaveEventsData = leaveData?.flatMap((leave) => {
        const events: TimelineEvent[] = [
          {
            id: `${leave.id}-created`,
            type: "leave",
            description: [
              `${leave.hr_employees?.first_name || "Unknown"} ${leave.hr_employees?.last_name || ""} requested leave`,
              `From ${leave.start_date} to ${leave.end_date} (${leave.total_days} days, ${leave.status})${leave.notes ? ` (${leave.notes})` : ""}`,
            ],
            created_at: validateTimestamp(leave.created_at),
            details: {
              employee_name: `${leave.hr_employees?.first_name || "Unknown"} ${leave.hr_employees?.last_name || ""}`,
              start_date: leave.start_date,
              end_date: leave.end_date,
              total_days: leave.total_days,
              status: leave.status,
              notes: leave.notes,
            },
          },
        ];
        if (leave.updated_at && leave.updated_by && leave.created_at !== leave.updated_at) {
          events.push({
            id: `${leave.id}-updated`,
            type: "leave",
            description: [
              `${leave.hr_employees?.first_name || "Unknown"} ${leave.hr_employees?.last_name || ""} leave updated`,
              `By ${leave.hr_employees_updated?.first_name || "Unknown"} ${leave.hr_employees_updated?.last_name || ""}`,
              `From ${leave.start_date} to ${leave.end_date} (${leave.total_days} days)${leave.notes ? ` (${leave.notes})` : ""}`,
            ],
            created_at: validateTimestamp(leave.updated_at),
            details: {
              employee_name: `${leave.hr_employees?.first_name || "Unknown"} ${leave.hr_employees?.last_name || ""}`,
              updater: `${leave.hr_employees_updated?.first_name || "Unknown"} ${leave.hr_employees_updated?.last_name || ""}`,
              status: leave.status,
            },
          });
        }
        return events;
      }) || [];
      setLeaveEvents(leaveEventsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

      // Fetch Time Logs Timeline
      const { data: timeLogData, error: timeLogError } = await supabase
        .from("time_logs")
        .select(
          "id, employee_id, date, clock_in_time, clock_out_time, status, is_submitted, is_approved, created_at, updated_at, hr_employees:hr_employees!time_logs_employee_id_fkey(first_name, last_name), hr_employees_created:hr_employees!time_logs_employee_id_fkey(first_name, last_name), hr_employees_updated:hr_employees!time_logs_approved_by_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false });
      if (timeLogError) throw new Error(`Time logs fetch failed: ${timeLogError.message}`);

      const timeLogEventsData = timeLogData?.flatMap((log) => {
        const events: TimelineEvent[] = [
          {
            id: `${log.id}-created`,
            type: "time_log",
            description: [
              `${log.hr_employees?.first_name || "Unknown"} ${log.hr_employees?.last_name || ""} logged time`,
              `At ${log.clock_in_time ? new Date(log.clock_in_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "N/A"} on ${log.date}`,
            ],
            created_at: validateTimestamp(log.created_at),
            details: {
              employee_name: `${log.hr_employees?.first_name || "Unknown"} ${log.hr_employees?.last_name || ""}`,
              date: log.date,
              clock_in_time: log.clock_in_time,
            },
          },
        ];
        if (log.updated_at && log.updated_by && log.created_at !== log.updated_at) {
          events.push({
            id: `${log.id}-updated`,
            type: "time_log",
            description: [
              `${log.hr_employees?.first_name || "Unknown"} ${log.hr_employees?.last_name || ""} time log updated`,
              `At ${log.clock_out_time ? new Date(log.clock_out_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "N/A"} on ${log.date}`,
            ],
            created_at: validateTimestamp(log.updated_at),
            details: {
              employee_name: `${log.hr_employees?.first_name || "Unknown"} ${log.hr_employees?.last_name || ""}`,
              date: log.date,
              clock_out_time: log.clock_out_time,
            },
          });
        }
        return events;
      }) || [];
      setTimeLogEvents(timeLogEventsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error: any) {
      console.error("Error fetching timeline data:", error);
      toast.error(`Error loading timeline: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  fetchTimelineData();
}, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTimeline = (events: TimelineEvent[]) => (
  <ScrollArea className="h-[300px] pr-4 -mr-4">
  <div className="space-y-1">
    {events.length > 0 ? (
      events.map((event, index) => (
        <div
          key={event.id}
          className="flex items-start gap-4 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          <div className="flex-shrink-0 w-2 h-2 mt-2 bg-purple-500 dark:bg-purple-400 rounded-full"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {formatDate(event.created_at)}
              </span>
              <div className="h-1 w-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <Activity className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-200 space-y-1">
              {event.description.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "font-semibold"
                      : "text-gray-600 dark:text-gray-300"
                  }
                >
                  {line}
                </p>
              ))}
            </div>
           
          </div>
        </div>
      ))
    ) : (
      <div className="text-gray-500 dark:text-gray-400 italic text-sm">
        No timeline events available
      </div>
    )}
  </div>
</ScrollArea>

    );

  return (
    <Card className="shadow-md rounded-xl h-[400px] flex flex-col bg-white dark:bg-gray-900">
      <CardContent className="pt-4 flex flex-col h-full">
        <div className="flex items-center mb-3">
          <Activity className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Activity Timeline</h3>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid grid-cols-5 mb-1.5">
            <TabsTrigger value="candidate" className="text-xs">Candidate</TabsTrigger>
            <TabsTrigger value="job" className="text-xs">Job</TabsTrigger>
            <TabsTrigger value="client_project" className="text-xs">Client & Project</TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs">Leaves</TabsTrigger>
            <TabsTrigger value="time_logs" className="text-xs">Time Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="candidate" className="flex-1">
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">Loading candidate timeline...</div>
            ) : (
              renderTimeline(candidateEvents)
            )}
          </TabsContent>
          <TabsContent value="job" className="flex-1">
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">Loading job timeline...</div>
            ) : (
              renderTimeline(jobEvents)
            )}
          </TabsContent>
          <TabsContent value="client_project" className="flex-1">
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">Loading client & project timeline...</div>
            ) : (
              renderTimeline(clientProjectEvents)
            )}
          </TabsContent>
          <TabsContent value="leaves" className="flex-1">
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">Loading leave timeline...</div>
            ) : (
              renderTimeline(leaveEvents)
            )}
          </TabsContent>
          <TabsContent value="time_logs" className="flex-1">
            {loading ? (
              <div className="text-gray-500 dark:text-gray-400 italic text-sm">Loading time log timeline...</div>
            ) : (
              renderTimeline(timeLogEvents)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
