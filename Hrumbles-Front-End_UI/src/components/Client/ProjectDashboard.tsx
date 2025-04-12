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
import CircularProgressBar from "../Client/RevenueProfitChart";


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
  sow: string;
  duration: number;
  hr_employees?: {
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

  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const queryClient = useQueryClient();
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

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
          .eq("organization_id", organization_id)
          .single();
  
        if (error) throw error;
        return data as Project;
      },
      enabled: !!id,
    });
    
      const { data: assignEmployee } = useQuery({
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
              hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (first_name, last_name)
            `)
            .eq("project_id", id)
            .eq("organization_id", organization_id);
    
          if (error) throw error;
    
          return data.map((employee) => ({
            ...employee,
            duration: employee.start_date && employee.end_date
              ? Math.ceil(
                  (new Date(employee.end_date).getTime() - new Date(employee.start_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
          })) as AssignEmployee[];
        },
        enabled: !!id,
      });
      const workingCount = assignEmployee?.filter(emp => emp.status === "Working").length || 0;
      const relievedCount = assignEmployee?.filter(emp => emp.status === "Relieved").length || 0;
      const terminatedCount = assignEmployee?.filter(emp => emp.status === "Terminated").length || 0;
    
      // ✅ Calculate Revenue & Profit
      const totalRevenue = assignEmployee?.reduce((acc, emp) => acc + (emp.client_billing || 0), 0) || 0;
      const totalProfit = totalRevenue - (assignEmployee?.reduce((acc, emp) => acc + (emp.salary || 0), 0) || 0);
      
      
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
      

    


  return (
    <div className="min-h-screen">
      {/* <Header /> */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">{project?.name}</h1>
           {/* ✅ Employee Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-xl glass-card">
            <p className="text-sm text-muted-foreground mb-2">🟢 Working Employees</p>
            <p className="text-2xl font-semibold">{workingCount}</p>
          </div>
          <div className="p-6 rounded-xl glass-card">
            <p className="text-sm text-muted-foreground mb-2">🟡 Relieved Employees</p>
            <p className="text-2xl font-semibold">{relievedCount}</p>
          </div>
          <div className="p-6 rounded-xl glass-card">
            <p className="text-sm text-muted-foreground mb-2">🔴 Terminated Employees</p>
            <p className="text-2xl font-semibold">{terminatedCount}</p>
          </div>
        </div>

        {/* ✅ Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left: Area Chart */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Revenue & Profit Overview</h2>
            <ResponsiveContainer width="100%" height={250}>
  <AreaChart
    data={
      assignEmployee?.map((employee) => ({
        name: employee.hr_employees
          ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
          : "Unknown Employee", // ✅ Fallback for missing names
        client_billing: employee.client_billing || 0, // ✅ Revenue
        salary: employee.salary || 0, // ✅ Salary
      })) || []
    }
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="client_billing" stroke="var(--secondary-hover)" fill="var(--secondary)"  />
    <Area type="monotone" dataKey="salary"  stroke="#8884d8" fill="var(--theme-green)" />
  </AreaChart>
</ResponsiveContainer>

          </div>

          {/* Right: Circular Progress Bar */}
          <div className="glass-card p-6 flex flex-col items-center">
          
            <CircularProgressBar revenue={totalRevenue} profit={totalProfit} />
          </div>
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
                <tbody>                   {assignEmployee?.map((project) => (
                    <tr key={project.id} className="hover:bg-white/50 transition-colors border-b">
                          <td className="px-4 py-2">
                            <Checkbox className="rounded-md" />
                          </td>
                      <td className="px-4 py-2 font-medium cursor-pointer hover:text-primary">  {project.hr_employees ? `${project.hr_employees.first_name} ${project.hr_employees.last_name}` : "N/A"}</td>
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
