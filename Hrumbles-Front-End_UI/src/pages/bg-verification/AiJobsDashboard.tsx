import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import moment from 'moment';

// UI Components
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { Badge } from "@/components/jobs/ui/badge";
import { Card } from "@/components/jobs/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/jobs/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/jobs/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/jobs/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/jobs/ui/select";
import Loader from "@/components/ui/Loader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";

// Icons
import { Briefcase, Calendar, CheckCircle, Clock, Plus, Search, Users, Eye, Edit, UserPlus, Trash2, Loader2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

// Services and Types
import { getAllJobs, deleteJob, updateJobStatus, updateJob, createJob } from "@/services/jobService";

import { JobData } from "@/lib/types";
import { JobFormData } from "@/components/jobs/ai/hooks/useAiJobFormState";

// Modals
import { CreateJobChoiceModal } from "@/components/jobs/ai/CreateJobChoiceModal";
import { AiCreateJobModal } from "@/components/jobs/ai/AiCreateJobModal";
import { AssignJobModal } from "@/components/jobs/job/AssignJobModal";
import AssociateToClientModal from "@/components/jobs/job/AssociateToClientModal";

const AiJobsDashboard = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [associateModalOpen, setAssociateModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [initialAiData, setInitialAiData] = useState<Partial<JobFormData> | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
    const [jobToDelete, setJobToDelete] = useState<JobData | null>(null);
    const [editJob, setEditJob] = useState<JobData | null>(null);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    const user = useSelector((state: any) => state.auth.user);
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    const { data: jobs = [], isLoading, error, refetch } = useQuery({
        queryKey: ['jobs', organization_id],
        queryFn: getAllJobs,
    });

    useEffect(() => {
        if (error) {
            toast.error("Failed to fetch jobs");
            console.error("Error fetching jobs:", error);
        }
    }, [error]);

    const handleModeSelected = (mode: 'ai' | 'manual', data?: Partial<JobFormData>) => {
        setIsChoiceModalOpen(false);
        setInitialAiData(mode === 'ai' ? data : null);
        setIsCreateModalOpen(true);
    };

    const handleSaveJob = async (newJob: JobData) => {
        try {
            if (editJob) {
                await updateJob(editJob.id.toString(), newJob, user.id);
                toast.success("Job updated successfully");
            } else {
                await createJob(newJob, organization_id, user.id);
                toast.success("Job created successfully");
            }
            setIsCreateModalOpen(false);
            setEditJob(null);
            refetch();
        } catch (error) {
            toast.error(editJob ? "Failed to update job" : "Failed to create job");
            console.error("Error saving job:", error);
        }
    };
    
    const confirmDeleteJob = async () => {
        if (!jobToDelete) return;
        setActionLoading(true);
        try {
            await deleteJob(jobToDelete.id.toString());
            toast.success("Job deleted successfully");
            refetch();
        } catch (err) {
            toast.error("Failed to delete job");
        } finally {
            setActionLoading(false);
            setDeleteDialogOpen(false);
            setJobToDelete(null);
        }
    };

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        setStatusUpdateLoading(jobId);
        try {
            await updateJobStatus(jobId, newStatus);
            toast.success(`Job status updated to ${newStatus}`);
            refetch();
        } catch (error) {
            toast.error("Failed to update job status");
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    const handleEditJob = (job: JobData) => {
        setEditJob(job);
        setIsCreateModalOpen(true);
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeTab === "all") return matchesSearch;
        return matchesSearch && job.jobType === (activeTab === "internal" ? "Internal" : "External");
    });
    
    const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    console.log("paginatedJobs", paginatedJobs)


    const activeJobs = filteredJobs.filter(j => j.status === "OPEN").length;
    const pendingJobs = filteredJobs.filter(j => j.status === "HOLD").length;
    const completedJobs = filteredJobs.filter(j => j.status === "CLOSE").length;

    const getStatusBadgeClass = (status: string) => {
        switch (status.toUpperCase()) {
            case "OPEN": return "bg-green-100 text-green-800 hover:bg-green-100";
            case "HOLD": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
            case "CLOSE": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
            default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} className="border-[6px]" /></div>;
    }

    const renderTable = () => {
        if (paginatedJobs.length === 0) {
            return (
                <div className="text-center p-12 text-gray-500">
                    <p>No jobs found.</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="table-header-cell">
                                    <div className="flex items-center gap-1">Job Title <ArrowUpDown size={14} /></div>
                                </th>
                                <th scope="col" className="table-header-cell">Created By</th>

                                <th scope="col" className="table-header-cell">Candidates</th>
                                <th scope="col" className="table-header-cell">Created Date</th>
                                <th scope="col" className="table-header-cell">Status</th>

                                <th scope="col" className="table-header-cell">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50 transition">
                                    <td className="table-cell">
                                        <div className="flex flex-col">
                                            <Link to={`/jobs/${job.id}`} className="font-medium text-black-600 hover:underline">
                                                {job.title}
                                            </Link>
                                            <span className="text-xs text-gray-500 flex space-x-2">
                                                <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]">
                                                    {job.jobId}
                                                </Badge>
                                                {/* <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]">
                                                    {job.jobType}
                                                </Badge> */}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                                        {job.createdBy?.first_name} {job.createdBy?.last_name}
                                                      </td>
                                                      
                                   
                                    <td className="table-cell">
                                        {Array.isArray(job.candidate_count) ? job.candidate_count[0]?.count || 0 : job.candidate_count?.count || 0}
                                    </td>
                                    <td className="table-cell">
                                        {moment(job.createdAt).format("DD MMM YYYY")} ({moment(job.createdAt).fromNow()})
                                    </td>
                                     <td className="table-cell">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="transparent" className="h-8 px-2 py-0">
                                                    {statusUpdateLoading === job.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                                    ) : (
                                                        <Badge variant="outline" className={getStatusBadgeClass(job.status)}>
                                                            {job.status}
                                                        </Badge>
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="center">
                                                <DropdownMenuItem className="text-green-600 focus:text-green-600 focus:bg-green-50" onClick={() => handleStatusChange(job.id, "OPEN")}>
                                                    OPEN
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50" onClick={() => handleStatusChange(job.id, "HOLD")}>
                                                    HOLD
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-blue-600 focus:text-blue-600 focus:bg-blue-50" onClick={() => handleStatusChange(job.id, "CLOSE")}>
                                                    CLOSE
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
                                                    <TooltipContent><p>View Job</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditJob(job)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Edit Job</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedJob(job); setIsAssignModalOpen(true); }}>
                                                            <UserPlus className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Assign Job</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setJobToDelete(job); setDeleteDialogOpen(true); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Delete Job</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
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
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                            .map((page) => (
                                <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)}>
                                    {page}
                                </Button>
                            ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <span className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
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
                <Button onClick={() => setIsChoiceModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    <span>Create New Job</span>
                </Button>
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
                {/* <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
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
                </Tabs> */}
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input placeholder="Search for jobs..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="space-y-6">
                {renderTable()}
                {filteredJobs.length > 0 && renderPagination()}
            </div>

            <CreateJobChoiceModal isOpen={isChoiceModalOpen} onClose={() => setIsChoiceModalOpen(false)} onModeSelect={handleModeSelected} />
            <AiCreateJobModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditJob(null); }} onSave={handleSaveJob} initialAiData={initialAiData} editJob={editJob} />
            <AssignJobModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} job={selectedJob} />
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the job "{jobToDelete?.title}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteJob} disabled={actionLoading} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                            {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AiJobsDashboard;