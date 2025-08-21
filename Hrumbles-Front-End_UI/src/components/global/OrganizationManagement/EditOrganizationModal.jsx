// src/components/GlobalAdmin/EditOrganizationModal.jsx
import { useState, useEffect } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Select, VStack, Button, useToast, NumberInput, NumberInputField
} from "@chakra-ui/react";
import { supabase } from "../../../integrations/supabase/client";

const EditOrganizationModal = ({ isOpen, onClose, organization, onSuccess }) => {
  const [roleLimits, setRoleLimits] = useState(organization.role_credit_limits || {});
  const [status, setStatus] = useState(organization.status);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setRoleLimits(organization.role_credit_limits || { organization_superadmin: 1, admin: 0, employee: 0 });
    setStatus(organization.status);
  }, [organization]);
  
  const handleLimitChange = (role, value) => {
    setRoleLimits({ ...roleLimits, [role]: parseInt(value, 10) || 0 });
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("hr_organizations")
        .update({
          role_credit_limits: roleLimits,
          status: status,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({ title: "Organization Updated", status: "success", duration: 3000, isClosable: true });
      onSuccess();
      onClose();
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit: {organization.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Role Credit Limits</FormLabel>
              <VStack spacing={3} p={3} borderWidth={1} borderRadius="md" align="stretch">
                 <FormControl>
                  <FormLabel fontSize="sm">Organization Super Admins</FormLabel>
                  <NumberInput value={roleLimits.organization_superadmin} onChange={(val) => handleLimitChange('organization_superadmin', val)} min={1}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Admins</FormLabel>
                  <NumberInput value={roleLimits.admin} onChange={(val) => handleLimitChange('admin', val)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Employees</FormLabel>
                  <NumberInput value={roleLimits.employee} onChange={(val) => handleLimitChange('employee', val)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </VStack>
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleUpdate} isLoading={isLoading}>Save Changes</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditOrganizationModal;