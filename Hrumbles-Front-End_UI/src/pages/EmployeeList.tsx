import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Users, UserCheck, 
  PieChart, HandCoins,  Download 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddEmployeeModal from "../components/Employee1/AddEmployeeModal";
import { useSelector } from "react-redux";
import { useDisclosure } from "@chakra-ui/react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import HiddenContactCell from "@/components/ui/HiddenContactCell";
import EmployeesPayrollDrawer from './EmployeesPayrollDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  department_id?: string;
  department_name?: string;
  position?: string;
  employment_status?: string;
  hire_type?: string;
  profile_picture_url?: string;
  joining_date?: string;
}

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  const [currentPage, setCurrentPage] = useState(1);
  const employeesPerPage = 10;

  // State for the drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, [organizationId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('hr_employees')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          phone, 
          employee_id, 
          department_id,
          hr_departments(name),
          position, 
          employment_status,
          hire_type,
          profile_picture_url,
          joining_date
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const formattedEmployees = data.map((emp) => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        employee_id: emp.employee_id,
        department_id: emp.department_id,
        department_name: emp.hr_departments?.name || "N/A",
        position: emp.position || 'N/A',
        employment_status: emp.employment_status || 'Active',
        hire_type: emp.hire_type || 'N/A',
        profile_picture_url: emp.profile_picture_url,
        joining_date: emp.joining_date || 'N/A',
      }));
      
      setEmployees(formattedEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(`Error fetching employees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
    const handleEmployeeAdded = () => {
    fetchEmployees();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('hr_employees')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setEmployees(employees.filter(emp => emp.id !== id));
      toast.success("Employee deleted successfully");
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(`Error deleting employee: ${error.message}`);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    emp.position.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Dashboard card data
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => 
    emp.employment_status?.toLowerCase() === 'active'
  ).length;

  // Pie chart data for department distribution
  const departmentCounts = employees.reduce((acc, emp) => {
    const dept = emp.department_name || 'N/A';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = {
    labels: Object.keys(departmentCounts),
    datasets: [
      {
        data: Object.values(departmentCounts),
        backgroundColor: [
          '#a78bfa',
          '#7c3aed',
          '#d8b4fe',
          '#f3e8ff',
          '#c4b5fd',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'left' as const,
        labels: {
          font: {
            size: 10,
          },
          boxWidth: 10,
          boxHeight: 10,
          padding: 15,
        },
      },
      tooltip: {
        enabled: true,
      },
    },
    layout: {
      padding: 1,
    },
  };
  
  // CSV and PDF download handling
  const downloadCSV = () => {
    const csv = Papa.unparse(
      employees.map(emp => ({
        "Employee ID": emp.employee_id,
        "Name": `${emp.first_name} ${emp.last_name}`,
        "Email": emp.email,
        "Phone": emp.phone,
        "Department": emp.department_name,
        "Status": emp.employment_status,
      }))
    );
  
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    const headers = ["Employee ID", "Name", "Email", "Phone", "Department", "Status"];
    const data = employees.map(emp => [
      emp.employee_id,
      `${emp.first_name} ${emp.last_name}`,
      emp.email,
      emp.phone,
      emp.department_name,
      emp.employment_status,
    ]);

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save('employees.pdf');
  };

  // Handle opening the drawer with employee details
  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDrawerOpen(true);
  };

  return (
    <div className=" mx-auto py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Employees</h1>
   <button
          onClick={onOpen}
          className="flex items-center gap-3 pl-1.5 pr-6 py-1 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-[0_4px_15px_rgba(119,49,232,0.4)] hover:shadow-[0_6px_20px_rgba(119,49,232,0.6)] transform hover:scale-105 transition-all duration-300 group h-10"
        >
          {/* The "Card" Inside (White 3D Bubble) */}
          <div className="relative flex items-center justify-center w-7 h-7 mr-1">
            {/* 1. Glow behind the white card */}
            <div className="absolute inset-0 bg-white blur-md scale-110 opacity-50 animate-pulse"></div>
            
            {/* 2. The White 3D Sphere Container */}
            <div className="relative w-full h-full rounded-full flex items-center justify-center z-10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.2)]"
                 style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff, #f1f5f9)' }}
            >
              {/* 3. The Purple Gradient Plus Icon */}
              <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-5 h-5"
                  style={{ filter: 'drop-shadow(0 2px 2px rgba(119,49,232,0.3))' }}
              >
                  <defs>
                      <linearGradient id="purpleIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#9d5cff" />
                          <stop offset="100%" stopColor="#5b21b6" />
                      </linearGradient>
                  </defs>
                  <path 
                      d="M12 6V18M6 12H18" 
                      stroke="url(#purpleIconGrad)" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                  />
              </svg>
            </div>
          </div>
          
          {/* Button Text */}
          <span className="tracking-wide text-sm relative z-10">Add Employee</span>
        </button>
        {/* --- REPLACED BUTTON END --- */}

        <AddEmployeeModal isOpen={isOpen} onClose={onClose} onEmployeeAdded={handleEmployeeAdded} />
      </div>
      
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-40">
            <Users className="h-16 w-16 text-purple-600 mb-4" />
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground text-center mt-2">All employees in the organization</p>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-40">
            <UserCheck className="h-16 w-16 text-purple-600 mb-4" />
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground text-center mt-2">Currently active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-sm font-medium">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 justify-between">
              <div className="flex-1">
                <Pie options={pieChartOptions} data={pieChartData} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
<CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            
            {/* Search Bar (Rounded & Gray Style) */}
            <div className="relative w-full sm:w-[320px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                placeholder="Search employees..."
                className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm transition-all focus-visible:ring-[#7731E8]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

{/* Download Button with Dropdown (Clean Style) */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-6 py-2 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-md hover:shadow-lg transition-all duration-200 outline-none h-10">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </DropdownMenuTrigger>
                
                {/* Dropdown Content */}
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-xl border-purple-100 bg-white/95 backdrop-blur-sm mt-2">
                  
                  {/* CSV Option */}
                  <DropdownMenuItem 
                    onClick={downloadCSV} 
                    className="cursor-pointer rounded-xl text-gray-700 font-medium py-2.5 px-3 mb-1 transition-colors hover:bg-[#7731E8] hover:text-white focus:bg-[#7731E8] focus:text-white outline-none"
                  >
                    Download CSV
                  </DropdownMenuItem>
                  
                  {/* PDF Option */}
                  <DropdownMenuItem 
                    onClick={downloadPDF} 
                    className="cursor-pointer rounded-xl text-gray-700 font-medium py-2.5 px-3 transition-colors hover:bg-[#7731E8] hover:text-white focus:bg-[#7731E8] focus:text-white outline-none"
                  >
                    Download PDF
                  </DropdownMenuItem>
                  
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading employees...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
<TableHeader className="bg-gradient-to-r from-purple-600 to-violet-600">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-bold">Employee</TableHead>
                    <TableHead className="text-white font-bold">Contact</TableHead>
                    <TableHead className="text-white font-bold">Department</TableHead>
                    <TableHead className="text-white font-bold">Status</TableHead>
                    <TableHead className="text-right w-20 px-10 text-white font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        {search ? "No employees match your search." : "No employees found. Add some!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell
                          onClick={() => navigate(`/employee/profile/${employee.id}`)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {employee.profile_picture_url ? (
                              <img
                                src={employee.profile_picture_url}
                                alt={`${employee.first_name} ${employee.last_name}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                {employee.first_name[0]}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <span className="w-fit bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                                  ID: {employee.employee_id}
                                </span>
                                <span
                                  className={`w-fit text-xs px-2 py-0.5 rounded-full ${
                                    employee.hire_type === 'Full Time'
                                      ? 'bg-purple-100 text-purple-800'
                                      : employee.hire_type === 'Contract'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : employee.hire_type === 'Internship'
                                      ? 'bg-blue-100 text-blue-800'
                                      : employee.hire_type === 'Part Time'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {employee.hire_type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
          
                        <HiddenContactCell
                          email={employee.email}
                          phone={employee.phone}
                          candidateId={employee.id}
                        />
          
                        <TableCell>{employee.department_name}</TableCell>
          
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              employee.employment_status?.toLowerCase() === 'active'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
                            }`}
                          >
                            {employee.employment_status?.toLowerCase() === 'active'
                              ? 'Active'
                              : employee.employment_status}
                          </span>
                        </TableCell>
          
                   <TableCell className="text-right">
                          <div className="flex justify-end">
                            <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200">
                              
                              {/* Payroll/Details Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-500 hover:bg-[#7731E8] hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(employee);
                                }}
                              >
                                <HandCoins className="h-3.5 w-3.5" />
                              </Button>

                              {/* Edit Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-500 hover:bg-[#7731E8] hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employee/${employee.id}`);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-slate-500 hover:bg-red-600 hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(employee.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, filteredEmployees.length)} of {filteredEmployees.length} employees
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer for Adding Payment */}
      <EmployeesPayrollDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        selectedEmployee={selectedEmployee}
      />
    </div>
  );
};

export default EmployeeList;