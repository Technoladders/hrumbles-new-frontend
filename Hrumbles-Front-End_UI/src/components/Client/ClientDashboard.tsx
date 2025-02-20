import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  supabase  from "../../config/supabaseClient";
// import Header from "@/components/Header";
import { Table } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ChevronDown, Download, Filter, Plus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "../../lib/utils";
import { useState } from "react";
import AddProjectDialog from "./AddProjectDialog";
import { useSelector } from "react-redux";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";



interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  revenue: number;
  profit: number;
  status: string;
  employees_needed: number;
  employees_assigned: number;
}

interface Client {
  id: string;
  display_name: string;
  total_projects: number;
  ongoing_projects: number;
  completed_projects: number;
  active_employees: number;
  revenue: number;
  profit: number;
}

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // ✅ Ensure `id` is a string
    const queryClient = useQueryClient();
    const [addProjectOpen, setAddProjectOpen] = useState(false);
  
    const user = useSelector((state: any) => state.auth.user); // ✅ Get logged-in user
    const organization_id = useSelector((state: any) => state.auth.organization_id); // ✅ Get organization ID
  
    if (!user || !organization_id) {
      return <div className="text-center text-red-600 font-semibold mt-10">Authentication error: Missing user or organization ID</div>;
    }

    const { data: client } = useQuery({
        queryKey: ["client", id],
        queryFn: async () => {
          if (!id) throw new Error("Client ID is missing");
    
          const { data, error } = await supabase
            .from("hr_clients")
            .select("*")
            .eq("id", id)
            .eq("organization_id", organization_id) // ✅ Ensure data belongs to user's organization
            .single();
    
          if (error) throw error;
          return data as Client;
        },
        enabled: !!id, // ✅ Prevent query execution if `id` is undefined
      });
    
      const { data: projects } = useQuery({
        queryKey: ["client-projects", id],
        queryFn: async () => {
          if (!id) throw new Error("Client ID is missing");
    
          const { data, error } = await supabase
            .from("hr_projects")
            .select("*")
            .eq("client_id", id)
            .eq("organization_id", organization_id); // ✅ Ensure projects belong to user's organization
    
          if (error) throw error;
          return data as Project[];
        },
        enabled: !!id, // ✅ Prevent query execution if `id` is undefined
      });
    
      const chartData =
        projects?.map((project) => ({
          name: project.name,
          revenue: project.revenue,
          profit: project.profit,
        })) || [];


        const updateProjectStatus = useMutation({
          mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
            const { error } = await supabase
              .from("hr_projects")
              .update({ status: newStatus })
              .eq("id", projectId);
            if (error) throw error;
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client-projects", id] }); // Refresh data
            toast.success("Project status updated successfully!");
          },
          onError: () => {
            toast.error("Failed to update project status.");
          },
        });
        

  return (
    <div className="min-h-screen">
      {/* <Header /> */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">{client?.display_name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-6 rounded-xl bg-white/50 backdrop-blur shadow-sm">
              <p className="text-sm text-muted-foreground mb-2">Total Projects</p>
              <p className="text-2xl font-semibold">{client?.total_projects}</p>
            </div>
            <div className="p-6 rounded-xl bg-white/50 backdrop-blur shadow-sm">
              <p className="text-sm text-muted-foreground mb-2">Ongoing Projects</p>
              <p className="text-2xl font-semibold">{client?.ongoing_projects}</p>
            </div>
            <div className="p-6 rounded-xl bg-white/50 backdrop-blur shadow-sm">
              <p className="text-sm text-muted-foreground mb-2">Revenue</p>
              <p className="text-2xl font-semibold">₹ {client?.revenue.toLocaleString()}</p>
            </div>
            <div className="p-6 rounded-xl bg-white/50 backdrop-blur shadow-sm">
              <p className="text-sm text-muted-foreground mb-2">Profit</p>
              <p className="text-2xl font-semibold">₹ {client?.profit.toLocaleString()}</p>
            </div>
          </div>

          <div className="h-[400px] mb-8 p-6 rounded-xl bg-white/50 backdrop-blur shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Revenue & Profit Overview</h2>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#revenue)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#82ca9d" 
                  fillOpacity={1} 
                  fill="url(#profit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm">
                  Columns
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" size="sm">
                  Department
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="rounded-full"
                  onClick={() => setAddProjectOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-full">
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <div className="w-full overflow-auto">
              <Table>
              <thead className="bg-gray-100">
  <tr className="border-b border-border/50">
    <th className="w-12 px-4 py-2">
      <Checkbox className="rounded-md" />
    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Project Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Duration</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">End Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Profit</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
  {projects?.map((project) => (
    <tr key={project.id} className="hover:bg-white/50 transition-colors border-b">
      <td className="px-4 py-2">
        <Checkbox className="rounded-md" />
      </td>
      <td
        className="px-4 py-2 font-medium cursor-pointer hover:text-primary"
        onClick={() => navigate(`/project/${project.id}?client_id=${id}`)}
      >
        {project.name}
      </td>
      <td className="px-4 py-2">{project.duration} days</td>
      <td className="px-4 py-2">{new Date(project.start_date).toLocaleDateString()}</td>
      <td className="px-4 py-2">{new Date(project.end_date).toLocaleDateString()}</td>
      <td className="px-4 py-2">₹ {project.revenue.toLocaleString()}</td>
      <td className="px-4 py-2">₹ {project.profit.toLocaleString()}</td>
      <td className="px-4 py-2">
  <Select
    defaultValue={project.status}
    onValueChange={(newStatus) =>
      updateProjectStatus.mutate({ projectId: project.id, newStatus })
    }
  >
    <SelectTrigger
      className={cn(
        "w-[120px] text-xs px-3 py-1 rounded-full border transition",
        project.status === "ongoing"
          ? "bg-yellow-100 text-yellow-700 border-yellow-400"
          : project.status === "completed"
          ? "bg-green-100 text-green-700 border-green-400"
          : "bg-gray-100 text-gray-700 border-gray-400"
      )}
    >
      <SelectValue>
        {project.status === "ongoing" ? "Ongoing" : "Completed"}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ongoing" className="text-yellow-700">Ongoing</SelectItem>
      <SelectItem value="completed" className="text-green-700">Completed</SelectItem>
    </SelectContent>
  </Select>
</td>

    </tr>
  ))}
</tbody>;
              </Table>
            </div>
          </div>
        </div>
      </main>
      {id && (
        <AddProjectDialog 
          open={addProjectOpen} 
          onOpenChange={setAddProjectOpen}
          clientId={id}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
