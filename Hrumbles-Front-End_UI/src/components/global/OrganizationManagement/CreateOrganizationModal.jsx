// src/components/GlobalAdmin/CreateOrganizationModal.jsx
import { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, VStack, Button, useToast, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Divider, Heading
} from "@chakra-ui/react";
import { createOrganizationWithSuperadmin } from "../../../utils/api"; 


const CreateOrganizationModal = ({ isOpen, onClose, onSuccess }) => {
  const [adminDetails, setAdminDetails] = useState({
    firstName: "", lastName: "", email: "", password: "", phoneNo: ""
  });
  const [organizationName, setOrganizationName] = useState("");
  const [roleLimits, setRoleLimits] = useState({
    organization_superadmin: 1,
    admin: 5,
    employee: 20
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleAdminChange = (e) => {
    setAdminDetails({ ...adminDetails, [e.target.name]: e.target.value });
  };
  
  const handleLimitChange = (role, value) => {
    setRoleLimits({ ...roleLimits, [role]: parseInt(value, 10) || 0 });
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await createOrganizationWithSuperadmin(
        organizationName,
        roleLimits,
        adminDetails
      );
      toast({
        title: "Organization Created",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Organization</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Heading size="sm">Organization Details</Heading>
            <Input placeholder="Organization Name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            
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

            <Divider my={4} />
            <Heading size="sm">Superadmin User Details</Heading>
            <Input name="firstName" placeholder="First Name" value={adminDetails.firstName} onChange={handleAdminChange} />
            <Input name="lastName" placeholder="Last Name" value={adminDetails.lastName} onChange={handleAdminChange} />
            <Input name="email" placeholder="Email" type="email" value={adminDetails.email} onChange={handleAdminChange} />
            <Input name="password" placeholder="Password" type="password" value={adminDetails.password} onChange={handleAdminChange} />
            <Input name="phoneNo" placeholder="Phone Number" value={adminDetails.phoneNo} onChange={handleAdminChange} />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleCreate} isLoading={isLoading}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateOrganizationModal;