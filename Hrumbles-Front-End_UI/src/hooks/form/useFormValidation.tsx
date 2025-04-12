
import { PersonalDetailsData, BankAccountData } from "@/components/employee/types";

export const useFormValidation = () => {
  const isAddressValid = (address: any) =>
    address &&
    address.addressLine1 &&
    address.country &&
    address.state &&
    address.city &&
    address.zipCode;

  const validatePersonalSection = (data: PersonalDetailsData | null) => {
    if (!data) return false;

    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      presentAddress,
      permanentAddress,
      documents
    } = data;

    const isBasicInfoValid =
      employeeId &&
      firstName &&
      lastName &&
      email &&
      phone &&
      dateOfBirth &&
      gender &&
      bloodGroup &&
      maritalStatus;

    // Present address is mandatory
    const isPresentAddressValid = isAddressValid(presentAddress);
    
    // Permanent address is optional
    const isPermanentAddressValid = !permanentAddress || Object.keys(permanentAddress).length === 0 || isAddressValid(permanentAddress);

    return (
      isBasicInfoValid &&
      isPresentAddressValid &&
      isPermanentAddressValid &&
      Array.isArray(documents)
    );
  };

  const validateBankSection = (data: BankAccountData | null) => {
    if (!data) return false;

    const {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      accountType,
    } = data;

    return !!(
      accountHolderName &&
      accountNumber &&
      ifscCode &&
      bankName &&
      branchName &&
      accountType
    );
  };

  return {
    validatePersonalSection,
    validateBankSection,
  };
};
