import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project, Employee, ProjectAssignment } from "@/types/project-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
// In-memory storage to simulate persistence between component unmounts
const sessionStorage = {
  projects: [] as Project[],
  employees: [] as Employee[],
  assignments: [] as ProjectAssignment[],
  initialized: false,
  lastFetch: 0
};

export const useProjectData = () => {
  const [projects, setProjects] = useState<Project[]>(sessionStorage.projects);
  const [employees, setEmployees] = useState<Employee[]>(sessionStorage.employees);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>(sessionStorage.assignments);
  const [loading, setLoading] = useState(!sessionStorage.initialized);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  const fetchProjects = async () => {
    try {
      console.log("Fetching projects...");
      const { data, error } = await supabase
        .from('hr_projects')
        .select(`
          *,
          hr_clients:client_id (
            client_name
          )
        `);
      
      if (error) throw error;
      
      console.log("Projects fetched:", data);
      if (data) {
        setProjects(data as Project[]);
        sessionStorage.projects = data as Project[];
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      console.log("Fetching employees...");
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name)');
      
      if (error) throw error;
      
      console.log("Employees fetched:", data);
      if (data) {
        setEmployees(data as Employee[]);
        sessionStorage.employees = data as Employee[];
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      console.log("Fetching project assignments...");
      const { data, error } = await supabase
        .from('hr_project_employees')
        .select('*, hr_employees(first_name, last_name, hr_departments(name))');
      
      if (error) throw error;
      
      console.log("Project assignments fetched:", data);
      if (data) {
        setAssignments(data as ProjectAssignment[]);
        sessionStorage.assignments = data as ProjectAssignment[];
      }
    } catch (error) {
      console.error('Error fetching project assignments:', error);
    }
  };

  const assignEmployeeToProject = async (projectId: string, employeeId: string) => {
    try {
      const exists = assignments.some(
        assignment => assignment.project_id === projectId && assignment.employee_id === employeeId
      );
      
      if (exists) {
        console.log("Assignment already exists");
        return { success: false, message: "Employee is already assigned to this project" };
      }

      const { data, error } = await supabase
        .from('hr_project_employees')
        .insert({
          project_id: projectId,
          employee_id: employeeId,
          organization_id
        });
      
      if (error) throw error;
      
      console.log("Employee assigned to project:", data);
      
      if (data) {
        const newAssignment = Array.isArray(data) ? data[0] : data;
        const updatedAssignments = [...assignments, newAssignment as ProjectAssignment];
        sessionStorage.assignments = updatedAssignments;
        setAssignments(updatedAssignments);
      } else {
        const mockAssignment: ProjectAssignment = {
          id: crypto.randomUUID(),
          project_id: projectId,
          employee_id: employeeId,
          assigned_at: new Date().toISOString()
        };
        const updatedAssignments = [...assignments, mockAssignment];
        sessionStorage.assignments = updatedAssignments;
        setAssignments(updatedAssignments);
      }
      
      return { success: true, message: "Employee assigned to project successfully" };
    } catch (error) {
      console.error('Error assigning employee to project:', error);
      return { success: false, message: "Failed to assign employee to project" };
    }
  };

  const removeEmployeeFromProject = async (projectId: string, employeeId: string) => {
    try {
      const { error } = await supabase
        .from('hr_project_employees')
        .delete()
        .eq('project_id', projectId)
        .eq('assign_employee', employeeId);
      
      if (error) throw error;
      
      console.log("Employee removed from project");
      
      const updatedAssignments = assignments.filter(
        assignment => !(assignment.project_id === projectId && assignment.employee_id === employeeId)
      );
      sessionStorage.assignments = updatedAssignments;
      setAssignments(updatedAssignments);
      
      return { success: true, message: "Employee removed from project successfully" };
    } catch (error) {
      console.error('Error removing employee from project:', error);
      return { success: false, message: "Failed to remove employee from project" };
    }
  };

  const fetchData = useCallback(async () => {
    const now = Date.now();
    // Skip if data is fresh (within 5 minutes)
    if (sessionStorage.lastFetch && now - sessionStorage.lastFetch < 5 * 60 * 1000) {
      console.log('Skipping fetchData, data is fresh:', { lastFetch: sessionStorage.lastFetch });
      return;
    }
    setLoading(true);
    await Promise.all([fetchProjects(), fetchEmployees(), fetchAssignments()]);
    sessionStorage.initialized = true;
    sessionStorage.lastFetch = now;
    setLoading(false);
  }, []);

  const refetchData = useCallback(() => {
    console.log('Refetching project and employee data');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  return {
    projects,
    employees,
    assignments,
    loading,
    refetchData,
    assignEmployeeToProject,
    removeEmployeeFromProject
  };
};