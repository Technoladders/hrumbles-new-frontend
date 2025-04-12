
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddEmployeeModal from "../components/Employee1/AddEmployeeModal";
import { useSelector, useDispatch } from "react-redux";
import { useDisclosure } from "@chakra-ui/react";



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
  profile_picture_url?: string;
}

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const dispatch = useDispatch();

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  useEffect(() => {
    fetchEmployees();
  }, [organizationId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Get employees from Supabase
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
          profile_picture_url
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Format employees
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
        profile_picture_url: emp.profile_picture_url,
      }));
      
      setEmployees(formattedEmployees);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error(`Error fetching employees: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
      
      // Remove from local state
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button onClick={onOpen}>+ Add Employee</Button>
      <AddEmployeeModal isOpen={isOpen} onClose={onClose} />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            {/* <CardTitle>Employee Directory</CardTitle> */}
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading employees...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        {search ? "No employees match your search." : "No employees found. Add some!"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow 
                        key={employee.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/employee/profile/${employee.id}`)}
                      >
                        <TableCell>{employee.employee_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {employee.profile_picture_url ? (
                              <img 
                                src={employee.profile_picture_url} 
                                alt={`${employee.first_name} ${employee.last_name}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                {employee.first_name[0]}
                              </div>
                            )}
                            {employee.first_name} {employee.last_name}
                          </div>
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>{employee.department_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            employee.employment_status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {employee.employment_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employee/${employee.id}`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(employee.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeList;
