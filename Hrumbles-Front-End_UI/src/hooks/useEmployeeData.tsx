
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { EmployeeData, PersonalInfo, EmployeeBasicInfo, EmployeeDetailsResponse } from "@/services/types/employee.types";
import { employeeDataService } from "@/services/employee/employeeDataService";
import { employeeAddressService } from "@/services/employee/employeeAddressService";
import { employeeContactService } from "@/services/employee/employeeContactService";
import { employeeFamilyService } from "@/services/employee/employeeFamilyService";
import { transformEmployeeData } from "@/utils/transforms/employeeTransforms";
import { supabase } from "@/integrations/supabase/client";

export const useEmployeeData = (employeeId: string | undefined) => {
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) {
      setError("No employee ID provided");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching employee data for ID:', employeeId);
      
      const employeeDetails = await employeeDataService.fetchEmployeeDetails(employeeId);

      if (!employeeDetails) {
        throw new Error('Employee not found');
      }

      const transformedData = {
        ...transformEmployeeData(employeeDetails),
        aadharNumber: employeeDetails.aadhar_number || '',
        panNumber: employeeDetails.pan_number || '',
        aadharUrl: employeeDetails.aadhar_url || '',
        panUrl: employeeDetails.pan_url || '',
        uanNumber: employeeDetails.uan_number || '',
        uanUrl: employeeDetails.uan_url || '',
        esicNumber: employeeDetails.esic_number || '',
        esicUrl: employeeDetails.esic_url || ''
      };

      console.log('Transformed employee data:', transformedData);
      setEmployeeData(transformedData);

    } catch (error: any) {
      console.error("Error fetching employee data:", error);
      const errorMessage = error.message === 'Invalid UUID' 
        ? 'Invalid employee ID format. Please use a valid UUID.'
        : error.code === 'PGRST116'
        ? 'Employee not found. Please check the ID and try again.'
        : 'Failed to fetch employee data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  const updateEmployee = useCallback(
    async (section: string, data: any) => {
      if (!employeeId) {
        toast.error("No employee ID provided");
        return;
      }

      try {
        if (section === 'employment') {
          if (!data.firstName || !data.lastName || !data.email) {
            throw new Error('Required fields missing');
          }
          
          const updateData: EmployeeBasicInfo = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            department: data.department,
            position: data.position
          };
          await employeeDataService.updateBasicInfo(employeeId, updateData);
          await fetchEmployeeData();
          toast.success("Employment details updated successfully");
        } else if (section === 'personal') {
          const personalInfo: PersonalInfo = {
            employeeId: data.employeeId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            bloodGroup: data.bloodGroup,
            maritalStatus: data.maritalStatus,
            presentAddress: data.presentAddress,
            permanentAddress: data.permanentAddress,
            emergencyContacts: data.emergencyContacts || [],
            familyDetails: data.familyDetails || [],
            documents: data.documents || [],
            aadharNumber: data.aadharNumber,
            panNumber: data.panNumber,
            aadharUrl: data.aadharUrl,
            panUrl: data.panUrl,
            uanNumber: data.uanNumber,
            uanUrl: data.uanUrl,
            esicNumber: data.esicNumber,
            esicUrl: data.esicUrl
          };

          await Promise.all([
            employeeDataService.updateBasicInfo(employeeId, personalInfo),
            employeeAddressService.updateAddresses(
              employeeId,
              personalInfo.presentAddress,
              personalInfo.permanentAddress
            ),
            employeeContactService.updateEmergencyContacts(
              employeeId,
              personalInfo.emergencyContacts
            ),
            employeeFamilyService.updateFamilyDetails(
              employeeId,
              personalInfo.familyDetails
            )
          ]);
          await fetchEmployeeData();
          toast.success("Personal details updated successfully");
        } else {
          await employeeDataService.updateBasicInfo(employeeId, data);
          await fetchEmployeeData();
          toast.success(`${section} updated successfully`);
        }
      } catch (error) {
        console.error(`Error updating ${section}:`, error);
        toast.error(`Failed to update ${section}`);
        throw error;
      }
    },
    [employeeId, fetchEmployeeData]
  );

  return {
    isLoading,
    employeeData,
    error,
    fetchEmployeeData,
    updateEmployee,
  };
};
