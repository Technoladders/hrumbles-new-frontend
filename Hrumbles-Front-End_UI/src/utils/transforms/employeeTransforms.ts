
import { EmployeeDetailsResponse } from "@/services/types/employee.types";
import { format } from "date-fns";

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return '';
  }
};

export const transformEmployeeData = (employeeDetails: EmployeeDetailsResponse) => {
  if (!employeeDetails) {
    console.error('No employee details provided to transform');
    return null;
  }

  console.log('Raw employee details:', employeeDetails);

  const transformedData = {
    id: employeeDetails.id,
    employeeId: employeeDetails.employee_id || '',
    firstName: employeeDetails.first_name || '',
    lastName: employeeDetails.last_name || '',
    email: employeeDetails.email || '',
    phone: employeeDetails.phone || '',
    dateOfBirth: employeeDetails.date_of_birth || '',
    gender: employeeDetails.gender || '',
    bloodGroup: employeeDetails.blood_group || '',
    maritalStatus: employeeDetails.marital_status || '',
    department: employeeDetails.department || '',
    position: employeeDetails.position || '',
    employmentStatus: employeeDetails.employment_status || '',
    createdAt: employeeDetails.created_at ? format(new Date(employeeDetails.created_at), 'dd/MM/yyyy') : '',
    updatedAt: employeeDetails.updated_at ? format(new Date(employeeDetails.updated_at), 'dd/MM/yyyy') : '',
    presentAddress: employeeDetails.present_address || {
      addressLine1: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    },
    permanentAddress: employeeDetails.permanent_address || {
      addressLine1: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    },
    emergencyContacts: Array.isArray(employeeDetails.emergency_contacts) 
      ? employeeDetails.emergency_contacts 
      : [],
    familyDetails: Array.isArray(employeeDetails.family_details) 
      ? employeeDetails.family_details 
      : [],
    experience: employeeDetails.experience?.map((exp: any) => ({
      id: exp.id,
      jobTitle: exp.job_title,
      company: exp.company,
      location: exp.location,
      employmentType: exp.employment_type,
      startDate: exp.start_date,
      endDate: exp.end_date,
      offerLetter: exp.offer_letter_url,
      separationLetter: exp.separation_letter_url,
      payslips: exp.payslips || []
    })) || []
  };

  console.log('Transformed employee data:', transformedData);
  return transformedData;
};
