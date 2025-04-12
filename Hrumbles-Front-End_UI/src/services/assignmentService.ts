import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fetch employees for the given organization
export const fetchEmployees = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email, department_id, role_id')
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }

    return data.map(employee => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.last_name}`
    }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

// Fetch departments for the given organization
export const fetchDepartments = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_departments')
      .select('id, name')
      .eq('organization_id', organizationId);

    if (error) {
      throw error;
    }

    return data.map(department => ({
      value: department.id,
      label: department.name
    }));
  } catch (error) {
    console.error("Error fetching departments:", error);
    throw error;
  }
};

// Fetch vendors for the given organization
export const fetchVendors = async (organizationId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_clients')
      .select('id, client_name')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    return data.map(vendor => ({
      value: vendor.id,
      label: vendor.client_name
    }));
  } catch (error) {
    console.error("Error fetching vendors:", error);
    throw error;
  }
};

// Fetch existing job assignments
export const fetchJobAssignments = async (jobId: string) => {
  try {
    const { data, error } = await supabase
      .from('hr_jobs')
      .select('assigned_to, budget, budget_type')
      .eq('id', jobId)
      .single();

    if (error) {
      throw error;
    }

    const assignedTo = data?.assigned_to;
    // Use top-level fields if present, fall back to assigned_to for old data
    const budget = data?.budget ?? assignedTo?.budget ?? null;
    const budgetType = data?.budget_type ?? assignedTo?.budgetType ?? null;

    if (!assignedTo) {
      return {
        assignments: [],
        budget,
        budgetType
      };
    }

    if (assignedTo.type === 'individual') {
      const employeeIds = assignedTo.id.split(',');
      const { data: employees, error: empError } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      if (empError) throw empError;

      const assignments = employees.map(emp => ({
        value: emp.id,
        label: `${emp.first_name} ${emp.last_name}`
      }));

      return {
        assignments,
        budget,
        budgetType
      };
    }

    return {
      assignments: [{
        value: assignedTo.id,
        label: assignedTo.name
      }],
      budget,
      budgetType
    };
  } catch (error) {
    console.error("Error fetching job assignments:", error);
    throw error;
  }
};

export const assignJob = async (
  jobId: string, 
  assignmentType: 'individual' | 'team' | 'vendor', 
  assignmentId: string,
  assignmentName: string,
  budget?: string,
  budgetType?: string,
  userId?: string
) => {
  try {
    const assignmentData = {
      assigned_to: {
        type: assignmentType,
        id: assignmentId,
        name: assignmentName
      },
      budget: budget ? Number(budget) : null,  // Save to top-level column
      budget_type: budgetType || null,        // Save to top-level column
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('hr_jobs')
      .update(assignmentData)
      .eq('id', jobId)
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error("Error assigning job:", error);
    throw error;
  }
};