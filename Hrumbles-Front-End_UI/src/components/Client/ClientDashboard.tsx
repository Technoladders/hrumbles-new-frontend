import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  ArrowLeft,
  Download,
  Plus,
  Search,
  Briefcase,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Pencil,
  Trash2,
  FileText,
 UserRoundCheck, UserRoundX, ReceiptIndianRupee 
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AddProjectDialog from "./AddProjectDialog";
import Loader from "@/components/ui/Loader";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie } from "recharts";
import RevenueProfitChart from "../Client/RevenueProfitChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


interface Project {
  id: string;
  name: string;
  start_date: string;
  revenue: number;
  profit: number;
  status: string;
  attachment?: string | null;
  numberOfEmployees: number;
  activeEmployees: number;
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
  currency: string;
}

interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  salary: number;
  client_billing: number;
  status: string;
  billing_type?: string;
  start_date: string;
  end_date: string;
  salary_currency?: string;
  salary_type?: string;
  hr_employees?: {
    salary_type: string;
  } | null;
}

interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: {
    projects: { hours: number; report: string; clientId: string; projectId: string }[];
  };
  total_working_hours: string;
}

const EXCHANGE_RATE_USD_TO_INR = 84;

const formatINR = (number: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(number);

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  if (!user || !organization_id) {
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Authentication error: Missing user or organization ID
      </div>
    );
  }

  // Fetch client details
  const { data: client, isLoading: loadingClient, error: clientError } = useQuery<Client>({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, total_projects, ongoing_projects, completed_projects, active_employees, revenue, profit, currency")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
      if (error) throw error;
      return {
        ...data,
        total_projects: data.total_projects ?? 0,
        ongoing_projects: data.ongoing_projects ?? 0,
        completed_projects: data.completed_projects ?? 0,
        active_employees: data.active_employees ?? 0,
        revenue: data.revenue ?? 0,
        profit: data.profit ?? 0,
        currency: data.currency ?? "INR",
      };
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch projects for the client
  const { data: projects = [], isLoading: loadingProjects, error: projectsError } = useQuery<Project[]>({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_projects")
        .select("*, attachment")
        .eq("client_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((project) => ({
        ...project,
        start_date: project.start_date ?? "",
        status: project.status ?? "unknown",
        revenue: 0,
        profit: 0,
        attachment: project.attachment ?? null,
        numberOfEmployees: 0,
        activeEmployees: 0,
      }));
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch assigned employees for the client’s projects
  const { data: assignedEmployees = [], isLoading: loadingEmployees, error: employeesError } = useQuery<
    AssignEmployee[]
  >({
    queryKey: ["project-employees", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          salary,
          client_billing,
          status,
          billing_type,
          start_date,
          end_date,
          salary_type,
          salary_currency,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (salary_type)
        `)
        .eq("client_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((employee) => ({
        id: employee.id,
        assign_employee: employee.assign_employee ?? "",
        project_id: employee.project_id,
        client_id: employee.client_id ?? "",
        salary: employee.salary ?? 0,
        client_billing: employee.client_billing ?? 0,
        status: employee.status ?? "No Status",
        billing_type: employee.billing_type ?? "LPA",
        start_date: employee.start_date ?? "",
        end_date: employee.end_date ?? "",
        salary_type: employee.salary_type?? "LPA",
        salary_currency: employee.salary_currency?? "INR",
        hr_employees: employee.hr_employees ?? null,
      }));
    },
    enabled: !!id && !!organization_id,
  });

  // Fetch time logs for actual calculations
  const { data: timeLogs = [], isLoading: loadingTimeLogs, error: timeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs", id],
    queryFn: async () => {
      if (!id) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        // .eq("organization_id", organization_id);
            .eq("is_approved", true)
      if (error) throw error;
      return data.filter((log) =>
        log.project_time_data?.projects?.some((proj) => projects.some((p) => p.id === proj.projectId))
      );
    },
    enabled: !!id && !!organization_id && projects.length > 0,
  });

  // Combine loading states
  const isLoading = loadingClient || loadingProjects || loadingEmployees || loadingTimeLogs;

  // Error handling
  if (clientError || projectsError || employeesError || timeLogsError) {
    toast.error("Failed to fetch data");
    console.error("Errors:", { clientError, projectsError, employeesError, timeLogsError });
  }

  // Reset currentPage when searchQuery or activeTab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Calculate total hours per employee from time logs
  const calculateEmployeeHours = (employeeId: string, projectId: string) =>
    timeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === projectId
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);

  // Convert client_billing to hourly rate
  const convertToHourly = (employee: AssignEmployee) => {
    const currency = client?.currency || "INR";
    let clientBilling = employee.client_billing || 0;

    if (currency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    switch (employee.billing_type) {
      case "Monthly":
        clientBilling = (clientBilling * 12) / (365 * 8);
        break;
      case "Hourly":
        break;
      case "LPA":
        clientBilling = clientBilling / (365 * 8);
        break;
      default:
        break;
    }

    return clientBilling;
  };

  // Calculate revenue for an employee
  const calculateRevenue = (employee: AssignEmployee, projectId: string) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId);
    const hourlyRate = convertToHourly(employee);
    return hours * hourlyRate;
  };

  // Calculate profit for an employee
  const calculateProfit = (employee: AssignEmployee, projectId: string) => {
    const revenue = calculateRevenue(employee, projectId);
      let salary = employee.salary || 0;
  const salaryType = employee?.salary_type || "LPA";

  if (employee.salary_currency === "USD") {
    salary *= EXCHANGE_RATE_USD_TO_INR;
  }

  console.log("employee.salary_type", employee)

    const hours = calculateEmployeeHours(employee.assign_employee, projectId);

    if (salaryType === "LPA") {
      const hourlySalary = salary / (365 * 8);
      salary = hours * hourlySalary;
    } else if (salaryType === "Monthly") {
      const monthlyToHourly = (salary / 30) / 8;
      salary = hours * monthlyToHourly;
    } else if (salaryType === "Hourly") {
      salary = hours * salary;
    }

    return revenue - salary;
  };

  // Calculate project financials and employee counts
  const calculateProjectFinancials = (projectId: string) => {
    const projectEmployees = assignedEmployees.filter((emp) => emp.project_id === projectId);
    const totalRevenue = projectEmployees.reduce(
      (acc, emp) => acc + calculateRevenue(emp, projectId),
      0
    );
    const totalProfit = projectEmployees.reduce(
      (acc, emp) => acc + calculateProfit(emp, projectId),
      0
    );
    const numberOfEmployees = projectEmployees.length;
    const activeEmployees = projectEmployees.filter((emp) => emp.status === "Working").length;
    return { totalRevenue, totalProfit, numberOfEmployees, activeEmployees };
  };

  // Map projects with financials and employee counts
  const projectData = projects.map((project) => {
    const { totalRevenue, totalProfit, numberOfEmployees, activeEmployees } = calculateProjectFinancials(project.id);
    return {
      ...project,
      revenue: totalRevenue,
      profit: totalProfit,
      numberOfEmployees,
      activeEmployees,
    };
  });

  // Calculate total revenue and profit
  const totalRevenue = projectData.reduce((acc, project) => acc + project.revenue, 0) || 0;
  const totalProfit = projectData.reduce((acc, project) => acc + project.profit, 0) || 0;
  const workingCount = assignedEmployees.filter((emp) => emp.status === "Working").length || 0;

  // Calculate project counts
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter((project) => project.status === "ongoing").length;
  const completedProjects = projects.filter((project) => project.status === "completed").length;

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("hr_projects")
        .delete()
        .eq("id", projectId)
        .eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", id] });
      toast.success("Project deleted successfully");
      setDeleteProjectId(null);
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });

  // Filter projects based on search and status
  const filteredProjects = projectData.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "ongoing") return matchesSearch && project.status === "ongoing";
    if (activeTab === "completed") return matchesSearch && project.status === "completed";
    if (activeTab === "cancelled") return matchesSearch && project.status === "cancelled";
    return matchesSearch;
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredProjects.map((project) => ({
      Name: project.name,
      "Start Date": new Date(project.start_date).toLocaleDateString(),
      "No. of Employees": project.numberOfEmployees,
      "Active Employees": project.activeEmployees,
      Revenue: formatINR(project.revenue),
      Profit: formatINR(project.profit),
      Status: project.status,
      Attachment: project.attachment || "None",
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, "Projects_actual.csv");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Projects Report", 14, 10);
    (doc as any).autoTable({
      head: [["Project Name", "Start Date", "No. of Employees", "Active Employees", "Revenue", "Profit", "Status", "Attachment"]],
      body: filteredProjects.map((project) => [
        project.name,
        new Date(project.start_date).toLocaleDateString(),
        project.numberOfEmployees,
        project.activeEmployees,
        formatINR(project.revenue),
        formatINR(project.profit),
        project.status,
        project.attachment || "None",
      ]),
      startY: 20,
    });
    doc.save("Projects_actual.pdf");
  };

  // Update project status mutation
  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, newStatus }: { projectId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_projects")
        .update({ status: newStatus })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-projects", id] });
      toast.success("Project status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update project status.");
    },
  });

  const renderTable = (projects: Project[]) => {
    if (projects.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No projects found.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. of Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Employees
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td
                    className="px-6 py-4 whitespace-nowrap font-medium cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/project/${project.id}?client_id=${id}`)}
                  >
                    {project.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(project.start_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{project.numberOfEmployees}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{project.activeEmployees}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatINR(project.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatINR(project.profit)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Select
                      defaultValue={project.status}
                      onValueChange={(newStatus) =>
                        updateProjectStatus.mutate({ projectId: project.id, newStatus })
                      }
                    >
                      <SelectTrigger
                        className={`h-8 px-2 py-0 rounded-full text-xs ${
                          project.status === "ongoing"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : project.status === "completed"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : project.status === "cancelled"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing" className="text-yellow-700">
                          Ongoing
                        </SelectItem>
                        <SelectItem value="completed" className="text-green-700">
                          Completed
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-red-700">
                          Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditProject(project);
                        setAddProjectOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => setDeleteProjectId(project.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {project.attachment && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => window.open(project.attachment, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Attachment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPagination = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of{" "}
        {filteredProjects.length} projects
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }

return (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
    <main className="w-full max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-all duration-200"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
              {client?.display_name} Dashboard
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-2">
              Manage and track all projects for this client
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditProject(null);
            setAddProjectOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
        >
          <Plus size={16} />
          Create New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Projects</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalProjects}</h3>
              <p className="text-xs text-gray-500 mt-1">All projects</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
              <Briefcase size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Ongoing Projects</p>
              <h3 className="text-2xl font-bold text-gray-800">{ongoingProjects}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {totalProjects ? Math.round((ongoingProjects / totalProjects) * 100) : 0}% of total
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
              <Calendar size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Completed Projects</p>
              <h3 className="text-2xl font-bold text-gray-800">{completedProjects}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0}% of total
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full">
              <Calendar size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Working Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{workingCount}</h3>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </div>
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-full">
              <Briefcase size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800">₹ {formatINR(totalRevenue)}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(totalRevenue / EXCHANGE_RATE_USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                    <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
              <ReceiptIndianRupee size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Profit</p>
              <h3 className="text-2xl font-bold text-gray-800">₹ {formatINR(totalProfit)}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(totalProfit / EXCHANGE_RATE_USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                    <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
              <TrendingUp size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="purple-gradient text-white p-6">
            <h2 className="text-xl md:text-2xl font-semibold">Project Financials</h2>
          </CardHeader>
          <CardContent className="p-6 overflow-x-auto">
            <div style={{ minWidth: `${projectData.length * 100}px` }}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={projectData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                  className="animate-fade-in"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={0}
                    textAnchor="middle"
                    interval={0}
                    height={50}
                    label={{ value: "Projects", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                    className="text-sm font-medium purple-text-color"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
                  />
                  <YAxis
                    label={{ value: "Value (INR)", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
                    className="text-sm font-medium purple-text-color"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid oklch(62.7% 0.265 303.9)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number, name) => {
                      const usd = value / EXCHANGE_RATE_USD_TO_INR;
                      return [
                        `₹${formatINR(value)} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
                        name,
                      ];
                    }}
                    itemStyle={{ color: "#4b5563" }}
                    cursor={{ fill: "#f3e8ff" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                  <Bar dataKey="revenue" fill="#7B43F1" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#A74BC8" name="Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="purple-gradient text-white p-6">
            <h2 className="text-xl md:text-2xl font-semibold">Revenue vs Profit</h2>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart className="animate-fade-in">
                <Pie
                  data={[
                    { name: "Revenue", value: totalRevenue, fill: "#7B43F1" },
                    { name: "Profit", value: totalProfit, fill: "#A74BC8" },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  cornerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ₹${formatINR(value)}`}
                  labelLine={false}
                  className="font-medium purple-text-color"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid oklch(62.7% 0.265 303.9)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number, name) => {
                    const usd = value / EXCHANGE_RATE_USD_TO_INR;
                    return [
                      `₹${formatINR(value)} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
                      name,
                    ];
                  }}
                  itemStyle={{ color: "#4b5563" }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
        <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full sm:w-[400px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="ongoing" className="flex items-center gap-1">
                    <Briefcase size={14} />
                    Ongoing
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-1">
                    <Calendar size={14} />
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="flex items-center gap-1">
                    <Clock size={14} />
                    Cancelled
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-grow">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Search for projects..."
                  className="pl-10 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="all" className="space-y-6">
                {renderTable(paginatedProjects)}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="ongoing" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "ongoing"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="completed" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "completed"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="cancelled" className="space-y-6">
                {renderTable(paginatedProjects.filter((project) => project.status === "cancelled"))}
                {filteredProjects.length > 0 && renderPagination()}
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      {id && (
        <>
          <AddProjectDialog
            open={addProjectOpen}
            onOpenChange={(open) => {
              setAddProjectOpen(open);
              if (!open) setEditProject(null);
            }}
            clientId={id}
            editProject={editProject}
          />
          <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete the project and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteProjectId && deleteProject.mutate(deleteProjectId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </main>
  </div>
);
};

export default ClientDashboard;
// UI change