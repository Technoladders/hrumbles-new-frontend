import { supabase } from "@/integrations/supabase/client";

// Define a type for the employee data we are fetching
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Fetches active employees for a given organization.
 * @param organization_id - The UUID of the organization.
 * @returns A promise that resolves to an array of employee objects.
 */
export const fetchEmployees = async (organization_id: string): Promise<Employee[]> => {
  if (!organization_id) {
    console.error("fetchEmployees called without organization_id");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email')
      .eq('organization_id', organization_id)
      .eq('status', 'active') // Only fetch active employees
      .order('first_name', { ascending: true }); // Order them alphabetically

    if (error) {
      throw error;
    }

    // Ensure we return an array even if data is null
    return data || [];

  } catch (error) {
    console.error("Error fetching employees:", error);
    // Return an empty array on error to prevent crashes in the UI
    return [];
  }
};