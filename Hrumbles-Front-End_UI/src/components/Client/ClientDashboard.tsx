import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import  supabase  from "../../config/supabaseClient";
// import Header from "@/components/Header";
import { Table } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ChevronDown, Download, Filter, Plus, Search } from "lucide-react";
// import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,Legend } from "recharts";
import { cn } from "../../lib/utils";
import { useState } from "react";
import AddProjectDialog from "./AddProjectDialog";
import { useSelector } from "react-redux";
import { Checkbox } from "../../components/ui/checkbox";
import { toast } from "sonner";
import "react-circular-progressbar/dist/styles.css";
import CircularProgressBar from "../Client/RevenueProfitChart";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";



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

interface AssignEmployee {
  id: string;
  project_id: string;
  client_id: string;
  salary: number;
  client_billing: number;
  status: string;
}

const COLORS = ["#0088FE", "#00C49F"];

const ClientDashboard = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); // ✅ Ensure `id` is a string
    const queryClient = useQueryClient();
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all"); // Default: Show All
    const [searchQuery, setSearchQuery] = useState<string>(""); 
  
    const user = useSelector((state: any) => state.auth.user); // ✅ Get logged-in user
    const organization_id = useSelector((state: any) => state.auth.organization_id); // ✅ Get organization ID
  
    if (!user || !organization_id) {
      return <div className="text-center text-red-600 font-semibold mt-10">Authentication error: Missing user or organization ID</div>;
    }

   // ✅ Fetch client details
   const { data: client } = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
  
      const { data, error } = await supabase
        .from("hr_clients")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
  
      if (error) throw error;
  
      // ✅ Ensure no null values are returned
      return {
        ...data,
        total_projects: data.total_projects ?? 0,
        ongoing_projects: data.ongoing_projects ?? 0,
        completed_projects: data.completed_projects ?? 0,
        active_employees: data.active_employees ?? 0,
        revenue: data.revenue ?? 0,
        profit: data.profit ?? 0,
      };
    },
    enabled: !!id,
  });
  

  // ✅ Fetch projects for the client
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_projects")
        .select("*")
        .eq("client_id", id)
        .eq("organization_id", organization_id);

      if (error) throw error;

      return data.map((project) => ({
        ...project,
        duration: project.duration ?? 0,
        start_date: project.start_date ?? "",
        end_date: project.end_date ?? "",
        status: project.status ?? "unknown",
      })) as Project[];
    },
    enabled: !!id,
  });

  // ✅ Fetch assigned employees for the client’s projects
  const { data: assignedEmployees } = useQuery<AssignEmployee[]>({
    queryKey: ["project-employees", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
  
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select("id, project_id, client_id, salary, client_billing, status") // ✅ Ensure `client_id` is selected
        .eq("client_id", id)
        .eq("organization_id", organization_id);
  
      if (error) throw error;
  
      // ✅ Ensure every field has a valid value
      return data.map((employee) => ({
        id: employee.id,
        project_id: employee.project_id,
        client_id: employee.client_id ?? "", // Ensure `client_id` is never `null`
        salary: employee.salary ?? 0,
        client_billing: employee.client_billing ?? 0,
        status: employee.status ?? "No Status"
      }));
    },
    enabled: !!id,
  });
  
  
  // ✅ Calculate total salary cost, revenue (client billing), and profit
  // ✅ Function to calculate revenue & profit per project
  const calculateProjectFinancials = (projectId: string) => {
    const projectEmployees = assignedEmployees?.filter((emp) => emp.project_id === projectId) || [];
    const totalSalary = projectEmployees.reduce((acc, emp) => acc + (emp.salary || 0), 0);
    const totalRevenue = projectEmployees.reduce((acc, emp) => acc + (emp.client_billing || 0), 0);
    const totalProfit = totalRevenue - totalSalary;

    return { totalRevenue, totalProfit };
  };

  // ✅ Count employees based on status
