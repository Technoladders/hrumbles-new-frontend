import React, { useState, useEffect, useMemo } from "react";
// Goal: Import useSearchParams to manage state in the URL
import { Link, useSearchParams } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Search,
  Users,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  UserPlus,
  Trash2,
  Loader2,
  HousePlus,
} from "lucide-react";
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/jobs/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/jobs/ui/select";
import { Badge } from "@/components/jobs/ui/badge";
import { Card } from "@/components/jobs/ui/card";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";
import { AssignJobModal } from "@/components/jobs/job/AssignJobModal";
import { toast } from "sonner";
import { JobData } from "@/lib/types";
import {
  getAllJobs,
  getJobsByType,
  createJob,
  updateJob,
  updateAssociate,
  deleteJob,
  updateJobStatus,
  getJobsAssignedToUser,
} from "@/services/jobService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/jobs/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/jobs/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/jobs/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import AssociateToClientModal from "@/components/jobs/job/AssociateToClientModal";
import { useSelector } from "react-redux";
import moment from "moment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/jobs/ui/avatar";
import { fetchEmployeesByIds } from "@/services/jobs/supabaseQueries";
import Loader from "@/components/ui/Loader";
// Goal: Import the new DateRangePickerField component
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import { CompactDateRangeSelector } from "@/components/ui/CompactDateRangeSelector";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];

