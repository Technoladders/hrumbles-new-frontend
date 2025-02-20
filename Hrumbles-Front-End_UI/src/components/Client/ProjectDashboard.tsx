import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import  supabase  from "../../config/supabaseClient";
// import Header from "@/components/Header";
import { Table } from "../ui/table";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ChevronDown, Download, Filter, Plus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "../../lib/utils";
import { useState } from "react";
import AddProjectDialog from "./AssignEmployeeDialog";
import { useSelector } from "react-redux";
import { Checkbox } from "../ui/checkbox";
import { unknown } from "zod";
import { FileText } from 'lucide-react';
import { toast } from "sonner";


interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  client_billing: number;
  status: string;
  sow:string;
  duration: number;
  hr_profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

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

const ProjectDashboard = () => {

    const { id } = useParams<{ id: string }>(); // ✅ Ensure `id` is a string
    const [searchParams] = useSearchParams();
    const clientId = searchParams.get("client_id");
    const queryClient = useQueryClient();
    const [addProjectOpen, setAddProjectOpen] = useState(false);
  
    const user = useSelector((state: any) => state.auth.user); // ✅ Get logged-in user
    const organization_id = useSelector((state: any) => state.auth.organization_id); // ✅ Get organization ID
  
    if (!user || !organization_id) {
      return <div className="text-center text-red-600 font-semibold mt-10">Authentication error: Missing user or organization ID</div>;
    }

    const { data: project } = useQuery({
        queryKey: ["project", id],
        queryFn: async () => {
          if (!id) throw new Error("Project ID is missing");
    
          const { data, error } = await supabase
            .from("hr_projects")
            .select("*")
            .eq("id", id)
            .eq("organization_id", organization_id) // ✅ Ensure data belongs to user's organization
            .single();
    
          if (error) throw error;
          return data as Project;
        },
        enabled: !!id, // ✅ Prevent query execution if `id` is undefined
      });
    
      const { data: assign_employee } = useQuery({
        queryKey: ["project-employee", id],
        queryFn: async () => {
          if (!id) throw new Error("Project ID is missing");
      
          const { data, error } = await supabase
            .from("hr_project_employees")
            .select(`
              id,
              assign_employee,
              project_id,
              client_id,
              start_date,
              end_date,
              salary,
              client_billing,
              status,
              sow,
              hr_profiles:hr_profiles!hr_project_employees_assign_employee_fkey (first_name, last_name)
            `)
            .eq("project_id", id)
            .eq("organization_id", organization_id);
      
          if (error) throw error;
      
          // ✅ Compute duration dynamically
          const processedData = data.map((employee) => ({
            ...employee,
            duration: employee.start_date && employee.end_date
              ? Math.ceil(
                  (new Date(employee.end_date).getTime() - new Date(employee.start_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0, // Default to 0 if dates are missing
          }));
      
          return processedData as unknown as AssignEmployee[];
        },
        enabled: !!id,
      });
      
      
      const updateEmployeeStatus = useMutation({
        mutationFn: async ({ employeeId, newStatus }: { employeeId: string; newStatus: string }) => {
          const { error } = await supabase
            .from("hr_project_employees")
            .update({ status: newStatus })
            .eq("id", employeeId);
          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["project-employee", id] });
          toast.success("Employee status updated successfully!");
        },
        onError: () => {
          toast.error("Failed to update employee status.");
        },
      });
      

      console.log("assignemploye:: e", assign_employee)
    
      const chartData =
        assign_employee?.map((assign) => ({
          name: assign.id,
          revenue: assign.salary,
          profit: assign.client_billing,
        })) || [];

  return (
    <div className="min-h-screen">
      {/* <Header /> */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">{project?.name}</h1>
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          </div> */}

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
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Employee Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Duration</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Start Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">End Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Salary</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Client Billing</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Action</th>

                  </tr>
                </thead>
                <tbody>                   {assign_employee?.map((project) => (
                    <tr key={project.id} className="hover:bg-white/50 transition-colors border-b">
                          <td className="px-4 py-2">
                            <Checkbox className="rounded-md" />
                          </td>
                      <td className="px-4 py-2 font-medium cursor-pointer hover:text-primary">  {project.hr_profiles ? `${project.hr_profiles.first_name} ${project.hr_profiles.last_name}` : "N/A"}</td>
                      <td className="px-4 py-2">{project.duration} days</td>
                      <td className="px-4 py-2">{new Date(project.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{new Date(project.end_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">₹ {project.salary.toLocaleString()}</td>
                      <td className="px-4 py-2">₹ {project.client_billing.toLocaleString()}</td>
                      <td className="px-4 py-2">
  <Select
    defaultValue={project.status}
    onValueChange={(newStatus) => updateEmployeeStatus.mutate({ employeeId: project.id, newStatus })}
  >
    <SelectTrigger
      className={cn(
        "w-[140px] text-xs px-3 py-1 rounded-full border transition",
        project.status === "Working"
          ? "bg-green-100 text-green-700 border-green-400"
          : project.status === "Relieved"
          ? "bg-yellow-100 text-yellow-700 border-yellow-400"
          : "bg-red-100 text-red-700 border-red-400"
      )}
    >
      <SelectValue>
        {project.status === "Working" ? "🟢 Working" : project.status === "Relieved" ? "🟡 Relieved" : "🔴 Terminated"}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="Working" className="text-green-700">🟢 Working</SelectItem>
      <SelectItem value="Relieved" className="text-yellow-700">🟡 Relieved</SelectItem>
      <SelectItem value="Terminated" className="text-red-700">🔴 Terminated</SelectItem>
    </SelectContent>
  </Select>
</td>

                      <td className="px-4 py-2">
        {project.sow ? (
          <a
            href={project.sow}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
             <FileText className="w-5 h-5 inline-block" />
          </a>
        ) : (
          <span className="text-gray-400">No SOW</span>
        )}
      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </main>
      {clientId && id && (
  <AddProjectDialog
    open={addProjectOpen}
    onOpenChange={setAddProjectOpen}
    projectId={id as string} // ✅ Ensure id is a string
    clientId={clientId} // ✅ clientId is already a string
  />
)}
    </div>
  );
};

export default ProjectDashboard;
