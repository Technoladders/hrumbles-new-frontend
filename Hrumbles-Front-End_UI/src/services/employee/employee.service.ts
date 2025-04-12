import { EmployeeData } from "../types/employee.types";
import { personalInfoService } from "./personalInfo.service";
import { bankDetailsService } from "./bankDetails.service";
import { experienceService } from "./experience.service";
import { educationService } from "./education.service";
import { supabase } from "@/integrations/supabase/client";


export const employeeService = {
  async createEmployee(data: any) {
    try {
      // 1. Insert into `employees` table
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            employee_id: data.employeeId,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            blood_group: data.bloodGroup,
            marital_status: data.maritalStatus,
            profile_picture_url: data.profilePictureUrl,
            aadhar_number: data.documents.find((d: any) => d.documentType === "aadhar")?.documentNumber,
            pan_number: data.documents.find((d: any) => d.documentType === "pan")?.documentNumber,
            uan_number: data.documents.find((d: any) => d.documentType === "uan")?.documentNumber,
            esic_number: data.documents.find((d: any) => d.documentType === "esic")?.documentNumber,
            present_address: data.presentAddress,
            permanent_address: data.sameAsPresent ? data.presentAddress : data.permanentAddress,
          },
        ])
        .select()
        .single();

      if (employeeError) throw employeeError;

      const employeeId = employee.id;

      // 2. Insert into `employee_family_details`
      for (const family of data.familyDetails) {
        await supabase.from("employee_family_details").insert({
          employee_id: employeeId,
          relationship: family.relationship,
          name: family.name,
          occupation: family.occupation,
          phone: family.phone,
        });
      }

      // 3. Insert into `employee_emergency_contacts`
      for (const contact of data.emergencyContacts) {
        await supabase.from("employee_emergency_contacts").insert({
          employee_id: employeeId,
          relationship: contact.relationship,
          name: contact.name,
          phone: contact.phone,
        });
      }

      // 4. Insert into `employee_documents`
      for (const doc of data.documents) {
        await supabase.from("employee_documents").insert({
          employee_id: employeeId,
          document_type: doc.documentType,
          category: "government_id", // Adjust category if needed
          file_name: doc.fileName,
          file_path: doc.documentUrl,
        });
      }

      return { success: true, employeeId };
    } catch (error) {
      console.error("Error creating employee:", error);
      return { success: false, error };
    }
  },
};
