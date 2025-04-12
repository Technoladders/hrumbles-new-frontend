import React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  HousePlus
} from "lucide-react";
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/jobs/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/jobs/ui/tooltip";
import { AssignJobModal } from "@/components/jobs/job/AssignJobModal";
import { toast } from "sonner";
import { JobData } from "@/lib/types";
import { 
  getAllJobs,
  getJobsByType,
  createJob,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobsAssignedToUser
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
import moment from 'moment';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/jobs/ui/avatar"; // Assuming you have an Avatar component
import { fetchEmployeesByIds } from "@/services/jobs/supabaseQueries";
import Loader from "@/components/ui/Loader";

// Adding this AvatarGroup component since it's not included in shadcn by default

const AvatarGroup = ({ 
  children, 
  limit = 3, 
  className = "",
  employees = [], // Add employees prop to pass full list
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
            <Avatar className="h-6 w-6 border-2 border-white cursor-pointer">
              <AvatarFallback className="bg-gray-200 text-gray-700 text-[8px] font-medium">
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
                    <AvatarFallback>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<JobData | null>(null);
  const [mockJobs, setMockJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  // const itemsPerPage = 5;
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [associateModalOpen, setAssociateModalOpen] = useState(false);
  const [clientselectedJob, setClientSelectedJob] = useState<JobData | null>(null);
  
  const user = useSelector((state: any) => state.auth.user);
  const userRole = useSelector((state: any) => state.auth.role);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const isEmployee = userRole === 'employee';

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        let jobs: JobData[];
        
        if (activeTab === "all") {
          jobs = await getAllJobs();
        } else {
          jobs = await getJobsByType(activeTab === "staffing" ? "Staffing" : "Augment Staffing");
        }
        
        setMockJobs(jobs);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to load jobs:", error);
        toast.error("Failed to load jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [activeTab]);

  const { 
    data: jobs = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['jobs', user?.id, userRole],
    queryFn: async () => {
      if (isEmployee && user?.id) {
        return getJobsAssignedToUser(user.id);
      }
      return getAllJobs();
    },
  });
  
  useEffect(() => {
    if (error) {
      toast.error("Failed to fetch jobs");
      console.error("Error fetching jobs:", error);
    }
  }, [error]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "internal") return matchesSearch && job.jobType === "Internal";
    if (activeTab === "external") return matchesSearch && job.jobType === "External";
    
    return matchesSearch;
  });

  // const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  // const startIndex = (currentPage - 1) * itemsPerPage;
  // const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  const activeJobs = filteredJobs.filter(job => job.status === "Active" || job.status === "OPEN").length;
  const pendingJobs = filteredJobs.filter(job => job.status === "Pending" || job.status === "HOLD").length;
  const completedJobs = filteredJobs.filter(job => job.status === "Completed" || job.status === "CLOSE").length;

  // Inside the Jobs component, add this new state
const [itemsPerPage, setItemsPerPage] = useState(10);

// Update the pagination logic (replace existing)
const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

// Add this new function to handle items per page change
const handleItemsPerPageChange = (value: string) => {
  setItemsPerPage(Number(value));
  setCurrentPage(1); // Reset to first page when changing items per page
};

  const daysSinceCreated = (createdDate: string) => {
    return moment(createdDate).fromNow();
  };

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
    try {
      setStatusUpdateLoading(jobId);
      await updateJobStatus(jobId, newStatus);
      
      await refetch();
      toast.success(`Job status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating job status:", error);
      toast.error("Failed to update job status. Please try again.");
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    
    try {
      setActionLoading(true);
      await deleteJob(jobToDelete.id.toString());
      
      await refetch();
      toast.success("Job deleted successfully");
      
      if (paginatedJobs.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job. Please try again.");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditJob(null);
  };

  const handleCreateNewJob = async (newJob: JobData) => {
    try {
      if (editJob) {
        await updateJob(editJob.id.toString(), newJob, user.id);
        toast.success("Job updated successfully");
      } else {
        await createJob(newJob, organization_id, user.id);
        toast.success("Job created successfully");
      }
      await refetch();
      setIsCreateModalOpen(false);
      setEditJob(null);
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error(editJob ? "Failed to update job" : "Failed to create job");
    }
  };
  
  const openAssociateModal = (job: JobData) => {
    setClientSelectedJob(job);
    setAssociateModalOpen(true);
  };
  
  const handleAssociateToClient = async (updatedJob: JobData) => {
    try {
      await updateJob(updatedJob.id, updatedJob, user.id);
      await refetch();
      toast.success("Job successfully associated with client");
    } catch (error) {
      console.error("Error associating job with client:", error);
      toast.error("Failed to associate job with client");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "OPEN":
      case "Active":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "HOLD":
      case "Pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "CLOSE":
      case "Completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }



// Add this function inside the Jobs component, before the renderTable function

const renderAssignedToCell = async (assignedTo: { id: string; name: string; type: string } | null) => {


  if (!assignedTo || assignedTo.type !== "individual") {

    return <span className="text-gray-400 text-sm">Not assigned</span>;
  }

  const ids = assignedTo.id.split(",");
  const names = assignedTo.name.split(",");


  try {
    const { data: employees } = await fetchEmployeesByIds(ids);


    if (!employees || employees.length === 0) {

      return <span className="text-gray-400 text-sm">Not assigned</span>;
    }

    const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
    const orderedEmployees = ids
      .map(id => employeeMap.get(id))
      .filter(emp => emp !== undefined);

    return (
      <AvatarGroup className="justify-start" limit={3} employees={orderedEmployees}>
        {orderedEmployees.map((employee) => {
          const fullName = `${employee.first_name} ${employee.last_name}`;
          return (
            <TooltipProvider key={employee.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 border-2 border-white">
                    <AvatarImage src={employee.profile_picture_url || ""} alt={fullName} />
                    <AvatarFallback>
                      {employee.first_name[0]}
                      {employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{fullName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </AvatarGroup>
    );
  } catch (error) {
    console.error("renderAssignedToCell - Error fetching assigned employees:", error);
    return <span className="text-red-500 text-sm">Error loading assignees</span>;
  }
};
const AssignedToCell = ({ assignedTo }: { assignedTo: { id: string; name: string; type: string } | null }) => {
  const [content, setContent] = useState<JSX.Element | null>(null);

  useEffect(() => {
    
    const loadContent = async () => {
      const renderedContent = await renderAssignedToCell(assignedTo);
      
      setContent(renderedContent);
    };
    loadContent();
  }, [assignedTo]);

  return content || <span className="text-gray-400 text-sm">Loading...</span>;
};



  const renderTable = (jobs: JobData[]) => {
    if (jobs.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No jobs found.</p>
        </div>
      );
    }
    console.log("jobs", jobs)

  
    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="table-header-cell">
                  <div className="flex items-center gap-1">
                    Job Title
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th scope="col" className="table-header-cell">Client</th>
                <th scope="col" className="table-header-cell">Posted By</th>
                <th scope="col" className="table-header-cell">Created Date</th>
                {/* <th scope="col" className="table-header-cell">Submission</th> */}
                <th scope="col" className="table-header-cell">No. of Candidates</th>
                <th scope="col" className="table-header-cell">Status</th>
                <th scope="col" className="table-header-cell">Assigned To</th>
                <th scope="col" className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                
                <tr key={job.id} className="hover:bg-gray-50 transition">
                  <td className="table-cell">
                    <div className="flex flex-col">
                    <Link to={`/jobs/${job.id}`} className="font-medium text-black-600 hover:underline">
      {job.title}
    </Link>
    <span className="text-xs text-gray-500 flex space-x-2">
  <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px] ">
    {job.jobId}
  </Badge>
  <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]">
    {job.hiringMode}
  </Badge>
  <Badge
      variant="outline"
      className={`rounded-full text-[10px] ${
        job.jobType === 'Internal'
          ? 'bg-amber-100 text-amber-800 hover:bg-blue-200'
          : job.jobType === 'External'
          ? 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
          : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
      }`}
    >
      {job.jobType === 'External' ? 'Client Side' : job.jobType}
    </Badge>
</span>
                    </div>
                  </td>
                  <td className="table-cell">
  <div className="flex flex-col">
    <span className=" text-gray-800">{job.clientOwner}</span>
    <div className="flex items-center">
      <Badge 
        variant="outline" 
        className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-xs inline-flex items-center"
      >
        {job.clientDetails?.pointOfContact || 'N/A'} {/* Display 'N/A' if pointOfContact is not available */}
      </Badge>
    </div>
  </div>
</td>
<td className="table-cell">{job.createdBy?.first_name} {job.createdBy?.last_name}</td>
                  <td className="table-cell">{job.postedDate} ({daysSinceCreated(job.postedDate)})</td>
                  {/* <td className="table-cell">
                    <Badge
                      variant="outline"
                      className={`
                        ${job.submissionType === "Internal" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : ""}
                        ${job.submissionType === "Client" ? "bg-purple-100 text-purple-800 hover:bg-purple-100" : ""}
                      `}
                    >
                      {job.submissionType}
                    </Badge>
                  </td> */}
                <td
  className={`table-cell text-center ${
    (Array.isArray(job.candidate_count)
      ? job.candidate_count[0]?.count
      : job.candidate_count?.count) === 0
      ? "text-red-500"
      : ""
  }`}
>
  {Array.isArray(job.candidate_count)
    ? job.candidate_count[0]?.count || 0
    : job.candidate_count?.count || 0}
</td>

                  <td className="table-cell">
                    {isEmployee ? (
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClass(job.status)}
                      >
                        {job.status}
                      </Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="transparent" className="h-8 px-2 py-0">
                            {statusUpdateLoading === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Badge
                                variant="outline"
                                className={getStatusBadgeClass(job.status)}
                              >
                                {job.status}
                              </Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuItem 
                            className="text-green-600 focus:text-green-600 focus:bg-green-50"
                            onClick={() => handleStatusChange(job.id, "OPEN")}
                          >
                            OPEN
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                            onClick={() => handleStatusChange(job.id, "HOLD")}
                          >
                            HOLD
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                            onClick={() => handleStatusChange(job.id, "CLOSE")}
                          >
                            CLOSE
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                  <td className="table-cell w-auto min-w-[120px] max-w-[200px]">
  <AssignedToCell assignedTo={job.assigned_to} />
</td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link to={`/jobs/${job.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Job</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {!isEmployee && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleEditJob(job)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Job</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleAssignJob(job)}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Assign Job</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {job.jobType === "Internal" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => openAssociateModal(job)}
                                  >
                                    <HousePlus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Associate to Client</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteJob(job)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Job</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
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

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
          </div>
  
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
  
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Job Dashboard</h1>
          <p className="text-gray-500">Manage and track all job postings</p>
        </div>
        
        {!isEmployee && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Create New Job</span>
          </Button>
        )}
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Jobs</p>
              <h3 className="text-3xl font-bold">{filteredJobs.length}</h3>
              <p className="text-xs text-gray-500 mt-1">All departments</p>
            </div>
            <div className="stat-icon stat-icon-blue">
              <Briefcase size={22} />
            </div>
          </div>
        </Card>
  
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Jobs</p>
              <h3 className="text-3xl font-bold">{activeJobs}</h3>
              <p className="text-xs text-gray-500 mt-1">{Math.round((activeJobs / filteredJobs.length) * 100) || 0}% of total</p>
            </div>
            <div className="stat-icon stat-icon-green">
              <Calendar size={22} />
            </div>
          </div>
        </Card>
  
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Pending Jobs</p>
              <h3 className="text-3xl font-bold">{pendingJobs}</h3>
              <p className="text-xs text-gray-500 mt-1">{Math.round((pendingJobs / filteredJobs.length) * 100) || 0}% of total</p>
            </div>
            <div className="stat-icon stat-icon-yellow">
              <Clock size={22} />
            </div>
          </div>
        </Card>
  
        <Card className="stat-card animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Completed Jobs</p>
              <h3 className="text-3xl font-bold">{completedJobs}</h3>
              <p className="text-xs text-gray-500 mt-1">{Math.round((completedJobs / filteredJobs.length) * 100) || 0}% of total</p>
            </div>
            <div className="stat-icon stat-icon-purple">
              <CheckCircle size={22} />
            </div>
          </div>
        </Card>
      </div>
  
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {!isEmployee && (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full sm:w-80">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="internal" className="flex items-center gap-1">
                <Briefcase size={14} />
                <span>Internal</span>
              </TabsTrigger>
              <TabsTrigger value="external" className="flex items-center gap-1">
                <Users size={14} />
                <span>External</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search for jobs..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {!isEmployee && (
          <Dialog>
            <DialogTrigger asChild>
              {/* <Button variant="outline" className="flex items-center gap-2">
                <Filter size={16} />
                <span>Filters</span>
              </Button> */}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Filter Jobs</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Filter options remain unchanged */}
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({})}
                >
                  Reset Filters
                </Button>
                <Button type="submit">Apply Filters</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isEmployee ? (
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="all" className="space-y-6">
          {renderTable(paginatedJobs)}
          {filteredJobs.length > 0 && renderPagination()}
        </TabsContent>
    
        <TabsContent value="internal" className="space-y-6">
          {renderTable(paginatedJobs.filter(job => job.jobType === "Internal"))}
          {filteredJobs.length > 0 && renderPagination()}
        </TabsContent>
    
        <TabsContent value="external" className="space-y-6">
          {renderTable(paginatedJobs.filter(job => job.jobType === "External"))}
          {filteredJobs.length > 0 && renderPagination()}
        </TabsContent>
      </Tabs>
    ) : (
      <div className="space-y-6">
        {renderTable(paginatedJobs)}
        {filteredJobs.length > 0 && renderPagination()}
      </div>
    )}
  
      <CreateJobModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditJob(null);
        }}
        onSave={handleCreateNewJob}
        editJob={editJob}
      />
      
      <AssignJobModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        job={selectedJob}
      />

      {clientselectedJob && (
        <AssociateToClientModal
          isOpen={associateModalOpen}
          onClose={() => setAssociateModalOpen(false)}
          job={clientselectedJob}
          onAssociate={handleAssociateToClient}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job "{jobToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteJob}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Jobs;