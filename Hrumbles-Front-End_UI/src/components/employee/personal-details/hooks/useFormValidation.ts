import { EmergencyContact, FamilyMember } from "../../types";

export const useFormValidation = () => {
  const validateForm = (
    emergencyContacts: EmergencyContact[],
    familyDetails: FamilyMember[],
    setEmergencyContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>,
    setFamilyDetails: React.Dispatch<React.SetStateAction<FamilyMember[]>>
  ) => {
    const hasValidEmergencyContact = emergencyContacts.some(
      contact => contact.name.trim() && contact.relationship.trim() && contact.phone.trim()
    );

    const hasValidFamilyMember = familyDetails.some(
      member => member.name.trim() && member.relationship.trim() && member.occupation.trim() && member.phone.trim()
    );

    // Filter out incomplete entries
    if (!hasValidEmergencyContact) {
      setEmergencyContacts(prevContacts => 
        prevContacts.filter(contact => contact.name.trim() || contact.relationship.trim() || contact.phone.trim())
      );
    }

    if (!hasValidFamilyMember) {
      setFamilyDetails(prevMembers => 
        prevMembers.filter(member => member.name.trim() || member.relationship.trim() || member.occupation.trim() || member.phone.trim())
      );
    }

    return hasValidEmergencyContact && hasValidFamilyMember;
  };

  return { validateForm };
};
