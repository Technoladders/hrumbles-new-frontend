
import { supabase } from "@/integrations/supabase/client";
import { PersonalInfo } from "../types/employee.types";

export const personalInfoService = {
  async checkEmployeeIdExists(employeeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) {
      console.error('Error checking employee ID:', error);
      throw new Error('Failed to check employee ID');
    }

    return !!data;
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error checking email:', error);
      throw new Error('Failed to check email');
    }

    return !!data;
  },

  async checkPhoneExists(phone: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('Error checking phone:', error);
      throw new Error('Failed to check phone');
    }

    return !!data;
  },

  async checkAadharExists(aadharNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('aadhar_number', aadharNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking Aadhar:', error);
      throw new Error('Failed to check Aadhar number');
    }

    return !!data;
  },

  async checkPanExists(panNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('pan_number', panNumber)
      .maybeSingle();

    if (error) {
      console.error('Error checking PAN:', error);
      throw new Error('Failed to check PAN number');
    }

    return !!data;
  },

  async createPersonalInfo(personalInfo: PersonalInfo) {
    try {
      // Check if required unique fields already exist
      const emailExists = await this.checkEmailExists(personalInfo.email);
      if (emailExists) {
        throw new Error(`Email ${personalInfo.email} is already registered`);
      }

      const phoneExists = await this.checkPhoneExists(personalInfo.phone);
      if (phoneExists) {
        throw new Error(`Phone number ${personalInfo.phone} is already registered`);
      }

      const aadharExists = await this.checkAadharExists(personalInfo.aadharNumber);
      if (aadharExists) {
        throw new Error(`Aadhar number ${personalInfo.aadharNumber} is already registered`);
      }

      const panExists = await this.checkPanExists(personalInfo.panNumber);
      if (panExists) {
        throw new Error(`PAN number ${personalInfo.panNumber} is already registered`);
      }

      console.log('Creating employee with data:', personalInfo);

      // Format address objects as plain JSON objects
      const presentAddressJson = {
        addressLine1: personalInfo.presentAddress.addressLine1,
        country: personalInfo.presentAddress.country,
        state: personalInfo.presentAddress.state,
        city: personalInfo.presentAddress.city,
        zipCode: personalInfo.presentAddress.zipCode
      };

      const permanentAddressJson = personalInfo.permanentAddress ? {
        addressLine1: personalInfo.permanentAddress.addressLine1,
        country: personalInfo.permanentAddress.country,
        state: personalInfo.permanentAddress.state,
        city: personalInfo.permanentAddress.city,
        zipCode: personalInfo.permanentAddress.zipCode
      } : null;

      // Map the personalInfo fields to match database column names
      const employeeData = {
        employee_id: personalInfo.employeeId,
        first_name: personalInfo.firstName,
        last_name: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        date_of_birth: personalInfo.dateOfBirth,
        gender: personalInfo.gender,
        blood_group: personalInfo.bloodGroup,
        marital_status: personalInfo.maritalStatus,
        aadhar_number: personalInfo.aadharNumber,
        pan_number: personalInfo.panNumber,
        uan_number: personalInfo.uanNumber,
        esic_number: personalInfo.esicNumber,
        employment_start_date: new Date().toISOString(),
        present_address: presentAddressJson,
        permanent_address: permanentAddressJson,
        profile_picture_url: personalInfo.profilePictureUrl
      };

      const { data: employee, error: employeeError } = await supabase
        .from('hr_employees')
        .insert(employeeData)
        .select()
        .single();

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        throw employeeError;
      }

      console.log('Employee created successfully:', employee);

      // Insert addresses with properly named fields
      const addresses = [
        {
          employee_id: employee.id,
          type: 'present',
          address_line1: personalInfo.presentAddress.addressLine1,
          country: personalInfo.presentAddress.country,
          state: personalInfo.presentAddress.state,
          city: personalInfo.presentAddress.city,
          zip_code: personalInfo.presentAddress.zipCode
        }
      ];

      // Add permanent address if it exists
      if (personalInfo.permanentAddress) {
        addresses.push({
          employee_id: employee.id,
          type: 'permanent',
          address_line1: personalInfo.permanentAddress.addressLine1,
          country: personalInfo.permanentAddress.country,
          state: personalInfo.permanentAddress.state,
          city: personalInfo.permanentAddress.city,
          zip_code: personalInfo.permanentAddress.zipCode
        });
      }

      const { error: addressError } = await supabase
        .from('hr_employee_addresses')
        .insert(addresses);

      if (addressError) {
        console.error('Error creating employee addresses:', addressError);
        throw addressError;
      }

      return employee;
    } catch (error: any) {
      console.error('Error in createPersonalInfo:', error);
      throw new Error(error.message || 'Failed to create employee information');
    }
  },

  async updatePersonalInfo(employeeId: string, personalInfo: Partial<PersonalInfo>) {
    try {
      const { error: employeeError } = await supabase
        .from('hr_employees')
        .update({
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          email: personalInfo.email,
          phone: personalInfo.phone,
          date_of_birth: personalInfo.dateOfBirth,
          gender: personalInfo.gender,
          blood_group: personalInfo.bloodGroup,
          marital_status: personalInfo.maritalStatus,
          aadhar_number: personalInfo.aadharNumber,
          pan_number: personalInfo.panNumber,
          uan_number: personalInfo.uanNumber,
          esic_number: personalInfo.esicNumber
        })
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      if (personalInfo.presentAddress) {
        const { error: addressError } = await supabase
          .from('hr_employee_addresses')
          .upsert({
            employee_id: employeeId,
            type: 'present',
            address_line1: personalInfo.presentAddress.addressLine1,
            country: personalInfo.presentAddress.country,
            state: personalInfo.presentAddress.state,
            city: personalInfo.presentAddress.city,
            zip_code: personalInfo.presentAddress.zipCode
          });

        if (addressError) throw addressError;
      }

      if (personalInfo.permanentAddress) {
        const { error: addressError } = await supabase
          .from('hr_employee_addresses')
          .upsert({
            employee_id: employeeId,
            type: 'permanent',
            address_line1: personalInfo.permanentAddress.addressLine1,
            country: personalInfo.permanentAddress.country,
            state: personalInfo.permanentAddress.state,
            city: personalInfo.permanentAddress.city,
            zip_code: personalInfo.permanentAddress.zipCode
          });

        if (addressError) throw addressError;
      }

      return true;
    } catch (error: any) {
      console.error('Error updating personal info:', error);
      throw new Error(error.message || 'Failed to update personal information');
    }
  }
};
