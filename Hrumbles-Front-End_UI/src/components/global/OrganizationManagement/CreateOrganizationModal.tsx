// src/components/global/OrganizationManagement/CreateOrganizationModal.tsx

import { useState, useEffect, FC, ChangeEvent } from "react";

import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, VStack, Button, useToast, NumberInput,
  NumberInputField, Divider, Heading, Flex, Select, Checkbox
} from "@chakra-ui/react";
import { createOrganizationWithSuperadmin, getAvailableRoles } from "../../../utils/api";

import PhoneInput, { E164Number } from "react-phone-number-input";
import "react-phone-number-input/style.css"; // Don't forget the CSS

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Role {
  id: string;
  name: string;
}

const CreateOrganizationModal: FC<CreateOrganizationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [adminDetails, setAdminDetails] = useState({
    firstName: "", lastName: "", email: "", password: ""
  });
  const [phone, setPhone] = useState<E164Number | undefined>();
  const [organizationName, setOrganizationName] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [role, setRole] = useState<string>(""); // State for selected role
    const [employeeId, setEmployeeId] = useState<string>(""); 
  const [isRecruitmentFirm, setIsRecruitmentFirm] = useState<boolean>(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleLimits, setRoleLimits] = useState({
    organization_superadmin: 1,
    admin: 0,
    employee: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();

  // Fetch available roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const availableRoles = await getAvailableRoles();
        setRoles(availableRoles);
      } catch (error: any) {
        toast({
          title: "Error Fetching Roles",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    };
    fetchRoles();
  }, [toast]);

  const handleAdminChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminDetails({ ...adminDetails, [e.target.name]: e.target.value });
  };
  
  const handleLimitChange = (role: string, value: string) => {
    setRoleLimits({ ...roleLimits, [role]: parseInt(value, 10) || 0 });
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!organizationName || !subdomain || !adminDetails.email || !adminDetails.password || !adminDetails.firstName || !adminDetails.lastName || !role || !employeeId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields, including the role.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await createOrganizationWithSuperadmin(
        adminDetails.email,
        adminDetails.password,
        adminDetails.firstName,
        adminDetails.lastName,
        organizationName,
        role, // Pass selected role
        phone,
        subdomain,
        roleLimits,
        employeeId, // Pass employeeId
        isRecruitmentFirm // Pass isRecruitmentFirm
      );
      toast({
        title: "Organization Created",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Organization</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Heading size="sm" color="gray.600">Organization Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Organization Name</FormLabel>
                <Input placeholder="Xrilic" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Subdomain</FormLabel>
                <Input placeholder="xrilic" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
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

             <FormControl>
                <Checkbox 
                    isChecked={isRecruitmentFirm}
                    onChange={(e) => setIsRecruitmentFirm(e.target.checked)}
                >
                    Is this a Recruitment Firm?
                </Checkbox>
            </FormControl>

            <Divider my={2} />
            <Heading size="sm" color="gray.600">Superadmin User Details</Heading>
            <Flex gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">First Name</FormLabel><Input name="firstName" value={adminDetails.firstName} onChange={handleAdminChange} /></FormControl>
              <FormControl isRequired><FormLabel fontSize="sm">Last Name</FormLabel><Input name="lastName" value={adminDetails.lastName} onChange={handleAdminChange} /></FormControl>
            </Flex>
            <FormControl isRequired>
                <FormLabel fontSize="sm">Employee ID</FormLabel>
                <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g., EMP001" />
              </FormControl>
             <FormControl isRequired><FormLabel fontSize="sm">Email</FormLabel><Input name="email" type="email" value={adminDetails.email} onChange={handleAdminChange} /></FormControl>
             
            <Flex gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">Password</FormLabel><Input name="password" type="password" value={adminDetails.password} onChange={handleAdminChange} /></FormControl>
              <FormControl><FormLabel fontSize="sm">Phone Number</FormLabel>
                <PhoneInput 
                    international 
                    defaultCountry="IN" 
                    value={phone} 
                    onChange={setPhone}
                    className="phone-input-chakra"
                />
              </FormControl>
            </Flex>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Role</FormLabel>
              <Select placeholder="Select Role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </Select>
            </FormControl>
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