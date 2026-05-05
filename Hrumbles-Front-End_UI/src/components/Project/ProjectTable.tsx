// src/components/Project/ProjectTable.tsx
// Light mode — white cards, violet accent, compact design

"use client";

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Download, Pencil, Eye, Trash2, Search, Briefcase, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2, ArrowUpRight, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ProjectFinancialData } from "@/pages/clients/ProjectManagement";

interface ExtendedProjectData extends ProjectFinancialData { start_date: string; created_by_name: string; }
interface ProjectTableProps { projectFinancials: ExtendedProjectData[]; setAddProjectOpen: (open: boolean) => void; setEditingProject: (project: ExtendedProjectData | null) => void; isLoading: boolean; }

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ongoing:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  completed: { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{status}
    </span>
  );
};

const ProjectTable = ({ projectFinancials, setAddProjectOpen, setEditingProject, isLoading }: ProjectTableProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const sorted = useMemo(() => [...projectFinancials].sort((a, b) => b.revenue_inr - a.revenue_inr), [projectFinancials]);

  const filtered = useMemo(() => sorted.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchSearch = (p.name || '').toLowerCase().includes(search) || (p.hr_clients?.display_name || '').toLowerCase().includes(search);
    return matchSearch && (activeFilter === 'all' || p.status === activeFilter);
  }), [sorted, searchTerm, activeFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(p => ({
      'Project': p.name || 'N/A', 'Client': p.hr_clients?.display_name || 'N/A',
      'Start Date': p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A',
      'Revenue (INR)': p.revenue_inr.toLocaleString(), 'Status': p.status, 'Created By': p.created_by_name,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Projects"); XLSX.writeFile(wb, "projects.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Project Data", 14, 10);
    (doc as any).autoTable({
      head: [["Project", "Client", "Start Date", "Revenue (INR)", "Status", "Created By"]],
      body: filtered.map(p => [p.name || 'N/A', p.hr_clients?.display_name || 'N/A', p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A', p.revenue_inr.toLocaleString(), p.status, p.created_by_name]),
      startY: 20, headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save("projects.pdf");
  };

  const updateStatus = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const { error } = await supabase.from("hr_projects").update({ status: newStatus, updated_by: user.id }).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Status updated!"); },
    onError: () => toast.error("Failed to update status."),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("hr_projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project deleted!"); if (paginated.length === 1 && currentPage > 1) setCurrentPage(p => p - 1); },
    onError: () => toast.error("Failed to delete."),
  });

  const handleEdit = (p: ExtendedProjectData) => { setEditingProject(p); setAddProjectOpen(true); };
  const handleDelete = (p: ExtendedProjectData) => { if (window.confirm(`Delete "${p.name}"?`)) deleteProject.mutate(p.id); };

  const FILTERS = [
    { value: 'all', label: 'All', icon: null },
    { value: 'ongoing', label: 'Ongoing', icon: <Activity size={12} /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle size={12} /> },
    { value: 'cancelled', label: 'Cancelled', icon: <XCircle size={12} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => { setActiveFilter(f.value); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${activeFilter === f.value ? 'bg-white text-violet-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.icon}{f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search project or client…"
            value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-violet-300 transition-all">
            <Download size={12} />CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-violet-300 transition-all">
            <Download size={12} />PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-500" /></div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16"><Briefcase size={32} className="text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">No projects found</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Project / Client', 'Start Date', 'Revenue', 'Employees', 'Status', 'Created By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(p => (
                <tr key={p.id} className="hover:bg-violet-50/30 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link to={`/projects/${p.id}?client_id=${p.client_id}`} className="text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors">{p.name || 'N/A'}</Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">{p.hr_clients?.display_name || 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{p.start_date ? new Date(p.start_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-800">₹{p.revenue_inr.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-gray-400">${p.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                      <Briefcase size={10} className="text-violet-500" />{p.assigned_employees}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Select defaultValue={p.status} onValueChange={ns => updateStatus.mutate({ projectId: p.id, newStatus: ns })}>
                      <SelectTrigger className="h-7 w-auto px-2 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                        <StatusBadge status={p.status} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg">
                        <SelectItem value="ongoing" className="text-xs text-blue-700">Ongoing</SelectItem>
                        <SelectItem value="completed" className="text-xs text-green-700">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-xs text-red-600">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{p.created_by_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Link to={`/projects/${p.id}?client_id=${p.client_id}`}>
                            <button className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-all"><Eye size={13} /></button>
                          </Link>
                        </TooltipTrigger><TooltipContent className="text-xs">View</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all"><Pencil size={13} /></button>
                        </TooltipTrigger><TooltipContent className="text-xs">Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"><Trash2 size={13} /></button>
                        </TooltipTrigger><TooltipContent className="text-xs">Delete</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > itemsPerPage && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rows</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200">
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronLeft size={13} /></button>
            <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronRight size={13} /></button>
          </div>
          <span className="text-xs text-gray-400">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}</span>
        </div>
      )}
    </div>
  );
};

export default ProjectTable;