const workingCount = assignedEmployees?.filter(emp => emp.status === "Working").length || 0;
const relievedCount = assignedEmployees?.filter(emp => emp.status === "Relieved").length || 0;
const terminatedCount = assignedEmployees?.filter(emp => emp.status === "Terminated").length || 0;


  // ✅ Calculate total revenue and profit for PieChart
  const totalRevenue = assignedEmployees?.reduce((acc, emp) => acc + (emp.client_billing || 0), 0) || 0;
  const totalProfit = totalRevenue - (assignedEmployees?.reduce((acc, emp) => acc + (emp.salary || 0), 0) || 0);
  const pieData = [
    { name: "Revenue", value: totalRevenue },
    { name: "Profit", value: totalProfit },
  ];

  const filteredProjects = projects?.filter((project) => {
    return (
      (statusFilter === "all" || project.status === statusFilter) &&
      (searchQuery === "" || project.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // ✅ Export to CSV
  const exportToCSV = () => {
    const csvData = filteredProjects?.map((project) => ({
      Name: project.name,
      Duration: `${project.duration} days`,
      "Start Date": project.start_date,
      "End Date": project.end_date,
      Revenue: `₹ ${project.revenue.toLocaleString()}`,
      Profit: `₹ ${project.profit.toLocaleString()}`,
      Status: project.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData || []);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, "Projects.csv");
  };

  // ✅ Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;
    doc.text("Projects Report", 14, y);
    y += 10;
  
    filteredProjects?.forEach((project) => {
      doc.text(`Project: ${project.name}`, 14, y);
      doc.text(`Duration: ${project.duration} days`, 14, y + 5);
      doc.text(`Start Date: ${project.start_date}`, 14, y + 10);
      doc.text(`End Date: ${project.end_date}`, 14, y + 15);
      doc.text(`Revenue: ₹ ${project.revenue.toLocaleString()}`, 14, y + 20);
      doc.text(`Profit: ₹ ${project.profit.toLocaleString()}`, 14, y + 25);
      doc.text(`Status: ${project.status}`, 14, y + 30);
      y += 40;
    });
  
    doc.save("Projects.pdf");
  };
  


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
        
        console.log("ProjectFinacial", projects)

  return (
    <div className="min-h-screen">
      {/* <Header /> */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-6">{client?.display_name}</h1>
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
  <ResponsiveContainer width="100%" height={270}>
  <BarChart
    data={
      projects?.map((project) => {
        const { totalRevenue, totalProfit } = calculateProjectFinancials(project.id);
        return {
          name: project.name, // ✅ Use project name
          revenue: totalRevenue || 0,
          profit: totalProfit || 0,
        };
      }) || []
    }
  >
    {/* <CartesianGrid strokeDasharray="3 3" /> */}
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="revenue" fill="var(--theme-green)" barSize={30} radius={[5, 5, 0, 0]} />
    <Bar dataKey="profit" fill="var(--theme-gray)" barSize={30} radius={[5, 5, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
</div>


  {/* Right: Circular Progress Bar */}
  <div className="glass-card p-6 flex flex-col items-center ">
    <CircularProgressBar revenue={totalRevenue} profit={totalProfit} />
  </div>
</div>




          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] text-xs px-3 py-1 rounded-md border">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Project Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm rounded-md border focus:ring-2 focus:ring-primary"
                />
              </div>
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
                <Button variant="outline" size="sm" className="rounded-full" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={exportToPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
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
  {filteredProjects?.map((project) => {
    const { totalRevenue, totalProfit } = calculateProjectFinancials(project.id); // ✅ Calculate project-specific revenue & profit

    return (
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

        {/* ✅ Show revenue and profit for this project only */}
        <td className="px-4 py-2">₹ {totalRevenue.toLocaleString()}</td>
        <td className="px-4 py-2">₹ {totalProfit.toLocaleString()}</td>

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
    );
  })}
</tbody>

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
