"use client";

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Download, Pencil, Eye, Trash2, Search, Briefcase, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ProjectFinancialData } from "@/pages/clients/ProjectManagement"; // Import the shared interface

// This interface now expects the new fields from the parent component
interface ExtendedProjectData extends ProjectFinancialData {
    start_date: string;
    created_by_name: string;
}

interface ProjectTableProps {
  projectFinancials: ExtendedProjectData[];
  setAddProjectOpen: (open: boolean) => void;
  setEditingProject: (project: ExtendedProjectData | null) => void;
  isLoading: boolean;
}

const ProjectTable = ({ projectFinancials, setAddProjectOpen, setEditingProject, isLoading }: ProjectTableProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort projects by revenue_inr (descending)
  const sortedProjects = useMemo(() => {
    return [...projectFinancials].sort((a, b) => b.revenue_inr - a.revenue_inr);
  }, [projectFinancials]);

  // Filter Projects Based on Search & Status
  const filteredProjects = useMemo(() => {
    return sortedProjects.filter((project) => {
      const name = project.name || "";
      const clientName = project.hr_clients?.display_name || "";
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = name.toLowerCase().includes(searchLower) || clientName.toLowerCase().includes(searchLower);

      if (activeTab === "all") return matchesSearch;
      return matchesSearch && project.status === activeTab;
    });
  }, [sortedProjects, searchTerm, activeTab]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV (PROFIT REMOVED)
  const exportToCSV = () => {
    const exportData = filteredProjects.map((project) => ({
      "Project Name": project.name || "N/A",
      "Client": project.hr_clients?.display_name || "N/A",
      "Start Date": project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A',
      "Revenue (INR)": project.revenue_inr.toLocaleString(),
      "Status": project.status,
      "Created By": project.created_by_name,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "projects_data.xlsx");
  };

  // Export to PDF (PROFIT REMOVED)
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Project Data", 14, 10);
    (doc as any).autoTable({
      head: [["Project Name", "Client", "Start Date", "Revenue (INR)", "Status", "Created By"]],
      body: filteredProjects.map((project) => [
        project.name || "N/A",
        project.hr_clients?.display_name || "N/A",
        project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A',
        project.revenue_inr.toLocaleString(),
        project.status,
        project.created_by_name,
      ]),
      startY: 20,
    });
    doc.save("projects_data.pdf");
  };

  // Mutation for updating project status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_projects")
        .update({ status: newStatus, updated_by: user.id })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update project status.");
    },
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("hr_projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully!");
      if (paginatedProjects.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    },
    onError: () => {
      toast.error("Failed to delete project.");
    },
  });

  const handleEditProject = (project: ExtendedProjectData) => {
    setEditingProject(project);
    setAddProjectOpen(true);
  };

  const handleDeleteProject = (project: ExtendedProjectData) => {
    if (window.confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
      deleteProjectMutation.mutate(project.id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ongoing": return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "completed": return "bg-green-100 text-green-800 hover:bg-green-200";
      case "cancelled": return "bg-red-100 text-red-800 hover:bg-red-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const renderTable = (projects: ExtendedProjectData[]) => {
    if (isLoading) {
      return (<div className="text-center p-12 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" /><p>Loading projects...</p></div>);
    }
    if (projects.length === 0) {
      return (<div className="text-center p-12 text-gray-500"><p>No projects found for this filter.</p></div>);
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Project Name / Client</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Start Date</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Revenue</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created By</th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <Link to={`/project/${project.id}?client_id=${project.client_id}`} className="font-medium text-blue-600 hover:underline">
                        {project.name || "N/A"}
                      </Link>
                      <span className="text-xs text-gray-500">{project.hr_clients?.display_name || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}
                  </td>
                  
                  <td className="px-4 py-2">
                    ₹ {project.revenue_inr.toLocaleString()}<br />
                    <span className="text-xs text-gray-500">$ {project.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Select defaultValue={project.status} onValueChange={(newStatus) => updateStatusMutation.mutate({ projectId: project.id, newStatus })}>
                      <SelectTrigger className={`h-8 px-2 py-0 text-xs w-[120px] rounded-full border-none ${getStatusBadgeClass(project.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing" className="text-blue-600">Ongoing</SelectItem>
                        <SelectItem value="completed" className="text-green-600">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-red-600">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {project.created_by_name}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-1">
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Link to={`/project/${project.id}?client_id=${project.client_id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </TooltipTrigger><TooltipContent><p>View Dashboard</p></TooltipContent></Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProject(project)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent><p>Edit Project</p></TooltipContent></Tooltip></TooltipProvider>
                      <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProject(project)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent><p>Delete Project</p></TooltipContent></Tooltip></TooltipProvider>
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

  // FULL IMPLEMENTATION of renderPagination
  const renderPagination = () => {
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[70px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
     <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  <div className="flex-shrink-0 order-1">
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
        <TabsTrigger
          value="all"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          All
        </TabsTrigger>
        <TabsTrigger
          value="ongoing"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <Briefcase size={14} />
          <span>Ongoing</span>
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <CheckCircle size={14} />
          <span>Completed</span>
        </TabsTrigger>
        <TabsTrigger
          value="cancelled"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <XCircle size={14} />
          <span>Cancelled</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
  <div className="relative flex-grow order-2 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input 
      placeholder="Search project or client..." 
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm" 
      value={searchTerm} 
      onChange={(e) => setSearchTerm(e.target.value)} 
    />
  </div>
  <div className="flex gap-2 flex-shrink-0 order-3">
    <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
    <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
      <Download className="w-4 h-4 mr-2" />
      Export PDF
    </Button>
  </div>
</div>

      {renderTable(paginatedProjects)}

      {/* Conditionally render pagination only if there are projects to display */}
      {filteredProjects.length > 0 && renderPagination()}
    </div>
  );
};

export default ProjectTable;