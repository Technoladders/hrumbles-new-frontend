
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonalDetailsForm } from "../PersonalDetailsForm";
import { PersonalDetailsData } from "../types";
import { Button } from "@/components/ui/button";
import { UserCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PersonalDetailsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PersonalDetailsData;
  employeeId: string;
  onUpdate: (data: PersonalDetailsData) => Promise<void>;
}

export const PersonalDetailsEditModal: React.FC<PersonalDetailsEditModalProps> = ({
  isOpen,
  onClose,
  data,
  employeeId,
  onUpdate,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PersonalDetailsData | null>(null);

  const handleComplete = (completed: boolean, data?: PersonalDetailsData) => {
    if (completed && data) {
      setFormData(data);
    }
  };

  const handleSave = async () => {
    if (!formData) {
      toast.error("Please fill in the required fields");
      return;
    }
    
    try {
      setIsSubmitting(true);

      // First delete existing emergency contacts and family details
      await supabase
        .from('hr_employee_emergency_contacts')
        .delete()
        .eq('employee_id', employeeId);

      await supabase
        .from('hr_employee_family_details')
        .delete()
        .eq('employee_id', employeeId);

      // Update employee basic info
      const { error: employeeError } = await supabase
        .from('hr_employees')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          blood_group: formData.bloodGroup,
          marital_status: formData.maritalStatus
        })
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      // Update addresses
      const { error: addressError } = await supabase
        .from('hr_employee_addresses')
        .upsert([
          {
            employee_id: employeeId,
            type: 'present',
            address_line1: formData.presentAddress.addressLine1,
            country: formData.presentAddress.country,
            state: formData.presentAddress.state,
            city: formData.presentAddress.city,
            zip_code: formData.presentAddress.zipCode
          },
          {
            employee_id: employeeId,
            type: 'permanent',
            address_line1: formData.permanentAddress.addressLine1,
            country: formData.permanentAddress.country,
            state: formData.permanentAddress.state,
            city: formData.permanentAddress.city,
            zip_code: formData.permanentAddress.zipCode
          }
        ]);

      if (addressError) throw addressError;

      // Insert new emergency contacts if provided
      if (formData.emergencyContacts && formData.emergencyContacts.length > 0) {
        const validContacts = formData.emergencyContacts.filter(contact => 
          contact.name.trim() && contact.relationship.trim() && contact.phone.trim()
        );
        
        if (validContacts.length > 0) {
          const { error: contactsError } = await supabase
            .from('hr_employee_emergency_contacts')
            .insert(
              validContacts.map(contact => ({
                employee_id: employeeId,
                name: contact.name.trim(),
                relationship: contact.relationship.trim(),
                phone: contact.phone.trim()
              }))
            );

          if (contactsError) throw contactsError;
        }
      }

      // Insert new family details if provided
      if (formData.familyDetails && formData.familyDetails.length > 0) {
        const validFamilyMembers = formData.familyDetails.filter(member => 
          member.name.trim() && member.relationship.trim() && 
          member.occupation.trim() && member.phone.trim()
        );
        
        if (validFamilyMembers.length > 0) {
          const { error: familyError } = await supabase
            .from('hr_employee_family_details')
            .insert(
              validFamilyMembers.map(member => ({
                employee_id: employeeId,
                name: member.name.trim(),
                relationship: member.relationship.trim(),
                occupation: member.occupation.trim(),
                phone: member.phone.trim()
              }))
            );

          if (familyError) throw familyError;
        }
      }

      await onUpdate(formData);
      toast.success("Personal details updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating personal details:", error);
      toast.error(error.message || "Failed to update personal details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-3 bg-gradient-to-r from-[#30409F] to-[#4B5FBD] sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5 text-white" />
              <DialogTitle className="text-sm font-semibold text-white tracking-tight">
                Edit Personal Details
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 p-3">
          <PersonalDetailsForm 
            onComplete={handleComplete} 
            initialData={data}
            isSubmitting={isSubmitting}
          />
        </div>
        <div className="flex justify-end gap-3 p-3 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || !formData}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
