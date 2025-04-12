
import { supabase } from "@/integrations/supabase/client";
import { FamilyMember } from "../types/employee.types";

export const employeeFamilyService = {
  async updateFamilyDetails(employeeId: string, familyMembers: FamilyMember[]) {
    // Delete existing family details
    await supabase
      .from('hr_employee_family_details')
      .delete()
      .eq('employee_id', employeeId);

    if (familyMembers.length === 0) return;

    // Insert new family details
    const familyDetailsToInsert = familyMembers.map(member => ({
      employee_id: employeeId,
      name: member.name,
      relationship: member.relationship,
      occupation: member.occupation,
      phone: member.phone
    }));

    const { error } = await supabase
      .from('hr_employee_family_details')
      .insert(familyDetailsToInsert);

    if (error) throw error;
  }
};
