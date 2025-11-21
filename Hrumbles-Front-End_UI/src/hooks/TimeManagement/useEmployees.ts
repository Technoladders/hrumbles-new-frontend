import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Employee } from '@/types/time-tracker-types';
import { useEmployeeContext } from '@/context/EmployeeContext';
import { toast } from 'sonner';
import isEqual from 'lodash/isEqual';

export const useEmployees = () => {
  const { employees, setEmployees, selectedEmployee, setSelectedEmployee } = useEmployeeContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ✅ FIX: Removed dependencies on `employees` and `selectedEmployee`
  // The function now uses functional updates to safely interact with state.
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch project assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('hr_project_employees')
        .select('assign_employee');

      if (assignmentsError) throw assignmentsError;

      const employeesWithProjects = new Set(assignmentsData.map(assignment => assignment.assign_employee));

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('hr_employees')
        .select('*, hr_departments(name)');

      if (employeesError) throw employeesError;

      const employeesWithProjectsFlag = employeesData?.map(emp => ({
        ...emp,
        has_projects: employeesWithProjects.has(emp.id)
      })) || [];

      // ✅ FIX: Use functional update for setting employees
      setEmployees(prevEmployees => {
        if (isEqual(prevEmployees, employeesWithProjectsFlag)) {
          return prevEmployees; // If data is identical, don't update state
        }
        return employeesWithProjectsFlag;
      });

      // ✅ FIX: Use functional update for setting the selected employee
      setSelectedEmployee(prevSelected => {
        // If nothing was selected previously, select the first employee
        if (employeesWithProjectsFlag.length > 0 && !prevSelected) {
          return employeesWithProjectsFlag[0];
        }

        // If something was selected, find its updated version
        if (prevSelected) {
          const updatedSelectedEmployee = employeesWithProjectsFlag.find(
            emp => emp.id === prevSelected.id
          );
          // Only update if the data has actually changed
          if (updatedSelectedEmployee && !isEqual(prevSelected, updatedSelectedEmployee)) {
            return updatedSelectedEmployee;
          }
        }
        
        // Otherwise, keep the current selection
        return prevSelected;
      });

    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
      toast.error('Failed to load employees'); // Use toast.error for errors
    } finally {
      setLoading(false);
    }
  }, [setEmployees, setSelectedEmployee]); // Dependencies are now stable

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees, refreshTrigger]);

  const selectEmployee = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee) {
      // Use functional update here as well for consistency and to avoid stale closures
      setSelectedEmployee(prevSelected => {
        if (!isEqual(prevSelected, employee)) {
          return employee;
        }
        return prevSelected;
      });
    }
  }, [employees, setSelectedEmployee]);

  const refreshEmployees = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return useMemo(() => ({
    employees,
    currentEmployee: selectedEmployee,
    selectEmployee,
    loading,
    error,
    refreshEmployees
  }), [employees, selectedEmployee, selectEmployee, loading, error, refreshEmployees]);
};