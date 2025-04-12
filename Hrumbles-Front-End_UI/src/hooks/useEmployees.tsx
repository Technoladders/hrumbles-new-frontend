
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  gender?: string;
  blood_group?: string;
  employment_status?: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
      toast.error('Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return { employees, isLoading, error, refetch: fetchEmployees };
};
