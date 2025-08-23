
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Search, Shield, Clock, Building, Edit, Eye, Trash2, UserRoundPen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import BulkActionsBar from './BulkActionsBar';
import { useSelector } from 'react-redux';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'terminated';
  employment_start_date?: string;
  last_login?: string;
  role_name?: string;
  department_name?: string;
  team_name?: string;
}

const UserManagementDashboard = () => {
        const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
      const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Employee | null>(null);
  
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    terminated: 0
  });
  const { toast } = useToast();

     const roleDisplayNameMap: { [key: string]: string } = {
        organization_superadmin: 'Super Admin',
        admin: 'Admin',
        employee: 'User',
    };

useEffect(() => {
        // MODIFICATION: The entire fetch function is replaced
        const fetchEmployees = async () => {
            if (!organizationId) {
                setEmployees([]);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                
                // Call the PostgreSQL function using rpc()
                const { data, error } = await supabase
                    .rpc('get_employees_with_details', {
                        org_id: organizationId
                    });

                if (error) throw error;

                // The data is already flat, so mapping is simpler
                const formattedEmployees = data.map(emp => ({
                    ...emp,
                    status: (emp.status || 'active') as 'active' | 'inactive' | 'terminated',
                    role_display_name: roleDisplayNameMap[emp.role_name] || emp.role_name,
                })) || [];

                setEmployees(formattedEmployees);
                setStats({
                    total: formattedEmployees.length,
                    active: formattedEmployees.filter(e => e.status === 'active').length,
                    inactive: formattedEmployees.filter(e => e.status === 'inactive').length,
                    terminated: formattedEmployees.filter(e => e.status === 'terminated').length,
                });

            } catch (error: any) {
                toast({ title: "Error", description: `Failed to fetch employees: ${error.message}`, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [organizationId, toast]);

  console.log('employees', employees)
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_employees')
        .select(`
*,
  hr_roles!inner(name),
  hr_departments(name),
  hr_team_members!hr_team_members_employee_id_fkey(team:hr_teams(name))
        `)
        .order('created_at', { ascending: false })
        .eq('organization_id', organizationId);

      if (error) throw error;

      const formattedEmployees = data?.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        status: (emp.status || 'active') as 'active' | 'inactive' | 'terminated',
        employment_start_date: emp.employment_start_date,
        last_login: emp.last_login,
        role_name: emp.hr_roles?.name,
        department_name: emp.hr_departments?.name,
        team_name: emp.hr_teams?.[0]?.name
      })) || [];

      setEmployees(formattedEmployees);
      
      // Calculate stats
      const statsData = {
        total: formattedEmployees.length,
        active: formattedEmployees.filter(emp => emp.status === 'active').length,
        inactive: formattedEmployees.filter(emp => emp.status === 'inactive').length,
        terminated: formattedEmployees.filter(emp => emp.status === 'terminated').length
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('hr_employees')
        .update({ 
          status: newStatus,
          last_working_day: newStatus === 'terminated' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', userId);

      if (error) throw error;

      await fetchEmployees();
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-yellow-100 text-yellow-800">Inactive</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

     const handleEditClick = (employee: Employee) => {
        setEditingUser(employee);
        setShowEditModal(true);
    };

    const getStatusSelectClass = (status: string) => {
        switch (status) {
            case 'active': return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
            case 'inactive': return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
            case 'terminated': return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
        }
    };
  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === filteredEmployees.length 
        ? [] 
        : filteredEmployees.map(emp => emp.id)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminated</CardTitle>
            <Building className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.terminated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main User Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users, roles, and permissions across your organization
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedUsers.length}
              onDeactivate={() => {
                selectedUsers.forEach(userId => handleStatusChange(userId, 'inactive'));
                setSelectedUsers([]);
              }}
              onActivate={() => {
                selectedUsers.forEach(userId => handleStatusChange(userId, 'active'));
                setSelectedUsers([]);
              }}
              onClear={() => setSelectedUsers([])}
            />
          )}

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-10">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                     <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(employee.id)}
                        onChange={() => handleSelectUser(employee.id)}
                        className="rounded"
                      />
                    </TableCell>
                      <TableCell className="font-medium">{employee.first_name} {employee.last_name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell><Badge variant="outline">{employee.role_display_name}</Badge></TableCell>
                      <TableCell>{employee.department_name || '-'}</TableCell>
                      <TableCell>
                        <Select value={employee.status} onValueChange={(newStatus) => handleStatusChange(employee.id, newStatus)}>
                          <SelectTrigger className={`h-8 w-[110px] text-xs font-semibold ${getStatusSelectClass(employee.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
          <TableCell>
  {employee.last_login
    ? new Date(employee.last_login).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true, // use 12-hour format (AM/PM), remove if you want 24-hour
      })
    : "Never"}
</TableCell>


                      <TableCell>
                        <TooltipProvider delayDuration={100}>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(employee)}>
                                  <UserRoundPen className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>View Details</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(employee)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit User</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddUserModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchEmployees();
          setShowAddModal(false);
        }}
      />
      
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={fetchEmployees}
        />
      )}
       {editingUser && (
                <EditUserModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                    }}
                    onSuccess={() => {
                        fetchEmployees();
                        setShowEditModal(false);
                        setEditingUser(null);
                    }}
                    user={editingUser}
                />
            )}
    </div>
  );
};

export default UserManagementDashboard;