const AvatarGroup = ({
  children,
  limit = 3,
  className = "",
  employees = [],
}: {
  children: React.ReactNode;
  limit?: number;
  className?: string;
  employees?: { id: string; first_name: string; last_name: string; profile_picture_url?: string }[];
}) => {
  const childrenArray = React.Children.toArray(children);
  const limitedChildren = childrenArray.slice(0, limit);
  const excess = childrenArray.length - limit;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {limitedChildren}
      {excess > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 border-2 border-white cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110">
              <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                +{excess}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {employees.map((employee) => {
              const fullName = `${employee.first_name} ${employee.last_name}`;
              return (
                <DropdownMenuItem key={employee.id} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={employee.profile_picture_url || ""} alt={fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
                      {employee.first_name[0]}
                      {employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{fullName}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};


const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(searchParams.get("limit") || "20", 10));
  const [selectedClient, setSelectedClient] = useState(searchParams.get("client") || "all");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");
  const [dateRange, setDateRange] = useState<DateRange | null>(
    searchParams.get("startDate") || searchParams.get("endDate") 
      ? {
          startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null,
          endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null,
        }
      : null
  );
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [clientselectedJob, setClientSelectedJob] = useState<JobData | null>(null);

  const user = useSelector((state: any) => state.auth.user);
  const userRole = useSelector((state: any) => state.auth.role);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  const isEmployee = userRole === "employee" && user?.id !== "0fa0aa1b-9cb3-482f-b679-5bd8fa355a6e";



  
  // ⛔ FIX: Prevent URL updates while modal is open — otherwise modal state resets
useEffect(() => {
  if (isCreateModalOpen) {
    console.log("%c[DEBUG] URL sync paused because modal is open", "color: purple; font-weight: bold;");
    return;
  }

  const params = new URLSearchParams();

  if (searchTerm) params.set("search", searchTerm);
  if (activeTab !== "all") params.set("tab", activeTab);
  if (currentPage !== 1) params.set("page", currentPage.toString());
  if (itemsPerPage !== 20) params.set("limit", itemsPerPage.toString());
  if (selectedClient !== "all") params.set("client", selectedClient);
  if (selectedStatus !== "all") params.set("status", selectedStatus);
  if (dateRange?.startDate) params.set("startDate", dateRange.startDate.toISOString());
  if (dateRange?.endDate) params.set("endDate", dateRange.endDate.toISOString());

  console.log("%c[DEBUG] URL sync running — modal CLOSED", "color: teal; font-weight: bold");
  setSearchParams(params, { replace: true });
}, [
  searchTerm,
  activeTab,
  currentPage,
  itemsPerPage,
  selectedClient,
  selectedStatus,
  dateRange,
  setSearchParams,
  isCreateModalOpen    // 👈 add this to dependency
]);

  const {
    data: jobs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["jobs", user?.id, userRole],
    queryFn: async () => {
  
      const data = isEmployee && user?.id ? await getJobsAssignedToUser(user.id) : await getAllJobs();
  
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const clientList = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const clientNames = jobs.map(job => job.clientOwner).filter(clientName => clientName && clientName !== "Internal HR");
    return Array.from(new Set(clientNames)).sort();
  }, [jobs]);

  useEffect(() => {
    if (error) {
      toast.error("Failed to fetch jobs");
    }
  }, [error]);

  const totalJobsCount = useMemo(() => jobs.length, [jobs]);
  const activeJobsCount = useMemo(() => jobs.filter(job => job.status === "Active" || job.status === "OPEN").length, [jobs]);
  const pendingJobsCount = useMemo(() => jobs.filter(job => job.status === "Pending" || job.status === "HOLD").length, [jobs]);
  const completedJobsCount = useMemo(() => jobs.filter(job => job.status === "Completed" || job.status === "CLOSE").length, [jobs]);

  const handleCardClick = (status: string) => {
    setSelectedStatus(status === 'all' ? "all" : status);
    setCurrentPage(1);
  };

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const matchesSearch =
      job.title.toLowerCase().includes(lowercasedSearchTerm) ||
      job.jobId.toLowerCase().includes(lowercasedSearchTerm) ||
      (job.hr_job_candidates && job.hr_job_candidates.some((candidate) => candidate.name.toLowerCase().includes(lowercasedSearchTerm)));

    const matchesDate = (() => {
      if (!dateRange || !dateRange.startDate || !dateRange.endDate) return true;
      const jobDate = moment(job.createdAt);
      const endDate = moment(dateRange.endDate).endOf('day');
      return jobDate.isBetween(dateRange.startDate, endDate, undefined, '[]');
    })();

    const matchesClient = selectedClient === "all" || job.clientOwner === selectedClient;
    
    const matchesStatus = (() => {
      if (selectedStatus === "all") return true;
      if (selectedStatus === "open") return job.status === "OPEN" || job.status === "Active";
      if (selectedStatus === "hold") return job.status === "HOLD" || job.status === "Pending";
      if (selectedStatus === "closed") return job.status === "CLOSE" || job.status === "Completed";
      return true;
    })();

    const matchesTab = (() => {
      if (ITECH_ORGANIZATION_ID.includes(organization_id) || activeTab === "all") return true;
      if (activeTab === "internal") return job.jobType === "Internal";
      if (activeTab === "external") return job.jobType === "External";
      return true;
    })();
    return matchesSearch && matchesDate && matchesClient && matchesTab && matchesStatus;
  }), [jobs, searchTerm, dateRange, selectedClient, activeTab, organization_id, selectedStatus]);
  
  // --- FIX: startIndex is defined here ---
  const startIndex = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  
  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredJobs, currentPage, itemsPerPage, startIndex]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const activeJobs = useMemo(() => filteredJobs.filter((job) => job.status === "Active" || job.status === "OPEN").length, [filteredJobs]);
  const pendingJobs = useMemo(() => filteredJobs.filter((job) => job.status === "Pending" || job.status === "HOLD").length, [filteredJobs]);
  const completedJobs = useMemo(() => filteredJobs.filter((job) => job.status === "Completed" || job.status === "CLOSE").length, [filteredJobs]);
  
  const handleAssignJob = (job: JobData) => {
    setSelectedJob(job);
    setIsAssignModalOpen(true);
  };

  const handleEditJob = (job: JobData) => {
    setEditJob(job);
    setIsCreateModalOpen(true);
  };

  const handleDeleteJob = (job: JobData) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    setStatusUpdateLoading(jobId);
    try {
      await updateJobStatus(jobId, newStatus);
      refetch();
      toast.success(`Job status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update job status.");
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    setActionLoading(true);
    try {
      await deleteJob(jobToDelete.id.toString());
      refetch();
      toast.success("Job deleted successfully");
      if (paginatedJobs.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      toast.error("Failed to delete job.");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const handleSaveJob = async (jobData: JobData) => {
    try {
      if (editJob) {
        await updateJob(editJob.id.toString(), jobData, user.id);
        toast.success("Job updated successfully");
      } else {
        await createJob(jobData, organization_id, user.id);
        toast.success("Job created successfully");
      }
      refetch();
      setIsCreateModalOpen(false);
      setEditJob(null);
    } catch (err) {
      toast.error(editJob ? "Failed to update job" : "Failed to create job");
    }
  };
  
  const openAssociateModal = (job: JobData) => {
    setClientSelectedJob(job);
    setAssociateModalOpen(true);
  };

  const handleAssociateToClient = async (updatedJob: JobData) => {
    try {
      await updateAssociate(updatedJob.id, updatedJob, user.id);
      refetch();
      toast.success("Job successfully associated with client");
    } catch (err) {
      toast.error("Failed to associate job with client");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN": case "Active": return "bg-green-100 text-green-800";
      case "HOLD": case "Pending": return "bg-yellow-100 text-yellow-800";
      case "CLOSE": case "Completed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

if (isLoading) {
    return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} className="border-[6px]" /></div>;
  }

  const AssignedToCell = ({ assignedTo }: { assignedTo: { id: string; name: string; type: string } | null }) => {
    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['assignedEmployees', assignedTo?.id],
        queryFn: () => {
            if (!assignedTo || assignedTo.type !== 'individual' || !assignedTo.id) {
                return Promise.resolve([]);
            }
            const ids = assignedTo.id.split(',');
            return fetchEmployeesByIds(ids).then(res => res.data || []);
        },
        enabled: !!assignedTo && assignedTo.type === 'individual' && !!assignedTo.id,
    });


    const colorClasses = [
      'from-green-500 to-teal-600',
      'from-blue-500 to-cyan-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-violet-500 to-fuchsia-500',
    ];

    if (isLoadingEmployees) return <span className="text-gray-400 text-sm">Loading...</span>;
    if (!employees || employees.length === 0) return <span className="text-gray-400 text-sm">Not assigned</span>;

    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
    const orderedEmployees = assignedTo!.id.split(',').map(id => employeeMap.get(id)).filter(Boolean) as NonNullable<typeof employees>;

    return (
        <AvatarGroup className="justify-start" limit={3} employees={orderedEmployees}>
 {orderedEmployees.map((employee, index) => {
                const fullName = `${employee.first_name} ${employee.last_name}`;
                  const colorClass = colorClasses[index % colorClasses.length];
                return (
                    <TooltipProvider key={employee.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-white cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110">
                                    <AvatarImage src={employee.profile_picture_url || ""} alt={fullName} />
                                     <AvatarFallback className={`bg-gradient-to-br ${colorClass} text-white font-semibold`}>
                                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                                 
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent><p>{fullName}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </AvatarGroup>
    );
  };
  
 const renderTable = (jobsToRender: JobData[]) => {
    if (jobsToRender.length === 0) {
      return <div className="text-center p-12 text-gray-500"><p>No jobs found.</p></div>;
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="sticky left-0 z-20 bg-gray-50 table-header-cell"><div className="flex items-center gap-1">Job Title<ArrowUpDown size={14} /></div></th>
                {!ITECH_ORGANIZATION_ID.includes(organization_id) && <th scope="col" className="table-header-cell">Client</th>}
                <th scope="col" className="table-header-cell">Created Date</th>
                <th scope="col" className="table-header-cell">No. of Candidates</th>
                <th scope="col" className="table-header-cell">Status</th>
                <th scope="col" className="table-header-cell">Posted By</th>
                {!ITECH_ORGANIZATION_ID.includes(organization_id) && <th scope="col" className="table-header-cell">Assigned To</th>}
                <th scope="col" className="table-header-cell text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobsToRender.map((job) => (
                // --- MODIFICATION: Added hover animation and styling to the table row ---
                <tr key={job.id} className="transition-all duration-200 ease-in-out hover:shadow-sm hover:-translate-y-px hover:bg-gray-50">
                  <td className="sticky left-0 z-20 bg-white table-cell">
                    <div className="flex flex-col">
                      <Link to={`/jobs/${job.id}`} className="font-medium text-black-600 hover:underline">{job.title}</Link>
                      <span className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">{job.jobId}</Badge>
                        <Badge variant="outline">{job.hiringMode}</Badge>
                        {!ITECH_ORGANIZATION_ID.includes(organization_id) && <Badge variant="outline" className={job.jobType === "Internal" ? "bg-amber-100 text-amber-800" : ""}>{job.jobType === "External" ? "Client Side" : job.jobType}</Badge>}
                      </span>
                    </div>
                  </td>
                  {!ITECH_ORGANIZATION_ID.includes(organization_id) && (
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-gray-800">{job.clientDetails?.clientName || "N/A"}</span>
                        <Badge variant="outline" className="w-fit mt-1">{job.clientDetails?.pointOfContact || "N/A"}</Badge>
                      </div>
                    </td>
                  )}
                  {/* --- MODIFICATION: Added Calendar Icon --- */}
                  <td className="table-cell">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{moment(job.createdAt).format("DD MMM YYYY")}</span>
                    </div>
                    <span className="text-gray-400 text-xs ml-6">({moment(job.createdAt).fromNow()})</span>
                  </td>

                  {/* --- MODIFICATION: Added Users Icon --- */}
                  <td className={`table-cell font-medium`}>
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className={`${(job.candidate_count?.[0]?.count || 0) === 0 ? "text-red-500" : ""}`}>
                            {job.candidate_count?.[0]?.count || 0}
                        </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    {isEmployee ? (
                      <Badge variant="outline" className={getStatusBadgeClass(job.status)}>{job.status === "Active" ? "OPEN" : job.status}</Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="transparent" className="h-8 px-2 py-0 hover:bg-gray-100">
                            {statusUpdateLoading === job.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Badge className={getStatusBadgeClass(job.status)}>{job.status === "Active" ? "OPEN" : job.status}</Badge>}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuItem className="text-green-600 focus:text-green-600" onClick={() => handleStatusChange(job.id, "OPEN")}>OPEN</DropdownMenuItem>
                          <DropdownMenuItem className="text-yellow-600 focus:text-yellow-600" onClick={() => handleStatusChange(job.id, "HOLD")}>HOLD</DropdownMenuItem>
                          <DropdownMenuItem className="text-blue-600 focus:text-blue-600" onClick={() => handleStatusChange(job.id, "CLOSE")}>CLOSE</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                  <td className="table-cell">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-8 w-8 cursor-pointer transition-transform duration-200 ease-in-out hover:scale-110">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                              {job.createdBy?.first_name?.[0]}{job.createdBy?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent><p>{job.createdBy?.first_name} {job.createdBy?.last_name}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  {!ITECH_ORGANIZATION_ID.includes(organization_id) && <td className="table-cell"><AssignedToCell assignedTo={job.assigned_to} /></td>}
                  <td className="table-cell">
                    <div className="flex justify-center">
                      <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild><Link to={`/jobs/${job.id}`}><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors"><Eye className="h-4 w-4" /></Button></Link></TooltipTrigger>
                            <TooltipContent><p>View Job</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {!isEmployee && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleEditJob(job)}><Edit className="h-4 w-4" /></Button></TooltipTrigger>
                                <TooltipContent><p>Edit Job</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {!ITECH_ORGANIZATION_ID.includes(organization_id) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => handleAssignJob(job)}><UserPlus className="h-4 w-4" /></Button></TooltipTrigger>
                                  <TooltipContent><p>Assign Job</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {!ITECH_ORGANIZATION_ID.includes(organization_id) && job.jobType === "Internal" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors" onClick={() => openAssociateModal(job)}><HousePlus className="h-4 w-4" /></Button></TooltipTrigger>
                                  <TooltipContent><p>Associate to Client</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-slate-500 hover:bg-red-600 hover:text-white transition-colors" onClick={() => handleDeleteJob(job)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger>
                                <TooltipContent><p>Delete Job</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // --- FIX: Pass the required variables into the function ---
  const renderPagination = (currentStartIndex: number, currentItemsPerPage: number, totalItems: number) => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={currentItemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">per page</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {/* FIX: Use the passed-in variables */}
      <span className="text-sm text-gray-600">
        Showing {currentStartIndex + 1} to {Math.min(currentStartIndex + currentItemsPerPage, totalItems)} of {totalItems} jobs
      </span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Job Dashboard</h1>
          <p className="text-gray-500">Manage and track all job postings</p>
        </div>
        {!isEmployee && <Button 
          onClick={() => {
    console.log("%c[DEBUG] Create button clicked → setting isCreateModalOpen = true", "color: green; font-weight: bold");
    setIsCreateModalOpen(true);
  }}
         className="flex items-center gap-2"><Plus size={16} /><span>Create New Job</span></Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card onClick={() => handleCardClick('all')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">Total Jobs</p><h3 className="text-3xl font-bold">{totalJobsCount}</h3></div><div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="text-blue-600" size={22} /></div></Card>
          <Card onClick={() => handleCardClick('open')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">Active Jobs</p><h3 className="text-3xl font-bold">{activeJobsCount}</h3></div><div className="p-2 bg-green-100 rounded-lg"><Calendar className="text-green-600" size={22} /></div></Card>
          <Card onClick={() => handleCardClick('hold')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">On Hold</p><h3 className="text-3xl font-bold">{pendingJobsCount}</h3></div><div className="p-2 bg-yellow-100 rounded-lg"><Clock className="text-yellow-600" size={22} /></div></Card>
          <Card onClick={() => handleCardClick('closed')} className="p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow"><div className="space-y-1"><p className="text-sm font-medium text-gray-500">Closed Jobs</p><h3 className="text-3xl font-bold">{completedJobsCount}</h3></div><div className="p-2 bg-purple-100 rounded-lg"><CheckCircle className="text-purple-600" size={22} /></div></Card>
      </div>

<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full">
  {/* Tabs Section */}
  {!isEmployee && !ITECH_ORGANIZATION_ID.includes(organization_id) && (
    <div className="flex-shrink-0 order-1">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
          <TabsTrigger
            value="all"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="internal"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            Internal
          </TabsTrigger>
          <TabsTrigger
            value="external"
            className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
          >
            External
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )}

  {/* Search Bar */}
  <div className="relative flex-grow order-2 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search
      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      size={18}
    />
    <Input
      placeholder="Search by Job Title, ID, or Candidate Name"
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
      }}
    />
  </div>

  {/* Date Range Picker */}
  {!isEmployee && (
    <div className="flex-shrink-0 order-5 w-full sm:w-auto">
      <EnhancedDateRangeSelector
        value={dateRange}
        onChange={setDateRange}
        onApply={() => setCurrentPage(1)}
       
      />
    </div>
  )}

  {/* Status Filter */}
  {!isEmployee && (
    <div className="flex-shrink-0 order-3 w-full sm:w-[150px]">
      <Select
        value={selectedStatus}
        onValueChange={(value) => {
          setSelectedStatus(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full rounded-full text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="hold">On Hold</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )}

  {/* Client Filter */}
  {!isEmployee && (
    <div className="flex-shrink-0 order-4 w-full sm:w-[150px]">
      <Select
        value={selectedClient}
        onValueChange={(value) => {
          setSelectedClient(value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-full rounded-full text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clientList.map((clientName) => (
            <SelectItem key={clientName} value={clientName}>
              {clientName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}
</div>



      {renderTable(paginatedJobs)}
      
      {/* --- FIX: Pass the variables when calling the function --- */}
      {filteredJobs.length > 0 && renderPagination(startIndex, itemsPerPage, filteredJobs.length)}

      <CreateJobModal isOpen={isCreateModalOpen} onClose={() => {
        console.log(
          "%c[DEBUG] <CreateJobModal> onClose fired → setting isCreateModalOpen = false",
          "color: red; font-weight: bold"
        );
        setIsCreateModalOpen(false);
        setEditJob(null);
      }} onSave={handleSaveJob} editJob={editJob} />
      <AssignJobModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} job={selectedJob} />
      {clientselectedJob && <AssociateToClientModal isOpen={associateModalOpen} onClose={() => setAssociateModalOpen(false)} job={clientselectedJob} onAssociate={handleAssociateToClient} />}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the job "{jobToDelete?.title}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteJob} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Jobs;