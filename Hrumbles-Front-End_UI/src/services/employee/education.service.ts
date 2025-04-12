
import { supabase } from "@/integrations/supabase/client";
import { Education } from "../types/employee.types";
import { uploadDocument } from "@/utils/uploadDocument";

export const educationService = {
  async fetchEducation(employeeId: string) {
    const { data, error } = await supabase
      .from('hr_employee_education')
      .select('employee_id, type, document_url, institute, year_completed')
      .eq('employee_id', employeeId);

    if (error) throw error;
    return data;
  },

  async createEducation(employeeId: string, education: Education) {
    const educationData = [
      { 
        employee_id: employeeId, 
        type: 'ssc',
        document_url: null,
        institute: education.institute,
        year_completed: education.yearCompleted
      },
      { 
        employee_id: employeeId, 
        type: 'hsc',
        document_url: null,
        institute: education.institute,
        year_completed: education.yearCompleted
      },
      { 
        employee_id: employeeId, 
        type: 'degree',
        document_url: null,
        institute: education.institute,
        year_completed: education.yearCompleted
      }
    ];

    const { error } = await supabase
      .from('hr_employee_education')
      .insert(educationData);

    if (error) throw error;
  },

  async updateEducation(employeeId: string, education: Partial<Education>) {
    try {
      // Handle document uploads
      if (education.ssc instanceof File) {
        const url = await uploadDocument(education.ssc, 'education', employeeId);
        const { error } = await supabase
          .from('hr_employee_education')
          .update({ document_url: url })
          .eq('employee_id', employeeId)
          .eq('type', 'ssc');

        if (error) throw error;
      }

      if (education.hsc instanceof File) {
        const url = await uploadDocument(education.hsc, 'education', employeeId);
        const { error } = await supabase
          .from('hr_employee_education')
          .update({ document_url: url })
          .eq('employee_id', employeeId)
          .eq('type', 'hsc');

        if (error) throw error;
      }

      if (education.degree instanceof File) {
        const url = await uploadDocument(education.degree, 'education', employeeId);
        const { error } = await supabase
          .from('hr_employee_education')
          .update({ document_url: url })
          .eq('employee_id', employeeId)
          .eq('type', 'degree');

        if (error) throw error;
      }

      // Handle institute and year_completed updates if present
      if (education.institute || education.yearCompleted) {
        const updateData = {
          institute: education.institute,
          year_completed: education.yearCompleted
        };

        const { error } = await supabase
          .from('hr_employee_education')
          .update(updateData)
          .eq('employee_id', employeeId);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error updating education:", error);
      throw error;
    }
  }
};
