import { useState, useEffect } from "react";
import { toast } from "sonner";
import { employeeService } from "@/services/employee/employee.service";
import { useEmailValidation } from "./form/useEmailValidation";
import { useFormState } from "./form/useFormState";
import { PersonalDetailsData } from "@/components/employee/types";
import { EmployeeData } from "@/services/types/employee.types";
import { personalInfoService } from "@/services/employee/personalInfo.service";

export const useEmployeeForm = () => {
  const [isFormCompleted, setIsFormCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    activeTab,
    formProgress,
    formData,
    updateSectionProgress,
    updateFormData,
    handleTabChange,
    setActiveTab
  } = useFormState();

  const { isCheckingEmail, emailError, setEmailError } = useEmailValidation(formData.personal?.email);
  useEffect(() => {
    console.log("Form Data Updated:", formData);
  }, [formData]); 
  const validatePersonalDetails = (data: any): boolean => {
    console.log("Validating Personal Details - Received Data:", data);
    // Check basic required fields
    if (!data.employeeId?.trim()) {
      toast.error("Employee ID is required");
      return false;
    }
    if (!data.firstName?.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!data.lastName?.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (!data.email?.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!data.phone?.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!data.dateOfBirth) {
      toast.error("Date of birth is required");
      return false;
    }
    if (!data.gender) {
      toast.error("Gender is required");
      return false;
    }
    if (!data.bloodGroup) {
      toast.error("Blood group is required");
      return false;
    }
    if (!data.maritalStatus) {
      toast.error("Marital status is required");
      return false;
    }
    if (!data.aadharNumber?.trim()) {
      toast.error("Aadhar number is required");
      return false;
    }
    if (!data.panNumber?.trim()) {
      toast.error("PAN number is required");
      return false;
    }

    // Validate present address
    if (!data.presentAddress?.addressLine1?.trim()) {
      toast.error("Present address line is required");
      return false;
    }

    return true;
  };

  const handleSaveAndNext = async (completedData?: any) => {
    console.log("Received Data in handleSaveAndNext:", completedData);
  
    if (!completedData) {
      toast.error("⚠️ Please complete all required fields before proceeding.");
      return;
    }
  
    console.log("Active Tab:", activeTab);
    console.log("Current Form Data State:", formData);
  
    if (activeTab === "personal") {
      setIsSubmitting(true);
      try {
        if (!validatePersonalDetails(completedData)) {
          setIsSubmitting(false);
          return;
        }
  
        const submissionData = {
          ...completedData,
          presentAddress: completedData.presentAddress || {},
          permanentAddress: completedData.permanentAddress || {},
          documents: completedData.documents || [],
        };
  
        const savedEmployee = await personalInfoService.createPersonalInfo(submissionData);
        if (!savedEmployee) throw new Error("Failed to save personal details");
  
        updateFormData("personal", { ...submissionData, id: savedEmployee.id });
        updateSectionProgress("personal", true);
  
        setActiveTab("education"); // 🔥 Move directly to Education tab
  
        toast.success("✅ Personal details saved successfully!");
      } catch (error: any) {
        console.error('Error saving personal details:', error);
        toast.error(error.message || "❌ Failed to save personal details.");
        updateSectionProgress("personal", false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  

  return {
    activeTab,
    formProgress,
    formData,
    isFormCompleted,
    isSubmitting,
    isCheckingEmail,
    emailError,
    updateSectionProgress,
    updateFormData,
    handleTabChange,
    handleSaveAndNext,
  };
};
