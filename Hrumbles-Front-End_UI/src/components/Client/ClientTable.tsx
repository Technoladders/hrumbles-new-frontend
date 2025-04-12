import React, { useState } from "react";
import { Table } from "../../components/ui/table";
import { Checkbox } from "../../components/ui/checkbox";
import { cn } from "../../lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Download, Plus, Pencil } from "lucide-react"; // Added Pencil icon for Edit
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import AddClientDialog from "../Client/AddClientDialog";

const ClientTable = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null); // State for the client being edited

  // Fetch clients from Supabase
  const [searchQuery, setSearchQuery] = useState(""); // 🔍 Search Query
  const [statusFilter, setStatusFilter] = useState("all"); // 📌 Status Filter

  // Fetch clients from Supabase
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["hr_clients", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // ✅ Fetch Projects for Each Client
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ["hr_projects", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_projects")
        .select("id, client_id, status")
        .eq("organization_id", organization_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // ✅ Fetch Employees for Each Client
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["hr_project_employees", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select("client_id, salary, client_billing, status")
        .eq("organization_id", organization_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // ✅ Compute Financial & Employee Data
  const clientData = clients?.map((client) => {
    const clientProjects = projects?.filter((p) => p.client_id === client.id) || [];
    const totalProjects = clientProjects.length;
    const ongoingProjects = clientProjects.filter((p) => p.status === "ongoing").length;
    const completedProjects = clientProjects.filter((p) => p.status === "completed").length;

    const clientEmployees = employees?.filter((e) => e.client_id === client.id) || [];
    const activeEmployees = clientEmployees.filter((e) => e.status === "Working").length;
    const totalRevenue = clientEmployees.reduce(
      (acc, e) => acc + (Number(e.client_billing) || 0),
      0
    );
    const totalProfit =
      totalRevenue - clientEmployees.reduce((acc, e) => acc + (Number(e.salary) || 0), 0);

    return {
      ...client,
      total_projects: totalProjects,
      ongoing_projects: ongoingProjects,
      completed_projects: completedProjects,
      active_employees: activeEmployees,
      revenue: totalRevenue,
      profit: totalProfit,
    };
  }) || [];

  // ✅ Filter Clients Based on Search & Status
  const filteredClients = clientData?.filter((client) => {
    const matchesSearch = client.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ✅ Export to CSV
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredClients || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients");
    XLSX.writeFile(wb, "clients_data.xlsx");
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Client Data", 14, 10);

    (doc as any).autoTable({
      head: [
        [
          "Client Name",
          "Total Projects",
          "Ongoing",
          "Completed",
          "Active Employees",
          "Revenue",
          "Profit",
          "Status",
        ],
      ],
      body: filteredClients?.map((client) => [
        client.display_name,
        client.total_projects,
        client.ongoing_projects,
        client.completed_projects,
        client.active_employees,
        `₹ ${client.revenue.toLocaleString()}`,
        `₹ ${client.profit.toLocaleString()}`,
        client.status,
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
      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      toast.success("Client status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update client status.");
    },
  });

  // Handle Edit Button Click
  const handleEditClient = (client: any) => {
    setEditClient(client);
    setAddClientOpen(true); // Open the dialog for editing
  };

  if (loadingClients || loadingProjects || loadingEmployees) return <div>Loading...</div>;

  return (
    <div className="w-full overflow-auto">
      <div className="flex justify-between mb-4">
        <div className="flex gap-4">
          {/* 📌 Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] text-sm border rounded-md">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {/* 🔍 Search Input */}
          <input
            type="text"
            placeholder="Search Client..."
            className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 📤 Export Buttons */}
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => setAddClientOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
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
      <Table>
        <thead className="bg-gray-100">
          <tr className="border-b border-border/50">
            <th className="w-12 px-4 py-2">
              <Checkbox className="rounded-md" />
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Client Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Total Projects</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Ongoing</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Completed</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Active Employees</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Revenue</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Profit</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Actions</th> {/* New Actions Column */}
          </tr>
        </thead>
        <tbody>
          {filteredClients?.map((client) => (
            <tr key={client.id} className="hover:bg-white/50 transition-colors border-b">
              <td className="px-4 py-2">
                <Checkbox className="rounded-md" />
              </td>
              <td
                className="px-4 py-2 font-medium cursor-pointer hover:text-primary !cursor-pointer"
                onClick={() => navigate(`/client/${client.id}`)}
              >
                {client.display_name}
              </td>
              <td className="px-4 py-2">{client.total_projects}</td>
              <td className="px-4 py-2">{client.ongoing_projects}</td>
              <td className="px-4 py-2">{client.completed_projects}</td>
              <td className="px-4 py-2">{client.active_employees}</td>
              <td className="px-4 py-2">₹ {client.revenue.toLocaleString()}</td>
              <td className="px-4 py-2">₹ {client.profit.toLocaleString()}</td>
              <td className="px-4 py-2">
                <Select
                  defaultValue={client.status ?? undefined}
                  onValueChange={(newStatus) =>
                    updateStatusMutation.mutate({ clientId: client.id, newStatus })
                  }
                >
                  <SelectTrigger
                    className={cn(
                      "w-[120px] text-xs px-3 py-1 rounded-full border transition",
                      client.status === "active"
                        ? "bg-green-100 text-green-700 border-green-400"
                        : "bg-red-100 text-red-700 border-red-400"
                    )}
                  >
                    <SelectValue>{client.status === "active" ? "Active" : "Inactive"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-green-700">Active</SelectItem>
                    <SelectItem value="inactive" className="text-red-700">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClient(client)}
                >
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {/* ✅ Add/Edit Client Dialog */}
      <AddClientDialog
        open={addClientOpen}
        onOpenChange={(open) => {
          setAddClientOpen(open);
          if (!open) setEditClient(null); // Reset editClient when dialog closes
        }}
        clientToEdit={editClient} // Pass the client to edit
      />
    </div>
  );
};

export default ClientTable;