import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client'; // Adjust path if needed

interface EmployeeContext {
  employeeId: string;
  employeeHasProjects: boolean;
  isLoading: boolean;
}

// We can use a simple cache to avoid re-fetching on every component mount
let hasProjectsCache: boolean | null = null;

export const useEmployeeContext = (): EmployeeContext => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";

  const [employeeHasProjects, setEmployeeHasProjects] = useState(hasProjectsCache ?? false);
  const [isLoading, setIsLoading] = useState(!hasProjectsCache);

  useEffect(() => {
    // If we have a cached value, don't re-fetch
    if (hasProjectsCache !== null) {
      return;
    }

    if (!employeeId) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('hr_project_employees')
          .select('id', { count: 'exact', head: true }) // More efficient query
          .eq('assign_employee', employeeId)
          .neq('status', 'Terminated')
          .or('end_date.is.null,end_date.gte.' + new Date().toISOString().split('T')[0]);

        if (error) throw error;
        
        const hasProjects = (data?.count ?? 0) > 0;
        setEmployeeHasProjects(hasProjects);
        hasProjectsCache = hasProjects; // Store in cache

      } catch (error) {
        console.error('Error fetching employee project status:', error);
        setEmployeeHasProjects(false);
        hasProjectsCache = false;
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [employeeId]);
  
  // Listen for logout to clear the cache
  useEffect(() => {
    if (!employeeId) {
      hasProjectsCache = null;
    }
  }, [employeeId])

  return { employeeId, employeeHasProjects, isLoading };
};