import React, { useState } from "react";
import { Table } from "../../components/ui/table";
import { Checkbox } from "../../components/ui/checkbox";
import { cn } from "../../lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";

interface Client {
  id: string;
  display_name: string;
  total_projects: number;
  ongoing_projects: number;
  completed_projects: number;
  active_employees: number;
  revenue: number;
  profit: number;
  status: string;
}

const ClientTable = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch clients from Supabase
  const { data: clients, isLoading } = useQuery({
    queryKey: ["hr_clients", organization_id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("hr_clients")
        .select("*")
        .eq("organization_id", organization_id);

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!organization_id,
  });

  // Mutation to update the status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ clientId, newStatus }: { clientId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_clients")
        .update({ status: newStatus })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr_clients"] });
      toast.success("Status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update status.");
    },
  });
  

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="w-full overflow-auto">
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
          </tr>
        </thead>
        <tbody>
          {clients?.map((client) => (
            <tr key={client.id} className="hover:bg-white/50 transition-colors border-b">
              <td className="px-4 py-2">
                <Checkbox className="rounded-md" />
              </td>
              <td 
                className="px-4 py-2 font-medium cursor-pointer hover:text-primary"
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
                  defaultValue={client.status}
                  onValueChange={(newStatus) => updateStatusMutation.mutate({ clientId: client.id, newStatus })}
                >
                  <SelectTrigger
                    className={cn(
                      "w-[120px] text-xs px-3 py-1 rounded-full border transition",
                      client.status === "active" ? "bg-green-100 text-green-700 border-green-400" : "bg-red-100 text-red-700 border-red-400"
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
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ClientTable;
