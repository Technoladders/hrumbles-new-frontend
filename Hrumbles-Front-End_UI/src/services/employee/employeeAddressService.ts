
import { supabase } from "@/integrations/supabase/client";
import { Address } from "../types/employee.types";

export const employeeAddressService = {
  async updateAddresses(employeeId: string, presentAddress: Address, permanentAddress: Address) {
    // Delete existing addresses
    await supabase
      .from('hr_employee_addresses')
      .delete()
      .eq('employee_id', employeeId);

    // Insert new addresses
    const addressesToInsert = [
      {
        employee_id: employeeId,
        type: 'present',
        address_line1: presentAddress.addressLine1,
        country: presentAddress.country,
        state: presentAddress.state,
        city: presentAddress.city,
        zip_code: presentAddress.zipCode
      },
      {
        employee_id: employeeId,
        type: 'permanent',
        address_line1: permanentAddress.addressLine1,
        country: permanentAddress.country,
        state: permanentAddress.state,
        city: permanentAddress.city,
        zip_code: permanentAddress.zipCode
      }
    ];

    const { error } = await supabase
      .from('hr_employee_addresses')
      .insert(addressesToInsert);

    if (error) throw error;
  }
};
