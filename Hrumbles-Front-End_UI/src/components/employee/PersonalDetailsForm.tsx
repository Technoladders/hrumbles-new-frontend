import React from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { BasicInfoSection } from "./personal-details/BasicInfoSection";
import { AddressSection } from "./personal-details/AddressSection";
import { EmergencyContactsSection } from "./personal-details/EmergencyContactsSection";
import { FamilyDetailsSection } from "./personal-details/FamilyDetailsSection";
import { PersonalDetailsFormProps, PersonalDetailsData } from "./types";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalDetailsSchema, PersonalDetailsFormSchema } from "./personal-details/schema/personalDetailsSchema";
import { useFormValidation } from "./personal-details/hooks/useFormValidation";
import { useFormInitialization } from "./personal-details/hooks/useFormInitialization";
import { toast } from "sonner";
import { employeeService } from "@/services/employee/employee.service"; // Import service function

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({ 
  onComplete, 
  initialData,
  isCheckingEmail,
  emailError,
  isSubmitting,
  formRef
}) => {
  const { validateForm } = useFormValidation();
  const {
    emergencyContacts,
    setEmergencyContacts,
    familyDetails,
    setFamilyDetails,
    documents,
    setDocuments
  } = useFormInitialization(initialData);

  const form = useForm<PersonalDetailsFormSchema>({
    defaultValues: {
      ...initialData,
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
      sameAsPresent: false
    },
    resolver: zodResolver(personalDetailsSchema)
  });

  // console.log("EmergencyContacts", emergencyContacts)
  // console.log("initialData", form.watch())
  // console.log("familyDetails", familyDetails)
  // console.log("documents", documents)



  const handleSubmit = form.handleSubmit(async (data) => {
    const isValid = validateForm(emergencyContacts, familyDetails, setEmergencyContacts, setFamilyDetails);
  
    if (!isValid) {
      toast.error("Please add at least one emergency contact and one family member");
      onComplete(false);
      return;
    }
  
    const formData: PersonalDetailsData = {
      ...data,
      dateOfBirth: data.dateOfBirth?.toISOString(),
      emergencyContacts,
      familyDetails,
      documents,
    };
console.log("formData",formData)
    try {
      await employeeService.createEmployee(formData);
      onComplete(true, formData);
      toast.success("Personal details saved successfully");
     
    } catch (error) {
      console.error("Error saving personal details:", error);
      toast.error("Failed to save personal details. Please try again.");
      onComplete(false);
    }
  });

  return (
  <Form {...form}>
    <form ref={formRef} id="personalDetailsForm" onSubmit={handleSubmit} className="space-y-6">
      <BasicInfoSection register={form} errors={form.formState.errors} isCheckingEmail={isCheckingEmail} emailError={emailError} 
        profilePictureUrl={form.watch("profilePictureUrl")}
        onProfilePictureChange={(url) => form.setValue("profilePictureUrl", url)}
        onProfilePictureDelete={() => form.setValue("profilePictureUrl", "")}
        documents={documents} onDocumentsChange={setDocuments} setValue={form.setValue} watch={form.watch} 
      />
      <AddressSection form={form} />
      <EmergencyContactsSection contacts={emergencyContacts} onContactsChange={setEmergencyContacts} maritalStatus={form.watch("maritalStatus")} />
      <FamilyDetailsSection familyMembers={familyDetails} onFamilyMembersChange={setFamilyDetails} maritalStatus={form.watch("maritalStatus")} />
    </form>
  </Form>
);

};
