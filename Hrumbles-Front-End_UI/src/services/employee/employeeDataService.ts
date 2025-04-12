
import { supabase } from "@/integrations/supabase/client";
import { EmployeeBasicInfo, EmployeeDetailsResponse } from "../types/employee.types";

export const employeeDataService = {
  async fetchEmployeeDetails(employeeId: string) {
    const { data: employeeWithRelations, error: queryError } = await supabase
      .rpc('get_employee_details', {
        p_employee_id: employeeId
      });

    if (queryError) throw queryError;
    if (!employeeWithRelations) throw new Error('Employee not found');

    return (employeeWithRelations as unknown) as EmployeeDetailsResponse;
  },

  async updateBasicInfo(employeeId: string, data: EmployeeBasicInfo) {
    const { error } = await supabase
      .from('hr_employees')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        blood_group: data.bloodGroup,
        marital_status: data.maritalStatus
      })
      .eq('id', employeeId);

    if (error) throw error;
  }
};
