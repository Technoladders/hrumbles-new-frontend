
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  User,
  Building,
  Mail,
  Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from 'react-redux';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  reporting_manager_id?: string;
  profile_picture_url?: string;
  department_name?: string;
  role_name?: string;
  children?: Employee[];
}

interface OrganizationalChartProps {
  onEmployeeSelect?: (employee: Employee) => void;
}

const OrganizationalChart: React.FC<OrganizationalChartProps> = ({ onEmployeeSelect }) => {
        const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hierarchyData, setHierarchyData] = useState<Employee[]>([]);
  const [directUsers, setDirectUsers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      buildHierarchy();
    }
  }, [employees, searchTerm]);

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
          position,
          reporting_manager_id,
          profile_picture_url,
          department:hr_departments(name),
          role:hr_roles(name)
        `)
        .eq('status', 'active')
        .eq('organization_id', organizationId)
        .order('first_name');

      if (error) throw error;

      const formattedEmployees = (data || []).map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        reporting_manager_id: emp.reporting_manager_id,
        profile_picture_url: emp.profile_picture_url,
        department_name: emp.department?.name,
        role_name: emp.role?.name,
        children: []
      }));

      setEmployees(formattedEmployees);
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

  const buildHierarchy = () => {
    const employeeMap = new Map<string, Employee>();
    const filteredEmployees = employees.filter(emp => 
      searchTerm === '' || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Create map of all employees
    filteredEmployees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] });
    });

    const rootNodes: Employee[] = [];
    const directUsersArray: Employee[] = [];

    // Build hierarchy
    filteredEmployees.forEach(emp => {
      const employee = employeeMap.get(emp.id)!;
      
      if (emp.reporting_manager_id && employeeMap.has(emp.reporting_manager_id)) {
        const manager = employeeMap.get(emp.reporting_manager_id)!;
        manager.children = manager.children || [];
        manager.children.push(employee);
      } else if (emp.reporting_manager_id) {
        // Manager exists but not in filtered results, still show as root
        rootNodes.push(employee);
      } else {
        // No reporting manager
        directUsersArray.push(employee);
      }
    });

    // Find actual root nodes (managers who are not subordinates)
    filteredEmployees.forEach(emp => {
      const employee = employeeMap.get(emp.id)!;
      const isManager = filteredEmployees.some(e => e.reporting_manager_id === emp.id);
      const hasManager = emp.reporting_manager_id && employeeMap.has(emp.reporting_manager_id);
      
      if (isManager && !hasManager && !rootNodes.includes(employee) && !directUsersArray.includes(employee)) {
        rootNodes.push(employee);
      }
    });

    setHierarchyData(rootNodes);
    setDirectUsers(directUsersArray);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const renderEmployeeCard = (employee: Employee, level: number = 0) => {
    const hasChildren = employee.children && employee.children.length > 0;
    const isExpanded = expandedNodes.has(employee.id);
    const paddingLeft = level * 20;

    return (
      <div key={employee.id} className="mb-2">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onEmployeeSelect?.(employee)}
        >
          <CardContent className="p-4" style={{ paddingLeft: `${16 + paddingLeft}px` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(employee.id);
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={employee.profile_picture_url} />
                  <AvatarFallback>
                    {getInitials(employee.first_name, employee.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    {hasChildren && (
                      <Badge variant="secondary" className="text-xs">
                        Manager
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-gray-600">
                    {employee.position && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{employee.position}</span>
                      </div>
                    )}
                    
                    {employee.department_name && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{employee.department_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{employee.email}</span>
                    </div>
                    
                    {employee.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {hasChildren && (
                <Badge variant="outline" className="text-xs">
                  {employee.children?.length} direct report{employee.children?.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2 border-l-2 border-gray-200 pl-2">
            {employee.children?.map(child => renderEmployeeCard(child, level + 1))}
          </div>
        )}
      </div>
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organizational Chart
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visualize your organization's reporting structure and hierarchy
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedNodes(new Set(employees.map(e => e.id)))}
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedNodes(new Set())}
              >
                Collapse All
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Management Hierarchy */}
            {hierarchyData.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Management Hierarchy
                </h3>
                <div className="space-y-2">
                  {hierarchyData.map(manager => renderEmployeeCard(manager))}
                </div>
              </div>
            )}

            {/* Direct Users Section */}
            {directUsers.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Direct Users ({directUsers.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Employees without assigned reporting managers
                </p>
                <div className="space-y-2">
                  {directUsers.map(user => renderEmployeeCard(user))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {hierarchyData.length === 0 && directUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchTerm ? 'No matching employees found' : 'No employees found'}
                </h3>
                <p className="text-sm text-gray-500">
                  {searchTerm 
                    ? 'Try adjusting your search criteria'
                    : 'Start by adding employees to your organization'
                  }
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationalChart;
