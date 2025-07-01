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

      // Only update if data has changed
      if (!isEqual(employees, employeesWithProjectsFlag)) {
        setEmployees(employeesWithProjectsFlag);
      }

      // Set first employee if none selected
      if (employeesWithProjectsFlag.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employeesWithProjectsFlag[0]);
      }

      // Update selected employee only if data has changed
      if (selectedEmployee) {
        const updatedSelectedEmployee = employeesWithProjectsFlag.find(
          emp => emp.id === selectedEmployee.id
        );
        if (updatedSelectedEmployee && !isEqual(selectedEmployee, updatedSelectedEmployee)) {
          setSelectedEmployee(updatedSelectedEmployee);
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
      toast('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [employees, selectedEmployee, setEmployees, setSelectedEmployee]);

  useEffect(() => {
    console.log('useEmployees useEffect: Fetching employees', { refreshTrigger });
    fetchEmployees();
  }, [fetchEmployees, refreshTrigger]);

  const selectEmployee = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && !isEqual(selectedEmployee, employee)) {
      setSelectedEmployee(employee);
    }
  }, [employees, selectedEmployee, setSelectedEmployee]);

  const refreshEmployees = useCallback(() => {
    console.log('refreshEmployees called');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    employees,
    currentEmployee: selectedEmployee,
    selectEmployee,
    loading,
    error,
    refreshEmployees
  }), [employees, selectedEmployee, selectEmployee, loading, error, refreshEmployees]);
};