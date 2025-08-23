// src/components/global/OrganizationManagement/EditOrganizationModal.tsx

import { useState, useEffect, FC } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Select, VStack, Button, useToast, NumberInput, NumberInputField, Input, Flex
} from "@chakra-ui/react";
import { supabase } from "../../../integrations/supabase/client";

// Re-using the Organization type from the dashboard
interface Organization {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  subdomain?: string | null;
  role_credit_limits: Record<string, number>;
}

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Organization;
}

const EditOrganizationModal: FC<EditOrganizationModalProps> = ({ isOpen, onClose, organization, onSuccess }) => {
  const [roleLimits, setRoleLimits] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Organization['status']>('active');
  const [subdomain, setSubdomain] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    if (organization) {
      setRoleLimits(organization.role_credit_limits || { organization_superadmin: 1, admin: 0, employee: 0 });
      setStatus(organization.status);
      setSubdomain(organization.subdomain || '');
    }
  }, [organization]);
  
  const handleLimitChange = (role: string, value: string) => {
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
          subdomain: subdomain,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({ title: "Organization Updated", status: "success", duration: 3000, isClosable: true });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, status: "error", duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit: {organization.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Flex gap={4}>
                <FormControl>
                    <FormLabel fontSize="sm">Subdomain</FormLabel>
                    <Input placeholder="acme" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                </FormControl>
                <FormControl>
                    <FormLabel fontSize="sm">Status</FormLabel>
                    <Select value={status} onChange={(e) => setStatus(e.target.value as Organization['status'])}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </Select>
                </FormControl>
            </Flex>
            <FormControl>
              <FormLabel fontSize="sm">Role Credit Limits</FormLabel>
              <Flex gap={4} p={4} borderWidth={1} borderRadius="md" align="stretch">
                 <FormControl>
                  <FormLabel fontSize="xs">Super Admins</FormLabel>
                  <NumberInput value={roleLimits.organization_superadmin} onChange={(val) => handleLimitChange('organization_superadmin', val)} min={1}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs">Admins</FormLabel>
                  <NumberInput value={roleLimits.admin} onChange={(val) => handleLimitChange('admin', val)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs">Users</FormLabel>
                  <NumberInput value={roleLimits.employee} onChange={(val) => handleLimitChange('employee', val)} min={0}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </Flex>
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