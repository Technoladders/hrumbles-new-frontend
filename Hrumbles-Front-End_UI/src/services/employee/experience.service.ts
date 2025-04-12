
import { supabase } from "@/integrations/supabase/client";
import { Experience } from "../types/employee.types";

export const experienceService = {
  async fetchExperiences(employeeId: string) {
    const { data, error } = await supabase
      .from('hr_employee_experiences')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createExperience(employeeId: string, experience: Experience) {
    const { data, error } = await supabase
      .from('hr_employee_experiences')
      .insert({
        employee_id: employeeId,
        job_title: experience.jobTitle,
        company: experience.company,
        location: experience.location,
        employment_type: experience.employmentType,
        start_date: experience.startDate,
        end_date: experience.endDate,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Handle document uploads if present
    if (experience.offerLetter || experience.separationLetter || experience.payslips?.length > 0) {
      await this.uploadExperienceDocuments(employeeId, data.id, experience);
    }

    return data;
  },

  async updateExperience(employeeId: string, experienceId: string, experience: Experience) {
    const { error } = await supabase
      .from('hr_employee_experiences')
      .update({
        job_title: experience.jobTitle,
        company: experience.company,
        location: experience.location,
        employment_type: experience.employmentType,
        start_date: experience.startDate,
        end_date: experience.endDate
      })
      .eq('id', experienceId)
      .eq('employee_id', employeeId);

    if (error) throw error;

    // Handle document uploads if present
    if (experience.offerLetter || experience.separationLetter || experience.payslips?.length > 0) {
      await this.uploadExperienceDocuments(employeeId, experienceId, experience);
    }
  },

  async deleteExperience(employeeId: string, experienceId: string) {
    const { error } = await supabase
      .from('hr_employee_experiences')
      .update({ status: 'inactive' })
      .eq('id', experienceId)
      .eq('employee_id', employeeId);

    if (error) throw error;
  },

  async uploadExperienceDocuments(
    employeeId: string,
    experienceId: string,
    experience: Experience
  ) {
    const uploadPromises = [];

    if (experience.offerLetter && experience.offerLetter instanceof File) {
      const formData = new FormData();
      formData.append('file', experience.offerLetter);
      formData.append('type', 'experience');
      formData.append('documentType', 'offerLetter');
      formData.append('experienceId', experienceId);

      uploadPromises.push(
        supabase.functions.invoke('upload-document', {
          body: formData
        })
      );
    }

    if (experience.separationLetter && experience.separationLetter instanceof File) {
      const formData = new FormData();
      formData.append('file', experience.separationLetter);
      formData.append('type', 'experience');
      formData.append('documentType', 'separationLetter');
      formData.append('experienceId', experienceId);

      uploadPromises.push(
        supabase.functions.invoke('upload-document', {
          body: formData
        })
      );
    }

    if (experience.payslips?.length > 0) {
      const filePayslips = experience.payslips.filter((file): file is File => file instanceof File);
      
      uploadPromises.push(
        ...filePayslips.map(file => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'experience');
          formData.append('documentType', 'payslips');
          formData.append('experienceId', experienceId);

          return supabase.functions.invoke('upload-document', {
            body: formData
          });
        })
      );
    }

    await Promise.all(uploadPromises);
  }
};
