// src/utils/profileCompletion.ts

import { supabase } from "@/integrations/supabase/client";

// Define a type for the structure your component expects
export interface ProfileSection {
  name: string;
  totalFields: number;
  completedFields: number;
  isComplete: boolean;
  fields: string[];
}

// Helper function to check if a value is "filled"
const isFilled = (value: any): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== null && value !== undefined && value !== "";
};

// Main function to get the detailed breakdown for each section
export const getProfileSectionDetails = async (employeeId: string): Promise<ProfileSection[]> => {
  if (!employeeId) return [];

  // --- 1. Fetch ALL necessary data in parallel for efficiency ---
  const [
    { data: employee, error: employeeError },
    { data: education, error: educationError },
    { data: bank, error: bankError }
  ] = await Promise.all([
    supabase.from("hr_employees").select("*").eq("id", employeeId).single(),
    supabase.from("hr_employee_education").select("*").eq("employee_id", employeeId),
    supabase.from("hr_employee_bank_details").select("*").eq("employee_id", employeeId).single()
  ]);

  if (employeeError) {
    console.error("Error fetching employee:", employeeError);
    return []; // Return an empty array if the main record fails
  }
  
  // --- 2. Define the rules and calculate completion for each section ---
  
  const sections: ProfileSection[] = [];

  // Section: Basic Information
  const basicInfoFields = ["First Name", "Last Name", "Date of Birth", "Gender", "Blood Group"];
  const basicInfoCompleted = [
    isFilled(employee?.first_name),
    isFilled(employee?.last_name),
    isFilled(employee?.date_of_birth),
    isFilled(employee?.gender),
    isFilled(employee?.blood_group)
  ].filter(Boolean).length;
  sections.push({
    name: "Basic Information",
    totalFields: 5,
    completedFields: basicInfoCompleted,
    isComplete: basicInfoCompleted === 5,
    fields: basicInfoFields,
  });

  // Section: Contact Information
  const contactInfoFields = ["Official Email", "Personal Email", "Phone"];
  const contactInfoCompleted = [
    isFilled(employee?.email),
    isFilled(employee?.personal_email),
    isFilled(employee?.phone)
  ].filter(Boolean).length;
  sections.push({
    name: "Contact Information",
    totalFields: 3,
    completedFields: contactInfoCompleted,
    isComplete: contactInfoCompleted === 3,
    fields: contactInfoFields,
  });

  // Section: Address (Checks the JSONB field)
  const addressFields = ["Present Address", "Permanent Address"];
  let addressCompleted = 0;
  if (employee?.present_address &&
      isFilled(employee.present_address.addressLine1) &&
      isFilled(employee.present_address.city) &&
      isFilled(employee.present_address.state)
  ) {
    addressCompleted++;
  }
  if (employee?.permanent_address &&
      isFilled(employee.permanent_address.addressLine1) &&
      isFilled(employee.permanent_address.city) &&
      isFilled(employee.permanent_address.state)
  ) {
    addressCompleted++;
  }
  sections.push({
    name: "Address",
    totalFields: 2,
    completedFields: addressCompleted,
    isComplete: addressCompleted === 2,
    fields: addressFields,
  });

  // Section: Emergency Contacts (Checks the JSONB array)
  const emergencyContactsFields = ["At least one emergency contact"];
  let emergencyContactsCompleted = 0;
  if (employee?.emergency_contacts && 
      Array.isArray(employee.emergency_contacts) &&
      employee.emergency_contacts.some(c => isFilled(c.name) && isFilled(c.phone))
  ) {
    emergencyContactsCompleted = 1;
  }
  sections.push({
    name: "Emergency Contacts",
    totalFields: 1,
    completedFields: emergencyContactsCompleted,
    isComplete: emergencyContactsCompleted === 1,
    fields: emergencyContactsFields,
  });

  // Section: Documents
  const documentsFields = ["Aadhar", "PAN", "Educational Certificates"];
  let documentsCompleted = 0;
  if (isFilled(employee?.aadhar_number)) documentsCompleted++;
  if (isFilled(employee?.pan_number)) documentsCompleted++;
  // Check if at least one education record has a document uploaded
  if (education && education.some(edu => isFilled(edu.document_url))) {
    documentsCompleted++;
  }
  sections.push({
    name: "Documents",
    totalFields: 3,
    completedFields: documentsCompleted,
    isComplete: documentsCompleted === 3,
    fields: documentsFields,
  });

  // Section: Education
  const educationFields = ["At least one qualification"];
  let educationCompleted = 0;
  if (education && education.some(edu => isFilled(edu.institute) && isFilled(edu.year_completed))) {
      educationCompleted = 1;
  }
  sections.push({
    name: "Education",
    totalFields: 1,
    completedFields: educationCompleted,
    isComplete: educationCompleted === 1,
    fields: educationFields,
  });

  // Section: Bank Details
  const bankFields = ["Account Holder Name", "Account Number", "IFSC Code"];
  let bankCompleted = 0;
  if (bank) {
    if (isFilled(bank.account_holder_name)) bankCompleted++;
    if (isFilled(bank.account_number)) bankCompleted++;
    if (isFilled(bank.ifsc_code)) bankCompleted++;
  }
  sections.push({
    name: "Bank Details",
    totalFields: 3,
    completedFields: bankCompleted,
    isComplete: bankCompleted === 3,
    fields: bankFields,
  });

  return sections;
};

// Main function to get the overall percentage, derived from the details
export const calculateProfileCompletion = async (employeeId: string): Promise<{ 
  completionPercentage: number;
}> => {
  const sections = await getProfileSectionDetails(employeeId);
  if (sections.length === 0) {
    return { completionPercentage: 0 };
  }

  const totalPossibleFields = sections.reduce((sum, s) => sum + s.totalFields, 0);
  const totalCompletedFields = sections.reduce((sum, s) => sum + s.completedFields, 0);

  if (totalPossibleFields === 0) {
    return { completionPercentage: 0 };
  }

  // Calculate the final percentage
  const completionPercentage = Math.round((totalCompletedFields / totalPossibleFields) * 100);

  return { completionPercentage };
};