
"use client";

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Download, Pencil, Eye, Trash2, Search, Briefcase, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface ClientData {
  id: string;
  display_name?: string;
  internal_contact?: string;
  service_type: string[];
  status: string;
  currency: string;
  total_projects: number;
  revenue_inr: number;
  revenue_usd: number;
  profit_inr: number;
  profit_usd: number;
}

interface ClientTableProps {
  clientFinancials: ClientData[];
  setAddClientOpen: (open: boolean) => void;
  isLoading: boolean;
}

const ClientTable = ({ clientFinancials, setAddClientOpen, isLoading }: ClientTableProps) => {
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const userRole = useSelector((state: any) => state.auth.role);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const isEmployee = userRole === "employee";
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort clients by revenue_inr (descending), with profit_inr as tiebreaker
  const sortedClients = useMemo(() => {
    return [...clientFinancials].sort((a, b) => {
      if (b.revenue_inr !== a.revenue_inr) {
        return b.revenue_inr - a.revenue_inr;
      }
      return b.profit_inr - a.profit_inr;
    });
  }, [clientFinancials]);

  // Filter Clients Based on Search & Status
  const filteredClients = useMemo(() => {
    return sortedClients.filter((client) => {
      const matchesSearch = client.display_name && typeof client.display_name === "string"
        ? client.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "active") return matchesSearch && client.status === "active";
      if (activeTab === "inactive") return matchesSearch && client.status === "inactive";
      return matchesSearch;
    });
  }, [sortedClients, searchTerm, activeTab]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const exportData = filteredClients.map((client) => ({
      "Client Name": client.display_name || "N/A",
      "Total Projects": client.total_projects,
      "Revenue (INR)": `₹ ${client.revenue_inr.toLocaleString()}`,
      "Revenue (USD)": `$ ${client.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      "Profit (INR)": `₹ ${client.profit_inr.toLocaleString()}`,
      "Profit (USD)": `$ ${client.profit_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      Status: client.status,
      Currency: client.currency,
      "Internal Contact": client.internal_contact || "N/A",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "clients_data.xlsx");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Client Data", 14, 10);
    (doc as any).autoTable({
      head: [
        [
          "Client Name",
          "Total Projects",
          "Revenue (INR)",
          "Revenue (USD)",
          "Profit (INR)",
          "Profit (USD)",
          "Status",
          "Currency",
          "Internal Contact",
        ],
      ],
      body: filteredClients.map((client) => [
        client.display_name || "N/A",
        client.total_projects,
        `₹ ${client.revenue_inr.toLocaleString()}`,
        `$ ${client.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `₹ ${client.profit_inr.toLocaleString()}`,
        `$ ${client.profit_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        client.status,
        client.currency,
        client.internal_contact || "N/A",
      ]),
      startY: 20,
    });
    doc.save("clients_data.pdf");
  };

  // Mutation for updating client status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ clientId, newStatus }: { clientId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_clients")
        .update({
          status: newStatus,
          updated_by: user.id,
          organization_id: organization_id,
        })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update client status.");
    },
  });

  // Mutation for deleting a client
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("hr_clients")
        .delete()
        .eq("id", clientId)
        .eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted successfully!");
      if (paginatedClients.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    },
    onError: () => {
      toast.error("Failed to delete client.");
    },
  });

  const handleEditClient = (client: ClientData) => {
    setAddClientOpen(true);
  };

  const handleDeleteClient = (client: ClientData) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(client.id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200 rounded-full text-[10px]";
      case "inactive":
        return "bg-red-100 text-red-800 hover:bg-red-200 rounded-full text-[10px]";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-full text-[10px]";
    }
  };

  const renderTable = (clients: ClientData[]) => {
    if (isLoading || !clientFinancials.length) {
      return (
        <div className="text-center p-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p>Loading clients...</p>
        </div>
      );
    }
    if (clients.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No clients found.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Client Name
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Total Projects
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Revenue
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Profit
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Currency
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <Link
                        to={`/client/${client.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {client.display_name || "N/A"}
                      </Link>
                      <span className="text-xs text-gray-500 flex space-x-2">
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px] mt-1"
                        >
                          {client.internal_contact || "N/A"}
                        </Badge>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{client.total_projects}</td>
                  <td className="px-4 py-2">
                    ₹ {client.revenue_inr.toLocaleString()}
                    <br />
                    <span className="text-xs text-gray-500">
                      $ {client.revenue_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    ₹ {client.profit_inr.toLocaleString()}
                    <br />
                    <span className="text-xs text-gray-500">
                      $ {client.profit_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-4 py-2">{client.currency}</td>
                  <td className="px-4 py-2">
                    {isEmployee ? (
                      <Badge variant="outline" className={getStatusBadgeClass(client.status)}>
                        {client.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    ) : (
                      <Select
                        defaultValue={client.status}
                        onValueChange={(newStatus) =>
                          updateStatusMutation.mutate({ clientId: client.id, newStatus })
                        }
                      >
                        <SelectTrigger
                          className={`h-8 px-2 py-0 ${getStatusBadgeClass(client.status)}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-green-600">
                            Active
                          </SelectItem>
                          <SelectItem value="inactive" className="text-red-600">
                            Inactive
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link to={`/client/${client.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Client</p>
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
                                  onClick={() => handleEditClient(client)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Client</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClient(client)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Client</p>
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
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
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
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClients.length)} of{" "}
          {filteredClients.length} clients
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {!isEmployee && (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full sm:w-80">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-1">
                <Briefcase size={14} />
                <span>Active</span>
              </TabsTrigger>
              <TabsTrigger value="inactive" className="flex items-center gap-1">
                <Clock size={14} />
                <span>Inactive</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search for clients..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {!isEmployee ? (
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="all" className="space-y-6">
            {renderTable(paginatedClients)}
            {filteredClients.length > 0 && renderPagination()}
          </TabsContent>
          <TabsContent value="active" className="space-y-6">
            {renderTable(paginatedClients.filter((client) => client.status === "active"))}
            {filteredClients.length > 0 && renderPagination()}
          </TabsContent>
          <TabsContent value="inactive" className="space-y-6">
            {renderTable(paginatedClients.filter((client) => client.status === "inactive"))}
            {filteredClients.length > 0 && renderPagination()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {renderTable(paginatedClients)}
          {filteredClients.length > 0 && renderPagination()}
        </div>
      )}
    </div>
  );
};

export default ClientTable;
