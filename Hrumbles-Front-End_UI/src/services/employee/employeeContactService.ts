
import { supabase } from "@/integrations/supabase/client";
import { EmergencyContact } from "../types/employee.types";

export const employeeContactService = {
  async updateEmergencyContacts(employeeId: string, contacts: EmergencyContact[]) {
    // Delete existing contacts
    await supabase
      .from('hr_employee_emergency_contacts')
      .delete()
      .eq('employee_id', employeeId);

    if (contacts.length === 0) return;

    // Insert new contacts
    const contactsToInsert = contacts.map(contact => ({
      employee_id: employeeId,
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone
    }));

    const { error } = await supabase
      .from('hr_employee_emergency_contacts')
      .insert(contactsToInsert);

    if (error) throw error;
  }
};
