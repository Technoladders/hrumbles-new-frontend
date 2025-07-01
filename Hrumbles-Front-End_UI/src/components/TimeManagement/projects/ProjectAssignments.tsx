import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Plus, X } from "lucide-react";
import { Project, Employee, ProjectAssignment } from "@/types/project-types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectAssignmentsProps {
  projects: Project[];
  employees: Employee[];
  assignments?: ProjectAssignment[];
  onAssignEmployee?: (projectId: string, employeeId: string) => Promise<{ success: boolean, message: string }>;
  onRemoveEmployee?: (projectId: string, employeeId: string) => Promise<{ success: boolean, message: string }>;
}

export const ProjectAssignments = ({ 
  projects, 
  employees,
  assignments = [],
  onAssignEmployee,
  onRemoveEmployee
}: ProjectAssignmentsProps) => {
  const [projectAssignments, setProjectAssignments] = useState<{[key: string]: ProjectAssignment[]}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  console.log("projectassignments: ", employees);

  // Process assignments when projects or assignments change
  useEffect(() => {
    if (projects.length > 0) {
      processAssignments();
    }
  }, [projects, assignments]);

  const processAssignments = () => {
    setLoading(true);

    // Group assignments by project
    const assignmentsByProject: {[key: string]: ProjectAssignment[]} = {};

    // Initialize all projects with empty arrays
    projects.forEach(project => {
      assignmentsByProject[project.id] = [];
    });

    // Fill in the assignments with employee details
    assignments.forEach(assignment => {
      if (assignment.hr_employees && assignment.project_id in assignmentsByProject) {
        assignmentsByProject[assignment.project_id].push(assignment);
      }
    });

    setProjectAssignments(assignmentsByProject);
    setLoading(false);
  };

  const handleAssignEmployee = async () => {
    if (!selectedProject || !selectedEmployee) {
      toast.error('Please select both a project and an employee');
      return;
    }

    if (onAssignEmployee) {
      const result = await onAssignEmployee(selectedProject, selectedEmployee);
      
      if (result.success) {
        toast.success(result.message);
        setAssignDialogOpen(false);
        setSelectedProject("");
        setSelectedEmployee("");
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleRemoveEmployee = async (projectId: string, employeeId: string) => {
    if (onRemoveEmployee) {
      const result = await onRemoveEmployee(projectId, employeeId);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Project Assignments
          </CardTitle>
          <CardDescription>
            Employees assigned to each project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground">Loading assignments...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No projects available</p>
                <p className="text-sm">Create a project first to assign employees</p>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="rounded-lg border p-3">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground mb-2">{project.client || 'No client'}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectAssignments[project.id] && projectAssignments[project.id].length > 0 ? (
                      projectAssignments[project.id].map((assignment) => {
                        const employeeName = `${assignment.hr_employees.first_name}${assignment.hr_employees.last_name ? ' ' + assignment.hr_employees.last_name : ''}`;
                        return (
                          <div key={assignment.id} className="mb-2">
                            <Badge variant="outline" className="px-2 py-1 flex items-center gap-1">
                              {employeeName} ({assignment.hr_departments?.name || 'No department'})
                              {onRemoveEmployee && (
                                <X
                                  className="h-3 w-3 ml-1 cursor-pointer"
                                  onClick={() => handleRemoveEmployee(project.id, assignment.assign_employee)}
                                />
                              )}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1 ml-2">
                              <p>Status: {assignment.status}</p>
                              <p>Start: {assignment.start_date}</p>
                              {assignment.end_date && <p>End: {assignment.end_date}</p>}
                              {assignment.salary > 0 && <p>Salary: ${assignment.salary.toLocaleString()}</p>}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <Badge variant="outline" className="px-2 py-1 text-muted-foreground">
                        No employees assigned
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Directory
            </CardTitle>
            <CardDescription>
              All employees in the system
            </CardDescription>
          </div>
          {onAssignEmployee && (
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Employee to Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700">Project</label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="employee" className="block text-sm font-medium text-gray-700">Employee</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} - {employee?.hr_departments?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignEmployee} className="w-full">
                    Assign Employee
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.first_name} {employee.last_name}</TableCell>
                    <TableCell>{employee?.hr_departments?.name}</TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                      No employees found. Create a new employee to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};