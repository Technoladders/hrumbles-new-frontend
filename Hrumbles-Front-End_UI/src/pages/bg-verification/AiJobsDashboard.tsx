// src/pages/jobs/AiJobsDashboard.tsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import moment from 'moment';

// UI Components (reused from your shared component library)
import { Button } from "@/components/jobs/ui/button";
import { Input } from "@/components/jobs/ui/input";
import { Badge } from "@/components/jobs/ui/badge";
import { Card } from "@/components/jobs/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/jobs/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/jobs/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/jobs/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/jobs/ui/select";
import Loader from "@/components/ui/Loader";

// Icons
import { Briefcase, Calendar, CheckCircle, Clock, Plus, Search, Users, Eye, Edit, UserPlus, Trash2, Loader2, HousePlus, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

// Services and Types
import { getAllJobs, deleteJob, updateJobStatus, updateJob } from "@/services/jobService";
import { JobData } from "@/lib/types";
import { JobFormData } from "@/components/jobs/ai/hooks/useAiJobFormState";

// New AI Workflow Modals
import { CreateJobChoiceModal } from "@/components/jobs/ai/CreateJobChoiceModal";
import { AiCreateJobModal } from "@/components/jobs/ai/AiCreateJobModal";

// Reusable Sub-components from the original flow that are still needed
import { AssignJobModal } from "@/components/jobs/job/AssignJobModal";
import AssociateToClientModal from "@/components/jobs/job/AssociateToClientModal";


const AiJobsDashboard = () => {
    // State for the main UI
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // State for Modals
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [associateModalOpen, setAssociateModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // State for data and actions
    const [initialAiData, setInitialAiData] = useState<Partial<JobFormData> | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
    const [jobToDelete, setJobToDelete] = useState<JobData | null>(null);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Redux State
    const user = useSelector((state: any) => state.auth.user);
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    // Data Fetching with React Query
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

    // --- Core Logic ---

    const handleModeSelected = (mode: 'ai' | 'manual', data?: Partial<JobFormData>) => {
        setIsChoiceModalOpen(false);
        setInitialAiData(mode === 'ai' ? data : null);
        setIsCreateModalOpen(true);
    };

    const handleSaveJob = async (newJob: JobData) => {
        try {
            await createJob(newJob, organization_id, user.id);
            toast.success("Job created successfully!");
            setIsCreateModalOpen(false);
            refetch(); // Refetch the job list
        } catch (error) {
            toast.error("Failed to create job.");
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
            toast.error("Failed to delete job.");
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
            toast.error("Failed to update job status.");
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    // --- Filtering and Pagination ---

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.jobId.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeTab === "all") return matchesSearch;
        return matchesSearch && job.jobType === (activeTab === "internal" ? "Internal" : "External");
    });
    
    const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

    // --- UI Rendering ---

    if (isLoading) {
        return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} /></div>;
    }

    // Helper to get badge color based on status
    const getStatusBadgeClass = (status: string) => {
        switch (status.toUpperCase()) {
            case "OPEN": return "bg-green-100 text-green-800";
            case "HOLD": return "bg-yellow-100 text-yellow-800";
            case "CLOSE": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-8 p-4 md:p-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Job Dashboard</h1>
                    <p className="text-gray-500">Manage and track all job postings for your organization.</p>
                </div>
                <Button onClick={() => setIsChoiceModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    Create New Job
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-4"><p>Total Jobs: {filteredJobs.length}</p></Card>
                <Card className="p-4"><p>Active Jobs: {filteredJobs.filter(j => j.status === 'OPEN').length}</p></Card>
                <Card className="p-4"><p>On Hold: {filteredJobs.filter(j => j.status === 'HOLD').length}</p></Card>
                <Card className="p-4"><p>Closed: {filteredJobs.filter(j => j.status === 'CLOSE').length}</p></Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="internal">Internal</TabsTrigger>
                        <TabsTrigger value="external">External</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative flex-grow w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input placeholder="Search for jobs..." className="pl-10 h-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Job Table */}
            <div className="bg-white rounded-xl overflow-hidden border shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="table-header-cell">Job Title</th>
                                <th className="table-header-cell">Status</th>
                                <th className="table-header-cell">Candidates</th>
                                <th className="table-header-cell">Created Date</th>
                                <th className="table-header-cell">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {paginatedJobs.length > 0 ? paginatedJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50">
                                    <td className="table-cell">
                                        <Link to={`/jobs/${job.id}`} className="font-medium text-purple-600 hover:underline">{job.title}</Link>
                                        <div className="text-xs text-gray-500">{job.jobId} | {job.jobType}</div>
                                    </td>
                                    <td className="table-cell">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="transparent" className="h-8 px-2 py-0">
                                                    {statusUpdateLoading === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Badge className={getStatusBadgeClass(job.status)}>{job.status}</Badge>}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "OPEN")}>OPEN</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "HOLD")}>HOLD</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "CLOSE")}>CLOSE</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                    <td className="table-cell text-center">
                                        {Array.isArray(job.candidate_count) ? job.candidate_count[0]?.count || 0 : job.candidate_count?.count || 0}
                                    </td>
                                    <td className="table-cell">{moment(job.createdAt).format("DD MMM YYYY")}</td>
                                    <td className="table-cell">
                                        <div className="flex space-x-1">
                                            <Button asChild variant="ghost" size="icon"><Link to={`/jobs/${job.id}`}><Eye className="h-4 w-4" /></Link></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedJob(job); setIsAssignModalOpen(true); }}><UserPlus className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => { setJobToDelete(job); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="text-center p-12 text-gray-500">No jobs found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
                 <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /> Prev</Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next <ChevronRight size={16} /></Button>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}
            <CreateJobChoiceModal isOpen={isChoiceModalOpen} onClose={() => setIsChoiceModalOpen(false)} onModeSelect={handleModeSelected} />
            <AiCreateJobModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleSaveJob} initialAiData={initialAiData} />
            <AssignJobModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} job={selectedJob} />
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the job "{jobToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteJob} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
                            {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AiJobsDashboard;